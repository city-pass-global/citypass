import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ session: vi.fn(), passCommand: vi.fn(), redirect: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ session: mocks.session }));
vi.mock('@/lib/passes/server', () => ({ passCommand: mocks.passCommand }));
vi.mock('@/lib/wallet/server', () => ({ walletConfiguration: () => ({ network: 'testnet' }) }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
import { purchaseDestinationPass } from '../src/app/pass-actions';
const offer = '90000000-0000-4000-8000-000000000001';
const checkout = '90000000-0000-4000-8000-000000000002';
function form() {
  const data = new FormData();
  data.set('offer_id', offer);
  data.set('locale', 'en');
  return data;
}
describe('pass purchase navigation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.session.mockResolvedValue({ id: offer });
    mocks.passCommand.mockResolvedValue({ id: checkout });
    mocks.redirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT');
    });
  });
  it('redirects to the created checkout without swallowing the framework redirect', async () => {
    await expect(purchaseDestinationPass({}, form())).rejects.toThrow('NEXT_REDIRECT');
    expect(mocks.redirect).toHaveBeenCalledWith('/en/checkout/' + checkout);
  });
  it('does not navigate or create a purchase for an unauthenticated visitor', async () => {
    mocks.session.mockResolvedValue(null);
    expect(await purchaseDestinationPass({}, form())).toEqual({ error: 'unauthorized' });
    expect(mocks.passCommand).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
  it('retains the database self-payment denial', async () => {
    mocks.passCommand.mockRejectedValue(new Error('self_payment'));
    expect(await purchaseDestinationPass({}, form())).toEqual({ error: 'self_payment' });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
