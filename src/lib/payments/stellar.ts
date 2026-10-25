import { canReceiveTestnetUsdc, canPayTestnetUsdc } from './recipient';
import {
  Asset,
  BASE_FEE,
  FeeBumpTransaction,
  Keypair,
  Memo,
  Networks,
  Operation,
  Transaction,
  TransactionBuilder,
  rpc,
} from '@stellar/stellar-sdk';
import { amountToStroops, type Checkout } from './validation';
import { z } from 'zod';
const ledgerMetadataSchema = z.object({
  txHash: z.string().regex(/^[a-f0-9]{64}$/),
  ledger: z.number().int().positive().safe(),
  // RPC transmits epoch seconds as decimal text, even when SDK typings say number.
  createdAt: z
    .union([
      z.number(),
      z
        .string()
        .regex(/^[1-9][0-9]{0,15}$/)
        .transform(Number),
    ])
    .pipe(z.number().int().positive().safe()),
});
export const testnetRpc = () =>
  new rpc.Server('https://soroban-testnet.stellar.org', { timeout: 10000 });
export async function buildCheckoutTransaction(checkout: Checkout) {
  if (!checkout.payer_address || checkout.status !== 'prepared') throw new Error('invalid_state');
  const deadline = Math.floor(Date.parse(checkout.expires_at) / 1000);
  if (deadline <= Math.floor(Date.now() / 1000)) throw new Error('expired');
  const [response, payerResponse] = await Promise.all([
    fetch(`https://horizon-testnet.stellar.org/accounts/${checkout.payout_address}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    }),
    fetch(`https://horizon-testnet.stellar.org/accounts/${checkout.payer_address}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    }),
  ]);
  if (!response.ok) throw new Error('recipient_unavailable');
  const recipient: unknown = await response.json();
  if (
    !recipient ||
    typeof recipient !== 'object' ||
    !('balances' in recipient) ||
    !canReceiveTestnetUsdc(recipient.balances, checkout.amount)
  )
    throw new Error('recipient_unavailable');
  if (payerResponse.status === 404) throw new Error('account_unfunded');
  if (!payerResponse.ok) throw new Error('unavailable');
  const payer: unknown = await payerResponse.json();
  if (
    !payer ||
    typeof payer !== 'object' ||
    !('balances' in payer) ||
    !canPayTestnetUsdc(payer.balances, checkout.amount)
  )
    throw new Error('insufficient_usdc');
  const account = await testnetRpc().getAccount(checkout.payer_address);
  return new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
    .addMemo(Memo.hash(checkout.nonce))
    .addOperation(
      Operation.payment({
        destination: checkout.payout_address,
        amount: checkout.amount,
        asset: new Asset(checkout.asset_code, checkout.asset_issuer),
      }),
    )
    .setTimebounds(0, deadline)
    .build()
    .toXDR();
}
export function verifyCheckoutEnvelope(
  checkout: Checkout,
  envelope: string,
  requireSignature = true,
) {
  const transaction = TransactionBuilder.fromXDR(envelope, Networks.TESTNET);
  const inner =
    transaction instanceof FeeBumpTransaction ? transaction.innerTransaction : transaction;
  if (
    !(inner instanceof Transaction) ||
    !checkout.payer_address ||
    inner.source !== checkout.payer_address ||
    inner.operations.length !== 1
  )
    throw new Error('payment_proof');
  const op = inner.operations[0];
  const memo = inner.memo;
  if (
    op.type !== 'payment' ||
    (op.source && op.source !== checkout.payer_address) ||
    op.destination !== checkout.payout_address ||
    op.asset.isNative() ||
    op.asset.getCode() !== checkout.asset_code ||
    op.asset.getIssuer() !== checkout.asset_issuer ||
    amountToStroops(op.amount) !== amountToStroops(checkout.amount) ||
    memo.type !== 'hash' ||
    !(memo.value instanceof Uint8Array) ||
    Buffer.from(memo.value).toString('hex') !== checkout.nonce
  )
    throw new Error('payment_proof');
  const maxTime = Number(inner.timeBounds?.maxTime ?? '0');
  if (
    !Number.isSafeInteger(maxTime) ||
    maxTime <= 0 ||
    maxTime > Math.floor(Date.parse(checkout.expires_at) / 1000)
  )
    throw new Error('payment_proof');
  if (
    requireSignature &&
    !inner.signatures.some((signature) => {
      try {
        return Keypair.fromPublicKey(checkout.payer_address!).verify(
          inner.hash(),
          signature.signature,
        );
      } catch {
        return false;
      }
    })
  )
    throw new Error('payment_proof');
  return { transaction, hash: Buffer.from(transaction.hash()).toString('hex'), maxTime };
}
export function evidenceBase(checkout: Checkout, hash: string) {
  return {
    request_id: checkout.id,
    network: checkout.network,
    source: checkout.payer_address,
    destination: checkout.payout_address,
    asset_code: checkout.asset_code,
    asset_issuer: checkout.asset_issuer,
    amount: checkout.amount,
    nonce: checkout.nonce,
    hash,
  };
}
export function verifyCheckoutLedger(
  checkout: Checkout,
  envelope: string,
  hash: string,
  ledger: number,
  closedAt: number,
  status: 'SUCCESS' | 'FAILED',
) {
  const verified = verifyCheckoutEnvelope(checkout, envelope);
  if (
    verified.hash !== hash ||
    hash !== checkout.transaction_hash ||
    !Number.isSafeInteger(ledger) ||
    ledger <= 0 ||
    !Number.isSafeInteger(closedAt) ||
    closedAt <= 0
  )
    throw new Error('payment_proof');
  if (
    status === 'SUCCESS' &&
    (closedAt > Math.floor(Date.parse(checkout.expires_at) / 1000) ||
      closedAt < Math.floor(Date.parse(checkout.created_at) / 1000) - 30)
  )
    throw new Error('payment_proof');
  return {
    ...evidenceBase(checkout, hash),
    kind: status === 'SUCCESS' ? 'confirmed' : 'failed',
    ledger,
    closed_at: closedAt,
  };
}
export function verifyCheckoutRpcResult(
  checkout: Checkout,
  result: rpc.Api.GetTransactionResponse,
) {
  if (result.status !== 'SUCCESS' && result.status !== 'FAILED') throw new Error('payment_proof');
  const metadata = ledgerMetadataSchema.safeParse(result);
  if (!metadata.success || metadata.data.txHash !== checkout.transaction_hash)
    throw new Error('payment_proof');
  const code = result.resultXdr.result;
  if (
    result.status === 'SUCCESS' &&
    code.type !== 'txSuccess' &&
    !(
      code.type === 'txFeeBumpInnerSuccess' &&
      code.innerResultPair.result.result.type === 'txSuccess'
    )
  )
    throw new Error('payment_proof');
  return verifyCheckoutLedger(
    checkout,
    result.envelopeXdr.toXDR('base64'),
    metadata.data.txHash,
    metadata.data.ledger,
    metadata.data.createdAt,
    result.status,
  );
}
