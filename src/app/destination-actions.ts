'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDestinationDirectory } from '@/lib/destinations';
import {
  countrySelectionSchema,
  destinationSelectionSchema,
} from '@/lib/destination-context/validation';
import { DESTINATION_COOKIE } from '@/lib/destination-context/server';
import { safeLocale } from '@/lib/validation';
export async function selectDestination(locale: string, form: FormData) {
  const language = safeLocale(locale);
  const parsed = destinationSelectionSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect(`/${language}/destinations?error=selection`);
  let directory;
  try {
    directory = await getDestinationDirectory();
  } catch {
    redirect(`/${language}/destinations?error=unavailable`);
  }
  if (!directory?.destinations.some((d) => d.slug === parsed.data.slug))
    redirect(`/${language}/destinations?error=selection`);
  (await cookies()).set(DESTINATION_COOKIE, parsed.data.slug, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.APP_ORIGIN?.startsWith('https:') ?? false,
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect(`/${language}/explore`);
}

export async function selectCountry(locale: string, form: FormData) {
  const language = safeLocale(locale);
  const parsed = countrySelectionSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect(`/${language}/destinations?error=selection`);
  let directory;
  try {
    directory = await getDestinationDirectory();
  } catch {
    redirect(`/${language}/destinations?error=unavailable`);
  }
  const country = directory?.countries.find((item) => item.code === parsed.data.country);
  const jar = await cookies();
  const current = jar.get(DESTINATION_COOKIE)?.value;
  const cities =
    directory?.destinations.filter((item) => item.country_code === country?.code) ?? [];
  const destination = cities.find((item) => item.slug === current) ?? cities[0];
  if (!country || !destination) redirect(`/${language}/destinations?error=selection`);
  jar.set(DESTINATION_COOKIE, destination.slug, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.APP_ORIGIN?.startsWith('https:') ?? false,
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect(`/${language}/destinations/${country.code.toLowerCase()}`);
}
