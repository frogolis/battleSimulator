import { MonsterTypeStats } from '../../components/MonsterTypeDefinition';
import { DataRow, mockDataset } from '../../lib/mockData';
import { defaultAIPatternConfig } from '../../lib/monsterAI';

export function createInitialMonsterTypeStats(): Record<string, MonsterTypeStats> {
  return {
    warrior: {
      characterType: 'warrior',
      baseLevel: 1,
      size: 24,
      aiPattern: 'aggressive',
      skills: ['powerSlash', 'whirlwind'],
      aiPatternConfig: { ...defaultAIPatternConfig },
    },
    archer: {
      characterType: 'archer',
      baseLevel: 1,
      size: 20,
      aiPattern: 'ranged',
      skills: ['powerSlash', 'heal'],
      aiPatternConfig: { ...defaultAIPatternConfig },
    },
  };
}

export function createInitialDatasets(): { playerDataset: DataRow[]; monsterDataset: DataRow[] } {
  const playerDataset = mockDataset.filter(row => row.player_size !== undefined);
  const monsterDataset = mockDataset
    .filter(row => row.monster_size !== undefined)
    .map(row => {
      if (!row.monster_ai_patterns) {
        return {
          ...row,
          monster_ai_patterns: JSON.stringify(defaultAIPatternConfig),
        };
      }
      return row;
    });

  return { playerDataset, monsterDataset };
}
