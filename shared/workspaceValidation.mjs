import { getAIPatternConfigError } from './aiPatternValidation.mjs';
import { getMonsterDatasetRowError, getPlayerDatasetRowError } from './datasetValidation.mjs';
import { getEffectPresetError } from './effectValidation.mjs';
import { getItemSlotError } from './itemValidation.mjs';
import { hasCharacterTypeReference, hasSkillReference } from './referenceValidation.mjs';
import { getBasicAttackSlotError, getSkillError, getSkillSlotError } from './skillValidation.mjs';

const isRecord = value => typeof value === 'object' && value !== null && !Array.isArray(value);
const isFiniteNumber = value => typeof value === 'number' && Number.isFinite(value);

function getAIPatternSkillReferenceError(config, field, skillSources) {
  for (const [index, pattern] of config.patterns.entries()) {
    if ((pattern.action !== 'attack' && pattern.action !== 'skill') || !pattern.skillId) {
      continue;
    }
    if (!hasSkillReference(pattern.skillId, skillSources, true)) {
      return `${field}.patterns[${index}].skillId`;
    }
  }
  return undefined;
}

function getOptionalSkillReferenceError(id, field, skillSources) {
  if (id === undefined || id === null || id === '') return undefined;
  return getSkillReferenceError(id, field, skillSources);
}

function getOptionalTypeReferenceError(id, field, typeIds) {
  if (id === undefined || id === null || id === '') return undefined;
  return getTypeReferenceError(id, field, typeIds);
}

function getSkillReferenceError(id, field, skillSources) {
  return hasSkillReference(id, skillSources) ? undefined : field;
}

function getTypeReferenceError(id, field, typeIds) {
  return hasCharacterTypeReference(id, typeIds) ? undefined : field;
}

function getLevelConfigError(value, field) {
  const numericFields = [
    'currentLevel',
    'currentExp',
    'expToNextLevel',
    'hpPerLevel',
    'spPerLevel',
    'attackPerLevel',
    'defensePerLevel',
    'speedPerLevel',
    'baseHp',
    'baseSp',
    'baseAttack',
    'baseDefense',
    'baseSpeed',
  ];
  for (const key of numericFields) {
    if (!isFiniteNumber(value[key])) return `${field}.${key}`;
  }
  if (value.maxLevel !== undefined && !isFiniteNumber(value.maxLevel)) {
    return `${field}.maxLevel`;
  }
  if (!isRecord(value.expGrowth)) return `${field}.expGrowth`;
  if (!['linear', 'exponential'].includes(value.expGrowth.type)) {
    return `${field}.expGrowth.type`;
  }
  for (const coefficient of ['a', 'b']) {
    if (!isFiniteNumber(value.expGrowth[coefficient])) {
      return `${field}.expGrowth.${coefficient}`;
    }
  }
  if (value.formulaMode !== undefined && !['simple', 'advanced'].includes(value.formulaMode)) {
    return `${field}.formulaMode`;
  }
  for (const key of [
    'hpFormulaBlocks',
    'spFormulaBlocks',
    'attackFormulaBlocks',
    'defenseFormulaBlocks',
    'speedFormulaBlocks',
  ]) {
    if (value[key] !== undefined && !Array.isArray(value[key])) return `${field}.${key}`;
  }
  if (value.expGrowthConfig !== undefined && !isRecord(value.expGrowthConfig)) {
    return `${field}.expGrowthConfig`;
  }

  for (const growth of ['hpGrowth', 'spGrowth', 'attackGrowth', 'defenseGrowth', 'speedGrowth']) {
    if (!isRecord(value[growth])) return `${field}.${growth}`;
    for (const coefficient of ['a', 'b']) {
      if (!isFiniteNumber(value[growth][coefficient])) {
        return `${field}.${growth}.${coefficient}`;
      }
    }
  }
  return undefined;
}

