import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Landmark, ArrowUpRight } from 'lucide-react';

export default async function Partners({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('landing');
  return (
    <section className="section narrow partner-interest">
      <Landmark size={36} strokeWidth={1.2} />
      <p className="location">{t('partnerStatus')}</p>
      <h1>{t('partnerTitle')}</h1>
      <p className="lead">{t('partnerBody')}</p>
      <p>{t('partnerAccess')}</p>
      <p>{t('partnerRequirements')}</p>
      <p className="notice">{t('partnerNote')}</p>
      <div className="inline-actions">
        <Link className="button primary" href={`/${locale}/operator`}>
          {t('partnerWorkspace')}
          <ArrowUpRight size={18} />
        </Link>
        <Link href={`/${locale}/merchant`}>{t('partnerMerchant')}</Link>
      </div>
    </section>
  );
}
