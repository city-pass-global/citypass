import { describe, expect, it } from 'vitest';
import { passportStampPages, type PassportStamp } from '../src/lib/passport-pages';

describe('verified stamp pages', () => {
  it('does not create stamps or destination pages for an empty collection', () => {
    expect(passportStampPages([])).toEqual([]);
  });
  it('preserves every claim once across destination boundaries and page breaks', () => {
    const stamps: PassportStamp[] = Array.from({ length: 11 }, (_, index) => ({
      id: `claim-${index}`,
      destinationId: index % 3 === 0 ? 'b' : 'a',
      destination: 'Same display name',
      name: `Visit ${index}`,
      date: 'Oct 17, 2026',
    }));
    const pages = passportStampPages(stamps);
    expect(pages.map((page) => page.id)).toEqual(['b-0', 'a-0', 'a-4']);
    expect(pages.map((page) => page.stamps.length)).toEqual([4, 4, 3]);
    expect(pages.flatMap((page) => page.stamps.map((stamp) => stamp.id)).sort()).toEqual(
      stamps.map((stamp) => stamp.id).sort(),
    );
    expect(
      pages
        .filter((page) => page.id.startsWith('a-'))
        .flatMap((page) => page.stamps.map((stamp) => stamp.id)),
    ).toEqual(stamps.filter((stamp) => stamp.destinationId === 'a').map((stamp) => stamp.id));
  });
});
