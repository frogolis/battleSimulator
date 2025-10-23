/**
 * 몬스터 리스폰 시스템
 * 몬스터 리스폰 규칙과 로직을 관리합니다.
 */

import { MonsterState } from './types';
import { createMonster } from './characters';
import { Skill } from '../skillSystem';
import { DEFAULT_RESPAWN_DELAY } from './constants';
import { LevelConfig } from '../levelSystem';

/**
 * 리스폰 설정
 */
export interface RespawnConfig {
  enabled: boolean; // 리스폰 활성화 여부
  delay: number; // 리스폰 딜레이 (밀리초)
  maxCount: number; // 최대 몬스터 수
  canvasWidth: number;
  canvasHeight: number;
}

/**
 * 리스폰 컨텍스트
 */
export interface RespawnContext {
  monsterDataset?: any[];
  selectedMonsterRows?: Set<number>;
  skillConfigs?: Record<string, Skill>;
  selectMonsterByWeight?: () => any | null;
  currentDataRow?: any;
  nextMonsterId: number; // 다음 몬스터 ID
  monsterLevelConfig?: LevelConfig; // 몬스터 레벨 설정
}

/**
 * 죽은 몬스터의 리스폰 타이머 업데이트
 * @param monsters 몬스터 배열
 * @param deltaTime 프레임 경과 시간 (밀리초)
 * @param config 리스폰 설정
 * @param context 리스폰 컨텍스트
 * @returns 리스폰된 몬스터 수
 */
export function updateRespawnTimers(
  monsters: MonsterState[],
  deltaTime: number,
  config: RespawnConfig,
  context: RespawnContext
): number {
  if (!config.enabled) return 0;

  let respawnedCount = 0;
  const aliveCount = monsters.filter((m) => !m.isDead).length;

  monsters.forEach((monster) => {
    if (monster.isDead && monster.respawnTimer > 0) {
      monster.respawnTimer -= deltaTime;

      // 리스폰 조건: 타이머 완료 & 최대 수 미만
      if (monster.respawnTimer <= 0 && aliveCount + respawnedCount < config.maxCount) {
        respawnMonster(monster, config, context);
        respawnedCount++;
      }
    }
  });

  return respawnedCount;
}

/**
 * 몬스터 리스폰
 * @param monster 리스폰할 몬스터
 * @param config 리스폰 설정
 * @param context 리스폰 컨텍스트
 */
export function respawnMonster(
  monster: MonsterState,
  config: RespawnConfig,
  context: RespawnContext
): void {
  // 가중치 기반 선택 또는 현재 데이터 행 사용
  const selectedMonster = context.selectMonsterByWeight?.() || null;
  const monsterData = selectedMonster || context.currentDataRow;

  // 새로운 몬스터 데이터로 초기화
  const newMonster = createMonster({
    id: context.nextMonsterId++,
    canvasWidth: config.canvasWidth,
    canvasHeight: config.canvasHeight,
    monsterData,
    skillConfigs: context.skillConfigs,
    monsterLevelConfig: context.monsterLevelConfig,
  });

  // 기존 몬스터 상태에 새 데이터 복사
  Object.assign(monster, newMonster);

  // 리스폰 완료
  monster.isDead = false;
  monster.respawnTimer = 0;
}

/**
 * 몬스터 사망 처리
 * @param monster 사망한 몬스터
 * @param respawnDelay 리스폰 딜레이 (밀리초)
 */
export function killMonster(monster: MonsterState, respawnDelay: number = DEFAULT_RESPAWN_DELAY): void {
  monster.isDead = true;
  monster.respawnTimer = respawnDelay;
  monster.stats.hp = 0;
}

/**
 * 살아있는 몬스터 수 계산
 * @param monsters 몬스터 배열
 * @returns 살아있는 몬스터 수
 */
export function countAliveMonsters(monsters: MonsterState[]): number {
  return monsters.filter((m) => !m.isDead).length;
}

/**
 * 리스폰 대기 중인 몬스터 수 계산
 * @param monsters 몬스터 배열
 * @returns 리스폰 대기 중인 몬스터 수
 */
export function countRespawningMonsters(monsters: MonsterState[]): number {
  return monsters.filter((m) => m.isDead && m.respawnTimer > 0).length;
}

/**
 * 모든 죽은 몬스터 즉시 리스폰
 * @param monsters 몬스터 배열
 * @param config 리스폰 설정
 * @param context 리스폰 컨텍스트
 * @returns 리스폰된 몬스터 수
 */
export function respawnAllDead(
  monsters: MonsterState[],
  config: RespawnConfig,
  context: RespawnContext
): number {
  let count = 0;
  const aliveCount = countAliveMonsters(monsters);

  monsters.forEach((monster) => {
    if (monster.isDead && aliveCount + count < config.maxCount) {
      respawnMonster(monster, config, context);
      count++;
    }
  });

  return count;
}
