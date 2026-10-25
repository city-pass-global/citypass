import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { headers } from 'next/headers';
import { CountryTheme } from '@/components/country-theme';
import { countryForPath } from '@/lib/country-theme';
import { Suspense } from 'react';
import { getSelectedDestination } from '@/lib/destination-context/server';
import { getDestinationDirectory } from '@/lib/destinations';
import { LocaleLinks } from '@/components/locale-links';
import { UserRound, Leaf, ArrowUpRight } from 'lucide-react';
import { AppNavigation } from '@/components/app-navigation';
import { PassportCta } from '@/components/passport-cta';
import { configured } from '@/lib/supabase/server';
import '../globals.css';
import { notFound } from 'next/navigation';
import { isLocale } from '@/i18n/routing';
export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t('globalPassport.brand'), description: t('destinationContext.tagline') };
}
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const [t, messages, directory, selected] = await Promise.all([
    getTranslations(),
    getMessages(),
    getDestinationDirectory(),
    getSelectedDestination(),
  ]);
  const pathname = (await headers()).get('x-passport-pathname') ?? `/${locale}`;
  const country = countryForPath(
    pathname,
    directory?.destinations ?? [],
    directory?.countries ?? [],
    selected?.country_code,
  );
  const neutral = !country;
  return (
    <html lang={locale}>
      <body
        data-country={country}
        data-brand-page={neutral ? 'neutral' : 'country'}
        data-country-landing={
          /^\/(es|en|pt)\/destinations\/[a-z]{2}\/?$/.test(pathname) ? 'true' : 'false'
        }
      >
        <NextIntlClientProvider messages={messages}>
          <CountryTheme
            destinations={
              directory?.destinations.map(({ slug, country_code }) => ({ slug, country_code })) ??
              []
            }
            countries={directory?.countries.map(({ code }) => ({ code })) ?? []}
            selectedCountry={selected?.country_code}
          />
          <a className="skip" href="#main">
            {t('skip')}
          </a>
          <header className="site-header">
            <Link className="brand" href={`/${locale}`}>
              <Leaf size={27} />
              <span>{t('globalPassport.brand')}</span>
            </Link>
            <AppNavigation locale={locale} variant="desktop" />
            <div className="header-actions">
              <Suspense>
                <LocaleLinks locale={locale} />
              </Suspense>
              <PassportCta locale={locale} className="header-passport button primary" />
              <Link className="profile-link" aria-label={t('profile')} href={`/${locale}/profile`}>
                <UserRound size={20} />
              </Link>
            </div>
          </header>
          {!configured() && <aside className="setup-banner">{t('setup')}</aside>}
          <AppNavigation locale={locale} variant="journey" />
          <main id="main">{children}</main>
          <footer>
            <Link className="brand" href={`/${locale}`}>
              <Leaf size={22} />
              {t('globalPassport.brand')}
            </Link>
            <p>{t('destinationContext.tagline')}</p>
            <div>
              <Link href={`/${locale}/merchant`}>{t('landing.merchantTitle')}</Link>
              <Link href={`/${locale}/partners`}>{t('landing.operatorTitle')}</Link>
              <Link href={`/${locale}/privacy`}>{t('privacy')}</Link>
              <Link href={`/${locale}/hotel`}>
                {t('hotel')} <ArrowUpRight size={15} />
              </Link>
            </div>
          </footer>
          <AppNavigation locale={locale} variant="mobile" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
