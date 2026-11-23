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

function hasWorkspaceEnvelope(value: unknown): value is WorkspaceSnapshot {
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

export function assertWorkspaceSnapshot(value: unknown): asserts value is WorkspaceSnapshot {
  const invalid = (path: string): never => {
    throw new Error(
      `저장된 사용자 작업공간의 데이터 형식이 올바르지 않습니다 (${path}). 기존 데이터는 변경하지 않았습니다.`
    );
  };
  if (!hasWorkspaceEnvelope(value)) return invalid('작업공간');

  const objectArrays = {
    characterTypes: value.characterTypes,
    skillSlots: value.skillSlots,
    customEffectPresets: value.customEffectPresets,
    itemSlots: value.itemSlots,
    playerDataset: value.playerDataset,
    monsterDataset: value.monsterDataset,
    stageDefinitions: value.stageDefinitions,
  };
  for (const [field, entries] of Object.entries(objectArrays)) {
    entries.forEach((entry, index) => {
      if (!isRecord(entry)) invalid(`${field}[${index}]`);
    });
  }

  for (const [field, config] of [
    ['playerLevelConfig', value.playerLevelConfig],
    ['monsterLevelConfig', value.monsterLevelConfig],
  ] as const) {
    for (const growth of [
      'hpGrowth',
      'spGrowth',
      'attackGrowth',
      'defenseGrowth',
      'speedGrowth',
    ] as const) {
      if (!isRecord(config[growth])) invalid(`${field}.${growth}`);
    }
  }

  for (const [field, entries] of [
    ['skillConfigs', value.skillConfigs],
    ['monsterTypeStats', value.monsterTypeStats],
  ] as const) {
    for (const [key, entry] of Object.entries(entries)) {
      if (!isRecord(entry)) invalid(`${field}.${key}`);
    }
  }

  for (const [index, row] of value.monsterDataset.entries()) {
    if (row.monster_definition_id !== undefined && typeof row.monster_definition_id !== 'string') {
      invalid(`monsterDataset[${index}].monster_definition_id`);
    }
  }

  for (const [stageIndex, stage] of value.stageDefinitions.entries()) {
    const stagePath = `stageDefinitions[${stageIndex}]`;
    if (
      typeof stage.id !== 'string' ||
      typeof stage.name !== 'string' ||
      !Array.isArray(stage.waves)
    ) {
      invalid(stagePath);
    }
    for (const [waveIndex, wave] of stage.waves.entries()) {
      const wavePath = `${stagePath}.waves[${waveIndex}]`;
      if (
        !isRecord(wave) ||
        typeof wave.id !== 'string' ||
        typeof wave.durationMs !== 'number' ||
        !isRecord(wave.respawn) ||
        typeof wave.respawn.enabled !== 'boolean' ||
        typeof wave.respawn.delayMs !== 'number' ||
        !Array.isArray(wave.monsterSpawns)
      ) {
        invalid(wavePath);
      }
      for (const [mappingIndex, mapping] of wave.monsterSpawns.entries()) {
        if (
          !isRecord(mapping) ||
          typeof mapping.monsterDefinitionId !== 'string' ||
          typeof mapping.count !== 'number'
        ) {
          invalid(`${wavePath}.monsterSpawns[${mappingIndex}]`);
        }
      }
    }
  }
}
