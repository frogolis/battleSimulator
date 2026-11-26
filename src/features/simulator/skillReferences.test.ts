import { describe, expect, it } from 'vitest';
import {
  monsterDatasetSkillFields,
  playerDatasetSkillFields,
} from '../../../shared/referenceValidation.mjs';
import { mockDataset } from '../../lib/mockData';
import type { AIPatternConfig } from '../../lib/monsterAI';
import { findSkillReferences, type SkillReferenceSources } from './skillReferences';

const sources = (): SkillReferenceSources => ({
  characterTypes: [],
  monsterTypeStats: {},
  playerDataset: [],
  monsterDataset: [],
});

const pattern = (id: string): AIPatternConfig => ({
  patterns: [{ action: 'skill', skillId: id, conditions: [], enabled: false }],
  aggroRange: 100,
  chaseMinDistance: 0,
});

describe('findSkillReferences', () => {
  it('finds character, monster type, data row and AI references', () => {
    const data = sources();
    data.characterTypes = [{
      id: 'hero', name: '영웅', description: '', color: '', defaultSkillIds: ['custom'],
      defaultAIPattern: pattern('custom'),
    }];
    data.monsterTypeStats = {
      enemy: {
        characterType: 'hero', baseLevel: 1, size: 20, aiPattern: 'aggressive',
        skills: ['custom'], aiPatternConfig: pattern('custom'),
      },
    };
    data.playerDataset = [{ ...mockDataset[0], player_basic_attack_id: 'custom' }];
    data.monsterDataset = [{
      ...mockDataset[0], monster_skill_4_id: 'custom',
      monster_ai_patterns: JSON.stringify(pattern('custom')),
    }];

    expect(findSkillReferences('custom', data)).toEqual([
      '캐릭터 타입 영웅', '몬스터 타입 enemy', '플레이어 데이터 행 0',
      '몬스터 데이터 행 0', '몬스터 데이터 행 0 AI 패턴',
    ]);
    expect(findSkillReferences('unused', data)).toEqual([]);
  });

  it.each(playerDatasetSkillFields)('checks player row field %s', field => {
    const data = sources();
    data.playerDataset = [{ ...mockDataset[0], [field]: 'custom' }];
    expect(findSkillReferences('custom', data)).toContain('플레이어 데이터 행 0');
  });

  it.each(monsterDatasetSkillFields)('checks monster row field %s', field => {
    const data = sources();
    data.monsterDataset = [{ ...mockDataset[0], [field]: 'custom' }];
    expect(findSkillReferences('custom', data)).toContain('몬스터 데이터 행 0');
  });

  it('finds a basic attack ID and AI-only references on character and monster types', () => {
    const data = sources();
    data.characterTypes = [{
      id: 'hero', name: '영웅', description: '', color: '', defaultBasicAttackId: 'basic',
      defaultAIPattern: pattern('custom'),
    }];
    data.monsterTypeStats = {
      enemy: {
        characterType: 'hero', baseLevel: 1, size: 20, aiPattern: 'aggressive',
        skills: [], aiPatternConfig: pattern('custom'),
      },
    };
    expect(findSkillReferences('basic', data)).toEqual(['캐릭터 타입 영웅']);
    expect(findSkillReferences('custom', data)).toEqual(['캐릭터 타입 영웅', '몬스터 타입 enemy']);
  });

  it('preserves legacy AI slot semantics while still checking direct references', () => {
    const data = sources();
    data.monsterDataset = [{ ...mockDataset[0], monster_ai_patterns: JSON.stringify(pattern('skill1')) }];
    expect(findSkillReferences('skill1', data)).toEqual([]);
    data.monsterDataset[0].monster_skill_1_id = 'skill1';
    expect(findSkillReferences('skill1', data)).toEqual(['몬스터 데이터 행 0']);
  });

  it.each(['{broken', '{}'])('blocks deletion if AI data cannot be inspected: %s', raw => {
    const data = sources();
    data.monsterDataset = [{ ...mockDataset[0], monster_ai_patterns: raw }];
    expect(() => findSkillReferences('custom', data)).toThrow(/몬스터 데이터 행 0.*AI 패턴/);
  });
});
