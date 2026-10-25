import 'server-only';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { createClient as supabase } from '@supabase/supabase-js';
import { HTTPFacilitatorClient } from '@x402/core/server';
import { ExactStellarScheme } from '@x402/stellar/exact/server';
import { USDC_TESTNET_ADDRESS } from '@x402/stellar';
import type { PaymentRequirements } from '@x402/core/types';
import type { Database } from '@/lib/supabase/database.types';
import { bridgeSecret, walletConfiguration } from '@/lib/wallet/server';
import { amountToStroops } from '@/lib/payments/validation';
import { orderSchema, type AgentOrder } from './validation';
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
export function x402Enabled() {
  return process.env.X402_ENABLED === '1' && walletConfiguration()?.network === 'testnet';
}
export function agentResource(id: string) {
  const origin = new URL(process.env.APP_ORIGIN ?? 'http://localhost:3000');
  if (
    origin.protocol !== 'https:' &&
    !(origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname))
  )
    throw new Error('not_configured');
  return new URL(`/api/agent/passes/${id}`, origin).toString();
}
export function facilitator() {
  // Never send an OZ credential to an arbitrary configurable URL.
  const apiKey = process.env.X402_OZ_API_KEY;
  return new HTTPFacilitatorClient({
    url: apiKey
      ? 'https://channels.openzeppelin.com/x402/testnet'
      : 'https://www.x402.org/facilitator',
    timeoutMs: 30000,
    ...(apiKey
      ? {
          createAuthHeaders: async () => {
            const headers = { Authorization: `Bearer ${apiKey}` };
            return { verify: headers, settle: headers, supported: headers };
          },
        }
      : {}),
  });
}
export async function requirements(
  order: AgentOrder,
  client: HTTPFacilitatorClient,
): Promise<PaymentRequirements> {
  const supported = await client.getSupported();
  const kind = supported.kinds.find(
    (k) => k.x402Version === 2 && k.scheme === 'exact' && k.network === 'stellar:testnet',
  );
  if (!kind) throw new Error('unavailable');
  return new ExactStellarScheme().enhancePaymentRequirements(
    {
      scheme: 'exact',
      network: 'stellar:testnet',
      asset: USDC_TESTNET_ADDRESS,
      amount: amountToStroops(order.checkout.amount).toString(),
      payTo: order.checkout.payout_address,
      maxTimeoutSeconds: 60,
      extra: {},
    },
    kind,
    [],
  );
}
export async function agentDelivery(
  action: string,
  id: string,
  token: string,
  extra: Record<string, unknown> = {},
) {
  const payload = JSON.stringify({
    ...extra,
    action,
    request_id: id,
    token_hash: tokenHash(token),
    issued_at: Math.floor(Date.now() / 1000),
    nonce: randomUUID(),
  });
  const mac = createHmac('sha256', Buffer.from(bridgeSecret(), 'hex'))
    .update('citypassport-x402-v1\n' + payload)
    .digest('hex');
  const db = supabase<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await db.rpc('x402_delivery', { payload, mac });
  if (error || !data || typeof data !== 'object' || Array.isArray(data))
    throw new Error('unavailable');
  if (typeof data.error === 'string') throw new Error(data.error);
  return orderSchema.parse(data.order);
}
