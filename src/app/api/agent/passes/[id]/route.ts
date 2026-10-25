import { z } from 'zod';
import { isDeepStrictEqual } from 'node:util';
import { createHash } from 'node:crypto';
import {
  decodePaymentSignatureHeader,
  encodePaymentRequiredHeader,
  encodePaymentResponseHeader,
} from '@x402/core/http';
import type { PaymentRequirements } from '@x402/core/types';
import {
  agentDelivery,
  agentResource,
  facilitator,
  requirements,
  x402Enabled,
} from '@/lib/x402/server';
import { paymentSchema, tokenSchema, type AgentOrder } from '@/lib/x402/validation';
import { transferAuthorization, verifyAgentLedger } from '@/lib/x402/ledger';
import { testnetRpc } from '@/lib/payments/stellar';
import copy from '../../../../../../messages/en.json';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store', ...headers } });
function receipt(order: AgentOrder) {
  return json(
    {
      request_id: order.checkout.id,
      status: 'confirmed',
      receipt: order.checkout.receipt,
      passport_activity: 'queued',
    },
    200,
    {
      'PAYMENT-RESPONSE': encodePaymentResponseHeader({
        success: true,
        transaction: order.checkout.transaction_hash!,
        network: 'stellar:testnet',
        payer: order.checkout.payer_address!,
      }),
    },
  );
}
function pending(order: AgentOrder) {
  return json(
    {
      request_id: order.checkout.id,
      status: order.state,
      transaction_hash: order.checkout.transaction_hash,
      recovery_required: order.state === 'settling',
    },
    202,
    { 'Retry-After': '5' },
  );
}
async function confirm(order: AgentOrder, token: string) {
  if (order.state === 'confirmed') return receipt(order);
  if (!order.checkout.transaction_hash || !order.payment_payload) return pending(order);
  const result = await testnetRpc().getTransaction(order.checkout.transaction_hash);
  if (result.status === 'NOT_FOUND') return pending(order);
  const evidence = verifyAgentLedger(
    order.checkout,
    order.payment_payload.payload.transaction,
    result,
  );
  return receipt(await agentDelivery('confirm', order.checkout.id, token, evidence));
}
function matches(accepted: PaymentRequirements, expected: PaymentRequirements) {
  return (
    accepted.scheme === expected.scheme &&
    accepted.network === expected.network &&
    accepted.asset === expected.asset &&
    accepted.amount === expected.amount &&
    accepted.payTo === expected.payTo &&
    accepted.maxTimeoutSeconds === expected.maxTimeoutSeconds &&
    isDeepStrictEqual(accepted.extra, expected.extra)
  );
}
async function handle(request: Request, id: string, recovery: boolean) {
  if (!x402Enabled()) return json({ error: 'unavailable' }, 503);
  if (!z.uuid().safeParse(id).success) return json({ error: 'invalid' }, 400);
  const raw = request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  const token = tokenSchema.safeParse(raw);
  if (!token.success) return json({ error: 'unauthorized' }, 401);
  try {
    let order = await agentDelivery('resolve', id, token.data);
    if (order.state === 'confirmed') return receipt(order);
    if (recovery) {
      if (order.state !== 'settling' || !order.payment_payload) return confirm(order, token.data);
      // A lost facilitator response is recovered by independently checking the exact signed auth.
      // An arbitrary caller-supplied hash can never bind or fulfill an order.
      const body = await request.text();
      if (body.length > 150) return json({ error: 'invalid' }, 400);
      const { transaction_hash } = z
        .object({ transaction_hash: z.string().regex(/^[a-f0-9]{64}$/) })
        .strict()
        .parse(JSON.parse(body));
      const evidence = verifyAgentLedger(
        { ...order.checkout, transaction_hash },
        order.payment_payload.payload.transaction,
        await testnetRpc().getTransaction(transaction_hash),
      );
      order = await agentDelivery('settled', id, token.data, { hash: transaction_hash });
      return receipt(await agentDelivery('confirm', id, token.data, evidence));
    }
    if (order.state === 'settling' || order.state === 'settled') return confirm(order, token.data);
    if (Date.parse(order.checkout.expires_at) <= Date.now() + 90000)
      return json({ error: 'expired' }, 410);
    const client = facilitator();
    const expected = await requirements(order, client);
    const signature = request.headers.get('PAYMENT-SIGNATURE');
    if (!signature) {
      const required = {
        x402Version: 2,
        resource: {
          url: agentResource(id),
          description: copy.agentPurchase.apiDescription,
          mimeType: 'application/json',
        },
        accepts: [expected],
      };
      return json(required, 402, { 'PAYMENT-REQUIRED': encodePaymentRequiredHeader(required) });
    }
    if (signature.length > 60000) return json({ error: 'invalid' }, 400);
    let decoded: unknown;
    try {
      decoded = decodePaymentSignatureHeader(signature);
    } catch {
      return json({ error: 'payment_proof' }, 400);
    }
    const payment = paymentSchema.parse(decoded);
    if (!matches(payment.accepted, expected) || payment.resource?.url !== agentResource(id))
      return json({ error: 'payment_proof' }, 400);
    transferAuthorization(payment.payload.transaction, order.checkout);
    const verified = await client.verify(payment, expected);
    if (!verified.isValid || verified.payer !== order.checkout.payer_address)
      return json({ error: 'payment_proof' }, 400);
    // Persist before external settlement. Only one caller can win this transition.
    order = await agentDelivery('stage', id, token.data, {
      payment_payload: payment,
      payload_hash: createHash('sha256').update(payment.payload.transaction).digest('hex'),
    });
    try {
      const settled = await client.settle(payment, expected);
      if (
        /^[a-f0-9]{64}$/.test(settled.transaction) &&
        settled.network === 'stellar:testnet' &&
        settled.payer === order.checkout.payer_address
      ) {
        order = await agentDelivery('settled', id, token.data, { hash: settled.transaction });
        return await confirm(order, token.data);
      }
    } catch {
      // Indeterminate outcome: never accept another authorization or charge again.
    }
    return pending(order);
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'forbidden') return json({ error: 'forbidden' }, 403);
    if (code === 'revoked' || code === 'expired') return json({ error: code }, 410);
    if (code === 'invalid_state' || code === 'replay')
      return json({ error: 'purchase_pending' }, 409);
    if (error instanceof z.ZodError || code === 'payment_proof')
      return json({ error: 'payment_proof' }, 400);
    return json({ error: 'unavailable' }, 503);
  }
}
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(request, (await context.params).id, false);
}
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(request, (await context.params).id, true);
}
