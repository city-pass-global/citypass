import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';
import { isLocale } from './routing';
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = (await requestLocale) ?? (await headers()).get('x-passport-locale');
  const locale = requested && isLocale(requested) ? requested : 'es';
  return { locale, messages: (await import(`../../messages/${locale}.json`)).default };
});
