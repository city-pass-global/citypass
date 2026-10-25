'use server';
import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient, configured, session } from '@/lib/supabase/server';
import {
  commandSchemas,
  guestSchema,
  safeLocale,
  type Command,
  type GuestInput,
} from '@/lib/validation';
export type ActionResult = { error?: string; success?: boolean; url?: string };
const origin = () => {
  const value = process.env.APP_ORIGIN;
  if (!value) throw new Error('not_configured');
  return new URL(value).origin;
};
export async function execute(
  locale: string,
  action: Command,
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  if (!configured()) return { error: 'not_configured' };
  if (!Object.hasOwn(commandSchemas, action)) return { error: 'invalid' };
  const schema = commandSchemas[action];
  if (!schema) return { error: 'invalid' };
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: 'invalid' };
  try {
    const db = await createClient();
    const user = await session();
    if (!user) return { error: 'unauthorized' };
    const token =
      action === 'issue_invitation' || action === 'issue_qr'
        ? randomBytes(32).toString('hex')
        : undefined;
    const base = token ? origin() : null;
    const { data, error } = await db.rpc('passport_command', {
      action,
      payload: { ...parsed.data, ...(token ? { token } : {}) },
    });
    if (error) return { error: error.code === '23505' ? 'duplicate' : 'unavailable' };
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { error: 'unavailable' };
    if (typeof data.error === 'string') return { error: data.error };
    if (data.ok !== true && typeof data.id !== 'string') return { error: 'unavailable' };
    revalidatePath('/[locale]', 'layout');
    return {
      success: true,
      ...(token
        ? {
            url: `${base}/${safeLocale(locale)}/${action === 'issue_invitation' ? 'precheckin' : 'claim'}#token=${token}`,
          }
        : {}),
    };
  } catch {
    return { error: 'unavailable' };
  }
}
export async function submitGuest(input: GuestInput): Promise<ActionResult> {
  if (!configured()) return { error: 'not_configured' };
  const parsed = guestSchema.safeParse(input);
  if (!parsed.success) return { error: 'invalid' };
  try {
    const db = await createClient();
    const { data, error } = await db.rpc('passport_command', {
      action: 'submit_precheckin',
      payload: parsed.data,
    });
    if (error) return { error: 'unavailable' };
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { error: 'unavailable' };
    if (typeof data.error === 'string') return { error: data.error };
    if (data.ok !== true && typeof data.id !== 'string') return { error: 'unavailable' };
    return { success: true };
  } catch {
    return { error: 'unavailable' };
  }
}
export async function signOut(locale: string) {
  const { closePollarSession } = await import('./pollar-actions');
  await closePollarSession();
  redirect(`/${safeLocale(locale)}/profile`);
}
