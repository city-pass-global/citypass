import { DestinationItinerary } from '@/components/routes/destination-itinerary';
import { getDestinationGuide } from '@/lib/destination-guides';
import { PageIntro, EmptyState } from '@/components/page-intro';
import { getTranslations } from 'next-intl/server';
import { Route, Waves, Bird, Sprout, Mountain, ArrowUpRight, Compass, Stamp } from 'lucide-react';
import Link from 'next/link';
import { itineraries, getItinerary } from '@/lib/itineraries';
import { SaveRoute } from '@/components/routes/save-route';
import { Landscape } from '@/components/landscape';
import { configured, createClient, session } from '@/lib/supabase/server';
import { checked, localizedText } from '@/lib/data';
import { getSelectedDestination } from '@/lib/destination-context/server';
import { destinationId } from '@/lib/catalog';
export default async function Routes({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ route?: string }>;
}) {
  const { locale } = await params;
  const [t, selected] = await Promise.all([getTranslations(), getSelectedDestination()]);
  const selection = await searchParams;
  const chosen = getItinerary(typeof selection.route === 'string' ? selection.route : undefined);
  const icons = { falls: Waves, wildlife: Bird, roots: Sprout, adventure: Mountain };
  const ChosenIcon = icons[chosen.id];
  const db = configured() ? await createClient() : null;
  const routes = db
    ? checked(
        await db
          .from('routes')
          .select('id,name,description,required_stops,route_stops(venue_id,position,venues(name))')
          .eq('destination_id', selected?.id ?? destinationId),
      )
    : [];
  const user = await session();
  const claims =
    db && user ? checked(await db.from('stamp_claims').select('stamp_definitions(venue_id)')) : [];
  const visited = new Set(
    claims.map((c) => (c.stamp_definitions as unknown as { venue_id: string } | null)?.venue_id),
  );
  if (selected && selected.slug !== 'puerto-iguazu')
    return (
      <section className="section app-page routes-page">
        <PageIntro
          title={t('destinationContext.routesTitle', {
            destination: localizedText(selected.names, locale),
          })}
          icon={Route}
        />
        <DestinationItinerary slug={selected.slug} />
        {!routes.length && !getDestinationGuide(selected.slug) ? (
          <EmptyState
            icon={Route}
            title={t('appUi.routesEmptyTitle')}
            body={t('destinationContext.routesEmpty')}
          />
        ) : (
          routes.map((route) => (
            <article className="route-item" key={route.id}>
              <h2>{localizedText(route.name, locale)}</h2>
              <p>{localizedText(route.description, locale)}</p>
              <p>
                {t('routeProgress', {
                  count: route.route_stops.filter((stop) => visited.has(stop.venue_id)).length,
                  total: route.required_stops,
                })}
              </p>
              <ol>
                {route.route_stops
                  .toSorted((a, b) => a.position - b.position)
                  .map((stop) => (
                    <li key={stop.venue_id}>{stop.venues?.name}</li>
                  ))}
              </ol>
            </article>
          ))
        )}
        <Link className="app-text-link" href={`/${locale}/destinations/${selected.slug}`}>
          {t('destinationContext.discover')}
        </Link>
      </section>
    );
  return (
    <section className="section routes-page">
      <header className="routes-intro">
        <div>
          <p className="location">
            <Compass size={16} />
            {t('routeGuide.eyebrow')}
          </p>
          <h1>{t('routesTitle')}</h1>
          <p>{t('routeGuide.intro')}</p>
        </div>
        <div className="routes-postcard" aria-hidden="true">
          <Landscape />
          <span>
            <Route size={22} /> Iguazú
          </span>
        </div>
      </header>
      <nav className="route-choices" aria-label={t('routeGuide.choose')}>
        {itineraries.map((route) => {
          const Icon = icons[route.id];
          return (
            <Link
              key={route.id}
              href={`/${locale}/routes?route=${route.id}#itinerary`}
              aria-current={route.id === chosen.id ? 'page' : undefined}
            >
              <Icon size={26} />
              <strong>{t(`routeGuide.themes.${route.id}.title`)}</strong>
              <span>{t('routeGuide.stops', { count: route.stopIds.length })}</span>
            </Link>
          );
        })}
      </nav>
      <article id="itinerary" className={`itinerary itinerary-${chosen.id}`}>
        <div className="itinerary-story">
          <div className="route-mark" aria-hidden="true">
            <ChosenIcon size={48} />
          </div>
          <p className="route-kicker">{t('routeGuide.suggested')}</p>
          <h2>{t(`routeGuide.themes.${chosen.id}.title`)}</h2>
          <h3>{t(`routeGuide.themes.${chosen.id}.subtitle`)}</h3>
          <p>{t(`routeGuide.themes.${chosen.id}.body`)}</p>
          <SaveRoute key={chosen.id} routeId={chosen.id} />
          <aside className="route-preparation">
            <h3>{t('routeGuide.before')}</h3>
            <p>{t(`routeGuide.themes.${chosen.id}.tip`)}</p>
            <Link href={`/${locale}/explore?category=agency#discover`}>
              {t('routeGuide.agencies')} <ArrowUpRight size={16} />
            </Link>
          </aside>
        </div>
        <div className="itinerary-stops">
          <h3>
            {t('routeGuide.itinerary')}{' '}
            <span>{t('routeGuide.stops', { count: chosen.stops.length })}</span>
          </h3>
          <p className="route-order-note">{t('routeGuide.orderNote')}</p>
          <ol>
            {chosen.stops.map((stop, index) => (
              <li key={stop.id}>
                <span className="route-stop-number" aria-hidden="true">
                  {index + 1}
                </span>
                <div>
                  <span className="route-stop-label">{t('routeGuide.listed')}</span>
                  <h4>{stop.name}</h4>
                  <p>{stop.description[locale] ?? stop.description.es}</p>
                  {stop.address && <p className="route-address">{stop.address}</p>}
                  <div className="route-stop-links">
                    <a href={stop.source_url!} target="_blank" rel="noopener noreferrer">
                      {t('routeGuide.source')} <ArrowUpRight size={14} />
                    </a>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.name + ', ' + (stop.address ?? '') + ', Puerto Iguazú, Misiones, Argentina')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t('routeGuide.map')} <ArrowUpRight size={14} />
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </article>
      <div className="route-passport-note">
        <Stamp size={30} />
        <p>{t('routeGuide.stampNote')}</p>
        <Link href={`/${locale}/passport`}>
          {t('routeGuide.passport')} <ArrowUpRight size={16} />
        </Link>
      </div>
      <p className="route-disclaimer">{t('routeGuide.disclaimer')}</p>
      {routes.length > 0 &&
        routes.map((route) => (
          <article className="route-item" key={route.id}>
            <p className="route-kicker">{t('routeGuide.official')}</p>
            <Route size={30} />
            <h2>{localizedText(route.name, locale)}</h2>
            <p>{localizedText(route.description, locale)}</p>
            <p>
              {t('routeProgress', {
                count: route.route_stops.filter((s) => visited.has(s.venue_id)).length,
                total: route.required_stops,
              })}
            </p>
            <ol>
              {route.route_stops
                .sort((a, b) => a.position - b.position)
                .map((stop) => (
                  <li key={stop.venue_id}>
                    {(stop.venues as unknown as { name: string } | null)?.name}
                  </li>
                ))}
            </ol>
          </article>
        ))}
    </section>
  );
}
