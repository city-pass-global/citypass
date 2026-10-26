import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getServiceCatalog } from '@/lib/payments/services-server';
import { ServiceForm } from './service-form';
export async function ServiceOffers({
  venueId,
  locale,
  compact = false,
}: {
  venueId: string;
  locale: string;
  compact?: boolean;
}) {
  const [catalog, t] = await Promise.all([
    getServiceCatalog(),
    getTranslations('merchantServices'),
  ]);
  const services = catalog.services.filter(
    (service) => (service.reference_venue_id ?? service.venue_id) === venueId,
  );
  return (
    <div className={`merchant-service-list${compact ? ' is-compact' : ''}`}>
      {services.map((service) => {
        const acquired = catalog.acquisitions.find((item) => item.service_id === service.id);
        const title = service.seller_source === 'citypass' ? t('platformService') : service.name;
        const action = acquired ? (
          <Link className="button outline" href={`/${locale}/checkout/${acquired.request_id}`}>
            {t('acquired')}
          </Link>
        ) : catalog.user ? (
          <ServiceForm locale={locale} command="buy" label={t('buy')}>
            <input type="hidden" name="service_id" value={service.id} />
          </ServiceForm>
        ) : (
          <Link className="button primary" href={`/${locale}/login`}>
            {t('buy')}
          </Link>
        );
        if (compact) {
          return (
            <section className="merchant-service" key={service.id}>
              <p className="merchant-service-price">{service.amount} USDC</p>
              {action}
            </section>
          );
        }
        return (
          <section className="merchant-service" key={service.id}>
            <h3>{title}</h3>
            {service.seller_source === 'citypass' ? <p>{t('platformScope')}</p> : null}
            <p>{service.amount} USDC</p>
            <p>{t('award')}</p>
            {action}
            <small>{t('network')}</small>
          </section>
        );
      })}
      {!services.length ? (
        <p className="muted">{t(catalog.available ? 'empty' : 'unavailable')}</p>
      ) : null}
    </div>
  );
}
