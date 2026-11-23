/**
 * 캐릭터 데이터 관리
 * 플레이어와 몬스터의 초기화 및 상태 관리 로직
 */

import {
  loadMonsterAI,
  loadMonsterAIPattern,
  loadMonsterBasicAttack,
  loadMonsterSkills,
} from '../combatSystem';
import { defaultMonsterStats, defaultPlayerStats, MonsterStats } from '../gameData';
import { calculateLevelStats, LevelConfig } from '../levelSystem';
import { DataRow } from '../mockData';
import { defaultAIPatternConfig, type AIPatternConfig } from '../monsterAI';
import { BasicAttackSlot, defaultSkills, Skill } from '../skillSystem';
import { CharacterState, MonsterState } from './types';
import { validateMonsterStats } from './monsterStats';
import type { MonsterSpawnMapping } from './waves';

/**
 * 플레이어 캐릭터 초기화
 */
export function initializePlayer(
  canvasWidth: number,
  canvasHeight: number,
  testMode: boolean = false,
  basicAttack?: BasicAttackSlot | null
): CharacterState {
  if (!testMode && (
    !Number.isFinite(canvasWidth) ||
    !Number.isFinite(canvasHeight) ||
    canvasWidth <= 0 ||
    canvasHeight <= 0
  )) {
    throw new RangeError('Canvas dimensions must be positive finite numbers.');
  }

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
    basicAttack: basicAttack
      ? { ...basicAttack, skill: { ...basicAttack.skill } }
      : null,
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
  monsterData?: DataRow; // 데이터셋의 행
  fallbackName?: string;
  skillConfigs?: Record<string, Skill>;
  monsterLevelConfig?: LevelConfig; // 몬스터 레벨 설정
  requireMonsterStats?: boolean;
}

function getSpawnCoordinate(size: number): number {
  if (!Number.isFinite(size) || size <= 0) {
    throw new RangeError('Canvas dimensions must be positive finite numbers.');
  }

  const margin = Math.min(50, size / 2);
  return margin + Math.random() * Math.max(0, size - margin * 2);
}

function validateMonsterExecutionId(id: number): void {
  if (!Number.isSafeInteger(id) || id < 0) {
    throw new RangeError('Monster execution IDs must be non-negative safe integers.');
  }
}

function cloneAIPatternConfig(config: AIPatternConfig): AIPatternConfig {
  return {
    ...config,
    patterns: config.patterns.map(pattern => ({
      ...pattern,
      conditions: pattern.conditions.map(condition => ({ ...condition })),
    })),
  };
}

/**
 * 단일 몬스터 초기화
 */
