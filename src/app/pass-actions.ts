'use server';
import { z } from 'zod';
import { session } from '@/lib/supabase/server';
import { passCommand } from '@/lib/passes/server';
import { passPurchaseSchema } from '@/lib/passes/validation';
import { walletConfiguration } from '@/lib/wallet/server';
import { redirect } from 'next/navigation';
export async function purchaseDestinationPass(
  _previous: { error?: string; id?: string },
  form: FormData,
): Promise<{ error?: string; id?: string }> {
  let id: string;
  const locale = z.enum(['es', 'en', 'pt']).catch('es').parse(form.get('locale'));
  try {
    const parsed = passPurchaseSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { error: 'invalid' };
    if (!(await session())) return { error: 'unauthorized' };
    if (walletConfiguration()?.network !== 'testnet') return { error: 'unavailable' };
    const result = await passCommand('purchase', parsed.data);
    id = z.uuid().parse(result.id);
  } catch (error) {
    const allowed = ['activate_first', 'already_owned', 'purchase_pending', 'wallet_required', 'self_payment'];
    return {
      error:
        error instanceof Error && allowed.includes(error.message) ? error.message : 'unavailable',
    };
  }
  redirect(`/${locale}/checkout/${id}`);
}
