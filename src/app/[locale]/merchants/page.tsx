import { ServiceOffers } from '@/components/payments/service-offers';
import { getTranslations } from 'next-intl/server';
import { z } from 'zod';
import { configured, createClient } from '@/lib/supabase/server';
import { getDestinationDirectory } from '@/lib/destinations';
import { localizedText, checked } from '@/lib/data';
import { matchesGuideQuery } from '@/lib/destination-guides';
import { Stamp, Store } from 'lucide-react';

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
      <section className="section app-page merchant-directory">
        <header className="merchant-register-heading">
          <h1>{t('exploration.directoryTitle')}</h1>
          <p className="lead">{t('exploration.unconfigured')}</p>
        </header>
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
  const groups = new Map<string, typeof filtered>();
  for (const venue of filtered) {
    const list = groups.get(venue.destination_id);
    if (list) list.push(venue);
    else groups.set(venue.destination_id, [venue]);
  }
  const cityGroups = [...groups.entries()].sort((a, b) => {
    const nameA = localizedText(cities.get(a[0])?.names, locale);
    const nameB = localizedText(cities.get(b[0])?.names, locale);
    if (!nameA && nameB) return 1;
    if (nameA && !nameB) return -1;
    return nameA.localeCompare(nameB, locale);
  });
  return (
    <section className="section app-page merchant-directory">
      <header className="merchant-register-heading">
        <h1>{t('exploration.directoryTitle')}</h1>
        <p className="lead">{t('exploration.directoryBody')}</p>
      </header>
      <form className="directory-search merchant-index" action={`/${locale}/merchants`}>
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
      <p className="merchant-result-count" role="status">
        {t('exploration.results', { count: filtered.length })}
      </p>
      <div className="merchant-ledger">
        {cityGroups.map(([cityId, cityVenues]) => {
          const city = cities.get(cityId);
          const cityName = localizedText(city?.names, locale);
          return (
            <section
              className="merchant-city"
              data-country={city?.country_code}
              key={cityId}
            >
              <h2>{cityName || t('exploration.ungrouped')}</h2>
              <div className="merchant-cards">
                {cityVenues.map((venue) => {
                  const participating = venue.participation_status === 'participating';
                  const Icon = participating ? Stamp : Store;
                  return (
                    <article
                      className={`merchant-card${participating ? ' is-participating' : ''}`}
                      id={`merchant-${venue.id}`}
                      key={venue.id}
                    >
                      <div className="merchant-card-art" aria-hidden="true">
                        <Icon size={54} strokeWidth={1.2} />
                        <span className="merchant-card-ring" />
                      </div>
                      <div className="merchant-card-copy">
                        <h3>{venue.name}</h3>
                        <ServiceOffers compact locale={locale} venueId={venue.id} />
                        {venue.source_url ? (
                          <a
                            className="merchant-source"
                            href={venue.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {t('source')}
                          </a>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      {!filtered.length ? <p className="merchant-empty">{t('exploration.empty')}</p> : null}
      <p className="source-note">{t('destinations.sourceNote')}</p>
    </section>
  );
}
