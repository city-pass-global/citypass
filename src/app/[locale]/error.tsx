'use client';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Compass, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
export default function ErrorBoundary({ reset }: { reset: () => void }) {
  const t = useTranslations();
  const locale = useLocale();
  return (
    <section className="section app-page recovery-page">
      <div className="recovery-symbol" aria-hidden="true">
        <Compass size={62} strokeWidth={1} />
      </div>
      <h1>{t('appUi.errorTitle')}</h1>
      <p>{t('appUi.errorBody')}</p>
      <div className="inline-actions">
        <Button onClick={reset}>
          <RefreshCw size={17} aria-hidden="true" />
          {t('tryAgain')}
        </Button>
        <Link className="app-text-link" href={`/${locale}/destinations`}>
          {t('appUi.backDestinations')}
        </Link>
      </div>
    </section>
  );
}
