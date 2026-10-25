import { z } from 'zod';
export const TESTNET_USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
export function amountToStroops(value: string): bigint {
  if (!/^(0|[1-9][0-9]{0,11})(\.[0-9]{1,7})?$/.test(value)) throw new Error('invalid_amount');
  const [whole, fraction = ''] = value.split('.');
  const result = BigInt(whole) * 10000000n + BigInt(fraction.padEnd(7, '0'));
  if (result <= 0n || result > 9223372036854775807n) throw new Error('invalid_amount');
  return result;
}
export const amountSchema = z
  .string()
  .trim()
  .max(20)
  .refine((value) => {
    try {
      amountToStroops(value);
      return true;
    } catch {
      return false;
    }
  });
const address = z.string().regex(/^G[A-Z2-7]{55}$/);
export const checkoutSchema = z.object({
  merchant_service_id: z.uuid().nullable().optional(),
  payout_source: z.enum(['merchant', 'citypass']).optional(),
  id: z.uuid(),
  organization_id: z.uuid(),
  destination_id: z.uuid(),
  merchant_name: z.string(),
  product: z.string(),
  amount: amountSchema,
  network: z.literal('testnet'),
  asset_code: z.literal('USDC'),
  asset_issuer: z.literal(TESTNET_USDC_ISSUER),
  payout_address: address,
  nonce: z.string().regex(/^[a-f0-9]{64}$/),
  payer_address: address.nullable(),
  status: z.enum(['created', 'prepared', 'submitted', 'confirmed', 'failed', 'expired']),
  transaction_hash: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .nullable(),
  created_at: z.string(),
  expires_at: z.string(),
  confirmed_at: z.string().nullable(),
  destination_names: z.record(z.string(), z.string()),
  receipt: z
    .object({
      request_id: z.uuid(),
      transaction_hash: z.string(),
      network: z.literal('testnet'),
      ledger: z.number().int().positive(),
      closed_at: z.string(),
    })
    .nullable(),
});
export type Checkout = z.infer<typeof checkoutSchema>;
export const merchantSchemas = {
  checkin: z.object({
    organization_id: z.uuid(),
    command_id: z.uuid(),
    venue_name: z.string().trim().min(2).max(120),
    stamp_name: z.string().trim().min(2).max(120),
  }),
  onboard: z.object({ name: z.string().trim().min(2).max(120), destination_id: z.uuid() }),
  payout: z.object({ organization_id: z.uuid() }),
  create: z.object({
    organization_id: z.uuid(),
    product: z.string().trim().min(1).max(180),
    amount: amountSchema,
    idempotency_key: z.uuid(),
  }),
};
export function checkoutIdFromQr(value: string, origin: string): string | null {
  try {
    const url = new URL(value);
    const base = new URL(origin);
    if (
      url.origin !== base.origin ||
      (url.protocol !== 'https:' &&
        !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))
    )
      return null;
    const match = url.pathname.match(/^\/(es|en|pt)\/checkout\/([a-f0-9-]+)$/);
    if (!match || url.search || url.hash || !z.uuid().safeParse(match[2]).success) return null;
    return match[2];
  } catch {
    return null;
  }
}
