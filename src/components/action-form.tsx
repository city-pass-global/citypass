'use client';
import { useActionState, useEffect, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2 } from 'lucide-react';
import QRCode from 'qrcode';
import { execute, type ActionResult } from '@/app/actions';
import type { Command } from '@/lib/validation';
import { Button } from './ui/button';
export function ActionForm({
  locale,
  command,
  label,
  children,
}: {
  locale: string;
  command: Command;
  label: string;
  children?: ReactNode;
}) {
  const [state, action, pending] = useActionState(
    execute.bind(null, locale, command),
    {} as ActionResult,
  );
  const t = useTranslations();
  const [qr, setQr] = useState('');
  useEffect(() => {
    let alive = true;
    if (state.url)
      QRCode.toDataURL(state.url, { width: 220, margin: 2 }).then((v) => {
        if (alive) setQr(v);
      });
    return () => {
      alive = false;
    };
  }, [state.url]);
  return (
    <form action={action} className="action-form">
      {children}
      <Button disabled={pending}>{pending ? t('saving') : label}</Button>
      {state.error && (
        <p role="alert" className="notice error">
          {t.has(`errors.${state.error}`) ? t(`errors.${state.error}`) : t('errors.unavailable')}
        </p>
      )}
      {state.success && (
        <p role="status" className={`notice ${command === 'claim_stamp' ? 'claim-success' : ''}`}>
          {command === 'claim_stamp' && <CheckCircle2 size={24} />}
          {t(command === 'claim_stamp' ? 'experience.stampCollected' : 'saved')}
        </p>
      )}
      {state.url && (
        <div className="share-link">
          <label>
            {t('privateLink')}
            <input
              aria-label={t('privateLink')}
              readOnly
              value={state.url}
              onFocus={(e) => e.target.select()}
            />
          </label>
          {qr && <img width={220} height={220} src={qr} alt={t('qrImage')} />}
          <p>{t('shareNote')}</p>
        </div>
      )}
    </form>
  );
}
