/**
 * Effect preset registry separated from skill definitions.
 * Keeps effect-specific metadata and preset library independent from general skill logic.
 */

export type EffectType =
  | 'projectile'
  | 'trail'
  | 'lightning'
  | 'ring'
  | 'glow';

export type ProjectilePattern = 'directional' | 'radial' | 'cone';

export type ParticleTexture = 'circle' | 'star' | 'square' | 'diamond' | 'spark';

export interface EffectPreset {
  id: string;
  name: string;
  description: string;
  effectType: EffectType;

  color: string;
  secondaryColor: string;
  particleTexture: ParticleTexture;
  glowIntensity: number;
  shapeScaleX?: number;
  shapeScaleY?: number;
  shapeRotation?: number;
  shapeOutlineWidth?: number;
  shapeCornerRadius?: number;
  starPoints?: number;
  starInnerRatio?: number;

  projectilePattern?: ProjectilePattern;
  projectileCount?: number;
  projectileSpeed?: number;
  projectileSize?: number;
  projectileLifetime?: number;
  isHoming?: boolean;
  spreadAngle?: number;

  trailType?: 'slash' | 'thrust' | 'spin';
  trailParticleCount?: number;
  trailLength?: number;
  trailWidth?: number;
  trailFadeSpeed?: number;
  trailArcAngle?: number;

  lightningSegments?: number;
  lightningJitter?: number;
  lightningForkChance?: number;

  ringRadius?: number;
  ringExpansionSpeed?: number;
  ringCount?: number;
  ringInterval?: number;

  glowRadius?: number;
  glowParticleCount?: number;
  glowRiseSpeed?: number;
  glowFadeSpeed?: number;

  repeatCount?: number;
  repeatInterval?: number;
}

type LegacyVisualFields = {
  effectPresetId?: string;
  particleCount: number;
  particleSize: number;
  particleLifetime: number;
  effectShape: EffectShape;
};

export type EffectPresetWithLegacy = EffectPreset & LegacyVisualFields;

export type EffectShape =
  | 'circle'
  | 'cone'
  | 'line'
  | 'ring'
  | 'star'
  | 'shield'
  | 'dome'
  | 'spiral'
  | 'cross'
  | 'wave';

export type ProjectileType =
  | 'none'
  | 'arrow'
  | 'fireball'
  | 'lightning'
  | 'energy'
  | 'ice'
  | 'wave'
  | 'wind';

const getEffectShapeFromPreset = (preset: EffectPreset): EffectShape => {
  switch (preset.effectType) {
    case 'projectile':
      return preset.projectilePattern === 'cone' ? 'cone' : 'circle';
    case 'trail':
      return preset.trailType === 'spin' ? 'spiral' : 'line';
    case 'lightning':
      return 'line';
    case 'ring':
      return 'ring';
    case 'glow':
      return 'star';
    default:
      return 'circle';
  }
};

const withLegacyVisualFields = (preset: EffectPreset): EffectPresetWithLegacy => ({
  ...preset,
  effectPresetId: preset.id,
  particleCount:
    preset.projectileCount ??
    preset.trailParticleCount ??
    preset.glowParticleCount ??
    preset.ringCount ??
    12,
  particleSize:
    preset.projectileSize ??
    preset.trailWidth ??
    Math.max(6, Math.round((preset.glowRadius ?? preset.ringRadius ?? 48) / 8)),
  particleLifetime: preset.projectileLifetime ?? preset.ringInterval ?? 800,
  effectShape: getEffectShapeFromPreset(preset),
});

