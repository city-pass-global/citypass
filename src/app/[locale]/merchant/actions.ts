'use server';
import { revalidatePath } from 'next/cache';
import { createClient, session } from '@/lib/supabase/server';
import { merchantSchemas } from '@/lib/payments/validation';
import { walletConfiguration } from '@/lib/wallet/server';
import { safeLocale } from '@/lib/validation';
export type MerchantResult = { error?: string; success?: boolean; url?: string };
export async function merchantAction(
  locale: string,
  action: keyof typeof merchantSchemas,
  _previous: MerchantResult,
  form: FormData,
): Promise<MerchantResult> {
  try {
    const origin = new URL(process.env.APP_ORIGIN!);
    if (
      origin.protocol !== 'https:' &&
      !(origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname))
    )
      return { error: 'unavailable' };
    if (walletConfiguration()?.network !== 'testnet') return { error: 'testnet_only' };
    if (!Object.hasOwn(merchantSchemas, action)) return { error: 'invalid' };
    const parsed = merchantSchemas[action].safeParse(Object.fromEntries(form));
    if (!parsed.success) return { error: 'invalid' };
    if (!(await session())) return { error: 'unauthorized' };
    const db = await createClient();
    const { data, error } = action === 'checkin'
      ? await db.rpc('merchant_checkin_command', { payload: parsed.data })
      : await db.rpc('checkout_command', { action, payload: parsed.data });
    if (error || !data || typeof data !== 'object' || Array.isArray(data))
      return { error: 'unavailable' };
    if (typeof data.error === 'string') return { error: data.error };
    if (typeof data.id !== 'string') return { error: 'unavailable' };
    revalidatePath('/[locale]/merchant', 'page');
    return {
      success: true,
      ...(action === 'create'
        ? {
            url: `${origin.origin}/${safeLocale(locale)}/checkout/${data.id}`,
          }
        : {}),
    };
  } catch {
    return { error: 'unavailable' };
  }
}
