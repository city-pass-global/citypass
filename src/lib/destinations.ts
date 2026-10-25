import { cache } from 'react';
import { z } from 'zod';
import { configured, createClient } from './supabase/server';

import { countrySchema, destinationSchema } from './destination-validation';
export { destinationSlugSchema } from './destination-validation';
export const getDestinationDirectory = cache(async () => {
  if (!configured()) return null;
  const db = await createClient();
  const [destinations, countries] = await Promise.all([
    db.from('destinations').select('id,slug,name,names,country_code,timezone').order('name'),
    db.from('countries').select('code,names,currency_code').order('code'),
  ]);
  if (destinations.error || countries.error) throw new Error('destinations_unavailable');
  return {
    destinations: z.array(destinationSchema).parse(destinations.data),
    countries: z.array(countrySchema).parse(countries.data),
  };
});
