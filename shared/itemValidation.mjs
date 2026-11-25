const isRecord = value => typeof value === 'object' && value !== null && !Array.isArray(value);
const isFiniteNumber = value => typeof value === 'number' && Number.isFinite(value);

export function getItemError(value, field) {
  if (!isRecord(value)) return field;
  for (const key of ['id', 'name', 'description', 'iconName', 'color']) {
    if (typeof value[key] !== 'string') return `${field}.${key}`;
  }
  if (!['potion', 'scroll', 'bomb', 'buff'].includes(value.type)) {
    return `${field}.type`;
  }
  for (const key of [
    'healAmount',
    'spRestore',
    'damageAmount',
    'damageRange',
    'buffDuration',
    'cooldown',
    'currentCooldown',
    'quantity',
    'maxStack',
    'particleCount',
  ]) {
    if (!isFiniteNumber(value[key])) return `${field}.${key}`;
  }
  if (typeof value.isOnCooldown !== 'boolean') return `${field}.isOnCooldown`;
  if (!isRecord(value.buffEffect)) return `${field}.buffEffect`;
  for (const key of ['attack', 'defense', 'speed', 'criticalRate']) {
    if (value.buffEffect[key] !== undefined && !isFiniteNumber(value.buffEffect[key])) {
      return `${field}.buffEffect.${key}`;
    }
  }
  return undefined;
}

export function getItemSlotError(value, field) {
  if (!isRecord(value)) return field;
  if (!Number.isInteger(value.slotNumber) || value.slotNumber < 1 || value.slotNumber > 4) {
    return `${field}.slotNumber`;
  }
  if (typeof value.keyBinding !== 'string') return `${field}.keyBinding`;
  if (value.item === null) return undefined;
  return getItemError(value.item, `${field}.item`);
}
