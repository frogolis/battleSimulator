const isRecord = value => typeof value === 'object' && value !== null && !Array.isArray(value);
const isFiniteNumber = value => typeof value === 'number' && Number.isFinite(value);

const numericFields = [
  'shapeScaleX',
  'shapeScaleY',
  'shapeRotation',
  'shapeOutlineWidth',
  'shapeCornerRadius',
  'starPoints',
  'starInnerRatio',
  'projectileCount',
  'projectileSpeed',
  'projectileSize',
  'projectileLifetime',
  'spreadAngle',
  'trailParticleCount',
  'trailLength',
  'trailWidth',
  'trailFadeSpeed',
  'trailArcAngle',
  'lightningSegments',
  'lightningJitter',
  'lightningForkChance',
  'ringRadius',
  'ringExpansionSpeed',
  'ringCount',
  'ringInterval',
  'glowRadius',
  'glowParticleCount',
  'glowRiseSpeed',
  'glowFadeSpeed',
  'repeatCount',
  'repeatInterval',
];

export function getEffectOptionalFieldsError(value, field) {
  if (!isRecord(value)) return field;
  for (const key of numericFields) {
    if (value[key] !== undefined && !isFiniteNumber(value[key])) return `${field}.${key}`;
  }
  if (value.isHoming !== undefined && typeof value.isHoming !== 'boolean') {
    return `${field}.isHoming`;
  }
  if (value.useCustomCode !== undefined && typeof value.useCustomCode !== 'boolean') {
    return `${field}.useCustomCode`;
  }
  if (value.customCode !== undefined && typeof value.customCode !== 'string') {
    return `${field}.customCode`;
  }
  if (
    value.projectilePattern !== undefined &&
    !['directional', 'radial', 'cone'].includes(value.projectilePattern)
  ) {
    return `${field}.projectilePattern`;
  }
  if (value.trailType !== undefined && !['slash', 'thrust', 'spin'].includes(value.trailType)) {
    return `${field}.trailType`;
  }
  return undefined;
}

export function getEffectPresetError(value, field) {
  if (!isRecord(value)) return field;
  for (const key of ['id', 'name', 'description', 'color', 'secondaryColor']) {
    if (typeof value[key] !== 'string') return `${field}.${key}`;
  }
  if (!['projectile', 'trail', 'lightning', 'ring', 'glow'].includes(value.effectType)) {
    return `${field}.effectType`;
  }
  if (!['circle', 'star', 'square', 'diamond', 'spark'].includes(value.particleTexture)) {
    return `${field}.particleTexture`;
  }
  if (!isFiniteNumber(value.glowIntensity)) return `${field}.glowIntensity`;
  return getEffectOptionalFieldsError(value, field);
}

export function isEffectPreset(value) {
  return getEffectPresetError(value, 'effect') === undefined;
}
