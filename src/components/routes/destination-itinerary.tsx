import { getTranslations } from 'next-intl/server';
import { ArrowUpRight, Compass } from 'lucide-react';
import { getDestinationGuide } from '@/lib/destination-guides';
import { SaveRoute } from './save-route';

// Editorial suggestions reuse the sourced discovery catalog, never database route awards.
export async function DestinationItinerary({ slug }: { slug: string }) {
  const guide = getDestinationGuide(slug);
  if (!guide) return null;
  const t = await getTranslations();
  return (
    <article className="itinerary" id="itinerary">
      <div className="itinerary-story">
        <div className="route-mark" aria-hidden="true">
          <Compass size={48} />
        </div>
        <p className="route-kicker">{t('routeGuide.suggested')}</p>
        <h2>{t(`destinationJourneys.cities.${slug}`)}</h2>
        <p>{t(`destinationGuide.cities.${slug}.intro`)}</p>
        <SaveRoute key={slug} routeId={`${slug}:discovery`} />
        <aside className="route-preparation">
          <h3>{t('routeGuide.before')}</h3>
          <p>{t(`destinationGuide.cities.${slug}.tip`)}</p>
          <p>{t('destinationJourneys.planning')}</p>
        </aside>
      </div>
      <div className="itinerary-stops">
        <h3>
          {t('routeGuide.itinerary')}{' '}
          <span>{t('routeGuide.stops', { count: guide.items.length })}</span>
        </h3>
        <p className="route-order-note">{t('destinationJourneys.order')}</p>
        <ol>
          {guide.items.map((item, index) => (
            <li key={item.id}>
              <span className="route-stop-number" aria-hidden="true">
                {index + 1}
              </span>
              <div>
                <span className="route-stop-label">
                  {t(`destinationGuide.categories.${item.category}`)}
                </span>
                <h4>{t(`destinationGuide.cities.${slug}.items.${item.id}.title`)}</h4>
                <p>{t(`destinationGuide.cities.${slug}.items.${item.id}.body`)}</p>
                <div className="route-stop-links">
                  <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
                    {t('routeGuide.source')} <ArrowUpRight size={14} />
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ol>
        <p className="route-disclaimer">{t('destinationGuide.note')}</p>
      </div>
    </article>
  );
}
