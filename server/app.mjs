import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPassword, resetPassword, validPassword } from './password.mjs';

export { hashPassword } from './password.mjs';

const SESSION_COOKIE = 'battle_simulator_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_JSON_BYTES = 10 * 1024 * 1024;
const MAX_LOGIN_ATTEMPTS = 8;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const BUILD_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../build');
const loginAttempts = new Map();

export function initializeDatabase(database) {
  database.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_expiration ON sessions(expires_at);
    CREATE TABLE IF NOT EXISTS workspaces (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      data_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

export function verifyPassword(password, saltHex, hashHex) {
  if (
    typeof password !== 'string' ||
    typeof saltHex !== 'string' ||
    typeof hashHex !== 'string' ||
    !/^[a-f0-9]{32}$/i.test(saltHex) ||
    !/^[a-f0-9]{128}$/i.test(hashHex)
  ) {
    return false;
  }
  const salt = Buffer.from(saltHex, 'hex');
  const expectedHash = Buffer.from(hashHex, 'hex');
  const actualHash = scryptSync(password, salt, expectedHash.length);
  return timingSafeEqual(actualHash, expectedHash);
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sendJson(response, status, value, headers = {}) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  response.end(JSON.stringify(value));
}

function readCookie(request, name) {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) return undefined;
  const entry = cookieHeader
    .split(';')
    .map(cookie => cookie.trim())
    .find(cookie => cookie.startsWith(`${name}=`));
  return entry?.slice(name.length + 1);
}

function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function sessionCookie(token, request) {
  const secure = process.env.COOKIE_SECURE === 'true' || Boolean(request.socket.encrypted);
  return [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

function clearedSessionCookie(request) {
  const secure = process.env.COOKIE_SECURE === 'true' || Boolean(request.socket.encrypted);
  return [
    `${SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=0',
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

function createSession(database, userId, request) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + SESSION_TTL_MS;
  database
    .prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .run(hashSessionToken(token), userId, expiresAt);
  return sessionCookie(token, request);
}

function getCurrentUser(database, request) {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;

  const tokenHash = hashSessionToken(token);
  const session = database
    .prepare('SELECT user_id, expires_at FROM sessions WHERE token_hash = ?')
    .get(tokenHash);
  if (!session) return null;
  if (session.expires_at <= Date.now()) {
    database.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
    return null;
  }

  const user = database
    .prepare('SELECT id, username, role FROM users WHERE id = ?')
    .get(session.user_id);
  return user ?? null;
}

function validateCredentials(value) {
  if (
    !isRecord(value) ||
    typeof value.username !== 'string' ||
    typeof value.password !== 'string'
  ) {
    return { error: '사용자 이름과 비밀번호를 입력해 주세요.' };
  }

  const username = value.username.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    return { error: '사용자 이름은 영문 소문자, 숫자, 점, 밑줄, 하이픈으로 3~32자여야 합니다.' };
  }
  if (!validPassword(value.password)) {
    return { error: '비밀번호는 12~128자로 입력해 주세요.' };
  }
  return { username, password: value.password };
}

async function readJson(request) {
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > MAX_JSON_BYTES) {
      const error = new Error('요청 본문이 허용 크기를 초과했습니다.');
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  let body;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    const error = new Error('JSON 요청 본문이 올바르지 않습니다.');
    error.status = 400;
    throw error;
  }
  if (!isRecord(body)) {
    const error = new Error('요청 본문은 객체여야 합니다.');
    error.status = 400;
    throw error;
  }
  return body;
}

function checkOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host.toLowerCase() === request.headers.host?.toLowerCase();
  } catch {
    return false;
  }
}

function getLoginLimit(ipAddress) {
  const now = Date.now();
  const previous = loginAttempts.get(ipAddress);
  if (!previous || previous.resetAt <= now) {
    const next = { attempts: 0, resetAt: now + LOGIN_WINDOW_MS };
    loginAttempts.set(ipAddress, next);
    return next;
  }
  return previous;
}

function staticResponse(request, response, url) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    sendJson(response, 404, { error: '요청한 경로를 찾을 수 없습니다.' });
    return;
  }
  if (!existsSync(BUILD_DIR)) {
    sendJson(response, 404, {
      error: '프런트엔드 빌드가 없습니다. 개발 서버를 사용하거나 먼저 빌드해 주세요.',
    });
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    sendJson(response, 400, { error: '경로 인코딩이 올바르지 않습니다.' });
    return;
  }
  const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);
  let filePath = path.resolve(BUILD_DIR, relativePath);
  if (filePath !== BUILD_DIR && !filePath.startsWith(`${BUILD_DIR}${path.sep}`)) {
    sendJson(response, 400, { error: '잘못된 파일 경로입니다.' });
    return;
  }
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    if (path.extname(relativePath)) {
      sendJson(response, 404, { error: '요청한 파일을 찾을 수 없습니다.' });
      return;
    }
    filePath = path.join(BUILD_DIR, 'index.html');
  }

  const contentTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
  };
  response.writeHead(200, {
    'Content-Type': contentTypes[path.extname(filePath)] ?? 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
  });
  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  createReadStream(filePath).pipe(response);
}

export function createApiServer(database) {
  initializeDatabase(database);
  const createAdmin = (username, password) => {
    database.exec('BEGIN IMMEDIATE');
    try {
      if (database.prepare('SELECT COUNT(*) AS count FROM users').get().count !== 0) {
        const error = new Error('관리자 계정은 이미 설정되어 있습니다.');
        error.status = 409;
        throw error;
      }
      const { salt, hash } = hashPassword(password);
      const id = randomUUID();
      database
        .prepare(
          'INSERT INTO users (id, username, password_salt, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .run(id, username, salt, hash, 'admin', new Date().toISOString());
      database.exec('COMMIT');
      return id;
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }
  };

  const server = createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.setHeader('X-Frame-Options', 'DENY');

    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? '127.0.0.1'}`);
    if (!url.pathname.startsWith('/api/')) {
      staticResponse(request, response, url);
      return;
    }

    if (!checkOrigin(request)) {
      sendJson(response, 403, { error: '허용되지 않은 요청 출처입니다.' });
      return;
    }

    try {
      if (request.method === 'GET' && url.pathname === '/api/auth/status') {
        const user = getCurrentUser(database, request);
        const userCount = database.prepare('SELECT COUNT(*) AS count FROM users').get().count;
        sendJson(response, 200, { needsSetup: userCount === 0, user });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/auth/setup') {
        const body = await readJson(request);
        const credentials = validateCredentials(body);
        if (credentials.error) {
          sendJson(response, 400, { error: credentials.error });
          return;
        }
        const userCount = database.prepare('SELECT COUNT(*) AS count FROM users').get().count;
        if (userCount !== 0) {
          sendJson(response, 409, { error: '초기 관리자 계정은 이미 생성되었습니다.' });
          return;
        }
        const userId = createAdmin(credentials.username, credentials.password);
        sendJson(
          response,
          201,
          {
            user: database.prepare('SELECT id, username, role FROM users WHERE id = ?').get(userId),
          },
          { 'Set-Cookie': createSession(database, userId, request) }
        );
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/auth/login') {
        const attempts = getLoginLimit(request.socket.remoteAddress ?? 'unknown');
        if (attempts.attempts >= MAX_LOGIN_ATTEMPTS) {
          sendJson(response, 429, { error: '로그인 시도가 많습니다. 잠시 후 다시 시도해 주세요.' });
          return;
        }
        const body = await readJson(request);
        const valid =
          isRecord(body) &&
          typeof body.username === 'string' &&
          typeof body.password === 'string' &&
          body.username.trim().length <= 32 &&
          body.password.length <= 128;
        const username = valid ? body.username.trim().toLowerCase() : '';
        const user = valid
          ? database
              .prepare(
                'SELECT id, username, role, password_salt, password_hash FROM users WHERE username = ?'
              )
              .get(username)
          : null;
        const passwordMatches = user
          ? verifyPassword(body.password, user.password_salt, user.password_hash)
          : false;
        if (!user || !passwordMatches) {
          attempts.attempts++;
          sendJson(response, 401, { error: '사용자 이름 또는 비밀번호가 올바르지 않습니다.' });
          return;
        }
        loginAttempts.delete(request.socket.remoteAddress ?? 'unknown');
        const { id, username: safeUsername, role } = user;
        sendJson(
          response,
          200,
          { user: { id, username: safeUsername, role } },
          {
            'Set-Cookie': createSession(database, id, request),
          }
        );
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/auth/logout') {
        const token = readCookie(request, SESSION_COOKIE);
        if (token) {
          database
            .prepare('DELETE FROM sessions WHERE token_hash = ?')
            .run(hashSessionToken(token));
        }
        sendJson(response, 200, { ok: true }, { 'Set-Cookie': clearedSessionCookie(request) });
        return;
      }

      const currentUser = getCurrentUser(database, request);
      if (!currentUser) {
        sendJson(response, 401, { error: '로그인이 필요합니다.' });
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/workspace') {
        const row = database
          .prepare('SELECT data_json, updated_at FROM workspaces WHERE user_id = ?')
          .get(currentUser.id);
        sendJson(response, 200, {
          workspace: row ? JSON.parse(row.data_json) : null,
          updatedAt: row?.updated_at ?? null,
        });
        return;
      }

      if (request.method === 'PUT' && url.pathname === '/api/workspace') {
        const body = await readJson(request);
        if (!isRecord(body.workspace) || body.workspace.version !== 1) {
          sendJson(response, 400, { error: '지원하지 않는 작업공간 데이터 형식입니다.' });
          return;
        }
        const dataJson = JSON.stringify(body.workspace);
        if (Buffer.byteLength(dataJson, 'utf8') > MAX_JSON_BYTES) {
          sendJson(response, 413, { error: '작업공간 데이터가 허용 크기를 초과했습니다.' });
          return;
        }
        const updatedAt = new Date().toISOString();
        database
          .prepare(
            `
          INSERT INTO workspaces (user_id, data_json, updated_at) VALUES (?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at
        `
          )
          .run(currentUser.id, dataJson, updatedAt);
        sendJson(response, 200, { updatedAt });
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/admin/users') {
        if (currentUser.role !== 'admin') {
          sendJson(response, 403, { error: '관리자 권한이 필요합니다.' });
          return;
        }
        const users = database
          .prepare(
            'SELECT id, username, role, created_at AS createdAt FROM users ORDER BY created_at, username'
          )
          .all();
        sendJson(response, 200, { users });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/admin/users') {
        if (currentUser.role !== 'admin') {
          sendJson(response, 403, { error: '관리자 권한이 필요합니다.' });
          return;
        }
        const body = await readJson(request);
        const credentials = validateCredentials(body);
        if (credentials.error) {
          sendJson(response, 400, { error: credentials.error });
          return;
        }
        const existing = database
          .prepare('SELECT id FROM users WHERE username = ?')
          .get(credentials.username);
        if (existing) {
          sendJson(response, 409, { error: '이미 사용 중인 사용자 이름입니다.' });
          return;
        }
        const { salt, hash } = hashPassword(credentials.password);
        const user = {
          id: randomUUID(),
          username: credentials.username,
          role: 'user',
          createdAt: new Date().toISOString(),
        };
        try {
          database
            .prepare(
              'INSERT INTO users (id, username, password_salt, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
            )
            .run(user.id, user.username, salt, hash, user.role, user.createdAt);
        } catch (error) {
          if (error.code?.startsWith('ERR_SQLITE_CONSTRAINT')) {
            sendJson(response, 409, { error: '이미 사용 중인 사용자 이름입니다.' });
            return;
          }
          throw error;
        }
        sendJson(response, 201, { user });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/admin/users/reset-password') {
        if (currentUser.role !== 'admin') {
          sendJson(response, 403, { error: '관리자 권한이 필요합니다.' });
          return;
        }
        const body = await readJson(request);
        if (typeof body.userId !== 'string' || !body.userId) {
          sendJson(response, 400, { error: '사용자를 선택해 주세요.' });
          return;
        }
        resetPassword(database, body.userId, 'user', body.password);
        sendJson(response, 200, { ok: true });
        return;
      }

      sendJson(response, 404, { error: '요청한 API를 찾을 수 없습니다.' });
    } catch (error) {
      if (response.headersSent) {
        response.destroy(error);
        return;
      }
      const status = Number.isInteger(error.status) ? error.status : 500;
      if (status >= 500) console.error('Unhandled API error:', error);
      sendJson(response, status, {
        error: status >= 500 ? '서버 오류가 발생했습니다.' : error.message,
      });
    }
  });

  return server;
}
