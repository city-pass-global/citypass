import { beforeEach, describe, expect, it, vi } from 'vitest';
import { encodePaymentSignatureHeader } from '@x402/core/http';
import { USDC_TESTNET_ADDRESS } from '@x402/stellar';
const m = vi.hoisted(() => ({
  enabled: true,
  delivery: vi.fn(),
  verify: vi.fn(),
  settle: vi.fn(),
  requirements: vi.fn(),
  transfer: vi.fn(),
  ledger: vi.fn(),
  getTransaction: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/x402/server', () => ({
  x402Enabled: () => m.enabled,
  agentResource: (id: string) => `http://localhost:3000/api/agent/passes/${id}`,
  agentDelivery: m.delivery,
  facilitator: () => ({ verify: m.verify, settle: m.settle }),
  requirements: m.requirements,
}));
vi.mock('@/lib/x402/ledger', () => ({
  transferAuthorization: m.transfer,
  verifyAgentLedger: m.ledger,
}));
vi.mock('@/lib/payments/stellar', () => ({
  testnetRpc: () => ({ getTransaction: m.getTransaction }),
}));
import { GET, POST } from '../src/app/api/agent/passes/[id]/route';
const id = '10000000-0000-4000-8000-000000000001';
const token = '11'.repeat(32);
const url = `http://localhost:3000/api/agent/passes/${id}`;
const expected = {
  scheme: 'exact',
  network: 'stellar:testnet' as const,
  asset: USDC_TESTNET_ADDRESS,
  amount: '1000000000',
  payTo: 'G' + 'A'.repeat(55),
  maxTimeoutSeconds: 60,
  extra: { areFeesSponsored: true },
};
const payment = {
  x402Version: 2,
  resource: { url },
  accepted: expected,
  payload: { transaction: 'isolated-test-envelope' },
};
const order = {
  state: 'authorized',
  checkout: {
    id,
    payer_address: 'G' + 'B'.repeat(55),
    expires_at: new Date(Date.now() + 900000).toISOString(),
    transaction_hash: null,
    receipt: null,
  },
  payment_payload: payment,
};
const context = { params: Promise.resolve({ id }) };
const request = (signature = false) =>
  new Request(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...(signature ? { 'PAYMENT-SIGNATURE': encodePaymentSignatureHeader(payment) } : {}),
    },
  });
beforeEach(() => {
  vi.resetAllMocks();
  m.enabled = true;
  m.delivery.mockResolvedValue(order);
  m.requirements.mockResolvedValue(expected);
  m.verify.mockResolvedValue({ isValid: true, payer: order.checkout.payer_address });
});
describe('agent pass API', () => {
  it('fails closed while disabled and rejects absent credentials before database or facilitator calls', async () => {
    m.enabled = false;
    expect((await GET(request(), context)).status).toBe(503);
    m.enabled = true;
    expect((await GET(new Request(url), context)).status).toBe(401);
    expect(m.delivery).not.toHaveBeenCalled();
    expect(m.requirements).not.toHaveBeenCalled();
  });
  it('returns standard x402 requirements without settling or issuing a pass', async () => {
    const response = await GET(request(), context);
    expect(response.status).toBe(402);
    expect(response.headers.get('PAYMENT-REQUIRED')).toBeTruthy();
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(m.settle).not.toHaveBeenCalled();
  });
  it('rejects mismatched paying wallet before staging or settlement', async () => {
    m.verify.mockResolvedValue({ isValid: true, payer: 'wrong-wallet' });
    expect((await GET(request(true), context)).status).toBe(400);
    expect(m.delivery).toHaveBeenCalledTimes(1);
    expect(m.settle).not.toHaveBeenCalled();
  });
  it('checks signed transfer locally before invoking external verification', async () => {
    m.transfer.mockImplementation(() => {
      throw new Error('payment_proof');
    });
    expect((await GET(request(true), context)).status).toBe(400);
    expect(m.verify).not.toHaveBeenCalled();
    expect(m.settle).not.toHaveBeenCalled();
  });
  it('persists the verified payload before settlement and keeps timeout indeterminate', async () => {
    m.delivery.mockResolvedValueOnce(order).mockResolvedValue({ ...order, state: 'settling' });
    m.settle.mockRejectedValue(new Error('timeout'));
    const response = await GET(request(true), context);
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({ recovery_required: true });
    expect(m.delivery.mock.calls[1][0]).toBe('stage');
    expect(m.delivery.mock.invocationCallOrder[1]).toBeLessThan(
      m.settle.mock.invocationCallOrder[0],
    );
  });
  it('never settles a second authorization for an already pending order', async () => {
    m.delivery.mockResolvedValue({ ...order, state: 'settling' });
    expect((await GET(request(true), context)).status).toBe(202);
    expect(m.settle).not.toHaveBeenCalled();
    expect(m.verify).not.toHaveBeenCalled();
  });
  it('requires independent chain confirmation before returning a pass receipt', async () => {
    const hash = 'ab'.repeat(32);
    const submitted = {
      ...order,
      state: 'settled',
      checkout: { ...order.checkout, transaction_hash: hash },
    };
    m.delivery
      .mockResolvedValueOnce(order)
      .mockResolvedValueOnce({ ...order, state: 'settling' })
      .mockResolvedValueOnce(submitted)
      .mockResolvedValue({ ...submitted, state: 'confirmed' });
    m.settle.mockResolvedValue({
      success: true,
      network: 'stellar:testnet',
      payer: order.checkout.payer_address,
      transaction: hash,
    });
    m.getTransaction.mockResolvedValue({ status: 'SUCCESS' });
    m.ledger.mockReturnValue({ hash, ledger: 1, closed_at: 1 });
    const response = await GET(request(true), context);
    expect(response.status).toBe(200);
    expect(response.headers.get('PAYMENT-RESPONSE')).toBeTruthy();
    expect(m.ledger).toHaveBeenCalled();
    expect(m.delivery.mock.calls.at(-1)?.[0]).toBe('confirm');
  });
  it('does not bind an unverified recovery transaction hash', async () => {
    m.delivery.mockResolvedValue({ ...order, state: 'settling' });
    m.ledger.mockImplementation(() => {
      throw new Error('payment_proof');
    });
    const recovery = new Request(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ transaction_hash: 'ab'.repeat(32) }),
    });
    expect((await POST(recovery, context)).status).toBe(400);
    expect(m.delivery).toHaveBeenCalledTimes(1);
    expect(m.settle).not.toHaveBeenCalled();
  });
  it('rejects altered price, network, resource and malformed payment headers without settlement', async () => {
    for (const changed of [
      { ...payment, accepted: { ...expected, amount: '1' } },
      { ...payment, accepted: { ...expected, network: 'stellar:pubnet' as const } },
      { ...payment, resource: { url: url + 'wrong' } },
    ]) {
      const req = request();
      req.headers.set('PAYMENT-SIGNATURE', encodePaymentSignatureHeader(changed));
      expect((await GET(req, context)).status).toBe(400);
    }
    expect(m.settle).not.toHaveBeenCalled();
  });
});