export const RAW_EFFECT_PRESETS: Record<string, EffectPreset> = {
  projectile_arrow_single: {
    id: 'projectile_arrow_single',
    name: '화살 (단일)',
    description: '타겟 방향으로 화살 1발 발사',
    effectType: 'projectile',
    color: '#ffd93d',
    secondaryColor: '#fef3c7',
    particleTexture: 'circle',
    glowIntensity: 0.4,
    projectilePattern: 'directional',
    projectileCount: 1,
    projectileSpeed: 600,
    projectileSize: 8,
    projectileLifetime: 1000,
    isHoming: false,
    spreadAngle: 0,
    repeatCount: 1,
  },

  projectile_arrow_multi: {
    id: 'projectile_arrow_multi',
    name: '다중 화살',
    description: '타겟 방향으로 3발의 화살 발사',
    effectType: 'projectile',
    color: '#fbbf24',
    secondaryColor: '#fde68a',
    particleTexture: 'circle',
    glowIntensity: 0.5,
    projectilePattern: 'directional',
    projectileCount: 3,
    projectileSpeed: 600,
    projectileSize: 7,
    projectileLifetime: 1000,
    isHoming: false,
    spreadAngle: 0.3,
    repeatCount: 1,
  },

  projectile_fireball: {
    id: 'projectile_fireball',
    name: '화염구',
    description: '강력한 화염구 발사',
    effectType: 'projectile',
    color: '#ff6b6b',
    secondaryColor: '#ffe066',
    particleTexture: 'circle',
    glowIntensity: 0.9,
    projectilePattern: 'directional',
    projectileCount: 1,
    projectileSpeed: 400,
    projectileSize: 12,
    projectileLifetime: 1500,
    isHoming: false,
    spreadAngle: 0,
    repeatCount: 1,
  },

  projectile_fireball_homing: {
    id: 'projectile_fireball_homing',
    name: '유도 화염구',
    description: '대상을 추적하는 화염구',
    effectType: 'projectile',
    color: '#ff8787',
    secondaryColor: '#ffec99',
    particleTexture: 'star',
    glowIntensity: 0.9,
    projectilePattern: 'directional',
    projectileCount: 1,
    projectileSpeed: 450,
    projectileSize: 12,
    projectileLifetime: 2000,
    isHoming: true,
    spreadAngle: 0,
    repeatCount: 1,
  },

  projectile_radial_burst: {
    id: 'projectile_radial_burst',
    name: '방사형 폭발',
    description: '사방으로 8발의 투사체 발사',
    effectType: 'projectile',
    color: '#d8b4fe',
    secondaryColor: '#f3e8ff',
    particleTexture: 'diamond',
    glowIntensity: 0.7,
    projectilePattern: 'radial',
    projectileCount: 8,
    projectileSpeed: 500,
    projectileSize: 8,
    projectileLifetime: 1200,
    isHoming: false,
    spreadAngle: 0,
    repeatCount: 1,
  },

  projectile_cone_spread: {
    id: 'projectile_cone_spread',
    name: '부채꼴 발사',
    description: '부채꼴 모양으로 5발 발사',
    effectType: 'projectile',
    color: '#6ee7b7',
    secondaryColor: '#d1fae5',
    particleTexture: 'circle',
    glowIntensity: 0.6,
    projectilePattern: 'cone',
    projectileCount: 5,
    projectileSpeed: 550,
    projectileSize: 7,
    projectileLifetime: 1000,
    isHoming: false,
    spreadAngle: Math.PI / 4,
    repeatCount: 1,
  },

  trail_slash: {
    id: 'trail_slash',
    name: '베기 궤적',
    description: '공격 방향으로 베기 궤적을 남김',
    effectType: 'trail',
    trailType: 'slash',
    color: '#ff9999',
    secondaryColor: '#ffd6a5',
    particleTexture: 'circle',
    glowIntensity: 0.7,
    trailParticleCount: 30,
    trailLength: 1,
    trailWidth: 8,
    trailFadeSpeed: 0.8,
    trailArcAngle: 0.1,
    repeatCount: 1,
  },

  trail_thrust: {
    id: 'trail_thrust',
    name: '찌르기 궤적',
    description: '직선 방향으로 찌르기 궤적',
    effectType: 'trail',
    trailType: 'thrust',
    color: '#a5f3fc',
    secondaryColor: '#e0f2fe',
    particleTexture: 'circle',
    glowIntensity: 0.6,
    trailParticleCount: 20,
    trailLength: 1,
    trailWidth: 5,
    trailFadeSpeed: 1.0,
    repeatCount: 1,
  },

  trail_spin: {
    id: 'trail_spin',
    name: '회전 궤적',
    description: '360도 회전하며 궤적을 남김',
    effectType: 'trail',
    trailType: 'spin',
    color: '#e9d5ff',
    secondaryColor: '#fae8ff',
    particleTexture: 'star',
    glowIntensity: 0.8,
    trailParticleCount: 40,
    trailLength: 1,
    trailWidth: 6,
    trailFadeSpeed: 0.6,
    repeatCount: 1,
  },

  lightning_chain: {
    id: 'lightning_chain',
    name: '연쇄 번개',
    description: '대상과 연결되는 번개',
    effectType: 'lightning',
    color: '#ffeb3b',
    secondaryColor: '#fffde7',
    particleTexture: 'spark',
    glowIntensity: 1.0,
    lightningSegments: 12,
    lightningJitter: 15,
    lightningForkChance: 0.3,
    repeatCount: 1,
  },

  lightning_strike: {
    id: 'lightning_strike',
    name: '낙뢰',
    description: '대상에게 낙뢰가 떨어짐',
    effectType: 'lightning',
    color: '#bae6fd',
    secondaryColor: '#f0f9ff',
    particleTexture: 'spark',
    glowIntensity: 0.9,
    lightningSegments: 15,
    lightningJitter: 20,
    lightningForkChance: 0.5,
    repeatCount: 1,
  },

  ring_single: {
    id: 'ring_single',
    name: '단일 링',
    description: '캐릭터 중심으로 확장되는 링',
    effectType: 'ring',
    color: '#6ee7b7',
    secondaryColor: '#d1fae5',
    particleTexture: 'circle',
    glowIntensity: 0.7,
    ringRadius: 50,
    ringExpansionSpeed: 200,
    ringCount: 1,
    ringInterval: 0,
    repeatCount: 1,
  },

  ring_concentric: {
    id: 'ring_concentric',
    name: '동심원',
    description: '여러 개의 동심원이 확장됨',
    effectType: 'ring',
    color: '#fde047',
    secondaryColor: '#fef9c3',
    particleTexture: 'diamond',
    glowIntensity: 0.8,
    ringRadius: 40,
    ringExpansionSpeed: 150,
    ringCount: 3,
    ringInterval: 200,
    repeatCount: 1,
  },

  ring_explosion: {
    id: 'ring_explosion',
    name: '폭발 링',
    description: '강력한 폭발 링',
    effectType: 'ring',
    color: '#ff9999',
    secondaryColor: '#ffeb99',
    particleTexture: 'star',
    glowIntensity: 0.9,
    ringRadius: 80,
    ringExpansionSpeed: 400,
    ringCount: 1,
    ringInterval: 0,
    repeatCount: 1,
  },

  glow_heal: {
    id: 'glow_heal',
    name: '치유 글로우',
    description: '치유 효과와 상승 파티클',
    effectType: 'glow',
    color: '#86efac',
    secondaryColor: '#d1fae5',
    particleTexture: 'star',
    glowIntensity: 0.8,
    glowRadius: 60,
    glowParticleCount: 20,
    glowRiseSpeed: 80,
    glowFadeSpeed: 0.7,
    repeatCount: 1,
  },

  glow_buff: {
    id: 'glow_buff',
    name: '버프 글로우',
    description: '버프 효과와 상승 파티클',
    effectType: 'glow',
    color: '#fde047',
    secondaryColor: '#fef3c7',
    particleTexture: 'circle',
    glowIntensity: 0.7,
    glowRadius: 50,
    glowParticleCount: 15,
    glowRiseSpeed: 60,
    glowFadeSpeed: 0.8,
    repeatCount: 1,
  },

  glow_power: {
    id: 'glow_power',
    name: '파워 글로우',
    description: '강력한 파워 업 효과',
    effectType: 'glow',
    color: '#d8b4fe',
    secondaryColor: '#f3e8ff',
    particleTexture: 'spark',
    glowIntensity: 0.9,
    glowRadius: 70,
    glowParticleCount: 30,
    glowRiseSpeed: 100,
    glowFadeSpeed: 0.6,
    repeatCount: 1,
  },
} satisfies Record<string, EffectPreset>;

