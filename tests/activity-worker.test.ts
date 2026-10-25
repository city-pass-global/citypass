import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import { Keypair, StrKey } from '@stellar/stellar-sdk';
const mock = vi.hoisted(() => ({ rpc: vi.fn(), deliver: vi.fn(), register: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ rpc: mock.rpc }) }));
vi.mock('@/lib/activity/chain', () => ({
  activityConfig: () => ({ contractId: 'C' + 'A'.repeat(55) }),
  deliverActivity: mock.deliver,
  registerPassport: mock.register,
}));
import { processActivityJob, workerCommand } from '../src/lib/activity/worker';
describe('automatic publisher', () => {
  const job = {
    id: '10000000-0000-4000-8000-000000000001',
    source_id: '20000000-0000-4000-8000-000000000001',
    wallet: Keypair.random().publicKey(),
    lease_token: '30000000-0000-4000-8000-000000000001',
    kind: 1,
    destination_id: '40000000-0000-4000-8000-000000000001',
    subject: '50000000-0000-4000-8000-000000000001',
  };
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('POLLAR_SESSION_BRIDGE_KEY', 'ab'.repeat(32));
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'publishable-test');
    mock.rpc
      .mockResolvedValueOnce({ data: { job }, error: null })
      .mockResolvedValue({ data: { ok: true }, error: null });
    mock.deliver.mockResolvedValue({
      evidenceHash: '11'.repeat(32),
      transactionHash: '22'.repeat(32),
    });
  });
  it('publishes only the leased source and acknowledges confirmed evidence', async () => {
    expect(await processActivityJob()).toBe(true);
    expect(mock.deliver).toHaveBeenCalledWith(
      { id: job.source_id, kind: 1, destination_id: job.destination_id, subject: job.subject },
      job.wallet,
    );
    const finish = JSON.parse(mock.rpc.mock.calls[1][1].payload);
    expect(finish).toMatchObject({
      action: 'finish',
      state: 'confirmed',
      job_id: job.id,
      lease_token: job.lease_token,
      evidence_hash: '11'.repeat(32),
      transaction_hash: '22'.repeat(32),
    });
  });
  it('creates the passport using the issuer without asking the traveler to sign', async () => {
    mock.rpc
      .mockReset()
      .mockResolvedValueOnce({
        data: { job: { ...job, kind: 0, destination_id: null, subject: null } },
        error: null,
      })
      .mockResolvedValue({ data: { ok: true }, error: null });
    await processActivityJob();
    expect(mock.register).toHaveBeenCalledExactlyOnceWith(job.wallet);
    expect(mock.deliver).not.toHaveBeenCalled();
  });
  it('a network failure stays retryable and never marks activity confirmed', async () => {
    mock.deliver.mockRejectedValue(new Error('provider failure'));
    await processActivityJob();
    expect(JSON.parse(mock.rpc.mock.calls[1][1].payload)).toMatchObject({
      state: 'retry',
      error: 'rpc',
    });
  });
  it('rejects invalid leases and signs fresh domain-separated worker requests', async () => {
    await workerCommand({ action: 'claim' });
    const { payload, mac } = mock.rpc.mock.calls[0][1];
    expect(mac).toBe(
      createHmac('sha256', Buffer.from('ab'.repeat(32), 'hex'))
        .update('citypassport-activity-worker-v1\n' + payload)
        .digest('hex'),
    );
    mock.rpc
      .mockReset()
      .mockResolvedValueOnce({ data: { job }, error: null })
      .mockResolvedValue({ data: { error: 'stale_lease' }, error: null });
    await expect(processActivityJob()).rejects.toThrow('activity_worker_lease_lost');
  });
});

it('publishes a leased self-reported stamp with its own kind and contract transaction hash', async () => {
  vi.resetAllMocks();
  vi.stubEnv('POLLAR_SESSION_BRIDGE_KEY', 'ab'.repeat(32));
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'publishable-test');
  const job = {
    id: '10000000-0000-4000-8000-000000000001',
    source_id: '20000000-0000-4000-8000-000000000001',
    wallet: Keypair.random().publicKey(),
    lease_token: '30000000-0000-4000-8000-000000000001',
    kind: 5,
    destination_id: '40000000-0000-4000-8000-000000000001',
    subject: '50000000-0000-4000-8000-000000000001',
  };
  mock.rpc
    .mockResolvedValueOnce({ data: { job }, error: null })
    .mockResolvedValue({ data: { ok: true }, error: null });
  mock.deliver.mockResolvedValue({
    evidenceHash: '11'.repeat(32),
    transactionHash: '22'.repeat(32),
  });
  expect(await processActivityJob()).toBe(true);
  expect(mock.deliver.mock.calls[0][0].kind).toBe(5);
  expect(JSON.parse(mock.rpc.mock.calls[1][1].payload)).toMatchObject({
    state: 'confirmed',
    transaction_hash: '22'.repeat(32),
  });
});
