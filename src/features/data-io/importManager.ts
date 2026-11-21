import * as XLSX from 'xlsx';
import { MonsterTypeStats } from '../../components/MonsterTypeDefinition';
import { CharacterTypeInfo } from '../../lib/characterTypes';
import { CharacterConfig } from '../../lib/gameTypes';
import { Item, ItemSlot } from '../../lib/itemSystem';
import {
  ExpGrowthConfig,
  ExpGrowthFormula,
  LevelConfig,
  StatGrowthFormula,
} from '../../lib/levelSystem';
import { DataRow } from '../../lib/mockData';
import { BasicAttackSlot, defaultSkills, Skill } from '../../lib/skillSystem';
import { DATA_WORKBOOK_SHEETS } from '../data-file/constants';
import { GameDataSetters } from './model';

type SheetRow = Record<string, unknown>;

const parseJson = <T>(value: unknown, fallback: T): T => {
  if (typeof value !== 'string' || value.trim() === '') {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

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
  const baseSkill = defaultSkills[id] ?? createFallbackSkill(id);

  return {
    ...baseSkill,
    id,
    name: readString(row, 'name', baseSkill.name),
    description: readString(row, 'description', baseSkill.description),
    type: readString(row, 'type', baseSkill.type) as Skill['type'],
    category: readString(row, 'category', baseSkill.category) as Skill['category'],
    tags: parseJson<string[]>(row.tags, baseSkill.tags),
    iconName: readString(row, 'iconName', baseSkill.iconName),
    spCost: readNumber(row, 'spCost', baseSkill.spCost),
    cooldown: readNumber(row, 'cooldown', baseSkill.cooldown),
    castTime: readNumber(row, 'castTime', baseSkill.castTime),
    range: readNumber(row, 'range', baseSkill.range),
    area: readNumber(row, 'area', baseSkill.area),
    timing: parseJson<Skill['timing']>(row.timing, baseSkill.timing),
    damageMultiplier: readNumber(row, 'damageMultiplier', baseSkill.damageMultiplier),
    damageFormula: parseJson<Skill['damageFormula'] | undefined>(
      row.damageFormula,
      baseSkill.damageFormula
    ),
    healAmount: readNumber(row, 'healAmount', baseSkill.healAmount),
    buffDuration: readNumber(row, 'buffDuration', baseSkill.buffDuration),
    buffEffect: parseJson<Skill['buffEffect']>(row.buffEffect, baseSkill.buffEffect),
    visual: parseJson<Skill['visual']>(row.visual, baseSkill.visual),
    projectile: parseJson<Skill['projectile']>(row.projectile, baseSkill.projectile),
    animation: parseJson<Skill['animation']>(row.animation, baseSkill.animation),
    sound: parseJson<Skill['sound']>(row.sound, baseSkill.sound),
  };
};

const createCharacterConfigFromRow = (row: SheetRow): CharacterConfig => ({
  typeId: readString(row, 'typeId', 'warrior'),
  attackType: readString(row, 'attackType', '') || undefined,
  monsterRespawnDelay: readNumber(row, 'monsterRespawnDelay', 0) || undefined,
  monsterMaxCount: readNumber(row, 'monsterMaxCount', 0) || undefined,
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
  hpGrowth: parseJson<StatGrowthFormula>(row.hpGrowth, { a: 0, b: 0 }),
  spGrowth: parseJson<StatGrowthFormula>(row.spGrowth, { a: 0, b: 0 }),
  attackGrowth: parseJson<StatGrowthFormula>(row.attackGrowth, { a: 0, b: 0 }),
  defenseGrowth: parseJson<StatGrowthFormula>(row.defenseGrowth, { a: 0, b: 0 }),
  speedGrowth: parseJson<StatGrowthFormula>(row.speedGrowth, { a: 0, b: 0 }),
  formulaMode: readString(row, 'formulaMode', 'simple') as LevelConfig['formulaMode'],
  expGrowth: parseJson<ExpGrowthFormula>(row.expGrowth, { type: 'linear', a: 1, b: 0 }),
  expGrowthConfig: parseJson<ExpGrowthConfig | undefined>(row.expGrowthConfig, undefined),
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
  return XLSX.utils.sheet_to_json<SheetRow>(workbook.Sheets[sheetName]);
}

function readString(row: SheetRow, key: string, fallback = ''): string {
  const value = row[key];
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
}

function readNumber(row: SheetRow, key: string, fallback = 0): number {
  const value = row[key];
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
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

export function importGameDataFromWorkbook(binary: string, setters: GameDataSetters): void {
  const workbook = XLSX.read(binary, { type: 'binary' });
  validateWorkbookStructure(workbook);
  let importedSkills: Record<string, Skill> = {};

  if (workbook.SheetNames.includes(DATA_WORKBOOK_SHEETS.CHARACTER_TYPES)) {
    const rows = readSheetRows(workbook, DATA_WORKBOOK_SHEETS.CHARACTER_TYPES);
    setters.onCharacterTypesChange(
      rows.map(
        row =>
          ({
            id: readString(row, 'id'),
            name: readString(row, 'name'),
            description: readString(row, 'description', ''),
            color: readString(row, 'color', 'text-gray-600'),
            defaultLevel: readNumber(row, 'defaultLevel', 1),
            defaultSize: readNumber(row, 'defaultSize', 20),
            defaultBasicAttackId: readString(row, 'defaultBasicAttackId', ''),
            defaultSkillIds: parseJson<string[]>(row.defaultSkillIds, []),
            defaultAIPattern: parseJson<CharacterTypeInfo['defaultAIPattern']>(
              row.defaultAIPattern,
              undefined
            ),
            statFormulas: parseJson<CharacterTypeInfo['statFormulas']>(row.statFormulas, undefined),
          }) satisfies CharacterTypeInfo
      )
    );
  }

  if (workbook.SheetNames.includes(DATA_WORKBOOK_SHEETS.MONSTER_TYPES)) {
    const rows = readSheetRows(workbook, DATA_WORKBOOK_SHEETS.MONSTER_TYPES);
    const types: Record<string, MonsterTypeStats> = {};
    rows.forEach(row => {
      const id = readString(row, 'id');
      types[id] = {
        characterType: readString(row, 'characterType'),
        baseLevel: readNumber(row, 'baseLevel', 1),
        size: readNumber(row, 'size', 24),
        aiPattern: readString(row, 'aiPattern', 'aggressive'),
        skills: parseJson<string[]>(row.skills, []),
        aiPatternConfig: parseJson<MonsterTypeStats['aiPatternConfig']>(
          row.aiPatternConfig,
          undefined
        ),
      };
    });
    setters.onMonsterTypeStatsChange(types);
  }

  if (workbook.SheetNames.includes(DATA_WORKBOOK_SHEETS.SKILLS)) {
    const rows = readSheetRows(workbook, DATA_WORKBOOK_SHEETS.SKILLS);
    importedSkills = Object.fromEntries(
      rows.map(row => {
        const skill = createSkillFromRow(row);
        return [skill.id, skill];
      })
    );
    setters.onSkillConfigsChange(importedSkills);
  }

  if (workbook.SheetNames.includes(DATA_WORKBOOK_SHEETS.ITEMS)) {
    const rows = readSheetRows(workbook, DATA_WORKBOOK_SHEETS.ITEMS);
    setters.onItemSlotsChange(
      rows.map(
        row =>
          ({
            slotNumber: readNumber(row, 'slotNumber', 1) as ItemSlot['slotNumber'],
            keyBinding: readString(row, 'keyBinding', ''),
            item: parseJson<Item | null>(row.item, null),
          }) satisfies ItemSlot
      )
    );
  }

  if (workbook.SheetNames.includes(DATA_WORKBOOK_SHEETS.PLAYER_DATASET)) {
    const rows = readSheetRows(workbook, DATA_WORKBOOK_SHEETS.PLAYER_DATASET);
    setters.onPlayerDatasetChange(rows as unknown as DataRow[]);
  }

  if (workbook.SheetNames.includes(DATA_WORKBOOK_SHEETS.MONSTER_DATASET)) {
    const rows = readSheetRows(workbook, DATA_WORKBOOK_SHEETS.MONSTER_DATASET);
    setters.onMonsterDatasetChange(rows as unknown as DataRow[]);
  }

  if (workbook.SheetNames.includes(DATA_WORKBOOK_SHEETS.PLAYER_LEVEL_CONFIG)) {
    const rows = readSheetRows(workbook, DATA_WORKBOOK_SHEETS.PLAYER_LEVEL_CONFIG);
    if (rows.length > 0) {
      setters.onPlayerLevelConfigChange(createLevelConfigFromRow(rows[0]));
    }
  }

  if (workbook.SheetNames.includes(DATA_WORKBOOK_SHEETS.MONSTER_LEVEL_CONFIG)) {
    const rows = readSheetRows(workbook, DATA_WORKBOOK_SHEETS.MONSTER_LEVEL_CONFIG);
    if (rows.length > 0) {
      setters.onMonsterLevelConfigChange(createLevelConfigFromRow(rows[0]));
    }
  }

  if (workbook.SheetNames.includes(DATA_WORKBOOK_SHEETS.PLAYER_BASIC_ATTACK)) {
    const rows = readSheetRows(workbook, DATA_WORKBOOK_SHEETS.PLAYER_BASIC_ATTACK);
    if (rows.length > 0) {
      const row = rows[0];
      const skillId = readString(row, 'skillId');
      const skill =
        importedSkills[skillId] ?? defaultSkills[skillId] ?? createFallbackSkill(skillId);
      setters.onPlayerBasicAttackChange({ skill, keyBinding: 'click' } satisfies BasicAttackSlot);
    }
  }

  if (workbook.SheetNames.includes(DATA_WORKBOOK_SHEETS.MONSTER_BASIC_ATTACK)) {
    const rows = readSheetRows(workbook, DATA_WORKBOOK_SHEETS.MONSTER_BASIC_ATTACK);
    if (rows.length > 0) {
      const row = rows[0];
      const skillId = readString(row, 'skillId');
      const skill =
        importedSkills[skillId] ?? defaultSkills[skillId] ?? createFallbackSkill(skillId);
      setters.onMonsterBasicAttackChange({ skill, keyBinding: 'click' } satisfies BasicAttackSlot);
    }
  }

  if (workbook.SheetNames.includes(DATA_WORKBOOK_SHEETS.PLAYER_CONFIG)) {
    const rows = readSheetRows(workbook, DATA_WORKBOOK_SHEETS.PLAYER_CONFIG);
    if (rows.length > 0) {
      setters.onPlayerConfigChange(createCharacterConfigFromRow(rows[0]));
    }
  }

  if (workbook.SheetNames.includes(DATA_WORKBOOK_SHEETS.MONSTER_CONFIG)) {
    const rows = readSheetRows(workbook, DATA_WORKBOOK_SHEETS.MONSTER_CONFIG);
    if (rows.length > 0) {
      setters.onMonsterConfigChange(createCharacterConfigFromRow(rows[0]));
    }
  }
}
