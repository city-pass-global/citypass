import type { PlaceArtKind } from '@/components/destination-place-art';
import { z } from 'zod';

export const guideCategories = ['culture', 'nature', 'food', 'adventure', 'wellbeing'] as const;
export type GuideCategory = (typeof guideCategories)[number];
export type DestinationGuide = {
  checkedAt: string;
  items: { id: string; category: GuideCategory; sourceUrl: string; art: PlaceArtKind }[];
};
// Editorial discovery metadata only. All visible copy lives in messages/{locale}.json.
const guides: Record<string, DestinationGuide> = {
  'buenos-aires': {
    checkedAt: '2026-10-16',
    items: [
      {
        id: 'sanTelmo',
        category: 'culture',
        sourceUrl: 'https://visitbue.com/san-telmo/',
        art: 'market',
      },
      {
        id: 'palermo',
        category: 'nature',
        sourceUrl: 'https://visitbue.com/palermo/',
        art: 'garden',
      },
      {
        id: 'colon',
        category: 'culture',
        sourceUrl: 'https://visitbue.com/teatro-colon/',
        art: 'theatre',
      },
      {
        id: 'laBoca',
        category: 'culture',
        sourceUrl: 'https://visitbue.com/la-boca/',
        art: 'street',
      },
      {
        id: 'ateneo',
        category: 'culture',
        art: 'books',
        sourceUrl: 'https://visitbue.com/libreria-el-ateneo-grand-splendid/',
      },
      {
        id: 'rosedal',
        category: 'nature',
        art: 'garden',
        sourceUrl: 'https://visitbue.com/rosedal-de-palermo-imperdible-vista/',
      },
    ],
  },
  lisbon: {
    checkedAt: '2026-10-16',
    items: [
      {
        id: 'alfama',
        category: 'culture',
        sourceUrl: 'https://www.visitlisboa.com/en/places/alfama',
        art: 'street',
      },
      {
        id: 'belem',
        category: 'culture',
        sourceUrl: 'https://www.visitlisboa.com/en/regions/belem',
        art: 'monastery',
      },
      {
        id: 'santaLuzia',
        category: 'nature',
        sourceUrl: 'https://www.visitlisboa.com/pt-pt/locais/miradouro-de-santa-luzia',
        art: 'viewpoint',
      },
      {
        id: 'fado',
        category: 'culture',
        sourceUrl: 'https://www.visitlisboa.com/en/places/alfama',
        art: 'fado',
      },
      {
        id: 'jeronimos',
        category: 'culture',
        art: 'monastery',
        sourceUrl: 'https://www.visitlisboa.com/en/places/jeronimos-monastery',
      },
      {
        id: 'oceanario',
        category: 'nature',
        art: 'aquarium',
        sourceUrl: 'https://www.visitlisboa.com/en/places/oceanario-de-lisboa',
      },
    ],
  },
  'san-jose': {
    checkedAt: '2026-10-16',
    items: [
      {
        id: 'theatre',
        category: 'culture',
        sourceUrl: 'https://es.visitcostarica.com/where-to-go/central-valley',
        art: 'theatre',
      },
      {
        id: 'jade',
        category: 'culture',
        sourceUrl: 'https://es.visitcostarica.com/where-to-go/central-valley',
        art: 'jade',
      },
      {
        id: 'national',
        category: 'culture',
        sourceUrl: 'https://es.visitcostarica.com/where-to-go/central-valley',
        art: 'museum',
      },
      {
        id: 'gold',
        category: 'culture',
        sourceUrl: 'https://es.visitcostarica.com/where-to-go/central-valley',
        art: 'gold',
      },
      {
        id: 'children',
        category: 'culture',
        art: 'museum',
        sourceUrl:
          'https://es.visitcostarica.com/where-to-go/central-valley/tourist-atractions-in-central-valley',
      },
      {
        id: 'musicTemple',
        category: 'culture',
        art: 'theatre',
        sourceUrl:
          'https://es.visitcostarica.com/where-to-go/central-valley/tourist-atractions-in-central-valley',
      },
    ],
  },
  'la-fortuna': {
    checkedAt: '2026-10-16',
    items: [
      {
        id: 'arenal',
        category: 'nature',
        sourceUrl: 'https://es.visitcostarica.com/where-to-go/northern-plains',
        art: 'volcano',
      },
      {
        id: 'waterfall',
        category: 'nature',
        sourceUrl: 'https://es.visitcostarica.com/where-to-go/northern-plains',
        art: 'waterfall',
      },
      {
        id: 'springs',
        category: 'wellbeing',
        sourceUrl: 'https://es.visitcostarica.com/where-to-go/northern-plains',
        art: 'springs',
      },
      {
        id: 'lake',
        category: 'adventure',
        sourceUrl: 'https://es.visitcostarica.com/where-to-go/northern-plains',
        art: 'lake',
      },
      {
        id: 'mistico',
        category: 'adventure',
        art: 'bridge',
        sourceUrl: 'https://es.visitcostarica.com/planning-your-trip/other-activities/mistico-park',
      },
      {
        id: 'venado',
        category: 'adventure',
        art: 'cave',
        sourceUrl:
          'https://es.visitcostarica.com/where-to-go/northern-plains/tourist-attractions-in-northern-plains',
      },
    ],
  },
  'rio-de-janeiro': {
    checkedAt: '2026-10-16',
    items: [
      {
        id: 'coast',
        category: 'nature',
        sourceUrl: 'https://www.visitbrasil.com/en/location/rio-de-janeiro-en/',
        art: 'coast',
      },
      {
        id: 'tijuca',
        category: 'nature',
        sourceUrl: 'https://www.visitbrasil.com/en/location/rio-de-janeiro-en/',
        art: 'forest',
      },
      {
        id: 'selaron',
        category: 'culture',
        sourceUrl: 'https://www.visitbrasil.com/en/location/rio-de-janeiro-en/',
        art: 'steps',
      },
      {
        id: 'port',
        category: 'culture',
        sourceUrl: 'https://www.visitbrasil.com/en/location/rio-de-janeiro-en/',
        art: 'port',
      },
    ],
  },
  'sao-paulo': {
    checkedAt: '2026-10-16',
    items: [
      {
        id: 'ibirapuera',
        category: 'nature',
        sourceUrl: 'https://www.visitbrasil.com/en/location/sao-paulo',
        art: 'garden',
      },
      {
        id: 'masp',
        category: 'culture',
        sourceUrl: 'https://www.visitbrasil.com/en/location/sao-paulo',
        art: 'masp',
      },
      {
        id: 'pinacoteca',
        category: 'culture',
        sourceUrl: 'https://www.visitbrasil.com/en/location/sao-paulo',
        art: 'museum',
      },
      {
        id: 'market',
        category: 'food',
        sourceUrl: 'https://www.visitbrasil.com/en/location/sao-paulo',
        art: 'market',
      },
    ],
  },
  porto: {
    checkedAt: '2026-10-16',
    items: [
      {
        id: 'ribeira',
        category: 'culture',
        sourceUrl: 'https://visitporto.travel/en-GB/districts/historic',
        art: 'bridge',
      },
      {
        id: 'saoBento',
        category: 'culture',
        sourceUrl: 'https://visitporto.travel/en-GB/districts/historic',
        art: 'station',
      },
      {
        id: 'clerigos',
        category: 'culture',
        sourceUrl: 'https://visitporto.travel/en-GB/districts/historic',
        art: 'tower',
      },
      {
        id: 'serralves',
        category: 'nature',
        sourceUrl: 'https://visitporto.travel/pt-PT/poi/603fb2bc9296f5000170ea9c',
        art: 'garden',
      },
    ],
  },
};
export function getDestinationGuide(slug: string): DestinationGuide | undefined {
  return Object.hasOwn(guides, slug) ? guides[slug] : undefined;
}

const filtersSchema = z.object({
  q: z.string().trim().max(120).catch('').optional(),
});
export function parseGuideFilters(input: { category?: unknown; q?: unknown }) {
  // Invalid/unknown categories reset to all rather than silently selecting an interest.
  const category = z.enum(guideCategories).safeParse(input.category);
  const parsed = filtersSchema.parse({ q: input.q });
  return { category: category.success ? category.data : '', q: parsed.q ?? '' };
}
export function matchesGuideQuery(query: string, ...text: string[]) {
  const normalize = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  return normalize(text.join(' ')).includes(normalize(query));
}
