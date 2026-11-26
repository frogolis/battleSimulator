import * as XLSX from 'xlsx';
import { CharacterTypeInfo } from '../../lib/characterTypes';
import type { FormulaBlock } from '../../lib/formulaTypes';
import { CharacterConfig } from '../../lib/gameTypes';
import { Item, ItemSlot } from '../../lib/itemSystem';
import {
  ExpGrowthConfig,
  ExpGrowthFormula,
  LevelConfig,
  StatGrowthFormula,
} from '../../lib/levelSystem';
import { DataRow, PLAYER_LEVEL_STAT_FIELDS } from '../../lib/mockData';
import type { AIPatternConfig } from '../../lib/monsterAI';
import type { MonsterTypeStats } from '../../lib/monsterTypes';
import { MONSTER_STAT_FIELDS } from '../../lib/simulator/monsterStats';
import { validateStageDefinitions } from '../../lib/simulator/waves';
import type { StageDefinition, WaveDefinition } from '../../lib/simulator/waves';
import { BasicAttackSlot, defaultSkills, Skill } from '../../lib/skillSystem';
import { isAIPatternConfig as isAIPatternConfigShape } from '../../../shared/aiPatternValidation.mjs';
import {
  getMonsterDatasetRowError,
  getPlayerDatasetRowError,
} from '../../../shared/datasetValidation.mjs';
import {
  getEffectOptionalFieldsError,
  isEffectPreset as isEffectPresetShape,
} from '../../../shared/effectValidation.mjs';
import { getItemSlotError } from '../../../shared/itemValidation.mjs';
import {
  hasCharacterTypeReference,
  hasSkillReference,
} from '../../../shared/referenceValidation.mjs';
import { getSkillError } from '../../../shared/skillValidation.mjs';
import { DATA_WORKBOOK_SHEETS } from '../data-file/constants';
import { prepareRowForApplication, selectImportedRows } from '../simulator/rowApplyManager';
import { GameDataSetters, GameDataState, ImportedGameData } from './model';

type SheetRow = Record<string, unknown> & { __rowNum__?: number };

export interface WorkbookImportContext {
  currentTick: number;
  playerTypeId: string;
  monsterTypeId: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(item => typeof item === 'string');

const isStatGrowthFormula = (value: unknown): value is StatGrowthFormula =>
  isRecord(value) &&
  typeof value.a === 'number' &&
  Number.isFinite(value.a) &&
  typeof value.b === 'number' &&
  Number.isFinite(value.b);

const isExpGrowthFormula = (value: unknown): value is ExpGrowthFormula =>
  isRecord(value) &&
  (value.type === 'linear' || value.type === 'exponential') &&
  isFiniteNumber(value.a) &&
  isFiniteNumber(value.b);

const isNonNegative = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

function isFormulaBlock(value: unknown): value is FormulaBlock {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.type === 'string' &&
    ['variable', 'operator', 'function', 'constant', 'container'].includes(value.type) &&
    (value.value === undefined || typeof value.value === 'string' || isFiniteNumber(value.value)) &&
    (value.operator === undefined ||
      (typeof value.operator === 'string' && ['+', '-', '*', '/', '^'].includes(value.operator))) &&
    (value.functionName === undefined ||
      (typeof value.functionName === 'string' &&
        ['MIN', 'MAX', 'ROUND', 'FLOOR', 'CEIL', 'IF', 'ABS', 'SQRT', 'POW'].includes(
          value.functionName
        ))) &&
    (value.children === undefined ||
      (Array.isArray(value.children) && value.children.every(isFormulaBlock))) &&
    (value.color === undefined || typeof value.color === 'string')
  );
}

const isOptionalFormulaBlocks = (value: unknown): value is FormulaBlock[] | undefined =>
  value === undefined || (Array.isArray(value) && value.every(isFormulaBlock));

const isExpGrowthConfig = (value: unknown): value is ExpGrowthConfig =>
  isRecord(value) &&
  Array.isArray(value.segments) &&
  value.segments.every(
    segment =>
      isRecord(segment) &&
      typeof segment.id === 'string' &&
      isFiniteNumber(segment.startLevel) &&
      isFiniteNumber(segment.endLevel) &&
      typeof segment.formula === 'string'
  ) &&
  (value.bezierSegments === undefined ||
    (Array.isArray(value.bezierSegments) &&
      value.bezierSegments.every(
        segment =>
          isRecord(segment) &&
          typeof segment.id === 'string' &&
          isFiniteNumber(segment.startLevel) &&
          isFiniteNumber(segment.endLevel) &&
          isFiniteNumber(segment.startExp) &&
          isFiniteNumber(segment.endExp) &&
          isRecord(segment.controlPoint1) &&
          isFiniteNumber(segment.controlPoint1.x) &&
          isFiniteNumber(segment.controlPoint1.y) &&
          isRecord(segment.controlPoint2) &&
          isFiniteNumber(segment.controlPoint2.x) &&
          isFiniteNumber(segment.controlPoint2.y)
      ))) &&
  (value.useBezier === undefined || typeof value.useBezier === 'boolean') &&
  (value.yAxisMax === undefined || isFiniteNumber(value.yAxisMax));

const isOptionalExpGrowthConfig = (value: unknown): value is ExpGrowthConfig | null | undefined =>
  value === null || value === undefined || isExpGrowthConfig(value);

const isAIPatternConfig = (value: unknown): value is AIPatternConfig =>
  isAIPatternConfigShape(value);

const isOptionalAIPatternConfig = (value: unknown): value is AIPatternConfig | null | undefined =>
  value === undefined || value === null || isAIPatternConfig(value);

const isOptionalStatFormulas = (
  value: unknown
): value is CharacterTypeInfo['statFormulas'] | null =>
  value === undefined ||
  value === null ||
  (isRecord(value) &&
    [
      'hpFormula',
      'spFormula',
      'attackFormula',
      'defenseFormula',
      'moveSpeedFormula',
      'attackSpeedFormula',
      'accuracyFormula',
      'criticalRateFormula',
    ].every(key => value[key] === undefined || typeof value[key] === 'string'));

const isSkillTiming = (value: unknown): value is Skill['timing'] =>
  isRecord(value) &&
  isNonNegative(value.windup) &&
  isNonNegative(value.execution) &&
  isNonNegative(value.recovery);

const isSkillBuffEffect = (value: unknown): value is Skill['buffEffect'] =>
  isRecord(value) &&
  ['attack', 'defense', 'speed', 'attackSpeed'].every(
    key => value[key] === undefined || isFiniteNumber(value[key])
  );

const isSkillProjectile = (value: unknown): value is Skill['projectile'] =>
  isRecord(value) &&
  typeof value.type === 'string' &&
  ['none', 'arrow', 'fireball', 'lightning', 'energy', 'ice', 'wave', 'wind'].includes(
    value.type
  ) &&
  isFiniteNumber(value.speed) &&
  isFiniteNumber(value.size) &&
  typeof value.piercing === 'boolean' &&
  typeof value.homing === 'boolean' &&
  typeof value.trail === 'boolean' &&
  isFiniteNumber(value.trailLength);