function getCharacterConfigError(value, field) {
  for (const range of [
    'size',
    'speed',
    'attack',
    'defense',
    'attackSpeed',
    'accuracy',
    'criticalRate',
    'attackRange',
    'attackWidth',
  ]) {
    if (!isRecord(value[range])) return `${field}.${range}`;
    for (const bound of ['min', 'max']) {
      if (!isFiniteNumber(value[range][bound])) return `${field}.${range}.${bound}`;
    }
  }
  if (typeof value.typeId !== 'string') return `${field}.typeId`;
  for (const key of ['attackType']) {
    if (value[key] !== undefined && typeof value[key] !== 'string') {
      return `${field}.${key}`;
    }
  }
  for (const key of ['monsterRespawnDelay', 'monsterMaxCount']) {
    if (value[key] !== undefined && !isFiniteNumber(value[key])) return `${field}.${key}`;
  }
  return undefined;
}

export function getWorkspaceSnapshotError(value) {
  if (!isRecord(value) || value.version !== 1) return '작업공간';

  const recordFields = [
    'keyBindings',
    'playerLevelConfig',
    'monsterLevelConfig',
    'playerBasicAttack',
    'monsterBasicAttack',
    'skillConfigs',
    'monsterTypeStats',
    'playerConfig',
    'monsterConfig',
  ];
  const arrayFields = [
    'characterTypes',
    'skillSlots',
    'customEffectPresets',
    'itemSlots',
    'playerDataset',
    'monsterDataset',
    'stageDefinitions',
    'selectedMonsterIds',
  ];

  if (!Number.isSafeInteger(value.currentTick) || value.currentTick < 0) {
    return 'currentTick';
  }
  for (const field of recordFields) {
    if (!isRecord(value[field])) return field;
  }
  for (const field of arrayFields) {
    if (!Array.isArray(value[field])) return field;
  }
  if (
    (value.activeStageId !== null && typeof value.activeStageId !== 'string') ||
    typeof value.homingProjectiles !== 'boolean' ||
    !Number.isSafeInteger(value.maxMonsterCount) ||
    value.maxMonsterCount < 1 ||
    typeof value.respawnDelay !== 'number' ||
    !Number.isFinite(value.respawnDelay) ||
    value.respawnDelay < 0
  ) {
    return '설정 값';
  }

  for (const [index, id] of value.selectedMonsterIds.entries()) {
    if (typeof id !== 'string') return `selectedMonsterIds[${index}]`;
  }

  const keyFields = [
    'moveUp',
    'moveDown',
    'moveLeft',
    'moveRight',
    'attack',
    'skill1',
    'skill2',
    'skill3',
    'skill4',
  ];
  for (const key of keyFields) {
    if (typeof value.keyBindings[key] !== 'string') return `keyBindings.${key}`;
  }
  for (const key of ['mouseAttack', 'mouseSkill']) {
    if (!isFiniteNumber(value.keyBindings[key])) return `keyBindings.${key}`;
  }

  const objectArrays = [
    'characterTypes',
    'skillSlots',
    'customEffectPresets',
    'itemSlots',
    'playerDataset',
    'monsterDataset',
    'stageDefinitions',
  ];
  for (const field of objectArrays) {
    for (const [index, entry] of value[field].entries()) {
      if (!isRecord(entry)) return `${field}[${index}]`;
    }
  }

  for (const [index, effect] of value.customEffectPresets.entries()) {
    const invalidField = getEffectPresetError(effect, `customEffectPresets[${index}]`);
    if (invalidField) return invalidField;
  }
  for (const [index, itemSlot] of value.itemSlots.entries()) {
    const invalidField = getItemSlotError(itemSlot, `itemSlots[${index}]`);
    if (invalidField) return invalidField;
  }
  for (const [index, skillSlot] of value.skillSlots.entries()) {
    const invalidField = getSkillSlotError(skillSlot, `skillSlots[${index}]`);
    if (invalidField) return invalidField;
  }
  for (const field of ['playerBasicAttack', 'monsterBasicAttack']) {
    const invalidField = getBasicAttackSlotError(value[field], field);
    if (invalidField) return invalidField;
  }

  for (const field of ['playerLevelConfig', 'monsterLevelConfig']) {
    const invalidField = getLevelConfigError(value[field], field);
    if (invalidField) return invalidField;
  }
  for (const field of ['playerConfig', 'monsterConfig']) {
    const invalidField = getCharacterConfigError(value[field], field);
    if (invalidField) return invalidField;
  }

  for (const [index, characterType] of value.characterTypes.entries()) {
    const typePath = `characterTypes[${index}]`;
    for (const key of ['id', 'name', 'description', 'color']) {
      if (typeof characterType[key] !== 'string') return `${typePath}.${key}`;
    }
    for (const key of ['defaultLevel', 'defaultSize']) {
      if (characterType[key] !== undefined && !isFiniteNumber(characterType[key])) {
        return `${typePath}.${key}`;
      }
    }
    if (
      characterType.defaultSkillIds !== undefined &&
      (!Array.isArray(characterType.defaultSkillIds) ||
        characterType.defaultSkillIds.some(id => typeof id !== 'string'))
    ) {
      return `${typePath}.defaultSkillIds`;
    }
    if (
      characterType.defaultBasicAttackId !== undefined &&
      typeof characterType.defaultBasicAttackId !== 'string'
    ) {
      return `${typePath}.defaultBasicAttackId`;
    }
    if (characterType.defaultAIPattern !== undefined && characterType.defaultAIPattern !== null) {
      const invalidField = getAIPatternConfigError(
        characterType.defaultAIPattern,
        `${typePath}.defaultAIPattern`
      );
      if (invalidField) return invalidField;
    }
    if (characterType.statFormulas !== undefined && !isRecord(characterType.statFormulas)) {
      return `${typePath}.statFormulas`;
    }
  }

  for (const [key, stats] of Object.entries(value.monsterTypeStats)) {
    const statsPath = `monsterTypeStats.${key}`;
    if (!isRecord(stats)) return statsPath;
    for (const field of ['characterType', 'aiPattern']) {
      if (typeof stats[field] !== 'string') return `${statsPath}.${field}`;
    }
    for (const field of ['baseLevel', 'size']) {
      if (!isFiniteNumber(stats[field])) return `${statsPath}.${field}`;
    }
    if (!Array.isArray(stats.skills) || stats.skills.some(skill => typeof skill !== 'string')) {
      return `${statsPath}.skills`;
    }
    if (stats.aiPatternConfig !== undefined && stats.aiPatternConfig !== null) {
      const invalidField = getAIPatternConfigError(
        stats.aiPatternConfig,
        `${statsPath}.aiPatternConfig`
      );
      if (invalidField) return invalidField;
    }
  }

  for (const field of ['skillConfigs']) {
    for (const [key, entry] of Object.entries(value[field])) {
      if (!isRecord(entry)) return `${field}.${key}`;
      const invalidField = getSkillError(entry, `${field}.${key}`);
      if (invalidField) return invalidField;
    }
  }

  for (const [index, row] of value.playerDataset.entries()) {
    const invalidField = getPlayerDatasetRowError(row, `playerDataset[${index}]`);
    if (invalidField) return invalidField;
  }
  const monsterDefinitionIds = new Set();
  for (const [index, row] of value.monsterDataset.entries()) {
    const invalidField = getMonsterDatasetRowError(row, `monsterDataset[${index}]`);
    if (invalidField) return invalidField;
    const monsterId = row.monster_definition_id;
    if (monsterDefinitionIds.has(monsterId)) {
      return `monsterDataset[${index}].monster_definition_id`;
    }
    monsterDefinitionIds.add(monsterId);
  }

  const skillSources = [value.skillConfigs];
  const characterTypeIds = new Set(
    value.characterTypes.map(characterType => characterType.id).filter(id => id.trim() !== '')
  );
  for (const [index, characterType] of value.characterTypes.entries()) {
    const typePath = `characterTypes[${index}]`;
    if (characterType.defaultBasicAttackId) {
      const invalidField = getOptionalSkillReferenceError(
        characterType.defaultBasicAttackId,
        `${typePath}.defaultBasicAttackId`,
        skillSources
      );
      if (invalidField) return invalidField;
    }
    for (const [skillIndex, skillId] of (characterType.defaultSkillIds ?? []).entries()) {
      const invalidField = getSkillReferenceError(
        skillId,
        `${typePath}.defaultSkillIds[${skillIndex}]`,
        skillSources
      );
      if (invalidField) return invalidField;
    }
    if (characterType.defaultAIPattern) {
      const invalidField = getAIPatternSkillReferenceError(
        characterType.defaultAIPattern,
        `${typePath}.defaultAIPattern`,
        skillSources
      );
      if (invalidField) return invalidField;
    }
  }

  for (const field of ['playerConfig', 'monsterConfig']) {
    const invalidField = getOptionalTypeReferenceError(
      value[field].typeId,
      `${field}.typeId`,
      characterTypeIds
    );
    if (invalidField) return invalidField;
  }
  for (const [index, row] of value.playerDataset.entries()) {
    for (const key of [
      'player_basic_attack_id',
      'player_skill_1_id',
      'player_skill_2_id',
      'player_skill_3_id',
      'player_skill_4_id',
    ]) {
      const invalidField = getOptionalSkillReferenceError(
        row[key],
        `playerDataset[${index}].${key}`,
        skillSources
      );
      if (invalidField) return invalidField;
    }
    const invalidField = getOptionalTypeReferenceError(
      row.player_attack_type,
      `playerDataset[${index}].player_attack_type`,
      characterTypeIds
    );
    if (invalidField) return invalidField;
  }
  for (const [index, row] of value.monsterDataset.entries()) {
    for (const key of [
      'monster_basic_attack_id',
      'monster_skill_1_id',
      'monster_skill_2_id',
      'monster_skill_3_id',
      'monster_skill_4_id',
    ]) {
      const invalidField = getOptionalSkillReferenceError(
        row[key],
        `monsterDataset[${index}].${key}`,
        skillSources
      );
      if (invalidField) return invalidField;
    }
    const typeError = getOptionalTypeReferenceError(
      row.monster_attack_type,
      `monsterDataset[${index}].monster_attack_type`,
      characterTypeIds
    );
    if (typeError) return typeError;
    if (
      row.monster_ai_patterns !== undefined &&
      row.monster_ai_patterns !== null &&
      row.monster_ai_patterns !== ''
    ) {
      const config = JSON.parse(row.monster_ai_patterns);
      const skillError = getAIPatternSkillReferenceError(
        config,
        `monsterDataset[${index}].monster_ai_patterns`,
        skillSources
      );
      if (skillError) return skillError;
    }
  }
  for (const [key, stats] of Object.entries(value.monsterTypeStats)) {
    const typeError = getTypeReferenceError(
      stats.characterType,
      `monsterTypeStats.${key}.characterType`,
      characterTypeIds
    );
    if (typeError) return typeError;
    for (const [index, skillId] of stats.skills.entries()) {
      const skillError = getSkillReferenceError(
        skillId,
        `monsterTypeStats.${key}.skills[${index}]`,
        skillSources
      );
      if (skillError) return skillError;
    }
    if (stats.aiPatternConfig) {
      const skillError = getAIPatternSkillReferenceError(
        stats.aiPatternConfig,
        `monsterTypeStats.${key}.aiPatternConfig`,
        skillSources
      );
      if (skillError) return skillError;
    }
  }

  for (const [stageIndex, stage] of value.stageDefinitions.entries()) {
    const stagePath = `stageDefinitions[${stageIndex}]`;
    if (
      typeof stage.id !== 'string' ||
      typeof stage.name !== 'string' ||
      !Array.isArray(stage.waves)
    ) {
      return stagePath;
    }

    for (const [waveIndex, wave] of stage.waves.entries()) {
      const wavePath = `${stagePath}.waves[${waveIndex}]`;
      if (
        !isRecord(wave) ||
        typeof wave.id !== 'string' ||
        typeof wave.durationMs !== 'number' ||
        !Number.isFinite(wave.durationMs) ||
        !isRecord(wave.respawn) ||
        typeof wave.respawn.enabled !== 'boolean' ||
        typeof wave.respawn.delayMs !== 'number' ||
        !Number.isFinite(wave.respawn.delayMs) ||
        !Array.isArray(wave.monsterSpawns)
      ) {
        return wavePath;
      }

      for (const [mappingIndex, mapping] of wave.monsterSpawns.entries()) {
        if (
          !isRecord(mapping) ||
          typeof mapping.monsterDefinitionId !== 'string' ||
          typeof mapping.count !== 'number' ||
          !Number.isFinite(mapping.count)
        ) {
          return `${wavePath}.monsterSpawns[${mappingIndex}]`;
        }
        if (!monsterDefinitionIds.has(mapping.monsterDefinitionId)) {
          return `${wavePath}.monsterSpawns[${mappingIndex}].monsterDefinitionId`;
        }
      }
    }
  }

  return undefined;
}
