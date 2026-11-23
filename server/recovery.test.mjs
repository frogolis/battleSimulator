import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { initializeDatabase, hashPassword, verifyPassword } from './app.mjs';
import { resetAdminPassword } from './admin-recovery.mjs';
import { backupDatabase, restoreDatabase } from './database-recovery.mjs';

function fixture() {
  const directory = mkdtempSync(path.join(tmpdir(), 'battle-recovery-test-'));
  const database = new DatabaseSync(path.join(directory, 'battle-simulator.sqlite'));
  database.exec('PRAGMA journal_mode = WAL');
  initializeDatabase(database);
  const { salt, hash } = hashPassword('original password 123');
  database
    .prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?, ?)')
    .run('admin-id', 'admin', salt, hash, 'admin', '2026-01-01');
  database
    .prepare('INSERT INTO workspaces VALUES (?, ?, ?)')
    .run('admin-id', '{"version":1}', '2026-01-01');
  database
    .prepare('INSERT INTO sessions VALUES (?, ?, ?)')
    .run('session', 'admin-id', Date.now() + 100000);
  return {
    database,
    directory,
    cleanup() {
      database.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

test('administrator recovery preserves workspace and invalidates sessions', () => {
  const f = fixture();
  try {
    assert.throws(
      () => resetAdminPassword(f.database, 'missing', 'replacement password'),
      /찾을 수 없습니다/
    );
    assert.throws(() => resetAdminPassword(f.database, 'admin', 'short'), /12~128/);
    assert.equal(f.database.prepare('SELECT COUNT(*) AS n FROM sessions').get().n, 1);
    resetAdminPassword(f.database, 'ADMIN', 'replacement password');
    const user = f.database.prepare('SELECT * FROM users WHERE id = ?').get('admin-id');
    assert.equal(
      verifyPassword('replacement password', user.password_salt, user.password_hash),
      true
    );
    assert.equal(
      verifyPassword('original password 123', user.password_salt, user.password_hash),
      false
    );
    assert.equal(
      f.database.prepare('SELECT data_json FROM workspaces WHERE user_id = ?').get('admin-id')
        .data_json,
      '{"version":1}'
    );
    assert.equal(f.database.prepare('SELECT COUNT(*) AS n FROM sessions').get().n, 0);
  } finally {
    f.cleanup();
  }
});

test('administrator CLI reads two hidden inputs and resets the account', async () => {
  const f = fixture();
  const script = fileURLToPath(new URL('../scripts/reset-admin.mjs', import.meta.url));
  const password = 'test terminal password';
  const shim = `
    Object.defineProperty(process.stdin, 'isTTY', { value: true });
    Object.defineProperty(process.stdout, 'isTTY', { value: true });
    process.stdin.setRawMode = () => process.stdin;
    process.argv = [process.execPath, ${JSON.stringify(script)}, 'admin'];
    await import(${JSON.stringify(pathToFileURL(script).href)});
  `;
  const child = spawn(process.execPath, ['--input-type=module', '-e', shim], {
    env: { ...process.env, BATTLE_SIMULATOR_DATA_DIR: f.directory },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  let output = '';
  let errors = '';
  let inputCount = 0;
  const timer = setTimeout(() => child.kill(), 10000);
  try {
    child.stdout.on('data', chunk => {
      output += chunk.toString();
      if (inputCount === 0 && output.includes('입력 내용 숨김')) {
        inputCount = 1;
        child.stdin.write(`${password}\r`);
      } else if (inputCount === 1 && output.includes('새 비밀번호 확인:')) {
        inputCount = 2;
        child.stdin.end(`${password}\r`);
      }
    });
    child.stderr.on('data', chunk => {
      errors += chunk.toString();
    });
    const code = await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('close', resolve);
    });
    assert.equal(code, 0, `${errors}\n${output.replaceAll(password, '[redacted]')}`);
    assert.equal(inputCount, 2);
    assert.equal(output.includes(password), false);
    const user = f.database
      .prepare('SELECT password_salt, password_hash FROM users WHERE id = ?')
      .get('admin-id');
    assert.equal(verifyPassword(password, user.password_salt, user.password_hash), true);
    assert.equal(f.database.prepare('SELECT COUNT(*) AS n FROM workspaces').get().n, 1);
    assert.equal(f.database.prepare('SELECT COUNT(*) AS n FROM sessions').get().n, 0);
  } finally {
    clearTimeout(timer);
    f.cleanup();
  }
});

test('backup captures WAL data and restore recovers workspace without restoring sessions', () => {
  const f = fixture();
  const backupPath = path.join(f.directory, 'backup.sqlite');
  try {
    const { salt, hash } = hashPassword('user password 123');
    f.database
      .prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?, ?)')
      .run('user-id', 'user', salt, hash, 'user', '2026-01-01');
    f.database
      .prepare('INSERT INTO workspaces VALUES (?, ?, ?)')
      .run('user-id', '{"version":1,"user":true}', '2026-01-01');
    backupDatabase(f.database, backupPath);
    assert.throws(() => backupDatabase(f.database, backupPath), /EEXIST/);
    resetAdminPassword(f.database, 'admin', 'changed password 123');
    f.database
      .prepare('UPDATE workspaces SET data_json = ? WHERE user_id = ?')
      .run('{"version":1,"changed":true}', 'admin-id');
    f.database.prepare('DELETE FROM users WHERE id = ?').run('user-id');
    restoreDatabase(f.database, backupPath);
    assert.equal(
      f.database.prepare('SELECT data_json FROM workspaces WHERE user_id = ?').get('admin-id')
        .data_json,
      '{"version":1}'
    );
    assert.equal(
      f.database.prepare('SELECT data_json FROM workspaces WHERE user_id = ?').get('user-id')
        .data_json,
      '{"version":1,"user":true}'
    );
    const admin = f.database
      .prepare('SELECT password_salt, password_hash FROM users WHERE id = ?')
      .get('admin-id');
    assert.equal(
      verifyPassword('original password 123', admin.password_salt, admin.password_hash),
      true
    );
    assert.equal(
      verifyPassword('changed password 123', admin.password_salt, admin.password_hash),
      false
    );
    assert.equal(f.database.prepare('SELECT COUNT(*) AS n FROM sessions').get().n, 0);
  } finally {
    f.cleanup();
  }
});

test('restore rejects invalid backup without changing live data', () => {
  const f = fixture();
  const invalidPath = path.join(f.directory, 'invalid.sqlite');
  try {
    const invalid = new DatabaseSync(invalidPath);
    invalid.exec('CREATE TABLE other (value TEXT)');
    invalid.close();
    assert.throws(() => restoreDatabase(f.database, invalidPath), /스키마/);
    assert.equal(
      f.database.prepare('SELECT data_json FROM workspaces').get().data_json,
      '{"version":1}'
    );
    assert.equal(f.database.prepare('SELECT COUNT(*) AS n FROM sessions').get().n, 1);
  } finally {
    f.cleanup();
  }
});
