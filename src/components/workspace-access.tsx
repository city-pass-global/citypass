import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Hotel, Store, Landmark, ShieldCheck, MessagesSquare, ArrowUpRight } from 'lucide-react';
import { AuthGate } from '@/components/auth-gate';
import { PageIntro } from '@/components/page-intro';
const icons = {
  hotel: Hotel,
  merchant: Store,
  operator: Landmark,
  review: ShieldCheck,
  inquiries: MessagesSquare,
};

export async function WorkspaceAccess({
  locale,
  title,
  body,
  kind,
}: {
  locale: string;
  title: string;
  body?: string;
  kind: keyof typeof icons;
}) {
  const t = await getTranslations('appUi');
  const Icon = icons[kind];
  return (
    <section className="section workspace-page workspace-welcome">
      <PageIntro title={title} body={body ?? t(`${kind}Intro`)} icon={Icon} />
      <div className="workspace-entry-layout">
        <AuthGate locale={locale} />
        <aside className="workspace-access-note">
          <ShieldCheck size={30} strokeWidth={1.2} aria-hidden="true" />
          <h2>{t('workspaceAccessTitle')}</h2>
          <p>{t('workspaceAccessBody')}</p>
          <Link href={`/${locale}/partners`}>
            {t('workspaceInfo')}
            <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        </aside>
      </div>
    </section>
  );
}
