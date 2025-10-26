/**
 * 몬스터 AI 시스템
 * - 몬스터의 자동 행동 패턴을 정의
 * - 조건 기반 패턴 매칭
 * - 이동 및 전투 패턴 제어
 */

export type AIType = 'aggressive' | 'defensive' | 'balanced' | 'passive';
export type SkillPriority = 'damage' | 'control' | 'survival' | 'balanced';

// 패턴 액션 타입
export type PatternAction = 'move' | 'defend' | 'chase' | 'flee' | 'attack' | 'skill';

// 조건 타입
export type ConditionType = 'distance' | 'hp';
export type ConditionOperator = '<' | '>' | '<=' | '>=';

// 단일 조건
export interface PatternCondition {
  type: ConditionType;
  operator: ConditionOperator;
  value: number;
}

// AI 패턴 (조건 기반)
export interface AIPattern {
  action: PatternAction;
  conditions: PatternCondition[];
  enabled: boolean; // 활성화 여부
  skillId?: string; // 스킬 액션 선택 시 사용할 스킬 ID (skill1-4 액션에서만 사용)
}

// 새로운 AI 설정 (조건 기반 패턴 시스템)
export interface AIPatternConfig {
  patterns: AIPattern[]; // 최대 10개
  aggroRange: number; // 어그로 범위
  chaseMinDistance: number; // 추적 시 최소 거리 (이 거리 이하로는 다가가지 않음)
}

// 기존 호환성을 위한 레거시 타입
export interface AIConfig {
  type: AIType;
  aggroRange: number;
  skillPriority: SkillPriority;
}

export interface AITypeInfo {
  name: string;
  description: string;
  icon: string;
}

export interface SkillPriorityInfo {
  name: string;
  description: string;
  icon: string;
}

/**
 * AI 타입 정의
 */
export const aiTypes: Record<AIType, AITypeInfo> = {
  aggressive: {
    name: '공격적',
    description: '적극적으로 플레이어를 추격하고 공격',
    icon: '⚔️',
  },
  balanced: {
    name: '균형',
    description: '상황에 따라 공격과 방어를 조절',
    icon: '⚖️',
  },
  defensive: {
    name: '방어적',
    description: '공격받을 때만 반격',
    icon: '🛡️',
  },
  passive: {
    name: '수동적',
    description: '공격하지 않고 회피만 시도',
    icon: '🏃',
  },
};

/**
 * 스킬 우선순위 정의
 */
export const skillPriorities: Record<SkillPriority, SkillPriorityInfo> = {
  damage: {
    name: '데미지 우선',
    description: '높은 데미지의 스킬을 우선 사용',
    icon: '💥',
  },
  control: {
    name: '제어 우선',
    description: '광역 스킬을 우선 사용',
    icon: '🌀',
  },
  survival: {
    name: '생존 우선',
    description: '힐/버프 스킬을 우선 사용',
    icon: '💚',
  },
  balanced: {
    name: '균형',
    description: '상황에 맞는 스킬 사용',
    icon: '🎲',
  },
};

/**
 * AI 타입 이름 가져오기
 */
export function getAITypeName(type: AIType): string {
  return aiTypes[type]?.name || type;
}

/**
 * 스킬 우선순위 이름 가져오기
 */
export function getSkillPriorityName(priority: SkillPriority): string {
  return skillPriorities[priority]?.name || priority;
}

/**
 * 기본 AI 설정
 */
export const defaultAIConfig: AIConfig = {
  type: 'aggressive',
  aggroRange: 300,
  skillPriority: 'damage',
};

/**
 * 기본 AI 패턴 설정
 */
export const defaultAIPatternConfig: AIPatternConfig = {
  patterns: [
    {
      action: 'attack',
      conditions: [
        { type: 'distance', operator: '<=', value: -1 }, // -1 = 실제 공격 범위 사용 (동적)
        { type: 'hp', operator: '>', value: 30 },
      ],
      enabled: true,
    },
    {
      action: 'chase',
      conditions: [], // 조건 없음 = 항상 추적 (위 패턴이 매칭되지 않으면)
      enabled: true,
    },
  ],
  aggroRange: 9999, // 무제한 추적 범위
  chaseMinDistance: 0, // 0 = 공격 범위까지 다가감 (제한 없음)
};

/**
 * 빈 패턴 생성
 */
