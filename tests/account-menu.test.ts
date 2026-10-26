import { beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({
  session: vi.fn(),
  wallet: vi.fn(),
  pollar: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({ session: mock.session }));
vi.mock('@/lib/wallet/server', () => ({
  walletConfiguration: mock.wallet,
  pollarConfigured: mock.pollar,
}));
vi.mock('next-intl/server', () => ({ getTranslations: async () => (key: string) => key }));
vi.mock('@/components/account-menu-view', () => ({ AccountMenuView: () => null }));
import { AccountMenu, accountIdentity } from '../src/components/account-menu';

describe('account menu', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mock.session.mockResolvedValue(null);
    mock.pollar.mockReturnValue(false);
  });
  it('builds a visible name and initials from the traveler profile', () => {
    expect(
      accountIdentity(
        { display_name: 'Ada Lovelace', email: 'ada@example.invalid' },
        'Your traveler account',
      ),
    ).toEqual({ name: 'Ada Lovelace', email: 'ada@example.invalid', initials: 'AL' });
    expect(
      accountIdentity({ display_name: null, email: 'ada.lovelace@example.invalid' }, 'Account'),
    ).toMatchObject({ name: 'ada.lovelace', initials: 'AL' });
    expect(accountIdentity({ display_name: '  ', email: null }, 'Account')).toMatchObject({
      name: 'Account',
      email: null,
      initials: 'A',
    });
  });
  it('offers sign-in when there is no session', async () => {
    const menu = await AccountMenu({ locale: 'en' });
    expect(menu.props.user).toBeNull();
    expect(menu.props.pollar).toBeNull();
    expect(mock.wallet).not.toHaveBeenCalled();
  });
  it('shows the signed-in traveler without a wallet lookup when Pollar is off', async () => {
    mock.session.mockResolvedValue({
      display_name: 'Ada Lovelace',
      email: 'ada@example.invalid',
    });
    const menu = await AccountMenu({ locale: 'es' });
    expect(menu.props.locale).toBe('es');
    expect(menu.props.user).toEqual({
      name: 'Ada Lovelace',
      email: 'ada@example.invalid',
      initials: 'AL',
    });
    expect(menu.props.pollar).toBeNull();
    expect(mock.wallet).not.toHaveBeenCalled();
  });
  it('passes the publishable wallet config only for a signed-in Pollar logout', async () => {
    mock.session.mockResolvedValue({ display_name: null, email: 'ada@example.invalid' });
    mock.pollar.mockReturnValue(true);
    mock.wallet.mockReturnValue({ apiKey: 'pub_testnet_example', network: 'testnet' });
    const menu = await AccountMenu({ locale: 'pt' });
    expect(menu.props.pollar).toEqual({ apiKey: 'pub_testnet_example', network: 'testnet' });
    expect(menu.props.user.name).toBe('ada');
  });
});
