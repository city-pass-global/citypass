import { z } from 'zod';
const localized = z.object({
  es: z.string().min(2).max(3000),
  en: z.string().min(2).max(3000),
  pt: z.string().min(2).max(3000),
});
export const passOfferSchema = z.object({
  id: z.uuid(),
  destination_id: z.uuid(),
  organization_id: z.uuid(),
  names: localized,
  benefits: localized,
  amount: z.literal('100'),
  reputation_points: z.literal(80),
  published: z.literal(true),
});
export const passAccountSchema = z.object({
  active: z.boolean(),
  purchases: z
    .array(
      z.object({
        request_id: z.uuid(),
        destination_id: z.uuid(),
        product: z.string(),
        amount: z.literal('100'),
        network: z.literal('testnet'),
        created_at: z.string(),
        status: z.enum(['created', 'prepared', 'submitted', 'confirmed', 'failed', 'expired']),
        transaction_hash: z
          .string()
          .regex(/^[a-f0-9]{64}$/)
          .nullable(),
        ledger: z.number().int().positive().nullable(),
      }),
    )
    .max(20),
  holdings: z.array(
    z.object({
      id: z.uuid(),
      destination_id: z.uuid(),
      request_id: z.uuid(),
      acquired_at: z.string(),
    }),
  ),
  reputation: z.number().int().nonnegative(),
});
export const passPurchaseSchema = z.object({ offer_id: z.uuid() });
export function reputationTier(points: number): 'basic' | 'mid' | 'top' {
  return points >= 240 ? 'top' : points >= 80 ? 'mid' : 'basic';
}
