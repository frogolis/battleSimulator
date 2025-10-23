/**
 * 레벨 기반 능력치 자동 계산 시스템
 * - 레벨, 크기는 독립 변수 (사용자가 직접 설정)
 * - HP, SP, 나머지 능력치는 종속 변수 (레벨에 의해 자동 계산)
 */

import { LevelConfig } from './levelSystem';
import { CharacterTypeInfo } from './characterTypes';

/**
 * 포뮬러 문자열을 평가하여 숫자 값을 반환
 */
function evaluateFormula(formula: string | undefined, level: number, size: number): number {
  if (!formula || formula.trim() === '') {
    return 0;
  }

  try {
    // 변수 치환
    let expression = formula
      .replace(/level/gi, String(level))
      .replace(/size/gi, String(size))
      .replace(/LEVEL/g, String(level))
      .replace(/SIZE/g, String(size));

    // 기본 함수 지원
    expression = expression
      .replace(/MAX\((.*?),(.*?)\)/gi, (_, a, b) => `Math.max(${a},${b})`)
      .replace(/MIN\((.*?),(.*?)\)/gi, (_, a, b) => `Math.min(${a},${b})`)
      .replace(/ROUND\((.*?)\)/gi, (_, a) => `Math.round(${a})`)
      .replace(/FLOOR\((.*?)\)/gi, (_, a) => `Math.floor(${a})`)
      .replace(/CEIL\((.*?)\)/gi, (_, a) => `Math.ceil(${a})`)
      .replace(/SQRT\((.*?)\)/gi, (_, a) => `Math.sqrt(${a})`)
      .replace(/\^/g, '**'); // 거듭제곱

    // 안전한 평가
    const result = Function(`"use strict"; return (${expression})`)();
    return typeof result === 'number' && !isNaN(result) ? result : 0;
  } catch (error) {
    console.error(`포뮬러 평가 오류: ${formula}`, error);
    return 0;
  }
}

export interface LevelBasedStats {
  // 독립 변수
  level: number;
  size: number;
  
  // 종속 변수 (레벨에 의해 계산됨)
  hp: number;
  sp: number;
  speed: number;
  attack: number;
  defense: number;
  attackSpeed: number;
  accuracy: number;
  criticalRate: number;
}

/**
 * 타입별 포뮬러를 사용한 능력치 계산
 */
export function calculateStatsWithFormula(
  level: number, 
  size: number, 
  levelConfig: LevelConfig,
  typeInfo?: CharacterTypeInfo,
  isPlayer: boolean = true
): LevelBasedStats {
  // 타입 정보가 있고 포뮬러가 설정되어 있으면 포뮬러 사용
  if (typeInfo?.statFormulas) {
    const formulas = typeInfo.statFormulas;
    
    return {
      level,
      size,
      hp: formulas.hpFormula 
        ? evaluateFormula(formulas.hpFormula, level, size)
        : levelConfig.baseHp + (level - 1) * levelConfig.hpPerLevel,
      sp: formulas.spFormula 
        ? evaluateFormula(formulas.spFormula, level, size)
        : levelConfig.baseSp + (level - 1) * levelConfig.spPerLevel,
      speed: formulas.moveSpeedFormula 
        ? evaluateFormula(formulas.moveSpeedFormula, level, size)
        : (isPlayer ? 150 : 60) + (level - 1) * (isPlayer ? 2 : 1),
      attack: formulas.attackFormula 
        ? evaluateFormula(formulas.attackFormula, level, size)
        : levelConfig.baseAttack + (level - 1) * levelConfig.attackPerLevel,
      defense: formulas.defenseFormula 
        ? evaluateFormula(formulas.defenseFormula, level, size)
        : levelConfig.baseDefense + (level - 1) * levelConfig.defensePerLevel,
      attackSpeed: formulas.attackSpeedFormula 
        ? evaluateFormula(formulas.attackSpeedFormula, level, size)
        : (isPlayer ? 1.5 : 1.0) + (level - 1) * (isPlayer ? 0.02 : 0.01),
      accuracy: Math.min(100, Math.round((isPlayer ? 85 : 75) + (level - 1) * (isPlayer ? 0.3 : 0.25))),
      criticalRate: Math.min(100, Math.round((isPlayer ? 25 : 15) + (level - 1) * (isPlayer ? 0.5 : 0.3))),
    };
  }
  
  // 기본 계산 (타입 정보 없거나 포뮬러 없을 때)
  return isPlayer 
    ? calculatePlayerStatsDefault(level, size, levelConfig)
    : calculateMonsterStatsDefault(level, size, levelConfig);
}

/**
 * 플레이어 레벨 기반 능력치 계산 (기본)
 */