const isSkillAnimation = (value: unknown): value is Skill['animation'] =>
  isRecord(value) &&
  typeof value.castAnimation === 'string' &&
  isFiniteNumber(value.castScale) &&
  typeof value.impactAnimation === 'string' &&
  isFiniteNumber(value.impactDuration) &&
  isFiniteNumber(value.cameraShake);

const isSkillSound = (value: unknown): value is Skill['sound'] =>
  isRecord(value) &&
  typeof value.castSound === 'string' &&
  typeof value.impactSound === 'string' &&
  isFiniteNumber(value.volume);

function isDamageFormula(value: unknown): value is NonNullable<Skill['damageFormula']> {
  return (
    isRecord(value) &&
    typeof value.stat === 'string' &&
    ['attack', 'defense', 'magic', 'speed'].includes(value.stat) &&
    (value.operator === '+' || value.operator === '*') &&
    isFiniteNumber(value.value)
  );
}

function hasValidOptionalEffectFields(effect: Record<string, unknown>): boolean {
  return getEffectOptionalFieldsError(effect, 'effect') === undefined;
}

function isSkillVisual(value: unknown): value is Skill['visual'] {
  if (!isRecord(value)) return false;
  return (
    typeof value.color === 'string' &&
    typeof value.secondaryColor === 'string' &&
    isFiniteNumber(value.glowIntensity) &&
    isNonNegative(value.particleCount) &&
    isNonNegative(value.particleSize) &&
    isNonNegative(value.particleLifetime) &&
    typeof value.effectShape === 'string' &&
    [
      'circle',
      'cone',
      'line',
      'ring',
      'star',
      'shield',
      'dome',
      'spiral',
      'cross',
      'wave',
    ].includes(value.effectShape) &&
    (value.effectPresetId === undefined || typeof value.effectPresetId === 'string') &&
    (value.effectType === undefined ||
      (typeof value.effectType === 'string' &&
        ['projectile', 'trail', 'lightning', 'ring', 'glow'].includes(value.effectType))) &&
    (value.particleTexture === undefined ||
      (typeof value.particleTexture === 'string' &&
        ['circle', 'star', 'square', 'diamond', 'spark'].includes(value.particleTexture))) &&
    hasValidOptionalEffectFields(value)
  );
}

const readJson = <T>(row: SheetRow, key: string, fallback: T): T => {
  const value = row[key];
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  if (typeof value !== 'string') {
    throw new Error(`"${key}" 값은 JSON 문자열이어야 합니다.`);
  }
  if (value.trim() === '') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`"${key}" 값이 올바른 JSON이 아닙니다.`);
  }
};

const readValidatedJson = <T>(
  row: SheetRow,
  key: string,
  fallback: T,
  validate: (value: unknown) => value is T
): T => {
  const parsed = readJson<unknown>(row, key, fallback);
  if (!validate(parsed)) {
    throw new Error(`"${key}" 값의 데이터 형식이 올바르지 않습니다.`);
  }
  return parsed;
};

function findSkill(id: string, importedSkills: Record<string, Skill>): Skill | undefined {
  if (Object.hasOwn(importedSkills, id)) return importedSkills[id];
  if (Object.hasOwn(defaultSkills, id)) return defaultSkills[id];
  return undefined;
}

const createFallbackSkill = (id: string): Skill => ({
  id,
  name: id,
  description: '',
  type: 'damage',
  category: 'skill',
  tags: ['skill'],
  iconName: 'Sparkles',
  spCost: 0,
  cooldown: 0,
  castTime: 0,
  range: 0,
  area: 0,
  timing: { windup: 0, execution: 0, recovery: 0 },
  damageMultiplier: 1,
  healAmount: 0,
  buffDuration: 0,
  buffEffect: {},
  visual: {
    effectPresetId: 'trail_slash',
    color: '#ffffff',
    secondaryColor: '#ffffff',
    particleCount: 0,
    particleSize: 0,
    particleLifetime: 0,
    glowIntensity: 0,
    effectShape: 'line',
  },
  projectile: {
    type: 'none',
    speed: 0,
    size: 0,
    piercing: false,
    homing: false,
    trail: false,
    trailLength: 0,
  },
  animation: {
    castAnimation: 'charge',
    castScale: 1,
    impactAnimation: 'flash',
    impactDuration: 0,
    cameraShake: 0,
  },
  sound: {
    castSound: '',
    impactSound: '',
    volume: 0,
  },
  currentCooldown: 0,
  isOnCooldown: false,
});

const createSkillFromRow = (row: SheetRow): Skill => {
  const id = readString(row, 'id');
  const baseSkill = Object.hasOwn(defaultSkills, id) ? defaultSkills[id] : createFallbackSkill(id);
  let effects = baseSkill.effects;
  if (row.effects !== undefined && typeof row.effects !== 'string') {
    throw new Error(`스킬 "${id}"의 이펙트 데이터 형식이 올바르지 않습니다.`);
  }
  if (typeof row.effects === 'string' && row.effects.trim() !== '') {
    let parsed: unknown;
    try {
      parsed = JSON.parse(row.effects);
    } catch {
      throw new Error(`스킬 "${id}"의 이펙트 데이터가 올바른 JSON이 아닙니다.`);
    }
    if (!Array.isArray(parsed) || !parsed.every(isEffectPreset)) {
      throw new Error(`스킬 "${id}"의 이펙트 데이터 형식이 올바르지 않습니다.`);
    }
    effects = parsed;
  }

  const damageFormula = readJson<unknown>(row, 'damageFormula', baseSkill.damageFormula);
  if (damageFormula !== null && damageFormula !== undefined && !isDamageFormula(damageFormula)) {
    throw new Error('"damageFormula" 값의 데이터 형식이 올바르지 않습니다.');
  }

  return {
    ...baseSkill,
    id,
    name: readString(row, 'name', baseSkill.name),
    description: readString(row, 'description', baseSkill.description),
    type: readChoice(row, 'type', baseSkill.type, [
      'melee',
      'ranged',
      'damage',
      'heal',
      'buff',
      'debuff',
      'area',
      'defense',
    ]),
    category: readChoice(row, 'category', baseSkill.category, ['basicAttack', 'skill']),
    tags: readValidatedJson(row, 'tags', baseSkill.tags, isStringArray),
    iconName: readString(row, 'iconName', baseSkill.iconName),
    spCost: readNonNegativeNumber(row, 'spCost', baseSkill.spCost),
    cooldown: readNonNegativeNumber(row, 'cooldown', baseSkill.cooldown),
    castTime: readNumber(row, 'castTime', baseSkill.castTime),
    range: readNumber(row, 'range', baseSkill.range),
    area: readNumber(row, 'area', baseSkill.area),
    timing: readValidatedJson(row, 'timing', baseSkill.timing, isSkillTiming),
    damageMultiplier: readNonNegativeNumber(row, 'damageMultiplier', baseSkill.damageMultiplier),
    damageFormula: damageFormula ?? undefined,
    healAmount: readNumber(row, 'healAmount', baseSkill.healAmount),
    buffDuration: readNumber(row, 'buffDuration', baseSkill.buffDuration),
    buffEffect: readValidatedJson(row, 'buffEffect', baseSkill.buffEffect, isSkillBuffEffect),
    visual: readValidatedJson(row, 'visual', baseSkill.visual, isSkillVisual),
    effects,
    projectile: readValidatedJson(row, 'projectile', baseSkill.projectile, isSkillProjectile),
    animation: readValidatedJson(row, 'animation', baseSkill.animation, isSkillAnimation),
    sound: readValidatedJson(row, 'sound', baseSkill.sound, isSkillSound),
  };
};

