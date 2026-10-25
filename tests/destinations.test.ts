import { expect, it } from 'vitest';
import { destinationSchema, destinationSlugSchema } from '../src/lib/destination-validation';
it('rejects malformed destination paths and metadata', () => {
  for (const value of ['../lisbon', 'Lisbon', '', 'rio_de_janeiro', 'x'.repeat(81)]) {
    expect(destinationSlugSchema.safeParse(value).success).toBe(false);
  }
  const destination = {
    id: '10000000-0000-4000-8000-000000000001',
    slug: 'lisbon',
    name: 'Lisboa',
    names: { es: 'Lisboa', en: 'Lisbon', pt: 'Lisboa' },
    country_code: 'PT',
    timezone: 'Europe/Lisbon',
  };
  expect(destinationSchema.safeParse(destination).success).toBe(true);
  expect(destinationSchema.safeParse({ ...destination, timezone: 'Invalid/Zone' }).success).toBe(
    false,
  );
  expect(destinationSchema.safeParse({ ...destination, names: { en: 'Lisbon' } }).success).toBe(
    false,
  );
});
