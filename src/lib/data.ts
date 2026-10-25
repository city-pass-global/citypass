import { catalog, destinationId, mergePlaces, type Place } from './catalog';
import { configured, createClient } from './supabase/server';
export async function getPlaces(selectedDestinationId = destinationId): Promise<Place[]> {
  if (!configured()) return selectedDestinationId === destinationId ? catalog : [];
  const db = await createClient();
  const { data, error } = await db
    .from('venues')
    .select(
      'id,name,category,description,source_url,participation_status,checked_at,address,phone,email',
    )
    .eq('destination_id', selectedDestinationId)
    .order('name');
  if (error) throw new Error('discovery_unavailable');
  const records = data.map((row) => ({
    ...row,
    description: Object.fromEntries(
      Object.entries(
        row.description && typeof row.description === 'object' && !Array.isArray(row.description)
          ? row.description
          : {},
      ).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    ),
    checked_at: row.checked_at ?? undefined,
    address: row.address ?? undefined,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
  }));
  return selectedDestinationId === destinationId ? mergePlaces(records) : records;
}
export function checked<T>({ data, error }: { data: T | null; error: unknown }): T {
  if (error || data === null) throw new Error('data_unavailable');
  return data;
}

export function localizedText(value: unknown, locale: string): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const text = value as Record<string, unknown>;
  return typeof text[locale] === 'string'
    ? text[locale]
    : typeof text.es === 'string'
      ? text.es
      : '';
}
