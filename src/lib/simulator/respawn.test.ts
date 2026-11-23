import { describe, expect, it, vi } from 'vitest';
import { defaultMonsterLevelConfig } from '../levelSystem';
import type { DataRow } from '../mockData';
import {
  createMonster,
  createMonsters,
  createMonstersForMappings,
  resolveMonsterCount,
} from './characters';
import {
  killMonster,
  removeDeadMonsters,
  respawnAllDead,
  updateRespawnTimers,
} from './respawn';

const row: DataRow = {
  t: 0, x: 0, y: 0, speed: 0, dir: 0, is_attack: 0, is_miss: 0, is_crit: 0,
  monster_name: '새 몬스터',
  monster_color: '#abcdef',
  monster_sp: 25,
  monster_basic_attack_id: 'meleeBasic',
  monster_basic_attack_range: 130,
};

const config = {
  enabled: true, delay: 2000, maxCount: 2, canvasWidth: 800, canvasHeight: 600,
};
const stageMonsterRow: DataRow = {
  ...row,
  monster_definition_id: 'monster_stage_guard',
  monster_hp: 100,
  monster_attack: 10,
  monster_defense: 5,
  monster_speed: 20,
  monster_attack_speed: 1,
  monster_accuracy: 90,
  monster_critical_rate: 5,
};

