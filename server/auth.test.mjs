import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { createApiServer, hashPassword, initializeDatabase, verifyPassword } from './app.mjs';

const database = new DatabaseSync(':memory:');
const server = createApiServer(database);
let baseUrl;

before(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise(resolve => server.close(resolve));
  database.close();
});

async function request(path, { method = 'GET', body, cookie } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (cookie) headers.Cookie = cookie;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json();
  return {
    status: response.status,
    payload,
    cookie: response.headers.get('set-cookie')?.split(';')[0],
  };
}

function validSkill() {
  return {
    id: 'meleeBasic',
    name: 'Melee',
    description: '',
    type: 'melee',
    category: 'basicAttack',
    tags: ['basicAttack'],
    iconName: 'Sword',
    spCost: 0,
    cooldown: 0,
    castTime: 0,
    range: 75,
    area: 90,
    timing: { windup: 0, execution: 100, recovery: 0 },
    damageMultiplier: 1,
    healAmount: 0,
    buffDuration: 0,
    buffEffect: {},
    visual: {
      color: '#ffffff',
      secondaryColor: '#ffffff',
      glowIntensity: 0,
      particleCount: 0,
      particleSize: 0,
      particleLifetime: 0,
      effectShape: 'circle',
    },
    projectile: {
      type: 'none',
      speed: 0,
      size: 0,
      piercing: false,
      homing: false,
      trail: false,
      trailLength: 0,
    },
    animation: {
      castAnimation: '',
      castScale: 1,
      impactAnimation: '',
      impactDuration: 0,
      cameraShake: 0,
    },
    sound: { castSound: '', impactSound: '', volume: 0 },
    currentCooldown: 0,
    isOnCooldown: false,
  };
}

function validWorkspace() {
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
  const skill = validSkill();
  return {
    version: 1,
    currentTick: 0,
    keyBindings: {
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
    },
    characterTypes: [],
    playerLevelConfig: levelConfig,
    monsterLevelConfig: levelConfig,
    playerBasicAttack: { skill },
    monsterBasicAttack: { skill },
    skillSlots: [{ slotNumber: 1, skill, keyBinding: '1' }],
    skillConfigs: { meleeBasic: skill },
    customEffectPresets: [],
    itemSlots: [],
    homingProjectiles: false,
    maxMonsterCount: 1,
    respawnDelay: 0,
    monsterTypeStats: {},
    playerDataset: [],
    monsterDataset: [],
    stageDefinitions: [],
    activeStageId: null,
    selectedMonsterIds: [],
    playerConfig: characterConfig,
    monsterConfig: characterConfig,
  };
}

test('password hashes verify without storing plaintext', () => {
  const credentials = hashPassword('a strong local password');
  assert.notEqual(credentials.hash, 'a strong local password');
  assert.equal(verifyPassword('a strong local password', credentials.salt, credentials.hash), true);
  assert.equal(verifyPassword('another password', credentials.salt, credentials.hash), false);
  assert.equal(verifyPassword('password', 'invalid', 'invalid'), false);
});

test('workspace schema migration adds a revision to existing rows', () => {
  const legacyDatabase = new DatabaseSync(':memory:');
  legacyDatabase.exec(`
    CREATE TABLE workspaces (
      user_id TEXT PRIMARY KEY,
      data_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    INSERT INTO workspaces VALUES ('legacy-user', '{}', '2026-01-01T00:00:00.000Z');
  `);

  initializeDatabase(legacyDatabase);
  const workspace = legacyDatabase
    .prepare('SELECT revision FROM workspaces WHERE user_id = ?')
    .get('legacy-user');
  assert.equal(workspace.revision, 1);
  legacyDatabase.close();
});

