import 'server-only';
import { cache } from 'react';
import { checked } from './data';
import { createClient, session } from './supabase/server';

export const getExplorationClaims = cache(async () => {
  if (!(await session())) return [];
  const db = await createClient();
  return checked(
    await db
      .from('exploration_claims')
      .select('id,destination_id,guide_slug,item_id,claimed_at')
      .order('claimed_at', { ascending: false }),
  );
});
