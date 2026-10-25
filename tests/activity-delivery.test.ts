import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Keypair, StrKey } from '@stellar/stellar-sdk';
vi.mock('server-only', () => ({}));
const mock = vi.hoisted(() => ({
  from: vi.fn(),
  issuer: vi.fn(),
  event: vi.fn(),
  record: vi.fn(),
  signAndSend: vi.fn(),
}));
vi.mock('@stellar/stellar-sdk', async (original) => {
  const sdk = await original<typeof import('@stellar/stellar-sdk')>();
  return { ...sdk, contract: { ...sdk.contract, Client: { from: mock.from } } };
});
import { deliverActivity } from '../src/lib/activity/chain';
import { activityEvidence } from '../src/lib/activity/validation';
describe('issuer delivery recovery', () => {
  const issuer = Keypair.random();
  const wallet = Keypair.random().publicKey();
  const source = {
    id: '10000000-0000-4000-8000-000000000001',
    destination_id: '20000000-0000-4000-8000-000000000001',
    subject: '30000000-0000-4000-8000-000000000001',
    kind: 1 as const,
  };
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('STELLAR_ACTIVITY_NETWORK', 'testnet');
    vi.stubEnv('STELLAR_ACTIVITY_CONTRACT_ID', StrKey.encodeContract(Buffer.alloc(32, 1)));
    vi.stubEnv('STELLAR_ACTIVITY_ISSUER_SECRET', issuer.secret());
    vi.stubEnv('STELLAR_ACTIVITY_HASH_KEY', 'ab'.repeat(32));
    mock.from.mockResolvedValue({ issuer: mock.issuer, event: mock.event, record: mock.record });
    mock.issuer.mockResolvedValue({ result: issuer.publicKey() });
    mock.event.mockResolvedValue({ result: undefined });
    mock.record.mockResolvedValue({ built: { fee: '2000' }, signAndSend: mock.signAndSend });
    mock.signAndSend.mockResolvedValue({ getTransactionResponse: { status: 'SUCCESS', txHash: '11'.repeat(32) } });
  });
  it('does not sign again when an earlier delivery succeeded but its response was lost', async () => {
    expect(await deliverActivity(source, wallet)).toMatchObject({transactionHash:'11'.repeat(32)});
    mock.event.mockResolvedValue({
      result: activityEvidence(source, wallet, 'ab'.repeat(32)).record,
    });
    await deliverActivity(source, wallet);
    expect(mock.signAndSend).toHaveBeenCalledTimes(1);
  });
  it('rejects a wallet change for an already recorded event', async () => {
    mock.event.mockResolvedValue({
      result: activityEvidence(source, Keypair.random().publicKey(), 'ab'.repeat(32)).record,
    });
    await expect(deliverActivity(source, wallet)).rejects.toThrow('activity_conflict');
    expect(mock.record).not.toHaveBeenCalled();
  });
  it('rejects an unexpected issuer or excessive simulated fee before signing', async () => {
    mock.issuer.mockResolvedValueOnce({ result: Keypair.random().publicKey() });
    await expect(deliverActivity(source, wallet)).rejects.toThrow('activity_unavailable');
    mock.record.mockResolvedValue({ built: { fee: '10000001' }, signAndSend: mock.signAndSend });
    await expect(deliverActivity(source, wallet)).rejects.toThrow('activity_fee');
    expect(mock.signAndSend).not.toHaveBeenCalled();
  });
  it('never reports an unconfirmed submission as delivered', async () => {
    mock.signAndSend.mockResolvedValue({ getTransactionResponse: { status: 'NOT_FOUND' } });
    await expect(deliverActivity(source, wallet)).rejects.toThrow('activity_pending');
  });
});
