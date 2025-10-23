/**
 * 시뮬레이터 AI 업데이트 로직
 * MonsterAI.ts의 패턴을 기반으로 실제 게임 루프에서 사용하는 AI 업데이트 함수들
 */

import { MonsterState, CharacterState, Position } from './types';
import { AIPattern, PatternAction, PatternCondition } from '../monsterAI';
import { resolveCharacterConfigMid } from '../configUtils';
import { CharacterConfig } from '../../components/CharacterSettings';

/**
 * AI 업데이트 결과
 */
export interface AIUpdateResult {
  action: PatternAction;
  skillSlot?: number; // 사용할 스킬 슬롯 (1-4)
}

/**
 * 조건 평가
 */
function evaluateCondition(
  condition: PatternCondition,
  distanceToPlayer: number,
  monsterHpPercent: number
): boolean {
  let value: number;
  
  switch (condition.type) {
    case 'distance':
      value = distanceToPlayer;
      break;
    case 'hp':
      value = monsterHpPercent * 100; // 0-100으로 변환
      break;
    default:
      return false;
  }

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
}

/**
 * AI 패턴 매칭
 * @param monster 몬스터
 * @param player 플레이어
 * @param distanceToPlayer 플레이어까지의 거리
 * @returns AI 업데이트 결과 (null이면 매칭된 패턴 없음)
 */
export function matchAIPattern(
  monster: MonsterState,
  player: CharacterState,
  distanceToPlayer: number
): AIUpdateResult | null {
  const patterns = monster.aiPatternConfig?.patterns || [];
  const monsterHpPercent = monster.stats.hp / monster.stats.maxHp;

  // 패턴을 순서대로 확인하여 첫 번째로 조건이 맞는 패턴 반환
  for (const pattern of patterns) {
    if (!pattern.enabled) continue;

    // 모든 조건이 만족되는지 확인
    const allConditionsMet = pattern.conditions.every((condition) =>
      evaluateCondition(condition, distanceToPlayer, monsterHpPercent)
    );

    if (allConditionsMet) {
      // 스킬 액션인 경우 스킬 ID를 슬롯 번호로 변환
      let skillSlot: number | undefined;
      if (pattern.skillId) {
        // 'skill1' -> 1, 'skill2' -> 2, ...
        const slotMatch = pattern.skillId.match(/skill(\d)/);
        if (slotMatch) {
          skillSlot = parseInt(slotMatch[1], 10);
        }
      }

      return {
        action: pattern.action,
        skillSlot,
      };
    }
  }

  return null; // 매칭된 패턴 없음
}

/**
 * 몬스터 이동 업데이트
 * @param monster 몬스터
 * @param targetPos 목표 위치
 * @param speed 이동 속도
 * @param deltaTime 경과 시간 (초)
 * @param minDistance 최소 거리 (이 거리 이하로는 접근하지 않음)
 */
export function updateMonsterMovement(
  monster: MonsterState,
  targetPos: Position,
  speed: number,
  deltaTime: number,
  minDistance: number = 0
): void {
  const dx = targetPos.x - monster.position.x;
  const dy = targetPos.y - monster.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // 최소 거리 체크
  if (distance <= minDistance) return;

  if (distance > 0) {
    const moveDistance = Math.min(speed * deltaTime, distance - minDistance);
    monster.position.x += (dx / distance) * moveDistance;
    monster.position.y += (dy / distance) * moveDistance;
  }
}

/**
 * 몬스터 후퇴 업데이트
 * @param monster 몬스터
 * @param playerPos 플레이어 위치
 * @param speed 이동 속도
 * @param deltaTime 경과 시간 (초)
 */
export function updateMonsterRetreat(
  monster: MonsterState,
  playerPos: Position,
  speed: number,
  deltaTime: number
): void {
  const dx = monster.position.x - playerPos.x;
  const dy = monster.position.y - playerPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance > 0) {
    const moveDistance = speed * deltaTime;
    monster.position.x += (dx / distance) * moveDistance;
    monster.position.y += (dy / distance) * moveDistance;
  }
}

/**
 * AI 상태 업데이트 (레거시 3-상태 시스템용)
 * @param monster 몬스터
 * @param player 플레이어
 * @param distanceToPlayer 플레이어까지의 거리
 * @param monsterConfig 몬스터 설정
 */
export function updateAIState(
  monster: MonsterState,
  player: CharacterState,
  distanceToPlayer: number,
  monsterConfig: CharacterConfig
): void {
  const hpPercent = monster.stats.hp / monster.stats.maxHp;
  const attackRange = monster.basicAttack?.range || monsterConfig.attackRange;

  // 패턴 매칭 시도
  const aiResult = matchAIPattern(monster, player, distanceToPlayer);

  if (aiResult) {
    // 패턴이 매칭되면 해당 액션으로 AI 상태 변경
    switch (aiResult.action) {
      case 'chase':
      case 'move':
        monster.aiState = 'CHASE';
        break;
      case 'attack':
      case 'skill':
        monster.aiState = 'ATTACK';
        break;
      case 'flee':
      case 'defend':
        monster.aiState = 'RETREAT';
        break;
    }
  } else {
    // 기본 AI 로직 (패턴이 없을 때)
    if (hpPercent < 0.3) {
      monster.aiState = 'RETREAT';
    } else if (distanceToPlayer <= attackRange) {
      monster.aiState = 'ATTACK';
    } else {
      monster.aiState = 'CHASE';
    }
  }
}

/**
 * 스킬 선택 (패턴 기반)
 * @param monster 몬스터
 * @param player 플레이어
 * @param distanceToPlayer 플레이어까지의 거리
 * @returns 선택된 스킬 슬롯 번호 (1-4) 또는 null
 */
export function selectSkillByPattern(
  monster: MonsterState,
  player: CharacterState,
  distanceToPlayer: number
): number | null {
  const aiResult = matchAIPattern(monster, player, distanceToPlayer);
  
  if (aiResult && (aiResult.action === 'skill' || aiResult.action === 'attack') && aiResult.skillSlot) {
    return aiResult.skillSlot;
  }

  return null;
}

/**
 * 거리 계산 헬퍼
 */
export function calculateDistance(pos1: Position, pos2: Position): number {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 방향 벡터 계산 (정규화)
 */
export function calculateDirection(from: Position, to: Position): Position {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance === 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: dx / distance,
    y: dy / distance,
  };
}

/**
 * 각도 계산 (라디안)
 */
export function calculateAngle(from: Position, to: Position): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}
