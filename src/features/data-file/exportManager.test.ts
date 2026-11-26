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
      playerBasicAttack: {
        ...getDefaultBasicAttackSlot('melee'), keyBinding: 'auto',
        range: 0, width: 23.5, damage: 1.25, cooldown: 0, spCost: 7, castTime: 50,
      },
      monsterBasicAttack: {
        ...getDefaultBasicAttackSlot('melee'), keyBinding: 'click',
        range: 80, width: 0, damage: 0, cooldown: 150, spCost: 0, castTime: 0,
      },
      itemSlots: getDefaultItemSlots(),
      characterTypes: DEFAULT_CHARACTER_TYPES,
      monsterTypeStats: createInitialMonsterTypeStats(),
      playerDataset: mockDataset.map((row, index) =>
        index === 0 ? { ...row, player_character_id: 'playerA' } : row
      ),
      monsterDataset: [
        { ...mockDataset[0], monster_definition_id: 'monster_exported', monster_spawn_weight: 0 },
        { ...mockDataset[0], monster_definition_id: 'monster_second', monster_spawn_weight: 1 },
      ],
      stageDefinitions: [{
        id: 'stage_forest',
        name: '숲',
        waves: [{
          id: 'wave_1',
          durationMs: 30000,
          monsterSpawns: [{ monsterDefinitionId: 'monster_exported', count: 2 }],
          respawn: { enabled: true, delayMs: 1500 },
        }],
      }, {
        id: 'stage_cave',
        name: '동굴',
        waves: [{
          id: 'wave_1',
          durationMs: 20000,
          monsterSpawns: [{ monsterDefinitionId: 'monster_second', count: 3 }],
          respawn: { enabled: false, delayMs: 0 },
        }],
      }, {
        id: 'stage_draft',
        name: '',
        waves: [{
          id: 'wave_draft',
          durationMs: 0,
          monsterSpawns: [{ monsterDefinitionId: 'monster_exported', count: 0 }],
          respawn: { enabled: false, delayMs: 0 },
        }, {
          id: 'wave_empty',
          durationMs: 1000,
          monsterSpawns: [],
          respawn: { enabled: false, delayMs: 0 },
        }],
      }, {
        id: 'stage_empty',
        name: '',
        waves: [],
      }],
    };

    const filename = exportGameDataToWorkbook(state, writeWorkbookFile);

    expect(filename).toBe('game-data-2026-01-15.xlsx');
    expect(writeWorkbookFile).toHaveBeenCalledTimes(1);

    const workbook = writeWorkbookFile.mock.calls[0][0] as XLSX.WorkBook;
    expect(XLSX.utils.sheet_to_json(workbook.Sheets['Wave Monster Mappings'])).toEqual([
      { stageId: 'stage_forest', waveId: 'wave_1', monsterDefinitionId: 'monster_exported', count: 2 },
      { stageId: 'stage_cave', waveId: 'wave_1', monsterDefinitionId: 'monster_second', count: 3 },
      { stageId: 'stage_draft', waveId: 'wave_draft', monsterDefinitionId: 'monster_exported', count: 0 },
    ]);
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
    expect(setters.onMonsterDatasetChange).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ monster_spawn_weight: 0 })])
    );
    expect(setters.onPlayerBasicAttackChange).toHaveBeenCalledWith(
      expect.objectContaining(state.playerBasicAttack)
    );
    expect(setters.onMonsterBasicAttackChange).toHaveBeenCalledWith(
      expect.objectContaining(state.monsterBasicAttack)
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

    const invalidVisual = { ...state.skillConfigs.powerSlash.visual };
    Reflect.set(invalidVisual, 'cycle', invalidVisual);
    const failedWrite = vi.fn();
    expect(() => exportGameDataToWorkbook({
      ...state,
      skillConfigs: {
        ...state.skillConfigs,
        powerSlash: { ...state.skillConfigs.powerSlash, visual: invalidVisual },
      },
    }, failedWrite)).toThrow(/Skills\.powerSlash\.visual/);
    expect(failedWrite).not.toHaveBeenCalled();
    expect(Reflect.get(invalidVisual, 'cycle')).toBe(invalidVisual);

    const invalidSkill = { ...state.skillConfigs.powerSlash };
    Reflect.deleteProperty(invalidSkill, 'visual');
    expect(() => exportGameDataToWorkbook({
      ...state, skillConfigs: { ...state.skillConfigs, powerSlash: invalidSkill },
    }, failedWrite)).toThrow(/Skills\.powerSlash\.visual/);
    expect(failedWrite).not.toHaveBeenCalled();

    expect(() => exportGameDataToWorkbook({
      ...state,
      skillConfigs: {
        ...state.skillConfigs,
        powerSlash: {
          ...state.skillConfigs.powerSlash,
          visual: { ...state.skillConfigs.powerSlash.visual, particleCount: Number.NaN },
        },
      },
    }, failedWrite)).toThrow(/Skills\.powerSlash\.visual/);
    expect(failedWrite).not.toHaveBeenCalled();

    const invalidBlock: FormulaBlock = { id: 'cycle', type: 'container', children: [] };
    invalidBlock.children?.push(invalidBlock);
    expect(() => exportGameDataToWorkbook({
      ...state,
      monsterLevelConfig: { ...state.monsterLevelConfig, hpFormulaBlocks: [invalidBlock] },
    }, failedWrite)).toThrow(/Monster Level Config\.hpFormulaBlocks/);
    expect(failedWrite).not.toHaveBeenCalled();

    for (const invalidValue of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(() => exportGameDataToWorkbook({
        ...state,
        monsterDataset: [{ ...state.monsterDataset[0], monster_spawn_weight: invalidValue }],
      }, failedWrite)).toThrow(/Monster Dataset.*2행.*monster_spawn_weight/);
      expect(failedWrite).not.toHaveBeenCalled();
    }

    const rowWithLegacyMetadata = {
      ...state.playerDataset[0], legacyMetadata: { label: 'draft' },
    };
    expect(() => exportGameDataToWorkbook({
      ...state,
      playerDataset: [state.playerDataset[0], rowWithLegacyMetadata],
    }, failedWrite)).toThrow(/Player Dataset.*3행.*legacyMetadata/);
    expect(failedWrite).not.toHaveBeenCalled();

    expect(() => exportGameDataToWorkbook({
      ...state,
      skillConfigs: {
        ...state.skillConfigs,
        powerSlash: { ...state.skillConfigs.powerSlash, spCost: Number.POSITIVE_INFINITY },
      },
    }, failedWrite)).toThrow(/Skills.*spCost/);
    expect(failedWrite).not.toHaveBeenCalled();
  });
});
