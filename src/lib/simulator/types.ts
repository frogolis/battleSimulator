/**
 * 시뮬레이터 타입 정의
 * MultiMonsterSimulator에서 사용하는 모든 타입을 정의합니다.
 */

import { CharacterStats, MonsterStats } from '../gameData';
import { CharacterSkills, BasicAttackSlot } from '../skillSystem';
import { AIConfig, AIPatternConfig } from '../monsterAI';

/**
 * 2D 좌표
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * 플레이어 캐릭터 상태
 */
export interface CharacterState {
  position: Position;
  stats: CharacterStats;
  isAttacking: boolean;
  isSkilling: boolean;
  attackCooldown: number;
  meleeSwingStart: number | null;
  meleeSwingAngle: number;
  meleeSwingHit: Set<number>;
  skillSwingStart: number | null;
  skillSwingAngle: number;
  skillSwingHit: Set<number>;
  activeSkillType: "powerSlash" | "whirlwind" | null;
  activeSkillDamageMultiplier: number;
  playerScale: number;
  shakeOffset: Position;
  skills: CharacterSkills;
  basicAttack: BasicAttackSlot | null;
  skillPhase?: 'idle' | 'windup' | 'execution' | 'recovery';
  skillPhaseStartTime?: number;
  currentSkillTiming?: {
    windup: number;
    execution: number;
    recovery: number;
  };
}

/**
 * 몬스터 상태
 */
export interface MonsterState {
  id: number;
  position: Position;
  stats: MonsterStats;
  isAttacking: boolean;
  attackCooldown: number;
  isDead: boolean;
  aiState: "CHASE" | "ATTACK" | "RETREAT";
  wanderTarget: Position | null; // 레거시 호환용
  wanderCooldown: number; // 레거시 호환용
  detectionRange: number; // 레거시 호환용 (항상 9999)
  respawnTimer: number;
  velocity: Position; // 넉백 효과용
  knockbackTime: number; // 넉백 타임스탬프
  name: string;
  color: string;
  skills: CharacterSkills;
  basicAttack: BasicAttackSlot | null;
  aiConfig: AIConfig;
  aiPatternConfig: AIPatternConfig;
  sp: number;
  maxSP: number;
  currentSkill: number | null; // 현재 사용 중인 스킬 슬롯
  skillPhase?: 'idle' | 'windup' | 'execution' | 'recovery';
  skillPhaseStartTime?: number;
  currentSkillTiming?: {
    windup: number;
    execution: number;
    recovery: number;
  };
}

/**
 * 투사체 (원거리 공격용)
 */
export interface Projectile {
  id: number;
  position: Position;
  velocity: Position;
  damage: number;
  owner: "player" | "monster";
  size: number;
  startPosition: Position;
  travelDistance: number;
  monsterId?: number; // 몬스터가 발사한 경우 몬스터 ID
  targetId?: number; // 유도 미사일의 타겟 ID
  isHoming?: boolean; // 유도 미사일 여부
}

/**
 * 파티클 업데이트 전략
 */
export type ParticleUpdateStrategy = 'projectile' | 'aoe_burst' | 'static';

/**
 * 새로운 이펙트 타입 (5가지)
 */
export type EffectType = 'projectile' | 'trail' | 'lightning' | 'ring' | 'glow';

/**
 * 파티클 텍스쳐 타입
 */
export type ParticleTexture = 'circle' | 'star' | 'square' | 'diamond' | 'spark';

/**
 * 궤적 히스토리 포인트
 */
export interface TrailPoint {
  x: number;
  y: number;
  timestamp: number;
}

/**
 * 번개 세그먼트
 */
export interface LightningSegment {
  start: Position;
  end: Position;
  brightness: number;
}

/**
 * 스킬 파티클 (시각 효과용, 투사체 기능 포함)
 */
export interface SkillParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  secondaryColor?: string;
  skillType?: string; // 스킬 타입 (glowIntensity 등을 위해)
  strategy?: ParticleUpdateStrategy; // 파티클 업데이트 전략 (레거시)
  
  // 새로운 이펙트 시스템
  effectType?: EffectType; // 이펙트 타입
  texture?: ParticleTexture; // 파티클 텍스쳐
  
  // 투사체 기능 (파티클이 투사체 역할을 할 때)
  damage?: number; // 데미지 (투사체일 때)
  owner?: 'player' | 'monster'; // 소유자 (투사체일 때)
  monsterId?: number; // 몬스터가 발사한 경우 몬스터 ID
  hasHit?: boolean; // 이미 충돌 처리된 파티클인지 (중복 처리 방지)
  startPosition?: Position; // 시작 위치
  travelDistance?: number; // 이동 거리
  targetId?: number; // 유도 타겟 ID
  isHoming?: boolean; // 유도 여부
  skillName?: string; // 스킬 이름 (데미지 텍스트 표시용)
  
  // 궤적 트레일 기능
  trailHistory?: TrailPoint[]; // 이동 궤적 히스토리
  trailEnabled?: boolean; // 궤적 활성화 여부
  trailLength?: number; // 궤적 길이 (포인트 개수)
  trailWidth?: number; // 궤적 선 두께
  
  // 번개 이펙트
  lightningSegments?: LightningSegment[]; // 번개 세그먼트
  lightningTarget?: Position; // 번개 타겟 위치
  
  // 링 이펙트
  ringRadius?: number; // 링 반지름
  ringStartRadius?: number; // 링 시작 반지름
  ringExpansionSpeed?: number; // 확장 속도
  
  // 글로우 이펙트
  glowIntensity?: number; // 글로우 강도
  riseSpeed?: number; // 상승 속도 (글로우 파티클용)
}

/**
 * 궤적 이펙트 (파티클이 아닌 직접 그리는 방식)
 */
export interface TrailEffect {
  id: number;
  points: Position[]; // 궤적을 구성하는 점들
  color: string;
  secondaryColor?: string;
  width: number; // 선 두께
  life: number; // 남은 생명
  maxLife: number; // 최대 생명
  glowIntensity?: number;
}

/**
 * 시뮬레이터 모드
 */
export type SimulatorMode = "1v1" | "1vMany";
