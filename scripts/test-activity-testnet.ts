// Explicit testnet integration test. Deploys a SEPARATE fixture contract; never writes app activity.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import {
  contract,
  Keypair,
  Networks,
  rpc,
  TransactionBuilder,
  Transaction,
} from '@stellar/stellar-sdk';
import {
  activityClient,
  deliverActivity,
  readChainActivity,
  type ActivityContract,
} from '../src/lib/activity/chain';
import { activityEvidence } from '../src/lib/activity/validation';

let stage = 'initialization';
async function main() {
  assert.ok(
    process.argv.includes('--run'),
    'Pass --run to fund ephemeral testnet accounts and deploy an isolated test contract.',
  );
  const deployment = JSON.parse(
    await readFile('contracts/passport-activity/testnet-deployment.json', 'utf8'),
  ) as { wasmHash: string; contractId: string };
  const issuer = Keypair.random();
  const wallet = Keypair.random();
  const server = new rpc.Server('https://soroban-testnet.stellar.org', { timeout: 15000 });
  stage = 'funding isolated accounts';
  await Promise.all([
    server.fundAddress(issuer.publicKey()),
    server.fundAddress(wallet.publicKey()),
  ]);
  const signer = (key: Keypair) => contract.basicNodeSigner(key, Networks.TESTNET).signTransaction;
  stage = 'deploying fixture';
  const transaction = await contract.Client.deploy<contract.Client & ActivityContract>(
    { issuer: issuer.publicKey() },
    {
      wasmHash: deployment.wasmHash,
      publicKey: issuer.publicKey(),
      signTransaction: signer(issuer),
      rpcUrl: 'https://soroban-testnet.stellar.org',
      networkPassphrase: Networks.TESTNET,
      timeoutInSeconds: 30,
    },
  );
  const isolated = (await transaction.signAndSend()).result.options.contractId;
  assert.notEqual(isolated, deployment.contractId);
  process.env.STELLAR_ACTIVITY_NETWORK = 'testnet';
  process.env.STELLAR_ACTIVITY_CONTRACT_ID = isolated;
  process.env.STELLAR_ACTIVITY_ISSUER_SECRET = issuer.secret();
  process.env.STELLAR_ACTIVITY_HASH_KEY = randomBytes(32).toString('hex');
  await mkdir('.stellar', { recursive: true, mode: 0o700 });
  await writeFile(
    '.stellar/integration-keys.json',
    JSON.stringify({ issuer: issuer.secret(), wallet: wallet.secret(), contractId: isolated }),
    { mode: 0o600 },
  );
  stage = 'loading fixture clients';
  const user = await activityClient(wallet.publicKey(), signer(wallet));
  const issuerClient = await activityClient(issuer.publicKey(), signer(issuer));
  assert.equal(await readChainActivity(wallet.publicKey()), null);
  stage = 'issuer-sponsored passport registration';
  const registration = await issuerClient.register(
    { user: wallet.publicKey() },
    { timeoutInSeconds: 30 },
  );
  const sent = await registration.signAndSend();
  assert.equal(sent.getTransactionResponse?.status, 'SUCCESS');
  await assert.rejects(async () => {
    const denied = await user.register({ user: wallet.publicKey() });
    await denied.signAndSend();
  });
  const source = {
    id: '10000000-0000-4000-8000-000000000001',
    destination_id: '20000000-0000-4000-8000-000000000001',
    subject: '30000000-0000-4000-8000-000000000001',
    kind: 1 as const,
  };
  stage = 'delivering fixture event';
  await deliverActivity(source, wallet.publicKey());
  await deliverActivity(source, wallet.publicKey()); // Recovery path must avoid another submission.
  const evidence = activityEvidence(
    source,
    wallet.publicKey(),
    process.env.STELLAR_ACTIVITY_HASH_KEY,
  );
  stage = 'replaying fixture event';
  const replay = await issuerClient.record(evidence, { timeoutInSeconds: 30 });
  assert.equal((await replay.signAndSend()).getTransactionResponse?.status, 'SUCCESS');
  stage = 'checking denials';
  await assert.rejects(async () => {
    const unauthorized = await user.record({ ...evidence, event_id: randomBytes(32) });
    await unauthorized.signAndSend();
  });
  const conflict = await issuerClient.record({
    ...evidence,
    record: { ...evidence.record, kind: 2 },
  });
  assert.ok(conflict.result instanceof contract.Err);
  stage = 'checking final counts';
  const activity = await readChainActivity(wallet.publicKey());
  assert.deepEqual(activity, { purchases: 1, stamps: 0, redemptions: 0, reputation: '80' });
  const report = {
    network: 'testnet',
    applicationContract: deployment.contractId,
    isolatedFixtureContract: isolated,
    registrationHash: sent.sendTransactionResponse?.hash,
    verified: [
      'issuer-sponsored passport registration',
      'issuer record',
      'recovery skips accepted event',
      'on-chain replay is idempotent',
      'unauthorized issuer denied',
      'changed replay denied',
    ],
    fixtureActivity: activity,
  };
  await writeFile('.stellar/integration-report.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
main().catch((error: unknown) => {
  console.error(
    `Testnet integration failed at ${stage} (${error instanceof Error ? error.name : 'unknown'}); no keys or payloads logged.`,
  );
  process.exitCode = 1;
});
