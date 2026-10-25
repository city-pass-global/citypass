'use client';

import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { BookOpen, ChevronLeft, ChevronRight, Leaf, X } from 'lucide-react';

const mobileQuery = '(max-width: 650px)';
function subscribeMobile(callback: () => void) {
  const query = window.matchMedia(mobileQuery);
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
}
const mobileSnapshot = () => window.matchMedia(mobileQuery).matches;
const serverSnapshot = () => false;

export function PassportStampBook({
  pages,
  count,
}: {
  pages: { id: string; title: string; content: ReactNode }[];
  count: number;
}) {
  const t = useTranslations('passportBook');
  const brand = useTranslations('globalPassport');
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const mobile = useSyncExternalStore(subscribeMobile, mobileSnapshot, serverSnapshot);
  const step = mobile ? 1 : 2;
  const start = Math.floor(Math.min(page, pages.length - 1) / step) * step;
  const spread = useRef<HTMLDivElement>(null);
  const cover = useRef<HTMLButtonElement>(null);
  const contentId = useId();
  useEffect(() => {
    if (open) spread.current?.focus({ preventScroll: true });
  }, [open]);
  function close() {
    setOpen(false);
    requestAnimationFrame(() => cover.current?.focus({ preventScroll: true }));
  }
  return (
    <div className={`collected-passport-book ${open ? 'is-open' : ''}`}>
      {!open ? (
        <button
          ref={cover}
          className="collected-passport-cover"
          type="button"
          aria-label={t('open')}
          aria-expanded={false}
          aria-controls={contentId}
          onClick={() => setOpen(true)}
        >
          <Leaf size={28} strokeWidth={1.2} aria-hidden="true" />
          <span className="collected-passport-brand">{brand('brand')}</span>
          <BookOpen size={58} strokeWidth={1} aria-hidden="true" />
          <strong>{t('coverTitle')}</strong>
          <span className="collected-passport-scope">{brand('cover')}</span>
          <span className="collected-passport-open">
            <BookOpen size={17} aria-hidden="true" />
            {t('open')}
          </span>
          <span className="collected-passport-count">{t('count', { count })}</span>
        </button>
      ) : (
        <div id={contentId} className="collected-passport-open-book">
          <div className="collected-passport-toolbar">
            <span>{t('collection')}</span>
            <button type="button" onClick={close}>
              <X size={15} aria-hidden="true" />
              {t('close')}
            </button>
          </div>
          <div
            ref={spread}
            tabIndex={-1}
            className="collected-passport-spread"
            aria-label={t('collection')}
          >
            {pages.slice(start, start + step).map((leaf, offset) => (
              <section
                className="collected-passport-leaf"
                key={leaf.id}
                aria-label={t('page', { page: start + offset + 1 })}
              >
                <header>
                  <Leaf size={15} strokeWidth={1.3} aria-hidden="true" />
                  <h3>{leaf.title}</h3>
                </header>
                <div className="collected-passport-leaf-content">{leaf.content}</div>
                <footer>{t('page', { page: start + offset + 1 })}</footer>
              </section>
            ))}
            {!mobile && start + 1 >= pages.length ? (
              <div className="collected-passport-leaf collected-passport-end" aria-hidden="true">
                <Leaf size={40} strokeWidth={1} />
                <p>{t('nextMemory')}</p>
              </div>
            ) : null}
          </div>
          <nav className="collected-passport-pagination" aria-label={t('navigation')}>
            <button
              type="button"
              disabled={start === 0}
              onClick={() => setPage(Math.max(0, start - step))}
            >
              <ChevronLeft size={16} aria-hidden="true" />
              {t('previous')}
            </button>
            <span role="status">
              {t(step === 1 || start + 1 === pages.length ? 'singlePosition' : 'position', {
                first: start + 1,
                last: Math.min(start + step, pages.length),
                total: pages.length,
              })}
            </span>
            <button
              type="button"
              disabled={start + step >= pages.length}
              onClick={() => setPage(start + step)}
            >
              {t('next')}
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
