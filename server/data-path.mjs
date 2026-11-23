import { homedir } from 'node:os';
import path from 'node:path';

export function getDatabasePath() {
  const dataDirectory = process.env.BATTLE_SIMULATOR_DATA_DIR
    ? path.resolve(process.env.BATTLE_SIMULATOR_DATA_DIR)
    : path.join(homedir(), '.battle-simulator');
  return path.join(dataDirectory, 'battle-simulator.sqlite');
}
