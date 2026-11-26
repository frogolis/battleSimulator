import { getAIPatternConfigError } from '../../../shared/aiPatternValidation.mjs';
import {
  hasSkillReference,
  monsterDatasetSkillFields,
  playerDatasetSkillFields,
} from '../../../shared/referenceValidation.mjs';
import type { CharacterTypeInfo } from '../../lib/characterTypes';
import type { DataRow } from '../../lib/mockData';
import type { AIPatternConfig } from '../../lib/monsterAI';
import type { MonsterTypeStats } from '../../lib/monsterTypes';

export interface SkillReferenceSources {
  characterTypes: CharacterTypeInfo[];
  monsterTypeStats: Record<string, MonsterTypeStats>;
  playerDataset: DataRow[];
  monsterDataset: DataRow[];
}

function patternReferencesSkill(config: AIPatternConfig | undefined, id: string): boolean {
  return !!config?.patterns.some(
    pattern =>
      (pattern.action === 'attack' || pattern.action === 'skill') && pattern.skillId === id
  );
}

function isAIPatternConfig(value: unknown): value is AIPatternConfig {
  return getAIPatternConfigError(value, 'aiPattern') === undefined;
}

export function findSkillReferences(id: string, sources: SkillReferenceSources): string[] {
  const references: string[] = [];
  const legacySlot = hasSkillReference(id, [], true);
  sources.characterTypes.forEach((type, index) => {
    if (!legacySlot && type.defaultAIPattern && !isAIPatternConfig(type.defaultAIPattern)) {
      throw new Error(`캐릭터 타입 ${type.name || index + 1}의 AI 패턴을 확인할 수 없습니다.`);
    }
    if (
      type.defaultBasicAttackId === id ||
      type.defaultSkillIds?.includes(id) ||
      (!legacySlot && patternReferencesSkill(type.defaultAIPattern, id))
    ) {
      references.push(`캐릭터 타입 ${type.name || index + 1}`);
    }
  });
  Object.entries(sources.monsterTypeStats).forEach(([key, stats]) => {
    if (!legacySlot && stats.aiPatternConfig && !isAIPatternConfig(stats.aiPatternConfig)) {
      throw new Error(`몬스터 타입 ${key}의 AI 패턴을 확인할 수 없습니다.`);
    }
    if (stats.skills.includes(id) || (!legacySlot && patternReferencesSkill(stats.aiPatternConfig, id))) {
      references.push(`몬스터 타입 ${key}`);
    }
  });
  sources.playerDataset.forEach((row, index) => {
    if (playerDatasetSkillFields.some(field => row[field] === id)) {
      references.push(`플레이어 데이터 행 ${index}`);
    }
  });
  sources.monsterDataset.forEach((row, index) => {
    if (monsterDatasetSkillFields.some(field => row[field] === id)) {
      references.push(`몬스터 데이터 행 ${index}`);
    }
    if (legacySlot || !row.monster_ai_patterns) return;
    let config: unknown;
    try {
      config = JSON.parse(row.monster_ai_patterns);
    } catch {
      throw new Error(`몬스터 데이터 행 ${index}의 AI 패턴을 확인할 수 없습니다.`);
    }
    if (!isAIPatternConfig(config)) {
      throw new Error(`몬스터 데이터 행 ${index}의 AI 패턴을 확인할 수 없습니다.`);
    }
    if (patternReferencesSkill(config, id)) {
      references.push(`몬스터 데이터 행 ${index} AI 패턴`);
    }
  });
  return references;
}
