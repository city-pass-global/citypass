import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import {
  Wallet as WalletIcon,
  ScanLine,
  ArrowDownLeft,
  ShieldCheck,
  ArrowUpRight,
  Compass,
} from 'lucide-react';
import { session } from '@/lib/supabase/server';
import { walletConfiguration, pollarConfigured } from '@/lib/wallet/server';
import { AuthGate } from '@/components/auth-gate';
import { PollarPortal } from '@/components/wallet/pollar-portal';
import { PageIntro } from '@/components/page-intro';
export default async function Wallet({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [t, user] = await Promise.all([getTranslations(), session()]);
  const config = walletConfiguration();
  return (
    <section className="section app-page wallet-page">
      <PageIntro title={t('pollar.title')} body={t('appUi.walletIntro')} icon={WalletIcon} />
      <div className="wallet-page-layout">
        <div className="wallet-account-panel">
          {!user ? (
            <AuthGate locale={locale} />
          ) : config && pollarConfigured() ? (
            <PollarPortal apiKey={config.apiKey} network={config.network} mode="wallet" />
          ) : (
            <p className="notice">{t('pollar.pollarUnavailable')}</p>
          )}
        </div>
        <aside className="travel-wallet-guide">
          <div className="wallet-pocket" aria-hidden="true">
            <Compass size={30} strokeWidth={1} />
            <span>{t('landing.usdc')}</span>
            <small>{t('landing.travelWallet')}</small>
          </div>
          <h2>{t('appUi.walletGuideTitle')}</h2>
          <p>{t('appUi.walletGuideBody')}</p>
          <ul>
            {(
              [
                [ArrowDownLeft, 'receive'],
                [ShieldCheck, 'review'],
                [ScanLine, 'pay'],
              ] as const
            ).map(([Icon, key]) => (
              <li key={key}>
                <Icon size={19} aria-hidden="true" />
                <div>
                  <h3>{t(`appUi.${key}Title`)}</h3>
                  <p>{t(`appUi.${key}Body`)}</p>
                </div>
              </li>
            ))}
          </ul>
          <Link className="app-text-link" href={`/${locale}/pay`}>
            {t('payments.scan')}
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
          <details className="pass-details">
            <summary>{t('payments.networkDetails')}</summary>
            <p>
              {t(config?.network === 'mainnet' ? 'landing.walletNetwork' : 'landing.walletTestnet')}
            </p>
          </details>
        </aside>
      </div>
    </section>
  );
}
