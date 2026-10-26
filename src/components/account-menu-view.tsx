'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { signOut } from '@/app/actions';
import { PollarPortal } from '@/components/wallet/pollar-portal';

export type AccountIdentity = { name: string; email: string | null; initials: string };
type PollarConfig = { apiKey: string; network: 'testnet' | 'mainnet' };

export function AccountMenuView({
  locale,
  user,
  pollar,
}: {
  locale: string;
  user: AccountIdentity | null;
  pollar: PollarConfig | null;
}) {
  const t = useTranslations();
  const pathname = usePathname();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!user) {
    return (
      <Link className="account-guest button outline" href={`/${locale}/login`}>
        <UserRound size={18} aria-hidden="true" />
        {t('appUi.signIn')}
      </Link>
    );
  }

  return (
    <div className="account-menu" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="account-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${t('appUi.signedIn')}: ${user.name}`}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="account-mark" aria-hidden="true">
          {user.initials}
        </span>
        <span className="account-trigger-copy">
          <small>{t('appUi.signedIn')}</small>
          <strong>{user.name}</strong>
        </span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open ? (
        <div className="account-panel" id={panelId}>
          <div className="account-panel-identity">
            <small>{t('appUi.signedIn')}</small>
            <strong>{user.name}</strong>
            {user.email ? <p>{user.email}</p> : null}
          </div>
          <nav className="account-links" aria-label={t('appUi.accountMenu')}>
            <Link href={`/${locale}/profile`}>{t('profile')}</Link>
            <Link href={`/${locale}/passport`}>{t('passport')}</Link>
            <Link href={`/${locale}/wallet`}>{t('pollar.title')}</Link>
          </nav>
          {pollar ? (
            <PollarPortal apiKey={pollar.apiKey} network={pollar.network} mode="logout" />
          ) : (
            <form action={signOut.bind(null, locale)}>
              <button className="account-signout" type="submit">
                <LogOut size={16} aria-hidden="true" />
                {t('signOut')}
              </button>
            </form>
          )}
        </div>
      ) : null}
    </div>
  );
}
