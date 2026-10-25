'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { configured, createClient, session } from '@/lib/supabase/server';
import { serviceSchemas } from '@/lib/payments/services';
import { walletConfiguration } from '@/lib/wallet/server';
import { safeLocale } from '@/lib/validation';
import type { ActionResult } from './actions';

export async function serviceAction(
  locale: string,
  command: keyof typeof serviceSchemas,
  _state: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  if (!Object.hasOwn(serviceSchemas, command)) return { error: 'invalid' };
  const parsed = serviceSchemas[command].safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: 'invalid' };
  if (!configured()) return { error: 'unavailable' };
  let requestId: string | null = null;
  try {
    if (!(await session())) return { error: 'unauthorized' };
    if (walletConfiguration()?.network !== 'testnet') return { error: 'testnet_only' };
    const db = await createClient();
    const { data, error } = await db.rpc('merchant_service_command', {
      action: command,
      payload: parsed.data,
    });
    if (error || !data || typeof data !== 'object' || Array.isArray(data))
      return { error: 'unavailable' };
    if (typeof data.error === 'string') return { error: data.error };
    if (typeof data.id !== 'string') return { error: 'unavailable' };
    if (command === 'buy') requestId = data.id;
    revalidatePath('/[locale]', 'layout');
  } catch {
    return { error: 'unavailable' };
  }
  if (requestId) redirect(`/${safeLocale(locale)}/checkout/${requestId}`);
  return { success: true };
}
