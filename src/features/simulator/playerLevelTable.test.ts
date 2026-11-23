import { describe, expect, it } from 'vitest';
import { calculateLevelStats, defaultPlayerLevelConfig } from '../../lib/levelSystem';
import type { DataRow } from '../../lib/mockData';
import {
  addPlayerTableExperience,
  applyPlayerLevelRow,
  findPlayerLevelRow,
  recalculateLegacyPlayerRows,
} from './playerLevelTable';

const config = {
  ...defaultPlayerLevelConfig,
  currentLevel: 1,
  currentExp: 0,
  expToNextLevel: 100,
  expGrowthConfig: undefined,
  expGrowth: { type: 'linear' as const, a: 100, b: 0 },
};

const row: DataRow = {
  t: 0, x: 0, y: 0, speed: 0, dir: 0, is_attack: 0, is_miss: 0, is_crit: 0,
  player_character_id: 'hero',
  player_level: 2,
  player_hp: 200,
  player_sp: 0,
  player_attack: 25,
  player_defense: 10,
  player_speed: 120,
  player_attack_speed: 1,
  player_accuracy: 85,
  player_critical_rate: 10,
};

describe('player level table', () => {
  it('preserves authored character rows while recalculating legacy rows', () => {
    const legacy = { ...row, player_character_id: undefined, player_hp: 9999 };
    const result = recalculateLegacyPlayerRows([row, legacy], config, []);
    expect(result.count).toBe(1);
    expect(result.rows[0]).toBe(row);
    expect(result.rows[1].player_hp).not.toBe(9999);
  });

  it('uses the exact character and level without substituting another character', () => {
    expect(findPlayerLevelRow([row], 'hero', 2)).toEqual({ ok: true, row });
    expect(findPlayerLevelRow([row], 'other', 2)).toMatchObject({ ok: false });
    expect(findPlayerLevelRow([row], undefined, 2)).toMatchObject({ ok: false });
    expect(findPlayerLevelRow([row, { ...row }], 'hero', 2)).toMatchObject({ ok: false });
  });

  it('uses authored resource and combat stats instead of level formula values', () => {
    const match = findPlayerLevelRow([row], 'hero', 2);
    if (!match.ok) throw new Error(match.reason);
    expect(applyPlayerLevelRow(calculateLevelStats(config), match.row)).toMatchObject({
      hp: 200, sp: 0, attack: 25, defense: 10, speed: 120,
    });
  });

  it('rejects missing and invalid required stats but accepts zero SP', () => {
    expect(findPlayerLevelRow([row], 'hero', 2).ok).toBe(true);
    for (const invalid of [{ ...row, player_hp: 0 }, { ...row, player_attack: undefined },
      { ...row, player_speed: Number.NaN }]) {
      expect(findPlayerLevelRow([invalid], 'hero', 2)).toMatchObject({ ok: false });
    }
  });

  it('blocks on a missing next level while preserving all earned experience', () => {
    const result = addPlayerTableExperience(config, 150, [], 'hero');
    expect(result.newConfig).toMatchObject({ currentLevel: 1, currentExp: 150, expToNextLevel: 100 });
    expect(result.levelsGained).toBe(0);
    expect(result.blockedReason).toMatch(/레벨 2 행이 없습니다/);
  });

  it('applies each available level, then retains experience at the first missing level', () => {
    const result = addPlayerTableExperience(config, 350, [row], 'hero');
    expect(result.newConfig).toMatchObject({ currentLevel: 2, currentExp: 250, expToNextLevel: 200 });
    expect(result.levelRow).toBe(row);
    expect(result.levelsGained).toBe(1);
    expect(result.blockedReason).toMatch(/레벨 3 행이 없습니다/);
    const resumed = addPlayerTableExperience(result.newConfig, 0, [row, { ...row, player_level: 3 }], 'hero');
    expect(resumed.newConfig).toMatchObject({ currentLevel: 3, currentExp: 50 });
    expect(resumed.levelsGained).toBe(1);
  });

  it('does not consume experience when the next row is incomplete or ambiguous', () => {
    for (const rows of [[{ ...row, player_sp: undefined }], [row, { ...row }]]) {
      const result = addPlayerTableExperience(config, 100, rows, 'hero');
      expect(result.newConfig).toMatchObject({ currentLevel: 1, currentExp: 100 });
      expect(result.blockedReason).toBeTruthy();
    }
  });
});
