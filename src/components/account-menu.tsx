import { getTranslations } from 'next-intl/server';
import { session } from '@/lib/supabase/server';
import { pollarConfigured, walletConfiguration } from '@/lib/wallet/server';
import { AccountMenuView, type AccountIdentity } from './account-menu-view';

export function accountIdentity(
  user: { display_name: string | null; email: string | null },
  fallback: string,
): AccountIdentity {
  const email = user.email?.trim() || null;
  const named = user.display_name?.trim() ?? '';
  const local = email?.split('@')[0]?.trim() ?? '';
  const name = named || local || fallback;
  const parts = (named || local).split(/[\s._+-]+/).filter(Boolean);
  const initials =
    ((parts[0]?.[0] ?? fallback[0] ?? '?') + (parts[1]?.[0] ?? '')).toUpperCase();
  return { name, email, initials };
}

export async function AccountMenu({ locale }: { locale: string }) {
  const [t, user] = await Promise.all([getTranslations(), session()]);
  if (!user) return <AccountMenuView locale={locale} user={null} pollar={null} />;
  const config = pollarConfigured() ? walletConfiguration() : null;
  return (
    <AccountMenuView
      locale={locale}
      user={accountIdentity(user, t('appUi.accountTitle'))}
      pollar={config}
    />
  );
}
