import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import {
  UserRound,
  BookOpen,
  Wallet,
  Compass,
  Hotel,
  Store,
  Landmark,
  ShieldCheck,
  ArrowUpRight,
} from 'lucide-react';
import { session } from '@/lib/supabase/server';
import { AuthGate } from '@/components/auth-gate';
import { walletConfiguration } from '@/lib/wallet/server';
import { PollarPortal } from '@/components/wallet/pollar-portal';
import { PageIntro } from '@/components/page-intro';
export default async function Profile({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  const { error } = await searchParams;
  const [t, user] = await Promise.all([getTranslations(), session()]);
  const config = walletConfiguration();
  const traveler = [
    ['passport', 'passport', 'passportLinkBody', BookOpen],
    ['wallet', 'pollar.title', 'walletLinkBody', Wallet],
    ['explore', 'appUi.cityGuide', 'cityLinkBody', Compass],
  ] as const;
  const workspaces = [
    ['hotel', 'hotel', 'hotelIntro', Hotel],
    ['merchant', 'payments.merchant', 'merchantIntro', Store],
    ['operator', 'operator.title', 'operatorIntro', Landmark],
    ['review', 'review.title', 'reviewIntro', ShieldCheck],
  ] as const;
  return (
    <section className="section app-page profile-page">
      <PageIntro title={t('profile')} body={t('appUi.profileIntro')} icon={UserRound} />
      {error ? (
        <p role="alert" className="notice error">
          {t.has(`errors.${error}`) ? t(`errors.${error}`) : t('errors.unavailable')}
        </p>
      ) : null}
      <div className="profile-layout">
        <div className="profile-account">
          {user ? (
            <div className="account-identity">
              <span className="identity-mark" aria-hidden="true">
                <UserRound size={32} strokeWidth={1.3} />
              </span>
              <h2>{user.display_name || t('appUi.accountTitle')}</h2>
              <p className="account-email">{user.email}</p>
              {config ? (
                <PollarPortal apiKey={config.apiKey} network={config.network} mode="logout" />
              ) : null}
            </div>
          ) : (
            <AuthGate locale={locale} />
          )}
        </div>
        <section className="profile-tools">
          <h2>{t('appUi.travelerTools')}</h2>
          <ul className="app-link-list">
            {traveler.map(([path, label, body, Icon]) => (
              <li key={path}>
                <Link href={`/${locale}/${path}`}>
                  <Icon size={23} strokeWidth={1.3} aria-hidden="true" />
                  <span>
                    <strong>{t(label)}</strong>
                    <small>{t(`appUi.${body}`)}</small>
                  </span>
                  <ArrowUpRight size={18} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <details className="workspace-directory">
        <summary>{t('appUi.businessTools')}</summary>
        <p>{t('appUi.staffNote')}</p>
        <ul className="app-link-list">
          {workspaces.map(([path, label, body, Icon]) => (
            <li key={path}>
              <Link href={`/${locale}/${path}`}>
                <Icon size={23} strokeWidth={1.3} aria-hidden="true" />
                <span>
                  <strong>{t(label)}</strong>
                  <small>{t(`appUi.${body}`)}</small>
                </span>
                <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
