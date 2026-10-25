import { describe, it, expect } from 'vitest';
import { catalog, filterPlaces, mergePlaces } from '../src/lib/catalog';

describe('sourced discovery directory', () => {
  it('keeps every editorial entry attributed, localized and unpartnered', () => {
    expect(new Set(catalog.map((p) => p.id)).size).toBe(catalog.length);
    for (const place of catalog) {
      const url = new URL(place.source_url!);
      expect(url.origin).toBe('https://visitiguazu.travel');
      expect(url.pathname).not.toBe('/');
      expect(place.participation_status).toBe('listed');
      expect(place.checked_at).toBeTruthy();
      for (const locale of ['es', 'en', 'pt']) expect(place.description[locale]).toBeTruthy();
      // The municipal footer contacts must never become business contacts.
      expect(place.email).not.toBe('info@iguazuturismo.gob.ar');
      expect(place.phone?.replace(/\D/g, '')).not.toBe('5493757554545');
    }
  });
  it('combines category and accent-insensitive search without losing multilingual descriptions', () => {
    expect(filterPlaces(catalog, 'nature', 'guira')[0].name).toBe('Güirá Oga');
    expect(filterPlaces(catalog, 'agency', 'guira')).toEqual([]);
    expect(filterPlaces(catalog, '', 'hummingbirds')[0].name).toBe('El Jardín de los Picaflores');
    expect(filterPlaces(catalog, 'agency', 'entre rios')[0].name).toBe('Aguas Grandes');
    expect(filterPlaces(catalog, '', 'not-a-real-place')).toEqual([]);
  });
  it('lets verified database records win identity matches without promoting the directory', () => {
    const official = {
      ...catalog[3],
      id: 'database-id',
      name: 'Guira Oga',
      participation_status: 'participating',
    };
    const result = mergePlaces([official]);
    expect(result.filter((p) => /guira/i.test(p.id))).toHaveLength(0);
    expect(result.find((p) => p.id === 'database-id')).toEqual(official);
    expect(result.filter((p) => p.participation_status === 'participating')).toEqual([official]);
    expect(result).toHaveLength(catalog.length);
    expect(catalog.every((p) => p.participation_status === 'listed')).toBe(true);
  });
});
