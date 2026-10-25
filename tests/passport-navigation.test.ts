import { beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({ session: vi.fn(), account: vi.fn(), redirect: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ session: mock.session }));
vi.mock('@/lib/passes/server', () => ({ getPassAccount: mock.account }));
vi.mock('next-intl/server', () => ({ getTranslations: async () => (key: string) => key }));
vi.mock('next/navigation', () => ({ redirect: mock.redirect }));
vi.mock('@/components/auth-gate', () => ({ AuthGate: () => null }));
import { PassportCta } from '../src/components/passport-cta';
import Login from '../src/app/[locale]/login/page';

describe('passport entry points', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mock.session.mockResolvedValue(null);
  });
  it('sends anonymous visitors to login without looking up a private passport', async () => {
    const link = await PassportCta({ locale: 'es' });
    expect(link.props.href).toBe('/es/login');
    expect(link.props.children[0]).toBe('landing.getPassport');
    expect(mock.account).not.toHaveBeenCalled();
  });
  it('offers an active traveler access instead of creation', async () => {
    mock.session.mockResolvedValue({ id: 'traveler' });
    mock.account.mockResolvedValue({ active: true });
    const link = await PassportCta({ locale: 'en' });
    expect(link.props.href).toBe('/en/passport');
    expect(link.props.children[0]).toBe('travelDesign.open');
  });
  it('offers activation only when the authenticated account is known inactive', async () => {
    mock.session.mockResolvedValue({ id: 'traveler' });
    mock.account.mockResolvedValue({ active: false });
    const link = await PassportCta({ locale: 'pt' });
    expect(link.props.href).toBe('/pt/passport');
    expect(link.props.children[0]).toBe('destinationPass.activatePassport');
  });
  it('does not advertise creation when an existing account lookup is unavailable', async () => {
    mock.session.mockResolvedValue({ id: 'traveler' });
    mock.account.mockResolvedValue(null);
    const link = await PassportCta({ locale: 'en' });
    expect(link.props.children[0]).toBe('travelDesign.open');
  });
  it('redirects an authenticated visitor away from login to their passport', async () => {
    mock.session.mockResolvedValue({ id: 'traveler' });
    mock.redirect.mockImplementation(() => {
      throw new Error('redirect');
    });
    await expect(Login({ params: Promise.resolve({ locale: 'en' }) })).rejects.toThrow('redirect');
    expect(mock.redirect).toHaveBeenCalledWith('/en/passport');
  });
});
