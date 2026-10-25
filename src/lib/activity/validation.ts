import { createHmac } from 'node:crypto';
import { Keypair } from '@stellar/stellar-sdk';
import { z } from 'zod';

export const walletAddressSchema = z.string().refine((value) => {
  try {
    return Keypair.fromPublicKey(value).publicKey() === value;
  } catch {
    return false;
  }
});
export const activitySchema = z.object({
  reputation: z.coerce.bigint().nonnegative().transform(String),
  purchases: z.number().int().nonnegative(),
  stamps: z.number().int().nonnegative(),
  redemptions: z.number().int().nonnegative(),
  exploration_stamps: z.number().int().nonnegative().default(0),
});
export const activitySourceSchema = z.object({
  id: z.uuid(),
  destination_id: z.uuid(),
  subject: z.uuid(),
  kind: z.union([z.literal(1), z.literal(2), z.literal(4), z.literal(5)]),
});
export type ActivitySource = z.infer<typeof activitySourceSchema>;
export type ChainActivity = z.infer<typeof activitySchema>;
export function activityEvidence(source: ActivitySource, wallet: string, key: string) {
  const row = activitySourceSchema.parse(source);
  walletAddressSchema.parse(wallet);
  z.string()
    .regex(/^[a-f0-9]{64}$/)
    .parse(key);
  const hash = (domain: string, value: string) =>
    createHmac('sha256', Buffer.from(key, 'hex'))
      .update(`citypassport-activity-v1\n${domain}\n${value}`)
      .digest();
  return {
    event_id: hash('event', `${row.kind}:${row.id}`),
    record: {
      user: wallet,
      destination: hash('destination', row.destination_id),
      subject: hash(`subject:${row.kind}`, row.subject),
      kind: row.kind,
    },
  };
}
