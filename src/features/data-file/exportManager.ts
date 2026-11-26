import * as XLSX from 'xlsx';
import { CharacterTypeInfo } from '../../lib/characterTypes';
import { CharacterConfig } from '../../lib/gameTypes';
import { ItemSlot } from '../../lib/itemSystem';
import { LevelConfig } from '../../lib/levelSystem';
import { BasicAttackSlot, Skill } from '../../lib/skillSystem';
import { GameDataState } from '../data-io/model';
import { DATA_EXPORT_FILENAME_PREFIX, DATA_WORKBOOK_SHEETS } from './constants';

type WriteWorkbookFile = (workbook: XLSX.WorkBook, filename: string) => void;

const stringify = (value: unknown, field: string): string => {
  try {
    const result = JSON.stringify(value, (_key, item: unknown) => {
      if (typeof item === 'number' && !Number.isFinite(item)) {
        throw new Error('유한하지 않은 숫자는 JSON으로 보존할 수 없습니다.');
      }
      return item;
    });
    if (result === undefined) throw new Error('JSON 값이 없습니다.');
    return result;
  } catch (error) {
    throw new Error(`Excel 내보내기에서 "${field}" 데이터를 변환할 수 없습니다.`, {
      cause: error,
    });
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
    defaultSkillIds: stringify(
      characterType.defaultSkillIds ?? [], `Character Types.${characterType.id}.defaultSkillIds`
    ),
    defaultAIPattern: stringify(
      characterType.defaultAIPattern ?? null, `Character Types.${characterType.id}.defaultAIPattern`
    ),
    statFormulas: stringify(
      characterType.statFormulas ?? null, `Character Types.${characterType.id}.statFormulas`
    ),
  }));

const serializeSkills = (skillConfigs: Record<string, Skill>) =>
  Object.values(skillConfigs).map(skill => ({
    id: skill.id,
    name: skill.name,
    description: skill.description,
    type: skill.type,
    category: skill.category,
    tags: stringify(skill.tags, `Skills.${skill.id}.tags`),
    iconName: skill.iconName,
    spCost: skill.spCost,
    cooldown: skill.cooldown,
    castTime: skill.castTime,
    range: skill.range,
    area: skill.area,
    timing: stringify(skill.timing, `Skills.${skill.id}.timing`),
    damageMultiplier: skill.damageMultiplier,
    damageFormula: stringify(skill.damageFormula ?? null, `Skills.${skill.id}.damageFormula`),
    healAmount: skill.healAmount,
    buffDuration: skill.buffDuration,
    buffEffect: stringify(skill.buffEffect, `Skills.${skill.id}.buffEffect`),
    visual: stringify(skill.visual, `Skills.${skill.id}.visual`),
    effects:
      skill.effects === undefined ? '' : stringify(skill.effects, `Skills.${skill.id}.effects`),
    projectile: stringify(skill.projectile, `Skills.${skill.id}.projectile`),
    animation: stringify(skill.animation, `Skills.${skill.id}.animation`),
    sound: stringify(skill.sound, `Skills.${skill.id}.sound`),
  }));

const serializeItemSlots = (itemSlots: ItemSlot[]) =>
  itemSlots.map(slot => ({
    slotNumber: slot.slotNumber,
    keyBinding: slot.keyBinding,
    item: stringify(slot.item, `Items.${slot.slotNumber}.item`),
  }));

