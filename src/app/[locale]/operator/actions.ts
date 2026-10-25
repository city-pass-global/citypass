'use server';
import { revalidatePath } from 'next/cache';
import { createClient, session } from '@/lib/supabase/server';
import { experienceSchemas } from '@/lib/experiences/validation';
export type ExperienceResult = { error?: string; id?: string };
export async function experienceAction(
  locale: string,
  action: keyof typeof experienceSchemas,
  _previous: ExperienceResult,
  form: FormData,
): Promise<ExperienceResult> {
  if (!['es', 'en', 'pt'].includes(locale) || !Object.hasOwn(experienceSchemas, action))
    return { error: 'invalid' };
  const values = Object.fromEntries(form);
  const input =
    action === 'create' || action === 'save'
      ? {
          ...values,
          titles: { es: values.title_es, en: values.title_en, pt: values.title_pt },
          descriptions: {
            es: values.description_es,
            en: values.description_en,
            pt: values.description_pt,
          },
        }
      : values;
  const parsed = experienceSchemas[action].safeParse(input);
  if (!parsed.success) return { error: 'invalid' };
  try {
    if (!(await session())) return { error: 'unauthorized' };
    const db = await createClient();
    const { data, error } = await db.rpc('experience_command', { action, payload: parsed.data });
    if (error || !data || typeof data !== 'object' || Array.isArray(data))
      return { error: 'unavailable' };
    if (typeof data.error === 'string') return { error: data.error };
    if (typeof data.id !== 'string') return { error: 'unavailable' };
    revalidatePath('/[locale]/operator', 'page');
    revalidatePath('/[locale]/operator/[id]', 'page');
    revalidatePath('/[locale]/destinations/[slug]', 'page');
    revalidatePath('/[locale]/experiences/[id]', 'page');
    return { id: data.id };
  } catch {
    return { error: 'unavailable' };
  }
}
