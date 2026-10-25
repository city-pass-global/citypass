import Link from 'next/link';
import { Compass, Globe2 } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { getDestinationDirectory } from '@/lib/destinations';
import { localizedText } from '@/lib/data';

export async function PassportAtlas({ locale }: { locale: string }) {
  const [t, directory] = await Promise.all([getTranslations(), getDestinationDirectory()]);
  if (!directory) return null;
  return (
    <section className="passport-atlas" aria-label={t('travelDesign.countries')}>
      <Link className="atlas-intro" href={`/${locale}/destinations`}>
        <Globe2 size={25} />
        <span>
          {t('travelDesign.countries')}
          <small>{t('travelDesign.browse')}</small>
        </span>
      </Link>
      <div className="atlas-countries">
        {directory.countries.map((country) => (
          <Link
            key={country.code}
            className={`atlas-country country-${country.code}`}
            href={`/${locale}/destinations/${country.code.toLowerCase()}`}
          >
            <span className="country-code" aria-hidden="true">
              {country.code}
            </span>
            <span>{localizedText(country.names, locale)}</span>
            <Compass size={16} aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}
