import 'server-only';
import { createClient, session } from '@/lib/supabase/server';
import { activityConfig, readChainActivity } from './chain';
import { walletAddressSchema } from './validation';
import { z } from 'zod';
export type PassportChainState = {
  activity: Awaited<ReturnType<typeof readChainActivity>>;
  pending: number;
  failed: number;
  unavailable: boolean;
  contractId: string | null;
  recent: {
    id: string;
    kind: 0 | 1 | 2 | 4 | 5;
    request_id: string | null;
    state: 'pending' | 'confirmed';
    transaction_hash: string | null;
    confirmed_at: string | null;
    created_at: string;
  }[];
};
export async function getPassportChainState(): Promise<PassportChainState | null> {
  const user = await session();
  if (!user) return null;
  let contractId: string | null = null;
  try {
    if (user.network !== 'testnet') throw new Error('wrong_network');
    const wallet = walletAddressSchema.parse(user.wallet_address);
    contractId = activityConfig().contractId;
    const db = await createClient();
    const [activity, status] = await Promise.all([
      readChainActivity(wallet),
      db.rpc('passport_activity_status', { contract_id: contractId }),
    ]);
    if (status.error) throw new Error('unavailable');
    const counts = z
      .object({
        pending: z.number().int().nonnegative(),
        failed: z.number().int().nonnegative(),
        recent: z
          .array(
            z.object({
              id: z.uuid(),
              kind: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(4), z.literal(5)]),
              request_id: z.uuid().nullable(),
              state: z.enum(['pending', 'confirmed']),
              transaction_hash: z
                .string()
                .regex(/^[a-f0-9]{64}$/)
                .nullable(),
              confirmed_at: z.string().nullable(),
              created_at: z.string(),
            }),
          )
          .default([]),
      })
      .parse(status.data);
    return { activity, ...counts, unavailable: false, contractId };
  } catch {
    return { activity: null, pending: 0, failed: 0, unavailable: true, contractId, recent: [] };
  }
}
