import { describe, expect, it } from 'vitest';
import { findCharacterTypeReferences, type CharacterTypeReferenceSources } from './characterTypeReferences';

const emptySources = (): CharacterTypeReferenceSources => ({
  playerConfig: { typeId: 'other' },
  monsterConfig: { typeId: 'other' },
  monsterTypeStats: {},
  playerDataset: [],
  monsterDataset: [],
});

describe('findCharacterTypeReferences', () => {
  it('reports all places that refer to a type, without repeating a data category', () => {
    const sources: CharacterTypeReferenceSources = {
      playerConfig: { typeId: 'custom' },
      monsterConfig: { typeId: 'custom' },
      monsterTypeStats: { first: { characterType: 'custom' }, second: { characterType: 'custom' } },
      playerDataset: [{ player_attack_type: 'custom' }, { player_attack_type: 'custom' }],
      monsterDataset: [{ monster_attack_type: 'custom' }],
    };

    expect(findCharacterTypeReferences('custom', sources)).toEqual([
      '플레이어 설정', '몬스터 설정', '몬스터 타입 정의', '플레이어 데이터', '몬스터 데이터',
    ]);
  });

  it('does not block a type that has no references', () => {
    const sources = emptySources();
    sources.playerDataset = [{ player_attack_type: 'other' }];
    sources.monsterDataset = [{ monster_attack_type: 'other' }, {}];
    expect(findCharacterTypeReferences('custom', sources)).toEqual([]);
  });
});
