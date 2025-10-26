/**
 * 스킬 시스템
 * - 스킬 정의 및 관리
 * - 쿨타임 관리
 * - 스킬 효과 적용
 */

export type SkillType =
  | 'melee'
  | 'ranged'
  | 'damage'
  | 'heal'
  | 'buff'
  | 'debuff'
  | 'area'
  | 'defense';

// 스킬 카테고리 (슬롯 타입 구분)
export type SkillCategory = 'basicAttack' | 'skill';

// ===== 새로운 5가지 이펙트 타입 시스템 =====
export type EffectType =
  | 'projectile' // 투사체 발사 (방향/방사형)
  | 'trail' // 궤적 (공격 방향 기준)
  | 'lightning' // 번개 (대상 연결)
  | 'ring' // 링/동심원
  | 'glow'; // 글로우 (상승 파티클)

// 투사체 발사 패턴
export type ProjectilePattern =
  | 'directional' // 방향성 발사 (타겟 방향)
  | 'radial' // 방사형 발사 (사방으로)
  | 'cone'; // 부채꼴 발사

// 파티클 텍스쳐 타입
export type ParticleTexture =
  | 'circle' // 원형
  | 'star' // 별 모양
  | 'square' // 사각형
  | 'diamond' // 다이아몬드
  | 'spark'; // 스파크

// ===== 새로운 이펙트 프리셋 시스템 =====
export interface EffectPreset {
  id: string;
  name: string;
  description: string;
  effectType: EffectType;

  // 공통 설정
  color: string;
  secondaryColor: string;
  particleTexture: ParticleTexture;
  glowIntensity: number; // 0-1

  // 투사체 이펙트 전용
  projectilePattern?: ProjectilePattern;
  projectileCount?: number; // 발사할 투사체 개수
  projectileSpeed?: number; // 투사체 속도 (px/s)
  projectileSize?: number; // 투사체 크기
  projectileLifetime?: number; // 투사체 수명 (ms)
  isHoming?: boolean; // 유도 처리 여부
  spreadAngle?: number; // 확산 각도 (라디안)

  // 궤적 이펙트 전용
  trailType?: 'slash' | 'thrust' | 'spin'; // 궤적 타입
  trailParticleCount?: number; // 궤적 파티클 수
  trailLength?: number; // 궤적 길이 (픽셀)
  trailWidth?: number; // 궤적 두께
  trailFadeSpeed?: number; // 페이드 속도
  trailArcAngle?: number; // 호의 각도 (라디안, slash용)

  // 번개 이펙트 전용
  lightningSegments?: number; // 번개 세그먼트 수
  lightningJitter?: number; // 번개 지터 정도
  lightningForkChance?: number; // 번개 갈라짐 확률

  // 링 이펙트 전용
  ringRadius?: number; // 링 반지름 (픽셀)
  ringExpansionSpeed?: number; // 확장 속도
  ringCount?: number; // 동심원 개수
  ringInterval?: number; // 동심원 간격 (ms)

  // 글로우 이펙트 전용
  glowRadius?: number; // 글로우 반지름
  glowParticleCount?: number; // 상승 파티클 개수
  glowRiseSpeed?: number; // 상승 속도
  glowFadeSpeed?: number; // 페이드 속도

  // 재생 설정
  repeatCount?: number; // 반복 횟수 (1 = 1회만)
  repeatInterval?: number; // 반복 간격 (ms)
}

// ===== 새로운 이펙트 프리셋 라이브러리 =====
export const EFFECT_PRESETS: Record<string, EffectPreset> = {
  // ===== 투사체 발사 이펙트 =====
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
    spreadAngle: Math.PI / 4, // 45도
    repeatCount: 1,
  },

  // ===== 궤적 이펙트 =====
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
    trailLength: 1, // 스킬의 range를 사용하도록 fallback 값을 최소화
    trailWidth: 8,
    trailFadeSpeed: 0.8,
    trailArcAngle: 0.1, // 스킬의 area를 사용하도록 fallback 값을 최소화
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
    trailLength: 1, // 스킬의 range를 사용하도록 fallback 값을 최소화
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
    trailLength: 1, // 스킬의 range를 사용하도록 fallback 값을 최소화
    trailWidth: 6,
    trailFadeSpeed: 0.6,
    repeatCount: 1,
  },

  // ===== 번개 이펙트 =====
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

  // ===== 링 이펙트 =====
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

  // ===== 글로우 이펙트 =====
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
};

