/**
 * 전투 시스템 - 플레이어와 몬스터의 스킬 및 공격 처리
 */

import { DataRow } from './mockData';
import { Character, Monster } from './gameTypes';
import { defaultSkills } from './skillSystem';
import { decideSkillToUse, decideMovementDirection, shouldAttack, AIConfig, AIPatternConfig, defaultAIPatternConfig } from './monsterAI';

/**
 * 캐릭터 스킬 슬롯 정보
 */
export interface CharacterSkillSlot {
  id: string | null;
  range: number;
  width: number;
  damage: number;
  cooldown: number;
  spCost: number;
  castTime: number;
  currentCooldown: number; // 남은 쿨타임 (ms)
}

/**
 * 캐릭터 스킬 상태
 */
export interface CharacterSkills {
  slot1: CharacterSkillSlot | null;
  slot2: CharacterSkillSlot | null;
  slot3: CharacterSkillSlot | null;
  slot4: CharacterSkillSlot | null;
}

/**
 * 데이터셋에서 캐릭터 스킬 로드 (플레이어)
 */
export function loadPlayerSkills(row: DataRow): CharacterSkills {
  const createSkillSlot = (slotNum: 1 | 2 | 3 | 4): CharacterSkillSlot | null => {
    const id = row[`player_skill_${slotNum}_id`];
    if (!id) return null;

    return {
      id: id as string,
      range: row[`player_skill_${slotNum}_range`] || 100,
      width: row[`player_skill_${slotNum}_width`] || 120,
      damage: row[`player_skill_${slotNum}_damage`] || 1.0,
      cooldown: row[`player_skill_${slotNum}_cooldown`] || 3000,
      spCost: row[`player_skill_${slotNum}_sp_cost`] || 20,
      castTime: row[`player_skill_${slotNum}_cast_time`] || 500,
      currentCooldown: 0,
    };
  };

  return {
    slot1: createSkillSlot(1),
    slot2: createSkillSlot(2),
    slot3: createSkillSlot(3),
    slot4: createSkillSlot(4),
  };
}

/**
 * 데이터셋에서 캐릭터 스킬 로드 (몬스터)
 */
export function loadMonsterSkills(row: DataRow): CharacterSkills {
  const createSkillSlot = (slotNum: 1 | 2 | 3 | 4): CharacterSkillSlot | null => {
    const id = row[`monster_skill_${slotNum}_id`];
    if (!id) return null;

    return {
      id: id as string,
      range: row[`monster_skill_${slotNum}_range`] || 100,
      width: row[`monster_skill_${slotNum}_width`] || 120,
      damage: row[`monster_skill_${slotNum}_damage`] || 1.0,
      cooldown: row[`monster_skill_${slotNum}_cooldown`] || 3000,
      spCost: row[`monster_skill_${slotNum}_sp_cost`] || 20,
      castTime: row[`monster_skill_${slotNum}_cast_time`] || 500,
      currentCooldown: 0,
    };
  };

  return {
    slot1: createSkillSlot(1),
    slot2: createSkillSlot(2),
    slot3: createSkillSlot(3),
    slot4: createSkillSlot(4),
  };
}

/**
 * 기본 공격 정보
 */
export interface BasicAttackInfo {
  id: string;
  range: number;
  width: number;
  damage: number;
  cooldown: number;
  spCost: number;
  castTime: number;
}

/**
 * 플레이어 기본 공격 로드
 */
export function loadPlayerBasicAttack(row: DataRow): BasicAttackInfo {
  const skillId = (row.player_basic_attack_id as string) || 'meleeBasic';
  const skill = defaultSkills[skillId];
  
  // 스킬이 없으면 기본값 사용
  if (!skill) {
    return {
      id: skillId,
      range: row.player_basic_attack_range || 75,
      width: row.player_basic_attack_width || 90,
      damage: row.player_basic_attack_damage || 1.0,
      cooldown: row.player_basic_attack_cooldown || 1000,
      spCost: row.player_basic_attack_sp_cost || 0,
      castTime: row.player_basic_attack_cast_time || 300,
    };
  }
  
  return {
    id: skillId,
    range: row.player_basic_attack_range ?? skill.range,
    width: row.player_basic_attack_width ?? skill.area,
    damage: row.player_basic_attack_damage ?? skill.damageMultiplier,
    cooldown: row.player_basic_attack_cooldown ?? skill.cooldown,
    spCost: row.player_basic_attack_sp_cost ?? skill.spCost,
    castTime: row.player_basic_attack_cast_time ?? skill.castTime,
  };
}

