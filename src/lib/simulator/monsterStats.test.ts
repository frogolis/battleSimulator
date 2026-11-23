import { describe, expect, it, vi } from 'vitest';
import {
  loadMonsterAI,
  loadMonsterBasicAttack,
  loadMonsterSkills,
  loadPlayerBasicAttack,
  loadPlayerSkills,
} from '../combatSystem';
import { defaultAIPatternConfig } from '../monsterAI';
import type { DataRow } from '../mockData';
import { defaultSkills, type BasicAttackSlot } from '../skillSystem';
import {
  createMonster,
  createMonsters,
  initializePlayer,
  updateMonsterBasicAttacks,
  updatePlayerBasicAttack,
} from './characters';
import {
  MONSTER_STAT_FIELDS, parseMonsterStatInput, validateMonsterSpawnRows, validateMonsterStats,
} from './monsterStats';
import { killMonster, updateRespawnTimers } from './respawn';

const row: DataRow = {
  t: 0, x: 0, y: 0, speed: 0, dir: 0, is_attack: 0, is_miss: 0, is_crit: 0,
  monster_definition_id: 'monster_guardian',
  monster_name: '수호자', monster_hp: 900, monster_sp: 30, monster_attack: 41,
  monster_defense: 22, monster_speed: 70, monster_attack_speed: 1.5,
  monster_accuracy: 85, monster_critical_rate: 10,
};

