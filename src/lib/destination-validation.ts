import { z } from 'zod';
export const destinationSlugSchema = z
  .string()
  .max(80)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
const names = z.object({ es: z.string().min(1), en: z.string().min(1), pt: z.string().min(1) });
export const destinationSchema = z.object({
  id: z.uuid(),
  slug: destinationSlugSchema,
  name: z.string().min(1),
  names,
  country_code: z.string().regex(/^[A-Z]{2}$/),
  timezone: z.string().refine((value) => {
    try {
      new Intl.DateTimeFormat('en', { timeZone: value });
      return value.includes('/');
    } catch {
      return false;
    }
  }),
});
export const countrySchema = z.object({
  code: z.string().regex(/^[A-Z]{2}$/),
  names,
  currency_code: z.string().regex(/^[A-Z]{3}$/),
});
