import { closeSync, openSync, unlinkSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { initializeDatabase } from './app.mjs';

function schema(database, schemaName) {
  return database
    .prepare(
      `SELECT type, name, tbl_name, sql FROM ${schemaName}.sqlite_schema
       WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name`
    )
    .all();
}

function expectedSchema() {
  const expected = new DatabaseSync(':memory:');
  try {
    initializeDatabase(expected);
    return JSON.stringify(schema(expected, 'main'));
  } finally {
    expected.close();
  }
}

export function backupDatabase(database, destination) {
  const descriptor = openSync(destination, 'wx', 0o600);
  closeSync(descriptor);
  try {
    database.prepare('VACUUM INTO ?').run(destination);
  } catch (error) {
    unlinkSync(destination);
    throw error;
  }
}

export function restoreDatabase(database, source) {
  database.prepare('ATTACH DATABASE ? AS backup').run(source);
  try {
    const expected = expectedSchema();
    if (
      JSON.stringify(schema(database, 'main')) !== expected ||
      JSON.stringify(schema(database, 'backup')) !== expected
    ) {
      throw new Error('현재 DB 또는 백업의 스키마가 이 버전과 일치하지 않습니다.');
    }
    const integrity = database.prepare('PRAGMA backup.integrity_check').all();
    if (integrity.length !== 1 || integrity[0].integrity_check !== 'ok') {
      throw new Error('백업 DB의 무결성 검사에 실패했습니다.');
    }
    if (database.prepare('PRAGMA backup.foreign_key_check').all().length !== 0) {
      throw new Error('백업 DB의 계정 참조가 올바르지 않습니다.');
    }
    database.exec('BEGIN IMMEDIATE');
    try {
      database.exec(`
        DELETE FROM main.sessions;
        DELETE FROM main.workspaces;
        DELETE FROM main.users;
        INSERT INTO main.users SELECT * FROM backup.users;
        INSERT INTO main.workspaces SELECT * FROM backup.workspaces;
      `);
      database.exec('COMMIT');
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }
  } finally {
    database.exec('DETACH DATABASE backup');
  }
}
