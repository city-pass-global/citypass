import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { Compass, ArrowUpRight } from 'lucide-react';
export default async function NotFound() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations('appUi')]);
  return (
    <section className="section app-page recovery-page">
      <div className="recovery-symbol" aria-hidden="true">
        <Compass size={70} strokeWidth={1} />
      </div>
      <h1>404</h1>
      <h2>{t('notFoundTitle')}</h2>
      <p>{t('notFoundBody')}</p>
      <Link className="button primary" href={`/${locale}/destinations`}>
        {t('backDestinations')}
        <ArrowUpRight size={17} aria-hidden="true" />
      </Link>
    </section>
  );
}
