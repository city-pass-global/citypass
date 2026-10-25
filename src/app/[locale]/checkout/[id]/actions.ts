'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { session } from '@/lib/supabase/server';
import { readCheckout, recordEvidence } from '@/lib/payments/server';
import {
  buildCheckoutTransaction,
  evidenceBase,
  testnetRpc,
  verifyCheckoutEnvelope,
  verifyCheckoutRpcResult,
} from '@/lib/payments/stellar';
export type PaymentResult = { error?: string; status?: string; unsignedXdr?: string };
const allowedErrors = new Set([
  'unauthorized',
  'unavailable',
  'forbidden',
  'wallet_required',
  'self_payment',
  'invalid_state',
  'payment_proof',
  'payment_conflict',
  'recipient_unavailable',
  'expired',
  'insufficient_usdc',
  'account_unfunded',
]);
const fail = (error: unknown): PaymentResult => ({
  error: error instanceof Error && allowedErrors.has(error.message) ? error.message : 'unavailable',
});
export async function preparePayment(id: string): Promise<PaymentResult> {
  try {
    z.uuid().parse(id);
    if (!(await session())) return { error: 'unauthorized' };
    const { checkout } = await readCheckout(id, 'prepare');
    return { unsignedXdr: await buildCheckoutTransaction(checkout) };
  } catch (error) {
    return fail(error);
  }
}
export async function reconcilePayment(id: string): Promise<PaymentResult> {
  try {
    z.uuid().parse(id);
    if (!(await session())) return { error: 'unauthorized' };
    const { checkout } = await readCheckout(id, 'attempt');
    if (checkout.status !== 'submitted' || !checkout.transaction_hash)
      return { status: checkout.status };
    const result = await testnetRpc().getTransaction(checkout.transaction_hash);
    if (result.status === 'NOT_FOUND') return { status: 'submitted' };
    const evidence = verifyCheckoutRpcResult(checkout, result);
    await recordEvidence(evidence);
    revalidatePath('/[locale]', 'layout');
    return { status: evidence.kind };
  } catch (error) {
    return fail(error);
  }
}
export async function submitPayment(id: string, signedXdr: string): Promise<PaymentResult> {
  try {
    z.uuid().parse(id);
    z.string().min(1).max(32768).parse(signedXdr);
    if (!(await session())) return { error: 'unauthorized' };
    const { checkout } = await readCheckout(id);
    const verified = verifyCheckoutEnvelope(checkout, signedXdr);
    await recordEvidence({
      ...evidenceBase(checkout, verified.hash),
      kind: 'submitted',
      envelope: signedXdr,
      max_time: verified.maxTime,
    });
    if (checkout.status === 'confirmed') return { status: 'confirmed' };
    try {
      await testnetRpc().sendTransaction(verified.transaction);
    } catch {
      /* Persisted hash/envelope remain reconcilable after a dropped response. */
    }
    const result = await reconcilePayment(id);
    // Submission is durable even if the RPC lookup temporarily fails. Keep recovery visible.
    return result.status ? result : { ...result, status: 'submitted' };
  } catch (error) {
    return fail(error);
  }
}
export async function retryPayment(id: string): Promise<PaymentResult> {
  try {
    z.uuid().parse(id);
    if (!(await session())) return { error: 'unauthorized' };
    const { checkout, attempt } = await readCheckout(id, 'attempt');
    if (checkout.status !== 'submitted') return { status: checkout.status };
    const parsed = z.object({ signed_envelope: z.string().max(32768) }).parse(attempt);
    return await submitPayment(id, parsed.signed_envelope);
  } catch (error) {
    return fail(error);
  }
}
