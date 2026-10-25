import { expect, it } from 'vitest';
import {
  matchesGuideQuery,
  parseGuideFilters,
  getDestinationGuide,
} from '../src/lib/destination-guides';

it('bounds untrusted search values and ignores invalid interests', () => {
  expect(parseGuideFilters({ category: ['nature'], q: ['secret'] })).toEqual({
    category: '',
    q: '',
  });
  expect(parseGuideFilters({ category: '../culture', q: 'x'.repeat(121) })).toEqual({
    category: '',
    q: '',
  });
  expect(parseGuideFilters({ category: 'nature', q: '  jardín  ' })).toEqual({
    category: 'nature',
    q: 'jardín',
  });
  expect(parseGuideFilters({})).toEqual({ category: '', q: '' });
});
it('matches accents and case across translated titles and descriptions', () => {
  expect(matchesGuideQuery('COLON', 'Conocer el Teatro Colón', 'Arquitectura')).toBe(true);
  expect(matchesGuideQuery('museus', 'Belém', 'Monumentos e museus')).toBe(true);
  expect(matchesGuideQuery('Iguazú', 'Alfama', 'Lisbon')).toBe(false);
});
it('does not inherit prototype properties or reuse another destination guide', () => {
  for (const slug of ['__proto__', 'constructor', 'unknown-city', 'puerto-iguazu']) {
    expect(getDestinationGuide(slug)).toBeUndefined();
  }
});
