import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createApiServer } from './app.mjs';
import { getDatabasePath } from './data-path.mjs';

const databasePath = getDatabasePath();
mkdirSync(path.dirname(databasePath), { recursive: true });

const database = new DatabaseSync(databasePath);
database.exec('PRAGMA journal_mode = WAL;');
const server = createApiServer(database);

server.listen(3001, '127.0.0.1', () => {
  console.log('Battle Simulator API listening at http://127.0.0.1:3001');
  console.log(`SQLite database: ${databasePath}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => {
      database.close();
      process.exit(0);
    });
  });
}
