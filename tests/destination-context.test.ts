import { describe, expect, it } from 'vitest';
import { destinationSelectionSchema, localeHref } from '../src/lib/destination-context/validation';
describe('destination navigation boundaries', () => {
  it('accepts bounded registry slugs and rejects URLs, script text and oversized values', () => {
    expect(destinationSelectionSchema.parse({ slug: 'puerto-iguazu' }).slug).toBe('puerto-iguazu');
    for (const slug of [
      'https://example.com',
      '../lisbon',
      '<script>',
      'A'.repeat(81),
      'lisbon?token=secret',
      '',
    ])
      expect(destinationSelectionSchema.safeParse({ slug }).success).toBe(false);
  });
  it('changes locale without losing a destination or checkout path', () => {
    expect(localeHref('/es/destinations/lisbon', '', 'pt')).toBe('/pt/destinations/lisbon');
    expect(localeHref('/en/checkout/a1000000-0000-4000-8000-000000000001', '', 'es')).toBe(
      '/es/checkout/a1000000-0000-4000-8000-000000000001',
    );
    expect(localeHref('//example.com', '', 'pt')).toBe('/pt');
    expect(() => localeHref('/es', '', 'invalid')).toThrow('invalid_locale');
  });
  it('preserves public filters without propagating credential parameters', () => {
    expect(
      localeHref(
        '/es/routes',
        'route=wildlife&token=secret&code=private&next=https%3A%2F%2Fexample.com',
        'en',
      ),
    ).toBe('/en/routes?route=wildlife');
    expect(localeHref('/es', 'q=birds&category=nature', 'pt')).toBe('/pt?q=birds&category=nature');
    expect(localeHref('/es', `q=${'a'.repeat(121)}`, 'en')).toBe('/en');
  });
});
