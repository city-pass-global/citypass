'use client';
import { useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';
import { countryForPath } from '@/lib/country-theme';

/** Keep the shared App Router layout in sync during client navigation. */
export function CountryTheme({
  destinations,
  countries,
  selectedCountry,
}: {
  destinations: { slug: string; country_code: string }[];
  countries: { code: string }[];
  selectedCountry?: string;
}) {
  const pathname = usePathname();
  const country = countryForPath(pathname, destinations, countries, selectedCountry);
  useLayoutEffect(() => {
    if (country) document.body.dataset.country = country;
    else delete document.body.dataset.country;
    document.body.dataset.countryLanding = /^\/(es|en|pt)\/destinations\/[a-z]{2}\/?$/.test(
      pathname,
    )
      ? 'true'
      : 'false';
    document.body.dataset.brandPage = country ? 'country' : 'neutral';
  }, [country, pathname]);
  return null;
}
