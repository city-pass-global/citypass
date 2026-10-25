import { getTranslations } from 'next-intl/server';
export async function DemoNotice({ compact = false }: { compact?: boolean }) {
  const t = await getTranslations('demo');
  return compact ? (
    <span className="demo-label">{t('label')}</span>
  ) : (
    <aside className="notice demo-notice" role="note">
      <strong>{t('label')}</strong>
      <p>{t('notice')}</p>
    </aside>
  );
}
