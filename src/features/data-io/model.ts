import { MonsterTypeStats } from '../../components/MonsterTypeDefinition';
import { CharacterTypeInfo } from '../../lib/characterTypes';
import { CharacterConfig } from '../../lib/gameTypes';
import { ItemSlot } from '../../lib/itemSystem';
import { LevelConfig } from '../../lib/levelSystem';
import { DataRow } from '../../lib/mockData';
import { BasicAttackSlot, Skill } from '../../lib/skillSystem';

export interface GameDataState {
  playerConfig: CharacterConfig;
  monsterConfig: CharacterConfig;
  playerLevelConfig: LevelConfig;
  monsterLevelConfig: LevelConfig;
  skillConfigs: Record<string, Skill>;
  playerBasicAttack: BasicAttackSlot;
  monsterBasicAttack: BasicAttackSlot;
  itemSlots: ItemSlot[];
  characterTypes: CharacterTypeInfo[];
  monsterTypeStats: Record<string, MonsterTypeStats>;
  playerDataset: DataRow[];
  monsterDataset: DataRow[];
}

export interface GameDataSetters {
  onPlayerConfigChange: (config: CharacterConfig) => void;
  onMonsterConfigChange: (config: CharacterConfig) => void;
  onPlayerLevelConfigChange: (config: LevelConfig) => void;
  onMonsterLevelConfigChange: (config: LevelConfig) => void;
  onSkillConfigsChange: (configs: Record<string, Skill>) => void;
  onPlayerBasicAttackChange: (slot: BasicAttackSlot) => void;
  onMonsterBasicAttackChange: (slot: BasicAttackSlot) => void;
  onItemSlotsChange: (slots: ItemSlot[]) => void;
  onCharacterTypesChange: (types: CharacterTypeInfo[]) => void;
  onMonsterTypeStatsChange: (stats: Record<string, MonsterTypeStats>) => void;
  onPlayerDatasetChange: (dataset: DataRow[]) => void;
  onMonsterDatasetChange: (dataset: DataRow[]) => void;
}
