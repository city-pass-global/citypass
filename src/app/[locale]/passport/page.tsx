import { getExplorationClaims } from '@/lib/exploration-server';
import { getPassAccount } from '@/lib/passes/server';
import { reputationTier } from '@/lib/passes/validation';
import { transactionExplorerUrl } from '@/lib/payments/explorer';
import { PageIntro } from '@/components/page-intro';
import { getSelectedDestination } from '@/lib/destination-context/server';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import {
  Leaf,
  Stamp,
  ScanLine,
  BookOpen,
  ArrowUpRight,
  ChevronDown,
  Receipt,
  MapPin,
} from 'lucide-react';
import { getDestinationDirectory } from '@/lib/destinations';
import { session, createClient } from '@/lib/supabase/server';
import { checked, localizedText } from '@/lib/data';
import { AuthGate } from '@/components/auth-gate';
import { ActionForm } from '@/components/action-form';
import { StampDetail } from '@/components/experience/stamp-detail';
import { PassportPreview } from '@/components/experience/passport-preview';
import { PassportStampBook } from '@/components/experience/passport-stamp-book';
import { passportStampPages } from '@/lib/passport-pages';
import { ActivityPanel } from '@/components/activity-panel';
import { x402Enabled } from '@/lib/x402/server';
import { getPassportChainState } from '@/lib/activity/server';
export default async function Passport({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [t, user, selected, passAccount, chainState, explorationClaims] = await Promise.all([
    getTranslations(),
    session(),
    getSelectedDestination(),
    getPassAccount(),
    getPassportChainState(),
    getExplorationClaims(),
  ]);
  const db = user ? await createClient() : null;
  const [travelerResult, claimsResult, directory, servicesResult] = db
    ? await Promise.all([
        db.from('traveler_profiles').select('id,created_at').eq('user_id', user!.id).maybeSingle(),
        db
          .from('stamp_claims')
          .select('id,claimed_at,stamp_definitions(name),destination_id')
          .order('claimed_at', { ascending: false }),
        getDestinationDirectory(),
        db
          .from('merchant_service_acquisitions')
          .select('id,destination_id,stamp_name,service_name,acquired_at,request_id')
          .order('acquired_at', { ascending: false }),
      ])
    : [null, null, null, null];
  if (travelerResult?.error) throw new Error('data_unavailable');
  const passport = travelerResult?.data;
  const servicesUnavailable = Boolean(servicesResult?.error);
  const serviceAcquisitions = servicesResult && !servicesUnavailable ? checked(servicesResult) : [];
  const claims = [
    ...serviceAcquisitions.map((acquisition) => ({
      id: acquisition.id,
      destination_id: acquisition.destination_id,
      claimed_at: acquisition.acquired_at,
      stamp_definitions: { name: acquisition.stamp_name },
    })),
    ...(claimsResult ? checked(claimsResult) : []),
    ...explorationClaims.map((claim) => ({
      id: claim.id,
      destination_id: claim.destination_id,
      claimed_at: claim.claimed_at,
      stamp_definitions: {
        name: `${t(`destinationGuide.cities.${claim.guide_slug}.items.${claim.item_id}.title`)} (${t('exploration.label')})`,
      },
    })),
  ].sort((a, b) => b.claimed_at.localeCompare(a.claimed_at));
  const destinations = new Map(
    directory?.destinations.map((destination) => [destination.id, destination]),
  );
  const stampPages = passportStampPages(
    claims.map((claim) => ({
      id: claim.id,
      destinationId: claim.destination_id,
      destination: localizedText(destinations.get(claim.destination_id)?.names, locale),
      name: claim.stamp_definitions?.name ?? t('claim'),
      date: new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeZone: destinations.get(claim.destination_id)?.timezone ?? 'UTC',
      }).format(new Date(claim.claimed_at)),
    })),
  );
  const bookPages = stampPages.length
    ? stampPages.map((page) => ({
        id: page.id,
        title: page.destination,
        content: (
          <div className="collected-passport-stamps">
            {page.stamps.map((stamp) => (
              <StampDetail
                key={stamp.id}
                className="collected-passport-stamp"
                name={stamp.name}
                date={stamp.date}
              >
                <Stamp size={25} strokeWidth={1.3} aria-hidden="true" />
                <strong>{stamp.name}</strong>
                <time>{stamp.date}</time>
              </StampDetail>
            ))}
          </div>
        ),
      }))
    : [
        {
          id: 'first-page',
          title: t('passportBook.firstPage'),
          content: (
            <div className="collected-passport-empty">
              <Stamp size={42} strokeWidth={1.1} aria-hidden="true" />
              <h4>{t('stampEmpty')}</h4>
              <p>{t('activeEmptyBody')}</p>
              <Link className="app-text-link" href={`/${locale}/explore`}>
                {t('appUi.cityGuide')}
                <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </div>
          ),
        },
      ];
  const collection = (
    <section className="passport-collection" aria-labelledby="passport-stamps-heading">
      <h2 className="passport-stamps-title" id="passport-stamps-heading">
        {t('stamps')} <span className="count">{claims.length}</span>
      </h2>
      {passport ? (
        <PassportStampBook pages={bookPages} count={claims.length} />
      ) : claims.length ? (
        <div className="stamps">
          {claims.map((c) => (
            <StampDetail
              className="stamp"
              key={c.id}
              name={c.stamp_definitions?.name ?? t('claim')}
              date={new Intl.DateTimeFormat(locale, {
                dateStyle: 'medium',
                timeZone: destinations.get(c.destination_id)?.timezone ?? 'UTC',
              }).format(new Date(c.claimed_at))}
            >
              <Leaf size={30} />
              <h3>{c.stamp_definitions?.name}</h3>
              <p>{localizedText(destinations.get(c.destination_id)?.names, locale)}</p>
              <time>
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: 'medium',
                  timeZone: destinations.get(c.destination_id)?.timezone ?? 'UTC',
                }).format(new Date(c.claimed_at))}
              </time>
            </StampDetail>
          ))}
        </div>
      ) : (
        <div className="empty-stamp">
          <Stamp size={50} />
          <h3>{t('stampEmpty')}</h3>
          <p>{t(passport ? 'activeEmptyBody' : 'emptyBody')}</p>
          <Link className="app-text-link" href={`/${locale}/explore`}>
            {t('appUi.cityGuide')}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      )}
    </section>
  );
  return (
    <section className="section app-page passport-page">
      {passport ? (
        <header className="passport-workspace-heading">
          <div>
            <h1>{t('passportUi.title')}</h1>
            <p>{t('passportUi.body')}</p>
          </div>
          <Link className="button primary" href={`/${locale}/claim`}>
            <ScanLine size={17} aria-hidden="true" />
            {t('scan')}
          </Link>
        </header>
      ) : (
        <PageIntro title={t('passportTitle')} body={t('globalPassport.body')} icon={BookOpen}>
          {selected ? (
            <p>
              {t('destinationContext.passportScope', {
                destination: localizedText(selected.names, locale),
              })}
            </p>
          ) : null}
        </PageIntro>
      )}
      {passport ? <ActivityPanel state={chainState} locale={locale} /> : null}
      {user && x402Enabled() ? (
        <Link className="app-text-link" href={`/${locale}/passport/agents`}>
          {t('agentPurchase.title')}
        </Link>
      ) : null}
      <div className={passport ? 'passport-workspace' : 'passport-layout'}>
        {passport ? (
          <aside className="passport-identity" aria-label={t('passportUi.summary')}>
            <div className="passport-identity-brand">
              <Leaf size={20} strokeWidth={1.3} aria-hidden="true" />
              <span>{t('globalPassport.brand')}</span>
            </div>
            <p className="passport-active-status" role="status">
              <span aria-hidden="true" />
              {t('destinationPass.passportActive')}
            </p>
            <p className="passport-issued">
              {t('passportUi.since', {
                date: new Intl.DateTimeFormat(locale, {
                  dateStyle: 'medium',
                  timeZone: 'UTC',
                }).format(new Date(passport.created_at)),
              })}
            </p>
            <dl className="passport-totals">
              <div>
                <dt>{t('stamps')}</dt>
                <dd>{claims.length}</dd>
              </div>
              {passAccount ? (
                <div>
                  <dt>{t('destinationPass.holdingsTitle')}</dt>
                  <dd>{passAccount.holdings.length}</dd>
                </div>
              ) : null}
            </dl>
            {passAccount ? (
              <div className="passport-identity-reputation">
                <h2>{t('passportUi.reputation')}</h2>
                <div className="passport-reputation">
                  <strong>
                    {chainState?.unavailable
                      ? t('chainActivity.unavailable')
                      : t('destinationPass.reputation', {
                          points: chainState?.activity?.reputation ?? '0',
                        })}
                  </strong>
                  <span className="pass-reputation-award">
                    {chainState?.unavailable
                      ? null
                      : t(
                          `destinationPass.tiers.${reputationTier(Number(chainState?.activity?.reputation ?? 0))}`,
                        )}
                  </span>
                </div>
                <details className="pass-details">
                  <summary>
                    {t('destinationPass.tierTitle')}
                    <ChevronDown size={15} aria-hidden="true" />
                  </summary>
                  <p>{t('destinationPass.tierRules')}</p>
                </details>
              </div>
            ) : null}
            {selected ? (
              <Link
                className="passport-current-destination"
                href={`/${locale}/destinations/${selected.slug}`}
              >
                <MapPin size={16} aria-hidden="true" />
                <span>
                  <small>{t('passportUi.exploring')}</small>
                  {localizedText(selected.names, locale)}
                </span>
                <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            ) : null}
          </aside>
        ) : (
          <PassportPreview />
        )}
        <div className="passport-pages" id="passport-account">
          {!user ? <AuthGate locale={locale} /> : null}
          {passport ? collection : null}
          {servicesUnavailable ? <p role="status">{t('merchantServices.unavailable')}</p> : null}
          {serviceAcquisitions.length ? (
            <section className="passport-activity">
              <h2>{t('merchantServices.acquired')}</h2>
              <ul className="checkout-history">
                {serviceAcquisitions.map((item) => (
                  <li key={item.id}>
                    <Link href={`/${locale}/checkout/${item.request_id}`}>{item.service_name}</Link>
                    <span>{item.stamp_name}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {passAccount ? (
            <section className="passport-activity" aria-label={t('destinationPass.activity')}>
              <div className="passport-section-heading">
                <h2>{t('destinationPass.holdingsTitle')}</h2>
                <Link className="app-text-link" href={`/${locale}/destinations`}>
                  {t('passportUi.findPass')}
                  <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
              </div>
              {passAccount.holdings.length ? (
                <div className="passport-account-group">
                  <ul className="passport-holdings">
                    {passAccount.holdings.map((holding) => (
                      <li key={holding.id}>
                        <span className="passport-pass-symbol" aria-hidden="true">
                          <Stamp size={24} strokeWidth={1.2} />
                        </span>
                        <div>
                          <strong>
                            {localizedText(destinations.get(holding.destination_id)?.names, locale)}
                          </strong>
                          <span>{t('destinationPass.owned')}</span>
                        </div>
                        <Link
                          className="app-text-link"
                          href={`/${locale}/checkout/${holding.request_id}`}
                        >
                          <Receipt size={15} aria-hidden="true" />
                          {t('payments.receipt')}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="passport-no-passes">{t('passportUi.noPasses')}</p>
              )}
              <details
                className="passport-purchase-disclosure"
                open={passAccount.purchases.some((p) =>
                  ['created', 'prepared', 'submitted'].includes(p.status),
                )}
              >
                <summary>
                  <span>{t('destinationPass.purchases')}</span>
                  <ChevronDown size={16} aria-hidden="true" />
                </summary>
                <div className="passport-purchase-disclosure-body">
                  <p className="passport-section-note">
                    {t('destinationPass.purchaseHistoryNote')}
                  </p>
                  {passAccount.purchases.length ? (
                    <ul className="pass-purchase-history">
                      {passAccount.purchases.map((purchase) => (
                        <li key={purchase.request_id}>
                          <div className="passport-purchase-header">
                            <strong>
                              {localizedText(
                                destinations.get(purchase.destination_id)?.names,
                                locale,
                              )}
                            </strong>
                            <span className="passport-purchase-amount">{purchase.amount} USDC</span>
                          </div>
                          <div className="passport-purchase-meta">
                            <time dateTime={purchase.created_at}>
                              {new Intl.DateTimeFormat(locale, {
                                dateStyle: 'medium',
                                timeZone:
                                  destinations.get(purchase.destination_id)?.timezone ?? 'UTC',
                              }).format(new Date(purchase.created_at))}
                            </time>
                            <span className={`passport-purchase-status status-${purchase.status}`}>
                              {t(`payments.status.${purchase.status}`)}
                            </span>
                          </div>
                          <div className="passport-purchase-actions">
                            <Link
                              className="app-text-link"
                              href={`/${locale}/checkout/${purchase.request_id}`}
                            >
                              <Receipt size={15} aria-hidden="true" />
                              {t(
                                purchase.status === 'confirmed'
                                  ? 'payments.receipt'
                                  : 'destinationPass.openPurchase',
                              )}
                            </Link>
                            {purchase.transaction_hash ? (
                              <a
                                className="app-text-link"
                                href={transactionExplorerUrl(
                                  purchase.network,
                                  purchase.transaction_hash,
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {t('payments.explorer')}
                                <ArrowUpRight size={15} aria-hidden="true" />
                              </a>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>{t('destinationPass.noPurchases')}</p>
                  )}
                </div>
              </details>
            </section>
          ) : user ? (
            <p>{t('destinationPass.errors.unavailable')}</p>
          ) : null}
          {!passport ? collection : null}
          {!user ? null : !passport ? (
            <div>
              <p>{t('destinationPass.activateNote')}</p>
              <ActionForm locale={locale} command="activate_traveler" label={t('activate')} />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
