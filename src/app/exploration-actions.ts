'use server';
import { revalidatePath } from 'next/cache';
import { createClient, configured, session } from '@/lib/supabase/server';
import { explorationSchema } from '@/lib/exploration';
import type { ActionResult } from './actions';

export async function claimExploration(
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const input = explorationSchema.safeParse(Object.fromEntries(form));
  if (!input.success) return { error: 'invalid' };
  if (!configured()) return { error: 'not_configured' };
  try {
    if (!(await session())) return { error: 'unauthorized' };
    const db = await createClient();
    const { data, error } = await db.rpc('claim_exploration', input.data);
    if (error || !data || typeof data !== 'object' || Array.isArray(data))
      return { error: 'unavailable' };
    if (data.error === 'already_claimed') {
      revalidatePath('/[locale]', 'layout');
      return { success: true };
    }
    if (typeof data.error === 'string') return { error: data.error };
    if (typeof data.id !== 'string') return { error: 'unavailable' };
    revalidatePath('/[locale]', 'layout');
    return { success: true };
  } catch {
    return { error: 'unavailable' };
  }
}