/**
 * 몬스터 기본 공격 로드
 */
export function loadMonsterBasicAttack(row: DataRow): BasicAttackInfo {
  const skillId = (row.monster_basic_attack_id as string) || 'meleeBasic';
  const skill = defaultSkills[skillId];
  
  // 스킬이 없으면 기본값 사용
  if (!skill) {
    return {
      id: skillId,
      range: row.monster_basic_attack_range || 75,
      width: row.monster_basic_attack_width || 90,
      damage: row.monster_basic_attack_damage || 1.0,
      cooldown: row.monster_basic_attack_cooldown || 1000,
      spCost: row.monster_basic_attack_sp_cost || 0,
      castTime: row.monster_basic_attack_cast_time || 300,
    };
  }
  
  return {
    id: skillId,
    range: row.monster_basic_attack_range ?? skill.range,
    width: row.monster_basic_attack_width ?? skill.area,
    damage: row.monster_basic_attack_damage ?? skill.damageMultiplier,
    cooldown: row.monster_basic_attack_cooldown ?? skill.cooldown,
    spCost: row.monster_basic_attack_sp_cost ?? skill.spCost,
    castTime: row.monster_basic_attack_cast_time ?? skill.castTime,
  };
}

/**
 * 몬스터 AI 설정 로드 (레거시)
 */
export function loadMonsterAI(row: DataRow): AIConfig {
  return {
    type: (row.monster_ai_type as any) || 'aggressive',
    aggroRange: row.monster_ai_aggro_range || 300,
    skillPriority: (row.monster_ai_skill_priority as any) || 'damage',
  };
}

/**
 * 몬스터 AI 패턴 설정 로드 (새 시스템)
 */
export function loadMonsterAIPattern(row: DataRow): AIPatternConfig {
  try {
    if (row.monster_ai_patterns) {
      const parsed = typeof row.monster_ai_patterns === 'string' 
        ? JSON.parse(row.monster_ai_patterns)
        : row.monster_ai_patterns;
      
      if (parsed && Array.isArray(parsed.patterns)) {
        return {
          patterns: parsed.patterns.map((p: any) => ({
            action: p.action || 'chase',
            conditions: Array.isArray(p.conditions) ? p.conditions : [],
            enabled: p.enabled !== false,
            skillId: p.skillId,
          })),
          aggroRange: typeof parsed.aggroRange === 'number' ? parsed.aggroRange : defaultAIPatternConfig.aggroRange,
          chaseMinDistance: typeof parsed.chaseMinDistance === 'number' ? parsed.chaseMinDistance : defaultAIPatternConfig.chaseMinDistance,
        };
      }
    }
  } catch (error) {
    console.warn('⚠️ AI 패턴 로드 실패, 기본값 사용:', error, row.monster_name || 'Unknown Monster');
  }
  
  // 기본값 반환
  return { ...defaultAIPatternConfig };
}

/**
 * 스킬 쿨타임 업데이트
 */
export function updateSkillCooldowns(skills: CharacterSkills, deltaTime: number): CharacterSkills {
  const deltaMills = deltaTime * 1000;

  const updateSlot = (slot: CharacterSkillSlot | null): CharacterSkillSlot | null => {
    if (!slot) return null;
    return {
      ...slot,
      currentCooldown: Math.max(0, slot.currentCooldown - deltaMills),
    };
  };

  return {
    slot1: updateSlot(skills.slot1),
    slot2: updateSlot(skills.slot2),
    slot3: updateSlot(skills.slot3),
    slot4: updateSlot(skills.slot4),
  };
}

/**
 * 스킬 사용 가능 여부 체크
 */
export function canUseSkill(
  slot: CharacterSkillSlot | null,
  currentSP: number
): boolean {
  if (!slot || !slot.id) return false;
  if (slot.currentCooldown > 0) return false;
  if (currentSP < slot.spCost) return false;
  return true;
}

/**
 * 사용 가능한 스킬 슬롯 번호 가져오기
 */
export function getAvailableSkills(
  skills: CharacterSkills,
  currentSP: number
): number[] {
  const available: number[] = [];
  
  if (canUseSkill(skills.slot1, currentSP)) available.push(1);
  if (canUseSkill(skills.slot2, currentSP)) available.push(2);
  if (canUseSkill(skills.slot3, currentSP)) available.push(3);
  if (canUseSkill(skills.slot4, currentSP)) available.push(4);
  
  return available;
}

/**
 * 스킬 슬롯 가져오기
 */
