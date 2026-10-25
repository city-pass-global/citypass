// Explicit, bounded real-connection lease probe. Never publishes events or confirms a delivery.
import assert from 'node:assert/strict';
import { workerCommand } from '../src/lib/activity/worker';
async function main() {
  assert.ok(process.argv.includes('--run'));
  assert.equal(
    new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname,
    'wafunogjrczlwvdnvyfs.supabase.co',
  );
  const results = await Promise.all([
    workerCommand({ action: 'claim' }),
    workerCommand({ action: 'claim' }),
  ]);
  assert.ok(results.every((result) => !result.error));
  const leased = results.flatMap((result) => (result.job ? [result.job] : []));
  assert.equal(leased.length, 1, 'independent HTTP requests must obtain only one issuer lease');
  const job = leased[0];
  const rejected = await workerCommand({
    action: 'finish',
    job_id: job.id,
    lease_token: '00000000-0000-4000-8000-000000000000',
    state: 'retry',
    error: 'rpc',
  });
  assert.equal(rejected.error, 'stale_lease');
  const released = await workerCommand({
    action: 'finish',
    job_id: job.id,
    lease_token: job.lease_token,
    state: 'retry',
    error: 'rpc',
  });
  assert.equal(released.ok, true);
  console.log(
    'Independent hosted claims serialized; wrong lease denied; real lease released without publication or confirmation.',
  );
}
main().catch(() => {
  console.error('Hosted activity lease probe failed; no payloads logged.');
  process.exitCode = 1;
});
