import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Stamp, ArrowUpRight } from 'lucide-react';
import { session } from '@/lib/supabase/server';
import { AuthGate } from '@/components/auth-gate';
import { ClaimForm } from '@/components/claim-form';
import { PageIntro } from '@/components/page-intro';
export default async function Claim({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [t, user] = await Promise.all([getTranslations(), session()]);
  return (
    <section className="section narrow app-page claim-page">
      <PageIntro title={t('scan')} body={t('appUi.claimIntro')} icon={Stamp} />
      {user ? <ClaimForm locale={locale} /> : <AuthGate locale={locale} />}
      <Link className="app-text-link" href={`/${locale}/passport`}>
        {t('travelDesign.open')}
        <ArrowUpRight size={17} aria-hidden="true" />
      </Link>
    </section>
  );
}