// 하위 호환성을 위한 레거시 프리셋 (기존 시스템 지원)
export const DETAILED_EFFECT_PRESETS: Record<string, any> = {
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

  // 유도형 발사체
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

  // 곡선형 발사체
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

  // ===== 영역 이펙트 (Area Effects) =====

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

  // ===== 대상 이펙트 (Target Effects) - 단일 대상 =====

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

// 이펙트 카테고리 정의
export const EFFECT_CATEGORY_INFO: Record<
  EffectCategory,
  {
    label: string;
    description: string;
    animationPatterns: AnimationPattern[];
    icon: string;
  }
> = {
  trail: {
    label: '궤적 이펙트',
    description: '근접 공격의 움직임 궤적을 표현',
    animationPatterns: ['arc', 'linear', 'radial', 'static'],
    icon: '⚔️',
  },
  projectile: {
    label: '발사체 이펙트',
    description: '날아가는 투사체를 구성',
    animationPatterns: ['linear', 'homing', 'curve'],
    icon: '🏹',
  },
  area: {
    label: '영역 이펙트',
    description: '특정 영역을 시각적으로 표현',
    animationPatterns: ['radial', 'static'],
    icon: '🎯',
  },
  target: {
    label: '대상 이펙트',
    description: '단일 대상에 적용되는 효과',
    animationPatterns: ['upward', 'radial'],
    icon: '✨',
  },
};

// 애니메이션 패턴 설명
export const ANIMATION_PATTERN_INFO: Record<AnimationPattern, string> = {
  linear: '직선으로 이동',
  homing: '대상을 추적',
  curve: '곡선으로 이동',
  arc: '호를 그리며 이동',
  upward: '아래에서 위로 상승',
  radial: '중심에서 사방으로 확산',
  static: '고정된 위치',
};

export interface SkillEffectConfig {
  shapes: EffectShape[];
  colors: { primary: string; secondary: string }[];
  speeds: { min: number; max: number };
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  type: SkillType;
  category: SkillCategory; // 기본 공격 or 일반 스킬
  tags: string[]; // 태그 배열 (예: ['basicAttack'], ['skill'], ['fire', 'aoe'])
  iconName: string; // lucide-react 아이콘 이름 (예: 'Swords', 'Heart', 'Zap')

  // 스킬 파라미터 (데이터셋에서 조정 가능)
  spCost: number; // SP 소모량
  cooldown: number; // 쿨타임 (ms)
  castTime: number; // 시전 시간 (ms) - 하위 호환성 유지 (windup + execution + recovery)
  range: number; // 사거리
  area: number; // 범위 (각도 또는 반경)

  // 스킬 타이밍 구조 (선딜-공격-후딜)
  timing: {
    windup: number; // 선 딜레이 (준비 모션, ms)
    execution: number; // 공격 모션 (실제 공격 판정, ms)
    recovery: number; // 후 딜레이 (경직, ms)
  };

  // 스킬 효과
  damageMultiplier: number; // 데미지 배율 (1.0 = 100%)
  damageFormula?: {
    // 능력치 기반 데미지 계산식
    stat: 'attack' | 'defense' | 'magic' | 'speed';
    operator: '+' | '*';
    value: number;
  };
  healAmount: number; // 회복량
  buffDuration: number; // 버프 지속시간 (ms)
  buffEffect: {
    attack?: number; // 공격력 증가
    defense?: number; // 방어력 증가
    speed?: number; // 속도 증가
  };

  // 시각 효과 설정 (스킬 시스템 설정에서만 조정)
  visual: {
    effectPresetId?: string; // 이펙트 프리셋 ID (새 시스템)
    color: string; // 주 색상
    secondaryColor: string; // 보조 색상
    particleCount: number; // 파티클 수
    particleSize: number; // 파티클 크기 (px)
    particleLifetime: number; // 파티클 수명 (ms)
    glowIntensity: number; // 발광 강도 (0-1)
    effectShape: EffectShape; // 이펙트 모양
  };

  // 투사체 설정 (스킬 시스템 설정에서만 조정)
  projectile: {
    type: ProjectileType; // 투사체 타입
    speed: number; // 투사체 속도 (px/s)
    size: number; // 투사체 크기 (px)
    piercing: boolean; // 관통 여부
    homing: boolean; // 유도 여부
    trail: boolean; // 궤적 표시 여부
    trailLength: number; // 궤적 길이
  };

  // 애니메이션 설정 (스킬 시스템 설정에서만 조정)
  animation: {
    castAnimation: string; // 시전 애니메이션 ('charge' | 'spin' | 'glow' | 'pulse')
    castScale: number; // 시전 시 크기 변화 (1.0 = 원본)
    impactAnimation: string; // 적중 애니메이션 ('explosion' | 'ripple' | 'flash' | 'scatter')
    impactDuration: number; // 적중 이펙트 지속 시간 (ms)
    cameraShake: number; // 화면 흔들림 강도 (0-10)
  };

  // 사운드 설정 (스킬 시스템 설정에서만 조정)
  sound: {
    castSound: string; // 시전 사운드
    impactSound: string; // 적중 사운드
    volume: number; // 볼륨 (0-1)
  };

  // 상태 (런타임)
  currentCooldown: number; // 현재 쿨타임 (ms)
  isOnCooldown: boolean;
}

export interface SkillSlot {
  slotNumber: 1 | 2 | 3 | 4;
  skill: Skill | null;
  keyBinding: string; // '1', '2', '3', '4'
}

/**
 * 기본 공격 슬롯 (마우스 클릭으로 실행)
 */
export interface BasicAttackSlot {
  skill: Skill;
  keyBinding: 'click'; // 마우스 클릭
}

/**
 * 기본 공격 스킬 정의
 */
export const defaultBasicAttacks: Record<string, Skill> = {
  meleeBasic: {
    id: 'meleeBasic',
    name: '근접 공격',
    description: '가까운 적을 타격합니다 (공격력 × 1.0)',
    type: 'melee',
    category: 'basicAttack',
    tags: ['basicAttack', 'melee'],
    iconName: 'Sword',
    spCost: 0,
    cooldown: 0,
    castTime: 0,
    range: 75,
    area: 90,
    timing: { windup: 0, execution: 100, recovery: 0 },
    damageMultiplier: 1.0,
    damageFormula: {
      stat: 'attack',
      operator: '*',
      value: 1.0,
    },
    healAmount: 0,
    buffDuration: 0,
    buffEffect: {},
    visual: {
      effectPresetId: 'trail_slash',
      color: '#ff6b6b',
      secondaryColor: '#ff8c42',
      particleCount: 15,
      particleSize: 6,
      particleLifetime: 400,
      glowIntensity: 0.6,
      effectShape: 'cone',
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
      castScale: 1.15,
      impactAnimation: 'flash',
      impactDuration: 300,
      cameraShake: 3,
    },
    sound: {
      castSound: 'swing',
      impactSound: 'hit',
      volume: 0.6,
    },
    currentCooldown: 0,
    isOnCooldown: false,
  },
  rangedBasic: {
    id: 'rangedBasic',
    name: '원거리 공격',
    description: '에너지 파티클을 발사합니다 (공격력 × 1.0)',
    type: 'ranged',
    category: 'basicAttack',
    tags: ['basicAttack', 'ranged'],
    iconName: 'Target',
    spCost: 0,
    cooldown: 0,
    castTime: 0,
    range: 150,
    area: 30,
    timing: { windup: 0, execution: 100, recovery: 0 },
    damageMultiplier: 1.0,
    damageFormula: {
      stat: 'attack',
      operator: '*',
      value: 1.0,
    },
    healAmount: 0,
    buffDuration: 0,
    buffEffect: {},
    visual: {
      effectPresetId: 'projectile_arrow_single',
      color: '#60a5fa',
      secondaryColor: '#93c5fd',
      particleCount: 20,
      particleSize: 4,
      particleLifetime: 600,
      glowIntensity: 0.7,
      effectShape: 'line',
    },
    projectile: {
      type: 'energy',
      speed: 400,
      size: 6,
      piercing: false,
      homing: false,
      trail: true,
      trailLength: 30,
    },
    animation: {
      castAnimation: 'charge',
      castScale: 1.0,
      impactAnimation: 'flash',
      impactDuration: 150,
      cameraShake: 1,
    },
    sound: {
      castSound: 'shoot',
      impactSound: 'hit',
      volume: 0.5,
    },
    currentCooldown: 0,
    isOnCooldown: false,
  },
};

/**
 * 기본 스킬 정의 (기본 공격 포함)
 */
export const defaultSkills: Record<string, Skill> = {
  // 기본 공격들을 먼저 포함
  ...defaultBasicAttacks,

  // 일반 스킬들
  powerSlash: {
    id: 'powerSlash',
    name: '강타',
    description: '강력한 일격을 가합니다 (공격력 × 1.5)',
    type: 'damage',
    category: 'skill',
    tags: ['skill', 'melee', 'damage'],
    iconName: 'Swords',
    spCost: 20,
    cooldown: 3000,
    castTime: 500,
    range: 100,
    area: 120,
    timing: { windup: 150, execution: 200, recovery: 150 },
    damageMultiplier: 1.5,
    damageFormula: {
      stat: 'attack',
      operator: '*',
      value: 1.5,
    },
    healAmount: 0,
    buffDuration: 0,
    buffEffect: {},
    visual: {
      ...EFFECT_PRESETS.trail_slash,
      color: '#ff4444',
      secondaryColor: '#ff8888',
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
      castScale: 1.2,
      impactAnimation: 'flash',
      impactDuration: 300,
      cameraShake: 5,
    },
    sound: {
      castSound: 'swing',
      impactSound: 'hit',
      volume: 0.7,
    },
    currentCooldown: 0,
    isOnCooldown: false,
  },

  whirlwind: {
    id: 'whirlwind',
    name: '회오리 베기',
    description: '주변 모든 적을 공격합니다 (공격력 × 0.8)',
    type: 'area',
    category: 'skill',
    tags: ['skill', 'area', 'damage'],
    iconName: 'Wind',
    spCost: 30,
    cooldown: 5000,
    castTime: 800,
    range: 150,
    area: 360,
    timing: { windup: 240, execution: 320, recovery: 240 },
    damageMultiplier: 0.8,
    damageFormula: {
      stat: 'attack',
      operator: '*',
      value: 0.8,
    },
    healAmount: 0,
    buffDuration: 0,
    buffEffect: {},
    visual: {
      ...EFFECT_PRESETS.trail_spin,
      color: '#44aaff',
      secondaryColor: '#88ccff',
    },
    projectile: {
      type: 'wave',
      speed: 300,
      size: 20,
      piercing: true,
      homing: false,
      trail: true,
      trailLength: 50,
    },
    animation: {
      castAnimation: 'spin',
      castScale: 1.5,
      impactAnimation: 'ripple',
      impactDuration: 500,
      cameraShake: 7,
    },
    sound: {
      castSound: 'whoosh',
      impactSound: 'slash',
      volume: 0.8,
    },
    currentCooldown: 0,
    isOnCooldown: false,
  },

  heal: {
    id: 'heal',
    name: '치유',
    description: 'HP를 50 회복합니다',
    type: 'heal',
    category: 'skill',
    tags: ['skill', 'heal'],
    iconName: 'Heart',
    spCost: 25,
    cooldown: 8000,
    castTime: 1000,
    range: 0,
    area: 0,
    timing: { windup: 300, execution: 400, recovery: 300 },
    damageMultiplier: 0,
    healAmount: 50,
    buffDuration: 0,
    buffEffect: {},
    visual: {
      ...EFFECT_PRESETS.glow_heal,
      color: '#44ff44',
      secondaryColor: '#88ff88',
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
      castAnimation: 'glow',
      castScale: 1.1,
      impactAnimation: 'scatter',
      impactDuration: 800,
      cameraShake: 0,
    },
    sound: {
      castSound: 'chime',
      impactSound: 'heal',
      volume: 0.6,
    },
    currentCooldown: 0,
    isOnCooldown: false,
  },

  powerBuff: {
    id: 'powerBuff',
    name: '전투 강화',
    description: '10초간 공격력 +30%, 방어력 +20%',
    type: 'buff',
    category: 'skill',
    tags: ['skill', 'buff'],
    iconName: 'Zap',
    spCost: 40,
    cooldown: 15000,
    castTime: 500,
    range: 0,
    area: 0,
    timing: { windup: 150, execution: 200, recovery: 150 },
    damageMultiplier: 0,
    healAmount: 0,
    buffDuration: 10000,
    buffEffect: {
      attack: 30,
      defense: 20,
    },
    visual: {
      ...EFFECT_PRESETS.glow_buff,
      color: '#ffaa44',
      secondaryColor: '#ffcc88',
    },
    projectile: {
      type: 'lightning',
      speed: 800,
      size: 15,
      piercing: false,
      homing: false,
      trail: true,
      trailLength: 30,
    },
    animation: {
      castAnimation: 'pulse',
      castScale: 1.3,
      impactAnimation: 'explosion',
      impactDuration: 400,
      cameraShake: 3,
    },
    sound: {
      castSound: 'power',
      impactSound: 'buff',
      volume: 0.75,
    },
    currentCooldown: 0,
    isOnCooldown: false,
  },

  // ===== 새로운 5가지 이펙트 타입 스킬들 =====

  // 투사체 스킬 (6개)
  arrowSingle: {
    id: 'arrowSingle',
    name: '단일 화살',
    description: '단일 화살을 발사합니다',
    type: 'damage',
    category: 'skill',
    tags: ['skill', 'ranged', 'projectile'],
    iconName: 'ArrowRight',
    spCost: 10,
    cooldown: 1000,
    castTime: 300,
    range: 500,
    area: 0,
    timing: { windup: 90, execution: 120, recovery: 90 },
    damageMultiplier: 1.0,
    healAmount: 0,
    buffDuration: 0,
    buffEffect: {},
    visual: EFFECT_PRESETS.projectile_arrow_single,
    projectile: {
      type: 'arrow',
      speed: 400,
      size: 8,
      piercing: false,
      homing: false,
      trail: false,
      trailLength: 0,
    },
    animation: {
      castAnimation: 'shoot',
      castScale: 1.0,
      impactAnimation: 'hit',
      impactDuration: 200,
      cameraShake: 2,
    },
    sound: { castSound: 'arrow', impactSound: 'hit', volume: 0.6 },
    currentCooldown: 0,
    isOnCooldown: false,
  },

  arrowMulti: {
    id: 'arrowMulti',
    name: '다중 화살',
    description: '3발의 화살을 부채꼴로 발사합니다',
    type: 'damage',
    category: 'skill',
    tags: ['skill', 'ranged', 'projectile'],
    iconName: 'ArrowUpRight',
    spCost: 15,
    cooldown: 2000,
    castTime: 400,
    range: 500,
    area: 0,
    timing: { windup: 120, execution: 160, recovery: 120 },
    damageMultiplier: 0.8,
    healAmount: 0,
    buffDuration: 0,
    buffEffect: {},
    visual: EFFECT_PRESETS.projectile_arrow_multi,
    projectile: {
      type: 'arrow',
      speed: 400,
      size: 8,
      piercing: false,
      homing: false,
      trail: false,
      trailLength: 0,
    },
    animation: {
      castAnimation: 'shoot',
      castScale: 1.1,
      impactAnimation: 'hit',
      impactDuration: 200,
      cameraShake: 3,
    },
    sound: { castSound: 'arrow', impactSound: 'hit', volume: 0.7 },
    currentCooldown: 0,
    isOnCooldown: false,
  },

  fireball: {
    id: 'fireball',
    name: '파이어볼',
    description: '강력한 화염구를 발사합니다',
    type: 'damage',
    category: 'skill',
    tags: ['skill', 'ranged', 'projectile', 'fire'],
    iconName: 'Flame',
    spCost: 25,
    cooldown: 3000,
    castTime: 600,
    range: 600,
    area: 0,
    timing: { windup: 180, execution: 240, recovery: 180 },
    damageMultiplier: 1.8,
    healAmount: 0,
    buffDuration: 0,
    buffEffect: {},
    visual: EFFECT_PRESETS.projectile_fireball,
    projectile: {
      type: 'fireball',
      speed: 300,
      size: 12,
      piercing: false,
      homing: false,
      trail: true,
      trailLength: 20,
    },
    animation: {
      castAnimation: 'charge',
      castScale: 1.3,
      impactAnimation: 'explosion',
      impactDuration: 400,
      cameraShake: 6,
    },
    sound: { castSound: 'fire', impactSound: 'explosion', volume: 0.8 },
    currentCooldown: 0,
    isOnCooldown: false,
  },

  fireballHoming: {
    id: 'fireballHoming',
    name: '유도 파이어볼',
    description: '적을 추적하는 화염구를 발사합니다',
    type: 'damage',
    category: 'skill',
    tags: ['skill', 'ranged', 'projectile', 'fire', 'homing'],
    iconName: 'Target',
    spCost: 30,
    cooldown: 4000,
    castTime: 700,
    range: 700,
    area: 0,
    timing: { windup: 210, execution: 280, recovery: 210 },
    damageMultiplier: 1.5,
    healAmount: 0,
    buffDuration: 0,
    buffEffect: {},
    visual: EFFECT_PRESETS.projectile_fireball_homing,
    projectile: {
      type: 'fireball',
      speed: 250,
      size: 12,
      piercing: false,
      homing: true,
      trail: true,
      trailLength: 20,
    },
    animation: {
      castAnimation: 'charge',
      castScale: 1.3,
      impactAnimation: 'explosion',
      impactDuration: 400,
      cameraShake: 5,
    },
    sound: { castSound: 'fire', impactSound: 'explosion', volume: 0.8 },
    currentCooldown: 0,
    isOnCooldown: false,
  },

  radialBurst: {
    id: 'radialBurst',
    name: '방사형 폭발',
    description: '전방향으로 투사체를 발사합니다',
    type: 'damage',
    category: 'skill',
    tags: ['skill', 'ranged', 'projectile', 'area'],
    iconName: 'Sparkles',
    spCost: 40,
    cooldown: 6000,
    castTime: 800,
    range: 400,
    area: 360,
    timing: { windup: 240, execution: 320, recovery: 240 },
    damageMultiplier: 0.6,
    healAmount: 0,
    buffDuration: 0,
    buffEffect: {},
    visual: EFFECT_PRESETS.projectile_radial_burst,
    projectile: {
      type: 'energy',
      speed: 350,
      size: 10,
      piercing: false,
      homing: false,
      trail: false,
      trailLength: 0,
    },
    animation: {
      castAnimation: 'charge',
      castScale: 1.4,
      impactAnimation: 'burst',
      impactDuration: 300,
      cameraShake: 7,
    },
    sound: { castSound: 'energy', impactSound: 'hit', volume: 0.9 },
    currentCooldown: 0,
    isOnCooldown: false,
  },

  coneSpread: {
    id: 'coneSpread',
    name: '부채꼴 발사',
    description: '부채꼴 형태로 5발의 투사체를 발사합니다',
    type: 'damage',
    category: 'skill',
    tags: ['skill', 'ranged', 'projectile'],
    iconName: 'Fan',
    spCost: 20,
    cooldown: 2500,
    castTime: 500,
    range: 450,
    area: 60,
    timing: { windup: 150, execution: 200, recovery: 150 },
    damageMultiplier: 0.7,
    healAmount: 0,
    buffDuration: 0,
    buffEffect: {},
    visual: EFFECT_PRESETS.projectile_cone_spread,
    projectile: {
      type: 'energy',
      speed: 400,
      size: 8,
      piercing: false,
      homing: false,
      trail: false,
      trailLength: 0,
    },
    animation: {
      castAnimation: 'shoot',
      castScale: 1.2,
      impactAnimation: 'hit',
      impactDuration: 200,
      cameraShake: 4,
    },
    sound: { castSound: 'energy', impactSound: 'hit', volume: 0.7 },
    currentCooldown: 0,
    isOnCooldown: false,
  },

  // 궤적 스킬 (3개)
  slashTrail: {
    id: 'slashTrail',
    name: '베기 궤적',
    description: '빠른 베기로 궤적을 남깁니다',
    type: 'damage',
    category: 'skill',
    tags: ['skill', 'melee', 'trail'],
    iconName: 'Slash',
    spCost: 15,
    cooldown: 1500,
    castTime: 300,
    range: 120,
    area: 90,
    timing: { windup: 90, execution: 120, recovery: 90 },
    damageMultiplier: 1.2,
    healAmount: 0,
    buffDuration: 0,
    buffEffect: {},
    visual: EFFECT_PRESETS.trail_slash,
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
      castAnimation: 'slash',
      castScale: 1.1,
      impactAnimation: 'cut',
      impactDuration: 200,
      cameraShake: 3,
    },
    sound: { castSound: 'swing', impactSound: 'slash', volume: 0.6 },
    currentCooldown: 0,
    isOnCooldown: false,
  },

  thrustTrail: {
    id: 'thrustTrail',
    name: '찌르기 궤적',
    description: '직선 찌르기로 긴 궤적을 남깁니다',
    type: 'damage',
    category: 'skill',
    tags: ['skill', 'melee', 'trail'],
    iconName: 'ArrowUp',
    spCost: 12,
    cooldown: 1200,
    castTime: 250,
    range: 150,
    area: 30,
    timing: { windup: 75, execution: 100, recovery: 75 },
    damageMultiplier: 1.1,
    healAmount: 0,
    buffDuration: 0,
    buffEffect: {},
    visual: EFFECT_PRESETS.trail_thrust,
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
      castAnimation: 'thrust',
      castScale: 1.0,
      impactAnimation: 'pierce',
      impactDuration: 150,
      cameraShake: 2,
    },
    sound: { castSound: 'swing', impactSound: 'pierce', volume: 0.5 },
    currentCooldown: 0,
    isOnCooldown: false,
  },

  spinTrail: {
    id: 'spinTrail',
    name: '회전 베기',
    description: '360도 회전하며 주변을 공격합니다',
    type: 'area',
    category: 'skill',
    tags: ['skill', 'melee', 'trail', 'area'],
    iconName: 'RotateCw',
    spCost: 25,
    cooldown: 4000,
    castTime: 600,
    range: 130,
    area: 360,
    timing: { windup: 180, execution: 240, recovery: 180 },
    damageMultiplier: 0.9,
    healAmount: 0,
    buffDuration: 0,
    buffEffect: {},
    visual: EFFECT_PRESETS.trail_spin,
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
      castAnimation: 'spin',
      castScale: 1.3,
      impactAnimation: 'whirl',
      impactDuration: 400,
      cameraShake: 5,
    },
    sound: { castSound: 'whoosh', impactSound: 'slash', volume: 0.8 },
    currentCooldown: 0,
    isOnCooldown: false,
  },

  // 번개 스킬 (2개)
  lightningChain: {
    id: 'lightningChain',
    name: '연쇄 번개',
    description: '대상에게 번개를 연결하여 지속 피해를 줍니다',
    type: 'damage',
    category: 'skill',
    tags: ['skill', 'ranged', 'lightning', 'dot'],
    iconName: 'Zap',
    spCost: 30,
    cooldown: 5000,
    castTime: 400,
    range: 400,
    area: 0,
    timing: { windup: 120, execution: 160, recovery: 120 },
    damageMultiplier: 1.4,
    healAmount: 0,
    buffDuration: 0,
    buffEffect: {},
    visual: EFFECT_PRESETS.lightning_chain,
    projectile: {
      type: 'lightning',
      speed: 0,
      size: 0,
      piercing: false,
      homing: false,
      trail: false,
      trailLength: 0,
    },
    animation: {
      castAnimation: 'charge',
      castScale: 1.2,
      impactAnimation: 'spark',
      impactDuration: 300,
      cameraShake: 4,
    },
    sound: { castSound: 'thunder', impactSound: 'zap', volume: 0.7 },
    currentCooldown: 0,
    isOnCooldown: false,
  },

  lightningStrike: {
    id: 'lightningStrike',
    name: '낙뢰',
    description: '대상에게 강력한 번개를 떨어뜨립니다',
    type: 'damage',
    category: 'skill',
    tags: ['skill', 'ranged', 'lightning'],
    iconName: 'CloudLightning',
    spCost: 35,
    cooldown: 6000,
    castTime: 800,
    range: 500,
    area: 0,
    timing: { windup: 240, execution: 320, recovery: 240 },
    damageMultiplier: 2.2,
    healAmount: 0,
    buffDuration: 0,
    buffEffect: {},
    visual: EFFECT_PRESETS.lightning_strike,
    projectile: {
      type: 'lightning',
      speed: 0,
      size: 0,
      piercing: false,
      homing: false,
      trail: false,
      trailLength: 0,
    },
    animation: {
      castAnimation: 'charge',
      castScale: 1.4,
      impactAnimation: 'explosion',
      impactDuration: 500,
      cameraShake: 8,
    },
    sound: { castSound: 'thunder', impactSound: 'explosion', volume: 0.9 },
    currentCooldown: 0,
    isOnCooldown: false,
  },

  // 링 스킬 (3개)
  ringSingle: {
    id: 'ringSingle',
    name: '충격파',
    description: '캐릭터 중심으로 충격파를 발생시킵니다',
    type: 'area',
    category: 'skill',
    tags: ['skill', 'area', 'ring'],
    iconName: 'Circle',
    spCost: 20,
    cooldown: 3000,
    castTime: 300,
    range: 200,
    area: 360,
    timing: { windup: 90, execution: 120, recovery: 90 },
    damageMultiplier: 1.0,
    healAmount: 0,
    buffDuration: 0,
    buffEffect: {},
    visual: EFFECT_PRESETS.ring_single,
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
      castAnimation: 'stomp',
      castScale: 1.2,
      impactAnimation: 'shockwave',
      impactDuration: 400,
      cameraShake: 5,
    },
    sound: { castSound: 'impact', impactSound: 'boom', volume: 0.7 },
    currentCooldown: 0,
    isOnCooldown: false,
  },

  ringConcentric: {
    id: 'ringConcentric',
    name: '동심원 충격',
    description: '3개의 동심원 충격파를 연속으로 발생시킵니다',
    type: 'area',
    category: 'skill',
    tags: ['skill', 'area', 'ring'],
    iconName: 'CircleDot',
    spCost: 35,
    cooldown: 5000,
    castTime: 600,
    range: 250,
    area: 360,
    timing: { windup: 180, execution: 240, recovery: 180 },
    damageMultiplier: 0.7,
    healAmount: 0,
    buffDuration: 0,
    buffEffect: {},
    visual: EFFECT_PRESETS.ring_concentric,
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
      castAnimation: 'stomp',
      castScale: 1.4,
      impactAnimation: 'ripple',
      impactDuration: 800,
      cameraShake: 6,
    },
    sound: { castSound: 'impact', impactSound: 'boom', volume: 0.8 },
    currentCooldown: 0,
    isOnCooldown: false,
  },

  ringExplosion: {
    id: 'ringExplosion',
    name: '폭발 링',
    description: '빠르게 확장되는 폭발 링을 생성합니다',
    type: 'area',
    category: 'skill',
    tags: ['skill', 'area', 'ring', 'explosion'],
    iconName: 'Bomb',
    spCost: 40,
    cooldown: 7000,
    castTime: 800,
    range: 300,
    area: 360,
    timing: { windup: 240, execution: 320, recovery: 240 },
    damageMultiplier: 1.5,
    healAmount: 0,
    buffDuration: 0,
    buffEffect: {},
    visual: EFFECT_PRESETS.ring_explosion,
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
      castScale: 1.5,
      impactAnimation: 'explosion',
      impactDuration: 600,
      cameraShake: 9,
    },
    sound: { castSound: 'charge', impactSound: 'explosion', volume: 1.0 },
    currentCooldown: 0,
    isOnCooldown: false,
  },

  // 글로우 스킬 (3개)
  glowHeal: {
    id: 'glowHeal',
    name: '치유의 빛',
    description: '부드러운 빛으로 HP를 회복합니다',
    type: 'heal',
    category: 'skill',
    tags: ['skill', 'heal', 'glow'],
    iconName: 'Heart',
    spCost: 25,
    cooldown: 8000,
    castTime: 1000,
    range: 0,
    area: 0,
    timing: { windup: 300, execution: 400, recovery: 300 },
    damageMultiplier: 0,
    healAmount: 60,
    buffDuration: 0,
    buffEffect: {},
    visual: EFFECT_PRESETS.glow_heal,
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
      castAnimation: 'glow',
      castScale: 1.2,
      impactAnimation: 'heal',
      impactDuration: 800,
      cameraShake: 0,
    },
    sound: { castSound: 'chime', impactSound: 'heal', volume: 0.6 },
    currentCooldown: 0,
    isOnCooldown: false,
  },

  glowBuff: {
    id: 'glowBuff',
    name: '신성한 축복',
    description: '8초간 공격력 +25%, 방어력 +25%',
    type: 'buff',
    category: 'skill',
    tags: ['skill', 'buff', 'glow'],
    iconName: 'Shield',
    spCost: 30,
    cooldown: 12000,
    castTime: 800,
    range: 0,
    area: 0,
    timing: { windup: 240, execution: 320, recovery: 240 },
    damageMultiplier: 0,
    healAmount: 0,
    buffDuration: 8000,
    buffEffect: { attack: 25, defense: 25 },
    visual: EFFECT_PRESETS.glow_buff,
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
      castAnimation: 'glow',
      castScale: 1.3,
      impactAnimation: 'buff',
      impactDuration: 600,
      cameraShake: 0,
    },
    sound: { castSound: 'blessing', impactSound: 'buff', volume: 0.7 },
    currentCooldown: 0,
    isOnCooldown: false,
  },

  glowPower: {
    id: 'glowPower',
    name: '전투의 기운',
    description: '12초간 공격력 +40%, 공격속도 +20%',
    type: 'buff',
    category: 'skill',
    tags: ['skill', 'buff', 'glow', 'power'],
    iconName: 'Zap',
    spCost: 45,
    cooldown: 18000,
    castTime: 1000,
    range: 0,
    area: 0,
    timing: { windup: 300, execution: 400, recovery: 300 },
    damageMultiplier: 0,
    healAmount: 0,
    buffDuration: 12000,
    buffEffect: { attack: 40, attackSpeed: 20 },
    visual: EFFECT_PRESETS.glow_power,
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
      castScale: 1.4,
      impactAnimation: 'buff',
      impactDuration: 700,
      cameraShake: 3,
    },
    sound: { castSound: 'power', impactSound: 'buff', volume: 0.8 },
    currentCooldown: 0,
    isOnCooldown: false,
  },
};

