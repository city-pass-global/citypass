import { getTranslations } from 'next-intl/server';
import { Compass } from 'lucide-react';
export default async function Loading() {
  const t = await getTranslations();
  return (
    <div className="section app-loading" role="status">
      <Compass size={38} strokeWidth={1.2} aria-hidden="true" />
      <p>{t('loading')}</p>
      <span aria-hidden="true" className="loading-track" />
    </div>
  );
}
