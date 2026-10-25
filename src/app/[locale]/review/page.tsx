import { WorkspaceAccess } from '@/components/workspace-access';
import { randomUUID } from 'node:crypto';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ReviewForm } from '@/components/payments/review-form';
import { createClient, session } from '@/lib/supabase/server';
import { localizedText } from '@/lib/data';
import {
  reviewerContextSchema,
  reviewFilterSchema,
  reviewQueueSchema,
} from '@/lib/review/validation';
export default async function Review({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ destination?: string; status?: string; offset?: string }>;
}) {
  const { locale } = await params;
  const [t, user, rawFilters] = await Promise.all([
    getTranslations('review'),
    session(),
    searchParams,
  ]);
  if (!user)
    return <WorkspaceAccess locale={locale} title={t('title')} body={t('body')} kind="review" />;
  const db = await createClient();
  const context = await db.rpc('merchant_review_command', { action: 'context', payload: {} });
  const parsedContext = reviewerContextSchema.safeParse(context.data);
  if (context.error || !parsedContext.success)
    return (
      <section className="section narrow workspace-page">
        <h1>{t('title')}</h1>
        <p role="alert">{t('errors.unavailable')}</p>
      </section>
    );
  const destinations = parsedContext.data.destinations;
  if (!destinations.length)
    return (
      <section className="section narrow workspace-page">
        <h1>{t('title')}</h1>
        <p>{t('noAccess')}</p>
      </section>
    );
  const parsedFilters = reviewFilterSchema.safeParse(rawFilters);
  if (!parsedFilters.success)
    return (
      <section className="section narrow workspace-page">
        <h1>{t('title')}</h1>
        <p>{t('errors.invalid')}</p>
        <Link href={`/${locale}/review`}>{t('reset')}</Link>
      </section>
    );
  const filters = parsedFilters.data;
  const destination = filters.destination ?? destinations[0].id;
  const result = await db.rpc('merchant_review_command', {
    action: 'queue',
    payload: { destination_id: destination, status: filters.status, offset: filters.offset },
  });
  const queue = reviewQueueSchema.safeParse(result.data);
  const pageLink = (offset: number) =>
    `/${locale}/review?${new URLSearchParams({ destination, status: filters.status, offset: String(offset) })}`;
  return (
    <section className="section narrow workspace-page">
      <h1>{t('title')}</h1>
      <p>{t('body')}</p>
      <form method="get" className="review-filters">
        <label>
          {t('destination')}
          <select name="destination" defaultValue={destination}>
            {destinations.map((d) => (
              <option key={d.id} value={d.id}>
                {localizedText(d.names, locale)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('status')}
          <select name="status" defaultValue={filters.status}>
            {(['pending', 'approved', 'suspended'] as const).map((status) => (
              <option key={status} value={status}>
                {t(`statuses.${status}`)}
              </option>
            ))}
          </select>
        </label>
        <button className="button outline">{t('filter')}</button>
      </form>
      {result.error || !queue.success ? (
        <p role="alert">{t('errors.forbidden')}</p>
      ) : (
        <>
          <p>{t('total', { count: queue.data.total })}</p>
          {!queue.data.merchants.length ? <p>{t('empty')}</p> : null}
          {queue.data.merchants.map((merchant) => (
            <article
              className="merchant-business"
              key={`${merchant.id}:${merchant.approval_version}`}
            >
              <h2>{merchant.name}</h2>
              <p>{t(`statuses.${merchant.status}`)}</p>
              <p>
                {t('registered')}:{' '}
                {new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(
                  new Date(merchant.created_at),
                )}{' '}
                UTC
              </p>
              {merchant.last_review ? (
                <div className="notice">
                  <h3>{t('lastReview')}</h3>
                  <p>{merchant.last_review.reason}</p>
                  <p>{t(`statuses.${merchant.last_review.status}`)}</p>
                </div>
              ) : null}
              {merchant.own_business ? (
                <p>{t('ownBusiness')}</p>
              ) : (
                <ReviewForm
                  locale={locale}
                  id={merchant.id}
                  version={merchant.approval_version}
                  commandId={randomUUID()}
                  status={merchant.status}
                />
              )}
            </article>
          ))}
          <nav className="inline-actions" aria-label={t('pagination')}>
            {filters.offset > 0 ? (
              <Link href={pageLink(Math.max(0, filters.offset - 25))}>{t('previous')}</Link>
            ) : null}
            {filters.offset + 25 < queue.data.total ? (
              <Link href={pageLink(filters.offset + 25)}>{t('next')}</Link>
            ) : null}
          </nav>
        </>
      )}
    </section>
  );
}
