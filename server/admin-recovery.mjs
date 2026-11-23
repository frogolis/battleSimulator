import { resetPassword } from './password.mjs';

export function resetAdminPassword(database, username, password) {
  if (typeof username !== 'string' || !/^[a-z0-9._-]{3,32}$/.test(username.trim().toLowerCase())) {
    throw new Error('올바른 관리자 사용자 이름을 입력해 주세요.');
  }
  const user = database
    .prepare("SELECT id FROM users WHERE username = ? AND role = 'admin'")
    .get(username.trim().toLowerCase());
  if (!user) throw new Error('관리자 계정을 찾을 수 없습니다.');
  resetPassword(database, user.id, 'admin', password);
}
