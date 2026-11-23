import { describe, expect, it } from 'vitest';
import { assertWorkspaceSnapshot } from './model';

function workspace() {
  const levelConfig = {
    hpGrowth: {},
    spGrowth: {},
    attackGrowth: {},
    defenseGrowth: {},
    speedGrowth: {},
  };
  return {
    version: 1,
    currentTick: 0,
    keyBindings: {},
    characterTypes: [],
    playerLevelConfig: levelConfig,
    monsterLevelConfig: levelConfig,
    playerBasicAttack: {},
    monsterBasicAttack: {},
    skillSlots: [],
    skillConfigs: {},
    customEffectPresets: [],
    itemSlots: [],
    homingProjectiles: false,
    maxMonsterCount: 1,
    respawnDelay: 0,
    monsterTypeStats: {},
    playerDataset: [{}],
    monsterDataset: [{ monster_definition_id: 'monster-1' }],
    stageDefinitions: [
      {
        id: 'stage-1',
        name: '',
        waves: [
          {
            id: 'wave-1',
            durationMs: 0,
            respawn: { enabled: false, delayMs: 0 },
            monsterSpawns: [{ monsterDefinitionId: 'missing-monster', count: 0 }],
          },
        ],
      },
    ],
    activeStageId: 'stage-1',
    selectedMonsterIds: [],
    playerConfig: {},
    monsterConfig: {},
  };
}

describe('workspace restore structure', () => {
  it('accepts structurally valid but incomplete editing data without changing it', () => {
    const snapshot = workspace();
    const original = JSON.stringify(snapshot);
    expect(() => assertWorkspaceSnapshot(snapshot)).not.toThrow();
    expect(JSON.stringify(snapshot)).toBe(original);
  });

  it.each([
    ['playerDataset[0]', { playerDataset: [null] }],
    ['monsterDataset[0].monster_definition_id', { monsterDataset: [{ monster_definition_id: 7 }] }],
    ['playerLevelConfig.hpGrowth', { playerLevelConfig: {} }],
    ['skillConfigs.broken', { skillConfigs: { broken: null } }],
    ['stageDefinitions[0]', { stageDefinitions: [null] }],
    ['stageDefinitions[0]', { stageDefinitions: [{ id: 's', name: '', waves: null }] }],
    ['stageDefinitions[0].waves[0]', { stageDefinitions: [{ id: 's', name: '', waves: [null] }] }],
    [
      'stageDefinitions[0].waves[0].monsterSpawns[0]',
      {
        stageDefinitions: [
          {
            id: 's',
            name: '',
            waves: [
              {
                id: 'w',
                durationMs: 1,
                respawn: { enabled: false, delayMs: 0 },
                monsterSpawns: [null],
              },
            ],
          },
        ],
      },
    ],
  ])('rejects malformed %s without modifying the snapshot', (path, changes) => {
    const snapshot = { ...workspace(), ...changes };
    const original = JSON.stringify(snapshot);
    expect(() => assertWorkspaceSnapshot(snapshot)).toThrow(path);
    expect(JSON.stringify(snapshot)).toBe(original);
  });
});
