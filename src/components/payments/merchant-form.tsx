'use client';
import { useActionState, useEffect, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import QRCode from 'qrcode';
import { merchantAction, type MerchantResult } from '@/app/[locale]/merchant/actions';
import type { merchantSchemas } from '@/lib/payments/validation';
import { Button } from '@/components/ui/button';
export function MerchantForm({
  locale,
  action,
  label,
  children,
}: {
  locale: string;
  action: keyof typeof merchantSchemas;
  label: string;
  children: ReactNode;
}) {
  const t = useTranslations();
  const [state, submit, pending] = useActionState(
    merchantAction.bind(null, locale, action),
    {} as MerchantResult,
  );
  const [qr, setQr] = useState('');
  useEffect(() => {
    let active = true;
    if (state.url)
      void QRCode.toDataURL(state.url, { width: 240, margin: 2 })
        .then((value) => {
          if (active) setQr(value);
        })
        .catch(() => {
          if (active) setQr('');
        });
    return () => {
      active = false;
    };
  }, [state.url]);
  return (
    <form action={submit} className="action-form">
      {children}
      <Button disabled={pending}>{pending ? t('saving') : label}</Button>
      {state.error ? (
        <p role="alert">
          {t.has(`payments.errors.${state.error}`)
            ? t(`payments.errors.${state.error}`)
            : t('payments.errors.unavailable')}
        </p>
      ) : null}
      {state.success ? <p role="status">{t('saved')}</p> : null}
      {state.url ? (
        <div className="checkout-share">
          {qr ? <img src={qr} width={240} height={240} alt={t('payments.qr')} /> : null}
          <a href={state.url}>{t('payments.open')}</a>
          <input
            readOnly
            value={state.url}
            aria-label={t('payments.link')}
            onFocus={(event) => event.target.select()}
          />
        </div>
      ) : null}
    </form>
  );
}