function isEffectPreset(value: unknown): value is NonNullable<Skill['effects']>[number] {
  return isEffectPresetShape(value);
}

const createCharacterConfigFromRow = (row: SheetRow): CharacterConfig => ({
  typeId: readString(row, 'typeId', 'warrior'),
  attackType: readString(row, 'attackType', '') || undefined,
  monsterRespawnDelay: readOptionalNumber(row, 'monsterRespawnDelay'),
  monsterMaxCount: readOptionalNumber(row, 'monsterMaxCount'),
  size: { min: readNumber(row, 'sizeMin', 20), max: readNumber(row, 'sizeMax', 20) },
  speed: { min: readNumber(row, 'speedMin', 100), max: readNumber(row, 'speedMax', 100) },
  attack: { min: readNumber(row, 'attackMin', 10), max: readNumber(row, 'attackMax', 10) },
  defense: { min: readNumber(row, 'defenseMin', 5), max: readNumber(row, 'defenseMax', 5) },
  attackSpeed: {
    min: readNumber(row, 'attackSpeedMin', 1),
    max: readNumber(row, 'attackSpeedMax', 1),
  },
  accuracy: { min: readNumber(row, 'accuracyMin', 80), max: readNumber(row, 'accuracyMax', 80) },
  criticalRate: {
    min: readNumber(row, 'criticalRateMin', 10),
    max: readNumber(row, 'criticalRateMax', 10),
  },
  attackRange: {
    min: readNumber(row, 'attackRangeMin', 75),
    max: readNumber(row, 'attackRangeMax', 75),
  },
  attackWidth: {
    min: readNumber(row, 'attackWidthMin', 90),
    max: readNumber(row, 'attackWidthMax', 90),
  },
});

function validateCharacterConfigType(
  config: CharacterConfig,
  typeIds: Set<string>
): CharacterConfig {
  if (!hasCharacterTypeReference(config.typeId, typeIds)) {
    throw new Error(`캐릭터 타입 "${config.typeId}"을 찾을 수 없습니다.`);
  }
  return config;
}

const createLevelConfigFromRow = (row: SheetRow): LevelConfig => ({
  currentLevel: readNumber(row, 'currentLevel', 1),
  currentExp: readNumber(row, 'currentExp', 0),
  expToNextLevel: readNumber(row, 'expToNextLevel', 100),
  maxLevel: readNumber(row, 'maxLevel', 100),
  hpPerLevel: readNumber(row, 'hpPerLevel', 0),
  spPerLevel: readNumber(row, 'spPerLevel', 0),
  attackPerLevel: readNumber(row, 'attackPerLevel', 0),
  defensePerLevel: readNumber(row, 'defensePerLevel', 0),
  speedPerLevel: readNumber(row, 'speedPerLevel', 0),
  hpGrowth: readValidatedJson(row, 'hpGrowth', { a: 0, b: 0 }, isStatGrowthFormula),
  spGrowth: readValidatedJson(row, 'spGrowth', { a: 0, b: 0 }, isStatGrowthFormula),
  attackGrowth: readValidatedJson(row, 'attackGrowth', { a: 0, b: 0 }, isStatGrowthFormula),
  defenseGrowth: readValidatedJson(row, 'defenseGrowth', { a: 0, b: 0 }, isStatGrowthFormula),
  speedGrowth: readValidatedJson(row, 'speedGrowth', { a: 0, b: 0 }, isStatGrowthFormula),
  hpFormulaBlocks: readValidatedJson(row, 'hpFormulaBlocks', undefined, isOptionalFormulaBlocks),
  spFormulaBlocks: readValidatedJson(row, 'spFormulaBlocks', undefined, isOptionalFormulaBlocks),
  attackFormulaBlocks: readValidatedJson(
    row,
    'attackFormulaBlocks',
    undefined,
    isOptionalFormulaBlocks
  ),
  defenseFormulaBlocks: readValidatedJson(
    row,
    'defenseFormulaBlocks',
    undefined,
    isOptionalFormulaBlocks
  ),
  speedFormulaBlocks: readValidatedJson(
    row,
    'speedFormulaBlocks',
    undefined,
    isOptionalFormulaBlocks
  ),
  formulaMode: readFormulaMode(row),
  expGrowth: readValidatedJson(
    row,
    'expGrowth',
    { type: 'linear', a: 1, b: 0 },
    isExpGrowthFormula
  ),
  expGrowthConfig:
    readValidatedJson(row, 'expGrowthConfig', undefined, isOptionalExpGrowthConfig) ?? undefined,
  baseHp: readNumber(row, 'baseHp', 100),
  baseSp: readNumber(row, 'baseSp', 50),
  baseAttack: readNumber(row, 'baseAttack', 10),
  baseDefense: readNumber(row, 'baseDefense', 5),
  baseSpeed: readNumber(row, 'baseSpeed', 100),
});

const REQUIRED_WORKBOOK_SHEETS = [
  DATA_WORKBOOK_SHEETS.CHARACTER_TYPES,
  DATA_WORKBOOK_SHEETS.MONSTER_TYPES,
  DATA_WORKBOOK_SHEETS.SKILLS,
  DATA_WORKBOOK_SHEETS.ITEMS,
  DATA_WORKBOOK_SHEETS.PLAYER_DATASET,
  DATA_WORKBOOK_SHEETS.MONSTER_DATASET,
  DATA_WORKBOOK_SHEETS.PLAYER_LEVEL_CONFIG,
  DATA_WORKBOOK_SHEETS.MONSTER_LEVEL_CONFIG,
  DATA_WORKBOOK_SHEETS.PLAYER_BASIC_ATTACK,
  DATA_WORKBOOK_SHEETS.MONSTER_BASIC_ATTACK,
  DATA_WORKBOOK_SHEETS.PLAYER_CONFIG,
  DATA_WORKBOOK_SHEETS.MONSTER_CONFIG,
] as const;

function validateWorkbookStructure(workbook: XLSX.WorkBook): void {
  const missingSheets = REQUIRED_WORKBOOK_SHEETS.filter(
    sheetName => !workbook.SheetNames.includes(sheetName)
  );

  if (missingSheets.length > 0) {
    throw new Error(`필수 시트 누락: ${missingSheets.join(', ')}`);
  }
}

