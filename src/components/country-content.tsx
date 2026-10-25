import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Compass, MapPin, BookOpen, ArrowUpRight } from 'lucide-react';
import { getDestinationDirectory } from '@/lib/destinations';
import { localizedText } from '@/lib/data';
import { DestinationArt } from '@/components/destination-art';
import { selectDestination } from '@/app/destination-actions';
import { SampleStamp } from '@/components/experience/sample-stamp';

export async function CountryContent({ locale, code }: { locale: string; code: string }) {
  const [t, directory] = await Promise.all([getTranslations(), getDestinationDirectory()]);
  const country = directory?.countries.find((c) => c.code.toLowerCase() === code);
  if (!directory || !country) notFound();
  const name = localizedText(country.names, locale);
  const cities = directory.destinations.filter((d) => d.country_code === country.code);
  const known = ['AR', 'BR', 'CR', 'PT'].includes(country.code);
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
            {name}
          </p>
          <h1>{known ? t(`marketing.${country.code}`) : name}</h1>
          <p className="lead">
            {known
              ? t(`landing.countryIntro.${country.code}`)
              : t('marketing.countryBody', { country: name })}
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#cities">
              {t('marketing.cities')}
            </a>
            <Link href={`/${locale}/passport`}>
              <BookOpen size={17} /> {t('travelDesign.open')}
            </Link>
          </div>
        </div>
        <div className="hero-art travel-postcard">
          <DestinationArt
            country={country.code}
            slug={country.code === 'AR' ? 'puerto-iguazu' : undefined}
            label={t('travelDesign.illustration', { destination: name })}
          />
          <div className="postmark destination-postmark">
            <span>{name}</span>
            <Compass size={30} />
            <span>{country.currency_code}</span>
          </div>
          <p className="postcard-caption">{t('travelDesign.artNote')}</p>
        </div>
      </section>
      <section className={`section country-cities country-${country.code}`} id="cities">
        <h2>{t('marketing.cities')}</h2>
        <div className="country-city-grid">
          {cities.map((city) => (
            <article key={city.id}>
              <div className="country-city-art">
                <DestinationArt
                  country={country.code}
                  slug={city.slug}
                  label={t('travelDesign.illustration', {
                    destination: localizedText(city.names, locale),
                  })}
                />
              </div>
              <h3>
                <Link href={`/${locale}/destinations/${city.slug}`}>
                  {localizedText(city.names, locale)}
                </Link>
              </h3>
              <p>
                {t('travelDesign.cityBody', { destination: localizedText(city.names, locale) })}
              </p>
              <form action={selectDestination.bind(null, locale)}>
                <input type="hidden" name="slug" value={city.slug} />
                <button className="country-entry">
                  {t('destinationContext.choose')}
                  <ArrowUpRight size={17} />
                </button>
              </form>
            </article>
          ))}
        </div>
      </section>
      <section className="passport-promo section">
        <SampleStamp />
        <div>
          <h2>{t('passportTitle')}</h2>
          <p>{t('globalPassport.body')}</p>
          <Link href={`/${locale}/passport`}>{t('travelDesign.open')}</Link>
        </div>
      </section>
    </>
  );
}
