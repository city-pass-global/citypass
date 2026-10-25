'use client';
import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import {
  authorizeAgent,
  revokeAgent,
  type AuthorizationResult,
} from '@/app/[locale]/passport/agents/actions';
import { Button } from './ui/button';
export function AgentPurchaseForm({
  offers,
  commandId,
}: {
  offers: { id: string; name: string }[];
  commandId: string;
}) {
  const t = useTranslations('agentPurchase');
  const [result, action, pending] = useActionState(authorizeAgent, {} as AuthorizationResult);
  const [revoked, revoke, revoking] = useActionState(
    revokeAgent,
    {} as { error?: string; success?: boolean },
  );
  if (result.token && result.url && result.id)
    return (
      <section className="pass-details">
        <p role="status">{revoked.success ? t('revoked') : t('ready')}</p>
        {!revoked.success && (
          <>
            <p>{t('secretNote')}</p>
            <label>
              {t('endpoint')}
              <input readOnly value={result.url} onFocus={(e) => e.target.select()} />
            </label>
            <label>
              {t('credential')}
              <input
                readOnly
                type="password"
                autoComplete="off"
                value={result.token}
                onFocus={(e) => e.target.select()}
              />
            </label>
            <p>{t('instructions')}</p>
            <form action={revoke}>
              <input type="hidden" name="request_id" value={result.id} />
              <Button disabled={revoking}>{t('revoke')}</Button>
            </form>
            {revoked.error && <p role="alert">{t('revokeFailed')}</p>}
          </>
        )}
      </section>
    );
  return (
    <form action={action} className="action-form">
      <input type="hidden" name="command_id" value={commandId} />
      <label>
        {t('offer')}
        <select required name="offer_id">
          {offers.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t('wallet')}
        <input
          name="agent_wallet"
          required
          minLength={56}
          maxLength={56}
          autoComplete="off"
          placeholder="G…"
        />
      </label>
      <label>
        <input type="checkbox" name="consent" required /> {t('consent')}
      </label>
      <Button disabled={pending || !offers.length}>
        {pending ? t('preparing') : t('authorize')}
      </Button>
      {result.error && (
        <p role="alert">
          {t.has(`errors.${result.error}`) ? t(`errors.${result.error}`) : t('errors.unavailable')}
        </p>
      )}
    </form>
  );
}

export function RevokeAgentForm({ id }: { id: string }) {
  const t = useTranslations('agentPurchase');
  const [state, action, pending] = useActionState(
    revokeAgent,
    {} as { error?: string; success?: boolean },
  );
  return state.success ? (
    <p role="status">{t('revoked')}</p>
  ) : (
    <form action={action}>
      <input type="hidden" name="request_id" value={id} />
      <Button disabled={pending}>{t('revoke')}</Button>
      {state.error ? <p role="alert">{t('revokeFailed')}</p> : null}
    </form>
  );
}
