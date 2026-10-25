import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const mode = process.argv[2];
if (!['dev', 'start'].includes(mode)) throw new Error('Invalid app mode');
const app = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', mode, '--hostname', '127.0.0.1', ...process.argv.slice(3)],
  { stdio: 'inherit' },
);
const enabled =
  process.env.ACTIVITY_WORKER_DISABLED !== '1' &&
  process.env.STELLAR_ACTIVITY_ISSUER_SECRET &&
  process.env.STELLAR_ACTIVITY_CONTRACT_ID;
const worker = enabled
  ? spawn(
      process.execPath,
      ['--conditions=react-server', '--import', 'tsx', 'scripts/activity-worker.ts'],
      { stdio: 'inherit' },
    )
  : null;
let stopping = false;
function stop(signal) {
  if (stopping) return;
  stopping = true;
  app.kill(signal);
  worker?.kill(signal);
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop(signal));
app.on('exit', (code) => {
  worker?.kill('SIGTERM');
  process.exitCode = code ?? 1;
});
worker?.on('exit', () => {
  if (!stopping && app.exitCode === null) {
    console.error('Activity worker stopped; stopping app to avoid silent publishing failure.');
    app.kill('SIGTERM');
    process.exitCode = 1;
  }
});
