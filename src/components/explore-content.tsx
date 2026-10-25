import { ServiceOffers } from '@/components/payments/service-offers';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import {
  ArrowUpRight,
  MapPin,
  Leaf,
  Utensils,
  BedDouble,
  Compass,
  Sprout,
  Music,
  Mountain,
  Bird,
  Trees,
  ArrowRight,
  Stamp,
  ScanLine,
  BookOpen,
  Footprints,
} from 'lucide-react';
import { filterPlaces } from '@/lib/catalog';
import { getDestinationDirectory } from '@/lib/destinations';
import { getSelectedDestination } from '@/lib/destination-context/server';
import DestinationContent from '@/components/destination-content';
import { getPlaces } from '@/lib/data';
import { PassportAtlas } from '@/components/passport-atlas';
import { Landscape } from '@/components/landscape';
import { SampleStamp } from '@/components/experience/sample-stamp';
import { PlaceIllustration } from '@/components/experience/place-illustration';
import { PassportCta } from '@/components/passport-cta';
export default async function Explore({
  params,
  searchParams,
  destinationSlug,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; q?: string }>;
  destinationSlug?: string;
}) {
  const [{ locale }, { category, q }] = await Promise.all([params, searchParams]);
  const selected = destinationSlug
    ? (await getDestinationDirectory())?.destinations.find((d) => d.slug === destinationSlug)
    : await getSelectedDestination();
  if (selected && selected.slug !== 'puerto-iguazu')
    return (
      <DestinationContent
        locale={locale}
        slug={selected.slug}
        filters={{ category, q }}
        discoveryPath={`/${locale}/explore`}
      />
    );
  const [t, places] = await Promise.all([getTranslations(), getPlaces(selected?.id)]);
  const discoveryPath = destinationSlug
    ? `/${locale}/destinations/${destinationSlug}`
    : `/${locale}/explore`;
  const query = typeof q === 'string' ? q.slice(0, 120) : '';
  const selectedCategory = typeof category === 'string' ? category : '';
  const filtered = filterPlaces(places, selectedCategory, query);
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="location">
            <MapPin size={16} />
            {t('location')}
          </p>
          <h1>{t('heroTitle')}</h1>
          <p className="lead">{t('heroBody')}</p>
          <div className="hero-actions">
            <Link className="button outline" href={`/${locale}/merchants`}>
              {t('exploration.merchants')}
            </Link>
            <PassportCta locale={locale} className="button primary">
              <ArrowRight size={17} />
            </PassportCta>
            <a href="#discover">{t('discover')}</a>
          </div>
          <p className="hero-caption">
            <Stamp size={18} />
            {t('onePassport')}
          </p>
        </div>
        <div className="hero-art">
          <Landscape />
          <div className="postmark">
            <span>Puerto Iguazú</span>
            <Leaf size={28} />
            <span>Misiones · Argentina</span>
          </div>
          <div className="art-label">25°41′ S &nbsp; 54°26′ O</div>
        </div>
      </section>
      <PassportAtlas locale={locale} />
      <section className="first-stamp section" aria-labelledby="first-stamp-title">
        <div className="first-stamp-heading">
          <h2 id="first-stamp-title">{t('experience.firstStampTitle')}</h2>
          <p>{t('experience.firstStampBody')}</p>
        </div>
        <ol className="journey-steps">
          {[
            ['stepExplore', 'stepExploreBody', Footprints],
            ['stepScan', 'stepScanBody', ScanLine],
            ['stepKeep', 'stepKeepBody', BookOpen],
          ].map(([title, body, Icon], i) => (
            <li key={title as string}>
              <div className="step-symbol">
                <Icon size={23} />
                <span>{i + 1}</span>
              </div>
              <h3>{t(`experience.${title}`)}</h3>
              <p>{t(`experience.${body}`)}</p>
            </li>
          ))}
        </ol>
      </section>
      <section id="discover" className="discover section">
        <div className="section-heading">
          <div>
            <h2>{t('fieldNotes')}</h2>
            <p>{t('directory.sourceIntro')}</p>
          </div>
          <span className="discovery-note">
            <Leaf size={17} />
            {t('experience.discoverNote')}
          </span>
        </div>
        <nav className="filters" aria-label={t('explore')}>
          {[
            ['all', '', MapPin],
            ['nature', 'nature', Leaf],
            ['directory.culture', 'culture', Music],
            ['directory.adventure', 'adventure', Mountain],
            ['directory.rural', 'rural', Sprout],
            ['directory.agency', 'agency', Compass],
            ['food', 'food', Utensils],
            ['stay', 'stay', BedDouble],
          ].map(([key, value, Icon]) => (
            <Link
              className={(!category && !value) || category === value ? 'selected' : ''}
              key={key as string}
              href={`${discoveryPath}?${new URLSearchParams({ ...(value ? { category: value as string } : {}), ...(query ? { q: query } : {}) })}#discover`}
              aria-current={selectedCategory === value ? 'page' : undefined}
            >
              <Icon size={16} />
              {t(key as string)}
            </Link>
          ))}
        </nav>
        <form action={`${discoveryPath}#discover`} className="directory-search">
          <label htmlFor="directory-query">{t('directory.searchLabel')}</label>
          <div>
            {selectedCategory && <input type="hidden" name="category" value={selectedCategory} />}
            <input
              id="directory-query"
              name="q"
              type="search"
              maxLength={120}
              defaultValue={query}
              placeholder={t('directory.searchPlaceholder')}
            />
            <button type="submit">{t('directory.search')}</button>
          </div>
        </form>
        <div className="directory-summary">
          <p>{t('directory.results', { count: filtered.length })}</p>
          {(query || selectedCategory) && (
            <Link href={`${discoveryPath}#discover`}>{t('directory.clear')}</Link>
          )}
        </div>
        <div className="places">
          {filtered.map((place, index) => (
            <article className="place" key={place.id}>
              <div className={`place-art art-${index % 3}`}>
                {place.id.startsWith('20000000') ? (
                  <PlaceIllustration variant={index % 3} />
                ) : (
                  <div className="directory-emblem" aria-hidden="true">
                    {place.category === 'agency' ? (
                      <Compass />
                    ) : place.category === 'culture' ? (
                      <Music />
                    ) : place.category === 'rural' ? (
                      <Sprout />
                    ) : place.category === 'adventure' ? (
                      <Mountain />
                    ) : place.id.includes('picaflores') || place.id.includes('guira') ? (
                      <Bird />
                    ) : (
                      <Trees />
                    )}
                  </div>
                )}
              </div>
              <div className="place-copy">
                <span className="tag">
                  {t(place.participation_status === 'participating' ? 'participating' : 'listed')}
                </span>
                <h3>{place.name}</h3>
                <p>{place.description[locale] ?? place.description.es}</p>
                <ServiceOffers locale={locale} venueId={place.id} />
                {(place.address || place.phone || place.email) && (
                  <details className="directory-contact">
                    <summary>{t('directory.contact')}</summary>
                    {place.address && (
                      <p>
                        <MapPin size={14} /> {place.address}
                      </p>
                    )}
                    {place.phone && (
                      <p>
                        <a
                          href={`tel:${place.phone.startsWith('+') ? place.phone.replace(/[^+0-9]/g, '') : '+54' + place.phone.replace(/\D/g, '')}`}
                        >
                          {place.phone}
                        </a>
                      </p>
                    )}
                    {place.email && (
                      <p>
                        <a href={`mailto:${place.email}`}>{place.email}</a>
                      </p>
                    )}
                  </details>
                )}
                {place.checked_at && (
                  <small className="directory-checked">
                    {t('directory.checked', {
                      date: new Intl.DateTimeFormat(locale, {
                        dateStyle: 'medium',
                        timeZone: 'UTC',
                      }).format(new Date(place.checked_at + 'T12:00:00Z')),
                    })}
                  </small>
                )}
                {place.source_url && (
                  <a href={place.source_url} target="_blank" rel="noopener noreferrer">
                    {t('source')}
                    <ArrowUpRight size={16} />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
        {!filtered.length && (
          <div className="empty">
            <p>{t('noPlaces')}</p>
            <a
              href={
                category === 'food'
                  ? 'https://visitiguazu.travel/gastronomia/'
                  : 'https://visitiguazu.travel/'
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('source')}
              <ArrowUpRight size={16} />
            </a>
          </div>
        )}
        <div className="directory-sources">
          <strong>{t('directory.sourceTitle')}</strong>
          <p className="source-note">{t('sourceNote')}</p>
          <a
            href="https://visitiguazu.travel/atractivos/"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('directory.attractionsSource')} <ArrowUpRight size={14} />
          </a>
          <a href="https://visitiguazu.travel/agencias/" target="_blank" rel="noopener noreferrer">
            {t('directory.agenciesSource')} <ArrowUpRight size={14} />
          </a>
        </div>
      </section>
      <section className="passport-promo section">
        <SampleStamp />
        <div>
          <h2>{t('passportTitle')}</h2>
          <p>{t('experience.promoBody')}</p>
          <PassportCta locale={locale}>
            <ArrowRight size={17} />
          </PassportCta>
        </div>
      </section>
    </>
  );
}
