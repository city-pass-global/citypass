import { getSelectedDestination } from '@/lib/destination-context/server';
import { localizedText } from '@/lib/data';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Gift, Leaf, Compass, BookOpen, Ticket, ArrowUpRight, Stamp } from 'lucide-react';
import { RewardInterests } from '@/components/rewards/reward-interests';
export default async function Rewards({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [t, selected] = await Promise.all([getTranslations(), getSelectedDestination()]);
  const city = selected ? localizedText(selected.names, locale) : 'Iguazú';
  const slug = selected?.slug ?? 'puerto-iguazu';
  return (
    <section className="section rewards-page">
      <header className="rewards-hero">
        <div>
          <p className="location">
            <Gift size={16} />
            {t('rewardGuide.eyebrow')}
          </p>
          <h1>{t('destinationContext.rewardsTitle', { destination: city })}</h1>
          <p className="rewards-intro">{t('rewardGuide.intro')}</p>
          <p className="rewards-availability">{t('rewardsBody')}</p>
        </div>
        <div className="reward-ticket">
          <span className="reward-ticket-status">{t('rewardGuide.upcoming')}</span>
          <div className="reward-ticket-seal" aria-hidden="true">
            <Leaf size={42} />
          </div>
          <h2>{t('rewardGuide.ticketTitle')}</h2>
          <p>{t('destinationJourneys.rewardTicket', { destination: city })}</p>
          <div className="reward-ticket-stub">
            <Ticket size={20} />
            <span>{t('rewardGuide.ticketFooter')}</span>
          </div>
        </div>
      </header>
      <RewardInterests key={slug} destination={slug} city={city} />
      <section className="reward-how" aria-labelledby="reward-how-title">
        <h2 id="reward-how-title">{t('rewardGuide.howTitle')}</h2>
        <ol>
          {[
            ['stepExplore', 'stepExploreBody', Compass],
            ['stepCheck', 'stepCheckBody', BookOpen],
            ['stepRedeem', 'stepRedeemBody', Ticket],
          ].map(([title, body, Icon], index) => (
            <li key={title as string}>
              <span className="reward-step-icon">
                <Icon size={24} />
                <span>{index + 1}</span>
              </span>
              <h3>{t(`rewardGuide.${title}`)}</h3>
              <p>{t(`rewardGuide.${body}`)}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="reward-passport">
        <Stamp size={38} aria-hidden="true" />
        <div>
          <h2>{t('rewardGuide.passportTitle')}</h2>
          <p>{t('rewardGuide.passportBody')}</p>
          <div>
            <Link href={`/${locale}/passport`}>
              {t('rewardGuide.passportAction')} <ArrowUpRight size={16} />
            </Link>
            <Link href={`/${locale}/routes`}>
              {t('rewardGuide.routesAction')} <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </section>
      <section className="reward-faq" aria-labelledby="reward-faq-title">
        <h2 id="reward-faq-title">{t('rewardGuide.faqTitle')}</h2>
        <div>
          {['faqStamps', 'faqWhen', 'faqInterests'].map((key) => (
            <details key={key}>
              <summary>{t(`rewardGuide.${key}`)}</summary>
              <p>{t(`rewardGuide.${key}Body`)}</p>
            </details>
          ))}
        </div>
      </section>
    </section>
  );
}
