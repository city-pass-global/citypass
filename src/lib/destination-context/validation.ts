import { z } from 'zod';
import { destinationSlugSchema } from '../destination-validation';
export const countrySelectionSchema = z.object({ country: z.string().regex(/^[A-Z]{2}$/) });
export const destinationSelectionSchema = z.object({ slug: destinationSlugSchema });
export function localeHref(pathname: string, search: string, locale: string) {
  if (!['es', 'en', 'pt'].includes(locale)) throw new Error('invalid_locale');
  const path = /^\/(es|en|pt)(\/|$)/.test(pathname)
    ? pathname.replace(/^\/(es|en|pt)/, `/${locale}`)
    : `/${locale}`;
  const input = new URLSearchParams(search),
    output = new URLSearchParams();
  for (const key of ['q', 'category', 'route', 'destination', 'experience', 'status', 'offset']) {
    const value = input.get(key);
    if (value && value.length <= 120) output.set(key, value);
  }
  return path + (output.size ? `?${output}` : '');
}