export const DEFAULT_EFFECT_PRESETS: Record<string, EffectPresetWithLegacy> = Object.keys(
  RAW_EFFECT_PRESETS
).reduce<Record<string, EffectPresetWithLegacy>>((accumulator, key) => {
  accumulator[key] = withLegacyVisualFields(RAW_EFFECT_PRESETS[key]);
  return accumulator;
}, {});

export const EFFECT_PRESETS = DEFAULT_EFFECT_PRESETS;

export const DETAILED_EFFECT_PRESETS: Record<string, unknown> = {
  projectile_arrow: {
    name: '화살 (직선)',
    category: 'projectile',
    animationPattern: 'linear',
    shape: 'line',
    color: '#ffd43b',
    secondaryColor: '#ffffff',
    particleCount: 25,
    particleSize: 4,
    particleLifetime: 200,
    glowIntensity: 1.0,
    projectileType: 'lightning',
    projectileSpeed: 900,
    effectPlaybackSpeed: 1.5,
    particlePlaybackSpeed: 2.0,
    trailEnabled: true,
    trailLength: 25,
    trailWidth: 2,
    description: '초고속으로 날아가는 번개 (전격 궤적 포함)',
  },

  projectile_energy_homing: {
    name: '에너지 볼트 (유도)',
    category: 'projectile',
    animationPattern: 'homing',
    shape: 'circle',
    color: '#a78bfa',
    secondaryColor: '#c4b5fd',
    particleCount: 18,
    particleSize: 5,
    particleLifetime: 800,
    glowIntensity: 0.8,
    projectileType: 'energy',
    projectileSpeed: 450,
    effectPlaybackSpeed: 1.0,
    particlePlaybackSpeed: 1.2,
    trailEnabled: true,
    trailLength: 30,
    trailWidth: 2.5,
    description: '대상을 추적하는 에너지 볼트 (추적 궤적 포함)',
  },

  projectile_ice_homing: {
    name: '얼음 파편 (유도)',
    category: 'projectile',
    animationPattern: 'homing',
    shape: 'star',
    color: '#4dabf7',
    secondaryColor: '#a0d8f1',
    particleCount: 15,
    particleSize: 4,
    particleLifetime: 700,
    glowIntensity: 0.7,
    projectileType: 'ice',
    projectileSpeed: 500,
    effectPlaybackSpeed: 1.0,
    particlePlaybackSpeed: 0.8,
    trailEnabled: true,
    trailLength: 25,
    trailWidth: 2,
    description: '대상을 추적하는 얼음 파편 (얼음 궤적 포함)',
  },

  projectile_wave_curve: {
    name: '파동 (곡선)',
    category: 'projectile',
    animationPattern: 'curve',
    shape: 'wave',
    color: '#60a5fa',
    secondaryColor: '#93c5fd',
    particleCount: 22,
    particleSize: 5,
    particleLifetime: 600,
    glowIntensity: 0.6,
    projectileType: 'wave',
    projectileSpeed: 400,
    effectPlaybackSpeed: 1.0,
    particlePlaybackSpeed: 1.5,
    trailEnabled: true,
    trailLength: 35,
    trailWidth: 3,
    description: '파도처럼 곡선으로 날아가는 발사체 (파동 궤적 포함)',
  },

  projectile_wind_curve: {
    name: '바람 칼날 (곡선)',
    category: 'projectile',
    animationPattern: 'curve',
    shape: 'wave',
    color: '#34d399',
    secondaryColor: '#6ee7b7',
    particleCount: 16,
    particleSize: 4,
    particleLifetime: 550,
    glowIntensity: 0.5,
    projectileType: 'wind',
    projectileSpeed: 550,
    effectPlaybackSpeed: 1.2,
    particlePlaybackSpeed: 1.3,
    description: '바람처럼 곡선으로 날아가는 칼날',
  },

  area_healing_circle: {
    name: '치유 영역 (동심원)',
    category: 'area',
    animationPattern: 'radial',
    shape: 'ring',
    color: '#34d399',
    secondaryColor: '#86efac',
    particleCount: 25,
    particleSize: 5,
    particleLifetime: 1200,
    glowIntensity: 0.7,
    projectileType: 'none',
    projectileSpeed: 0,
    effectPlaybackSpeed: 0.8,
    particlePlaybackSpeed: 0.6,
    description: '동심원으로 퍼지는 치유 영역',
  },

  area_buff_circle: {
    name: '버프 영역 (동심원)',
    category: 'area',
    animationPattern: 'radial',
    shape: 'ring',
    color: '#fbbf24',
    secondaryColor: '#fcd34d',
    particleCount: 30,
    particleSize: 4,
    particleLifetime: 1000,
    glowIntensity: 0.8,
    projectileType: 'none',
    projectileSpeed: 0,
    effectPlaybackSpeed: 1.0,
    particlePlaybackSpeed: 0.8,
    description: '동심원으로 퍼지는 버프 영역',
  },

  area_explosion: {
    name: '폭발 영역',
    category: 'area',
    animationPattern: 'radial',
    shape: 'circle',
    color: '#ff6b6b',
    secondaryColor: '#ffd93d',
    particleCount: 40,
    particleSize: 6,
    particleLifetime: 500,
    glowIntensity: 0.9,
    projectileType: 'none',
    projectileSpeed: 0,
    effectPlaybackSpeed: 1.5,
    particlePlaybackSpeed: 2.0,
    description: '폭발적으로 퍼지는 영역 공격',
  },

  area_shield_dome: {
    name: '방어 영역 (돔)',
    category: 'area',
    animationPattern: 'static',
    shape: 'dome',
    color: '#60a5fa',
    secondaryColor: '#93c5fd',
    particleCount: 35,
    particleSize: 4,
    particleLifetime: 1500,
    glowIntensity: 0.6,
    projectileType: 'none',
    projectileSpeed: 0,
    effectPlaybackSpeed: 0.5,
    particlePlaybackSpeed: 0.7,
    description: '돔 형태의 보호 영역',
  },

  target_heal_rising: {
    name: '치유 (상승)',
    category: 'target',
    animationPattern: 'upward',
    shape: 'star',
    color: '#4ade80',
    secondaryColor: '#a7f3d0',
    particleCount: 20,
    particleSize: 5,
    particleLifetime: 800,
    glowIntensity: 0.8,
    projectileType: 'none',
    projectileSpeed: 0,
    effectPlaybackSpeed: 1.0,
    particlePlaybackSpeed: 0.8,
    description: '아래에서 위로 올라가는 치유 효과',
  },

  target_buff_rising: {
    name: '버프 (상승)',
    category: 'target',
    animationPattern: 'upward',
    shape: 'circle',
    color: '#fbbf24',
    secondaryColor: '#fde68a',
    particleCount: 15,
    particleSize: 4,
    particleLifetime: 700,
    glowIntensity: 0.7,
    projectileType: 'none',
    projectileSpeed: 0,
    effectPlaybackSpeed: 1.0,
    particlePlaybackSpeed: 1.0,
    description: '아래에서 위로 올라가는 버프 효과',
  },

  target_damage_hit: {
    name: '피격 (충격)',
    category: 'target',
    animationPattern: 'radial',
    shape: 'star',
    color: '#ef4444',
    secondaryColor: '#fca5a5',
    particleCount: 12,
    particleSize: 5,
    particleLifetime: 300,
    glowIntensity: 0.8,
    projectileType: 'none',
    projectileSpeed: 0,
    effectPlaybackSpeed: 1.5,
    particlePlaybackSpeed: 1.8,
    description: '대상에 충격이 가해지는 효과',
  },

  target_debuff_rising: {
    name: '디버프 (상승)',
    category: 'target',
    animationPattern: 'upward',
    shape: 'circle',
    color: '#a855f7',
    secondaryColor: '#d8b4fe',
    particleCount: 18,
    particleSize: 4,
    particleLifetime: 900,
    glowIntensity: 0.6,
    projectileType: 'none',
    projectileSpeed: 0,
    effectPlaybackSpeed: 0.8,
    particlePlaybackSpeed: 0.9,
    description: '아래에서 위로 올라가는 디버프 효과',
  },
};
