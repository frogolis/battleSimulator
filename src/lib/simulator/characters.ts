/**
 * 캐릭터 데이터 관리
 * 플레이어와 몬스터의 초기화 및 상태 관리 로직
 */

import { CharacterState, MonsterState, Position } from './types';
import { CharacterConfig } from '../../components/CharacterSettings';
import { defaultPlayerStats, defaultMonsterStats, MonsterStats } from '../gameData';
import { Skill } from '../skillSystem';
import {
  loadMonsterSkills,
  loadMonsterAI,
  loadMonsterAIPattern,
  loadMonsterBasicAttack,
} from '../combatSystem';
import { defaultAIPatternConfig } from '../monsterAI';
import { LevelConfig, calculateLevelStats } from '../levelSystem';

/**
 * 플레이어 캐릭터 초기화
 */
export function initializePlayer(
  canvasWidth: number,
  canvasHeight: number,
  testMode: boolean = false,
  basicAttack?: any
): CharacterState {
  return {
    position: testMode ? { x: 0, y: 0 } : { x: canvasWidth / 2, y: canvasHeight / 2 },
    stats: { ...defaultPlayerStats },
    isAttacking: false,
    isSkilling: false,
    attackCooldown: 0,
    meleeSwingStart: null,
    meleeSwingAngle: 0,
    meleeSwingHit: new Set(),
    skillSwingStart: null,
    skillSwingAngle: 0,
    skillSwingHit: new Set(),
    activeSkillType: null,
    activeSkillDamageMultiplier: 1.0,
    playerScale: 1,
    shakeOffset: { x: 0, y: 0 },
    skills: { slot1: null, slot2: null, slot3: null, slot4: null },
    basicAttack: basicAttack || null,
    skillPhase: 'idle' as const,
    skillPhaseStartTime: 0,
    currentSkillTiming: undefined,
  };
}

/**
 * 몬스터 초기화 파라미터
 */
interface MonsterInitParams {
  id: number;
  canvasWidth: number;
  canvasHeight: number;
  monsterData?: any; // 데이터셋의 행
  skillConfigs?: Record<string, Skill>;
  monsterLevelConfig?: LevelConfig; // 몬스터 레벨 설정
}

/**
 * 단일 몬스터 초기화
 */
export function createMonster(params: MonsterInitParams): MonsterState {
  const { id, canvasWidth, canvasHeight, monsterData, skillConfigs, monsterLevelConfig } = params;

  // 몬스터 데이터에서 정보 추출
  const monsterName = monsterData?.monster_name || `몬스터 ${id + 1}`;
  const monsterColor = monsterData?.monster_color || '#ff6b6b';

  // AI 패턴 로드
  const aiPatternConfig = monsterData
    ? loadMonsterAIPattern(monsterData)
    : defaultAIPatternConfig;
  const aiConfig = monsterData
    ? loadMonsterAI(monsterData)
    : {
        type: 'aggressive' as const,
        aggroRange: 300,
        skillPriority: 'damage' as const,
      };

  // 스킬 로드
  const monsterSkills = monsterData
    ? loadMonsterSkills(monsterData)
    : {
        slot1: null,
        slot2: null,
        slot3: null,
        slot4: null,
      };

  // 기본 공격 로드
  const monsterBasicAttackData = monsterData
    ? loadMonsterBasicAttack(monsterData)
    : null;

  const monsterBasicAttackSlot = monsterBasicAttackData
    ? {
        skill: skillConfigs?.[monsterBasicAttackData.id] || {
          id: monsterBasicAttackData.id,
          name: '기본 공격',
          category: 'basicAttack' as const,
          range: monsterBasicAttackData.range,
          area: monsterBasicAttackData.width,
          damageMultiplier: monsterBasicAttackData.damage,
          cooldown: monsterBasicAttackData.cooldown,
          spCost: monsterBasicAttackData.spCost,
          castTime: monsterBasicAttackData.castTime,
          visual: {
            effectShape: 'cone' as const,
            color: '#ef4444',
            secondaryColor: '#f87171',
            particleCount: 0,
            particleSize: 4,
            particleLifetime: 300,
          },
          animation: {
            castAnimation: 'none' as const,
            castScale: 1,
            cameraShake: 0,
          },
        },
        range: monsterBasicAttackData.range,
        width: monsterBasicAttackData.width,
        damage: monsterBasicAttackData.damage,
        cooldown: monsterBasicAttackData.cooldown,
        spCost: monsterBasicAttackData.spCost,
        castTime: monsterBasicAttackData.castTime,
      }
    : null;

  // 레벨 시스템을 사용하는 경우 레벨에 맞는 스탯 계산
  let monsterStats: MonsterStats;
  if (monsterLevelConfig) {
    const levelStats = calculateLevelStats(monsterLevelConfig);
    monsterStats = {
      hp: levelStats.hp,
      maxHp: levelStats.hp,
      attack: levelStats.attack,
      defense: levelStats.defense,
      speed: levelStats.speed,
      attackRange: defaultMonsterStats.attackRange,
      attackWidth: defaultMonsterStats.attackWidth,
      critRate: defaultMonsterStats.critRate || 0.05,
      critDamage: defaultMonsterStats.critDamage || 1.3,
      accuracy: defaultMonsterStats.accuracy || 0.85,
      evasion: defaultMonsterStats.evasion || 0.03,
    };
  } else {
    monsterStats = { ...defaultMonsterStats };
  }

  return {
    id,
    position: {
      x: Math.random() * (canvasWidth - 100) + 50,
      y: Math.random() * (canvasHeight - 100) + 50,
    },
    stats: monsterStats,
    isAttacking: false,
    attackCooldown: 0,
    isDead: false,
    aiState: 'CHASE',
    wanderTarget: null,
    wanderCooldown: 0,
    detectionRange: 9999, // 무제한 감지 범위
    respawnTimer: 0,
    velocity: { x: 0, y: 0 },
    knockbackTime: 0,
    name: monsterName,
    color: monsterColor,
    skills: monsterSkills,
    basicAttack: monsterBasicAttackSlot,
    aiConfig,
    aiPatternConfig,
    sp: monsterData?.monster_sp || 100,
    maxSP: monsterData?.monster_sp || 100,
    currentSkill: null,
    skillPhase: 'idle' as const,
    skillPhaseStartTime: 0,
    currentSkillTiming: undefined,
  };
}

