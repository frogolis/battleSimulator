import { getAIPatternConfigError } from './aiPatternValidation.mjs';

const isRecord = value => typeof value === 'object' && value !== null && !Array.isArray(value);
const isBlank = value =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
const isNonNegativeNumber = value =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const playerResourceFields = ['player_hp', 'player_sp'];
const authoredPlayerStatFields = [
  'player_attack',
  'player_defense',
  'player_speed',
  'player_attack_speed',
  'player_accuracy',
  'player_critical_rate',
];
const monsterStatFields = [
  'monster_hp',
  'monster_sp',
  'monster_attack',
  'monster_defense',
  'monster_speed',
  'monster_attack_speed',
  'monster_accuracy',
  'monster_critical_rate',
];

function getOptionalNonNegativeNumberError(row, key, field) {
  const value = row[key];
  if (isBlank(value) || isNonNegativeNumber(value)) return undefined;
  return `${field}.${key}`;
}

export function getPlayerDatasetRowError(value, field) {
  if (!isRecord(value)) return field;

  const characterId = value.player_character_id;
  if (characterId !== undefined && characterId !== null && typeof characterId !== 'string') {
    return `${field}.player_character_id`;
  }

  for (const key of playerResourceFields) {
    const invalidField = getOptionalNonNegativeNumberError(value, key, field);
    if (invalidField) return invalidField;
  }

  if (typeof characterId === 'string' && characterId.trim() !== '') {
    if (!isBlank(value.player_level)) {
      if (
        typeof value.player_level !== 'number' ||
        !Number.isInteger(value.player_level) ||
        value.player_level < 1
      ) {
        return `${field}.player_level`;
      }
    }
    for (const key of authoredPlayerStatFields) {
      const invalidField = getOptionalNonNegativeNumberError(value, key, field);
      if (invalidField) return invalidField;
    }
  }

  return undefined;
}

export function getMonsterDatasetRowError(value, field) {
  if (!isRecord(value)) return field;
  if (
    typeof value.monster_definition_id !== 'string' ||
    value.monster_definition_id.trim() === '' ||
    value.monster_definition_id !== value.monster_definition_id.trim()
  ) {
    return `${field}.monster_definition_id`;
  }
  for (const key of monsterStatFields) {
    const invalidField = getOptionalNonNegativeNumberError(value, key, field);
    if (invalidField) return invalidField;
  }

  const patternField = `${field}.monster_ai_patterns`;
  const rawPattern = value.monster_ai_patterns;
  if (rawPattern !== undefined && rawPattern !== null && rawPattern !== '') {
    if (typeof rawPattern !== 'string') return patternField;
    let config;
    try {
      config = JSON.parse(rawPattern);
    } catch {
      return patternField;
    }
    const invalidField = getAIPatternConfigError(config, patternField);
    if (invalidField) return invalidField;
  }

  return undefined;
}
