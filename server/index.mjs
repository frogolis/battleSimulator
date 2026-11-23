import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createApiServer } from './app.mjs';

const dataDirectory = process.env.BATTLE_SIMULATOR_DATA_DIR
  ? path.resolve(process.env.BATTLE_SIMULATOR_DATA_DIR)
  : path.join(homedir(), '.battle-simulator');
mkdirSync(dataDirectory, { recursive: true });

const database = new DatabaseSync(path.join(dataDirectory, 'battle-simulator.sqlite'));
database.exec('PRAGMA journal_mode = WAL;');
const server = createApiServer(database);

server.listen(3001, '127.0.0.1', () => {
  console.log('Battle Simulator API listening at http://127.0.0.1:3001');
  console.log(`SQLite database: ${path.join(dataDirectory, 'battle-simulator.sqlite')}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => {
      database.close();
      process.exit(0);
    });
  });
}
