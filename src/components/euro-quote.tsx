import { getTranslations } from 'next-intl/server';
import { euroFeed } from '@/lib/reflector/feed';
import { euroAmount } from '@/lib/reflector/quote';

export async function EuroQuote({
  amount,
  detail = false,
}: {
  amount: string;
  detail?: boolean;
}) {
  const [t, feed] = await Promise.all([getTranslations('euro'), euroFeed()]);
  const quoted = feed ? euroAmount(amount, feed) : null;
  if (!quoted) {
    return detail ? <p className="euro-quote">{t('unavailable')}</p> : null;
  }
  return (
    <p className="euro-quote">
      <span>{t('amount', { amount: quoted })}</span>
      {detail ? <small>{t('note')}</small> : null}
    </p>
  );
}

export async function EuroNote() {
  const [t, feed] = await Promise.all([getTranslations('euro'), euroFeed()]);
  return <p className="euro-quote">{feed ? t('note') : t('unavailable')}</p>;
}