function readSheetRows(workbook: XLSX.WorkBook, sheetName: string): SheetRow[] {
  const sheet = workbook.Sheets[sheetName];
  if (sheet['!ref']) {
    const range = XLSX.utils.decode_range(sheet['!ref']);
    const columns = new Map<string, number>();
    for (let column = range.s.c; column <= range.e.c; column++) {
      const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c: column })];
      if (!cell || cell.v === undefined || cell.v === null) continue;
      const header = XLSX.utils.format_cell(cell);
      if (header === '') continue;
      const previous = columns.get(header);
      if (previous !== undefined) {
        throw new Error(
          `"${sheetName}" 시트 ${range.s.r + 1}행의 열 이름 "${header}"이 중복되었습니다 (${XLSX.utils.encode_col(previous)}열, ${XLSX.utils.encode_col(column)}열).`
        );
      }
      columns.set(header, column);
    }
  }
  return XLSX.utils.sheet_to_json<SheetRow>(sheet);
}

function readString(row: SheetRow, key: string, fallback = ''): string {
  const value = row[key];
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
}

function readChoice<T extends string>(
  row: SheetRow,
  key: string,
  fallback: T,
  choices: readonly T[]
): T {
  const value = readString(row, key, fallback);
  const match = choices.find(choice => choice === value);
  if (match === undefined) {
    throw new Error(`"${key}" 값 "${value}"은 허용되지 않습니다.`);
  }
  return match;
}

function readFormulaMode(row: SheetRow): NonNullable<LevelConfig['formulaMode']> {
  const value = row.formulaMode;
  if (value === undefined || value === null || value === '') return 'simple';
  if (value === 'simple' || value === 'advanced') return value;
  throw new Error('"formulaMode" 값은 simple 또는 advanced여야 합니다.');
}

function readNumber(row: SheetRow, key: string, fallback = 0): number {
  const value = row[key];
  if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
    return fallback;
  }
  const parsed =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) {
    throw new Error(`"${key}" 값은 유한한 숫자여야 합니다.`);
  }
  return parsed;
}

function readOptionalNumber(row: SheetRow, key: string): number | undefined {
  const value = row[key];
  if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
    return undefined;
  }
  return readNumber(row, key);
}

function readRequiredString(row: SheetRow, key: string): string {
  const value = row[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`"${key}" 값은 비어 있지 않은 문자열이어야 합니다.`);
  }
  return value.trim();
}

function readRequiredNumber(row: SheetRow, key: string): number {
  const value = row[key];
  if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
    throw new Error(`"${key}" 값이 비어 있습니다.`);
  }
  return readNumber(row, key);
}

function readRequiredBoolean(row: SheetRow, key: string): boolean {
  const value = row[key];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  throw new Error(`"${key}" 값은 true 또는 false여야 합니다.`);
}

function readNonNegativeNumber(row: SheetRow, key: string, fallback: number): number {
  const value = readNumber(row, key, fallback);
  if (value < 0) {
    throw new Error(`"${key}" 값은 0 이상이어야 합니다.`);
  }
  return value;
}

export async function readFileAsBinary(file: globalThis.File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => {
      const result = event.target?.result;
      if (typeof result !== 'string') {
        reject(new Error('파일 데이터를 문자열로 읽지 못했습니다.'));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error('파일 읽기에 실패했습니다.'));
    reader.readAsBinaryString(file);
  });
}

function validateUniqueIds(rows: SheetRow[], sheetName: string): void {
  const ids = new Set<string>();
  rows.forEach((row, index) => {
    const id = readString(row, 'id');
    const rowNumber = row.__rowNum__ === undefined ? index + 2 : row.__rowNum__ + 1;
    if (!id.trim()) {
      throw new Error(`"${sheetName}" 시트 ${rowNumber}행의 ID가 비어 있습니다.`);
    }
    if (ids.has(id)) {
      throw new Error(`"${sheetName}" 시트 ${rowNumber}행의 ID "${id}"가 중복되었습니다.`);
    }
    ids.add(id);
  });
}

function normalizeMonsterDefinitionIds(rows: SheetRow[], sheetName: string): void {
  const ids = new Set<string>();
  rows.forEach((row, index) => {
    parseSheetRow(row, sheetName, index, () => {
      const value = row.monster_definition_id;
      if (value !== undefined && value !== null && typeof value !== 'string') {
        throw new Error('"monster_definition_id" 값은 문자열이어야 합니다.');
      }

      const importedId = typeof value === 'string' ? value.trim() : '';
      if (!importedId) {
        throw new Error(
          '"monster_definition_id" 값이 필요합니다. 기존 파일은 안정 ID를 입력하고 웨이브 매핑도 갱신한 뒤 다시 가져오세요.'
        );
      }
      const id = importedId;
      if (ids.has(id)) {
        throw new Error(`"monster_definition_id" "${id}"가 중복되었습니다.`);
      }

      ids.add(id);
      row.monster_definition_id = id;
    });
  });
}

