import { PassSummary } from '@/components/pass-summary';
import { PassportCta } from '@/components/passport-cta';
import { PassProgram } from '@/components/pass-program';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import {
  ArrowUpRight,
  ArrowRight,
  BookOpen,
  Compass,
  Globe2,
  ScanLine,
  Stamp,
  Store,
  Wallet,
  Landmark,
  Plus,
  Check,
  ChevronDown,
} from 'lucide-react';
import { DestinationArt } from '@/components/destination-art';
import { LandingJourney } from '@/components/landing-journey';
import { SampleStamp } from '@/components/experience/sample-stamp';
import { getDestinationDirectory } from '@/lib/destinations';
import { localizedText } from '@/lib/data';
import { walletConfiguration } from '@/lib/wallet/server';

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [t, directory] = await Promise.all([getTranslations(), getDestinationDirectory()]);
  const countries = ['CR', 'AR', 'BR', 'PT'].flatMap((code) => {
    const country = directory?.countries.find((entry) => entry.code === code);
    return country
      ? [
          {
            ...country,
            cities: directory!.destinations.filter((city) => city.country_code === code),
          },
        ]
      : [];
  });
  const passportHref = `/${locale}/passport`;
  const config = walletConfiguration();
  return (
    <div className="global-landing">
      <section className="hero global-hero">
        <div className="hero-copy">
          <p className="journey-intro">
            <Globe2 size={17} />
            {t('landing.intro')}
          </p>
          <h1>{t('landing.title')}</h1>
          <p className="lead">{t('landing.body')}</p>
          <div className="hero-actions">
            <PassportCta locale={locale} className="button primary">
              <ArrowUpRight size={18} />
            </PassportCta>
            <Link className="button outline" href={`/${locale}/destinations`}>
              {t('marketing.cta')}
            </Link>
          </div>
          <p className="hero-footnote">
            <BookOpen size={15} />
            {t('landing.heroNote')}
          </p>
        </div>
        {countries.length ? (
          <LandingJourney
            destinations={countries.map((country) => ({
              code: country.code,
              name: localizedText(country.names, locale),
              href: `/${locale}/destinations/${country.code.toLowerCase()}`,
              art: (
                <DestinationArt
                  country={country.code}
                  slug={country.code === 'AR' ? 'puerto-iguazu' : undefined}
                  label={t('travelDesign.illustration', {
                    destination: localizedText(country.names, locale),
                  })}
                />
              ),
            }))}
            passportHref={passportHref}
            brand={t('globalPassport.brand')}
            tagline={t('destinationContext.tagline')}
            label={t('landing.chooseScene')}
          />
        ) : (
          <DestinationArt country="AR" slug="puerto-iguazu" label={t('landing.intro')} />
        )}
      </section>

      <section className="section landing-countries" id="countries">
        <div className="landing-section-heading">
          <div>
            <h2>{t('landing.countriesTitle')}</h2>
            <p>{t('landing.countriesBody')}</p>
          </div>
          <Link href={`/${locale}/destinations`}>
            {t('landing.allDestinations')}
            <ArrowUpRight size={18} />
          </Link>
        </div>
        {countries.length ? (
          <div className="landing-country-grid">
            {countries.map((country) => (
              <Link
                className={`landing-country country-${country.code}`}
                key={country.code}
                href={`/${locale}/destinations/${country.code.toLowerCase()}`}
              >
                <div className="landing-country-art">
                  <DestinationArt
                    country={country.code}
                    slug={country.code === 'AR' ? 'puerto-iguazu' : undefined}
                    label={t('travelDesign.illustration', {
                      destination: localizedText(country.names, locale),
                    })}
                  />
                  <span className="country-code" aria-hidden="true">
                    {country.code}
                  </span>
                </div>
                <div className="landing-country-copy">
                  <h3>
                    {localizedText(country.names, locale)}
                    <ArrowUpRight size={20} />
                  </h3>
                  <p>
                    {country.cities.map((city) => localizedText(city.names, locale)).join(' / ')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p role="status">{t('destinationContext.unavailable')}</p>
        )}
      </section>

      <section className="landing-wallet" id="travel-wallet">
        <div className="landing-wallet-inner">
          <div className="wallet-editorial">
            <div className="wallet-symbol">
              <Wallet size={27} strokeWidth={1.4} />
            </div>
            <h2>{t('landing.walletTitle')}</h2>
            <p className="lead">{t('landing.walletBody')}</p>
            <ul className="wallet-capabilities">
              {['walletTopup', 'walletPay', 'walletRecord'].map((key) => (
                <li key={key}>
                  <Check size={17} />
                  {t(`landing.${key}`)}
                </li>
              ))}
            </ul>
            <div className="inline-actions">
              <Link className="button primary" href={`/${locale}/wallet`}>
                {t('landing.openWallet')}
                <ArrowUpRight size={17} />
              </Link>
              <Link href={`/${locale}/pay`}>
                {t('payments.scan')}
                <ScanLine size={18} />
              </Link>
            </div>
            <details className="pass-details">
              <summary>{t('payments.networkDetails')}</summary>
              <p>
                {t(
                  config?.network === 'mainnet' ? 'landing.walletNetwork' : 'landing.walletTestnet',
                )}
              </p>
            </details>
          </div>
          <div className="wallet-travel-object">
            <div className="wallet-object-heading">
              <span>{t('landing.travelWallet')}</span>
              <Compass size={25} strokeWidth={1.2} />
            </div>
            <span className="wallet-currency">{t('landing.usdc')}</span>
            <p>{t('landing.walletObjectBody')}</p>
            <div className="wallet-object-flow">
              <span>
                <Plus size={22} />
                {t('landing.addFunds')}
              </span>
              <ArrowRight size={19} />
              <span>
                <ScanLine size={28} />
                {t('landing.scanPay')}
              </span>
            </div>
            <div className="wallet-object-footer">
              <span>{t('landing.stellar')}</span>
              <span>{t('landing.walletConcept')}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section landing-passes" id="city-passes">
        <div className="landing-section-heading">
          <div>
            <h2>{t('landing.passesTitle')}</h2>
            <p>{t('destinationPass.introShort')}</p>
          </div>
        </div>
        <div className="pass-selection">
          <div className="pass-selection-intro">
            <PassSummary />
            <p>{t('destinationPass.chooseDestination')}</p>
          </div>
          <div className="pass-register">
            {countries.map((country) => (
              <details className={`pass-country country-${country.code}`} key={country.code}>
                <summary>
                  <span>
                    {localizedText(country.names, locale)}
                    <small>
                      {country.cities.map((city) => localizedText(city.names, locale)).join(' / ')}
                    </small>
                  </span>
                  <ChevronDown size={18} aria-hidden="true" />
                </summary>
                <div>
                  {country.cities.map((city) => (
                    <article className="pass-entry" key={city.id}>
                      <h3>{localizedText(city.names, locale)}</h3>
                      <p className="pass-price">{t('destinationPass.price')}</p>
                      <Link
                        href={`/${locale}/destinations/${city.slug}#destination-pass`}
                        aria-label={t('destinationPass.viewCity', {
                          destination: localizedText(city.names, locale),
                        })}
                      >
                        {t('destinationPass.detailsShort')}
                        <ArrowUpRight size={16} aria-hidden="true" />
                      </Link>
                    </article>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>
        {!countries.length ? <p role="status">{t('destinationContext.unavailable')}</p> : null}
        <PassProgram id="landing-pass-program" />
      </section>

      <section className="section landing-passport" id="digital-passport">
        <div className="passport-memory">
          <SampleStamp />
        </div>
        <div>
          <h2>{t('landing.passportTitle')}</h2>
          <p className="lead">{t('landing.passportBody')}</p>
          <div className="passport-chapters">
            {(
              [
                [Stamp, 'stamps'],
                [Compass, 'visited'],
                [BookOpen, 'achievements'],
              ] as const
            ).map(([Icon, key]) => (
              <div key={key}>
                <Icon size={20} strokeWidth={1.5} />
                <span>{t(`landing.${key}`)}</span>
              </div>
            ))}
          </div>
          <p className="landing-note">{t('landing.achievementsNote')}</p>
          <PassportCta locale={locale} className="landing-text-link">
            <ArrowUpRight size={18} />
          </PassportCta>
        </div>
      </section>

      <section className="section landing-how" id="how-it-works">
        <h2>{t('landing.howTitle')}</h2>
        <ol>
          {(
            [
              ['create', BookOpen],
              ['select', Globe2],
              ['pay', ScanLine],
              ['collect', Stamp],
            ] as const
          ).map(([key, Icon], index) => (
            <li key={key}>
              <span className="step-number">{index + 1}</span>
              <Icon size={27} strokeWidth={1.3} />
              <h3>{t(`landing.${key}Title`)}</h3>
              <p>{t(`landing.${key}Body`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="section landing-business" id="business">
        <div className="landing-section-heading">
          <div>
            <h2>{t('landing.businessTitle')}</h2>
            <p>{t('landing.businessBody')}</p>
          </div>
        </div>
        <div className="business-paths">
          <article>
            <Store size={27} strokeWidth={1.3} />
            <h3>{t('landing.merchantTitle')}</h3>
            <p>{t('landing.merchantBody')}</p>
            <Link className="landing-text-link" href={`/${locale}/merchant`}>
              {t('landing.merchantCta')}
              <ArrowUpRight size={18} />
            </Link>
          </article>
          <article>
            <Landmark size={27} strokeWidth={1.3} />
            <h3>{t('landing.operatorTitle')}</h3>
            <p>{t('landing.operatorBody')}</p>
            <Link className="landing-text-link" href={`/${locale}/partners`}>
              {t('landing.operatorCta')}
              <ArrowUpRight size={18} />
            </Link>
          </article>
        </div>
      </section>
      <section className="landing-closing">
        <Compass size={44} strokeWidth={1} />
        <h2>{t('landing.closingTitle')}</h2>
        <p>{t('landing.closingBody')}</p>
        <PassportCta locale={locale} className="button">
          <ArrowUpRight size={18} />
        </PassportCta>
      </section>
    </div>
  );
}
