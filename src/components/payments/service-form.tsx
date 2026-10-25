'use client';
import { useActionState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { serviceAction } from '@/app/service-actions';
import type { serviceSchemas } from '@/lib/payments/services';
import type { ActionResult } from '@/app/actions';
export function ServiceForm({
  locale,
  command,
  label,
  children,
}: {
  locale: string;
  command: keyof typeof serviceSchemas;
  label: string;
  children: ReactNode;
}) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(
    serviceAction.bind(null, locale, command),
    {} as ActionResult,
  );
  return (
    <form action={action} className="action-form">
      {children}
      <button className="button primary" disabled={pending}>
        {pending ? t('saving') : label}
      </button>
      {state.error ? (
        <p role="alert">
          {t.has(`merchantServices.errors.${state.error}`)
            ? t(`merchantServices.errors.${state.error}`)
            : t.has(`payments.errors.${state.error}`)
              ? t(`payments.errors.${state.error}`)
              : t('payments.errors.unavailable')}
        </p>
      ) : null}
      {state.success ? <p role="status">{t('saved')}</p> : null}
    </form>
  );
}
