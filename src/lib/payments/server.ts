import 'server-only';
import { createHmac } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { bridgeSecret } from '@/lib/wallet/server';
import { checkoutSchema, type Checkout } from './validation';
export async function readCheckout(
  id: string,
  action: 'resolve' | 'prepare' | 'attempt' = 'resolve',
) {
  const db = await createClient();
  const { data, error } = await db.rpc('checkout_command', { action, payload: { request_id: id } });
  if (error || !data || typeof data !== 'object' || Array.isArray(data))
    throw new Error('unavailable');
  if (typeof data.error === 'string') throw new Error(data.error);
  const checkout = checkoutSchema.parse(data.checkout);
  return { checkout, attempt: data.attempt };
}
export async function recordEvidence(evidence: Record<string, unknown>) {
  const payload = JSON.stringify(evidence);
  const mac = createHmac('sha256', Buffer.from(bridgeSecret(), 'hex'))
    .update('citypassport-payment-evidence-v1\n' + payload)
    .digest('hex');
  const db = await createClient();
  const { data, error } = await db.rpc('record_checkout_evidence', { payload, mac });
  if (error || !data || typeof data !== 'object' || Array.isArray(data))
    throw new Error('unavailable');
  if (typeof data.error === 'string') throw new Error(data.error);
  return data;
}
export type { Checkout };
