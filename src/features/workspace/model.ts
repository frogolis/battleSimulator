import type { CharacterTypeInfo } from '../../lib/characterTypes';
import type { CharacterConfig } from '../../lib/gameTypes';
import type { ItemSlot } from '../../lib/itemSystem';
import type { LevelConfig } from '../../lib/levelSystem';
import type { MonsterTypeStats } from '../../lib/monsterTypes';
import type { DataRow } from '../../lib/mockData';
import type { StageDefinition } from '../../lib/simulator/waves';
import type { BasicAttackSlot, EffectPreset, Skill, SkillSlot } from '../../lib/skillSystem';
import type { KeyBindings } from '../../components/KeyBindingSettings';
import { getWorkspaceSnapshotError } from '../../../shared/workspaceValidation.mjs';

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

export function assertWorkspaceSnapshot(value: unknown): asserts value is WorkspaceSnapshot {
  const invalidPath = getWorkspaceSnapshotError(value);
  const invalid = (path: string): never => {
    throw new Error(
      `저장된 사용자 작업공간의 데이터 형식이 올바르지 않습니다 (${path}). 기존 데이터는 변경하지 않았습니다.`
    );
  };
  if (invalidPath) invalid(invalidPath);
}