/**
 * 몬스터 배치 초기화 파라미터
 */
interface MonsterBatchInitParams {
  count: number;
  canvasWidth: number;
  canvasHeight: number;
  monsterDataset?: any[];
  selectedMonsterRows?: Set<number>;
  skillConfigs?: Record<string, Skill>;
  selectMonsterByWeight?: () => any | null;
  currentDataRow?: any;
  startId?: number;
  monsterLevelConfig?: LevelConfig; // 몬스터 레벨 설정
}

/**
 * 여러 몬스터 일괄 초기화
 */
export function createMonsters(params: MonsterBatchInitParams): MonsterState[] {
  const {
    count,
    canvasWidth,
    canvasHeight,
    skillConfigs,
    selectMonsterByWeight,
    currentDataRow,
    startId = 0,
    monsterLevelConfig,
  } = params;

  const monsters: MonsterState[] = [];

  for (let i = 0; i < count; i++) {
    // 가중치 기반 선택 또는 현재 데이터 행 사용
    const selectedMonster = selectMonsterByWeight?.() || null;
    const monsterData = selectedMonster || currentDataRow;

    monsters.push(
      createMonster({
        id: startId + i,
        canvasWidth,
        canvasHeight,
        monsterData,
        skillConfigs,
        monsterLevelConfig,
      })
    );
  }

  return monsters;
}

/**
 * 플레이어 기본 공격 업데이트
 */
export function updatePlayerBasicAttack(
  player: CharacterState,
  basicAttack: any
): void {
  if (!basicAttack) return;

  if (!player.basicAttack) {
    player.basicAttack = { ...basicAttack };
  } else {
    player.basicAttack.range = basicAttack.range;
    player.basicAttack.width = basicAttack.width;
    player.basicAttack.damage = basicAttack.damage;
    player.basicAttack.cooldown = basicAttack.cooldown;
    player.basicAttack.spCost = basicAttack.spCost;
    player.basicAttack.castTime = basicAttack.castTime;

    if (player.basicAttack.skill) {
      player.basicAttack.skill.range = basicAttack.range;
      player.basicAttack.skill.area = basicAttack.width;
      player.basicAttack.skill.damageMultiplier = basicAttack.damage;
      player.basicAttack.skill.cooldown = basicAttack.cooldown;
      player.basicAttack.skill.spCost = basicAttack.spCost;
      player.basicAttack.skill.castTime = basicAttack.castTime;
    }
  }
}

/**
 * 몬스터 기본 공격 업데이트 (배치)
 */
export function updateMonsterBasicAttacks(
  monsters: MonsterState[],
  basicAttack: any
): void {
  if (!basicAttack) return;

  monsters.forEach((monster) => {
    if (!monster.basicAttack) {
      monster.basicAttack = { ...basicAttack };
    } else {
      monster.basicAttack.range = basicAttack.range;
      monster.basicAttack.width = basicAttack.width;
      monster.basicAttack.damage = basicAttack.damage;
      monster.basicAttack.cooldown = basicAttack.cooldown;
      monster.basicAttack.spCost = basicAttack.spCost;
      monster.basicAttack.castTime = basicAttack.castTime;

      if (monster.basicAttack.skill) {
        monster.basicAttack.skill.range = basicAttack.range;
        monster.basicAttack.skill.area = basicAttack.width;
        monster.basicAttack.skill.damageMultiplier = basicAttack.damage;
        monster.basicAttack.skill.cooldown = basicAttack.cooldown;
        monster.basicAttack.skill.spCost = basicAttack.spCost;
        monster.basicAttack.skill.castTime = basicAttack.castTime;
      }
    }
  });
}
