import Link from 'next/link';
import { DemoNotice } from '@/components/demo-notice';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { getTranslations } from 'next-intl/server';
import { configured, createClient } from '@/lib/supabase/server';
import { getDestinationDirectory } from '@/lib/destinations';
import { experienceSchema } from '@/lib/experiences/validation';
import { localizedText } from '@/lib/data';
export default async function ExperienceDetail({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!z.uuid().safeParse(id).success || !configured()) notFound();
  const db = await createClient();
  const [t, directory, result] = await Promise.all([
    getTranslations('operator'),
    getDestinationDirectory(),
    db.from('experiences').select('*').eq('id', id).eq('status', 'published').maybeSingle(),
  ]);
  if (result.error) throw new Error('experiences_unavailable');
  if (!result.data) notFound();
  const item = experienceSchema.parse(result.data);
  const destination = directory?.destinations.find((d) => d.id === item.destination_id);
  if (!destination) notFound();
  return (
    <section className="section narrow app-page detail-page">
      <Link href={`/${locale}/destinations/${destination.slug}`}>
        {localizedText(destination.names, locale)}
      </Link>
      <h1>{item.is_demo ? t('fictionalTitle') : localizedText(item.titles, locale)}</h1>
      {item.is_demo ? <DemoNotice /> : null}
      <p className="experience-description">
        {!item.is_demo ? localizedText(item.descriptions, locale) : null}
      </p>
      <p className="notice">{t('requestOnly')}</p>
      {item.booking_url ? (
        <a
          className="button outline"
          href={item.booking_url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('externalBooking')}
        </a>
      ) : (
        <p>{t('noBookingLink')}</p>
      )}
    </section>
  );
}