/**
 * 스킬 쿨타임 업데이트
 */
export function updateSkillCooldown(skill: Skill, deltaTime: number): Skill {
  if (!skill.isOnCooldown) return skill;

  const newCooldown = Math.max(0, skill.currentCooldown - deltaTime * 1000);

  return {
    ...skill,
    currentCooldown: newCooldown,
    isOnCooldown: newCooldown > 0,
  };
}

/**
 * castTime으로부터 기본 timing 구조 생성
 * 기본 비율: windup 30%, execution 40%, recovery 30%
 */
export function generateTiming(castTime: number): {
  windup: number;
  execution: number;
  recovery: number;
} {
  if (castTime === 0) {
    return { windup: 0, execution: 100, recovery: 0 }; // 즉시 실행
  }
  const windup = Math.round(castTime * 0.3);
  const execution = Math.round(castTime * 0.4);
  const recovery = castTime - windup - execution; // 나머지
  return { windup, execution, recovery };
}

/**
 * 스킬 사용 가능 여부 체크
 */
export function canUseSkill(skill: Skill, currentSP: number): { canUse: boolean; reason?: string } {
  if (skill.isOnCooldown) {
    return { canUse: false, reason: '쿨타임 중입니다' };
  }

  if (currentSP < skill.spCost) {
    return { canUse: false, reason: 'SP가 부족합니다' };
  }

  return { canUse: true };
}

