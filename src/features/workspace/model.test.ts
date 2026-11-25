import { describe, expect, it } from 'vitest';
import { defaultSkills } from '../../lib/skillSystem';
import { assertWorkspaceSnapshot } from './model';

function workspace() {
  const levelConfig = {
    currentLevel: 1,
    currentExp: 0,
    expToNextLevel: 100,
    hpPerLevel: 0,
    spPerLevel: 0,
    attackPerLevel: 0,
    defensePerLevel: 0,
    speedPerLevel: 0,
    hpGrowth: { a: 0, b: 0 },
    spGrowth: { a: 0, b: 0 },
    attackGrowth: { a: 0, b: 0 },
    defenseGrowth: { a: 0, b: 0 },
    speedGrowth: { a: 0, b: 0 },
    expGrowth: { type: 'linear', a: 0, b: 0 },
    baseHp: 1,
    baseSp: 0,
    baseAttack: 0,
    baseDefense: 0,
    baseSpeed: 0,
  };
  const keyBindings = {
    moveUp: 'w',
    moveDown: 's',
    moveLeft: 'a',
    moveRight: 'd',
    attack: ' ',
    skill1: '1',
    skill2: '2',
    skill3: '3',
    skill4: '4',
    mouseAttack: 0,
    mouseSkill: 2,
  };
  const characterConfig = {
    size: { min: 0, max: 0 },
    speed: { min: 0, max: 0 },
    attack: { min: 0, max: 0 },
    defense: { min: 0, max: 0 },
    attackSpeed: { min: 0, max: 0 },
    accuracy: { min: 0, max: 0 },
    criticalRate: { min: 0, max: 0 },
    attackRange: { min: 0, max: 0 },
    attackWidth: { min: 0, max: 0 },
    typeId: '',
  };
  return {
    version: 1,
    currentTick: 0,
    keyBindings,
    characterTypes: [],
    playerLevelConfig: levelConfig,
    monsterLevelConfig: levelConfig,
    playerBasicAttack: { skill: defaultSkills.meleeBasic },
    monsterBasicAttack: { skill: defaultSkills.meleeBasic },
    skillSlots: [
      { slotNumber: 1, skill: defaultSkills.powerSlash, keyBinding: '1' },
      { slotNumber: 2, skill: null, keyBinding: '2' },
    ],
    skillConfigs: { meleeBasic: defaultSkills.meleeBasic },
    customEffectPresets: [],
    itemSlots: [
      {
        slotNumber: 1,
        keyBinding: 'F1',
        item: {
          id: 'potion',
          name: 'Potion',
          description: '',
          type: 'potion',
          iconName: 'Flask',
          healAmount: 10,
          spRestore: 0,
          damageAmount: 0,
          damageRange: 0,
          buffDuration: 0,
          buffEffect: {},
          cooldown: 1000,
          currentCooldown: 0,
          isOnCooldown: false,
          quantity: 1,
          maxStack: 5,
          color: '#ffffff',
          particleCount: 0,
        },
      },
      { slotNumber: 2, keyBinding: 'F2', item: null },
    ],
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
            monsterSpawns: [{ monsterDefinitionId: 'monster-1', count: 0 }],
          },
        ],
      },
    ],
    activeStageId: 'stage-1',
    selectedMonsterIds: [],
    playerConfig: characterConfig,
    monsterConfig: characterConfig,
  };
}

