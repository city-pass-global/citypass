import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { getDestinationDirectory } from '@/lib/destinations';
import { destinationSlugSchema } from '@/lib/destination-validation';
export const DESTINATION_COOKIE = 'citypassport_destination';
export const getSelectedDestination = cache(async () => {
  const [directory, jar] = await Promise.all([getDestinationDirectory(), cookies()]);
  if (!directory) return null;
  const slug = destinationSlugSchema.safeParse(jar.get(DESTINATION_COOKIE)?.value);
  return (
    directory.destinations.find((d) => slug.success && d.slug === slug.data) ??
    directory.destinations.find((d) => d.slug === 'puerto-iguazu') ??
    directory.destinations[0] ??
    null
  );
});
