import { describe, expect, it, vi } from 'vitest';
import type { SetStateAction } from 'react';
import type { CharacterConfig } from '../../lib/gameTypes';
import type { DataRow } from '../../lib/mockData';
import { canUseSkill, defaultSkills, resolveSlotSkill, updateSkillCooldown, useSkill } from '../../lib/skillSystem';
import type { SkillSlot } from '../../lib/skillSystem';
import { applyMonsterRowFromData, applyPlayerRowFromData, selectImportedRows } from './rowApplyManager';

const config: CharacterConfig = {
  typeId: 'warrior',
  attackType: 'warrior',
  size: { min: 20, max: 20 },
  speed: { min: 100, max: 100 },
  attack: { min: 10, max: 10 },
  defense: { min: 5, max: 5 },
  attackSpeed: { min: 1, max: 1 },
  accuracy: { min: 80, max: 80 },
  criticalRate: { min: 10, max: 10 },
  attackRange: { min: 75, max: 75 },
  attackWidth: { min: 90, max: 90 },
};

const row: DataRow = {
  t: 0, x: 0, y: 0, speed: 0, dir: 0, is_attack: 0, is_miss: 0, is_crit: 0,
  player_size: 20,
  monster_size: 20,
};

describe('applying a dataset row', () => {
  it('selects imported rows at the current tick and falls back when neither exists', () => {
    const players = [{ ...row, player_hp: 100 }, { ...row, player_hp: 200 }];
    const monsters = [{ ...row, monster_hp: 300 }, { ...row, monster_hp: 400 }];
    expect(selectImportedRows(players, monsters, 1)).toMatchObject({
      tick: 1,
      currentRow: { player_hp: 200, monster_hp: 400 },
    });
    expect(selectImportedRows(players, monsters, 9)).toMatchObject({
      tick: 0,
      currentRow: { player_hp: 100, monster_hp: 300 },
    });
    expect(selectImportedRows([], monsters, 1)).toMatchObject({
      tick: 1,
      playerRow: undefined,
      currentRow: { monster_hp: 400 },
    });
    expect(selectImportedRows([], [], 1)).toMatchObject({ tick: 0, currentRow: null });
  });

  it('clears previous player skills when the row has no skill IDs', () => {
    const setSkillSlots = vi.fn();
    applyPlayerRowFromData({
      row,
      skillConfigs: { powerSlash: defaultSkills.powerSlash },
      setPlayerLevelConfig: vi.fn(),
      setPlayerConfig: vi.fn(),
      setPlayerBasicAttack: vi.fn(),
      setSkillSlots,
    });
    expect(setSkillSlots).toHaveBeenCalledWith([]);
  });

  it('builds player slots from current skill definitions and row overrides', () => {
    const custom = { ...defaultSkills.heal, id: 'customHeal', name: 'Custom heal', healAmount: 125 };
    const edited = { ...defaultSkills.powerSlash, name: 'Edited slash', range: 220 };
    const setSkillSlots = vi.fn<(value: SetStateAction<SkillSlot[]>) => void>();
    applyPlayerRowFromData({
      row: {
        ...row,
        player_skill_1_id: 'customHeal',
        player_skill_1_sp_cost: 0,
        player_skill_1_cooldown: 700,
        player_skill_1_range: 0,
        player_skill_1_width: 40,
        player_skill_1_damage: 2,
        player_skill_1_cast_time: 0,
        player_skill_2_id: 'powerSlash',
      },
      skillConfigs: { customHeal: custom, powerSlash: edited },
      setPlayerLevelConfig: vi.fn(),
      setPlayerConfig: vi.fn(),
      setPlayerBasicAttack: vi.fn(),
      setSkillSlots,
    });

    const slots = setSkillSlots.mock.lastCall?.[0];
    if (!Array.isArray(slots)) throw new Error('Expected skill slots');
    expect(slots[0]).toMatchObject({
      slotNumber: 1,
      skill: { id: 'customHeal', healAmount: 125, range: 0, area: 40, damageMultiplier: 2,
        cooldown: 700, spCost: 0, castTime: 0 },
      overrides: { range: 0, area: 40, damageMultiplier: 2, cooldown: 700, spCost: 0, castTime: 0 },
    });
    expect(slots[1].skill).toMatchObject({ name: 'Edited slash', range: 220 });
    expect(slots[1].overrides).toEqual({});
  });

  it('uses the current definition, row overrides and live cooldown state at execution', () => {
    const active = { ...defaultSkills.heal, currentCooldown: 400, isOnCooldown: true };
    const definition = { ...defaultSkills.heal, healAmount: 90, spCost: 20, cooldown: 5000 };
    const effective = resolveSlotSkill(active, { heal: definition }, { spCost: 0, cooldown: 700 });
    expect(effective).toMatchObject({ healAmount: 90, spCost: 0, cooldown: 700, currentCooldown: 400 });
    expect(canUseSkill(effective, 0).canUse).toBe(false);
    const ready = updateSkillCooldown(effective, 0.4);
    expect(canUseSkill(ready, 0).canUse).toBe(true);
    expect(useSkill(ready)).toMatchObject({ currentCooldown: 700, isOnCooldown: true });
    expect(useSkill({ ...ready, cooldown: 0 })).toMatchObject({ currentCooldown: 0, isOnCooldown: false });
  });

  it.each(['player', 'monster'] as const)(
    'updates the %s type ID and retains it when the row has no type',
    owner => {
      const setConfig = vi.fn<(value: SetStateAction<CharacterConfig>) => void>();
      const apply = (typeId?: string) => {
        if (owner === 'player') {
          applyPlayerRowFromData({
            row: { ...row, player_attack_type: typeId },
            skillConfigs: {},
            setPlayerLevelConfig: vi.fn(),
            setPlayerConfig: setConfig,
            setPlayerBasicAttack: vi.fn(),
            setSkillSlots: vi.fn(),
          });
        } else {
          applyMonsterRowFromData({
            row: { ...row, monster_attack_type: typeId },
            skillConfigs: {},
            setMonsterLevelConfig: vi.fn(),
            setMonsterConfig: setConfig,
            setMonsterBasicAttack: vi.fn(),
          });
        }
        const update = setConfig.mock.lastCall?.[0];
        if (typeof update !== 'function') throw new Error('Expected a config updater');
        return update(config);
      };

      expect(apply('archer')).toMatchObject({ typeId: 'archer', attackType: 'archer' });
      expect(apply()).toMatchObject({ typeId: 'warrior', attackType: 'warrior' });
    }
  );
});
