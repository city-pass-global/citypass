'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Compass, BookOpen, Wallet, UserRound, Route, Gift, Store, LogIn } from 'lucide-react';

export function AppNavigation({
  locale,
  variant,
  signedIn = false,
}: {
  locale: string;
  variant: 'desktop' | 'mobile' | 'journey';
  signedIn?: boolean;
}) {
  const pathname = usePathname();
  const t = useTranslations();
  const path = pathname.replace(/^\/(es|en|pt)(?=\/|$)/, '') || '/';
  const primary = [
    { label: t('marketing.home'), href: '', icon: Compass, active: path === '/' },
    {
      label: t('passport'),
      href: '/passport',
      icon: BookOpen,
      active: /^\/(passport|claim)(\/|$)/.test(path),
    },
    {
      label: t('countries.title'),
      href: '/destinations',
      icon: Compass,
      active: /^\/(destinations|explore|experiences)(\/|$)/.test(path),
    },
    {
      label: t('pollar.title'),
      href: '/wallet',
      icon: Wallet,
      active: /^\/(wallet|pay|checkout)(\/|$)/.test(path),
    },
  ];
  const account = signedIn
    ? {
        label: t('appUi.accountMenu'),
        href: '/profile',
        icon: UserRound,
        active: path === '/profile',
        state: 'in' as const,
      }
    : {
        label: t('appUi.signIn'),
        href: '/login',
        icon: LogIn,
        active: path === '/login' || path === '/profile',
        state: 'out' as const,
      };
  const journey = [
    {
      label: t('exploration.merchants'),
      href: '/merchants',
      icon: Store,
      active: path === '/merchants',
    },
    {
      label: t('appUi.cityGuide'),
      href: '/explore',
      icon: Compass,
      active:
        path === '/explore' ||
        /^\/destinations\/[a-z0-9-]{3,}$/.test(path) ||
        path.startsWith('/experiences/'),
    },
    { label: t('routes'), href: '/routes', icon: Route, active: path === '/routes' },
    { label: t('rewards'), href: '/rewards', icon: Gift, active: path === '/rewards' },
  ];
  if (
    variant === 'journey' &&
    !/^\/(merchants|explore|routes|rewards|passport|claim|wallet|pay|profile|experiences|checkout)(\/|$)/.test(
      path,
    ) &&
    !/^\/destinations\/[a-z0-9-]{3,}$/.test(path)
  )
    return null;
  const items =
    variant === 'journey' ? journey : variant === 'desktop' ? primary : [...primary, account];
  return (
    <nav
      className={variant === 'journey' ? 'journey-nav' : `${variant}-nav`}
      aria-label={t(variant === 'journey' ? 'appUi.journeyNavigation' : 'appUi.mainNavigation')}
    >
      {items.map((item) => {
        const { label, href, icon: Icon, active } = item;
        return (
          <Link
            key={href}
            href={`/${locale}${href}`}
            aria-current={active ? 'page' : undefined}
            data-account={'state' in item ? item.state : undefined}
          >
            {variant !== 'desktop' ? (
              <Icon size={variant === 'mobile' ? 21 : 16} aria-hidden="true" />
            ) : null}
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
