import { CharacterConfig, StatRange } from '../components/CharacterSettings';
import { CharacterType } from './gameTypes';

/**
 * 범위(StatRange)에서 랜덤 값을 반환합니다
 */
export function getRandomInRange(range: StatRange): number {
  return range.min + Math.random() * (range.max - range.min);
}

/**
 * 범위(StatRange)에서 중간 값을 반환합니다
 */
export function getMidInRange(range: StatRange): number {
  return (range.min + range.max) / 2;
}

/**
 * CharacterConfig의 범위를 실제 값으로 변환합니다 (랜덤)
 */
export interface ResolvedCharacterStats {
  size: number;
  speed: number;
  attack: number;
  defense: number;
  attackSpeed: number;
  accuracy: number;
  criticalRate: number;
  attackRange: number;
  attackWidth: number;
  attackType: CharacterType;
}

export function resolveCharacterConfig(config: CharacterConfig): ResolvedCharacterStats {
  return {
    size: getRandomInRange(config.size),
    speed: getRandomInRange(config.speed),
    attack: getRandomInRange(config.attack),
    defense: getRandomInRange(config.defense),
    attackSpeed: getRandomInRange(config.attackSpeed),
    accuracy: getRandomInRange(config.accuracy),
    criticalRate: getRandomInRange(config.criticalRate),
    attackRange: getRandomInRange(config.attackRange),
    attackWidth: getRandomInRange(config.attackWidth),
    attackType: config.attackType,
  };
}

/**
 * CharacterConfig의 범위를 중간 값으로 변환합니다
 */
export function resolveCharacterConfigMid(config: CharacterConfig): ResolvedCharacterStats {
  return {
    size: getMidInRange(config.size),
    speed: getMidInRange(config.speed),
    attack: getMidInRange(config.attack),
    defense: getMidInRange(config.defense),
    attackSpeed: getMidInRange(config.attackSpeed),
    accuracy: getMidInRange(config.accuracy),
    criticalRate: getMidInRange(config.criticalRate),
    attackRange: getMidInRange(config.attackRange),
    attackWidth: getMidInRange(config.attackWidth),
    attackType: config.attackType,
  };
}
