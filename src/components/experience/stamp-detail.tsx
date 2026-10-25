'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Leaf, X } from 'lucide-react';
import { LivingLandscape } from './living-landscape';

export function StampDetail({
  children,
  name,
  date,
  sample = false,
  className,
}: {
  children: ReactNode;
  name?: string;
  date?: string;
  sample?: boolean;
  className?: string;
}) {
  const t = useTranslations('experience');
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [open]);
  return (
    <>
      <button
        type="button"
        className={className}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        {children}
      </button>
      {open && (
        <dialog
          ref={dialog}
          className="stamp-dialog"
          aria-labelledby={titleId}
          onClose={() => setOpen(false)}
        >
          <button
            type="button"
            autoFocus
            className="stamp-dialog-close"
            aria-label={t('closeDetail')}
            onClick={() => setOpen(false)}
          >
            <X size={22} />
          </button>
          <div className="stamp-detail-art">
            {sample ? (
              <LivingLandscape />
            ) : (
              <div className="collected-emblem">
                <Leaf size={70} />
                <span>{name}</span>
              </div>
            )}
          </div>
          <div className="stamp-detail-copy">
            <span className="stamp-detail-label">
              {t(sample ? 'sampleMark' : 'collectedLabel')}
            </span>
            <h2 id={titleId}>{sample ? t('waterfallStamp') : name}</h2>
            <p>{t(sample ? 'waterfallStory' : 'collectedStory')}</p>
            {date && (
              <p className="stamp-detail-date">
                {t('collectedOn')} <time>{date}</time>
              </p>
            )}
            <p className="stamp-detail-note">
              {t(sample ? 'sampleDetailNote' : 'recordDetailNote')}
            </p>
          </div>
        </dialog>
      )}
    </>
  );
}