export function createMonster(params: MonsterInitParams): MonsterState {
  const { id, canvasWidth, canvasHeight, monsterData, fallbackName, skillConfigs, monsterLevelConfig, requireMonsterStats } = params;
  validateMonsterExecutionId(id);
  const result = requireMonsterStats ? validateMonsterStats(monsterData) : undefined;
  if (result && !result.ok) throw new Error(result.reason);
  const sourceStats = result?.ok ? { ...result.row } : undefined;

  // 몬스터 데이터에서 정보 추출
  const monsterName = monsterData?.monster_name || fallbackName || `몬스터 ${id + 1}`;
  const monsterColor = monsterData?.monster_color || '#ff6b6b';

  // AI 패턴 로드
  const aiPatternConfig = cloneAIPatternConfig(
    monsterData ? loadMonsterAIPattern(monsterData) : defaultAIPatternConfig
  );
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
  const monsterBasicAttackData = monsterData ? loadMonsterBasicAttack(monsterData) : null;
  const configuredBasicAttackSkill = monsterBasicAttackData
    ? skillConfigs?.[monsterBasicAttackData.id]
    : undefined;
  const fallbackBasicAttackSkill = monsterBasicAttackData
    ? defaultSkills[monsterBasicAttackData.id] ?? defaultSkills.meleeBasic
    : defaultSkills.meleeBasic;

  const monsterBasicAttackSlot = monsterBasicAttackData
    ? {
        skill: {
          ...(configuredBasicAttackSkill ?? fallbackBasicAttackSkill),
          id: monsterBasicAttackData.id,
          name: configuredBasicAttackSkill?.name ?? '기본 공격',
          category: 'basicAttack' as const,
          range: monsterBasicAttackData.range,
          area: monsterBasicAttackData.width,
          damageMultiplier: monsterBasicAttackData.damage,
          cooldown: monsterBasicAttackData.cooldown,
          spCost: monsterBasicAttackData.spCost,
          castTime: monsterBasicAttackData.castTime,
          currentCooldown: 0,
          isOnCooldown: false,
        },
        keyBinding: 'click' as const,
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
  if (sourceStats) {
    monsterStats = {
      ...monsterStats,
      hp: sourceStats.monster_hp,
      maxHp: sourceStats.monster_hp,
      atk: sourceStats.monster_attack,
      def: sourceStats.monster_defense,
      attack: sourceStats.monster_attack,
      defense: sourceStats.monster_defense,
      speed: sourceStats.monster_speed,
      accuracy: sourceStats.monster_accuracy / 100,
      critRate: sourceStats.monster_critical_rate / 100,
    };
  }

  return {
    id,
    sourceStats,
    position: {
      x: getSpawnCoordinate(canvasWidth),
      y: getSpawnCoordinate(canvasHeight),
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
    sp: sourceStats?.monster_sp ?? (monsterData?.monster_sp || 100),
    maxSP: sourceStats?.monster_sp ?? (monsterData?.monster_sp || 100),
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
  maxCount: number;
  canvasWidth: number;
  canvasHeight: number;
  skillConfigs?: Record<string, Skill>;
  selectMonsterByWeight?: () => DataRow | null;
  currentDataRow?: DataRow;
  startId?: number;
  fallbackNameStartIndex?: number;
  monsterLevelConfig?: LevelConfig; // 몬스터 레벨 설정
  requireMonsterStats?: boolean;
}

export function resolveMonsterCount(requestedCount: number, maxCount: number): number {
  if (!Number.isFinite(requestedCount) || !Number.isFinite(maxCount)) {
    throw new RangeError('Monster counts must be finite numbers.');
  }
  return Math.max(0, Math.min(Math.floor(requestedCount), Math.floor(maxCount)));
}

type RuntimeBasicAttack = {
  range: number;
  width: number;
  damage: number;
  cooldown: number;
  spCost: number;
  castTime: number;
};

const isRuntimeBasicAttack = (value: unknown): value is RuntimeBasicAttack => {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<RuntimeBasicAttack>;
  return [
    candidate.range,
    candidate.width,
    candidate.damage,
    candidate.cooldown,
    candidate.spCost,
    candidate.castTime,
  ].every(Number.isFinite);
};

const requireRuntimeBasicAttack = (value: unknown): RuntimeBasicAttack => {
  if (!isRuntimeBasicAttack(value)) {
    throw new TypeError('Basic attack settings must contain finite numeric values.');
  }
  return value;
};

/**
 * 여러 몬스터 일괄 초기화
 */
export function createMonsters(params: MonsterBatchInitParams): MonsterState[] {
  const {
    count,
    maxCount,
    canvasWidth,
    canvasHeight,
    skillConfigs,
    selectMonsterByWeight,
    currentDataRow,
    startId = 0,
    fallbackNameStartIndex = 0,
    monsterLevelConfig,
    requireMonsterStats,
  } = params;

  const monsters: MonsterState[] = [];
  const boundedCount = resolveMonsterCount(count, maxCount);
  validateMonsterExecutionId(startId);
  if (boundedCount > 0) {
    validateMonsterExecutionId(startId + boundedCount - 1);
  }

  for (let i = 0; i < boundedCount; i++) {
    // 가중치 기반 선택 또는 현재 데이터 행 사용
    const selectedMonster = selectMonsterByWeight?.() || null;
    const monsterData = selectedMonster || currentDataRow;

    monsters.push(
      createMonster({
        id: startId + i,
        canvasWidth,
        canvasHeight,
        monsterData,
        fallbackName: `몬스터 ${fallbackNameStartIndex + i + 1}`,
        skillConfigs,
        monsterLevelConfig,
        requireMonsterStats,
      })
    );
  }

  return monsters;
}

export function createMonstersForMappings(params: {
  monsterSpawns: readonly MonsterSpawnMapping[];
  monsterDataset: readonly DataRow[];
  maxCount: number;
  startId: number;
  canvasWidth: number;
  canvasHeight: number;
  skillConfigs?: Record<string, Skill>;
  monsterLevelConfig?: LevelConfig;
  requireMonsterStats?: boolean;
}): MonsterState[] {
  const {
    monsterSpawns,
    monsterDataset,
    maxCount,
    startId,
    canvasWidth,
    canvasHeight,
    skillConfigs,
    monsterLevelConfig,
    requireMonsterStats = true,
  } = params;
  if (!Number.isSafeInteger(maxCount) || maxCount < 1) {
    throw new RangeError('Maximum monster count must be a positive safe integer.');
  }

  let totalCount = 0;
  const mappedIds = new Set<string>();
  const resolvedMappings = monsterSpawns.map(mapping => {
    if (!mapping.monsterDefinitionId.trim() || mappedIds.has(mapping.monsterDefinitionId)) {
      throw new TypeError('Monster spawn mappings must use unique non-empty definition IDs.');
    }
    if (!Number.isSafeInteger(mapping.count) || mapping.count < 1) {
      throw new RangeError('Monster spawn counts must be positive safe integers.');
    }
    mappedIds.add(mapping.monsterDefinitionId);
    totalCount += mapping.count;
    if (!Number.isSafeInteger(totalCount) || totalCount > maxCount) {
      throw new RangeError(`Monster spawn count exceeds the maximum of ${maxCount}.`);
    }
    const monsterData = monsterDataset.find(
      row => row.monster_definition_id === mapping.monsterDefinitionId
    );
    if (!monsterData) {
      throw new TypeError(`Monster definition "${mapping.monsterDefinitionId}" was not found.`);
    }
    return { count: mapping.count, monsterData };
  });

  if (resolvedMappings.length === 0) {
    throw new TypeError('At least one monster spawn mapping is required.');
  }

  const monsters: MonsterState[] = [];
  for (const { count, monsterData } of resolvedMappings) {
    monsters.push(...createMonsters({
      count,
      maxCount: count,
      startId: startId + monsters.length,
      fallbackNameStartIndex: monsters.length,
      canvasWidth,
      canvasHeight,
      currentDataRow: { ...monsterData },
      skillConfigs,
      monsterLevelConfig,
      requireMonsterStats,
    }));
  }
  return monsters;
}

/**
 * 플레이어 기본 공격 업데이트
 */
export function updatePlayerBasicAttack(player: CharacterState, basicAttack: unknown): void {
  const attack = requireRuntimeBasicAttack(basicAttack);

  if (!player.basicAttack) {
    player.basicAttack = {
      skill: {
        ...defaultSkills.meleeBasic,
        range: attack.range,
        area: attack.width,
        damageMultiplier: attack.damage,
        cooldown: attack.cooldown,
        spCost: attack.spCost,
        castTime: attack.castTime,
      },
      keyBinding: 'click',
      ...attack,
    };
  } else {
    const runtimeAttack = player.basicAttack as typeof player.basicAttack &
      Partial<RuntimeBasicAttack>;
    runtimeAttack.range = attack.range;
    runtimeAttack.width = attack.width;
    runtimeAttack.damage = attack.damage;
    runtimeAttack.cooldown = attack.cooldown;
    runtimeAttack.spCost = attack.spCost;
    runtimeAttack.castTime = attack.castTime;

    if (player.basicAttack.skill) {
      player.basicAttack.skill.range = attack.range;
      player.basicAttack.skill.area = attack.width;
      player.basicAttack.skill.damageMultiplier = attack.damage;
      player.basicAttack.skill.cooldown = attack.cooldown;
      player.basicAttack.skill.spCost = attack.spCost;
      player.basicAttack.skill.castTime = attack.castTime;
    }
  }
}

/**
 * 몬스터 기본 공격 업데이트 (배치)
 */
export function updateMonsterBasicAttacks(monsters: MonsterState[], basicAttack: unknown): void {
  const attack = requireRuntimeBasicAttack(basicAttack);

  monsters.forEach(monster => {
    if (!monster.basicAttack) {
      monster.basicAttack = {
        skill: {
          ...defaultSkills.meleeBasic,
          range: attack.range,
          area: attack.width,
          damageMultiplier: attack.damage,
          cooldown: attack.cooldown,
          spCost: attack.spCost,
          castTime: attack.castTime,
        },
        keyBinding: 'click',
        ...attack,
      };
    } else {
      const runtimeAttack = monster.basicAttack as typeof monster.basicAttack &
        Partial<RuntimeBasicAttack>;
      runtimeAttack.range = attack.range;
      runtimeAttack.width = attack.width;
      runtimeAttack.damage = attack.damage;
      runtimeAttack.cooldown = attack.cooldown;
      runtimeAttack.spCost = attack.spCost;
      runtimeAttack.castTime = attack.castTime;

      if (monster.basicAttack.skill) {
        monster.basicAttack.skill.range = attack.range;
        monster.basicAttack.skill.area = attack.width;
        monster.basicAttack.skill.damageMultiplier = attack.damage;
        monster.basicAttack.skill.cooldown = attack.cooldown;
        monster.basicAttack.skill.spCost = attack.spCost;
        monster.basicAttack.skill.castTime = attack.castTime;
      }
    }
  });
}