/**
 * 스킬 사용 (쿨타임 시작)
 */
export function useSkill(skill: Skill): Skill {
  return {
    ...skill,
    currentCooldown: skill.cooldown,
    isOnCooldown: true,
  };
}

/**
 * 기본 공격 슬롯 설정
 */
export function getDefaultBasicAttackSlot(
  attackType: 'melee' | 'ranged' = 'melee',
  skillId?: string,
): BasicAttackSlot {
  // skillId가 지정된 경우 해당 스킬을 찾음
  let skill;
  if (skillId && defaultSkills[skillId]) {
    skill = { ...defaultSkills[skillId] };
  } else if (skillId && defaultBasicAttacks[skillId as keyof typeof defaultBasicAttacks]) {
    skill = { ...defaultBasicAttacks[skillId as keyof typeof defaultBasicAttacks] };
  } else {
    // 기본값
    skill =
      attackType === 'melee'
        ? { ...defaultBasicAttacks.meleeBasic }
        : { ...defaultBasicAttacks.rangedBasic };
  }

  return {
    skill,
    keyBinding: 'click',
  };
}

/**
 * 기본 스킬 슬롯 설정
 */
export function getDefaultSkillSlots(): SkillSlot[] {
  return [
    { slotNumber: 1, skill: { ...defaultSkills.powerSlash }, keyBinding: '1' },
    { slotNumber: 2, skill: { ...defaultSkills.whirlwind }, keyBinding: '2' },
    { slotNumber: 3, skill: { ...defaultSkills.heal }, keyBinding: '3' },
    { slotNumber: 4, skill: { ...defaultSkills.powerBuff }, keyBinding: '4' },
  ];
}

