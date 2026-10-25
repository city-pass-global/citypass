'use client';
import { useActionState, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Stamp, ScanLine, X } from 'lucide-react';
import { claimExploration } from '@/app/exploration-actions';
import type { ActionResult } from '@/app/actions';
import { ClaimForm } from './claim-form';

export function CollectStamp({
  locale,
  slug,
  itemId,
  title,
  collected,
  signedIn,
}: {
  locale: string;
  slug: string;
  itemId: string;
  title: string;
  collected: boolean;
  signedIn: boolean;
}) {
  const t = useTranslations('exploration');
  const errors = useTranslations('errors');
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [state, action, pending] = useActionState(claimExploration, {} as ActionResult);
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
      previous?.focus();
    };
  }, [open]);
  const done = collected || state.success;
  return (
    <div className="collect-stamp">
      <button
        type="button"
        className="button outline"
        aria-haspopup="dialog"
        onClick={() => {
          setScanning(false);
          setOpen(true);
        }}
      >
        <Stamp size={17} aria-hidden="true" />
        {t(done ? 'collected' : 'collect')}
      </button>
      {open ? (
        <dialog
          ref={dialog}
          className="collection-dialog"
          aria-labelledby={headingId}
          onClose={() => setOpen(false)}
        >
          <button
            autoFocus
            type="button"
            className="collection-close"
            aria-label={t('close')}
            onClick={() => setOpen(false)}
          >
            <X size={22} />
          </button>
          <h2 id={headingId}>{title}</h2>
          <p>{t('note')}</p>
          {done ? (
            <div role="status">
              <p>{t('collected')}</p>
              <Link className="button primary" href={`/${locale}/passport`}>
                {t('open')}
              </Link>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="button outline"
                aria-expanded={scanning}
                onClick={() => setScanning(!scanning)}
              >
                <ScanLine size={18} aria-hidden="true" />
                {t('scan')}
              </button>
              {scanning ? (
                signedIn ? (
                  <ClaimForm locale={locale} />
                ) : (
                  <Link href={`/${locale}/login`}>{t('signin')}</Link>
                )
              ) : null}
              {signedIn ? (
                <form action={action}>
                  <input type="hidden" name="guide_slug" value={slug} />
                  <input type="hidden" name="item_id" value={itemId} />
                  <button className="button primary" disabled={pending}>
                    {t('claim')}
                  </button>
                </form>
              ) : (
                <Link className="button primary" href={`/${locale}/login`}>
                  {t('claim')}
                </Link>
              )}
              {state.error ? (
                <p role="alert">
                  {errors.has(state.error) ? errors(state.error) : t('unavailable')}
                </p>
              ) : null}
            </>
          )}
        </dialog>
      ) : null}
    </div>
  );
}
