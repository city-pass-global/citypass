import 'server-only';
import type { Json } from '@/lib/supabase/database.types';
import { createClient } from '@/lib/supabase/server';
export async function inquiryRead(
  action: 'mine' | 'queue' | 'context' | 'detail',
  payload: Json = {},
) {
  const db = await createClient();
  const { data, error } = await db.rpc('inquiry_command', { action, payload });
  if (error || !data || typeof data !== 'object' || Array.isArray(data))
    throw new Error('unavailable');
  if (typeof data.error === 'string') throw new Error(data.error);
  return data;
}
