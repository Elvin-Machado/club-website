import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';

if (existsSync('.env')) process.loadEnvFile('.env');
const children = [
  spawn(process.execPath, ['server/index.mjs'], { stdio: 'inherit' }),
  spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', process.env.WEB_HOST || '0.0.0.0', '--port', process.env.WEB_PORT || '3000'], { stdio: 'inherit' }),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
}
for (const child of children) {
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => stop(code ?? 1));
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
