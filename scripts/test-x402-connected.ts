// Denial/replay checks. Only transient security nonces are written; no identities or payments.
import { createHmac, createHash, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { HTTPFacilitatorClient } from '@x402/core/server';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
assert.equal(
  new URL(url).hostname,
  'wafunogjrczlwvdnvyfs.supabase.co',
  'selected development target only',
);
const db = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = await db.rpc('x402_order_command', { action: 'list', payload: {} });
assert.equal(anon.error, null);
assert.equal(anon.data?.error, 'unauthorized');
const bad = await db.rpc('x402_delivery', { payload: '{}', mac: '00'.repeat(32) });
assert.equal(bad.error, null);
assert.equal(bad.data?.error, 'payment_proof');
const payload = JSON.stringify({
  action: 'resolve',
  request_id: randomUUID(),
  token_hash: createHash('sha256').update(randomUUID()).digest('hex'),
  issued_at: Math.floor(Date.now() / 1000),
  nonce: randomUUID(),
});
const mac = createHmac('sha256', Buffer.from(process.env.POLLAR_SESSION_BRIDGE_KEY!, 'hex'))
  .update('citypassport-x402-v1\n' + payload)
  .digest('hex');
const scoped = await db.rpc('x402_delivery', { payload, mac });
assert.equal(scoped.error, null);
assert.equal(scoped.data?.error, 'forbidden');
const replay = await db.rpc('x402_delivery', { payload, mac });
assert.equal(replay.error, null);
assert.equal(replay.data?.error, 'replay');
const supported = await new HTTPFacilitatorClient({
  url: 'https://www.x402.org/facilitator',
  timeoutMs: 10000,
}).getSupported();
assert.ok(
  supported.kinds.some(
    (k) =>
      k.x402Version === 2 &&
      k.scheme === 'exact' &&
      k.network === 'stellar:testnet' &&
      k.extra?.areFeesSponsored === true,
  ),
);
console.log(
  'Hosted x402 checks passed: anonymous denial, forged proof denial, scoped capability denial, nonce replay denial, facilitator Stellar testnet sponsorship. No payment submitted.',
);
