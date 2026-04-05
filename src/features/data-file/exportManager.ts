import * as XLSX from 'xlsx';
import { CharacterTypeInfo } from '../../lib/characterTypes';
import { CharacterConfig } from '../../lib/gameTypes';
import { ItemSlot } from '../../lib/itemSystem';
import { LevelConfig } from '../../lib/levelSystem';
import { BasicAttackSlot, Skill } from '../../lib/skillSystem';
import { GameDataState } from '../data-io/model';
import { DATA_EXPORT_FILENAME_PREFIX, DATA_WORKBOOK_SHEETS } from './constants';

type WriteWorkbookFile = (workbook: XLSX.WorkBook, filename: string) => void;

const stringify = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
};

const serializeCharacterTypes = (characterTypes: CharacterTypeInfo[]) =>
  characterTypes.map(characterType => ({
    id: characterType.id,
    name: characterType.name,
    description: characterType.description,
    color: characterType.color,
    defaultLevel: characterType.defaultLevel ?? '',
    defaultSize: characterType.defaultSize ?? '',
    defaultBasicAttackId: characterType.defaultBasicAttackId ?? '',
    defaultSkillIds: stringify(characterType.defaultSkillIds ?? []),
    defaultAIPattern: stringify(characterType.defaultAIPattern ?? null),
    statFormulas: stringify(characterType.statFormulas ?? null),
  }));

const serializeSkills = (skillConfigs: Record<string, Skill>) =>
  Object.values(skillConfigs).map(skill => ({
    id: skill.id,
    name: skill.name,
    description: skill.description,
    type: skill.type,
    category: skill.category,
    tags: stringify(skill.tags),
    iconName: skill.iconName,
    spCost: skill.spCost,
    cooldown: skill.cooldown,
    castTime: skill.castTime,
    range: skill.range,
    area: skill.area,
    timing: stringify(skill.timing),
    damageMultiplier: skill.damageMultiplier,
    damageFormula: stringify(skill.damageFormula ?? null),
    healAmount: skill.healAmount,
    buffDuration: skill.buffDuration,
    buffEffect: stringify(skill.buffEffect),
    visual: stringify(skill.visual),
    projectile: stringify(skill.projectile),
    animation: stringify(skill.animation),
    sound: stringify(skill.sound),
  }));

const serializeItemSlots = (itemSlots: ItemSlot[]) =>
  itemSlots.map(slot => ({
    slotNumber: slot.slotNumber,
    keyBinding: slot.keyBinding,
    item: stringify(slot.item),
  }));

const serializeLevelConfig = (levelConfig: LevelConfig) => ({
  currentLevel: levelConfig.currentLevel,
  currentExp: levelConfig.currentExp,
  expToNextLevel: levelConfig.expToNextLevel,
  maxLevel: levelConfig.maxLevel ?? '',
  hpPerLevel: levelConfig.hpPerLevel,
  spPerLevel: levelConfig.spPerLevel,
  attackPerLevel: levelConfig.attackPerLevel,
  defensePerLevel: levelConfig.defensePerLevel,
  speedPerLevel: levelConfig.speedPerLevel,
  hpGrowth: stringify(levelConfig.hpGrowth),
  spGrowth: stringify(levelConfig.spGrowth),
  attackGrowth: stringify(levelConfig.attackGrowth),
  defenseGrowth: stringify(levelConfig.defenseGrowth),
  speedGrowth: stringify(levelConfig.speedGrowth),
  formulaMode: levelConfig.formulaMode ?? '',
  expGrowth: stringify(levelConfig.expGrowth),
  expGrowthConfig: stringify(levelConfig.expGrowthConfig ?? null),
  baseHp: levelConfig.baseHp,
  baseSp: levelConfig.baseSp,
  baseAttack: levelConfig.baseAttack,
  baseDefense: levelConfig.baseDefense,
  baseSpeed: levelConfig.baseSpeed,
});

const serializeBasicAttack = (basicAttack: BasicAttackSlot) => ({
  keyBinding: basicAttack.keyBinding,
  skillId: basicAttack.skill.id,
});

