import { StrKey } from '@stellar/stellar-sdk';
import { z } from 'zod';
import { checkoutSchema } from '@/lib/payments/validation';
export const agentAuthorizationSchema = z.object({
  offer_id: z.uuid(),
  command_id: z.uuid(),
  agent_wallet: z.string().trim().refine(StrKey.isValidEd25519PublicKey),
});
export const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const paymentSchema = z.object({
  x402Version: z.literal(2),
  resource: z
    .object({
      url: z.string().url(),
      description: z.string().optional(),
      mimeType: z.string().optional(),
    })
    .optional(),
  accepted: z.object({
    scheme: z.literal('exact'),
    network: z.literal('stellar:testnet'),
    asset: z.string(),
    amount: z.string(),
    payTo: z.string(),
    maxTimeoutSeconds: z.number().int().positive().max(60),
    extra: z.record(z.string(), z.unknown()).default({}),
  }),
  payload: z.object({ transaction: z.string().min(1).max(32768) }),
});
export const orderSchema = z.object({
  checkout: checkoutSchema,
  state: z.enum(['authorized', 'settling', 'settled', 'confirmed', 'revoked']),
  beneficiary_wallet: z.string().optional(),
  payment_payload: paymentSchema.nullable().optional(),
});
export type AgentOrder = z.infer<typeof orderSchema>;
