import { getTranslations } from 'next-intl/server';
import { Stamp } from 'lucide-react';

export async function PassSummary() {
  const t = await getTranslations('destinationPass');
  return (
    <div className="pass-summary">
      <span className="pass-summary-seal" aria-hidden="true">
        <Stamp size={26} />
      </span>
      <div>
        <p className="pass-summary-price">{t('price')}</p>
        <p className="pass-summary-scope">{t('perDestination')}</p>
      </div>
      <span className="pass-reputation-award">{t('awardShort')}</span>
    </div>
  );
}
