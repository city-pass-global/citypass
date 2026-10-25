import Link from 'next/link';
import { Compass, BookOpen, ArrowUpRight } from 'lucide-react';
import { DestinationArt } from '@/components/destination-art';
import { getTranslations } from 'next-intl/server';
import { selectCountry } from '@/app/destination-actions';
import { getDestinationDirectory } from '@/lib/destinations';
import { localizedText } from '@/lib/data';
export default async function Destinations({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  const { error } = await searchParams;
  const [t, directory] = await Promise.all([getTranslations(), getDestinationDirectory()]);
  return (
    <section className="section destination-directory">
      <div className="atlas-heading country-picker-heading">
        <div>
          <h1>{t('destinations.title')}</h1>
          <p className="lead">{t('travelDesign.countriesBody')}</p>
        </div>
        <Link className="atlas-passport" href={`/${locale}/passport`}>
          <BookOpen size={38} />
          <span>{t('globalPassport.brand')}</span>
          <Compass size={58} strokeWidth={1} />
          <span>{t('travelDesign.open')}</span>
        </Link>
      </div>
      <div className="country-postcards">
        {error ? (
          <p role="alert">
            {t(
              error === 'unavailable'
                ? 'destinationContext.unavailable'
                : 'destinationContext.invalid',
            )}
          </p>
        ) : null}
        {!directory ? (
          <p role="status">{t('destinations.unconfigured')}</p>
        ) : (
          directory.countries
            .toSorted(
              (a, b) =>
                ['CR', 'AR', 'BR', 'PT'].indexOf(a.code) - ['CR', 'AR', 'BR', 'PT'].indexOf(b.code),
            )
            .map((country) => (
              <section
                key={country.code}
                id={`country-${country.code}`}
                className={`country-postcard country-${country.code}`}
              >
                <div className="country-postcard-art">
                  <DestinationArt
                    country={country.code}
                    slug={country.code === 'AR' ? 'puerto-iguazu' : undefined}
                    label={t('travelDesign.illustration', {
                      destination: localizedText(country.names, locale),
                    })}
                  />
                  <span className="country-stamp" aria-hidden="true">
                    {country.code}
                    <Compass size={22} />
                  </span>
                </div>
                <div className="country-postcard-copy">
                  <h2>{localizedText(country.names, locale)}</h2>
                  {['AR', 'BR', 'CR', 'PT'].includes(country.code) ? (
                    <p>{t(`landing.countryIntro.${country.code}`)}</p>
                  ) : null}
                  <form action={selectCountry.bind(null, locale)}>
                    <input type="hidden" name="country" value={country.code} />
                    <button className="country-entry">
                      {t('marketing.countryCta', { country: localizedText(country.names, locale) })}
                      <ArrowUpRight size={18} />
                    </button>
                  </form>
                </div>
              </section>
            ))
        )}
      </div>
    </section>
  );
}
