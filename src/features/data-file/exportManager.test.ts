import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CHARACTER_TYPES } from '../../lib/characterTypes';
import { getDefaultItemSlots } from '../../lib/itemSystem';
import { defaultMonsterLevelConfig, defaultPlayerLevelConfig } from '../../lib/levelSystem';
import { mockDataset } from '../../lib/mockData';
import { defaultSkills, getDefaultBasicAttackSlot } from '../../lib/skillSystem';
import { GameDataState } from '../data-io/model';
import { createInitialMonsterTypeStats } from '../simulator/setup';
import { exportGameDataToWorkbook } from './exportManager';

describe('exportGameDataToWorkbook', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('writes workbook file and returns dated filename', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T00:00:00.000Z'));
    const writeWorkbookFile = vi.fn();

    const state: GameDataState = {
      playerConfig: {
        size: { min: 18, max: 22 },
        speed: { min: 140, max: 160 },
        attack: { min: 45, max: 55 },
        defense: { min: 18, max: 22 },
        attackSpeed: { min: 1.4, max: 1.6 },
        accuracy: { min: 80, max: 90 },
        criticalRate: { min: 20, max: 30 },
        attackRange: { min: 75, max: 85 },
        attackWidth: { min: 85, max: 95 },
        typeId: 'warrior',
      },
      monsterConfig: {
        size: { min: 22, max: 26 },
        speed: { min: 55, max: 65 },
        attack: { min: 35, max: 45 },
        defense: { min: 13, max: 17 },
        attackSpeed: { min: 0.9, max: 1.1 },
        accuracy: { min: 70, max: 80 },
        criticalRate: { min: 12, max: 18 },
        attackRange: { min: 55, max: 65 },
        attackWidth: { min: 115, max: 125 },
        typeId: 'warrior',
      },
      playerLevelConfig: defaultPlayerLevelConfig,
      monsterLevelConfig: defaultMonsterLevelConfig,
      skillConfigs: defaultSkills,
      playerBasicAttack: getDefaultBasicAttackSlot('melee'),
      monsterBasicAttack: getDefaultBasicAttackSlot('melee'),
      itemSlots: getDefaultItemSlots(),
      characterTypes: DEFAULT_CHARACTER_TYPES,
      monsterTypeStats: createInitialMonsterTypeStats(),
      playerDataset: mockDataset,
      monsterDataset: mockDataset,
    };

    const filename = exportGameDataToWorkbook(state, writeWorkbookFile);

    expect(filename).toBe('game-data-2026-01-15.xlsx');
    expect(writeWorkbookFile).toHaveBeenCalledTimes(1);
  });
});
