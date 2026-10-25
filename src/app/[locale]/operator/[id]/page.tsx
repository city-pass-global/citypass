import { randomUUID } from 'node:crypto';
import Link from 'next/link';
import { DemoNotice } from '@/components/demo-notice';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { getTranslations } from 'next-intl/server';
import { createClient, session } from '@/lib/supabase/server';
import { experienceSchema } from '@/lib/experiences/validation';
import { reviewerContextSchema } from '@/lib/review/validation';
import { localizedText } from '@/lib/data';
import { AuthGate } from '@/components/auth-gate';
import { ExperienceForm } from '@/components/operator/experience-form';
export default async function EditExperience({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [t, user] = await Promise.all([getTranslations('operator'), session()]);
  if (!user)
    return (
      <section className="section narrow app-page detail-page">
        <h1>{t('edit')}</h1>
        <AuthGate locale={locale} />
      </section>
    );
  const db = await createClient();
  const [context, result] = await Promise.all([
    db.rpc('experience_command', { action: 'context', payload: {} }),
    db.from('experiences').select('*').eq('id', id).maybeSingle(),
  ]);
  const scope = reviewerContextSchema.safeParse(context.data),
    parsed = experienceSchema.safeParse(result.data);
  if (
    context.error ||
    result.error ||
    !scope.success ||
    !parsed.success ||
    !scope.data.destinations.some((d) => d.id === parsed.data.destination_id)
  )
    return (
      <section className="section narrow app-page detail-page">
        <h1>{t('edit')}</h1>
        <p>{t('errors.forbidden')}</p>
      </section>
    );
  const item = parsed.data;
  return (
    <section className="section narrow app-page detail-page">
      <Link
        href={`/${locale}/operator?${new URLSearchParams({ destination: item.destination_id, status: item.status })}`}
      >
        {t('catalog')}
      </Link>
      <h1>{item.is_demo ? t('fictionalTitle') : localizedText(item.titles, locale)}</h1>
      {item.is_demo ? <DemoNotice /> : null}
      <p>{t(`statuses.${item.status}`)}</p>
      {item.status === 'published' ? (
        <>
          <p>{t('withdrawFirst')}</p>
          <Link href={`/${locale}/experiences/${item.id}`}>{t('publicView')}</Link>
          <ExperienceForm locale={locale} action="withdraw" commandId={randomUUID()} item={item} />
        </>
      ) : (
        <>
          <h2>{t('edit')}</h2>
          <p>{t('contentNote')}</p>
          <ExperienceForm locale={locale} action="save" commandId={randomUUID()} item={item} />
          {item.status === 'draft' ? (
            <section className="merchant-business">
              <h2>{t('publish')}</h2>
              <p>{t('publishNote')}</p>
              <ExperienceForm
                locale={locale}
                action="publish"
                commandId={randomUUID()}
                item={item}
              />
            </section>
          ) : (
            <p>{t('archivedNote')}</p>
          )}
        </>
      )}
    </section>
  );
}
