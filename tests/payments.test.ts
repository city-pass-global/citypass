import { describe, it, expect } from 'vitest';
import {
  Account,
  Asset,
  Keypair,
  Memo,
  Networks,
  Operation,
  TransactionBuilder,
  Transaction,
  xdr,
  rpc,
} from '@stellar/stellar-sdk';
import {
  amountToStroops,
  checkoutIdFromQr,
  TESTNET_USDC_ISSUER,
  type Checkout,
} from '../src/lib/payments/validation';
import {
  verifyCheckoutEnvelope,
  verifyCheckoutLedger,
  verifyCheckoutRpcResult,
} from '../src/lib/payments/stellar';
import { transactionExplorerUrl, ledgerExplorerUrl } from '../src/lib/payments/explorer';
const payer = Keypair.random(),
  merchant = Keypair.random();
const now = Math.floor(Date.now() / 1000);
const checkout: Checkout = {
  id: '90000000-0000-4000-8000-000000000001',
  organization_id: '90000000-0000-4000-8000-000000000002',
  destination_id: '90000000-0000-4000-8000-000000000003',
  merchant_name: 'Unit test only',
  product: 'Unit test',
  amount: '1.0000001',
  network: 'testnet',
  asset_code: 'USDC',
  asset_issuer: TESTNET_USDC_ISSUER,
  payout_address: merchant.publicKey(),
  nonce: 'a'.repeat(64),
  payer_address: payer.publicKey(),
  status: 'prepared',
  transaction_hash: null,
  created_at: new Date(now * 1000).toISOString(),
  expires_at: new Date((now + 900) * 1000).toISOString(),
  confirmed_at: null,
  destination_names: { en: 'Test' },
  receipt: null,
};
function envelope(
  options: {
    amount?: string;
    issuer?: string;
    destination?: string;
    source?: string;
    nonce?: string;
    maxTime?: number;
    extra?: boolean;
    unsigned?: boolean;
    network?: string;
  } = {},
) {
  const tx = new TransactionBuilder(new Account(options.source ?? payer.publicKey(), '1'), {
    fee: '100',
    networkPassphrase: options.network ?? Networks.TESTNET,
  })
    .addMemo(Memo.hash(options.nonce ?? checkout.nonce))
    .addOperation(
      Operation.payment({
        destination: options.destination ?? merchant.publicKey(),
        amount: options.amount ?? checkout.amount,
        asset: new Asset('USDC', options.issuer ?? TESTNET_USDC_ISSUER),
      }),
    );
  if (options.extra)
    tx.addOperation(
      Operation.payment({ destination: merchant.publicKey(), amount: '1', asset: Asset.native() }),
    );
  const built = tx.setTimebounds(0, options.maxTime ?? now + 900).build();
  if (!options.unsigned) built.sign(payer);
  return built.toXDR();
}
describe('exact checkout boundaries', () => {
  it('confirms a fee-sponsored payment when RPC returns epoch seconds as text', () => {
    const inner = TransactionBuilder.fromXDR(envelope(), Networks.TESTNET) as Transaction;
    const feeBump = TransactionBuilder.buildFeeBumpTransaction(
      merchant,
      '100',
      inner,
      Networks.TESTNET,
    );
    feeBump.sign(merchant);
    const hash = Buffer.from(feeBump.hash()).toString('hex');
    const submitted = { ...checkout, status: 'submitted' as const, transaction_hash: hash };
    const resultXdr = new xdr.TransactionResult({
      feeCharged: 200n,
      result: xdr.TransactionResultResult.txFeeBumpInnerSuccess(
        new xdr.InnerTransactionResultPair({
          transactionHash: inner.hash(),
          result: new xdr.InnerTransactionResult({
            feeCharged: 100n,
            result: xdr.InnerTransactionResultResult.txSuccess([
              xdr.OperationResult.opInner(
                xdr.OperationResultTr.payment(xdr.PaymentResult.paymentSuccess()),
              ),
            ]),
            ext: xdr.InnerTransactionResultExt.v0(),
          }),
        }),
      ),
      ext: xdr.TransactionResultExt.v0(),
    });
    const response = {
      status: 'SUCCESS',
      txHash: hash,
      ledger: 123,
      createdAt: String(now + 5),
      envelopeXdr: xdr.TransactionEnvelope.fromXDR(feeBump.toXDR(), 'base64'),
      resultXdr,
    };
    // The actual RPC wire response can contain text despite the SDK's number declaration.
    const verify = (patch: Record<string, unknown> = {}) =>
      verifyCheckoutRpcResult(submitted, {
        ...response,
        ...patch,
      } as unknown as rpc.Api.GetTransactionResponse);
    expect(verify()).toMatchObject({ kind: 'confirmed', hash, ledger: 123, closed_at: now + 5 });
    expect(verify({ createdAt: now + 5 }).kind).toBe('confirmed');
    for (const createdAt of [
      null,
      '',
      '1e9',
      '1792267682seconds',
      '0',
      String(now + 901),
      Number.MAX_SAFE_INTEGER + 1,
    ])
      expect(() => verify({ createdAt })).toThrow();
    expect(() => verify({ txHash: '0'.repeat(64) })).toThrow();
    expect(() => verify({ ledger: 0 })).toThrow();
    const failed = new xdr.TransactionResult({
      feeCharged: 200n,
      result: xdr.TransactionResultResult.txFailed([]),
      ext: xdr.TransactionResultExt.v0(),
    });
    expect(() => verify({ resultXdr: failed })).toThrow();
    expect(verify({ status: 'FAILED', resultXdr: failed }).kind).toBe('failed');
    expect(() =>
      verifyCheckoutRpcResult(
        { ...submitted, nonce: 'f'.repeat(64) },
        response as unknown as rpc.Api.GetTransactionResponse,
      ),
    ).toThrow();
  });
  it('links only validated testnet transaction hashes and ledgers to StellarExpert', () => {
    expect(transactionExplorerUrl('testnet', 'ab'.repeat(32))).toBe(
      'https://stellar.expert/explorer/testnet/tx/' + 'ab'.repeat(32),
    );
    expect(ledgerExplorerUrl('testnet', 1000)).toBe(
      'https://stellar.expert/explorer/testnet/ledger/1000',
    );
    for (const hash of ['../account/other', 'https://evil.example', 'ab'])
      expect(() => transactionExplorerUrl('testnet', hash)).toThrow();
    for (const ledger of [0, -1, 1.5, NaN])
      expect(() => ledgerExplorerUrl('testnet', ledger)).toThrow();
  });
  it('keeps seven-decimal amounts as integers', () => {
    expect(amountToStroops('1.0000001')).toBe(10000001n);
    expect(amountToStroops('922337203685.4775807')).toBe(9223372036854775807n);
    for (const value of ['0', '-1', '1e2', '0.00000001', '922337203685.4775808', '1,5', '01'])
      expect(() => amountToStroops(value)).toThrow();
  });
  it('accepts only local checkout URLs', () => {
    const path = '/en/checkout/' + checkout.id;
    expect(checkoutIdFromQr('https://travel.example' + path, 'https://travel.example')).toBe(
      checkout.id,
    );
    for (const url of [
      'https://evil.example' + path,
      'https://travel.example' + path + '?amount=1',
      'https://travel.example/en/claim#token=a',
    ])
      expect(checkoutIdFromQr(url, 'https://travel.example')).toBeNull();
  });
  it('accepts the exact signed payment and rejects every settlement-field mismatch', () => {
    const valid = verifyCheckoutEnvelope(checkout, envelope());
    expect(valid.hash).toHaveLength(64);
    for (const options of [
      { amount: '1' },
      { issuer: Keypair.random().publicKey() },
      { destination: payer.publicKey() },
      { source: merchant.publicKey() },
      { nonce: 'b'.repeat(64) },
      { maxTime: now + 901 },
      { maxTime: 0 },
      { extra: true },
      { unsigned: true },
      { network: Networks.PUBLIC },
    ]) {
      expect(() => verifyCheckoutEnvelope(checkout, envelope(options))).toThrow();
    }
  });
  it('requires the recorded hash and valid ledger inclusion time', () => {
    const xdr = envelope();
    const hash = verifyCheckoutEnvelope(checkout, xdr).hash;
    const submitted = { ...checkout, transaction_hash: hash, status: 'submitted' as const };
    expect(verifyCheckoutLedger(submitted, xdr, hash, 123, now + 5, 'SUCCESS').kind).toBe(
      'confirmed',
    );
    expect(() =>
      verifyCheckoutLedger(submitted, xdr, '0'.repeat(64), 123, now + 5, 'SUCCESS'),
    ).toThrow();
    expect(() => verifyCheckoutLedger(submitted, xdr, hash, 0, now + 5, 'SUCCESS')).toThrow();
    expect(() => verifyCheckoutLedger(submitted, xdr, hash, 123, now + 901, 'SUCCESS')).toThrow();
  });
});
