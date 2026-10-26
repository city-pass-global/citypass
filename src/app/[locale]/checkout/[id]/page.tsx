import type { ReactNode } from 'react';
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

function CheckoutShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="section app-page checkout-page">
      <header className="checkout-heading">
        <h1>{title}</h1>
      </header>
      <article className="checkout-ticket">{children}</article>
    </section>
  );
}

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
      <CheckoutShell title={t('payments.checkout')}>
        <AuthGate locale={locale} />
      </CheckoutShell>
    );
  let data;
  try {
    data = await readCheckout(id);
  } catch {
    return (
      <CheckoutShell title={t('payments.checkout')}>
        <p>{t('payments.errors.unavailable')}</p>
      </CheckoutShell>
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
    <CheckoutShell title={t('payments.checkout')}>
      <p className={`checkout-ticket-status status-${checkout.status}`}>
        {t(`payments.status.${checkout.status}`)}
      </p>
      <h2>{checkout.merchant_name}</h2>
      <p className="checkout-place">{localizedText(checkout.destination_names, locale)}</p>
      <p className="checkout-product">{checkout.product}</p>
      <p className="checkout-amount">{checkout.amount} USDC</p>
      <div className="checkout-ticket-stub">
        {checkout.status === 'confirmed' && checkout.receipt ? (
          <div className="checkout-receipt">
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
        {checkout.transaction_hash ? (
          <a
            className="checkout-explorer"
            href={transactionExplorerUrl(checkout.network, checkout.transaction_hash)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('payments.explorer')}
          </a>
        ) : null}
      </div>
      <details className="pass-details checkout-details">
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
      <div className="checkout-links">
        <Link className="app-text-link" href={`/${locale}/passport`}>
          {t('destinationPass.passport')}
        </Link>
        {['failed', 'expired'].includes(checkout.status) ? (
          <Link className="app-text-link" href={`/${locale}/destinations`}>
            {t('destinationPass.chooseDestination')}
          </Link>
        ) : null}
      </div>
    </CheckoutShell>
  );
}
