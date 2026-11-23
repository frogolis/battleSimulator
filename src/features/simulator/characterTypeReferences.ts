import type { CharacterConfig } from '../../lib/gameTypes';
import type { DataRow } from '../../lib/mockData';
import type { MonsterTypeStats } from '../../lib/monsterTypes';

export interface CharacterTypeReferenceSources {
  playerConfig: Pick<CharacterConfig, 'typeId'>;
  monsterConfig: Pick<CharacterConfig, 'typeId'>;
  monsterTypeStats: Record<string, Pick<MonsterTypeStats, 'characterType'>>;
  playerDataset: ReadonlyArray<Pick<DataRow, 'player_attack_type'>>;
  monsterDataset: ReadonlyArray<Pick<DataRow, 'monster_attack_type'>>;
}

export function findCharacterTypeReferences(
  id: string,
  sources: CharacterTypeReferenceSources
): string[] {
  const references: string[] = [];
  if (sources.playerConfig.typeId === id) references.push('플레이어 설정');
  if (sources.monsterConfig.typeId === id) references.push('몬스터 설정');
  if (Object.values(sources.monsterTypeStats).some(type => type.characterType === id)) {
    references.push('몬스터 타입 정의');
  }
  if (sources.playerDataset.some(row => row.player_attack_type === id)) {
    references.push('플레이어 데이터');
  }
  if (sources.monsterDataset.some(row => row.monster_attack_type === id)) {
    references.push('몬스터 데이터');
  }
  return references;
}
