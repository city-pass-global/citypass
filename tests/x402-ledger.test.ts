import { describe, expect, it } from 'vitest';
import {
  Account,
  Address,
  Contract,
  Keypair,
  Networks,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  xdr,
} from '@stellar/stellar-sdk';
import { USDC_TESTNET_ADDRESS } from '@x402/stellar';
import { transferAuthorization, verifyAgentLedger } from '../src/lib/x402/ledger';
import { TESTNET_USDC_ISSUER, type Checkout } from '../src/lib/payments/validation';
const payer = Keypair.random();
const recipient = Keypair.random();
export const checkout: Checkout = {
  id: '10000000-0000-4000-8000-000000000001',
  organization_id: '20000000-0000-4000-8000-000000000001',
  destination_id: '30000000-0000-4000-8000-000000000001',
  merchant_name: 'Test seller',
  product: 'Test pass',
  amount: '100',
  network: 'testnet',
  asset_code: 'USDC',
  asset_issuer: TESTNET_USDC_ISSUER,
  payout_address: recipient.publicKey(),
  nonce: '11'.repeat(32),
  payer_address: payer.publicKey(),
  status: 'submitted',
  transaction_hash: null,
  created_at: '2026-10-25T20:00:00Z',
  expires_at: '2026-10-25T20:15:00Z',
  confirmed_at: null,
  destination_names: {},
  receipt: null,
};
function payment({
  from = payer.publicKey(),
  to = recipient.publicKey(),
  amount = 1000000000n,
  token = USDC_TESTNET_ADDRESS,
  nonce = 1n,
  extra = false,
  v2 = false,
} = {}) {
  const op = new Contract(token).call(
    'transfer',
    new Address(from).toScVal(),
    new Address(to).toScVal(),
    nativeToScVal(amount, { type: 'i128' }),
  );
  if (op.body.type !== 'invokeHostFunction') throw new Error('bad_fixture');
  const call = op.body.invokeHostFunctionOp.hostFunction;
  if (call.type !== 'hostFunctionTypeInvokeContract') throw new Error('bad_fixture');
  const invoke = new xdr.SorobanAuthorizedInvocation({
    function: xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
      call.invokeContract,
    ),
    subInvocations: [],
  });
  const credentials = new xdr.SorobanAddressCredentials({
    address: Address.fromString(from).toScAddress(),
    nonce,
    signatureExpirationLedger: 99999,
    signature: xdr.ScVal.scvVoid(),
  });
  const auth = new xdr.SorobanAuthorizationEntry({
    credentials: v2
      ? xdr.SorobanCredentials.sorobanCredentialsAddressV2(credentials)
      : xdr.SorobanCredentials.sorobanCredentialsAddress(credentials),
    rootInvocation: invoke,
  });
  const operation = new xdr.Operation({
    sourceAccount: null,
    body: xdr.OperationBody.invokeHostFunction(
      new xdr.InvokeHostFunctionOp({ hostFunction: call, auth: [auth] }),
    ),
  });
  const b = new TransactionBuilder(new Account(Keypair.random().publicKey(), '1'), {
    fee: '100',
    networkPassphrase: Networks.TESTNET,
  }).addOperation(operation);
  if (extra) b.addOperation(operation);
  return b.setTimeout(60).build();
}
function success(tx: ReturnType<typeof payment>): rpc.Api.GetTransactionResponse {
  return {
    status: 'SUCCESS',
    txHash: Buffer.from(tx.hash()).toString('hex'),
    ledger: 123,
    createdAt: 1792958460,
    envelopeXdr: tx.toEnvelope(),
    resultXdr: new xdr.TransactionResult({
      feeCharged: 100n,
      result: xdr.TransactionResultResult.txSuccess([]),
      ext: xdr.TransactionResultExt.fromXdrObject({ v: 0 }),
    }),
  } as rpc.Api.GetTransactionResponse;
}
describe('x402 independent settlement proof', () => {
  it('recognizes an exact transfer with V1 or V2 address credentials', () => {
    expect(transferAuthorization(payment().toXDR(), checkout)).toBeTruthy();
    expect(transferAuthorization(payment({ v2: true }).toXDR(), checkout)).toBeTruthy();
  });
  it.each([
    { from: Keypair.random().publicKey() },
    { to: Keypair.random().publicKey() },
    { amount: 1n },
    { token: Address.contract(Buffer.alloc(32, 3)).toString() },
    { extra: true },
  ])('denies changed payer, recipient, amount, contract or extra operations', (change) => {
    expect(() => transferAuthorization(payment(change).toXDR(), checkout)).toThrow();
  });
  it('accepts SUCCESS only when the chain envelope carries the originally signed authorization', () => {
    const tx = payment();
    const result = success(tx);
    expect(
      verifyAgentLedger({ ...checkout, transaction_hash: result.txHash }, tx.toXDR(), result),
    ).toEqual({ hash: result.txHash, ledger: 123, closed_at: 1792958460 });
    expect(() =>
      verifyAgentLedger(
        { ...checkout, transaction_hash: result.txHash },
        payment({ nonce: 2n }).toXDR(),
        result,
      ),
    ).toThrow('payment_proof');
  });
  it('denies failed, expired, incorrect hash and forged ledger metadata', () => {
    const tx = payment();
    const result = success(tx);
    const order = { ...checkout, transaction_hash: result.txHash };
    for (const change of [
      { status: 'FAILED' },
      { createdAt: 1 },
      { ledger: 0 },
      { txHash: 'ab'.repeat(32) },
      { createdAt: 1792960000 },
    ]) {
      expect(() =>
        verifyAgentLedger(order, tx.toXDR(), {
          ...result,
          ...change,
        } as rpc.Api.GetTransactionResponse),
      ).toThrow('payment_proof');
    }
  });
});
