import { PassSummary } from '@/components/pass-summary';
import { PassProgram } from '@/components/pass-program';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getDestinationPasses, getPassAccount } from '@/lib/passes/server';
import { localizedText } from '@/lib/data';
import { PassPurchase } from '@/components/payments/pass-purchase';
import { session } from '@/lib/supabase/server';
import { AuthGate } from '@/components/auth-gate';
import { ActionForm } from '@/components/action-form';
import { CITYPASS_TREASURY } from '@/lib/passes/program';
import { walletConfiguration } from '@/lib/wallet/server';
import { PollarPortal } from '@/components/wallet/pollar-portal';
import { ChevronDown } from 'lucide-react';
export async function DestinationPass({
  destination,
  locale,
}: {
  destination: string;
  locale: string;
}) {
  const [t, catalog, account, user] = await Promise.all([
    getTranslations('destinationPass'),
    getDestinationPasses(destination),
    getPassAccount(),
    session(),
  ]);
  const owned = account?.holdings.some((item) => item.destination_id === destination);
  const config = walletConfiguration();
  const receivingAccount = user?.wallet_address === CITYPASS_TREASURY;
  return (
    <section
      className="section destination-pass"
      id="destination-pass"
      aria-labelledby="destination-pass-title"
    >
      <div className="landing-section-heading">
        <div>
          <h2 id="destination-pass-title">{t('title')}</h2>
          <p>{t('introShort')}</p>
        </div>
      </div>
      <PassSummary />
      {catalog.offers.map((offer) => (
        <article className="destination-pass-offer" key={offer.id}>
          <h3 className="pass-offer-title">{localizedText(offer.names, locale)}</h3>
          <div className="pass-offer-overview">
            <p>{t('purchaseSummary', { points: offer.reputation_points })}</p>
            <p className="pass-offer-exclusions">{t('purchaseExclusions')}</p>
          </div>
          <details className="pass-offer-terms">
            <summary>{t('fullDescription')}<ChevronDown size={15} aria-hidden="true" /></summary>
            <p className="pass-offer-description">{localizedText(offer.benefits, locale)}</p>
          </details>
          {owned ? (
            <p role="status">{t('owned')}</p>
          ) : !user ? (
            <AuthGate locale={locale} />
          ) : receivingAccount && config ? (
            <div className="notice">
              <p>{t('receivingAccount')}</p>
              <PollarPortal apiKey={config.apiKey} network={config.network} mode="switch" />
            </div>
          ) : !account ? (
            <p role="alert">{t('errors.unavailable')}</p>
          ) : !account.active ? (
            <div>
              <p>{t('activateNote')}</p>
              <ActionForm
                locale={locale}
                command="activate_traveler"
                label={t('activatePassport')}
              />
            </div>
          ) : (
            <PassPurchase offer={offer.id} locale={locale} />
          )}
        </article>
      ))}
      {catalog.offers.length === 0 ? (
        <p className="pass-availability">
          {t(catalog.unavailable ? 'errors.unavailable' : 'salePending')}
        </p>
      ) : null}
      <PassProgram id="destination-pass-program" />
      <Link className="app-text-link" href={`/${locale}/passport`}>
        {t('passport')}
      </Link>
    </section>
  );
}
