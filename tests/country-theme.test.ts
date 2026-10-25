import { describe, expect, it } from 'vitest';
import { countryForPath } from '../src/lib/country-theme';
import { countrySelectionSchema } from '../src/lib/destination-context/validation';
const countries = [{ code: 'AR' }, { code: 'PT' }];
const cities = [
  { slug: 'lisbon', country_code: 'PT' },
  { slug: 'puerto-iguazu', country_code: 'AR' },
];
describe('country visual context', () => {
  it('keeps marketing and country selection neutral despite a saved city', () => {
    for (const path of ['/es', '/en/', '/pt/destinations'])
      expect(countryForPath(path, cities, countries, 'PT')).toBeUndefined();
  });
  it('uses explicit country or city paths before the saved context and rejects unknown codes', () => {
    expect(countryForPath('/en/destinations/ar', cities, countries, 'PT')).toBe('AR');
    expect(countryForPath('/pt/destinations/lisbon', cities, countries, 'AR')).toBe('PT');
    expect(countryForPath('/es/destinations/zz', cities, countries, 'AR')).toBeUndefined();
    expect(
      countryForPath('/es/destinations/unknown-city', cities, countries, 'PT'),
    ).toBeUndefined();
    expect(countryForPath('/en/passport', cities, countries, 'PT')).toBe('PT');
  });
  it('accepts only bounded country codes for selection commands', () => {
    expect(countrySelectionSchema.safeParse({ country: 'AR' }).success).toBe(true);
    for (const country of ['ar', '../PT', 'https://example.com', '<script>', '', 'PORTUGAL'])
      expect(countrySelectionSchema.safeParse({ country }).success).toBe(false);
  });
});
