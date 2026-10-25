// Run with a dedicated testnet agent wallet. Never export a traveler's Pollar key.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { x402Client, x402HTTPClient } from '@x402/fetch';
import { createEd25519Signer, USDC_TESTNET_ADDRESS } from '@x402/stellar';
import { ExactStellarScheme } from '@x402/stellar/exact/client';
import { z } from 'zod';
const config = z
  .object({
    X402_AGENT_SECRET: z.string().regex(/^S[A-Z2-7]{55}$/),
    X402_PURCHASE_TOKEN: z.string().regex(/^[a-f0-9]{64}$/),
    X402_PURCHASE_URL: z.string().url(),
  })
  .safeParse(process.env);
if (!config.success) {
  console.error(
    'Set X402_AGENT_SECRET, X402_PURCHASE_TOKEN and X402_PURCHASE_URL in an ignored environment file.',
  );
  process.exit(1);
}
const { X402_AGENT_SECRET, X402_PURCHASE_TOKEN, X402_PURCHASE_URL } = config.data;
const url = new URL(X402_PURCHASE_URL);
const expectedOrigin = new URL(process.env.APP_ORIGIN ?? 'http://localhost:3000').origin;
if (
  url.origin !== expectedOrigin ||
  !/^\/api\/agent\/passes\/[a-f0-9-]{36}$/.test(url.pathname) ||
  url.search ||
  url.hash ||
  (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname))
)
  throw new Error('Invalid purchase URL');
const headers = { Authorization: `Bearer ${X402_PURCHASE_TOKEN}` };
async function run() {
  let response = await fetch(url, { headers, redirect: 'error' });
  const client = new x402Client().register(
    'stellar:testnet',
    new ExactStellarScheme(createEd25519Signer(X402_AGENT_SECRET, 'stellar:testnet')),
  );
  const http = new x402HTTPClient(client);
  if (response.status === 402) {
    const required = http.getPaymentRequiredResponse((name) => response.headers.get(name));
    // Explicit budget and asset/network checks before signing anything.
    if (
      required.accepts.length !== 1 ||
      required.accepts[0].network !== 'stellar:testnet' ||
      required.accepts[0].asset !== USDC_TESTNET_ADDRESS ||
      required.accepts[0].amount !== '1000000000' ||
      required.accepts[0].scheme !== 'exact' ||
      required.resource?.url !== url.toString()
    )
      throw new Error('Unexpected payment requirements');
    await mkdir('.x402', { recursive: true, mode: 0o700 });
    const path = `.x402/${url.pathname.split('/').at(-1)}.json`;
    let payment;
    try {
      payment = JSON.parse(await readFile(path, 'utf8'));
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
      payment = await client.createPaymentPayload(required);
      // Save before sending: retries use the same signed authorization, never another charge.
      await writeFile(path, JSON.stringify(payment), { flag: 'wx', mode: 0o600 });
    }
    response = await fetch(url, {
      headers: { ...headers, ...http.encodePaymentSignatureHeader(payment) },
      redirect: 'error',
    });
  }
  if (response.status === 202) {
    console.log(
      'Settlement is pending. Re-run to check status. Do not create another purchase or authorization. If the facilitator response was lost, recover using the settled transaction hash described in docs/X402.md.',
    );
    return;
  }
  if (response.status !== 200) {
    console.error(
      `Purchase returned HTTP ${response.status}; no new authorization will be generated for this order.`,
    );
    process.exitCode = 1;
    return;
  }
  const body = z
    .object({
      status: z.literal('confirmed'),
      receipt: z.object({ transaction_hash: z.string().regex(/^[a-f0-9]{64}$/) }),
    })
    .parse(await response.json());
  console.log(
    `Pass confirmed: https://stellar.expert/explorer/testnet/tx/${body.receipt.transaction_hash}`,
  );
}
run().catch(() => {
  console.error(
    'Agent request failed. Check the order before retrying; credentials and payment payloads are not logged.',
  );
  process.exitCode = 1;
});
