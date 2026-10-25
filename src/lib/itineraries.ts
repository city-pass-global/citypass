import { catalog } from './catalog';
export const itineraries = [
  {
    id: 'falls',
    stopIds: [
      '20000000-0000-4000-8000-000000000002',
      '20000000-0000-4000-8000-000000000003',
      '20000000-0000-4000-8000-000000000001',
    ],
  },
  { id: 'wildlife', stopIds: ['visit-jardin-picaflores', 'visit-guira-oga'] },
  { id: 'roots', stopIds: ['visit-cultura-guarani', 'visit-2000-horizontes'] },
  { id: 'adventure', stopIds: ['visit-tirolesa-cabalgatas', 'visit-salto-mbocay'] },
] as const;
export function getItinerary(id?: string) {
  const route = itineraries.find((route) => route.id === id) ?? itineraries[0];
  return {
    ...route,
    stops: route.stopIds.map((id) => {
      const stop = catalog.find((place) => place.id === id);
      if (!stop) throw new Error(`Missing itinerary stop: ${id}`);
      return stop;
    }),
  };
}