function parseStageDefinitionsFromWorkbook(
  workbook: XLSX.WorkBook,
  monsterDataset: DataRow[]
): StageDefinition[] {
  const stageSheetNames = [
    DATA_WORKBOOK_SHEETS.STAGES,
    DATA_WORKBOOK_SHEETS.WAVES,
    DATA_WORKBOOK_SHEETS.WAVE_MONSTER_MAPPINGS,
  ];
  const presentSheets = stageSheetNames.filter(name => workbook.SheetNames.includes(name));
  if (presentSheets.length === 0) return [];
  if (presentSheets.length !== stageSheetNames.length) {
    const missingSheets = stageSheetNames.filter(name => !workbook.SheetNames.includes(name));
    throw new Error(`웨이브 데이터 시트 누락: ${missingSheets.join(', ')}`);
  }

  const stageRows = readSheetRows(workbook, DATA_WORKBOOK_SHEETS.STAGES);
  const waveRows = readSheetRows(workbook, DATA_WORKBOOK_SHEETS.WAVES);
  const mappingRows = readSheetRows(workbook, DATA_WORKBOOK_SHEETS.WAVE_MONSTER_MAPPINGS);
  const stageIds = new Set<string>();
  const stages: StageDefinition[] = stageRows.map((row, index) =>
    parseSheetRow(row, DATA_WORKBOOK_SHEETS.STAGES, index, () => {
      const id = readRequiredString(row, 'id');
      if (stageIds.has(id)) throw new Error(`스테이지 ID "${id}"가 중복되었습니다.`);
      stageIds.add(id);
      const name = row.name;
      if (name !== undefined && name !== null && typeof name !== 'string') {
        throw new Error('"name" 값은 문자열이어야 합니다.');
      }
      return { id, name: name ?? '', waves: [] };
    })
  );
  const stagesById = new Map(stages.map(stage => [stage.id, stage]));
  const waveIdsByStage = new Map<string, Set<string>>();
  const waveOrders = new Map<string, Set<number>>();
  const waveRecords = waveRows.map((row, index) =>
    parseSheetRow(row, DATA_WORKBOOK_SHEETS.WAVES, index, () => {
      const id = readRequiredString(row, 'id');
      const stageId = readRequiredString(row, 'stageId');
      if (!stagesById.has(stageId)) {
        throw new Error(`스테이지 ID "${stageId}"를 찾을 수 없습니다.`);
      }
      const waveIds = waveIdsByStage.get(stageId) ?? new Set<string>();
      if (waveIds.has(id)) {
        throw new Error(`스테이지 "${stageId}"의 웨이브 ID "${id}"가 중복되었습니다.`);
      }
      waveIds.add(id);
      waveIdsByStage.set(stageId, waveIds);
      const order = readRequiredNumber(row, 'order');
      if (!Number.isSafeInteger(order) || order < 0) {
        throw new Error('"order" 값은 0 이상의 정수여야 합니다.');
      }
      const orders = waveOrders.get(stageId) ?? new Set<number>();
      if (orders.has(order)) {
        throw new Error(`스테이지 "${stageId}"의 웨이브 순서 ${order}가 중복되었습니다.`);
      }
      orders.add(order);
      waveOrders.set(stageId, orders);

      const wave: WaveDefinition = {
        id,
        durationMs: readRequiredNumber(row, 'durationMs'),
        monsterSpawns: [],
        respawn: {
          enabled: readRequiredBoolean(row, 'respawnEnabled'),
          delayMs: readRequiredNumber(row, 'respawnDelayMs'),
        },
      };
      return { stageId, order, wave };
    })
  );
  const wavesById = new Map<string, typeof waveRecords>();
  for (const record of waveRecords) {
    const matches = wavesById.get(record.wave.id) ?? [];
    matches.push(record);
    wavesById.set(record.wave.id, matches);
  }

  mappingRows.forEach((row, index) => {
    parseSheetRow(row, DATA_WORKBOOK_SHEETS.WAVE_MONSTER_MAPPINGS, index, () => {
      const waveId = readRequiredString(row, 'waveId');
      const matches = wavesById.get(waveId) ?? [];
      const rawStageId = row.stageId;
      const hasStageId = rawStageId !== undefined && rawStageId !== null &&
        !(typeof rawStageId === 'string' && !rawStageId.trim());
      let wave: WaveDefinition | undefined;
      if (hasStageId) {
        const stageId = readRequiredString(row, 'stageId');
        if (!stagesById.has(stageId)) {
          throw new Error(`스테이지 ID "${stageId}"를 찾을 수 없습니다.`);
        }
        wave = matches.find(record => record.stageId === stageId)?.wave;
        if (!wave) {
          throw new Error(`스테이지 "${stageId}"의 웨이브 ID "${waveId}"를 찾을 수 없습니다.`);
        }
      } else {
        if (matches.length > 1) {
          throw new Error(`웨이브 ID "${waveId}"가 여러 스테이지에 있습니다. "stageId"를 입력하세요.`);
        }
        wave = matches[0]?.wave;
        if (!wave) throw new Error(`웨이브 ID "${waveId}"를 찾을 수 없습니다.`);
      }
      wave.monsterSpawns.push({
        monsterDefinitionId: readRequiredString(row, 'monsterDefinitionId'),
        count: readRequiredNumber(row, 'count'),
      });
    });
  });

  waveRecords
    .sort((left, right) => left.order - right.order)
    .forEach(({ stageId, wave }) => {
      const stage = stagesById.get(stageId);
      if (!stage) throw new Error(`스테이지 ID "${stageId}"를 찾을 수 없습니다.`);
      stage.waves.push(wave);
    });

  const validationError = validateStageDefinitions(
    stages, monsterDataset, Number.MAX_SAFE_INTEGER, { allowIncomplete: true }
  );
  if (validationError) throw new Error(validationError);
  return stages;
}

function parseSheetRow<T>(row: SheetRow, sheetName: string, index: number, parse: () => T): T {
  try {
    return parse();
  } catch (error) {
    const rowNumber = row.__rowNum__ === undefined ? index + 2 : row.__rowNum__ + 1;
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`"${sheetName}" 시트 ${rowNumber}행: ${message}`);
  }
}

function validateSkillReference(id: string, location: string, skills: Record<string, Skill>): void {
  const skill = id.trim() ? findSkill(id, skills) : undefined;
  if (!skill || !hasSkillReference(id, [skills, defaultSkills])) {
    throw new Error(`${location}: 스킬 "${id}"를 찾을 수 없습니다.`);
  }
  if (!Object.hasOwn(skills, id)) {
    skills[id] = globalThis.structuredClone(skill);
  }
}

function readBasicAttackSlot(
  row: SheetRow,
  sheetName: string,
  skills: Record<string, Skill>
): BasicAttackSlot {
  return parseSheetRow(row, sheetName, 0, () => {
    const skillId = readString(row, 'skillId');
    validateSkillReference(skillId, `"${sheetName}"`, skills);
    const rawBinding = row.keyBinding;
    let keyBinding: BasicAttackSlot['keyBinding'] = 'click';
    if (rawBinding !== undefined && rawBinding !== null &&
        !(typeof rawBinding === 'string' && !rawBinding.trim())) {
      if (rawBinding !== 'click' && rawBinding !== 'auto') {
        throw new Error('"keyBinding" 값은 click 또는 auto여야 합니다.');
      }
      keyBinding = rawBinding;
    }
    return {
      skill: skills[skillId],
      keyBinding,
      range: readOptionalNumber(row, 'range'),
      width: readOptionalNumber(row, 'width'),
      damage: readOptionalNumber(row, 'damage'),
      cooldown: readOptionalNumber(row, 'cooldown'),
      spCost: readOptionalNumber(row, 'spCost'),
      castTime: readOptionalNumber(row, 'castTime'),
    };
  });
}

function validateAIPatternSkillReferences(
  config: AIPatternConfig,
  skills: Record<string, Skill>
): void {
  config.patterns.forEach((pattern, index) => {
    if ((pattern.action !== 'attack' && pattern.action !== 'skill') || !pattern.skillId) return;
    if (!findSkill(pattern.skillId, skills) && hasSkillReference(pattern.skillId, [], true)) return;
    validateSkillReference(pattern.skillId, `AI 패턴 ${index + 1}`, skills);
  });
}

function readOptionalAIPatternConfig(
  row: SheetRow,
  key: string,
  skills: Record<string, Skill>
): AIPatternConfig | undefined {
  const config = readValidatedJson(row, key, undefined, isOptionalAIPatternConfig);
  if (config) validateAIPatternSkillReferences(config, skills);
  return config ?? undefined;
}

function validateDatasetSkillReferences(
  rows: SheetRow[],
  sheetName: string,
  owner: 'player' | 'monster',
  skills: Record<string, Skill>
): void {
  const keys = [
    `${owner}_basic_attack_id`,
    ...[1, 2, 3, 4].map(slot => `${owner}_skill_${slot}_id`),
  ];
  rows.forEach((row, index) => {
    const rowNumber = row.__rowNum__ === undefined ? index + 2 : row.__rowNum__ + 1;
    keys.forEach(key => {
      const value = row[key];
      if (value === undefined || value === null || value === '') return;
      if (typeof value !== 'string') {
        throw new Error(`"${sheetName}" 시트 ${rowNumber}행 "${key}" 값은 문자열이어야 합니다.`);
      }
      validateSkillReference(value, `"${sheetName}" 시트 ${rowNumber}행 "${key}"`, skills);
    });
  });
}