function calculatePlayerStatsDefault(level: number, size: number, levelConfig: LevelConfig): LevelBasedStats {
  // 기본 스탯
  const baseSpeed = 150;
  const baseAttackSpeed = 1.5;
  const baseAccuracy = 85;
  const baseCriticalRate = 25;
  
  // 레벨당 증가량
  const speedPerLevel = 2;        // 레벨당 +2
  const attackSpeedPerLevel = 0.02; // 레벨당 +0.02
  const accuracyPerLevel = 0.3;   // 레벨당 +0.3%
  const criticalRatePerLevel = 0.5; // 레벨당 +0.5%
  
  return {
    level,
    size,
    hp: levelConfig.baseHp + (level - 1) * levelConfig.hpPerLevel,
    sp: levelConfig.baseSp + (level - 1) * levelConfig.spPerLevel,
    speed: Math.round(baseSpeed + (level - 1) * speedPerLevel),
    attack: levelConfig.baseAttack + (level - 1) * levelConfig.attackPerLevel,
    defense: levelConfig.baseDefense + (level - 1) * levelConfig.defensePerLevel,
    attackSpeed: Math.round((baseAttackSpeed + (level - 1) * attackSpeedPerLevel) * 10) / 10,
    accuracy: Math.min(100, Math.round(baseAccuracy + (level - 1) * accuracyPerLevel)),
    criticalRate: Math.min(100, Math.round(baseCriticalRate + (level - 1) * criticalRatePerLevel)),
  };
}

/**
 * 플레이어 레벨 기반 능력치 계산 (레거시 - 하위 호환성)
 */
export function calculatePlayerStats(level: number, size: number, levelConfig: LevelConfig): LevelBasedStats {
  return calculatePlayerStatsDefault(level, size, levelConfig);
}

/**
 * 몬스터 레벨 기반 능력치 계산 (기본)
 */
function calculateMonsterStatsDefault(level: number, size: number, levelConfig: LevelConfig): LevelBasedStats {
  // 기본 스탯
  const baseSpeed = 60;
  const baseAttackSpeed = 1.0;
  const baseAccuracy = 75;
  const baseCriticalRate = 15;
  
  // 레벨당 증가량
  const speedPerLevel = 1;        // 레벨당 +1
  const attackSpeedPerLevel = 0.01; // 레벨당 +0.01
  const accuracyPerLevel = 0.25;  // 레벨당 +0.25%
  const criticalRatePerLevel = 0.3; // 레벨당 +0.3%
  
  return {
    level,
    size,
    hp: levelConfig.baseHp + (level - 1) * levelConfig.hpPerLevel,
    sp: levelConfig.baseSp + (level - 1) * levelConfig.spPerLevel,
    speed: Math.round(baseSpeed + (level - 1) * speedPerLevel),
    attack: levelConfig.baseAttack + (level - 1) * levelConfig.attackPerLevel,
    defense: levelConfig.baseDefense + (level - 1) * levelConfig.defensePerLevel,
    attackSpeed: Math.round((baseAttackSpeed + (level - 1) * attackSpeedPerLevel) * 10) / 10,
    accuracy: Math.min(100, Math.round(baseAccuracy + (level - 1) * accuracyPerLevel)),
    criticalRate: Math.min(100, Math.round(baseCriticalRate + (level - 1) * criticalRatePerLevel)),
  };
}

/**
 * 몬스터 레벨 기반 능력치 계산 (레거시 - 하위 호환성)
 */
export function calculateMonsterStats(level: number, size: number, levelConfig: LevelConfig): LevelBasedStats {
  return calculateMonsterStatsDefault(level, size, levelConfig);
}

/**
 * DataRow를 레벨 기반으로 업데이트
 */
export function updateDataRowWithLevel(
  row: any,
  isPlayer: boolean,
  levelConfig: LevelConfig,
  level?: number,
  size?: number,
  typeInfo?: CharacterTypeInfo
): any {
  const prefix = isPlayer ? 'player' : 'monster';
  const currentLevel = level !== undefined ? level : (row[`${prefix}_level`] || 1);
  const currentSize = size !== undefined ? size : (row[`${prefix}_size`] || (isPlayer ? 20 : 24));
  
  const stats = calculateStatsWithFormula(currentLevel, currentSize, levelConfig, typeInfo, isPlayer);
  
  return {
    ...row,
    [`${prefix}_level`]: stats.level,
    [`${prefix}_size`]: stats.size,
    [`${prefix}_hp`]: stats.hp,
    [`${prefix}_sp`]: stats.sp,
    [`${prefix}_speed`]: stats.speed,
    [`${prefix}_attack`]: stats.attack,
    [`${prefix}_defense`]: stats.defense,
    [`${prefix}_attack_speed`]: stats.attackSpeed,
    [`${prefix}_accuracy`]: stats.accuracy,
    [`${prefix}_critical_rate`]: stats.criticalRate,
  };
}
