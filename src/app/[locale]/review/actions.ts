'use server';
import { revalidatePath } from 'next/cache';
import { createClient, session } from '@/lib/supabase/server';
import { reviewSchema } from '@/lib/review/validation';
export type ReviewResult = { error?: string; success?: boolean };
export async function reviewMerchant(
  locale: string,
  _previous: ReviewResult,
  form: FormData,
): Promise<ReviewResult> {
  if (!['es', 'en', 'pt'].includes(locale)) return { error: 'invalid' };
  const parsed = reviewSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: 'invalid' };
  try {
    if (!(await session())) return { error: 'unauthorized' };
    const db = await createClient();
    const { data, error } = await db.rpc('merchant_review_command', {
      action: 'decide',
      payload: parsed.data,
    });
    if (error || !data || typeof data !== 'object' || Array.isArray(data))
      return { error: 'unavailable' };
    if (typeof data.error === 'string') return { error: data.error };
    if (data.success !== true) return { error: 'unavailable' };
    revalidatePath(`/${locale}/review`);
    revalidatePath(`/${locale}/merchant`);
    return { success: true };
  } catch {
    return { error: 'unavailable' };
  }
}
