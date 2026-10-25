import { randomUUID } from 'node:crypto';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { z } from 'zod';
import { session, createClient } from '@/lib/supabase/server';
import { getSelectedDestination } from '@/lib/destination-context/server';
import { getDestinationPasses } from '@/lib/passes/server';
import { x402Enabled } from '@/lib/x402/server';
import { localizedText } from '@/lib/data';
import { AgentPurchaseForm, RevokeAgentForm } from '@/components/agent-purchase-form';
import { AuthGate } from '@/components/auth-gate';
export default async function Agents({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [t, user, destination] = await Promise.all([
    getTranslations('agentPurchase'),
    session(),
    getSelectedDestination(),
  ]);
  const catalog =
    destination && user && x402Enabled() ? await getDestinationPasses(destination.id) : null;
  const orders =
    user && x402Enabled()
      ? await (await createClient()).rpc('x402_order_command', { action: 'list', payload: {} })
      : null;
  const history = z
    .object({
      orders: z.array(
        z.object({
          request_id: z.uuid(),
          state: z.enum(['authorized', 'settling', 'settled', 'confirmed', 'revoked']),
          product: z.string(),
          expires_at: z.string(),
          created_at: z.string(),
        }),
      ),
    })
    .safeParse(orders?.data);
  return (
    <main className="page-shell">
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>
      <Link href={`/${locale}/passport`}>{t('back')}</Link>
      {!user ? (
        <AuthGate locale={locale} />
      ) : !x402Enabled() || catalog?.unavailable ? (
        <p role="status">{t('errors.unavailable')}</p>
      ) : (
        <>
          <p>{t('scope')}</p>
          {catalog?.offers.length ? (
            <AgentPurchaseForm
              commandId={randomUUID()}
              offers={catalog.offers.map((o) => ({
                id: o.id,
                name: localizedText(o.names, locale),
              }))}
            />
          ) : (
            <p>{t('empty')}</p>
          )}
          <h2>{t('history')}</h2>
          {!history.success ? (
            <p role="status">{t('errors.unavailable')}</p>
          ) : !history.data.orders.length ? (
            <p>{t('noHistory')}</p>
          ) : (
            <ul>
              {history.data.orders.map((order) => (
                <li key={order.request_id}>
                  <strong>{order.product}</strong> —{' '}
                  {t(
                    `states.${order.state === 'authorized' && Date.parse(order.expires_at) < Date.now() ? 'expired' : order.state}`,
                  )}
                  {order.state === 'authorized' ? <RevokeAgentForm id={order.request_id} /> : null}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
