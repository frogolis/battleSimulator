import { existsSync } from 'node:fs';
import { emitKeypressEvents } from 'node:readline';
import { DatabaseSync } from 'node:sqlite';
import { resetAdminPassword } from '../server/admin-recovery.mjs';
import { getDatabasePath } from '../server/data-path.mjs';

function readPassword(prompt) {
  return new Promise((resolve, reject) => {
    process.stdout.write(prompt);
    const input = process.stdin;
    emitKeypressEvents(input);
    input.setRawMode(true);
    input.resume();
    let value = '';
    const cleanup = () => {
      input.removeListener('keypress', onKeypress);
      input.setRawMode(false);
      input.pause();
      process.stdout.write('\n');
    };
    const onKeypress = (text, key) => {
      if (key.ctrl && key.name === 'c') {
        cleanup();
        reject(new Error('비밀번호 재설정을 취소했습니다.'));
      } else if (key.name === 'return' || key.name === 'enter') {
        cleanup();
        resolve(value);
      } else if (key.name === 'backspace') {
        value = Array.from(value).slice(0, -1).join('');
      } else if (!key.ctrl && !key.meta && text && !/[\x00-\x1f\x7f]/.test(text)) {
        value += text;
      }
    };
    input.on('keypress', onKeypress);
  });
}

async function main() {
  const username = process.argv[2];
  if (!username || process.argv.length !== 3) {
    throw new Error('사용법: npm run reset-admin -- <관리자 사용자 이름>');
  }
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('안전한 비밀번호 입력을 위해 대화형 터미널에서 실행해 주세요.');
  }
  const databasePath = getDatabasePath();
  if (!existsSync(databasePath)) throw new Error('기존 데이터베이스를 찾을 수 없습니다.');
  const password = await readPassword('새 관리자 비밀번호 (입력 내용 숨김): ');
  const confirmation = await readPassword('새 비밀번호 확인: ');
  if (password !== confirmation) throw new Error('비밀번호 확인이 일치하지 않습니다.');
  const database = new DatabaseSync(databasePath, { open: true });
  try {
    database.exec('PRAGMA foreign_keys = ON');
    resetAdminPassword(database, username, password);
  } finally {
    database.close();
  }
  console.log('관리자 비밀번호를 재설정했습니다. 기존 세션은 모두 만료됩니다.');
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
