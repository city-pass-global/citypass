import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ScanLine, Stamp, ArrowUpRight } from 'lucide-react';
import { CheckoutScanner } from '@/components/payments/checkout-scanner';
import { PageIntro } from '@/components/page-intro';
export default async function Pay({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations();
  return (
    <section className="section app-page scan-page">
      <PageIntro title={t('payments.scan')} body={t('payments.scanBody')} icon={ScanLine} />
      <div className="scan-layout">
        <div className="scan-workbench">
          <CheckoutScanner locale={locale} />
        </div>
        <aside className="scan-guide">
          <h2>{t('appUi.scanGuideTitle')}</h2>
          <ol>
            {['scanStepOne', 'scanStepTwo', 'scanStepThree'].map((key) => (
              <li key={key}>{t(`appUi.${key}`)}</li>
            ))}
          </ol>
          <div className="scan-alternative">
            <Stamp size={25} strokeWidth={1.3} aria-hidden="true" />
            <h3>{t('appUi.visitCodeTitle')}</h3>
            <p>{t('appUi.visitCodeBody')}</p>
            <Link className="app-text-link" href={`/${locale}/claim`}>
              {t('claim')}
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