const serializeCharacterConfig = (config: CharacterConfig) => ({
  typeId: config.typeId,
  attackType: config.attackType ?? '',
  monsterRespawnDelay: config.monsterRespawnDelay ?? '',
  monsterMaxCount: config.monsterMaxCount ?? '',
  sizeMin: config.size.min,
  sizeMax: config.size.max,
  speedMin: config.speed.min,
  speedMax: config.speed.max,
  attackMin: config.attack.min,
  attackMax: config.attack.max,
  defenseMin: config.defense.min,
  defenseMax: config.defense.max,
  attackSpeedMin: config.attackSpeed.min,
  attackSpeedMax: config.attackSpeed.max,
  accuracyMin: config.accuracy.min,
  accuracyMax: config.accuracy.max,
  criticalRateMin: config.criticalRate.min,
  criticalRateMax: config.criticalRate.max,
  attackRangeMin: config.attackRange.min,
  attackRangeMax: config.attackRange.max,
  attackWidthMin: config.attackWidth.min,
  attackWidthMax: config.attackWidth.max,
});

const appendJsonSheet = (
  workbook: XLSX.WorkBook,
  name: string,
  rows: Array<Record<string, unknown>>
) => {
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), name);
};

export function exportGameDataToWorkbook(
  state: GameDataState,
  writeWorkbookFile: WriteWorkbookFile = XLSX.writeFile
): string {
  const workbook = XLSX.utils.book_new();

  appendJsonSheet(
    workbook,
    DATA_WORKBOOK_SHEETS.CHARACTER_TYPES,
    serializeCharacterTypes(state.characterTypes)
  );
  appendJsonSheet(
    workbook,
    DATA_WORKBOOK_SHEETS.MONSTER_TYPES,
    Object.entries(state.monsterTypeStats).map(([id, stats]) => ({
      id,
      characterType: stats.characterType,
      baseLevel: stats.baseLevel,
      size: stats.size,
      aiPattern: stats.aiPattern,
      skills: stringify(stats.skills),
      aiPatternConfig: stringify(stats.aiPatternConfig ?? null),
    }))
  );
  appendJsonSheet(workbook, DATA_WORKBOOK_SHEETS.SKILLS, serializeSkills(state.skillConfigs));
  appendJsonSheet(workbook, DATA_WORKBOOK_SHEETS.ITEMS, serializeItemSlots(state.itemSlots));
  appendJsonSheet(
    workbook,
    DATA_WORKBOOK_SHEETS.PLAYER_DATASET,
    state.playerDataset as unknown as Array<Record<string, unknown>>
  );
  appendJsonSheet(
    workbook,
    DATA_WORKBOOK_SHEETS.MONSTER_DATASET,
    state.monsterDataset as unknown as Array<Record<string, unknown>>
  );
  appendJsonSheet(workbook, DATA_WORKBOOK_SHEETS.PLAYER_LEVEL_CONFIG, [
    serializeLevelConfig(state.playerLevelConfig),
  ]);
  appendJsonSheet(workbook, DATA_WORKBOOK_SHEETS.MONSTER_LEVEL_CONFIG, [
    serializeLevelConfig(state.monsterLevelConfig),
  ]);
  appendJsonSheet(workbook, DATA_WORKBOOK_SHEETS.PLAYER_BASIC_ATTACK, [
    serializeBasicAttack(state.playerBasicAttack),
  ]);
  appendJsonSheet(workbook, DATA_WORKBOOK_SHEETS.MONSTER_BASIC_ATTACK, [
    serializeBasicAttack(state.monsterBasicAttack),
  ]);
  appendJsonSheet(workbook, DATA_WORKBOOK_SHEETS.PLAYER_CONFIG, [
    serializeCharacterConfig(state.playerConfig),
  ]);
  appendJsonSheet(workbook, DATA_WORKBOOK_SHEETS.MONSTER_CONFIG, [
    serializeCharacterConfig(state.monsterConfig),
  ]);

  const filename = `${DATA_EXPORT_FILENAME_PREFIX}-${new Date().toISOString().split('T')[0]}.xlsx`;
  writeWorkbookFile(workbook, filename);
  return filename;
}
