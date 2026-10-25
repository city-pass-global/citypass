import { ServiceOffers } from '@/components/payments/service-offers';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { z } from 'zod';
import { configured, createClient } from '@/lib/supabase/server';
import { getDestinationDirectory } from '@/lib/destinations';
import { localizedText, checked } from '@/lib/data';
import { matchesGuideQuery } from '@/lib/destination-guides';
import { PageIntro } from '@/components/page-intro';
import { Store } from 'lucide-react';

const filtersSchema = z.object({
  q: z.string().trim().max(120).catch('').optional(),
  destination: z.uuid().catch('').optional(),
});
export default async function Merchants({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; destination?: string }>;
}) {
  const [{ locale }, filters, t] = await Promise.all([params, searchParams, getTranslations()]);
  const { q = '', destination = '' } = filtersSchema.parse(filters);
  if (!configured())
    return (
      <section className="section app-page">
        <h1>{t('exploration.directoryTitle')}</h1>
        <p>{t('exploration.unconfigured')}</p>
      </section>
    );
  const db = await createClient();
  const directory = await getDestinationDirectory();
  const cities = new Map(directory?.destinations.map((city) => [city.id, city]));
  // Fetch all public listings, including those outside the current city preference.
  const readPage = (offset: number) =>
    db
      .from('venues')
      .select('id,name,description,destination_id,participation_status,source_url,address')
      .order('id')
      .range(offset, offset + 499);
  const venues = checked(await readPage(0));
  let offset = venues.length;
  while (offset > 0 && offset % 500 === 0) {
    const page = checked(await readPage(offset));
    venues.push(...page);
    offset += page.length;
    if (page.length < 500) break;
  }
  const filtered = venues
    .filter(
      (venue) =>
        (!destination || venue.destination_id === destination) &&
        matchesGuideQuery(
          q,
          venue.name,
          localizedText(venue.description, locale),
          localizedText(cities.get(venue.destination_id)?.names, locale),
        ),
    )
    .sort((a, b) => a.name.localeCompare(b.name, locale));
  return (
    <section className="section app-page">
      <PageIntro
        title={t('exploration.directoryTitle')}
        body={t('exploration.directoryBody')}
        icon={Store}
      />
      <form className="directory-search merchant-directory-search" action={`/${locale}/merchants`}>
        <label htmlFor="merchant-search">{t('exploration.search')}</label>
        <div>
          <input id="merchant-search" name="q" type="search" maxLength={120} defaultValue={q} />
          <label className="sr-only" htmlFor="merchant-destination">
            {t('exploration.destination')}
          </label>
          <select id="merchant-destination" name="destination" defaultValue={destination}>
            <option value="">{t('exploration.destination')}</option>
            {directory?.destinations.map((city) => (
              <option key={city.id} value={city.id}>
                {localizedText(city.names, locale)}
              </option>
            ))}
          </select>
          <button type="submit">{t('exploration.submit')}</button>
        </div>
      </form>
      <p role="status">{t('exploration.results', { count: filtered.length })}</p>
      <div className="places">
        {filtered.map((venue) => (
          <article className="place" id={`merchant-${venue.id}`} key={venue.id}>
            <div className="place-copy">
              <span className="tag">
                {t(venue.participation_status === 'participating' ? 'participating' : 'listed')}
              </span>
              <h2>{venue.name}</h2>
              <p>{localizedText(venue.description, locale)}</p>
              <p>{localizedText(cities.get(venue.destination_id)?.names, locale)}</p>
              {venue.address ? <p>{venue.address}</p> : null}
              <ServiceOffers locale={locale} venueId={venue.id} />
              {venue.source_url ? (
                <a href={venue.source_url} target="_blank" rel="noopener noreferrer">
                  {t('source')}
                </a>
              ) : null}
              {venue.participation_status === 'participating' ? (
                <Link className="button outline" href={`/${locale}/claim`}>
                  {t('exploration.scan')}
                </Link>
              ) : null}
            </div>
          </article>
        ))}
      </div>
      {!filtered.length ? <p>{t('exploration.empty')}</p> : null}
    </section>
  );
}