export function createEmptyPattern(): AIPattern {
  return {
    action: 'move',
    conditions: [],
    enabled: false,
  };
}

/**
 * 액션 이름 가져오기
 */
export function getActionName(action: PatternAction): string {
  const actionNames: Record<PatternAction, string> = {
    move: '이동',
    defend: '방어',
    chase: '추적',
    flee: '도망',
    attack: '공격',
    skill: '스킬',
  };
  return actionNames[action];
}

/**
 * 조건 타입 이름 가져오기
 */
export function getConditionTypeName(type: ConditionType): string {
  const typeNames: Record<ConditionType, string> = {
    distance: '거리',
    hp: 'HP',
  };
  return typeNames[type];
}

/**
 * 스킬 조건 인터페이스
 */
export interface SkillCondition {
  type: 'hp_below' | 'hp_above' | 'distance_below' | 'distance_above' | 'sp_above' | 'always';
  value: number; // HP/거리는 절대값, SP는 퍼센트
}

/**
 * 스킬 사용 가능 여부 체크 (조건 확인)
 */
export function checkSkillCondition(
  condition: SkillCondition | undefined,
  monsterHP: number,
  monsterMaxHP: number,
  monsterSP: number,
  monsterMaxSP: number,
  playerDistance: number,
): boolean {
  if (!condition || condition.type === 'always') return true;

  const hpPercent = (monsterHP / monsterMaxHP) * 100;
  const spPercent = (monsterSP / monsterMaxSP) * 100;

  switch (condition.type) {
    case 'hp_below':
      return hpPercent < condition.value;
    case 'hp_above':
      return hpPercent > condition.value;
    case 'distance_below':
      return playerDistance < condition.value;
    case 'distance_above':
      return playerDistance > condition.value;
    case 'sp_above':
      return spPercent > condition.value;
    default:
      return true;
  }
}

/**
 * 패턴 조건 체크
 */
export function checkPatternConditions(
  conditions: PatternCondition[],
  distance: number,
  hpPercent: number,
): boolean {
  // 조건이 없으면 항상 true
  if (conditions.length === 0) return true;

  // 모든 조건을 만족해야 함 (AND 조건)
  return conditions.every((condition) => {
    const value = condition.type === 'distance' ? distance : hpPercent;

    switch (condition.operator) {
      case '<':
        return value < condition.value;
      case '>':
        return value > condition.value;
      case '<=':
        return value <= condition.value;
      case '>=':
        return value >= condition.value;
      default:
        return false;
    }
  });
}

/**
 * 패턴 기반 AI 결정 (새 시스템)
 * @returns { action: PatternAction, skillSlot?: number, skillId?: string } 또는 null
 */
export function evaluateAIPatterns(
  config: AIPatternConfig,
  distance: number,
  monsterHP: number,
  monsterMaxHP: number,
): { action: PatternAction; skillSlot?: number; skillId?: string } | null {
  const hpPercent = (monsterHP / monsterMaxHP) * 100;

  // 우선순위 순으로 패턴 체크 (활성화된 패턴만)
  for (const pattern of config.patterns) {
    if (!pattern.enabled) continue;

    // 조건 체크
    if (checkPatternConditions(pattern.conditions, distance, hpPercent)) {
      // 스킬 액션이면 스킬 ID 반환
      if (pattern.action === 'skill') {
        return {
          action: pattern.action,
          skillId: pattern.skillId, // 스킬 ID 포함
        };
      }

      // attack 액션이면 기본 공격 또는 지정된 스킬 ID 반환
      if (pattern.action === 'attack') {
        return {
          action: pattern.action,
          skillId: pattern.skillId, // 기본 공격 스킬 ID 포함
        };
      }

      return { action: pattern.action };
    }
  }

  return null; // 매칭되는 패턴 없음
}

/**
 * 스킬 사용 결정 (AI 우선순위에 따라)
 * @returns 사용할 스킬 슬롯 번호 (1-4) 또는 0 (기본 공격)
 */
