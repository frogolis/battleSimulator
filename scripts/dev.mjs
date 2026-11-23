import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const processes = [
  spawn(process.execPath, ['server/index.mjs'], { cwd: root, stdio: 'inherit' }),
  spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js')], {
    cwd: root,
    stdio: 'inherit',
  }),
];
let stopping = false;

function stopProcesses(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of processes) {
    if (child.exitCode === null) child.kill();
  }
  process.exitCode = exitCode;
}

for (const child of processes) {
  child.on('error', error => {
    console.error('Failed to start development process:', error);
    stopProcesses(1);
  });
  child.on('exit', code => {
    if (!stopping) stopProcesses(code ?? 1);
  });
}

process.on('SIGINT', () => stopProcesses(0));
process.on('SIGTERM', () => stopProcesses(0));