describe('workspace restore structure', () => {
  it('accepts a valid version-1 draft snapshot without changing it', () => {
    const snapshot = workspace();
    const original = JSON.stringify(snapshot);
    expect(() => assertWorkspaceSnapshot(snapshot)).not.toThrow();
    expect(JSON.stringify(snapshot)).toBe(original);
  });

  it('accepts absent or null legacy AI pattern settings', () => {
    const snapshot = {
      ...workspace(),
      characterTypes: [
        { id: 'warrior', name: 'Warrior', description: '', color: '', defaultAIPattern: null },
      ],
      monsterTypeStats: {
        warrior: {
          characterType: 'warrior',
          baseLevel: 1,
          size: 20,
          aiPattern: 'balanced',
          skills: [],
          aiPatternConfig: null,
        },
      },
    };

    expect(() => assertWorkspaceSnapshot(snapshot)).not.toThrow();
  });

  it('accepts incomplete dataset drafts and legacy player row values', () => {
    const snapshot = {
      ...workspace(),
      playerDataset: [
        { player_attack: 'legacy value', player_hp: 0 },
        { player_character_id: 'unfinished' },
      ],
      monsterDataset: [{ monster_definition_id: 'monster-1', monster_speed: 0 }],
    };

    expect(() => assertWorkspaceSnapshot(snapshot)).not.toThrow();
  });

  it.each([
    [
      'player dataset skill',
      {
        playerDataset: [{ player_skill_1_id: 'missing-skill' }],
      },
      'playerDataset[0].player_skill_1_id',
    ],
    [
      'monster dataset type',
      {
        characterTypes: [{ id: 'warrior', name: 'Warrior', description: '', color: '' }],
        monsterDataset: [
          { monster_definition_id: 'monster-1', monster_attack_type: 'missing-type' },
        ],
      },
      'monsterDataset[0].monster_attack_type',
    ],
    [
      'character type default skill',
      {
        characterTypes: [
          {
            id: 'warrior',
            name: 'Warrior',
            description: '',
            color: '',
            defaultSkillIds: ['missing-skill'],
          },
        ],
      },
      'characterTypes[0].defaultSkillIds[0]',
    ],
    [
      'empty character type default skill',
      {
        characterTypes: [
          {
            id: 'warrior',
            name: 'Warrior',
            description: '',
            color: '',
            defaultSkillIds: [''],
          },
        ],
      },
      'characterTypes[0].defaultSkillIds[0]',
    ],
    [
      'monster type skill',
      {
        characterTypes: [{ id: 'warrior', name: 'Warrior', description: '', color: '' }],
        monsterTypeStats: {
          warrior: {
            characterType: 'warrior',
            baseLevel: 1,
            size: 20,
            aiPattern: 'balanced',
            skills: ['missing-skill'],
          },
        },
      },
      'monsterTypeStats.warrior.skills[0]',
    ],
  ])('rejects a dangling %s reference', (_label, changes, invalidPath) => {
    expect(() => assertWorkspaceSnapshot({ ...workspace(), ...changes })).toThrow(invalidPath);
  });

  it('allows empty optional references and legacy AI skill slots', () => {
    const snapshot = {
      ...workspace(),
      characterTypes: [
        {
          id: 'warrior',
          name: 'Warrior',
          description: '',
          color: '',
          defaultBasicAttackId: '',
          defaultAIPattern: {
            aggroRange: 100,
            chaseMinDistance: 0,
            patterns: [{ action: 'skill', enabled: true, skillId: 'skill1', conditions: [] }],
          },
        },
      ],
      playerDataset: [{ player_skill_1_id: '' }],
    };

    expect(() => assertWorkspaceSnapshot(snapshot)).not.toThrow();
  });

  it('rejects a dangling skill reference in an AI pattern', () => {
    const snapshot = {
      ...workspace(),
      characterTypes: [
        {
          id: 'warrior',
          name: 'Warrior',
          description: '',
          color: '',
          defaultAIPattern: {
            aggroRange: 100,
            chaseMinDistance: 0,
            patterns: [
              { action: 'skill', enabled: true, skillId: 'missing-skill', conditions: [] },
            ],
          },
        },
      ],
    };

    expect(() => assertWorkspaceSnapshot(snapshot)).toThrow(
      'characterTypes[0].defaultAIPattern.patterns[0].skillId'
    );
  });

  it.each([
    ['playerDataset[0]', { playerDataset: [null] }],
    [
      'keyBindings.mouseAttack',
      { keyBindings: { ...workspace().keyBindings, mouseAttack: 'left' } },
    ],
    [
      'playerLevelConfig.hpGrowth.a',
      {
        playerLevelConfig: {
          ...workspace().playerLevelConfig,
          hpGrowth: { ...workspace().playerLevelConfig.hpGrowth, a: null },
        },
      },
    ],
    [
      'monsterConfig.attackRange.min',
      {
        monsterConfig: {
          ...workspace().monsterConfig,
          attackRange: { ...workspace().monsterConfig.attackRange, min: null },
        },
      },
    ],
    [
      'customEffectPresets[0].glowIntensity',
      {
        customEffectPresets: [
          {
            id: 'effect-1',
            name: 'Effect',
            description: '',
            effectType: 'ring',
            color: '#ffffff',
            secondaryColor: '#000000',
            particleTexture: 'circle',
            glowIntensity: 'high',
          },
        ],
      },
    ],
    [
      'skillConfigs.test.effects[0].effectType',
      {
        skillConfigs: {
          test: {
            ...defaultSkills.meleeBasic,
            effects: [
              {
                id: 'effect-1',
                name: 'Effect',
                description: '',
                effectType: 'invalid',
                color: '#ffffff',
                secondaryColor: '#000000',
                particleTexture: 'circle',
                glowIntensity: 1,
              },
            ],
          },
        },
      },
    ],
    [
      'skillConfigs.meleeBasic.timing.windup',
      {
        skillConfigs: {
          ...workspace().skillConfigs,
          meleeBasic: {
            ...defaultSkills.meleeBasic,
            timing: { ...defaultSkills.meleeBasic.timing, windup: 'fast' },
          },
        },
      },
    ],
    [
      'skillSlots[0].overrides.range',
      {
        skillSlots: [{ slotNumber: 1, skill: null, keyBinding: '1', overrides: { range: 'long' } }],
      },
    ],
    [
      'characterTypes[0].defaultAIPattern.patterns[0].conditions[0].value',
      {
        characterTypes: [
          {
            id: 'warrior',
            name: 'Warrior',
            description: '',
            color: '',
            defaultAIPattern: {
              aggroRange: 100,
              chaseMinDistance: 0,
              patterns: [
                {
                  action: 'attack',
                  enabled: true,
                  conditions: [{ type: 'distance', operator: '<', value: 'near' }],
                },
              ],
            },
          },
        ],
      },
    ],
    [
      'monsterTypeStats.warrior.aiPatternConfig.patterns[0].action',
      {
        monsterTypeStats: {
          warrior: {
            characterType: 'warrior',
            baseLevel: 1,
            size: 20,
            aiPattern: 'balanced',
            skills: [],
            aiPatternConfig: {
              aggroRange: 100,
              chaseMinDistance: 0,
              patterns: [{ action: 'explode', enabled: true, conditions: [] }],
            },
          },
        },
      },
    ],
    [
      'monsterDataset[0].monster_ai_patterns.patterns[0].conditions[0].operator',
      {
        monsterDataset: [
          {
            monster_definition_id: 'monster-1',
            monster_ai_patterns: JSON.stringify({
              aggroRange: 100,
              chaseMinDistance: 0,
              patterns: [
                {
                  action: 'attack',
                  enabled: true,
                  conditions: [{ type: 'distance', operator: '==', value: 10 }],
                },
              ],
            }),
          },
        ],
      },
    ],
    [
      'playerBasicAttack.skill.projectile.type',
      {
        playerBasicAttack: {
          skill: {
            ...defaultSkills.meleeBasic,
            projectile: { ...defaultSkills.meleeBasic.projectile, type: 'teleport' },
          },
        },
      },
    ],
    [
      'customEffectPresets[0].trailType',
      {
        customEffectPresets: [
          {
            id: 'effect-1',
            name: 'Effect',
            description: '',
            effectType: 'trail',
            color: '#ffffff',
            secondaryColor: '#000000',
            particleTexture: 'circle',
            glowIntensity: 1,
            trailType: 'invalid',
          },
        ],
      },
    ],
    [
      'itemSlots[0].item.type',
      {
        itemSlots: [
          {
            slotNumber: 1,
            keyBinding: 'F1',
            item: {
              id: 'item-1',
              name: 'Item',
              description: '',
              type: 'unknown',
              iconName: 'Flask',
              healAmount: 10,
              spRestore: 0,
              damageAmount: 0,
              damageRange: 0,
              buffDuration: 0,
              buffEffect: {},
              cooldown: 0,
              currentCooldown: 0,
              isOnCooldown: false,
              quantity: 1,
              maxStack: 5,
              color: '#ffffff',
              particleCount: 0,
            },
          },
        ],
      },
    ],
    [
      'itemSlots[0].item.buffEffect.attack',
      {
        itemSlots: [
          {
            slotNumber: 1,
            keyBinding: 'F1',
            item: {
              id: 'item-1',
              name: 'Item',
              description: '',
              type: 'potion',
              iconName: 'Flask',
              healAmount: 10,
              spRestore: 0,
              damageAmount: 0,
              damageRange: 0,
              buffDuration: 0,
              buffEffect: { attack: 'high' },
              cooldown: 0,
              currentCooldown: 0,
              isOnCooldown: false,
              quantity: 1,
              maxStack: 5,
              color: '#ffffff',
              particleCount: 0,
            },
          },
        ],
      },
    ],
    ['itemSlots[0].slotNumber', { itemSlots: [{ slotNumber: 5, keyBinding: 'F1', item: null }] }],
    ['characterTypes[0].id', { characterTypes: [{ id: 1, name: '', description: '', color: '' }] }],
    [
      'monsterTypeStats.warrior.skills',
      {
        monsterTypeStats: {
          warrior: {
            characterType: 'warrior',
            baseLevel: 1,
            size: 20,
            aiPattern: 'balanced',
            skills: [null],
          },
        },
      },
    ],
    ['monsterTypeStats.warrior', { monsterTypeStats: { warrior: null } }],
    ['monsterDataset[0].monster_definition_id', { monsterDataset: [{ monster_definition_id: 7 }] }],
    ['monsterDataset[0].monster_definition_id', { monsterDataset: [{}] }],
    [
      'monsterDataset[1].monster_definition_id',
      {
        monsterDataset: [
          { monster_definition_id: 'monster-1' },
          { monster_definition_id: 'monster-1' },
        ],
      },
    ],
    [
      'playerDataset[0].player_attack',
      {
        playerDataset: [{ player_character_id: 'hero', player_attack: 'not a number' }],
      },
    ],
    [
      'playerDataset[0].player_level',
      {
        playerDataset: [{ player_character_id: 'hero', player_level: 1.5 }],
      },
    ],
    [
      'monsterDataset[0].monster_speed',
      { monsterDataset: [{ monster_definition_id: 'monster-1', monster_speed: -1 }] },
    ],
    [
      'playerLevelConfig.hpGrowth',
      { playerLevelConfig: { ...workspace().playerLevelConfig, hpGrowth: null } },
    ],
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
    [
      'stageDefinitions[0].waves[0].monsterSpawns[0].monsterDefinitionId',
      {
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
      },
    ],
  ])('rejects malformed %s without modifying the snapshot', (path, changes) => {
    const snapshot = { ...workspace(), ...changes };
    const original = JSON.stringify(snapshot);
    expect(() => assertWorkspaceSnapshot(snapshot)).toThrow(path);
    expect(JSON.stringify(snapshot)).toBe(original);
  });
});
