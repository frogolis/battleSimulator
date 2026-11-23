import { randomBytes, scryptSync } from 'node:crypto';

export function hashPassword(password, salt = randomBytes(16)) {
  const hash = scryptSync(password, salt, 64);
  return { salt: salt.toString('hex'), hash: hash.toString('hex') };
}

export function validPassword(password) {
  return typeof password === 'string' && password.length >= 12 && password.length <= 128;
}

export function resetPassword(database, userId, role, password) {
  if (!validPassword(password)) {
    const error = new Error('비밀번호는 12~128자로 입력해 주세요.');
    error.status = 400;
    throw error;
  }
  const { salt, hash } = hashPassword(password);
  database.exec('BEGIN IMMEDIATE');
  try {
    const result = database
      .prepare('UPDATE users SET password_salt = ?, password_hash = ? WHERE id = ? AND role = ?')
      .run(salt, hash, userId, role);
    if (result.changes !== 1) {
      const error = new Error('해당 계정을 찾을 수 없습니다.');
      error.status = 404;
      throw error;
    }
    database.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}
