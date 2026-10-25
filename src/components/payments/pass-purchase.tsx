'use client';
import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { purchaseDestinationPass } from '@/app/pass-actions';
import { Button } from '@/components/ui/button';
export function PassPurchase({ offer, locale }: { offer: string; locale: string }) {
  const t = useTranslations('destinationPass');
  const [state, action, pending] = useActionState(purchaseDestinationPass, {});
  return (
    <form action={action}>
      <input type="hidden" name="offer_id" value={offer} />
      <input type="hidden" name="locale" value={locale} />
      <Button disabled={pending}>{t(pending ? 'preparing' : 'buy')}</Button>
      {state.error ? <p role="alert">{t(`errors.${state.error}`)}</p> : null}
    </form>
  );
}
