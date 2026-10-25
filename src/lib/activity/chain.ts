import 'server-only';
import { contract, Keypair, Networks, StrKey } from '@stellar/stellar-sdk';
import { z } from 'zod';
import { activitySchema, type ActivitySource, activityEvidence } from './validation';

export const ACTIVITY_RPC = 'https://soroban-testnet.stellar.org';
export type ActivityRecord = { user: string; destination: Buffer; subject: Buffer; kind: number };
export interface ActivityContract {
  issuer: () => Promise<contract.AssembledTransaction<string>>;
  activity: (args: { user: string }) => Promise<contract.AssembledTransaction<unknown>>;
  event: (args: {
    event_id: Buffer;
  }) => Promise<contract.AssembledTransaction<ActivityRecord | undefined>>;
  register: (
    args: { user: string },
    options?: contract.MethodOptions,
  ) => Promise<contract.AssembledTransaction<void>>;
  record: (
    args: { event_id: Buffer; record: ActivityRecord },
    options?: contract.MethodOptions,
  ) => Promise<contract.AssembledTransaction<unknown>>;
}
export function activityConfig() {
  const contractId = process.env.STELLAR_ACTIVITY_CONTRACT_ID;
  if (
    !contractId ||
    !StrKey.isValidContract(contractId) ||
    process.env.STELLAR_ACTIVITY_NETWORK !== 'testnet'
  )
    throw new Error('activity_unavailable');
  return { contractId, rpcUrl: ACTIVITY_RPC, networkPassphrase: Networks.TESTNET };
}
export const activityClient = (
  publicKey: string,
  signTransaction?: contract.ClientOptions['signTransaction'],
) => contract.Client.from<ActivityContract>({ ...activityConfig(), publicKey, signTransaction });
export async function readChainActivity(wallet: string) {
  const client = await activityClient(wallet);
  const value = (await client.activity({ user: wallet })).result;
  return value == null ? null : activitySchema.parse(value);
}
export async function deliverActivity(source: ActivitySource, wallet: string) {
  const secret = z.string().min(1).parse(process.env.STELLAR_ACTIVITY_ISSUER_SECRET);
  const key = z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .parse(process.env.STELLAR_ACTIVITY_HASH_KEY);
  const issuer = Keypair.fromSecret(secret);
  const client = await activityClient(
    issuer.publicKey(),
    contract.basicNodeSigner(issuer, Networks.TESTNET).signTransaction,
  );
  if ((await client.issuer()).result !== issuer.publicKey())
    throw new Error('activity_unavailable');
  const evidence = activityEvidence(source, wallet, key);
  const prior = (await client.event({ event_id: evidence.event_id })).result;
  if (prior) {
    if (
      prior.user !== wallet ||
      prior.kind !== evidence.record.kind ||
      !Buffer.from(prior.destination).equals(evidence.record.destination) ||
      !Buffer.from(prior.subject).equals(evidence.record.subject)
    )
      throw new Error('activity_conflict');
    return { evidenceHash: evidence.event_id.toString('hex') };
  }
  const tx = await client.record(evidence, { timeoutInSeconds: 20 });
  if (tx.result instanceof contract.Err) throw new Error('activity_conflict');
  // Bound issuer spending even if simulation's resource estimate changes unexpectedly.
  if (!tx.built || BigInt(tx.built.fee) > 10_000_000n) throw new Error('activity_fee');
  const sent = await tx.signAndSend();
  if (sent.getTransactionResponse?.status !== 'SUCCESS') throw new Error('activity_pending');
  if (sent.result instanceof contract.Err) throw new Error('activity_conflict');
  return {
    evidenceHash: evidence.event_id.toString('hex'),
    transactionHash: sent.getTransactionResponse.txHash,
  };
  // Delivery is recovered from the immutable contract event on the next attempt if a response is lost.
}
export async function registerPassport(wallet: string) {
  const issuer = Keypair.fromSecret(z.string().parse(process.env.STELLAR_ACTIVITY_ISSUER_SECRET));
  if (await readChainActivity(wallet)) return;
  const client = await activityClient(
    issuer.publicKey(),
    contract.basicNodeSigner(issuer, Networks.TESTNET).signTransaction,
  );
  if ((await client.issuer()).result !== issuer.publicKey())
    throw new Error('activity_unavailable');
  const tx = await client.register({ user: wallet }, { timeoutInSeconds: 20 });
  if (!tx.built || BigInt(tx.built.fee) > 10_000_000n) throw new Error('activity_fee');
  const sent = await tx.signAndSend();
  if (sent.getTransactionResponse?.status !== 'SUCCESS') throw new Error('activity_pending');
}
