'use client';
import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { reviewMerchant, type ReviewResult } from '@/app/[locale]/review/actions';
import { Button } from '@/components/ui/button';
export function ReviewForm({
  locale,
  id,
  version,
  commandId,
  status,
}: {
  locale: string;
  id: string;
  version: number;
  commandId: string;
  status: 'pending' | 'approved' | 'suspended';
}) {
  const t = useTranslations('review');
  const [state, submit, pending] = useActionState(
    reviewMerchant.bind(null, locale),
    {} as ReviewResult,
  );
  return (
    <form action={submit} className="action-form">
      <input type="hidden" name="organization_id" value={id} />
      <input type="hidden" name="command_id" value={commandId} />
      <input type="hidden" name="expected_version" value={version} />
      <input
        type="hidden"
        name="decision"
        value={status === 'approved' ? 'suspended' : 'approved'}
      />
      <label>
        {t('reason')}
        <textarea name="reason" required minLength={10} maxLength={1000} rows={3} />
      </label>
      <p>{t('reasonNote')}</p>
      <label className="review-confirm">
        <input type="checkbox" required />
        {t(status === 'approved' ? 'confirmSuspend' : 'confirmApprove')}
      </label>
      <Button
        variant={status === 'approved' ? 'outline' : 'default'}
        disabled={pending || state.success}
      >
        {pending
          ? t('saving')
          : t(
              status === 'approved' ? 'suspend' : status === 'suspended' ? 'reactivate' : 'approve',
            )}
      </Button>
      {state.error ? (
        <p role="alert">
          {t.has(`errors.${state.error}`) ? t(`errors.${state.error}`) : t('errors.unavailable')}
        </p>
      ) : null}
      {state.success ? <p role="status">{t('saved')}</p> : null}
    </form>
  );
}