describe('monster dataset stats', () => {
  it('preserves explicit zero values in basic attacks and monster aggro settings', () => {
    const zeroSettings = {
      ...row,
      player_basic_attack_id: 'customPlayerAttack',
      player_basic_attack_range: 0,
      player_basic_attack_width: 0,
      player_basic_attack_damage: 0,
      player_basic_attack_cooldown: 0,
      player_basic_attack_sp_cost: 0,
      player_basic_attack_cast_time: 0,
      monster_basic_attack_id: 'customMonsterAttack',
      monster_basic_attack_range: 0,
      monster_basic_attack_width: 0,
      monster_basic_attack_damage: 0,
      monster_basic_attack_cooldown: 0,
      monster_basic_attack_sp_cost: 0,
      monster_basic_attack_cast_time: 0,
      monster_ai_aggro_range: 0,
    };

    expect(loadPlayerBasicAttack(zeroSettings)).toEqual({
      id: 'customPlayerAttack',
      range: 0,
      width: 0,
      damage: 0,
      cooldown: 0,
      spCost: 0,
      castTime: 0,
    });
    expect(loadMonsterBasicAttack(zeroSettings)).toEqual({
      id: 'customMonsterAttack',
      range: 0,
      width: 0,
      damage: 0,
      cooldown: 0,
      spCost: 0,
      castTime: 0,
    });
    expect(loadMonsterAI(zeroSettings).aggroRange).toBe(0);
  });

  it('preserves explicit zero values in player and monster skill rows', () => {
    const zeroSkillValues = {
      ...row,
      player_skill_1_id: 'powerSlash',
      player_skill_1_range: 0,
      player_skill_1_width: 0,
      player_skill_1_damage: 0,
      player_skill_1_cooldown: 0,
      player_skill_1_sp_cost: 0,
      player_skill_1_cast_time: 0,
      monster_skill_1_id: 'powerSlash',
      monster_skill_1_range: 0,
      monster_skill_1_width: 0,
      monster_skill_1_damage: 0,
      monster_skill_1_cooldown: 0,
      monster_skill_1_sp_cost: 0,
      monster_skill_1_cast_time: 0,
    };

    expect(loadPlayerSkills(zeroSkillValues).slot1).toMatchObject({
      range: 0, width: 0, damage: 0, cooldown: 0, spCost: 0, castTime: 0,
    });
    expect(loadMonsterSkills(zeroSkillValues).slot1).toMatchObject({
      range: 0, width: 0, damage: 0, cooldown: 0, spCost: 0, castTime: 0,
    });
  });

  it('accepts positive decimal input without a slider limit and rejects invalid input', () => {
    expect(parseMonsterStatInput(' 987.125 ')).toBe(987.125);
    for (const invalid of ['', ' ', '0', '-1', 'Infinity', 'invalid']) {
      expect(parseMonsterStatInput(invalid)).toBeUndefined();
    }
  });

  it.each(MONSTER_STAT_FIELDS)('rejects missing, zero, negative and non-finite %s', field => {
    for (const value of [undefined, 0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(validateMonsterStats({ ...row, [field]: value })).toMatchObject({
        ok: false, reason: expect.stringContaining(field),
      });
    }
  });

  it('validates every selected spawn row, or the current row if none is selected', () => {
    const invalid = { ...row, monster_definition_id: 'monster_invalid', monster_sp: 0 };
    expect(validateMonsterSpawnRows([row, invalid], new Set(['monster_guardian']), 1)).toBeUndefined();
    expect(validateMonsterSpawnRows([invalid, row], new Set(['monster_guardian']), 0))
      .toBeUndefined();
    expect(validateMonsterSpawnRows(
      [row, invalid],
      new Set(['monster_guardian', 'monster_invalid']),
      0
    )).toMatch(/행 1.*monster_sp/);
    expect(validateMonsterSpawnRows([row, invalid], new Set(), 1)).toMatch(/행 1.*monster_sp/);
    expect(validateMonsterSpawnRows([row], new Set(['monster_missing']), 0))
      .toMatch(/몬스터 ID "monster_missing".*찾을 수 없습니다/);
    expect(validateMonsterSpawnRows(
      [row, { ...row, monster_hp: 0 }],
      new Set(['monster_guardian']),
      0
    )).toMatch(/몬스터 ID "monster_guardian"가 중복/);
  });

  it('creates independent monsters using each row and rejects invalid required rows', () => {
    const sourceRow = { ...row };
    const first = createMonster({
      id: 1, canvasWidth: 800, canvasHeight: 600, monsterData: sourceRow, requireMonsterStats: true,
    });
    const second = createMonster({
      id: 2, canvasWidth: 800, canvasHeight: 600,
      monsterData: { ...row, monster_hp: 1200, monster_attack: 80, monster_sp: 50 },
      requireMonsterStats: true,
    });
    expect(first.stats).toMatchObject({
      hp: 900, maxHp: 900, attack: 41, atk: 41, defense: 22, def: 22, speed: 70,
      accuracy: 0.85, critRate: 0.1,
    });
    expect(first).toMatchObject({ sp: 30, maxSP: 30, sourceStats: { monster_attack_speed: 1.5 } });
    expect(first.sourceStats).not.toBe(sourceRow);
    expect(second.stats).toMatchObject({ hp: 1200, attack: 80 });
    sourceRow.monster_speed = 999;
    expect(first.sourceStats?.monster_speed).toBe(70);
    first.stats.hp = 5;
    expect(second.stats.hp).toBe(1200);
    expect(() => createMonster({
      id: 3, canvasWidth: 800, canvasHeight: 600,
      monsterData: { ...row, monster_hp: 0 }, requireMonsterStats: true,
    })).toThrow(/monster_hp/);
  });

  it('creates independent AI pattern state for each monster', () => {
    const first = createMonster({ id: 1, canvasWidth: 800, canvasHeight: 600 });
    const second = createMonster({ id: 2, canvasWidth: 800, canvasHeight: 600 });
    const defaultCondition = defaultAIPatternConfig.patterns[0].conditions[0];
    const secondCondition = second.aiPatternConfig.patterns[0].conditions[0];

    expect(first.aiPatternConfig.patterns).not.toBe(second.aiPatternConfig.patterns);
    expect(first.aiPatternConfig.patterns[0].conditions).not.toBe(
      second.aiPatternConfig.patterns[0].conditions
    );
    first.aiPatternConfig.patterns[0].conditions[0].value = 123;
    expect(secondCondition.value).toBe(defaultCondition.value);
    expect(defaultCondition.value).toBe(-1);
  });

  it('copies shared basic-attack definitions into per-monster runtime state', () => {
    const sharedSkill = { ...defaultSkills.meleeBasic };
    const monsterData = { ...row, monster_basic_attack_id: sharedSkill.id };
    const skillConfigs = { [sharedSkill.id]: sharedSkill };
    const first = createMonster({
      id: 1, canvasWidth: 800, canvasHeight: 600, monsterData, skillConfigs,
    });
    const second = createMonster({
      id: 2, canvasWidth: 800, canvasHeight: 600, monsterData, skillConfigs,
    });
    const firstSkill = first.basicAttack?.skill;
    const secondSkill = second.basicAttack?.skill;

    expect(firstSkill).not.toBe(sharedSkill);
    expect(secondSkill).not.toBe(sharedSkill);
    expect(secondSkill).not.toBe(firstSkill);
    if (!firstSkill || !secondSkill) throw new Error('Monster basic attack was not created');

    firstSkill.damageMultiplier = 2.5;
    expect(secondSkill.damageMultiplier).toBe(sharedSkill.damageMultiplier);
    expect(sharedSkill.damageMultiplier).toBe(defaultSkills.meleeBasic.damageMultiplier);
  });

  it('uses a complete built-in basic attack when the row references an unknown skill', () => {
    const monster = createMonster({
      id: 1,
      canvasWidth: 800,
      canvasHeight: 600,
      monsterData: { ...row, monster_basic_attack_id: 'missingBasic' },
    });

    expect(monster.basicAttack?.skill).toMatchObject({
      id: 'missingBasic',
      name: '기본 공격',
      type: defaultSkills.meleeBasic.type,
      tags: defaultSkills.meleeBasic.tags,
      timing: defaultSkills.meleeBasic.timing,
    });
  });

  it('keeps spawn positions inside small canvases and rejects invalid dimensions', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
    try {
      const monster = createMonster({ id: 1, canvasWidth: 20, canvasHeight: 40 });
      expect(monster.position).toEqual({ x: 10, y: 20 });
    } finally {
      randomSpy.mockRestore();
    }

    expect(() => createMonster({ id: 2, canvasWidth: 0, canvasHeight: 40 })).toThrow(
      /Canvas dimensions must be positive finite numbers/
    );
    expect(() => createMonster({ id: 3, canvasWidth: 40, canvasHeight: Number.NaN })).toThrow(
      /Canvas dimensions must be positive finite numbers/
    );
  });

  it('requires unique execution IDs to remain non-negative safe integers', () => {
    for (const id of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => createMonster({ id, canvasWidth: 800, canvasHeight: 600 })).toThrow(
        /Monster execution IDs must be non-negative safe integers/
      );
    }

    expect(() => createMonster({
      id: Number.MAX_SAFE_INTEGER + 1,
      canvasWidth: 800,
      canvasHeight: 600,
    })).toThrow(/Monster execution IDs must be non-negative safe integers/);

    expect(() => createMonsters({
      count: 2,
      maxCount: 2,
      startId: Number.MAX_SAFE_INTEGER,
      canvasWidth: 800,
      canvasHeight: 600,
    })).toThrow(/Monster execution IDs must be non-negative safe integers/);
  });

  it('uses complete default skill data when applying a basic attack without an existing slot', () => {
    const basicAttack = {
      range: 80, width: 90, damage: 1.2, cooldown: 500, spCost: 0, castTime: 100,
    };
    const player = initializePlayer(800, 600);
    const monster = createMonster({ id: 1, canvasWidth: 800, canvasHeight: 600 });

    updatePlayerBasicAttack(player, basicAttack);
    updateMonsterBasicAttacks([monster], basicAttack);

    expect(player.basicAttack?.skill).toMatchObject({
      description: defaultSkills.meleeBasic.description,
      tags: defaultSkills.meleeBasic.tags,
      timing: defaultSkills.meleeBasic.timing,
    });
    expect(monster.basicAttack?.skill).toMatchObject({
      description: defaultSkills.meleeBasic.description,
      tags: defaultSkills.meleeBasic.tags,
      timing: defaultSkills.meleeBasic.timing,
    });
  });

  it('rejects non-finite basic attack settings instead of silently ignoring them', () => {
    const player = initializePlayer(800, 600);
    const monster = createMonster({ id: 1, canvasWidth: 800, canvasHeight: 600 });
    const invalidAttack = {
      range: Number.NaN, width: 90, damage: 1.2, cooldown: 500, spCost: 0, castTime: 100,
    };

    expect(() => updatePlayerBasicAttack(player, invalidAttack)).toThrow(/finite numeric values/);
    expect(() => updateMonsterBasicAttacks([monster], invalidAttack)).toThrow(/finite numeric values/);
    expect(player.basicAttack).toBeNull();
    expect(monster.basicAttack).toBeNull();
  });

  it('initializes players with valid canvas dimensions and isolated basic attack state', () => {
    const basicAttack: BasicAttackSlot = {
      skill: { ...defaultSkills.meleeBasic },
      keyBinding: 'click',
    };
    const first = initializePlayer(800, 600, false, basicAttack);
    const second = initializePlayer(800, 600, false, basicAttack);

    expect(first.position).toEqual({ x: 400, y: 300 });
    expect(first.basicAttack).not.toBe(basicAttack);
    expect(first.basicAttack?.skill).not.toBe(basicAttack.skill);
    expect(second.basicAttack?.skill).not.toBe(first.basicAttack?.skill);
    expect(() => initializePlayer(0, 600)).toThrow(/Canvas dimensions must be positive finite numbers/);
    expect(initializePlayer(0, Number.NaN, true).position).toEqual({ x: 0, y: 0 });
  });

  it('applies the newly selected row when a monster respawns', () => {
    const monster = createMonster({
      id: 1, canvasWidth: 800, canvasHeight: 600, monsterData: row, requireMonsterStats: true,
    });
    killMonster(monster, 500);
    const next = { ...row, monster_hp: 300, monster_attack: 65, monster_sp: 60 };
    const context = { currentDataRow: next, nextMonsterId: 2, requireMonsterStats: true };
    expect(updateRespawnTimers([monster], 500, {
      enabled: true, delay: 500, maxCount: 1, canvasWidth: 800, canvasHeight: 600,
    }, context)).toBe(1);
    expect(monster.stats).toMatchObject({ hp: 300, maxHp: 300, attack: 65 });
    expect(monster).toMatchObject({ sp: 60, maxSP: 60, sourceStats: next });
  });
});
