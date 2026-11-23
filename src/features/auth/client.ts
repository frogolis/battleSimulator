import type { WorkspaceSnapshot } from '../workspace/model';

export interface AuthUser {
  id: string;
  username: string;
  role: 'admin' | 'user';
}

export interface AuthStatus {
  needsSetup: boolean;
  user: AuthUser | null;
}

export interface ManagedUser extends AuthUser {
  createdAt: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function requestJson<T>(path: string, init?: Parameters<typeof fetch>[1]): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError('서버 응답을 읽을 수 없습니다.', response.status);
  }
  if (!response.ok) {
    const message =
      typeof payload === 'object' &&
      payload !== null &&
      'error' in payload &&
      typeof payload.error === 'string'
        ? payload.error
        : `요청에 실패했습니다 (${response.status}).`;
    throw new ApiError(message, response.status);
  }
  return payload as T;
}

export function getAuthStatus(): Promise<AuthStatus> {
  return requestJson('/api/auth/status');
}

export function login(username: string, password: string): Promise<{ user: AuthUser }> {
  return requestJson('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function setupAdmin(username: string, password: string): Promise<{ user: AuthUser }> {
  return requestJson('/api/auth/setup', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function logout(): Promise<{ ok: boolean }> {
  return requestJson('/api/auth/logout', { method: 'POST' });
}

export function getWorkspace(): Promise<{
  workspace: unknown | null;
  updatedAt: string | null;
}> {
  return requestJson('/api/workspace');
}

export function saveWorkspace(workspace: WorkspaceSnapshot): Promise<{ updatedAt: string }> {
  return requestJson('/api/workspace', {
    method: 'PUT',
    body: JSON.stringify({ workspace }),
  });
}

export function getManagedUsers(): Promise<{ users: ManagedUser[] }> {
  return requestJson('/api/admin/users');
}

export function createManagedUser(
  username: string,
  password: string
): Promise<{ user: ManagedUser }> {
  return requestJson('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}
