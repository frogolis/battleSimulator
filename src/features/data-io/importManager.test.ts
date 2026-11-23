import { describe, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';
import { defaultSkills, EFFECT_PRESETS } from '../../lib/skillSystem';
import { DATA_WORKBOOK_SHEETS } from '../data-file/constants';
import { findPlayerLevelRow } from '../simulator/playerLevelTable';
import { importGameDataFromWorkbook, parseGameDataFromWorkbook } from './importManager';
import { GameDataSetters } from './model';

function buildValidWorkbookBinary(effects?: string): string {
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
      effects,
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
    onStageDefinitionsChange: vi.fn(),
  };
}

function changeSheet(
  sheetName: string,
  change: (rows: Array<Record<string, unknown>>) => void
): string {
  const workbook = XLSX.read(buildValidWorkbookBinary(), { type: 'binary' });
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName]);
  change(rows);
  workbook.Sheets[sheetName] = XLSX.utils.json_to_sheet(rows);
  return XLSX.write(workbook, { type: 'binary', bookType: 'xlsx' });
}

function addStageSheets(
  binary: string,
  stageRows: Array<Record<string, unknown>>,
  waveRows: Array<Record<string, unknown>>,
  mappingRows: Array<Record<string, unknown>>
): string {
  const workbook = XLSX.read(binary, { type: 'binary' });
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(stageRows),
    DATA_WORKBOOK_SHEETS.STAGES
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(waveRows),
    DATA_WORKBOOK_SHEETS.WAVES
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(mappingRows),
    DATA_WORKBOOK_SHEETS.WAVE_MONSTER_MAPPINGS
  );
  return XLSX.write(workbook, { type: 'binary', bookType: 'xlsx' });
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

    const imported = importGameDataFromWorkbook(binary, setters);

    expect(setters.onCharacterTypesChange).toHaveBeenCalledTimes(1);
    expect(setters.onSkillConfigsChange).toHaveBeenCalledTimes(1);
    expect(setters.onPlayerConfigChange).toHaveBeenCalledTimes(1);
    expect(setters.onMonsterConfigChange).toHaveBeenCalledTimes(1);
    expect(setters.onPlayerDatasetChange).toHaveBeenCalledTimes(1);
    expect(setters.onMonsterDatasetChange).toHaveBeenCalledTimes(1);
    expect(setters.onStageDefinitionsChange).toHaveBeenCalledWith([]);
    expect(imported.playerDataset).toEqual(vi.mocked(setters.onPlayerDatasetChange).mock.calls[0][0]);
    expect(imported.monsterDataset).toEqual(vi.mocked(setters.onMonsterDatasetChange).mock.calls[0][0]);
    expect(imported.skillConfigs).toEqual(vi.mocked(setters.onSkillConfigsChange).mock.calls[0][0]);
  });

  it('parses the data set without applying it to the UI', () => {
    const data = parseGameDataFromWorkbook(buildValidWorkbookBinary());
    expect(data.skillConfigs?.powerSlash).toMatchObject({ spCost: 20, cooldown: 1000 });
    expect(data.playerLevelConfig?.baseHp).toBe(100);
    expect(data.playerLevelConfig?.hpFormulaBlocks).toBeUndefined();
    expect(data.monsterDataset?.[0].monster_level).toBe(1);
    expect(data.monsterDataset?.[0].monster_definition_id).toMatch(/^monster_legacy_\d+$/);
    expect(data.stageDefinitions).toEqual([]);
  });

  it('assigns repeatable legacy IDs and rejects duplicate monster IDs', () => {
    const legacyWorkbook = changeSheet(DATA_WORKBOOK_SHEETS.MONSTER_DATASET, rows => {
      rows.forEach(row => delete row.monster_definition_id);
      rows.push({ ...rows[0], monster_name: '두 번째 몬스터' });
    });
    const firstImport = parseGameDataFromWorkbook(legacyWorkbook).monsterDataset;
    const secondImport = parseGameDataFromWorkbook(legacyWorkbook).monsterDataset;

    expect(firstImport?.map(row => row.monster_definition_id)).toEqual(
      secondImport?.map(row => row.monster_definition_id)
    );
    expect(new Set(firstImport?.map(row => row.monster_definition_id)).size).toBe(2);

    const duplicateWorkbook = changeSheet(DATA_WORKBOOK_SHEETS.MONSTER_DATASET, rows => {
      rows[0].monster_definition_id = 'monster_shared';
      rows.push({ ...rows[0] });
    });
    const setters = createSetters();
    expect(() => importGameDataFromWorkbook(duplicateWorkbook, setters)).toThrow(/중복/);
    Object.values(setters).forEach(setter => expect(setter).not.toHaveBeenCalled());
  });

  it('rejects broken wave monster references before applying imported data', () => {
    const binary = addStageSheets(
      buildValidWorkbookBinary(),
      [{ id: 'stage_forest', name: '숲' }],
      [{
        id: 'wave_1',
        stageId: 'stage_forest',
        order: 0,
        durationMs: 30000,
        respawnEnabled: false,
        respawnDelayMs: 0,
      }],
      [{ waveId: 'wave_1', monsterDefinitionId: 'missing_monster', count: 1 }]
    );
    const setters = createSetters();

    expect(() => importGameDataFromWorkbook(binary, setters))
      .toThrow(/몬스터 ID "missing_monster".*찾을 수 없습니다/);
    Object.values(setters).forEach(setter => expect(setter).not.toHaveBeenCalled());
  });

  it.each([
    [DATA_WORKBOOK_SHEETS.PLAYER_DATASET, 'player_hp'],
    [DATA_WORKBOOK_SHEETS.PLAYER_DATASET, 'player_sp'],
    [DATA_WORKBOOK_SHEETS.MONSTER_DATASET, 'monster_hp'],
    [DATA_WORKBOOK_SHEETS.MONSTER_DATASET, 'monster_sp'],
  ])('rejects invalid %s resource %s before applying data', (sheet, field) => {
    for (const invalid of [-1, 'not a number']) {
      const setters = createSetters();
      const binary = changeSheet(sheet, rows => { rows[0][field] = invalid; });
      expect(() => importGameDataFromWorkbook(binary, setters))
        .toThrow(new RegExp(`${sheet}.*2행.*${field}`));
      Object.values(setters).forEach(setter => expect(setter).not.toHaveBeenCalled());
    }
  });

  it('normalizes numeric resource cells and preserves zero and blank values', () => {
    const binary = changeSheet(DATA_WORKBOOK_SHEETS.PLAYER_DATASET, rows => {
      rows[0].player_hp = '123.5';
      rows[0].player_sp = 0;
      rows.push({ ...rows[0], player_hp: ' ', player_sp: '' });
    });
    const data = parseGameDataFromWorkbook(binary);
    expect(data.playerDataset?.[0]).toMatchObject({ player_hp: 123.5, player_sp: 0 });
    expect(data.playerDataset?.[1].player_hp).toBeUndefined();
    expect(data.playerDataset?.[1].player_sp).toBeUndefined();
  });

  it('normalizes monster combat stats while preserving incomplete draft values', () => {
    const binary = changeSheet(DATA_WORKBOOK_SHEETS.MONSTER_DATASET, rows => {
      Object.assign(rows[0], {
        monster_attack: '250.5', monster_defense: '0', monster_speed: '150',
        monster_attack_speed: '1.25', monster_accuracy: '85', monster_critical_rate: '10',
      });
      rows.push({ ...rows[0], monster_speed: ' ' });
    });
    const rows = parseGameDataFromWorkbook(binary).monsterDataset;
    expect(rows?.[0]).toMatchObject({
      monster_attack: 250.5, monster_defense: 0, monster_speed: 150,
      monster_attack_speed: 1.25, monster_accuracy: 85, monster_critical_rate: 10,
    });
    expect(rows?.[1].monster_speed).toBeUndefined();
  });

  it.each([
    'monster_attack', 'monster_defense', 'monster_speed',
    'monster_attack_speed', 'monster_accuracy', 'monster_critical_rate',
  ])('rejects invalid monster %s before applying data', field => {
    for (const invalid of [-1, 'not a number']) {
      const setters = createSetters();
      const binary = changeSheet(DATA_WORKBOOK_SHEETS.MONSTER_DATASET, rows => {
        rows[0][field] = invalid;
      });
      expect(() => importGameDataFromWorkbook(binary, setters))
        .toThrow(new RegExp(`Monster Dataset.*2행.*${field}`));
      Object.values(setters).forEach(setter => expect(setter).not.toHaveBeenCalled());
    }
  });

  it('identifies authored level rows by character ID and level while retaining legacy rows', () => {
    const binary = changeSheet(DATA_WORKBOOK_SHEETS.PLAYER_DATASET, rows => {
      rows[0].player_character_id = ' hero-a ';
      rows[0].player_level = '1';
      rows.push({ ...rows[0], player_level: 2 });
      rows.push({ ...rows[0], player_character_id: 'hero-b' });
      rows.push({ ...rows[0], player_character_id: '' });
    });
    const rows = parseGameDataFromWorkbook(binary).playerDataset;
    expect(rows?.map(row => [row.player_character_id, row.player_level])).toEqual([
      ['hero-a', 1], ['hero-a', 2], ['hero-b', 1], [undefined, '1'],
    ]);
  });

  it('normalizes authored combat stats without filling blanks or changing legacy rows', () => {
    const binary = changeSheet(DATA_WORKBOOK_SHEETS.PLAYER_DATASET, rows => {
      Object.assign(rows[0], {
        player_character_id: 'hero', player_hp: '500', player_sp: '0',
        player_attack: '250.5', player_defense: '0', player_speed: '150',
        player_attack_speed: '1.25', player_accuracy: '85', player_critical_rate: '10',
      });
      rows.push({ ...rows[0], player_level: 2, player_attack: ' ' });
      rows.push({ ...rows[0], player_character_id: '', player_attack: 'legacy value' });
    });
    const rows = parseGameDataFromWorkbook(binary).playerDataset;
    expect(rows?.[0]).toMatchObject({
      player_hp: 500, player_sp: 0, player_attack: 250.5, player_defense: 0,
      player_speed: 150, player_attack_speed: 1.25, player_accuracy: 85, player_critical_rate: 10,
    });
    expect(rows?.[1].player_attack).toBeUndefined();
    expect(rows?.[2].player_attack).toBe('legacy value');
    expect(findPlayerLevelRow(rows ?? [], 'hero', 1).ok).toBe(true);
    expect(findPlayerLevelRow(rows ?? [], 'hero', 2).ok).toBe(false);
  });

  it.each([
    'player_attack', 'player_defense', 'player_speed',
    'player_attack_speed', 'player_accuracy', 'player_critical_rate',
  ])('rejects invalid authored %s before applying data', field => {
    for (const invalid of [-1, 'not a number']) {
      const setters = createSetters();
      const binary = changeSheet(DATA_WORKBOOK_SHEETS.PLAYER_DATASET, rows => {
        rows[0].player_character_id = 'hero';
        rows[0][field] = invalid;
      });
      expect(() => importGameDataFromWorkbook(binary, setters))
        .toThrow(new RegExp(`Player Dataset.*2행.*${field}`));
      Object.values(setters).forEach(setter => expect(setter).not.toHaveBeenCalled());
    }
  });

  it.each([undefined, 0, 1.5, 'invalid'])(
    'rejects a character level row with invalid level %s',
    level => {
      const setters = createSetters();
      const binary = changeSheet(DATA_WORKBOOK_SHEETS.PLAYER_DATASET, rows => {
        rows[0].player_character_id = 'hero';
        rows[0].player_level = level;
      });
      expect(() => importGameDataFromWorkbook(binary, setters))
        .toThrow(/Player Dataset.*2행.*player_level/);
      Object.values(setters).forEach(setter => expect(setter).not.toHaveBeenCalled());
    }
  );

  it('rejects duplicate character and level pairs before applying data', () => {
    const setters = createSetters();
    const binary = changeSheet(DATA_WORKBOOK_SHEETS.PLAYER_DATASET, rows => {
      rows[0].player_character_id = 'hero';
      rows.push({ ...rows[0], player_character_id: ' hero ' });
    });
    expect(() => importGameDataFromWorkbook(binary, setters))
      .toThrow(/Player Dataset.*3행.*hero.*중복/);
    Object.values(setters).forEach(setter => expect(setter).not.toHaveBeenCalled());
  });

  it('rejects invalid late-sheet JSON before applying any data', () => {
    const setters = createSetters();
    const binary = changeSheet(DATA_WORKBOOK_SHEETS.MONSTER_LEVEL_CONFIG, rows => {
      rows[0].expGrowth = '{invalid';
    });

    expect(() => importGameDataFromWorkbook(binary, setters)).toThrow(/expGrowth.*JSON/);
    Object.values(setters).forEach(setter => expect(setter).not.toHaveBeenCalled());
  });

  it.each([
    [DATA_WORKBOOK_SHEETS.SKILLS, 'tags', '["skill", 1]'],
    [DATA_WORKBOOK_SHEETS.SKILLS, 'timing', '{"windup":0}'],
    [DATA_WORKBOOK_SHEETS.SKILLS, 'visual', 'null'],
    [DATA_WORKBOOK_SHEETS.SKILLS, 'damageFormula', '{"stat":"attack","operator":"/","value":2}'],
    [DATA_WORKBOOK_SHEETS.SKILLS, 'buffEffect', 'null'],
    [DATA_WORKBOOK_SHEETS.SKILLS, 'buffEffect', '{"attack":"10"}'],
    [DATA_WORKBOOK_SHEETS.SKILLS, 'projectile', 'null'],
    [DATA_WORKBOOK_SHEETS.SKILLS, 'projectile', '{"type":"none","speed":0,"size":0,"piercing":false,"homing":false,"trail":false}'],
    [DATA_WORKBOOK_SHEETS.SKILLS, 'projectile', '{"type":"invalid","speed":0,"size":0,"piercing":false,"homing":false,"trail":false,"trailLength":0}'],
    [DATA_WORKBOOK_SHEETS.SKILLS, 'animation', '{"castAnimation":"charge","castScale":"1","impactAnimation":"flash","impactDuration":0,"cameraShake":0}'],
    [DATA_WORKBOOK_SHEETS.SKILLS, 'sound', '{"castSound":"","impactSound":"","volume":null}'],
    [DATA_WORKBOOK_SHEETS.PLAYER_LEVEL_CONFIG, 'hpGrowth', '[]'],
    [DATA_WORKBOOK_SHEETS.PLAYER_LEVEL_CONFIG, 'expGrowth', 'null'],
    [DATA_WORKBOOK_SHEETS.MONSTER_LEVEL_CONFIG, 'expGrowth', '{"type":"other","a":1,"b":2}'],
    [DATA_WORKBOOK_SHEETS.PLAYER_LEVEL_CONFIG, 'expGrowthConfig', '{"segments":{}}'],
    [DATA_WORKBOOK_SHEETS.MONSTER_LEVEL_CONFIG, 'expGrowthConfig', '{"segments":[],"bezierSegments":[{"id":"1","startLevel":1,"endLevel":2,"startExp":1,"endExp":2,"controlPoint1":{"x":0,"y":0},"controlPoint2":null}]}'],
    [DATA_WORKBOOK_SHEETS.MONSTER_LEVEL_CONFIG, 'expGrowthConfig', '{"segments":[],"useBezier":"true"}'],
    [DATA_WORKBOOK_SHEETS.PLAYER_LEVEL_CONFIG, 'hpFormulaBlocks', 'null'],
    [DATA_WORKBOOK_SHEETS.MONSTER_LEVEL_CONFIG, 'speedFormulaBlocks', '[{"id":"a","type":"operator","children":[{"id":"b","type":"invalid"}]}]'],
    [DATA_WORKBOOK_SHEETS.PLAYER_LEVEL_CONFIG, 'attackFormulaBlocks', '[{"id":"a","type":"function","functionName":"INVALID"}]'],
    [DATA_WORKBOOK_SHEETS.CHARACTER_TYPES, 'defaultSkillIds', 'null'],
    [DATA_WORKBOOK_SHEETS.CHARACTER_TYPES, 'statFormulas', '[]'],
    [DATA_WORKBOOK_SHEETS.CHARACTER_TYPES, 'statFormulas', '{"hpFormula":100}'],
    [DATA_WORKBOOK_SHEETS.MONSTER_TYPES, 'skills', '{}'],
  ])('rejects wrong JSON structure in %s.%s', (sheetName, field, value) => {
    const setters = createSetters();
    const binary = changeSheet(sheetName, rows => {
      rows[0][field] = value;
    });

    expect(() => importGameDataFromWorkbook(binary, setters)).toThrow(field);
    Object.values(setters).forEach(setter => expect(setter).not.toHaveBeenCalled());
  });

  it('uses the built-in skill settings when legacy JSON columns are missing', () => {
    const binary = changeSheet(DATA_WORKBOOK_SHEETS.SKILLS, rows => {
      delete rows[0].buffEffect;
      delete rows[0].projectile;
      delete rows[0].animation;
      delete rows[0].sound;
    });

    expect(parseGameDataFromWorkbook(binary).skillConfigs?.powerSlash).toMatchObject({
      buffEffect: defaultSkills.powerSlash.buffEffect,
      projectile: defaultSkills.powerSlash.projectile,
      animation: defaultSkills.powerSlash.animation,
      sound: defaultSkills.powerSlash.sound,
    });
  });

  it.each([
    [DATA_WORKBOOK_SHEETS.CHARACTER_TYPES, 'defaultSkillIds', '["missing"]'],
    [DATA_WORKBOOK_SHEETS.CHARACTER_TYPES, 'defaultBasicAttackId', 'missing'],
    [DATA_WORKBOOK_SHEETS.MONSTER_TYPES, 'skills', '["missing"]'],
    [DATA_WORKBOOK_SHEETS.MONSTER_TYPES, 'characterType', 'missing'],
    [DATA_WORKBOOK_SHEETS.PLAYER_CONFIG, 'typeId', 'missing'],
    [DATA_WORKBOOK_SHEETS.MONSTER_CONFIG, 'typeId', 'missing'],
    [DATA_WORKBOOK_SHEETS.PLAYER_DATASET, 'player_attack_type', 'missing'],
    [DATA_WORKBOOK_SHEETS.MONSTER_DATASET, 'monster_attack_type', 'missing'],
    [DATA_WORKBOOK_SHEETS.PLAYER_DATASET, 'player_skill_2_id', 'missing'],
    [DATA_WORKBOOK_SHEETS.MONSTER_DATASET, 'monster_basic_attack_id', 'missing'],
    [DATA_WORKBOOK_SHEETS.PLAYER_BASIC_ATTACK, 'skillId', 'missing'],
    [DATA_WORKBOOK_SHEETS.MONSTER_BASIC_ATTACK, 'skillId', '__proto__'],
  ])('rejects missing references in %s.%s', (sheetName, field, value) => {
    const setters = createSetters();
    const binary = changeSheet(sheetName, rows => {
      rows[0][field] = value;
    });

    expect(() => importGameDataFromWorkbook(binary, setters)).toThrow(/찾을 수 없습니다/);
    Object.values(setters).forEach(setter => expect(setter).not.toHaveBeenCalled());
  });

  it.each([
    [DATA_WORKBOOK_SHEETS.CHARACTER_TYPES, 'defaultAIPattern', '{"patterns":[],"aggroRange":"300","chaseMinDistance":0}'],
    [DATA_WORKBOOK_SHEETS.MONSTER_TYPES, 'aiPatternConfig', '{"patterns":[{"action":"invalid","conditions":[],"enabled":true}],"aggroRange":300,"chaseMinDistance":0}'],
    [DATA_WORKBOOK_SHEETS.MONSTER_DATASET, 'monster_ai_patterns', '{invalid'],
    [DATA_WORKBOOK_SHEETS.MONSTER_DATASET, 'monster_ai_patterns', '{"patterns":[{"action":"attack","conditions":[{"type":"distance","operator":"=","value":10}],"enabled":true}],"aggroRange":300,"chaseMinDistance":0}'],
    [DATA_WORKBOOK_SHEETS.MONSTER_DATASET, 'monster_ai_patterns', 'null'],
  ])('rejects invalid AI configuration in %s.%s before applying data', (sheetName, field, value) => {
    const setters = createSetters();
    const binary = changeSheet(sheetName, rows => {
      rows[0][field] = value;
    });
    expect(() => importGameDataFromWorkbook(binary, setters)).toThrow(field);
    Object.values(setters).forEach(setter => expect(setter).not.toHaveBeenCalled());
  });

  it('preserves valid monster dataset AI patterns and accepts null optional type patterns', () => {
    const ai = JSON.stringify({
      patterns: [{ action: 'attack', enabled: true, skillId: 'powerSlash',
        conditions: [{ type: 'distance', operator: '<=', value: -1 }] }],
      aggroRange: 300,
      chaseMinDistance: 0,
    });
    const binary = changeSheet(DATA_WORKBOOK_SHEETS.MONSTER_DATASET, rows => {
      rows[0].monster_ai_patterns = ai;
    });
    expect(parseGameDataFromWorkbook(binary).monsterDataset?.[0].monster_ai_patterns).toBe(ai);

    const legacy = changeSheet(DATA_WORKBOOK_SHEETS.MONSTER_TYPES, rows => {
      rows[0].aiPatternConfig = 'null';
    });
    expect(parseGameDataFromWorkbook(legacy).monsterTypeStats?.warrior.aiPatternConfig).toBeUndefined();
  });

  it.each([
    [DATA_WORKBOOK_SHEETS.CHARACTER_TYPES, 'defaultAIPattern'],
    [DATA_WORKBOOK_SHEETS.MONSTER_TYPES, 'aiPatternConfig'],
    [DATA_WORKBOOK_SHEETS.MONSTER_DATASET, 'monster_ai_patterns'],
  ])('rejects missing AI skill references in %s.%s', (sheetName, field) => {
    const setters = createSetters();
    const binary = changeSheet(sheetName, rows => {
      rows[0][field] = JSON.stringify({
        patterns: [{ action: 'skill', enabled: true, skillId: 'missing', conditions: [] }],
        aggroRange: 300,
        chaseMinDistance: 0,
      });
    });
    expect(() => importGameDataFromWorkbook(binary, setters)).toThrow(/AI 패턴 1.*missing.*찾을 수 없습니다/);
    Object.values(setters).forEach(setter => expect(setter).not.toHaveBeenCalled());
  });

  it('imports built-in skills referenced only by AI and preserves legacy slot references', () => {
    const binary = changeSheet(DATA_WORKBOOK_SHEETS.MONSTER_DATASET, rows => {
      rows[0].monster_ai_patterns = JSON.stringify({
        patterns: [
          { action: 'skill', enabled: true, skillId: 'heal', conditions: [] },
          { action: 'skill', enabled: true, skillId: 'skill1', conditions: [] },
        ],
        aggroRange: 300,
        chaseMinDistance: 0,
      });
    });
    const data = parseGameDataFromWorkbook(binary);
    expect(data.skillConfigs?.heal).toEqual(defaultSkills.heal);
    expect(data.skillConfigs?.heal).not.toBe(defaultSkills.heal);
    expect(data.monsterDataset?.[0].monster_ai_patterns).toContain('skill1');
  });

  it('accepts a legacy missing type ID and null optional stat formulas', () => {
    const config = changeSheet(DATA_WORKBOOK_SHEETS.PLAYER_CONFIG, rows => {
      delete rows[0].typeId;
    });
    expect(parseGameDataFromWorkbook(config).playerConfig?.typeId).toBe('warrior');

    const types = changeSheet(DATA_WORKBOOK_SHEETS.CHARACTER_TYPES, rows => {
      rows[0].statFormulas = 'null';
    });
    expect(parseGameDataFromWorkbook(types).characterTypes?.[0].statFormulas).toBeUndefined();
  });

  it.each([
    [DATA_WORKBOOK_SHEETS.PLAYER_DATASET, 'player_attack_type'],
    [DATA_WORKBOOK_SHEETS.MONSTER_DATASET, 'monster_attack_type'],
  ])('accepts a defined or missing dataset type in %s', (sheetName, field) => {
    const withType = changeSheet(sheetName, rows => { rows[0][field] = 'warrior'; });
    expect(() => parseGameDataFromWorkbook(withType)).not.toThrow();
    const withoutType = changeSheet(sheetName, rows => { rows[0][field] = ''; });
    expect(() => parseGameDataFromWorkbook(withoutType)).not.toThrow();
  });

  it('rejects non-string dataset type IDs with their original sheet location', () => {
    const setters = createSetters();
    const binary = changeSheet(DATA_WORKBOOK_SHEETS.MONSTER_DATASET, rows => {
      rows[0].monster_attack_type = 123;
    });
    expect(() => importGameDataFromWorkbook(binary, setters))
      .toThrow(/Monster Dataset.*2행.*monster_attack_type.*문자열/);
    Object.values(setters).forEach(setter => expect(setter).not.toHaveBeenCalled());
  });

  it('resolves built-in skills referenced by legacy files', () => {
    const data = parseGameDataFromWorkbook(buildValidWorkbookBinary());
    expect(data.playerBasicAttack?.skill.id).toBe('meleeBasic');
    expect(data.skillConfigs?.meleeBasic).toEqual(defaultSkills.meleeBasic);
    expect(data.skillConfigs?.meleeBasic).not.toBe(defaultSkills.meleeBasic);
    expect(data.skillConfigs?.meleeBasic.visual).not.toBe(defaultSkills.meleeBasic.visual);
  });

  it('rejects malformed optional effect and custom code settings', () => {
    const setters = createSetters();
    const effects = JSON.stringify([{ ...EFFECT_PRESETS.glow_heal, customCode: 42 }]);
    expect(() => importGameDataFromWorkbook(buildValidWorkbookBinary(effects), setters)).toThrow(
      /이펙트 데이터/
    );
    Object.values(setters).forEach(setter => expect(setter).not.toHaveBeenCalled());
  });

  it('accepts a legacy null experience configuration and a valid segmented curve', () => {
    const config = {
      segments: [{ id: '1', startLevel: 1, endLevel: 10, formula: '100*x' }],
      bezierSegments: [{
        id: '1', startLevel: 1, endLevel: 10, startExp: 100, endExp: 1000,
        controlPoint1: { x: 0.3, y: 0.2 }, controlPoint2: { x: 0.7, y: 0.8 },
      }],
      useBezier: true,
      yAxisMax: 1000,
    };
    const binary = changeSheet(DATA_WORKBOOK_SHEETS.PLAYER_LEVEL_CONFIG, rows => {
      rows[0].expGrowthConfig = JSON.stringify(config);
    });
    const data = parseGameDataFromWorkbook(binary);
    expect(data.playerLevelConfig?.expGrowthConfig).toEqual(config);
    expect(data.monsterLevelConfig?.expGrowthConfig).toBeUndefined();
    const legacy = changeSheet(DATA_WORKBOOK_SHEETS.MONSTER_LEVEL_CONFIG, rows => {
      rows[0].expGrowthConfig = 'null';
    });
    expect(parseGameDataFromWorkbook(legacy).monsterLevelConfig?.expGrowthConfig).toBeUndefined();
  });

  it('rejects unknown level formula modes before applying any data', () => {
    const setters = createSetters();
    const binary = changeSheet(DATA_WORKBOOK_SHEETS.MONSTER_LEVEL_CONFIG, rows => {
      rows[0].formulaMode = 'unknown';
    });
    expect(() => importGameDataFromWorkbook(binary, setters)).toThrow(/formulaMode/);
    Object.values(setters).forEach(setter => expect(setter).not.toHaveBeenCalled());
  });

  it.each([
    ['spCost', -1],
    ['cooldown', -1],
    ['spCost', 'not-a-number'],
    ['cooldown', 'Infinity'],
  ])('rejects invalid %s before applying any data', (field, value) => {
    const setters = createSetters();
    const binary = changeSheet(DATA_WORKBOOK_SHEETS.SKILLS, rows => {
      rows[0][field] = value;
    });

    expect(() => importGameDataFromWorkbook(binary, setters)).toThrow(field);
    Object.values(setters).forEach(setter => expect(setter).not.toHaveBeenCalled());
  });

  it('accepts zero skill cost and cooldown', () => {
    const binary = changeSheet(DATA_WORKBOOK_SHEETS.SKILLS, rows => {
      rows[0].spCost = 0;
      rows[0].cooldown = 0;
    });

    expect(parseGameDataFromWorkbook(binary).skillConfigs?.powerSlash).toMatchObject({
      spCost: 0,
      cooldown: 0,
    });
  });

  it.each([
    ['type', 'unknown'],
    ['category', 'unknown'],
    ['damageMultiplier', -1],
  ])('rejects invalid skill %s without applying data', (field, value) => {
    const setters = createSetters();
    const binary = changeSheet(DATA_WORKBOOK_SHEETS.SKILLS, rows => {
      rows[0][field] = value;
    });
    expect(() => importGameDataFromWorkbook(binary, setters)).toThrow(field);
    Object.values(setters).forEach(setter => expect(setter).not.toHaveBeenCalled());
  });

  it.each([
    DATA_WORKBOOK_SHEETS.CHARACTER_TYPES,
    DATA_WORKBOOK_SHEETS.MONSTER_TYPES,
    DATA_WORKBOOK_SHEETS.SKILLS,
  ])('rejects duplicate IDs in %s without applying data', sheetName => {
    const setters = createSetters();
    const binary = changeSheet(sheetName, rows => rows.push({ ...rows[0] }));

    expect(() => importGameDataFromWorkbook(binary, setters)).toThrow(/중복/);
    Object.values(setters).forEach(setter => expect(setter).not.toHaveBeenCalled());
  });

  it('rejects missing IDs instead of creating anonymous definitions', () => {
    const binary = changeSheet(DATA_WORKBOOK_SHEETS.SKILLS, rows => {
      rows[0].id = '';
    });
    expect(() => parseGameDataFromWorkbook(binary)).toThrow(/ID가 비어/);
  });

  it('preserves special string IDs as monster entries', () => {
    const binary = changeSheet(DATA_WORKBOOK_SHEETS.MONSTER_TYPES, rows => {
      rows[0].id = '__proto__';
    });
    const types = parseGameDataFromWorkbook(binary).monsterTypeStats;
    if (!types) throw new Error('Monster types were not parsed.');
    expect(Object.hasOwn(types, '__proto__')).toBe(true);
    expect(types['__proto__'].characterType).toBe('warrior');
  });

  it('reports the original spreadsheet row when there are blank rows', () => {
    const workbook = XLSX.read(buildValidWorkbookBinary(), { type: 'binary' });
    const sheet = workbook.Sheets[DATA_WORKBOOK_SHEETS.SKILLS];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
    XLSX.utils.sheet_add_json(sheet, [rows[0]], { origin: 'A4', skipHeader: true });

    expect(() =>
      parseGameDataFromWorkbook(XLSX.write(workbook, { type: 'binary', bookType: 'xlsx' }))
    ).toThrow(/4행.*중복/);
  });

  it('reports sheet and original row for invalid skill data', () => {
    const workbook = XLSX.read(buildValidWorkbookBinary(), { type: 'binary' });
    const sheet = workbook.Sheets[DATA_WORKBOOK_SHEETS.SKILLS];
    if (!sheet['!ref']) throw new Error('Skills sheet has no range.');
    const range = XLSX.utils.decode_range(sheet['!ref']);
    const row = Array.from({ length: range.e.c + 1 }, (_, column) => {
      const header = sheet[XLSX.utils.encode_cell({ r: 0, c: column })]?.v;
      if (header === 'id') return 'anotherSkill';
      if (header === 'visual') return 'null';
      return sheet[XLSX.utils.encode_cell({ r: 1, c: column })]?.v;
    });
    XLSX.utils.sheet_add_aoa(sheet, [row], { origin: 'A4' });

    expect(() =>
      parseGameDataFromWorkbook(XLSX.write(workbook, { type: 'binary', bookType: 'xlsx' }))
    ).toThrow(/Skills.*4행.*visual/);
  });

  it.each(['{invalid', '[{}]', '{}'])(
    'rejects invalid skill effects before applying any workbook data: %s',
    effects => {
      const setters = createSetters();
      expect(() => importGameDataFromWorkbook(buildValidWorkbookBinary(effects), setters)).toThrow(
        /이펙트 데이터/
      );
      expect(setters.onCharacterTypesChange).not.toHaveBeenCalled();
      expect(setters.onSkillConfigsChange).not.toHaveBeenCalled();
    }
  );
});
