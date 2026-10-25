import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Hotel, ShieldCheck } from 'lucide-react';
import { GuestForm } from '@/components/guest-form';
import { PageIntro } from '@/components/page-intro';
export const metadata = { robots: { index: false, follow: false } };
export default async function Precheckin({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations();
  return (
    <section className="section narrow app-page guest-page">
      <PageIntro title={t('precheckinTitle')} body={t('precheckinBody')} icon={Hotel} />
      <p className="guest-invitation-note">
        <ShieldCheck size={20} aria-hidden="true" />
        {t('appUi.guestNote')}
      </p>
      <div className="guest-form-paper">
        <GuestForm />
      </div>
      <Link className="app-text-link" href={`/${locale}/privacy`}>
        {t('privacy')}
      </Link>
    </section>
  );
}
