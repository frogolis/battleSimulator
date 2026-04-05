import { describe, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';
import { DATA_WORKBOOK_SHEETS } from '../data-file/constants';
import { importGameDataFromWorkbook } from './importManager';
import { GameDataSetters } from './model';

function buildValidWorkbookBinary(): string {
  const workbook = XLSX.utils.book_new();

  const add = (name: string, rows: Array<Record<string, unknown>>) => {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), name);
  };

  add(DATA_WORKBOOK_SHEETS.CHARACTER_TYPES, [
    {
      id: 'warrior',
      name: '전사',
      description: '테스트',
      color: 'text-red-600',
      defaultLevel: 1,
      defaultSize: 24,
      defaultBasicAttackId: 'meleeBasic',
      defaultSkillIds: JSON.stringify(['powerSlash']),
      statFormulas: JSON.stringify({ hpFormula: '100 + level * 10' }),
    },
  ]);
  add(DATA_WORKBOOK_SHEETS.MONSTER_TYPES, [
    {
      id: 'warrior',
      characterType: 'warrior',
      baseLevel: 1,
      size: 24,
      aiPattern: 'aggressive',
      skills: JSON.stringify(['powerSlash']),
      aiPatternConfig: JSON.stringify({ patterns: [], aggroRange: 300, chaseMinDistance: 0 }),
    },
  ]);
  add(DATA_WORKBOOK_SHEETS.SKILLS, [
    {
      id: 'powerSlash',
      name: '강타',
      description: '',
      type: 'damage',
      category: 'skill',
      tags: JSON.stringify(['skill']),
      iconName: 'Swords',
      spCost: 20,
      cooldown: 1000,
      castTime: 100,
      range: 75,
      area: 90,
      timing: JSON.stringify({ windup: 0, execution: 100, recovery: 0 }),
      damageMultiplier: 1.5,
      damageFormula: JSON.stringify({ stat: 'attack', operator: '*', value: 1.5 }),
      healAmount: 0,
      buffDuration: 0,
      buffEffect: JSON.stringify({}),
      visual: JSON.stringify({
        effectPresetId: 'trail_slash',
        color: '#ffffff',
        secondaryColor: '#ffffff',
        particleCount: 10,
        particleSize: 4,
        particleLifetime: 300,
        glowIntensity: 0.3,
        effectShape: 'line',
      }),
      projectile: JSON.stringify({
        type: 'none',
        speed: 0,
        size: 0,
        piercing: false,
        homing: false,
        trail: false,
        trailLength: 0,
      }),
      animation: JSON.stringify({
        castAnimation: 'charge',
        castScale: 1,
        impactAnimation: 'flash',
        impactDuration: 100,
        cameraShake: 0,
      }),
      sound: JSON.stringify({ castSound: '', impactSound: '', volume: 0 }),
    },
  ]);
  add(DATA_WORKBOOK_SHEETS.ITEMS, [
    {
      slotNumber: 1,
      keyBinding: 'F1',
      item: JSON.stringify({
        id: 'healthPotion',
        name: '포션',
        description: '',
        type: 'potion',
        iconName: 'Flask',
        healAmount: 10,
        spRestore: 0,
        damageAmount: 0,
        damageRange: 0,
        buffDuration: 0,
        buffEffect: {},
        cooldown: 1000,
        currentCooldown: 0,
        isOnCooldown: false,
        quantity: 1,
        maxStack: 5,
        color: '#ff0000',
        particleCount: 10,
      }),
    },
  ]);
  add(DATA_WORKBOOK_SHEETS.PLAYER_DATASET, [
    { t: 0, x: 0, y: 0, speed: 100, dir: 0, is_attack: 0, is_miss: 0, is_crit: 0, player_level: 1 },
  ]);
  add(DATA_WORKBOOK_SHEETS.MONSTER_DATASET, [
    { t: 0, x: 0, y: 0, speed: 80, dir: 0, is_attack: 0, is_miss: 0, is_crit: 0, monster_level: 1 },
  ]);
  add(DATA_WORKBOOK_SHEETS.PLAYER_LEVEL_CONFIG, [
    {
      currentLevel: 1,
      currentExp: 0,
      expToNextLevel: 100,
      maxLevel: 100,
      hpPerLevel: 10,
      spPerLevel: 5,
      attackPerLevel: 2,
      defensePerLevel: 1,
      speedPerLevel: 0,
      hpGrowth: JSON.stringify({ a: 10, b: 100 }),
      spGrowth: JSON.stringify({ a: 5, b: 50 }),
      attackGrowth: JSON.stringify({ a: 2, b: 10 }),
      defenseGrowth: JSON.stringify({ a: 1, b: 5 }),
      speedGrowth: JSON.stringify({ a: 0, b: 100 }),
      formulaMode: 'simple',
      expGrowth: JSON.stringify({ type: 'linear', a: 100, b: 0 }),
      baseHp: 100,
      baseSp: 50,
      baseAttack: 10,
      baseDefense: 5,
      baseSpeed: 100,
    },
  ]);
  add(DATA_WORKBOOK_SHEETS.MONSTER_LEVEL_CONFIG, [
    {
      currentLevel: 1,
      currentExp: 0,
      expToNextLevel: 100,
      maxLevel: 100,
      hpPerLevel: 10,
      spPerLevel: 5,
      attackPerLevel: 2,
      defensePerLevel: 1,
      speedPerLevel: 0,
      hpGrowth: JSON.stringify({ a: 10, b: 100 }),
      spGrowth: JSON.stringify({ a: 5, b: 50 }),
      attackGrowth: JSON.stringify({ a: 2, b: 10 }),
      defenseGrowth: JSON.stringify({ a: 1, b: 5 }),
      speedGrowth: JSON.stringify({ a: 0, b: 80 }),
      formulaMode: 'simple',
      expGrowth: JSON.stringify({ type: 'linear', a: 100, b: 0 }),
      baseHp: 100,
      baseSp: 50,
      baseAttack: 10,
      baseDefense: 5,
      baseSpeed: 80,
    },
  ]);
  add(DATA_WORKBOOK_SHEETS.PLAYER_BASIC_ATTACK, [{ keyBinding: 'click', skillId: 'meleeBasic' }]);
  add(DATA_WORKBOOK_SHEETS.MONSTER_BASIC_ATTACK, [{ keyBinding: 'click', skillId: 'meleeBasic' }]);
  add(DATA_WORKBOOK_SHEETS.PLAYER_CONFIG, [
    {
      typeId: 'warrior',
      attackType: 'melee',
      sizeMin: 20,
      sizeMax: 20,
      speedMin: 100,
      speedMax: 100,
      attackMin: 10,
      attackMax: 10,
      defenseMin: 5,
      defenseMax: 5,
      attackSpeedMin: 1,
      attackSpeedMax: 1,
      accuracyMin: 80,
      accuracyMax: 80,
      criticalRateMin: 10,
      criticalRateMax: 10,
      attackRangeMin: 75,
      attackRangeMax: 75,
      attackWidthMin: 90,
      attackWidthMax: 90,
    },
  ]);
  add(DATA_WORKBOOK_SHEETS.MONSTER_CONFIG, [
    {
      typeId: 'warrior',
      attackType: 'melee',
      sizeMin: 24,
      sizeMax: 24,
      speedMin: 80,
      speedMax: 80,
      attackMin: 10,
      attackMax: 10,
      defenseMin: 5,
      defenseMax: 5,
      attackSpeedMin: 1,
      attackSpeedMax: 1,
      accuracyMin: 80,
      accuracyMax: 80,
      criticalRateMin: 10,
      criticalRateMax: 10,
      attackRangeMin: 75,
      attackRangeMax: 75,
      attackWidthMin: 90,
      attackWidthMax: 90,
    },
  ]);

  return XLSX.write(workbook, { type: 'binary', bookType: 'xlsx' });
}

function createSetters(): GameDataSetters {
  return {
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
  };
}

describe('importGameDataFromWorkbook', () => {
  it('throws when required sheet is missing', () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ a: 1 }]), 'Only One Sheet');
    const binary = XLSX.write(workbook, { type: 'binary', bookType: 'xlsx' });

    expect(() => importGameDataFromWorkbook(binary, createSetters())).toThrow(/필수 시트 누락/);
  });

  it('applies imported data via setters when workbook is valid', () => {
    const setters = createSetters();
    const binary = buildValidWorkbookBinary();

    importGameDataFromWorkbook(binary, setters);

    expect(setters.onCharacterTypesChange).toHaveBeenCalledTimes(1);
    expect(setters.onSkillConfigsChange).toHaveBeenCalledTimes(1);
    expect(setters.onPlayerConfigChange).toHaveBeenCalledTimes(1);
    expect(setters.onMonsterConfigChange).toHaveBeenCalledTimes(1);
    expect(setters.onPlayerDatasetChange).toHaveBeenCalledTimes(1);
    expect(setters.onMonsterDatasetChange).toHaveBeenCalledTimes(1);
  });
});
