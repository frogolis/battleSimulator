import { getEffectOptionalFieldsError, getEffectPresetError } from './effectValidation.mjs';

const isRecord = value => typeof value === 'object' && value !== null && !Array.isArray(value);
const isFiniteNumber = value => typeof value === 'number' && Number.isFinite(value);

const skillTypes = ['melee', 'ranged', 'damage', 'heal', 'buff', 'debuff', 'area', 'defense'];
const projectileTypes = ['none', 'arrow', 'fireball', 'lightning', 'energy', 'ice', 'wave', 'wind'];
const effectShapes = [
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
];

function getSkillVisualError(value, field) {
  if (!isRecord(value)) return field;
  for (const key of ['color', 'secondaryColor']) {
    if (typeof value[key] !== 'string') return `${field}.${key}`;
  }
  if (!isFiniteNumber(value.glowIntensity)) return `${field}.glowIntensity`;
  for (const key of ['particleCount', 'particleSize', 'particleLifetime']) {
    if (!isFiniteNumber(value[key])) return `${field}.${key}`;
  }
  if (!effectShapes.includes(value.effectShape)) return `${field}.effectShape`;
  if (value.effectPresetId !== undefined && typeof value.effectPresetId !== 'string') {
    return `${field}.effectPresetId`;
  }
  if (
    value.effectType !== undefined &&
    !['projectile', 'trail', 'lightning', 'ring', 'glow'].includes(value.effectType)
  ) {
    return `${field}.effectType`;
  }
  if (
    value.particleTexture !== undefined &&
    !['circle', 'star', 'square', 'diamond', 'spark'].includes(value.particleTexture)
  ) {
    return `${field}.particleTexture`;
  }
  return getEffectOptionalFieldsError(value, field);
}

export function getSkillError(value, field) {
  if (!isRecord(value)) return field;
  for (const key of ['id', 'name', 'description', 'iconName']) {
    if (typeof value[key] !== 'string') return `${field}.${key}`;
  }
  if (!skillTypes.includes(value.type)) return `${field}.type`;
  if (!['basicAttack', 'skill'].includes(value.category)) return `${field}.category`;
  if (!Array.isArray(value.tags) || value.tags.some(tag => typeof tag !== 'string')) {
    return `${field}.tags`;
  }

  for (const key of [
    'spCost',
    'cooldown',
    'castTime',
    'range',
    'area',
    'damageMultiplier',
    'healAmount',
    'buffDuration',
    'currentCooldown',
  ]) {
    if (!isFiniteNumber(value[key])) return `${field}.${key}`;
  }
  if (value.maxCooldown !== undefined && !isFiniteNumber(value.maxCooldown)) {
    return `${field}.maxCooldown`;
  }

  if (!isRecord(value.timing)) return `${field}.timing`;
  for (const key of ['windup', 'execution', 'recovery']) {
    if (!isFiniteNumber(value.timing[key])) return `${field}.timing.${key}`;
  }

  if (value.damageFormula !== undefined && value.damageFormula !== null) {
    if (!isRecord(value.damageFormula)) return `${field}.damageFormula`;
    if (!['attack', 'defense', 'magic', 'speed'].includes(value.damageFormula.stat)) {
      return `${field}.damageFormula.stat`;
    }
    if (!['+', '*'].includes(value.damageFormula.operator)) {
      return `${field}.damageFormula.operator`;
    }
    if (!isFiniteNumber(value.damageFormula.value)) return `${field}.damageFormula.value`;
  }

  if (!isRecord(value.buffEffect)) return `${field}.buffEffect`;
  for (const key of ['attack', 'defense', 'speed', 'attackSpeed']) {
    if (value.buffEffect[key] !== undefined && !isFiniteNumber(value.buffEffect[key])) {
      return `${field}.buffEffect.${key}`;
    }
  }

  const visualError = getSkillVisualError(value.visual, `${field}.visual`);
  if (visualError) return visualError;
  if (value.effects !== undefined) {
    if (!Array.isArray(value.effects)) return `${field}.effects`;
    for (const [index, effect] of value.effects.entries()) {
      const effectError = getEffectPresetError(effect, `${field}.effects[${index}]`);
      if (effectError) return effectError;
    }
  }

  if (!isRecord(value.projectile)) return `${field}.projectile`;
  if (!projectileTypes.includes(value.projectile.type)) return `${field}.projectile.type`;
  for (const key of ['speed', 'size', 'trailLength']) {
    if (!isFiniteNumber(value.projectile[key])) return `${field}.projectile.${key}`;
  }
  for (const key of ['piercing', 'homing', 'trail']) {
    if (typeof value.projectile[key] !== 'boolean') return `${field}.projectile.${key}`;
  }

  if (!isRecord(value.animation)) return `${field}.animation`;
  for (const key of ['castAnimation', 'impactAnimation']) {
    if (typeof value.animation[key] !== 'string') return `${field}.animation.${key}`;
  }
  for (const key of ['castScale', 'impactDuration', 'cameraShake']) {
    if (!isFiniteNumber(value.animation[key])) return `${field}.animation.${key}`;
  }

  if (!isRecord(value.sound)) return `${field}.sound`;
  for (const key of ['castSound', 'impactSound']) {
    if (typeof value.sound[key] !== 'string') return `${field}.sound.${key}`;
  }
  if (!isFiniteNumber(value.sound.volume)) return `${field}.sound.volume`;
  if (typeof value.isOnCooldown !== 'boolean') return `${field}.isOnCooldown`;
  return undefined;
}

export function getSkillSlotError(value, field) {
  if (!isRecord(value)) return field;
  if (!Number.isInteger(value.slotNumber) || value.slotNumber < 1 || value.slotNumber > 4) {
    return `${field}.slotNumber`;
  }
  if (typeof value.keyBinding !== 'string') return `${field}.keyBinding`;
  if (value.skill !== null) {
    const skillError = getSkillError(value.skill, `${field}.skill`);
    if (skillError) return skillError;
  }
  if (value.overrides !== undefined) {
    if (!isRecord(value.overrides)) return `${field}.overrides`;
    for (const key of ['range', 'area', 'damageMultiplier', 'cooldown', 'spCost', 'castTime']) {
      if (value.overrides[key] !== undefined && !isFiniteNumber(value.overrides[key])) {
        return `${field}.overrides.${key}`;
      }
    }
  }
  return undefined;
}

export function getBasicAttackSlotError(value, field) {
  if (!isRecord(value)) return field;
  const skillError = getSkillError(value.skill, `${field}.skill`);
  if (skillError) return skillError;
  if (
    value.keyBinding !== undefined &&
    value.keyBinding !== 'click' &&
    value.keyBinding !== 'auto'
  ) {
    return `${field}.keyBinding`;
  }
  for (const key of ['range', 'width', 'damage', 'cooldown', 'spCost', 'castTime']) {
    if (value[key] !== undefined && !isFiniteNumber(value[key])) return `${field}.${key}`;
  }
  return undefined;
}