const serializeLevelConfig = (levelConfig: LevelConfig, sheetName: string) => ({
  currentLevel: levelConfig.currentLevel,
  currentExp: levelConfig.currentExp,
  expToNextLevel: levelConfig.expToNextLevel,
  maxLevel: levelConfig.maxLevel ?? '',
  hpPerLevel: levelConfig.hpPerLevel,
  spPerLevel: levelConfig.spPerLevel,
  attackPerLevel: levelConfig.attackPerLevel,
  defensePerLevel: levelConfig.defensePerLevel,
  speedPerLevel: levelConfig.speedPerLevel,
  hpGrowth: stringify(levelConfig.hpGrowth, `${sheetName}.hpGrowth`),
  spGrowth: stringify(levelConfig.spGrowth, `${sheetName}.spGrowth`),
  attackGrowth: stringify(levelConfig.attackGrowth, `${sheetName}.attackGrowth`),
  defenseGrowth: stringify(levelConfig.defenseGrowth, `${sheetName}.defenseGrowth`),
  speedGrowth: stringify(levelConfig.speedGrowth, `${sheetName}.speedGrowth`),
  hpFormulaBlocks:
    levelConfig.hpFormulaBlocks === undefined ? '' : stringify(levelConfig.hpFormulaBlocks, `${sheetName}.hpFormulaBlocks`),
  spFormulaBlocks:
    levelConfig.spFormulaBlocks === undefined ? '' : stringify(levelConfig.spFormulaBlocks, `${sheetName}.spFormulaBlocks`),
  attackFormulaBlocks:
    levelConfig.attackFormulaBlocks === undefined ? '' : stringify(levelConfig.attackFormulaBlocks, `${sheetName}.attackFormulaBlocks`),
  defenseFormulaBlocks:
    levelConfig.defenseFormulaBlocks === undefined ? '' : stringify(levelConfig.defenseFormulaBlocks, `${sheetName}.defenseFormulaBlocks`),
  speedFormulaBlocks:
    levelConfig.speedFormulaBlocks === undefined ? '' : stringify(levelConfig.speedFormulaBlocks, `${sheetName}.speedFormulaBlocks`),
  formulaMode: levelConfig.formulaMode ?? '',
  expGrowth: stringify(levelConfig.expGrowth, `${sheetName}.expGrowth`),
  expGrowthConfig: stringify(levelConfig.expGrowthConfig ?? null, `${sheetName}.expGrowthConfig`),
  baseHp: levelConfig.baseHp,
  baseSp: levelConfig.baseSp,
  baseAttack: levelConfig.baseAttack,
  baseDefense: levelConfig.baseDefense,
  baseSpeed: levelConfig.baseSpeed,
});

const serializeBasicAttack = (basicAttack: BasicAttackSlot) => ({
  keyBinding: basicAttack.keyBinding ?? '',
  skillId: basicAttack.skill.id,
  range: basicAttack.range ?? '',
  width: basicAttack.width ?? '',
  damage: basicAttack.damage ?? '',
  cooldown: basicAttack.cooldown ?? '',
  spCost: basicAttack.spCost ?? '',
  castTime: basicAttack.castTime ?? '',
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
  rows.forEach((row, index) => {
    Object.entries(row).forEach(([field, value]) => {
      if (
        value === null ||
        value === undefined ||
        typeof value === 'string' ||
        typeof value === 'boolean' ||
        (typeof value === 'number' && Number.isFinite(value))
      ) {
        return;
      }
      throw new Error(
        `Excel 내보내기에서 "${name}" 시트 ${index + 2}행 "${field}" 값을 보존할 수 없습니다.`
      );
    });
  });
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
      skills: stringify(stats.skills, `Monster Types.${id}.skills`),
      aiPatternConfig: stringify(
        stats.aiPatternConfig ?? null, `Monster Types.${id}.aiPatternConfig`
      ),
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
  appendJsonSheet(
    workbook,
    DATA_WORKBOOK_SHEETS.STAGES,
    state.stageDefinitions.map(stage => ({ id: stage.id, name: stage.name }))
  );
  appendJsonSheet(
    workbook,
    DATA_WORKBOOK_SHEETS.WAVES,
    state.stageDefinitions.flatMap(stage =>
      stage.waves.map((wave, order) => ({
        id: wave.id,
        stageId: stage.id,
        order,
        durationMs: wave.durationMs,
        respawnEnabled: wave.respawn.enabled,
        respawnDelayMs: wave.respawn.delayMs,
      }))
    )
  );
  appendJsonSheet(
    workbook,
    DATA_WORKBOOK_SHEETS.WAVE_MONSTER_MAPPINGS,
    state.stageDefinitions.flatMap(stage =>
      stage.waves.flatMap(wave =>
        wave.monsterSpawns.map(mapping => ({
          stageId: stage.id,
          waveId: wave.id,
          monsterDefinitionId: mapping.monsterDefinitionId,
          count: mapping.count,
        }))
      )
    )
  );
  appendJsonSheet(workbook, DATA_WORKBOOK_SHEETS.PLAYER_LEVEL_CONFIG, [
    serializeLevelConfig(state.playerLevelConfig, DATA_WORKBOOK_SHEETS.PLAYER_LEVEL_CONFIG),
  ]);
  appendJsonSheet(workbook, DATA_WORKBOOK_SHEETS.MONSTER_LEVEL_CONFIG, [
    serializeLevelConfig(state.monsterLevelConfig, DATA_WORKBOOK_SHEETS.MONSTER_LEVEL_CONFIG),
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
