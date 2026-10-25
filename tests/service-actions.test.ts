import { beforeEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({
  session: vi.fn(),
  rpc: vi.fn(),
  redirect: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({
  configured: () => true,
  session: mock.session,
  createClient: async () => ({ rpc: mock.rpc }),
}));
vi.mock('@/lib/wallet/server', () => ({ walletConfiguration: () => ({ network: 'testnet' }) }));
vi.mock('next/cache', () => ({ revalidatePath: mock.revalidate }));
vi.mock('next/navigation', () => ({ redirect: mock.redirect }));
import { serviceAction } from '../src/app/service-actions';
const id = '10000000-0000-4000-8000-000000000001';
const form = () => {
  const f = new FormData();
  f.set('service_id', id);
  f.set('amount', '0.01');
  f.set('payout_address', 'attacker');
  return f;
};
beforeEach(() => {
  vi.resetAllMocks();
  mock.session.mockResolvedValue({ id });
  mock.rpc.mockResolvedValue({ data: { id }, error: null });
});
it('requires an authenticated session before creating a service checkout', async () => {
  mock.session.mockResolvedValue(null);
  expect(await serviceAction('en', 'buy', {}, form())).toEqual({ error: 'unauthorized' });
  expect(mock.rpc).not.toHaveBeenCalled();
});
it('creates a checkout from only the service ID and redirects to embedded-wallet checkout', async () => {
  await serviceAction('en', 'buy', {}, form());
  expect(mock.rpc).toHaveBeenCalledWith('merchant_service_command', {
    action: 'buy',
    payload: { service_id: id },
  });
  expect(mock.redirect).toHaveBeenCalledWith(`/en/checkout/${id}`);
});
it('does not redirect or signal success after an RPC denial', async () => {
  mock.rpc.mockResolvedValue({ data: { error: 'already_owned' }, error: null });
  expect(await serviceAction('en', 'buy', {}, form())).toEqual({ error: 'already_owned' });
  expect(mock.redirect).not.toHaveBeenCalled();
});
