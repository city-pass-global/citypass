import { ServiceOffers } from '@/components/payments/service-offers';
import { DestinationPass } from '@/components/destination-pass';
import { DestinationGuide } from '@/components/destination-guide';
import { getDestinationGuide } from '@/lib/destination-guides';
import Link from 'next/link';
import { MapPin, Stamp, Compass, BookOpen, ArrowRight } from 'lucide-react';
import { DestinationArt } from '@/components/destination-art';
import { PassportAtlas } from '@/components/passport-atlas';
import { DemoNotice } from '@/components/demo-notice';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { destinationSlugSchema, getDestinationDirectory } from '@/lib/destinations';
import { getPublishedExperiences } from '@/lib/experiences/server';
import { selectDestination } from '@/app/destination-actions';
import { getSelectedDestination } from '@/lib/destination-context/server';
import { getPlaces, localizedText } from '@/lib/data';
export default async function DestinationContent({
  locale,
  slug,
  filters = {},
  discoveryPath,
}: {
  locale: string;
  slug: string;
  filters?: { category?: unknown; q?: unknown };
  discoveryPath?: string;
}) {
  if (!destinationSlugSchema.safeParse(slug).success) notFound();
  const [t, directory, selected] = await Promise.all([
    getTranslations(),
    getDestinationDirectory(),
    getSelectedDestination(),
  ]);
  if (!directory)
    return (
      <section className="section">
        <h1>{t('destinations.title')}</h1>
        <p>{t('destinations.unconfigured')}</p>
      </section>
    );
  const destination = directory.destinations.find((item) => item.slug === slug);
  if (!destination) notFound();
  const country = directory.countries.find((item) => item.code === destination.country_code)!;
  const [places, experiences] = await Promise.all([
    getPlaces(destination.id),
    getPublishedExperiences(destination.id),
  ]);
  const hasGuide = Boolean(getDestinationGuide(slug));
  const realExperiences = experiences.filter((item) => !item.is_demo);
  const demoExperiences = experiences.filter((item) => item.is_demo);
  return (
    <>
      <section className={`hero destination-hero country-${country.code}`}>
        <div className="hero-copy">
          <Link className="location" href={`/${locale}/destinations`}>
            <Compass size={16} />
            {t('destinations.change')}
          </Link>
          <p className="destination-location">
            <MapPin size={16} />
            {localizedText(country.names, locale)}
          </p>
          <h1>{localizedText(destination.names, locale)}</h1>
          <p className="lead">
            {hasGuide
              ? t(`destinationGuide.cities.${slug}.heroBody`)
              : t('travelDesign.cityBody', {
                  destination: localizedText(destination.names, locale),
                })}
          </p>
          <div className="hero-actions">
            <Link className="button outline" href={`/${locale}/merchants`}>
              {t('exploration.merchants')}
            </Link>
            <Link className="button primary" href={`/${locale}/passport`}>
              <BookOpen size={18} />
              {t('travelDesign.open')}
            </Link>
            <a href="#destination-discover">
              {t(getDestinationGuide(slug) ? 'destinationGuide.title' : 'destinations.listings')}
            </a>
          </div>
          {selected?.id === destination.id ? (
            <p className="hero-caption">
              <Stamp size={18} />
              {t('destinationContext.active')}
            </p>
          ) : (
            <form action={selectDestination.bind(null, locale)}>
              <input type="hidden" name="slug" value={destination.slug} />
              <button className="button outline">{t('destinationContext.useCity')}</button>
            </form>
          )}
        </div>
        <div className="hero-art destination-landscape">
          <DestinationArt
            country={country.code}
            slug={destination.slug}
            label={t('travelDesign.illustration', {
              destination: localizedText(destination.names, locale),
            })}
          />
          <div className="postmark destination-postmark">
            <span>{localizedText(destination.names, locale)}</span>
            <Compass size={28} />
            <span>{localizedText(country.names, locale)}</span>
          </div>
          <p className="postcard-caption">{t('travelDesign.artNote')}</p>
        </div>
      </section>
      <PassportAtlas locale={locale} />
      <DestinationPass destination={destination.id} locale={locale} />
      <section id="destination-discover" className="section destination-directory">
        <div className="destination-discover-heading">
          <div>
            <p className="location">{localizedText(destination.names, locale)}</p>
            <h2>{t('fieldNotes')}</h2>
          </div>
          <dl className="destination-facts">
            <div>
              <dt>{t('destinations.currency')}</dt>
              <dd>{country.currency_code}</dd>
            </div>
            <div>
              <dt>{t('destinations.timezone')}</dt>
              <dd>{destination.timezone}</dd>
            </div>
          </dl>
        </div>
        <DestinationGuide
          slug={slug}
          country={country.code}
          locale={locale}
          path={discoveryPath ?? `/${locale}/destinations/${slug}`}
          filters={filters}
        />
        {places.length || !getDestinationGuide(slug) ? (
          <>
            <h2>{t('destinations.listings')}</h2>
            {places.length === 0 ? (
              <p>{t('destinations.empty')}</p>
            ) : (
              <ul className="destination-listings">
                {places.map((place) => (
                  <li key={place.id}>
                    <h3>{place.name}</h3>
                    <p>{localizedText(place.description, locale)}</p>
                    <ServiceOffers locale={locale} venueId={place.id} />
                    {place.source_url ? (
                      <a href={place.source_url} target="_blank" rel="noopener noreferrer">
                        {t('destinations.source')}
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            <p className="muted">{t('destinations.sourceNote')}</p>
          </>
        ) : null}
        <section className="merchant-business">
          <h2>{t('operator.publicTitle')}</h2>
          {realExperiences.length ? (
            <ul className="destination-listings">
              {realExperiences.map((item) => (
                <li key={item.id}>
                  <h3>
                    <Link href={`/${locale}/experiences/${item.id}`}>
                      {localizedText(item.titles, locale)}
                    </Link>
                  </h3>
                  <p>{localizedText(item.descriptions, locale)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>{t('operator.publicEmpty')}</p>
          )}
          <p>{t('operator.requestOnly')}</p>
        </section>
        {demoExperiences.length ? (
          <section className="merchant-business demo-catalog">
            <h2>{t('demo.catalog')}</h2>
            <DemoNotice />
            <ul className="destination-listings">
              {demoExperiences.map((item) => (
                <li key={item.id}>
                  <h3>
                    <Link href={`/${locale}/experiences/${item.id}`}>
                      {t('demo.experienceTitle')}
                    </Link>
                  </h3>
                  <p>{t('demo.notice')}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </section>
      <section className="passport-promo section destination-passport-promo">
        <div className="destination-passport-seal" aria-hidden="true">
          <Stamp size={46} />
          <Compass size={22} />
        </div>
        <div>
          <h2>{t('destinationGuide.passportTitle')}</h2>
          <p>{t('destinationGuide.passportBody')}</p>
          <Link href={`/${locale}/passport`}>
            {t('travelDesign.open')}
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    </>
  );
}