function normalizeDatasetSkillNumbers(
  rows: SheetRow[],
  sheetName: string,
  owner: 'player' | 'monster'
): void {
  const prefixes = [`${owner}_basic_attack`, ...[1, 2, 3, 4].map(slot => `${owner}_skill_${slot}`)];
  const fields = prefixes.flatMap(prefix =>
    ['range', 'width', 'damage', 'cooldown', 'sp_cost', 'cast_time'].map(
      suffix => `${prefix}_${suffix}`
    )
  );
  rows.forEach((row, index) => {
    parseSheetRow(row, sheetName, index, () => {
      for (const field of fields) {
        const value = row[field];
        if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
          delete row[field];
        } else {
          row[field] = readNumber(row, field);
        }
      }
    });
  });
}

function normalizeAppliedRowNumbers(
  row: DataRow | undefined,
  owner: 'player' | 'monster',
  sheetName: string,
  index: number
): void {
  if (!row) return;
  const sheetRow: SheetRow = Object.fromEntries(Object.entries(row));
  const rowNumber = Reflect.get(row, '__rowNum__');
  if (typeof rowNumber === 'number') sheetRow.__rowNum__ = rowNumber;
  const prepared = prepareRowForApplication(row, owner);
  if (prepared.status === 'missing') {
    Reflect.deleteProperty(row, `${owner}_size`);
    return;
  }
  if (prepared.status === 'invalid') {
    parseSheetRow(sheetRow, sheetName, index, () => {
      throw new Error(`"${prepared.field}" 값은 유한한 숫자여야 합니다.`);
    });
    return;
  }
  for (const key of Object.keys(row)) {
    if (!(key in prepared.row)) Reflect.deleteProperty(row, key);
  }
  Object.assign(row, prepared.row);
}

function validateDatasetResources(
  rows: SheetRow[],
  sheetName: string,
  owner: 'player' | 'monster'
): void {
  rows.forEach((row, index) => {
    parseSheetRow(row, sheetName, index, () => {
      for (const resource of ['hp', 'sp']) {
        const key = `${owner}_${resource}`;
        const value = row[key];
        if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
          delete row[key];
          continue;
        }
        row[key] = readNonNegativeNumber(row, key, 0);
      }
    });
  });
}

function normalizeMonsterStats(rows: SheetRow[], sheetName: string): void {
  rows.forEach((row, index) => {
    parseSheetRow(row, sheetName, index, () => {
      for (const field of MONSTER_STAT_FIELDS) {
        if (field === 'monster_hp' || field === 'monster_sp') continue;
        const value = row[field];
        if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
          delete row[field];
        } else {
          row[field] = readNonNegativeNumber(row, field, 0);
        }
      }
    });
  });
}

function normalizeMonsterWeights(rows: SheetRow[], sheetName: string): void {
  rows.forEach((row, index) => {
    parseSheetRow(row, sheetName, index, () => {
      const value = row.monster_spawn_weight;
      if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
        delete row.monster_spawn_weight;
      } else {
        row.monster_spawn_weight = readNonNegativeNumber(row, 'monster_spawn_weight', 0);
      }
    });
  });
}

function validatePlayerLevelRows(rows: SheetRow[], sheetName: string): void {
  const levelsByCharacter = new Map<string, Set<number>>();
  rows.forEach((row, index) => {
    parseSheetRow(row, sheetName, index, () => {
      const value = row.player_character_id;
      if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
        delete row.player_character_id;
        return;
      }
      if (typeof value !== 'string') {
        throw new Error('"player_character_id" 값은 문자열이어야 합니다.');
      }
      const characterId = value.trim();
      const level = readNumber(row, 'player_level');
      if (!Number.isInteger(level) || level < 1) {
        throw new Error('"player_level" 값은 1 이상의 정수여야 합니다.');
      }
      const levels = levelsByCharacter.get(characterId) ?? new Set<number>();
      if (levels.has(level)) {
        throw new Error(`캐릭터 "${characterId}"의 레벨 ${level} 행이 중복되었습니다.`);
      }
      levels.add(level);
      levelsByCharacter.set(characterId, levels);
      row.player_character_id = characterId;
      row.player_level = level;
      for (const field of PLAYER_LEVEL_STAT_FIELDS) {
        if (field === 'player_hp' || field === 'player_sp') continue;
        const stat = row[field];
        if (stat === undefined || stat === null || (typeof stat === 'string' && !stat.trim())) {
          delete row[field];
        } else {
          row[field] = readNonNegativeNumber(row, field, 0);
        }
      }
    });
  });
}

function validateDatasetTypeReferences(
  rows: SheetRow[],
  sheetName: string,
  owner: 'player' | 'monster',
  typeIds: Set<string>
): void {
  const key = `${owner}_attack_type`;
  rows.forEach((row, index) => {
    const value = row[key];
    if (value === undefined || value === null || value === '') return;
    parseSheetRow(row, sheetName, index, () => {
      if (typeof value !== 'string') {
        throw new Error(`"${key}" 값은 문자열이어야 합니다.`);
      }
      if (!hasCharacterTypeReference(value, typeIds)) {
        throw new Error(`"${key}": 캐릭터 타입 "${value}"을 찾을 수 없습니다.`);
      }
    });
  });
}

function validateDatasetRowShapes(
  rows: SheetRow[],
  sheetName: string,
  owner: 'player' | 'monster'
): void {
  rows.forEach((row, index) => {
    parseSheetRow(row, sheetName, index, () => {
      const field = `${owner}Dataset[${index}]`;
      const invalidField =
        owner === 'player'
          ? getPlayerDatasetRowError(row, field)
          : getMonsterDatasetRowError(row, field);
      if (invalidField) {
        throw new Error(`"${invalidField}" 값의 형식이 올바르지 않습니다.`);
      }
    });
  });
}

