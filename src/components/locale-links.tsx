'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { localeHref } from '@/lib/destination-context/validation';
export function LocaleLinks({ locale }: { locale: string }) {
  const pathname = usePathname(),
    search = useSearchParams();
  const t = useTranslations('destinationContext');
  return (
    <nav className="languages" aria-label={t('language')}>
      {['es', 'en', 'pt'].map((language) => (
        <Link
          key={language}
          href={localeHref(pathname, search.toString(), language)}
          aria-current={locale === language ? 'page' : undefined}
        >
          {language.toUpperCase()}
        </Link>
      ))}
    </nav>
  );
}
