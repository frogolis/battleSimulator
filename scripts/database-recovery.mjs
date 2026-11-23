import { existsSync, realpathSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { DatabaseSync } from 'node:sqlite';
import { backupDatabase, restoreDatabase } from '../server/database-recovery.mjs';
import { getDatabasePath } from '../server/data-path.mjs';

async function main() {
  const [action, file] = process.argv.slice(2);
  if (!['backup', 'restore'].includes(action) || !file || process.argv.length !== 4) {
    throw new Error('사용법: npm run db-recovery -- backup|restore <파일 경로>');
  }
  const databasePath = getDatabasePath();
  const target = path.resolve(file);
  if (!existsSync(databasePath)) throw new Error('기존 데이터베이스를 찾을 수 없습니다.');
  if (action === 'restore') {
    if (!existsSync(target)) throw new Error('백업 파일을 찾을 수 없습니다.');
    if (realpathSync(databasePath) === realpathSync(target)) {
      throw new Error('현재 데이터베이스를 복구 파일로 사용할 수 없습니다.');
    }
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      throw new Error('복구 확인을 위해 대화형 터미널에서 실행해 주세요.');
    }
    const prompt = createInterface({ input: process.stdin, output: process.stdout });
    try {
      const answer = await prompt.question(
        '현재 계정과 작업공간을 백업 시점으로 교체합니다. 계속하려면 RESTORE를 입력하세요: '
      );
      if (answer !== 'RESTORE') throw new Error('복구를 취소했습니다.');
    } finally {
      prompt.close();
    }
  }

  const guard = createServer();
  await new Promise((resolve, reject) => {
    guard.once('error', reject);
    guard.listen(3001, '127.0.0.1', resolve);
  }).catch(error => {
    throw new Error(
      `서버 포트 3001을 사용할 수 없습니다. 앱 서버를 중지해 주세요: ${error.message}`
    );
  });
  try {
    const database = new DatabaseSync(databasePath);
    try {
      database.exec('PRAGMA foreign_keys = ON');
      if (action === 'backup') backupDatabase(database, target);
      else restoreDatabase(database, target);
    } finally {
      database.close();
    }
  } finally {
    await new Promise((resolve, reject) =>
      guard.close(error => (error ? reject(error) : resolve()))
    );
  }
  console.log(
    action === 'backup'
      ? `백업을 저장했습니다: ${target}`
      : '백업을 복구했습니다. 모든 로그인 세션이 만료되었습니다.'
  );
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