describe('monster respawn', () => {
  it('caps requested monster counts to a non-negative integer limit', () => {
    expect(resolveMonsterCount(8, 5)).toBe(5);
    expect(resolveMonsterCount(3, 5)).toBe(3);
    expect(resolveMonsterCount(3.9, 3.2)).toBe(3);
    expect(resolveMonsterCount(3, 0)).toBe(0);
    expect(() => resolveMonsterCount(Number.NaN, 5)).toThrow(/finite numbers/);
    expect(() => resolveMonsterCount(3, Number.POSITIVE_INFINITY)).toThrow(/finite numbers/);
  });

  it('uses the bounded batch creator for monster IDs, names, selection and required stats', () => {
    const selectMonsterByWeight = vi.fn(() => row);
    const monsters = createMonsters({
      count: 3,
      maxCount: 2,
      canvasWidth: 800,
      canvasHeight: 600,
      startId: 10,
      selectMonsterByWeight,
    });

    expect(monsters.map(monster => [monster.id, monster.name])).toEqual([
      [10, '새 몬스터'],
      [11, '새 몬스터'],
    ]);
    expect(selectMonsterByWeight).toHaveBeenCalledTimes(2);
    expect(createMonsters({
      count: 2,
      maxCount: 2,
      canvasWidth: 800,
      canvasHeight: 600,
      fallbackNameStartIndex: 2,
    }).map(monster => monster.name)).toEqual(['몬스터 3', '몬스터 4']);
    expect(() => createMonsters({
      count: 1,
      maxCount: 1,
      canvasWidth: 800,
      canvasHeight: 600,
      currentDataRow: row,
      requireMonsterStats: true,
    })).toThrow();
  });

  it('creates exactly the mapped monster definitions and rejects missing or excessive mappings', () => {
    const monsters = createMonstersForMappings({
      monsterSpawns: [{ monsterDefinitionId: 'monster_stage_guard', count: 2 }],
      monsterDataset: [stageMonsterRow],
      maxCount: 2,
      startId: 5,
      canvasWidth: 800,
      canvasHeight: 600,
    });

    expect(monsters.map(monster => [monster.id, monster.sourceStats?.monster_definition_id]))
      .toEqual([[5, 'monster_stage_guard'], [6, 'monster_stage_guard']]);
    expect(() => createMonstersForMappings({
      monsterSpawns: [{ monsterDefinitionId: 'missing', count: 1 }],
      monsterDataset: [stageMonsterRow],
      maxCount: 2,
      startId: 0,
      canvasWidth: 800,
      canvasHeight: 600,
    })).toThrow(/was not found/);
    expect(() => createMonstersForMappings({
      monsterSpawns: [{ monsterDefinitionId: 'monster_stage_guard', count: 3 }],
      monsterDataset: [stageMonsterRow],
      maxCount: 2,
      startId: 0,
      canvasWidth: 800,
      canvasHeight: 600,
    })).toThrow(/exceeds the maximum/);
  });

  it('records death once, clamps HP and leaves the existing respawn timer unchanged on repeats', () => {
    const monster = createMonster({ id: 1, canvasWidth: 800, canvasHeight: 600 });
    monster.stats.hp = -50;
    expect(killMonster(monster, 2000)).toBe(true);
    expect(monster).toMatchObject({ isDead: true, respawnTimer: 2000, stats: { hp: 0 } });
    monster.respawnTimer = 500;
    expect(killMonster(monster, 2000)).toBe(false);
    expect(monster.respawnTimer).toBe(500);
    const context = { nextMonsterId: 2 };
    expect(updateRespawnTimers([monster], 500, config, context)).toBe(1);
    expect(killMonster(monster, 0)).toBe(true);
    expect(monster).toMatchObject({ isDead: true, respawnTimer: 0, stats: { hp: 0 } });
  });

  it('removes dead entities when respawn is disabled', () => {
    const alive = createMonster({ id: 1, canvasWidth: 800, canvasHeight: 600 });
    const dead = createMonster({ id: 2, canvasWidth: 800, canvasHeight: 600 });
    killMonster(dead, 0);

    expect(removeDeadMonsters([alive, dead])).toEqual([alive]);
  });

  it('counts down once per update and reconstructs the selected monster after the delay', () => {
    const monster = createMonster({ id: 1, canvasWidth: 800, canvasHeight: 600 });
    killMonster(monster, 2000);
    monster.attackCooldown = 900;
    monster.currentSkill = 2;
    const selectMonsterByWeight = vi.fn(() => row);
    const context = {
      selectMonsterByWeight, nextMonsterId: 10, monsterLevelConfig: defaultMonsterLevelConfig,
    };

    expect(updateRespawnTimers([monster], 1000, config, context)).toBe(0);
    expect(monster.respawnTimer).toBe(1000);
    expect(selectMonsterByWeight).not.toHaveBeenCalled();
    expect(updateRespawnTimers([monster], 999, config, context)).toBe(0);
    expect(updateRespawnTimers([monster], 1, config, context)).toBe(1);
    expect(monster).toMatchObject({
      id: 10, isDead: false, respawnTimer: 0, name: '새 몬스터', color: '#abcdef',
      sp: 25, maxSP: 25, attackCooldown: 0, currentSkill: null,
      basicAttack: { range: 130 },
    });
    expect(context.nextMonsterId).toBe(11);
    expect(selectMonsterByWeight).toHaveBeenCalledTimes(1);
  });

  it('respawns a stage monster from its original definition snapshot', () => {
    const monster = createMonster({
      id: 1,
      canvasWidth: 800,
      canvasHeight: 600,
      monsterData: stageMonsterRow,
      requireMonsterStats: true,
    });
    killMonster(monster, 0);
    const context = {
      monsterDataset: [stageMonsterRow],
      preserveMonsterDefinition: true,
      selectMonsterByWeight: vi.fn(() => row),
      nextMonsterId: 2,
      requireMonsterStats: true,
    };

    expect(updateRespawnTimers([monster], 0, config, context)).toBe(1);
    expect(monster.sourceStats?.monster_definition_id).toBe('monster_stage_guard');
    expect(context.selectMonsterByWeight).not.toHaveBeenCalled();
  });

  it('keeps elapsed monsters pending at capacity and retries when a slot is available', () => {
    const monsters = [1, 2, 3].map(id =>
      createMonster({ id, canvasWidth: 800, canvasHeight: 600 })
    );
    killMonster(monsters[1], 500);
    killMonster(monsters[2], 500);
    const context = { currentDataRow: row, nextMonsterId: 10 };
    expect(updateRespawnTimers(monsters, 500, config, context)).toBe(1);
    expect(monsters[2]).toMatchObject({ isDead: true, respawnTimer: 0 });
    killMonster(monsters[0], 500);
    expect(updateRespawnTimers(monsters, 1, config, context)).toBe(1);
    expect(monsters[2]).toMatchObject({ id: 11, isDead: false });
    expect(monsters.filter(monster => !monster.isDead)).toHaveLength(2);
  });

  it('pauses timers when disabled and resumes a zero timer when enabled', () => {
    const monster = createMonster({ id: 1, canvasWidth: 800, canvasHeight: 600 });
    killMonster(monster, 0);
    const context = { nextMonsterId: 2 };
    expect(updateRespawnTimers([monster], 100, { ...config, enabled: false }, context)).toBe(0);
    expect(monster.isDead).toBe(true);
    expect(updateRespawnTimers([monster], 100, config, context)).toBe(1);
    expect(monster.isDead).toBe(false);
  });

  it('does not immediately respawn entities when respawn is disabled', () => {
    const monster = createMonster({ id: 1, canvasWidth: 800, canvasHeight: 600 });
    killMonster(monster, 500);
    const context = { nextMonsterId: 2 };

    expect(respawnAllDead([monster], { ...config, enabled: false }, context)).toBe(0);
    expect(monster).toMatchObject({ isDead: true, respawnTimer: 500 });
    expect(context.nextMonsterId).toBe(2);
  });
});
