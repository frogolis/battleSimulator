const isRecord = value => typeof value === 'object' && value !== null && !Array.isArray(value);
const isFiniteNumber = value => typeof value === 'number' && Number.isFinite(value);

export function getAIPatternConfigError(value, field) {
  if (!isRecord(value)) return field;
  for (const key of ['aggroRange', 'chaseMinDistance']) {
    if (!isFiniteNumber(value[key])) return `${field}.${key}`;
  }
  if (!Array.isArray(value.patterns)) return `${field}.patterns`;

  for (const [patternIndex, pattern] of value.patterns.entries()) {
    const patternPath = `${field}.patterns[${patternIndex}]`;
    if (!isRecord(pattern)) return patternPath;
    if (!['move', 'defend', 'chase', 'flee', 'attack', 'skill'].includes(pattern.action)) {
      return `${patternPath}.action`;
    }
    if (typeof pattern.enabled !== 'boolean') return `${patternPath}.enabled`;
    if (pattern.skillId !== undefined && typeof pattern.skillId !== 'string') {
      return `${patternPath}.skillId`;
    }
    if (!Array.isArray(pattern.conditions)) return `${patternPath}.conditions`;

    for (const [conditionIndex, condition] of pattern.conditions.entries()) {
      const conditionPath = `${patternPath}.conditions[${conditionIndex}]`;
      if (!isRecord(condition)) return conditionPath;
      if (!['distance', 'hp'].includes(condition.type)) return `${conditionPath}.type`;
      if (!['<', '>', '<=', '>='].includes(condition.operator)) {
        return `${conditionPath}.operator`;
      }
      if (!isFiniteNumber(condition.value)) return `${conditionPath}.value`;
    }
  }

  return undefined;
}

export function isAIPatternConfig(value) {
  return getAIPatternConfigError(value, 'aiPatternConfig') === undefined;
}
