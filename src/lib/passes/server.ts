import 'server-only';
import { cache } from 'react';
import { z } from 'zod';
import { configured, createClient, session } from '@/lib/supabase/server';
import { passOfferSchema, passAccountSchema } from './validation';
export async function passCommand(action: string, payload: Record<string, string>) {
  const db = await createClient();
  const { data, error } = await db.rpc('destination_pass_command', { action, payload });
  if (error || !data || typeof data !== 'object' || Array.isArray(data))
    throw new Error('unavailable');
  if (typeof data.error === 'string') throw new Error(data.error);
  return data;
}
export async function getDestinationPasses(destination: string) {
  if (!configured()) return { offers: [], unavailable: false };
  try {
    return {
      offers: z
        .array(passOfferSchema)
        .parse(
          (await passCommand('catalog', { destination_id: z.uuid().parse(destination) })).offers,
        ),
      unavailable: false,
    };
  } catch {
    return { offers: [], unavailable: true };
  }
}
export const getPassAccount = cache(async () => {
  if (!(await session())) return null;
  try {
    return passAccountSchema.parse(await passCommand('account', {}));
  } catch {
    return null;
  }
});
