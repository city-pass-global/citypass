import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { PassportChainState } from '@/lib/activity/server';
import { ActivityRefresh } from './activity-refresh';
export async function ActivityPanel({
  state,
  locale = 'en',
}: {
  state: PassportChainState | null;
  locale?: string;
}) {
  const [t, services] = await Promise.all([
    getTranslations('chainActivity'),
    getTranslations('merchantServices'),
  ]);
  if (!state) return null;
  return (
    <section className="pass-details" aria-label={t('title')}>
      <ActivityRefresh pending={state.unavailable || state.pending > 0} />
      <p role="status">
        {state.unavailable
          ? t('unavailable')
          : state.failed
            ? t('delayed')
            : state.pending
              ? t('pending')
              : t('confirmed')}
      </p>
      {state.activity ? (
        <dl className="passport-totals">
          <div>
            <dt>{t('onChainPurchases')}</dt>
            <dd>{state.activity.purchases}</dd>
          </div>
          <div>
            <dt>{t('onChainStamps')}</dt>
            <dd>{state.activity.stamps}</dd>
          </div>
          <div>
            <dt>{t('onChainExploration')}</dt>
            <dd>{state.activity.exploration_stamps}</dd>
          </div>
        </dl>
      ) : null}
      {state.recent.length ? (
        <div>
          <h2>{services('activityTitle')}</h2>
          <ul className="passport-chain-events">
            {state.recent.map((event) => (
              <li key={event.id}>
                <strong>{services(`kinds.${event.kind}`)}</strong>
                <span>{services(`states.${event.state}`)}</span>
                <time dateTime={event.created_at}>
                  {new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(
                    new Date(event.created_at),
                  )}
                </time>
                {event.transaction_hash ? (
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${event.transaction_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {services('transaction')}
                  </a>
                ) : null}
                {event.request_id ? (
                  <Link href={`/${locale}/checkout/${event.request_id}`}>
                    {services('receipt')}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {state.contractId ? (
        <a
          className="app-text-link"
          href={`https://stellar.expert/explorer/testnet/contract/${state.contractId}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('contract')}
        </a>
      ) : null}
    </section>
  );
}
