import { DataRow, mockDataset } from '../../lib/mockData';
import { defaultAIPatternConfig } from '../../lib/monsterAI';
import type { MonsterTypeStats } from '../../lib/monsterTypes';

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
    .map((row, index) => {
      const monsterRow = {
        ...row,
        monster_definition_id:
          row.monster_definition_id?.trim() || `monster_seed_${index + 1}`,
      };
      if (!monsterRow.monster_ai_patterns) {
        return {
          ...monsterRow,
          monster_ai_patterns: JSON.stringify(defaultAIPatternConfig),
        };
      }
      return monsterRow;
    });

  return { playerDataset, monsterDataset };
}