export function getSkillSlot(skills: CharacterSkills, slotNum: number): CharacterSkillSlot | null {
  switch (slotNum) {
    case 1: return skills.slot1;
    case 2: return skills.slot2;
    case 3: return skills.slot3;
    case 4: return skills.slot4;
    default: return null;
  }
}

/**
 * 스킬 사용 (쿨타임 시작)
 */
export function useSkill(
  skills: CharacterSkills,
  slotNum: number
): CharacterSkills {
  const slot = getSkillSlot(skills, slotNum);
  if (!slot) return skills;

  const updatedSlot = {
    ...slot,
    currentCooldown: slot.cooldown,
  };

  switch (slotNum) {
    case 1: return { ...skills, slot1: updatedSlot };
    case 2: return { ...skills, slot2: updatedSlot };
    case 3: return { ...skills, slot3: updatedSlot };
    case 4: return { ...skills, slot4: updatedSlot };
    default: return skills;
  }
}

/**
 * 몬스터 AI가 사용할 스킬 결정
 */
export function decideMonsterSkill(
  monster: Monster & { skills: CharacterSkills; aiConfig: AIConfig },
  playerPosition: { x: number; y: number },
  currentHP: number,
  maxHP: number,
  currentSP: number,
  maxSP: number
): number {
  const distance = Math.sqrt(
    Math.pow(playerPosition.x - monster.position.x, 2) +
    Math.pow(playerPosition.y - monster.position.y, 2)
  );

  const availableSkills = getAvailableSkills(monster.skills, currentSP);

  // 스킬 데이터 배열 생성
  const skillData = [
    monster.skills.slot1,
    monster.skills.slot2,
    monster.skills.slot3,
    monster.skills.slot4,
  ].map(slot => slot ? {
    id: slot.id,
    range: slot.range,
    width: slot.width,
    damage: slot.damage,
  } : null);

  return decideSkillToUse(
    monster.aiConfig,
    availableSkills,
    distance,
    currentHP,
    maxHP,
    currentSP,
    maxSP,
    skillData
  );
}

/**
 * 스킬 효과 적용 (힐, 버프 등)
 */
export function applySkillEffect(
  skillId: string,
  character: Character
): { hp?: number; sp?: number; buffApplied?: boolean } {
  const skill = defaultSkills[skillId];
  if (!skill) return {};

  const result: { hp?: number; sp?: number; buffApplied?: boolean } = {};

  // 힐 효과
  if (skill.type === 'heal' && skill.healAmount > 0) {
    result.hp = skill.healAmount;
  }

  // 버프 효과
  if (skill.type === 'buff' && skill.buffDuration > 0) {
    result.buffApplied = true;
    // 버프는 별도 시스템에서 관리 (TODO)
  }

  return result;
}

/**
 * 공격 범위 내 체크 (부채꼴 또는 원형)
 */
export function isInAttackRange(
  attackerPos: { x: number; y: number },
  attackerAngle: number,
  targetPos: { x: number; y: number },
  range: number,
  width: number // 각도 (도 단위)
): boolean {
  const dx = targetPos.x - attackerPos.x;
  const dy = targetPos.y - attackerPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // 거리 체크
  if (distance > range) return false;

  // 전방위 공격 (360도)
  if (width >= 360) return true;

  // 부채꼴 범위 체크
  const angleToTarget = Math.atan2(dy, dx);
  const angleDiff = Math.abs(angleToTarget - attackerAngle);
  const normalizedDiff = Math.min(angleDiff, 2 * Math.PI - angleDiff);
  const halfWidthRad = (width / 2) * (Math.PI / 180);

  return normalizedDiff <= halfWidthRad;
}

/**
 * 크리티컬 판정 결과
 */
export interface CriticalResult {
  isCritical: boolean;
  damageMultiplier: number; // 최종 데미지 배율 (1.0 = 일반, 1.5-2.0 = 크리티컬)
}

/**
 * 크리티컬 판정
 * @param baseCriticalRate 기본 크리티컬 확률 (0.0 ~ 1.0, 기본값 0.15 = 15%)
 * @param criticalMultiplier 크리티컬 데미지 배율 (기본값 1.5 = 150%)
 */
export function calculateCritical(
  baseCriticalRate: number = 0.15,
  criticalMultiplier: number = 1.5
): CriticalResult {
  const isCritical = Math.random() < baseCriticalRate;
  
  return {
    isCritical,
    damageMultiplier: isCritical ? criticalMultiplier : 1.0,
  };
}
