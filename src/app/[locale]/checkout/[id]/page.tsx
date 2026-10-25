import { ChevronDown } from 'lucide-react';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { getTranslations } from 'next-intl/server';
import { createClient, session } from '@/lib/supabase/server';
import { readCheckout } from '@/lib/payments/server';
import { localizedText } from '@/lib/data';
import { walletConfiguration } from '@/lib/wallet/server';
import { AuthGate } from '@/components/auth-gate';
import { PollarPortal } from '@/components/wallet/pollar-portal';
import { transactionExplorerUrl, ledgerExplorerUrl } from '@/lib/payments/explorer';
import Link from 'next/link';
export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [t, user] = await Promise.all([getTranslations(), session()]);
  if (!user)
    return (
      <section className="section narrow app-page detail-page">
        <h1>{t('payments.checkout')}</h1>
        <AuthGate locale={locale} />
      </section>
    );
  let data;
  try {
    data = await readCheckout(id);
  } catch {
    return (
      <section className="section narrow app-page detail-page">
        <h1>{t('payments.checkout')}</h1>
        <p>{t('payments.errors.unavailable')}</p>
      </section>
    );
  }
  const { checkout } = data;
  const config = walletConfiguration();
  const db = await createClient();
  const { data: membership } = await db
    .from('organization_members')
    .select('role')
    .eq('organization_id', checkout.organization_id)
    .maybeSingle();
  const merchantView = Boolean(
    membership && ['owner', 'manager', 'merchant'].includes(membership.role),
  );
  return (
    <section className="section narrow app-page detail-page checkout-review">
      <h1>{t('payments.checkout')}</h1>
      <h2>{checkout.merchant_name}</h2>
      <p>{localizedText(checkout.destination_names, locale)}</p>
      <p>{checkout.product}</p>
      {checkout.merchant_service_id ? (
        <>
          {checkout.payout_source === 'citypass' ? (
            <p>{t('merchantServices.platformScope')}</p>
          ) : null}
          <p>{t('merchantServices.award')}</p>
          <p>{t('merchantServices.network')}</p>
        </>
      ) : null}
      <p className="checkout-amount">{checkout.amount} USDC</p>
      <details className="pass-details">
        <summary>
          {t('payments.transactionDetails')}
          <ChevronDown size={17} aria-hidden="true" />
        </summary>
        <dl>
          <dt>{t('payments.networkDetails')}</dt>
          <dd>{t('pollar.testnet')}</dd>
          <dt>{t('payments.payout')}</dt>
          <dd className="wallet-reference">{checkout.payout_address}</dd>
          <dt>{t('payments.assetIssuer')}</dt>
          <dd className="wallet-reference">{checkout.asset_issuer}</dd>
          <dt>{t('payments.expires')}</dt>
          <dd>
            {new Intl.DateTimeFormat(locale, {
              dateStyle: 'medium',
              timeStyle: 'short',
              timeZone: 'UTC',
            }).format(new Date(checkout.expires_at))}{' '}
            UTC
          </dd>
        </dl>
      </details>
      {checkout.transaction_hash ? (
        <p>
          <a
            href={transactionExplorerUrl(checkout.network, checkout.transaction_hash)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('payments.explorer')}
          </a>
        </p>
      ) : null}
      {checkout.status === 'confirmed' && checkout.receipt ? (
        <div className="notice">
          <h3>{t('payments.receipt')}</h3>
          <p>{t('payments.confirmedNote')}</p>
          <a
            href={ledgerExplorerUrl(checkout.receipt.network, checkout.receipt.ledger)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('payments.explorerLedger', { ledger: checkout.receipt.ledger })}
          </a>
        </div>
      ) : config?.network === 'testnet' ? (
        <PollarPortal
          apiKey={config.apiKey}
          network={config.network}
          mode="checkout"
          checkout={checkout}
          merchantView={merchantView}
        />
      ) : (
        <p>{t('payments.errors.testnet_only')}</p>
      )}
      <Link className="app-text-link" href={`/${locale}/passport`}>
        {t('destinationPass.passport')}
      </Link>
      {['failed', 'expired'].includes(checkout.status) ? (
        <Link className="app-text-link" href={`/${locale}/destinations`}>
          {t('destinationPass.chooseDestination')}
        </Link>
      ) : null}
    </section>
  );
}
