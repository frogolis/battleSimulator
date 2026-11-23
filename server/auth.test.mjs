import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { createApiServer, hashPassword, verifyPassword } from './app.mjs';

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

test('password hashes verify without storing plaintext', () => {
  const credentials = hashPassword('a strong local password');
  assert.notEqual(credentials.hash, 'a strong local password');
  assert.equal(verifyPassword('a strong local password', credentials.salt, credentials.hash), true);
  assert.equal(verifyPassword('another password', credentials.salt, credentials.hash), false);
  assert.equal(verifyPassword('password', 'invalid', 'invalid'), false);
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
  const workspace = { version: 1, playerDataset: [{ value: 5 }] };
  assert.equal(
    (
      await request('/api/workspace', {
        method: 'PUT',
        cookie: userLogin.cookie,
        body: { workspace },
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
    workspace
  );
  assert.equal(
    (
      await request('/api/workspace', {
        method: 'PUT',
        cookie: setup.cookie,
        body: { workspace: { version: 2 } },
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
    workspace
  );

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
