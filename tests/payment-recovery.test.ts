import { beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({
  session: vi.fn(),
  readCheckout: vi.fn(),
  recordEvidence: vi.fn(),
  sendTransaction: vi.fn(),
  getTransaction: vi.fn(),
  verifyCheckoutEnvelope: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ session: mock.session }));
vi.mock('@/lib/payments/server', () => ({
  readCheckout: mock.readCheckout,
  recordEvidence: mock.recordEvidence,
}));
vi.mock('@/lib/payments/stellar', () => ({
  testnetRpc: () => ({
    sendTransaction: mock.sendTransaction,
    getTransaction: mock.getTransaction,
  }),
  verifyCheckoutEnvelope: mock.verifyCheckoutEnvelope,
  evidenceBase: () => ({}),
  buildCheckoutTransaction: vi.fn(),
  verifyCheckoutRpcResult: vi.fn(),
}));
import { submitPayment } from '../src/app/[locale]/checkout/[id]/actions';
const id = '90000000-0000-4000-8000-000000000001';

describe('durable checkout recovery', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mock.session.mockResolvedValue({ id });
    mock.readCheckout.mockResolvedValue({
      checkout: { id, status: 'submitted', transaction_hash: 'ab'.repeat(32) },
    });
    mock.verifyCheckoutEnvelope.mockReturnValue({
      hash: 'ab'.repeat(32),
      maxTime: 1000,
      transaction: {},
    });
    mock.recordEvidence.mockResolvedValue({ status: 'submitted' });
  });
  it('keeps a durably recorded payment submitted when broadcast and lookup responses are lost', async () => {
    mock.sendTransaction.mockRejectedValue(new Error('network'));
    mock.getTransaction.mockRejectedValue(new Error('network'));
    expect(await submitPayment(id, 'signed-test-envelope')).toEqual({
      status: 'submitted',
      error: 'unavailable',
    });
    expect(mock.recordEvidence).toHaveBeenCalledOnce();
    expect(mock.sendTransaction).toHaveBeenCalledOnce();
    expect(mock.recordEvidence.mock.invocationCallOrder[0]).toBeLessThan(
      mock.sendTransaction.mock.invocationCallOrder[0],
    );
  });
  it('never broadcasts when durable submission recording fails', async () => {
    mock.recordEvidence.mockRejectedValue(new Error('unavailable'));
    expect(await submitPayment(id, 'signed-test-envelope')).toEqual({ error: 'unavailable' });
    expect(mock.sendTransaction).not.toHaveBeenCalled();
  });
  it('denies anonymous submission before reading checkout or broadcasting', async () => {
    mock.session.mockResolvedValue(null);
    expect(await submitPayment(id, 'signed-test-envelope')).toEqual({ error: 'unauthorized' });
    expect(mock.readCheckout).not.toHaveBeenCalled();
    expect(mock.sendTransaction).not.toHaveBeenCalled();
  });
});