export function decideSkillToUse(
  aiConfig: AIConfig,
  availableSkills: number[], // 사용 가능한 스킬 슬롯들 (쿨다운/SP 체크 완료)
  playerDistance: number,
  monsterHP: number,
  monsterMaxHP: number,
  monsterSP: number,
  monsterMaxSP: number,
  skillData: any[], // 각 스킬의 데이터 배열
): number {
  if (availableSkills.length === 0) {
    return 0; // 기본 공격
  }

  const hpPercent = monsterHP / monsterMaxHP;

  // 조건을 만족하는 스킬만 필터링
  const validSkills = availableSkills.filter((slot) => {
    const skill = skillData[slot - 1];
    if (!skill || !skill.id) return false; // 스킬이 없으면 제외

    // 거리 체크
    if (skill.range > 0 && playerDistance > skill.range) return false;

    // 조건 체크
    return checkSkillCondition(
      skill.condition,
      monsterHP,
      monsterMaxHP,
      monsterSP,
      monsterMaxSP,
      playerDistance,
    );
  });

  if (validSkills.length === 0) {
    return 0; // 조건을 만족하는 스킬이 없으면 기본 공격
  }

  // 스킬 우선순위에 따른 결정
  switch (aiConfig.skillPriority) {
    case 'damage':
      // 가장 높은 데미지의 스킬 선택
      let maxDamage = 0;
      let bestSkill = 0;
      validSkills.forEach((slot) => {
        const skill = skillData[slot - 1];
        if (skill && skill.damage > maxDamage) {
          maxDamage = skill.damage;
          bestSkill = slot;
        }
      });
      return bestSkill || validSkills[0];

    case 'control':
      // 가장 넓은 범위의 스킬 선택
      let maxWidth = 0;
      let bestControlSkill = 0;
      validSkills.forEach((slot) => {
        const skill = skillData[slot - 1];
        if (skill && skill.width > maxWidth) {
          maxWidth = skill.width;
          bestControlSkill = slot;
        }
      });
      return bestControlSkill || validSkills[0];

    case 'survival':
      // HP가 낮으면 힐/버프 스킬 우선
      if (hpPercent < 0.5) {
        const healSkill = validSkills.find((slot) => {
          const skill = skillData[slot - 1];
          return skill && (skill.id === 'heal' || skill.id === 'powerBuff');
        });
        if (healSkill) return healSkill;
      }
      // 그 외에는 데미지 스킬
      return validSkills[0];

    case 'balanced':
    default:
      // HP가 낮으면 생존 우선
      if (hpPercent < 0.3) {
        const healSkill = validSkills.find((slot) => {
          const skill = skillData[slot - 1];
          return skill && skill.id === 'heal';
        });
        if (healSkill) return healSkill;
      }

      // 우선순위 기반 선택 (첫 번째로 조건을 만족하는 스킬)
      return validSkills[0];
  }
}

/**
 * 이동 방향 결정
 * @returns 목표 각도 (라디안)
 */
export function decideMovementDirection(
  aiConfig: AIConfig,
  monsterX: number,
  monsterY: number,
  playerX: number,
  playerY: number,
  monsterHP: number,
  monsterMaxHP: number,
): number | null {
  const dx = playerX - monsterX;
  const dy = playerY - monsterY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angleToPlayer = Math.atan2(dy, dx);
  const hpPercent = monsterHP / monsterMaxHP;

  switch (aiConfig.type) {
    case 'aggressive':
      // 항상 플레이어를 추격
      if (distance > 50) {
        return angleToPlayer;
      }
      return null;

    case 'balanced':
      // HP가 낮으면 도망, 높으면 추격
      if (hpPercent < 0.3 && distance < 200) {
        // 도망
        return angleToPlayer + Math.PI;
      } else if (distance > 80) {
        // 추격
        return angleToPlayer;
      }
      return null;

    case 'defensive':
      // 어그로 범위 안에 있을 때만 추격
      if (distance < aiConfig.aggroRange && distance > 60) {
        return angleToPlayer;
      } else if (distance < 60) {
        // 너무 가까우면 약간 후퇴
        return angleToPlayer + Math.PI;
      }
      return null;

    case 'passive':
      // 플레이어가 너무 가까우면 도망
      if (distance < 150) {
        return angleToPlayer + Math.PI;
      }
      return null;

    default:
      return null;
  }
}

/**
 * 공격 여부 결정
 */
export function shouldAttack(aiConfig: AIConfig, distance: number, attackRange: number): boolean {
  if (aiConfig.type === 'passive') {
    return false; // 수동적 AI는 공격하지 않음
  }

  // 공격 범위 안에 있으면 공격
  return distance <= attackRange;
}