test('first-admin setup, account provisioning, sessions, and workspace data are isolated', async () => {
  assert.deepEqual((await request('/api/auth/status')).payload, {
    needsSetup: true,
    user: null,
  });

  const setup = await request('/api/auth/setup', {
    method: 'POST',
    body: { username: 'AdminUser', password: 'a secure admin password' },
  });
  assert.equal(setup.status, 201);
  assert.equal(setup.payload.user.role, 'admin');
  assert.match(setup.cookie, /^battle_simulator_session=/);

  const secondSetup = await request('/api/auth/setup', {
    method: 'POST',
    body: { username: 'another-admin', password: 'a secure admin password' },
  });
  assert.equal(secondSetup.status, 409);

  const createdUser = await request('/api/admin/users', {
    method: 'POST',
    cookie: setup.cookie,
    body: { username: 'toolkit-user', password: 'a secure user password' },
  });
  assert.equal(createdUser.status, 201);
  assert.equal(createdUser.payload.user.role, 'user');

  const duplicateUser = await request('/api/admin/users', {
    method: 'POST',
    cookie: setup.cookie,
    body: { username: 'TOOLKIT-USER', password: 'a secure user password' },
  });
  assert.equal(duplicateUser.status, 409);

  const userLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { username: 'TOOLKIT-USER', password: 'a secure user password' },
  });
  assert.equal(userLogin.status, 200);
  assert.equal((await request('/api/workspace', { cookie: userLogin.cookie })).payload.revision, 0);
  const workspace = { ...validWorkspace(), playerDataset: [{ value: 5 }] };
  const firstSave = await request('/api/workspace', {
    method: 'PUT',
    cookie: userLogin.cookie,
    body: { workspace, expectedRevision: 0 },
  });
  assert.equal(firstSave.status, 200);
  assert.equal(firstSave.payload.revision, 1);
  assert.deepEqual(
    (
      await request('/api/workspace', {
        cookie: userLogin.cookie,
      })
    ).payload.workspace,
    workspace
  );
  const staleSave = await request('/api/workspace', {
    method: 'PUT',
    cookie: userLogin.cookie,
    body: { workspace: { ...workspace, currentTick: 1 }, expectedRevision: 0 },
  });
  assert.equal(staleSave.status, 409);
  assert.equal(staleSave.payload.revision, 1);
  assert.deepEqual(
    (
      await request('/api/workspace', {
        cookie: userLogin.cookie,
      })
    ).payload.workspace,
    workspace
  );
  const malformedWorkspace = {
    ...workspace,
    playerDataset: [null],
  };
  const rejectedWorkspace = await request('/api/workspace', {
    method: 'PUT',
    cookie: userLogin.cookie,
    body: { workspace: malformedWorkspace, expectedRevision: 1 },
  });
  assert.equal(rejectedWorkspace.status, 400);
  assert.match(rejectedWorkspace.payload.error, /playerDataset\[0\]/);
  assert.deepEqual(
    (
      await request('/api/workspace', {
        cookie: userLogin.cookie,
      })
    ).payload.workspace,
    workspace
  );
  const malformedEffectWorkspace = {
    ...workspace,
    customEffectPresets: [
      {
        id: 'ring',
        name: 'Ring',
        description: '',
        effectType: 'ring',
        color: '#ffffff',
        secondaryColor: '#000000',
        particleTexture: 'circle',
        glowIntensity: 1,
        ringRadius: 'large',
      },
    ],
  };
  const rejectedEffectWorkspace = await request('/api/workspace', {
    method: 'PUT',
    cookie: userLogin.cookie,
    body: { workspace: malformedEffectWorkspace, expectedRevision: 1 },
  });
  assert.equal(rejectedEffectWorkspace.status, 400);
  assert.match(rejectedEffectWorkspace.payload.error, /customEffectPresets\[0\]\.ringRadius/);
  assert.deepEqual(
    (
      await request('/api/workspace', {
        cookie: userLogin.cookie,
      })
    ).payload.workspace,
    workspace
  );
  const malformedAIPatternWorkspace = {
    ...workspace,
    monsterDataset: [
      {
        monster_definition_id: 'monster-ai-validation',
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
  };
  const rejectedAIPatternWorkspace = await request('/api/workspace', {
    method: 'PUT',
    cookie: userLogin.cookie,
    body: { workspace: malformedAIPatternWorkspace, expectedRevision: 1 },
  });
  assert.equal(rejectedAIPatternWorkspace.status, 400);
  assert.match(
    rejectedAIPatternWorkspace.payload.error,
    /monsterDataset\[0\]\.monster_ai_patterns\.patterns\[0\]\.conditions\[0\]\.operator/
  );
  assert.deepEqual(
    (
      await request('/api/workspace', {
        cookie: userLogin.cookie,
      })
    ).payload.workspace,
    workspace
  );
  const duplicateMonsterIdsWorkspace = {
    ...workspace,
    monsterDataset: [
      { monster_definition_id: 'monster-duplicate' },
      { monster_definition_id: 'monster-duplicate' },
    ],
  };
  const rejectedDuplicateMonsterIdsWorkspace = await request('/api/workspace', {
    method: 'PUT',
    cookie: userLogin.cookie,
    body: { workspace: duplicateMonsterIdsWorkspace, expectedRevision: 1 },
  });
  assert.equal(rejectedDuplicateMonsterIdsWorkspace.status, 400);
  assert.match(
    rejectedDuplicateMonsterIdsWorkspace.payload.error,
    /monsterDataset\[1\]\.monster_definition_id/
  );
  const danglingMonsterReferenceWorkspace = {
    ...workspace,
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
  };
  const rejectedDanglingMonsterReferenceWorkspace = await request('/api/workspace', {
    method: 'PUT',
    cookie: userLogin.cookie,
    body: { workspace: danglingMonsterReferenceWorkspace, expectedRevision: 1 },
  });
  assert.equal(rejectedDanglingMonsterReferenceWorkspace.status, 400);
  assert.match(
    rejectedDanglingMonsterReferenceWorkspace.payload.error,
    /stageDefinitions\[0\]\.waves\[0\]\.monsterSpawns\[0\]\.monsterDefinitionId/
  );
  assert.deepEqual(
    (
      await request('/api/workspace', {
        cookie: userLogin.cookie,
      })
    ).payload.workspace,
    workspace
  );
  const danglingSkillReferenceWorkspace = {
    ...workspace,
    playerDataset: [{ player_skill_1_id: 'missing-skill' }],
  };
  const rejectedDanglingSkillReferenceWorkspace = await request('/api/workspace', {
    method: 'PUT',
    cookie: userLogin.cookie,
    body: { workspace: danglingSkillReferenceWorkspace, expectedRevision: 1 },
  });
  assert.equal(rejectedDanglingSkillReferenceWorkspace.status, 400);
  assert.match(
    rejectedDanglingSkillReferenceWorkspace.payload.error,
    /playerDataset\[0\]\.player_skill_1_id/
  );
  assert.deepEqual(
    (
      await request('/api/workspace', {
        cookie: userLogin.cookie,
      })
    ).payload.workspace,
    workspace
  );
  const draftWorkspace = {
    ...workspace,
    stageDefinitions: [
      {
        id: 'draft-stage',
        name: '',
        waves: [
          {
            id: 'draft-wave',
            durationMs: 0,
            respawn: { enabled: false, delayMs: 0 },
            monsterSpawns: [],
          },
        ],
      },
    ],
  };
  assert.equal(
    (
      await request('/api/workspace', {
        method: 'PUT',
        cookie: userLogin.cookie,
        body: { workspace: draftWorkspace, expectedRevision: 1 },
      })
    ).status,
    200
  );
  assert.deepEqual(
    (
      await request('/api/workspace', {
        cookie: userLogin.cookie,
      })
    ).payload.workspace,
    draftWorkspace
  );
  assert.equal((await request('/api/workspace', { cookie: userLogin.cookie })).payload.revision, 2);
  assert.equal(
    (
      await request('/api/workspace', {
        method: 'PUT',
        cookie: setup.cookie,
        body: { workspace: { version: 2 }, expectedRevision: 0 },
      })
    ).status,
    400
  );
  assert.equal(
    (
      await request('/api/workspace', {
        cookie: setup.cookie,
      })
    ).payload.workspace,
    null
  );
  assert.equal(
    (
      await request('/api/admin/users', {
        cookie: userLogin.cookie,
      })
    ).status,
    403
  );

  const reset = (cookie, userId, password) =>
    request('/api/admin/users/reset-password', {
      method: 'POST',
      cookie,
      body: { userId, password },
    });
  assert.equal(
    (await reset(userLogin.cookie, createdUser.payload.user.id, 'new secure password')).status,
    403
  );
  assert.equal(
    (await reset(setup.cookie, setup.payload.user.id, 'new secure password')).status,
    404
  );
  assert.equal((await reset(setup.cookie, createdUser.payload.user.id, 'short')).status, 400);
  assert.equal(
    (await reset(setup.cookie, createdUser.payload.user.id, 'new secure password')).status,
    200
  );
  assert.equal((await request('/api/workspace', { cookie: userLogin.cookie })).status, 401);
  assert.equal(
    (
      await request('/api/auth/login', {
        method: 'POST',
        body: { username: 'toolkit-user', password: 'a secure user password' },
      })
    ).status,
    401
  );
  const resetLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { username: 'toolkit-user', password: 'new secure password' },
  });
  assert.equal(resetLogin.status, 200);
  assert.deepEqual(
    (await request('/api/workspace', { cookie: resetLogin.cookie })).payload.workspace,
    draftWorkspace
  );
  const legacyMalformedWorkspace = {
    ...draftWorkspace,
    stageDefinitions: [null],
  };
  database
    .prepare('UPDATE workspaces SET data_json = ? WHERE user_id = ?')
    .run(JSON.stringify(legacyMalformedWorkspace), createdUser.payload.user.id);
  const recoverySnapshot = await request('/api/workspace', { cookie: resetLogin.cookie });
  assert.deepEqual(recoverySnapshot.payload.workspace, legacyMalformedWorkspace);
  assert.equal(recoverySnapshot.payload.revision, 2);
  const recoveredWorkspace = await request('/api/workspace', {
    method: 'PUT',
    cookie: resetLogin.cookie,
    body: { workspace: validWorkspace(), expectedRevision: recoverySnapshot.payload.revision },
  });
  assert.equal(recoveredWorkspace.status, 200);
  assert.equal(recoveredWorkspace.payload.revision, 3);

  assert.equal(
    (
      await request('/api/auth/logout', {
        method: 'POST',
        cookie: resetLogin.cookie,
      })
    ).status,
    200
  );
  assert.equal(
    (
      await request('/api/workspace', {
        cookie: resetLogin.cookie,
      })
    ).status,
    401
  );
});

test('workspace endpoint rejects unauthenticated writes', async () => {
  assert.equal(
    (
      await request('/api/workspace', {
        method: 'PUT',
        body: { workspace: { version: 1 } },
      })
    ).status,
    401
  );
});