/**
 * SP(Skill Point) 관리
 */
export interface SPConfig {
  current: number;
  max: number;
  regenRate: number; // SP/초
}

export const defaultSPConfig: SPConfig = {
  current: 100,
  max: 100,
  regenRate: 5, // 초당 5 SP 회복
};

/**
 * SP 회복
 */
export function regenerateSP(config: SPConfig, deltaTime: number): SPConfig {
  const newSP = Math.min(config.max, config.current + config.regenRate * deltaTime);
  return {
    ...config,
    current: newSP,
  };
}

/**
 * SP 소모
 */
export function consumeSP(config: SPConfig, amount: number): SPConfig {
  return {
    ...config,
    current: Math.max(0, config.current - amount),
  };
}

/**
 * 스킬 템플릿 시스템
 */
export const SKILL_TEMPLATES: Record<SkillType, Partial<Skill>> = {
  melee: {
    type: 'melee',
    iconName: 'Sword',
    spCost: 10,
    cooldown: 1000,
    castTime: 200,
    range: 80,
    area: 90,
    timing: { windup: 60, execution: 80, recovery: 60 },
    damageMultiplier: 1.0,
    damageFormula: {
      stat: 'attack',
      operator: '*',
      value: 1.0,
    },
    healAmount: 0,
    buffDuration: 0,
    buffEffect: {},
    visual: {
      color: '#94a3b8',
      secondaryColor: '#cbd5e1',
      particleCount: 10,
      particleSize: 5,
      particleLifetime: 400,
      glowIntensity: 0.4,
      effectShape: 'cone',
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
      castScale: 1.1,
      impactAnimation: 'flash',
      impactDuration: 250,
      cameraShake: 2,
    },
    sound: {
      castSound: 'swing',
      impactSound: 'hit',
      volume: 0.6,
    },
    currentCooldown: 0,
    isOnCooldown: false,
  },
  ranged: {
    type: 'ranged',
    iconName: 'Target',
    spCost: 15,
    cooldown: 1500,
    castTime: 300,
    range: 200,
    area: 40,
    timing: { windup: 90, execution: 120, recovery: 90 },
    damageMultiplier: 1.0,
    damageFormula: {
      stat: 'attack',
      operator: '*',
      value: 1.0,
    },
    healAmount: 0,
    buffDuration: 0,
    buffEffect: {},
    visual: {
      color: '#60a5fa',
      secondaryColor: '#93c5fd',
      particleCount: 8,
      particleSize: 4,
      particleLifetime: 300,
      glowIntensity: 0.5,
      effectShape: 'line',
    },
    projectile: {
      type: 'arrow',
      speed: 500,
      size: 10,
      piercing: false,
      homing: false,
      trail: true,
      trailLength: 30,
    },
    animation: {
      castAnimation: 'charge',
      castScale: 1.05,
      impactAnimation: 'flash',
      impactDuration: 200,
      cameraShake: 1,
    },
    sound: {
      castSound: 'shoot',
      impactSound: 'hit',
      volume: 0.6,
    },
    currentCooldown: 0,
    isOnCooldown: false,
  },
  damage: {
    type: 'damage',
    iconName: 'Swords',
    spCost: 20,
    cooldown: 3000,
    castTime: 500,
    range: 100,
    area: 120,
    timing: { windup: 150, execution: 200, recovery: 150 },
    damageMultiplier: 1.5,
    healAmount: 0,
    buffDuration: 0,
    buffEffect: {},
    visual: {
      color: '#ff4444',
      secondaryColor: '#ff8888',
      particleCount: 15,
      particleSize: 8,
      particleLifetime: 600,
      glowIntensity: 0.7,
      effectShape: 'cone',
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
      castScale: 1.2,
      impactAnimation: 'flash',
      impactDuration: 300,
      cameraShake: 5,
    },
    sound: {
      castSound: 'swing',
      impactSound: 'hit',
      volume: 0.7,
    },
    currentCooldown: 0,
    isOnCooldown: false,
  },
  area: {
    type: 'area',
    iconName: 'Wind',
    spCost: 30,
    cooldown: 5000,
    castTime: 800,
    range: 150,
    area: 360,
    timing: { windup: 240, execution: 320, recovery: 240 },
    damageMultiplier: 0.8,
    healAmount: 0,
    buffDuration: 0,
    buffEffect: {},
    visual: {
      color: '#44aaff',
      secondaryColor: '#88ccff',
      particleCount: 30,
      particleSize: 6,
      particleLifetime: 800,
      glowIntensity: 0.8,
      effectShape: 'ring',
    },
    projectile: {
      type: 'wave',
      speed: 300,
      size: 20,
      piercing: true,
      homing: false,
      trail: true,
      trailLength: 50,
    },
    animation: {
      castAnimation: 'spin',
      castScale: 1.5,
      impactAnimation: 'ripple',
      impactDuration: 500,
      cameraShake: 7,
    },
    sound: {
      castSound: 'whoosh',
      impactSound: 'slash',
      volume: 0.8,
    },
    currentCooldown: 0,
    isOnCooldown: false,
  },
  heal: {
    type: 'heal',
    iconName: 'Heart',
    spCost: 25,
    cooldown: 8000,
    castTime: 1000,
    range: 0,
    area: 0,
    timing: { windup: 300, execution: 400, recovery: 300 },
    damageMultiplier: 0,
    healAmount: 50,
    buffDuration: 0,
    buffEffect: {},
    visual: {
      color: '#44ff44',
      secondaryColor: '#88ff88',
      particleCount: 20,
      particleSize: 10,
      particleLifetime: 1200,
      glowIntensity: 0.9,
      effectShape: 'star',
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
      castAnimation: 'glow',
      castScale: 1.1,
      impactAnimation: 'scatter',
      impactDuration: 800,
      cameraShake: 0,
    },
    sound: {
      castSound: 'chime',
      impactSound: 'heal',
      volume: 0.6,
    },
    currentCooldown: 0,
    isOnCooldown: false,
  },
  buff: {
    type: 'buff',
    iconName: 'Zap',
    spCost: 40,
    cooldown: 15000,
    castTime: 500,
    range: 0,
    area: 0,
    timing: { windup: 150, execution: 200, recovery: 150 },
    damageMultiplier: 0,
    healAmount: 0,
    buffDuration: 10000,
    buffEffect: {
      attack: 30,
      defense: 20,
    },
    visual: {
      color: '#ffaa44',
      secondaryColor: '#ffcc88',
      particleCount: 25,
      particleSize: 12,
      particleLifetime: 1000,
      glowIntensity: 1.0,
      effectShape: 'circle',
    },
    projectile: {
      type: 'lightning',
      speed: 800,
      size: 15,
      piercing: false,
      homing: false,
      trail: true,
      trailLength: 30,
    },
    animation: {
      castAnimation: 'pulse',
      castScale: 1.3,
      impactAnimation: 'explosion',
      impactDuration: 400,
      cameraShake: 3,
    },
    sound: {
      castSound: 'power',
      impactSound: 'buff',
      volume: 0.75,
    },
    currentCooldown: 0,
    isOnCooldown: false,
  },
  debuff: {
    type: 'debuff',
    iconName: 'Skull',
    spCost: 35,
    cooldown: 12000,
    castTime: 600,
    range: 120,
    area: 100,
    timing: { windup: 180, execution: 240, recovery: 180 },
    damageMultiplier: 0.5,
    healAmount: 0,
    buffDuration: 8000,
    buffEffect: {
      attack: -20,
      defense: -15,
      speed: -30,
    },
    visual: {
      color: '#9333ea',
      secondaryColor: '#c084fc',
      particleCount: 20,
      particleSize: 8,
      particleLifetime: 900,
      glowIntensity: 0.8,
      effectShape: 'ring',
    },
    projectile: {
      type: 'energy',
      speed: 400,
      size: 12,
      piercing: false,
      homing: true,
      trail: true,
      trailLength: 40,
    },
    animation: {
      castAnimation: 'pulse',
      castScale: 1.2,
      impactAnimation: 'ripple',
      impactDuration: 600,
      cameraShake: 4,
    },
    sound: {
      castSound: 'curse',
      impactSound: 'debuff',
      volume: 0.7,
    },
    currentCooldown: 0,
    isOnCooldown: false,
  },
  defense: {
    type: 'defense',
    iconName: 'Shield',
    spCost: 30,
    cooldown: 10000,
    castTime: 400,
    range: 0,
    area: 0,
    timing: { windup: 120, execution: 160, recovery: 120 },
    damageMultiplier: 0,
    healAmount: 0,
    buffDuration: 5000,
    buffEffect: {
      defense: 50,
    },
    visual: {
      color: '#60a5fa',
      secondaryColor: '#93c5fd',
      particleCount: 15,
      particleSize: 10,
      particleLifetime: 800,
      glowIntensity: 0.9,
      effectShape: 'shield',
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
      castAnimation: 'glow',
      castScale: 1.15,
      impactAnimation: 'ripple',
      impactDuration: 300,
      cameraShake: 2,
    },
    sound: {
      castSound: 'shield',
      impactSound: 'buff',
      volume: 0.65,
    },
    currentCooldown: 0,
    isOnCooldown: false,
  },
};

