import type { AIPatternConfig } from './monsterAI';

export interface MonsterTypeStats {
  characterType: string;
  baseLevel: number;
  size: number;
  aiPattern: string;
  skills: string[];
  aiPatternConfig?: AIPatternConfig;
}
