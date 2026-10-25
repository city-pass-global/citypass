import { beforeEach, expect, it, vi } from 'vitest';
import { Keypair } from '@stellar/stellar-sdk';
const mock = vi.hoisted(() => ({ session: vi.fn(), read: vi.fn(), rpc: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server', () => ({
  session: mock.session,
  createClient: async () => ({ rpc: mock.rpc }),
}));
vi.mock('@/lib/activity/chain', () => ({
  activityConfig: () => ({ contractId: 'C' + 'A'.repeat(55) }),
  readChainActivity: mock.read,
}));
import { getPassportChainState } from '../src/lib/activity/server';
beforeEach(() => {
  vi.resetAllMocks();
  mock.session.mockResolvedValue({
    network: 'testnet',
    wallet_address: Keypair.random().publicKey(),
  });
  mock.rpc.mockResolvedValue({ data: { pending: 2, failed: 0 }, error: null });
});
it('returns chain reputation and pending status without substituting database awards', async () => {
  mock.read.mockResolvedValue({ reputation: '80', purchases: 1, stamps: 0, redemptions: 0 });
  expect(await getPassportChainState()).toMatchObject({
    activity: { reputation: '80' },
    pending: 2,
    unavailable: false,
  });
});
it('never fabricates reputation during a chain outage', async () => {
  mock.read.mockRejectedValue(new Error('offline'));
  expect(await getPassportChainState()).toMatchObject({ activity: null, unavailable: true });
});
it('does not read a private wallet for an anonymous caller', async () => {
  mock.session.mockResolvedValue(null);
  expect(await getPassportChainState()).toBeNull();
  expect(mock.read).not.toHaveBeenCalled();
});
