import { WorkspaceAccess } from '@/components/workspace-access';
import { randomUUID } from 'node:crypto';
import Link from 'next/link';
import { DemoNotice } from '@/components/demo-notice';
import { getTranslations } from 'next-intl/server';
import { createClient, session } from '@/lib/supabase/server';
import { ExperienceForm } from '@/components/operator/experience-form';
import { reviewerContextSchema } from '@/lib/review/validation';
import { operatorFiltersSchema, operatorQueueSchema } from '@/lib/experiences/validation';
import { localizedText } from '@/lib/data';
export default async function Operator({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ destination?: string; status?: string; offset?: string }>;
}) {
  const { locale } = await params;
  const [t, user, query] = await Promise.all([
    getTranslations('operator'),
    session(),
    searchParams,
  ]);
  if (!user)
    return <WorkspaceAccess locale={locale} title={t('title')} body={t('body')} kind="operator" />;
  const db = await createClient();
  const context = await db.rpc('experience_command', { action: 'context', payload: {} });
  const scope = reviewerContextSchema.safeParse(context.data);
  if (context.error || !scope.success)
    return (
      <section className="section narrow workspace-page">
        <h1>{t('title')}</h1>
        <p role="alert">{t('errors.unavailable')}</p>
      </section>
    );
  if (!scope.data.destinations.length)
    return (
      <section className="section narrow workspace-page">
        <h1>{t('title')}</h1>
        <p>{t('noAccess')}</p>
      </section>
    );
  const filters = operatorFiltersSchema.safeParse(query);
  if (!filters.success)
    return (
      <section className="section narrow workspace-page">
        <h1>{t('title')}</h1>
        <p>{t('errors.invalid')}</p>
        <Link href={`/${locale}/operator`}>{t('reset')}</Link>
      </section>
    );
  const destination = filters.data.destination ?? scope.data.destinations[0].id;
  const result = await db.rpc('experience_command', {
    action: 'queue',
    payload: {
      destination_id: destination,
      status: filters.data.status,
      offset: filters.data.offset,
    },
  });
  const queue = operatorQueueSchema.safeParse(result.data);
  const pageLink = (offset: number) =>
    `/${locale}/operator?${new URLSearchParams({ destination, status: filters.data.status, offset: String(offset) })}`;
  return (
    <section className="section narrow workspace-page">
      <h1>{t('title')}</h1>
      <p>{t('body')}</p>
      <form className="review-filters" method="get">
        <label>
          {t('destination')}
          <select name="destination" defaultValue={destination}>
            {scope.data.destinations.map((d) => (
              <option key={d.id} value={d.id}>
                {localizedText(d.names, locale)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('status')}
          <select name="status" defaultValue={filters.data.status}>
            {(['draft', 'published', 'archived'] as const).map((status) => (
              <option key={status} value={status}>
                {t(`statuses.${status}`)}
              </option>
            ))}
          </select>
        </label>
        <button className="button outline">{t('filter')}</button>
      </form>
      {result.error ? (
        <p role="alert">{t('errors.unavailable')}</p>
      ) : !queue.success ? (
        <p role="alert">{t('errors.forbidden')}</p>
      ) : (
        <>
          <h2>{t('catalog')}</h2>
          <p>{t('total', { count: queue.data.total })}</p>
          {!queue.data.experiences.length ? (
            <p>{t('empty')}</p>
          ) : (
            <ul className="destination-listings">
              {queue.data.experiences.map((item) => (
                <li key={item.id}>
                  {item.is_demo ? <DemoNotice compact /> : null}
                  <h3>{item.is_demo ? t('fictionalTitle') : localizedText(item.titles, locale)}</h3>
                  <p>{t(`statuses.${item.status}`)}</p>
                  <Link href={`/${locale}/operator/${item.id}`}>{t('edit')}</Link>
                </li>
              ))}
            </ul>
          )}
          <nav className="inline-actions" aria-label={t('pagination')}>
            {filters.data.offset > 0 ? (
              <Link href={pageLink(Math.max(0, filters.data.offset - 25))}>{t('previous')}</Link>
            ) : null}
            {filters.data.offset + 25 < queue.data.total ? (
              <Link href={pageLink(filters.data.offset + 25)}>{t('next')}</Link>
            ) : null}
          </nav>
          <section className="merchant-business">
            <h2>{t('new')}</h2>
            <p>{t('contentNote')}</p>
            <ExperienceForm
              key={destination}
              locale={locale}
              action="create"
              commandId={randomUUID()}
              destination={destination}
            />
          </section>
        </>
      )}
    </section>
  );
}
