import type { CharacterTypeInfo } from '../../lib/characterTypes';
import type { CharacterConfig } from '../../lib/gameTypes';
import type { ItemSlot } from '../../lib/itemSystem';
import type { LevelConfig } from '../../lib/levelSystem';
import type { MonsterTypeStats } from '../../lib/monsterTypes';
import type { DataRow } from '../../lib/mockData';
import type { StageDefinition } from '../../lib/simulator/waves';
import type { BasicAttackSlot, EffectPreset, Skill, SkillSlot } from '../../lib/skillSystem';
import type { KeyBindings } from '../../components/KeyBindingSettings';

export interface WorkspaceSnapshot {
  version: 1;
  currentTick: number;
  keyBindings: KeyBindings;
  characterTypes: CharacterTypeInfo[];
  playerLevelConfig: LevelConfig;
  monsterLevelConfig: LevelConfig;
  playerBasicAttack: BasicAttackSlot;
  monsterBasicAttack: BasicAttackSlot;
  skillSlots: SkillSlot[];
  skillConfigs: Record<string, Skill>;
  customEffectPresets: EffectPreset[];
  itemSlots: ItemSlot[];
  homingProjectiles: boolean;
  maxMonsterCount: number;
  respawnDelay: number;
  monsterTypeStats: Record<string, MonsterTypeStats>;
  playerDataset: DataRow[];
  monsterDataset: DataRow[];
  stageDefinitions: StageDefinition[];
  activeStageId: string | null;
  selectedMonsterIds: string[];
  playerConfig: CharacterConfig;
  monsterConfig: CharacterConfig;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function isWorkspaceSnapshot(value: unknown): value is WorkspaceSnapshot {
  if (!isRecord(value) || value.version !== 1) return false;
  const recordFields = [
    'keyBindings',
    'playerLevelConfig',
    'monsterLevelConfig',
    'playerBasicAttack',
    'monsterBasicAttack',
    'skillConfigs',
    'monsterTypeStats',
    'playerConfig',
    'monsterConfig',
  ];
  const arrayFields = [
    'characterTypes',
    'skillSlots',
    'customEffectPresets',
    'itemSlots',
    'playerDataset',
    'monsterDataset',
    'stageDefinitions',
    'selectedMonsterIds',
  ];

  return (
    Number.isSafeInteger(value.currentTick) &&
    Number(value.currentTick) >= 0 &&
    recordFields.every(field => isRecord(value[field])) &&
    arrayFields.every(field => Array.isArray(value[field])) &&
    (value.activeStageId === null || typeof value.activeStageId === 'string') &&
    typeof value.homingProjectiles === 'boolean' &&
    Number.isSafeInteger(value.maxMonsterCount) &&
    Number(value.maxMonsterCount) >= 1 &&
    typeof value.respawnDelay === 'number' &&
    Number.isFinite(value.respawnDelay) &&
    Number(value.respawnDelay) >= 0 &&
    (value.selectedMonsterIds as unknown[]).every(id => typeof id === 'string')
  );
}
