import 'server-only';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { activityConfig, deliverActivity, registerPassport } from './chain';
import { walletAddressSchema } from './validation';
import type { Database } from '@/lib/supabase/database.types';
export const activityJobSchema = z.object({
  id: z.uuid(),
  source_id: z.uuid(),
  wallet: walletAddressSchema,
  lease_token: z.uuid(),
  kind: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(4), z.literal(5)]),
  destination_id: z.uuid().nullable(),
  subject: z.uuid().nullable(),
});
export async function workerCommand(command: Record<string, unknown>) {
  const key = z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .parse(process.env.POLLAR_SESSION_BRIDGE_KEY);
  const payload = JSON.stringify({
    ...command,
    contract_id: activityConfig().contractId,
    issued: Math.floor(Date.now() / 1000),
    nonce: randomUUID(),
  });
  const mac = createHmac('sha256', Buffer.from(key, 'hex'))
    .update('citypassport-activity-worker-v1\n' + payload)
    .digest('hex');
  const db = createClient<Database>(
    z.url().parse(process.env.NEXT_PUBLIC_SUPABASE_URL),
    z.string().min(1).parse(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await db.rpc('activity_worker_command', { payload, mac });
  if (error) throw new Error('activity_worker_unavailable');
  return z
    .object({
      error: z.string().optional(),
      job: activityJobSchema.nullable().optional(),
      ok: z.boolean().optional(),
    })
    .parse(data);
}
export async function processActivityJob() {
  const claimed = await workerCommand({ action: 'claim' });
  if (claimed.error) throw new Error('activity_worker_unauthorized');
  const job = claimed.job;
  if (!job) return false;
  let result: Record<string, string>;
  try {
    let evidence: string;
    let transactionHash: string | undefined;
    if (job.kind === 0) {
      await registerPassport(job.wallet);
      evidence = createHash('sha256')
        .update(`passport:${job.source_id}:${job.wallet}`)
        .digest('hex');
    } else {
      const delivery = await deliverActivity(
        {
          id: job.source_id,
          kind: job.kind,
          destination_id: z.uuid().parse(job.destination_id),
          subject: z.uuid().parse(job.subject),
        },
        job.wallet,
      );
      evidence = delivery.evidenceHash;
      transactionHash = delivery.transactionHash;
    }
    result = {
      state: 'confirmed',
      evidence_hash: evidence,
      ...(transactionHash ? { transaction_hash: transactionHash } : {}),
    };
  } catch (error) {
    result = {
      state: 'retry',
      error: error instanceof Error && error.message === 'activity_conflict' ? 'conflict' : 'rpc',
    };
  }
  const finished = await workerCommand({
    action: 'finish',
    job_id: job.id,
    lease_token: job.lease_token,
    ...result,
  });
  if (finished.error || !finished.ok) throw new Error('activity_worker_lease_lost');
  return true;
}