export function parseGameDataFromWorkbook(binary: string): Partial<GameDataState> {
  const workbook = XLSX.read(binary, { type: 'binary' });
  validateWorkbookStructure(workbook);
  const data: Partial<GameDataState> = {};
  const skillRows = readSheetRows(workbook, DATA_WORKBOOK_SHEETS.SKILLS);
  validateUniqueIds(skillRows, DATA_WORKBOOK_SHEETS.SKILLS);
  const importedSkills: Record<string, Skill> = Object.fromEntries(
    skillRows.map((row, index) =>
      parseSheetRow(row, DATA_WORKBOOK_SHEETS.SKILLS, index, () => {
        const skill = createSkillFromRow(row);
        const invalidField = getSkillError(skill, `skillConfigs[${index}]`);
        if (invalidField) {
          throw new Error(`스킬 데이터 형식이 올바르지 않습니다 (${invalidField}).`);
        }
        return [skill.id, skill];
      })
    )
  );

  if (workbook.SheetNames.includes(DATA_WORKBOOK_SHEETS.CHARACTER_TYPES)) {
    const rows = readSheetRows(workbook, DATA_WORKBOOK_SHEETS.CHARACTER_TYPES);
    validateUniqueIds(rows, DATA_WORKBOOK_SHEETS.CHARACTER_TYPES);
    data.characterTypes = rows.map((row, index) =>
      parseSheetRow(
        row,
        DATA_WORKBOOK_SHEETS.CHARACTER_TYPES,
        index,
        () =>
          ({
            id: readString(row, 'id'),
            name: readString(row, 'name'),
            description: readString(row, 'description', ''),
            color: readString(row, 'color', 'text-gray-600'),
            defaultLevel: readNumber(row, 'defaultLevel', 1),
            defaultSize: readNumber(row, 'defaultSize', 20),
            defaultBasicAttackId: readString(row, 'defaultBasicAttackId', ''),
            defaultSkillIds: readValidatedJson(row, 'defaultSkillIds', [], isStringArray),
            defaultAIPattern: readOptionalAIPatternConfig(row, 'defaultAIPattern', importedSkills),
            statFormulas:
              readValidatedJson(row, 'statFormulas', undefined, isOptionalStatFormulas) ??
              undefined,
          }) satisfies CharacterTypeInfo
      )
    );
  }

  if (workbook.SheetNames.includes(DATA_WORKBOOK_SHEETS.MONSTER_TYPES)) {
    const rows = readSheetRows(workbook, DATA_WORKBOOK_SHEETS.MONSTER_TYPES);
    validateUniqueIds(rows, DATA_WORKBOOK_SHEETS.MONSTER_TYPES);
    data.monsterTypeStats = Object.fromEntries(
      rows.map((row, index) =>
        parseSheetRow(row, DATA_WORKBOOK_SHEETS.MONSTER_TYPES, index, () => {
          const id = readString(row, 'id');
          return [
            id,
            {
              characterType: readString(row, 'characterType'),
              baseLevel: readNumber(row, 'baseLevel', 1),
              size: readNumber(row, 'size', 24),
              aiPattern: readString(row, 'aiPattern', 'aggressive'),
              skills: readValidatedJson(row, 'skills', [], isStringArray),
              aiPatternConfig: readOptionalAIPatternConfig(row, 'aiPatternConfig', importedSkills),
            } satisfies MonsterTypeStats,
          ] as const;
        })
      )
    );
  }

  const characterTypeIds = new Set(data.characterTypes?.map(type => type.id));

  if (workbook.SheetNames.includes(DATA_WORKBOOK_SHEETS.SKILLS)) {
    data.skillConfigs = importedSkills;
  }

  if (workbook.SheetNames.includes(DATA_WORKBOOK_SHEETS.ITEMS)) {
    const rows = readSheetRows(workbook, DATA_WORKBOOK_SHEETS.ITEMS);
    data.itemSlots = rows.map((row, index) =>
      parseSheetRow(row, DATA_WORKBOOK_SHEETS.ITEMS, index, () => {
        const itemSlot = {
          slotNumber: readNumber(row, 'slotNumber', 1) as ItemSlot['slotNumber'],
          keyBinding: readString(row, 'keyBinding', ''),
          item: readJson<Item | null>(row, 'item', null),
        } satisfies ItemSlot;
        const invalidField = getItemSlotError(itemSlot, `itemSlots[${index}]`);
        if (invalidField) {
          throw new Error(`아이템 데이터 형식이 올바르지 않습니다 (${invalidField}).`);
        }
        return itemSlot;
      })
    );
  }

  if (workbook.SheetNames.includes(DATA_WORKBOOK_SHEETS.PLAYER_DATASET)) {
    const rows = readSheetRows(workbook, DATA_WORKBOOK_SHEETS.PLAYER_DATASET);
    validatePlayerLevelRows(rows, DATA_WORKBOOK_SHEETS.PLAYER_DATASET);
    validateDatasetResources(rows, DATA_WORKBOOK_SHEETS.PLAYER_DATASET, 'player');
    normalizeDatasetSkillNumbers(rows, DATA_WORKBOOK_SHEETS.PLAYER_DATASET, 'player');
    validateDatasetTypeReferences(
      rows,
      DATA_WORKBOOK_SHEETS.PLAYER_DATASET,
      'player',
      characterTypeIds
    );
    validateDatasetSkillReferences(
      rows,
      DATA_WORKBOOK_SHEETS.PLAYER_DATASET,
      'player',
      importedSkills
    );
    validateDatasetRowShapes(rows, DATA_WORKBOOK_SHEETS.PLAYER_DATASET, 'player');
    data.playerDataset = rows as unknown as DataRow[];
  }

  if (workbook.SheetNames.includes(DATA_WORKBOOK_SHEETS.MONSTER_DATASET)) {
    const rows = readSheetRows(workbook, DATA_WORKBOOK_SHEETS.MONSTER_DATASET);
    normalizeMonsterDefinitionIds(rows, DATA_WORKBOOK_SHEETS.MONSTER_DATASET);
    validateDatasetResources(rows, DATA_WORKBOOK_SHEETS.MONSTER_DATASET, 'monster');
    normalizeMonsterStats(rows, DATA_WORKBOOK_SHEETS.MONSTER_DATASET);
    normalizeMonsterWeights(rows, DATA_WORKBOOK_SHEETS.MONSTER_DATASET);
    normalizeDatasetSkillNumbers(rows, DATA_WORKBOOK_SHEETS.MONSTER_DATASET, 'monster');
    validateDatasetTypeReferences(
      rows,
      DATA_WORKBOOK_SHEETS.MONSTER_DATASET,
      'monster',
      characterTypeIds
    );
    rows.forEach((row, index) => {
      if (
        row.monster_ai_patterns !== undefined &&
        row.monster_ai_patterns !== null &&
        row.monster_ai_patterns !== ''
      ) {
        parseSheetRow(row, DATA_WORKBOOK_SHEETS.MONSTER_DATASET, index, () => {
          const config = readJson<unknown>(row, 'monster_ai_patterns', undefined);
          if (!isAIPatternConfig(config)) {
            throw new Error('"monster_ai_patterns" 값의 데이터 형식이 올바르지 않습니다.');
          }
          validateAIPatternSkillReferences(config, importedSkills);
        });
      }
    });
    validateDatasetSkillReferences(
      rows,
      DATA_WORKBOOK_SHEETS.MONSTER_DATASET,
      'monster',
      importedSkills
    );
    validateDatasetRowShapes(rows, DATA_WORKBOOK_SHEETS.MONSTER_DATASET, 'monster');
    data.monsterDataset = rows as unknown as DataRow[];
  }
  data.stageDefinitions = parseStageDefinitionsFromWorkbook(workbook, data.monsterDataset ?? []);

  if (workbook.SheetNames.includes(DATA_WORKBOOK_SHEETS.PLAYER_LEVEL_CONFIG)) {
    const rows = readSheetRows(workbook, DATA_WORKBOOK_SHEETS.PLAYER_LEVEL_CONFIG);
    if (rows.length > 0) {
      data.playerLevelConfig = parseSheetRow(
        rows[0],
        DATA_WORKBOOK_SHEETS.PLAYER_LEVEL_CONFIG,
        0,
        () => createLevelConfigFromRow(rows[0])
      );
    }
  }

  if (workbook.SheetNames.includes(DATA_WORKBOOK_SHEETS.MONSTER_LEVEL_CONFIG)) {
    const rows = readSheetRows(workbook, DATA_WORKBOOK_SHEETS.MONSTER_LEVEL_CONFIG);
    if (rows.length > 0) {
      data.monsterLevelConfig = parseSheetRow(
        rows[0],
        DATA_WORKBOOK_SHEETS.MONSTER_LEVEL_CONFIG,
        0,
        () => createLevelConfigFromRow(rows[0])
      );
    }
  }

  if (workbook.SheetNames.includes(DATA_WORKBOOK_SHEETS.PLAYER_BASIC_ATTACK)) {
    const rows = readSheetRows(workbook, DATA_WORKBOOK_SHEETS.PLAYER_BASIC_ATTACK);
    if (rows.length > 0) {
      data.playerBasicAttack = readBasicAttackSlot(
        rows[0], DATA_WORKBOOK_SHEETS.PLAYER_BASIC_ATTACK, importedSkills
      );
    }
  }

  if (workbook.SheetNames.includes(DATA_WORKBOOK_SHEETS.MONSTER_BASIC_ATTACK)) {
    const rows = readSheetRows(workbook, DATA_WORKBOOK_SHEETS.MONSTER_BASIC_ATTACK);
    if (rows.length > 0) {
      data.monsterBasicAttack = readBasicAttackSlot(
        rows[0], DATA_WORKBOOK_SHEETS.MONSTER_BASIC_ATTACK, importedSkills
      );
    }
  }

  if (workbook.SheetNames.includes(DATA_WORKBOOK_SHEETS.PLAYER_CONFIG)) {
    const rows = readSheetRows(workbook, DATA_WORKBOOK_SHEETS.PLAYER_CONFIG);
    if (rows.length > 0) {
      data.playerConfig = parseSheetRow(rows[0], DATA_WORKBOOK_SHEETS.PLAYER_CONFIG, 0, () =>
        validateCharacterConfigType(createCharacterConfigFromRow(rows[0]), characterTypeIds)
      );
    }
  }

  if (workbook.SheetNames.includes(DATA_WORKBOOK_SHEETS.MONSTER_CONFIG)) {
    const rows = readSheetRows(workbook, DATA_WORKBOOK_SHEETS.MONSTER_CONFIG);
    if (rows.length > 0) {
      data.monsterConfig = parseSheetRow(rows[0], DATA_WORKBOOK_SHEETS.MONSTER_CONFIG, 0, () =>
        validateCharacterConfigType(createCharacterConfigFromRow(rows[0]), characterTypeIds)
      );
    }
  }

  data.characterTypes?.forEach(type => {
    if (type.defaultBasicAttackId) {
      validateSkillReference(
        type.defaultBasicAttackId,
        `캐릭터 타입 "${type.id}" 기본 공격`,
        importedSkills
      );
    }
    type.defaultSkillIds?.forEach(id =>
      validateSkillReference(id, `캐릭터 타입 "${type.id}"`, importedSkills)
    );
  });
  Object.entries(data.monsterTypeStats ?? {}).forEach(([id, monster]) => {
    if (!hasCharacterTypeReference(monster.characterType, characterTypeIds)) {
      throw new Error(
        `몬스터 타입 "${id}": 캐릭터 타입 "${monster.characterType}"을 찾을 수 없습니다.`
      );
    }
    monster.skills.forEach(skillId =>
      validateSkillReference(skillId, `몬스터 타입 "${id}"`, importedSkills)
    );
  });
  return data;
}

