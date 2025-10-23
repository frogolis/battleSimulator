export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  x: number;
  y: number;
}

export interface CharacterStats {
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  attackSpeed: number;
  accuracy: number;
  criticalRate: number;
}

export type SkillExecutionPhase = 'idle' | 'windup' | 'execution' | 'recovery';

export interface Character {
  position: Position;
  velocity: Velocity;
  stats: CharacterStats;
  isAttacking: boolean;
  isSkilling: boolean;
  isDead: boolean;
  lastAttackTime: number;
  meleeSwingStart: number | null;
  meleeSwingAngle: number;
  
  // 스킬 실행 상태 (선딜-공격-후딜)
  skillPhase: SkillExecutionPhase;
  skillPhaseStartTime: number;
  currentSkillTiming?: {
    windup: number;
    execution: number;
    recovery: number;
  };
}

export interface Monster extends Character {
  aiState: 'IDLE' | 'CHASE' | 'ATTACK' | 'FLEE' | 'DEFEND';
  detectionRange: number;
  wanderAngle: number;
  wanderChangeTime: number;
  lastStateChange: number;
}

export interface Projectile {
  position: Position;
  velocity: Velocity;
  owner: 'player' | 'monster';
  size: number;
  travelDistance: number;
}

// 캐릭터 타입 정의 (동적으로 추가 가능)
export type CharacterType = string;

export interface StatRange {
  min: number;
  max: number;
}

export interface CharacterConfig {
  // Basic stats (ranges)
  size: StatRange;
  speed: StatRange;
  
  // Combat stats (ranges)
  attack: StatRange;          // 공격력
  defense: StatRange;         // 방어력
  attackSpeed: StatRange;     // 공격 속도 (초당 공격 횟수)
  accuracy: StatRange;        // 명중률 (0-100%)
  criticalRate: StatRange;    // 치명타율 (0-100%)
  
  // Attack properties (ranges)
  attackRange: StatRange;     // 공격 범위 (거리)
  attackWidth: StatRange;     // 공격 넓이 (부채꼴 각도, 도 단위)
  
  typeId: string; // 캐릭터 타입 프리셋 ID (warrior, archer, mage 등)
  // DEPRECATED: attackType은 스킬 시스템으로 이동 (하위 호환성을 위해 유지)
  attackType?: CharacterType;
  
  // Monster spawn settings
  monsterRespawnDelay?: number;
  monsterMaxCount?: number;
}
