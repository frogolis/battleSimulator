import { afterEach, describe, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';
import { DEFAULT_CHARACTER_TYPES } from '../../lib/characterTypes';
import type { FormulaBlock } from '../../lib/formulaTypes';
import { getDefaultItemSlots } from '../../lib/itemSystem';
import { defaultMonsterLevelConfig, defaultPlayerLevelConfig } from '../../lib/levelSystem';
import { mockDataset } from '../../lib/mockData';
import { defaultSkills, EFFECT_PRESETS, getDefaultBasicAttackSlot } from '../../lib/skillSystem';
import { importGameDataFromWorkbook } from '../data-io/importManager';
import { GameDataSetters, GameDataState } from '../data-io/model';
import { createInitialMonsterTypeStats } from '../simulator/setup';
import { exportGameDataToWorkbook } from './exportManager';

describe('exportGameDataToWorkbook', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('writes a workbook that preserves combined skill effects and level formula blocks', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T00:00:00.000Z'));
    const writeWorkbookFile = vi.fn();

    const blocks: FormulaBlock[] = [{
      id: 'sum', type: 'operator', operator: '+', children: [
        { id: 'level', type: 'variable', value: 'LEVEL' },
        { id: 'constant', type: 'constant', value: 5, color: '#123456' },
      ],
    }];
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
        monsterRespawnDelay: 0,
        monsterMaxCount: 0,
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
        monsterRespawnDelay: 0,
        monsterMaxCount: 0,
      },
      playerLevelConfig: {
        ...defaultPlayerLevelConfig,
        formulaMode: 'advanced',
        hpFormulaBlocks: blocks,
        spFormulaBlocks: [],
        attackFormulaBlocks: blocks,
        defenseFormulaBlocks: blocks,
        speedFormulaBlocks: blocks,
      },
      monsterLevelConfig: { ...defaultMonsterLevelConfig, hpFormulaBlocks: blocks },
      skillConfigs: {
        ...defaultSkills,
        powerSlash: {
          ...defaultSkills.powerSlash,
          effects: [
            EFFECT_PRESETS.trail_slash,
            EFFECT_PRESETS.projectile_fireball,
            EFFECT_PRESETS.lightning_chain,
            EFFECT_PRESETS.ring_single,
            { ...EFFECT_PRESETS.glow_heal, customCode: 'return [];', useCustomCode: true },
          ],
        },
      },
      playerBasicAttack: getDefaultBasicAttackSlot('melee'),
      monsterBasicAttack: getDefaultBasicAttackSlot('melee'),
      itemSlots: getDefaultItemSlots(),
      characterTypes: DEFAULT_CHARACTER_TYPES,
      monsterTypeStats: createInitialMonsterTypeStats(),
      playerDataset: mockDataset.map((row, index) =>
        index === 0 ? { ...row, player_character_id: 'playerA' } : row
      ),
      monsterDataset: mockDataset.map(row => ({
        ...row,
        monster_definition_id: 'monster_exported',
      })),
      stageDefinitions: [{
        id: 'stage_forest',
        name: '숲',
        waves: [{
          id: 'wave_1',
          durationMs: 30000,
          monsterSpawns: [{ monsterDefinitionId: 'monster_exported', count: 2 }],
          respawn: { enabled: true, delayMs: 1500 },
        }],
      }],
    };

    const filename = exportGameDataToWorkbook(state, writeWorkbookFile);

    expect(filename).toBe('game-data-2026-01-15.xlsx');
    expect(writeWorkbookFile).toHaveBeenCalledTimes(1);

    const workbook = writeWorkbookFile.mock.calls[0][0] as XLSX.WorkBook;
    const setters: GameDataSetters = {
      onPlayerConfigChange: vi.fn(),
      onMonsterConfigChange: vi.fn(),
      onPlayerLevelConfigChange: vi.fn(),
      onMonsterLevelConfigChange: vi.fn(),
      onSkillConfigsChange: vi.fn(),
      onPlayerBasicAttackChange: vi.fn(),
      onMonsterBasicAttackChange: vi.fn(),
      onItemSlotsChange: vi.fn(),
      onCharacterTypesChange: vi.fn(),
      onMonsterTypeStatsChange: vi.fn(),
      onPlayerDatasetChange: vi.fn(),
      onMonsterDatasetChange: vi.fn(),
      onStageDefinitionsChange: vi.fn(),
    };
    importGameDataFromWorkbook(XLSX.write(workbook, { type: 'binary', bookType: 'xlsx' }), setters, {
      currentTick: 0,
      playerTypeId: state.playerConfig.typeId,
      monsterTypeId: state.monsterConfig.typeId,
    });
    for (const setter of [setters.onPlayerConfigChange, setters.onMonsterConfigChange]) {
      expect(setter).toHaveBeenCalledWith(
        expect.objectContaining({ monsterRespawnDelay: 0, monsterMaxCount: 0 })
      );
    }
    expect(setters.onPlayerDatasetChange).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ player_character_id: 'playerA' })])
    );
    expect(setters.onStageDefinitionsChange).toHaveBeenCalledWith(state.stageDefinitions);
    expect(setters.onPlayerLevelConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        formulaMode: 'advanced',
        hpFormulaBlocks: blocks,
        spFormulaBlocks: [],
        attackFormulaBlocks: blocks,
        defenseFormulaBlocks: blocks,
        speedFormulaBlocks: blocks,
      })
    );
    expect(setters.onMonsterLevelConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({ hpFormulaBlocks: blocks, spFormulaBlocks: undefined })
    );
    expect(setters.onSkillConfigsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        powerSlash: expect.objectContaining({
          effects: state.skillConfigs.powerSlash.effects,
        }),
      })
    );
  });
});
