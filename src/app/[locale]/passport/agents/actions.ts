'use server';
import { randomBytes } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { agentAuthorizationSchema } from '@/lib/x402/validation';
import { agentResource, tokenHash, x402Enabled } from '@/lib/x402/server';
import { z } from 'zod';
export type AuthorizationResult = { error?: string; token?: string; url?: string; id?: string };
export async function authorizeAgent(
  _previous: AuthorizationResult,
  form: FormData,
): Promise<AuthorizationResult> {
  if (!x402Enabled()) return { error: 'unavailable' };
  const parsed = agentAuthorizationSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success || form.get('consent') !== 'on') return { error: 'invalid' };
  try {
    const token = randomBytes(32).toString('hex');
    const { data, error } = await (
      await createClient()
    ).rpc('x402_order_command', {
      action: 'authorize',
      payload: { ...parsed.data, token_hash: tokenHash(token) },
    });
    if (error || !data || typeof data !== 'object' || Array.isArray(data))
      return { error: 'unavailable' };
    if (typeof data.error === 'string') return { error: data.error };
    const id = z.uuid().parse(data.id);
    return { token, id, url: agentResource(id) };
  } catch {
    return { error: 'unavailable' };
  }
}
export async function revokeAgent(
  _previous: { error?: string; success?: boolean },
  form: FormData,
) {
  const parsed = z.uuid().safeParse(form.get('request_id'));
  if (!parsed.success) return { error: 'invalid' };
  try {
    const { data, error } = await (
      await createClient()
    ).rpc('x402_order_command', { action: 'revoke', payload: { request_id: parsed.data } });
    if (error || !data || typeof data !== 'object' || Array.isArray(data))
      return { error: 'unavailable' };
    if (typeof data.error === 'string') return { error: data.error };
    return { success: true };
  } catch {
    return { error: 'unavailable' };
  }
}
