import { it, expect } from 'vitest';
import { getItinerary, itineraries } from '../src/lib/itineraries';
it('resolves every suggested stop to an attributed unpartnered catalog entry', () => {
  for (const itinerary of itineraries) {
    const result = getItinerary(itinerary.id);
    expect(result.stops).toHaveLength(itinerary.stopIds.length);
    expect(new Set(result.stops.map(s => s.id)).size).toBe(result.stops.length);
    for (const stop of result.stops) {
      expect(stop.source_url).toMatch(/^https:\/\/visitiguazu.travel\/atractivos\//);
      expect(stop.participation_status).toBe('listed');
    }
  }
});
it('falls back safely for unknown route ids', () => {
  expect(getItinerary('https://example.com').id).toBe('falls');
  expect(getItinerary().stops).toHaveLength(3);
});
