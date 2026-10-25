/** Visual context only. Authorization and record filtering never use this value. */
export function countryForPath(
  pathname: string,
  destinations: ReadonlyArray<{ slug: string; country_code: string }>,
  countries: ReadonlyArray<{ code: string }>,
  selectedCountry?: string,
): string | undefined {
  if (/^\/(es|en|pt)\/?$/.test(pathname) || /^\/(es|en|pt)\/destinations\/?$/.test(pathname))
    return undefined;
  const countryPath = pathname.match(/^\/(?:es|en|pt)\/destinations\/([a-z]{2})\/?$/);
  if (countryPath) return countries.find((c) => c.code.toLowerCase() === countryPath[1])?.code;
  const cityPath = pathname.match(/^\/(?:es|en|pt)\/destinations\/([a-z0-9-]+)\/?$/);
  if (cityPath) return destinations.find((d) => d.slug === cityPath[1])?.country_code;
  return countries.find((c) => c.code === selectedCountry)?.code;
}
