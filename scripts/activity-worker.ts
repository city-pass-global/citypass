import { setTimeout as delay } from 'node:timers/promises';
import { processActivityJob } from '../src/lib/activity/worker';
let stopped = false;
process.on('SIGINT', () => {
  stopped = true;
});
process.on('SIGTERM', () => {
  stopped = true;
});
const once = process.argv.includes('--once');
async function main() {
  do {
    try {
      const worked = await processActivityJob();
      if (once) return;
      if (!worked) await delay(3000);
    } catch {
      // Never print credentials, job payloads or raw provider/database errors.
      console.error('Activity worker unavailable; retrying automatically.');
      if (once) {
        process.exitCode = 1;
        return;
      }
      await delay(10000);
    }
  } while (!stopped);
}
void main();