/**
 * 새로운 스킬 생성
 */
export function createSkill(
  name: string,
  description: string,
  type: SkillType,
  customizations?: Partial<Skill>,
): Skill {
  const template = SKILL_TEMPLATES[type];
  const id = `skill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    id,
    name,
    description,
    ...template,
    ...customizations,
  } as Skill;
}

/**
 * 스킬 복제
 */
export function cloneSkill(skill: Skill, newName?: string): Skill {
  const id = `skill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    ...skill,
    id,
    name: newName || `${skill.name} (복사)`,
    currentCooldown: 0,
    isOnCooldown: false,
  };
}

/**
 * 스킬 검증
 */
export function validateSkill(skill: Partial<Skill>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!skill.name || skill.name.trim().length === 0) {
    errors.push('스킬 이름은 필수입니다');
  }

  if (!skill.description || skill.description.trim().length === 0) {
    errors.push('스킬 설명은 필수입니다');
  }

  if (!skill.type) {
    errors.push('스킬 타입은 필수입니다');
  }

  if (skill.spCost !== undefined && skill.spCost < 0) {
    errors.push('SP 소모량은 0 이상이어야 합니다');
  }

  if (skill.cooldown !== undefined && skill.cooldown < 0) {
    errors.push('쿨타임은 0 이상이어야 합니다');
  }

  if (skill.damageMultiplier !== undefined && skill.damageMultiplier < 0) {
    errors.push('데미지 배율은 0 이상이어야 합니다');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 스킬 데미지 계산 (능력치 기반)
 * damageFormula가 있으면 능력치 기반 계산, 없으면 0 반환
 */
export function calculateSkillDamage(
  skill: Skill,
  attackerStats: { attack: number; defense: number; magic: number; speed: number },
): number {
  // damageFormula가 없으면 0 반환
  if (!skill.damageFormula) {
    return 0;
  }

  const { stat, operator, value } = skill.damageFormula;
  const statValue = attackerStats[stat];

  if (operator === '*') {
    return Math.floor(statValue * value);
  } else if (operator === '+') {
    return Math.floor(statValue + value);
  }

  return 0;
}
