import { getTranslations } from 'next-intl/server';
import { ArrowUpRight, BadgePercent, Sparkles, ChevronDown } from 'lucide-react';

export async function PassProgram({ id }: { id: string }) {
  const t = await getTranslations('destinationPass');
  return (
    <div className="pass-program">
      <ul className="pass-benefit-preview" aria-label={t('program.title')}>
        {(
          [
            [ArrowUpRight, 'priority'],
            [BadgePercent, 'discounts'],
            [Sparkles, 'loyalty'],
          ] as const
        ).map(([Icon, key]) => (
          <li key={key}>
            <Icon size={19} aria-hidden="true" />
            <span>{t(`preview.${key}`)}</span>
          </li>
        ))}
      </ul>
      <p className="pass-availability">{t('pendingShort')}</p>
      <details className="pass-details">
        <summary>
          {t('moreDetails')}
          <ChevronDown size={17} aria-hidden="true" />
        </summary>
        <div className="pass-details-body">
          <section className="pass-benefits-detail" aria-labelledby={`${id}-benefits`}>
            <h3 id={`${id}-benefits`}>{t('program.title')}</h3>
            <ul className="pass-program-benefits">
              {(
                [
                  [ArrowUpRight, 'priority'],
                  [BadgePercent, 'discounts'],
                  [Sparkles, 'loyalty'],
                ] as const
              ).map(([Icon, key]) => (
                <li key={key}>
                  <Icon size={20} aria-hidden="true" />
                  <div>
                    <h4>{t(`preview.${key}`)}</h4>
                    <p>{t(`program.${key}`)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <section className="pass-reputation-detail" aria-labelledby={`${id}-tiers`}>
            <h3 id={`${id}-tiers`}>{t('tierTitle')}</h3>
            <dl className="pass-tier-list">
              {(['basic', 'mid', 'top'] as const).map((tier) => (
                <div key={tier}>
                  <dt>{t(`tiers.${tier}`)}</dt>
                  <dd>{t(`tierRanges.${tier}`)}</dd>
                </div>
              ))}
            </dl>
            <p className="pass-tier-earning">{t('earning')}</p>
            <p className="pass-tier-note">{t('reputationNote')}</p>
          </section>
        </div>
      </details>
    </div>
  );
}