export function importGameDataFromWorkbook(
  binary: string,
  setters: GameDataSetters,
  context: WorkbookImportContext
): ImportedGameData {
  const data = parseGameDataFromWorkbook(binary);
  if (!data.characterTypes || !data.skillConfigs || !data.playerDataset || !data.monsterDataset) {
    throw new Error('가져온 스킬 또는 데이터셋이 누락되었습니다.');
  }
  const typeIds = new Set(data.characterTypes.map(type => type.id));
  const { tick, playerRow, monsterRow } = selectImportedRows(
    data.playerDataset,
    data.monsterDataset,
    context.currentTick
  );
  normalizeAppliedRowNumbers(playerRow, 'player', DATA_WORKBOOK_SHEETS.PLAYER_DATASET, tick);
  normalizeAppliedRowNumbers(monsterRow, 'monster', DATA_WORKBOOK_SHEETS.MONSTER_DATASET, tick);
  const playerTypeId =
    (playerRow?.player_size !== undefined && playerRow.player_attack_type) ||
    data.playerConfig?.typeId ||
    (data.playerConfig === undefined ? context.playerTypeId : '');
  const monsterTypeId =
    (monsterRow?.monster_size !== undefined && monsterRow.monster_attack_type) ||
    data.monsterConfig?.typeId ||
    (data.monsterConfig === undefined ? context.monsterTypeId : '');
  for (const [field, typeId] of [
    ['playerConfig.typeId', playerTypeId],
    ['monsterConfig.typeId', monsterTypeId],
  ]) {
    if (typeId && !hasCharacterTypeReference(typeId, typeIds)) {
      throw new Error(
        `${field}: 캐릭터 타입 "${typeId}"을 찾을 수 없습니다. 기존 설정 또는 Excel 캐릭터 타입을 확인하세요.`
      );
    }
  }
  if (data.characterTypes !== undefined) setters.onCharacterTypesChange(data.characterTypes);
  if (data.monsterTypeStats !== undefined) setters.onMonsterTypeStatsChange(data.monsterTypeStats);
  if (data.skillConfigs !== undefined) setters.onSkillConfigsChange(data.skillConfigs);
  if (data.itemSlots !== undefined) setters.onItemSlotsChange(data.itemSlots);
  if (data.playerDataset !== undefined) setters.onPlayerDatasetChange(data.playerDataset);
  if (data.monsterDataset !== undefined) setters.onMonsterDatasetChange(data.monsterDataset);
  if (data.stageDefinitions !== undefined) {
    setters.onStageDefinitionsChange(data.stageDefinitions);
  }
  if (data.playerLevelConfig !== undefined)
    setters.onPlayerLevelConfigChange(data.playerLevelConfig);
  if (data.monsterLevelConfig !== undefined)
    setters.onMonsterLevelConfigChange(data.monsterLevelConfig);
  if (data.playerBasicAttack !== undefined)
    setters.onPlayerBasicAttackChange(data.playerBasicAttack);
  if (data.monsterBasicAttack !== undefined)
    setters.onMonsterBasicAttackChange(data.monsterBasicAttack);
  if (data.playerConfig !== undefined) setters.onPlayerConfigChange(data.playerConfig);
  if (data.monsterConfig !== undefined) setters.onMonsterConfigChange(data.monsterConfig);
  return {
    ...data,
    skillConfigs: data.skillConfigs,
    playerDataset: data.playerDataset,
    monsterDataset: data.monsterDataset,
  };
}
