'use client';
import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { usePollar } from '@pollar/react';
import {
  preparePayment,
  submitPayment,
  reconcilePayment,
  retryPayment,
} from '@/app/[locale]/checkout/[id]/actions';
import type { Checkout } from '@/lib/payments/validation';
import { Button } from '@/components/ui/button';
export function PaymentControls({
  checkout,
  appVerified,
  merchantView = false,
}: {
  checkout: Checkout;
  appVerified: boolean;
  merchantView?: boolean;
}) {
  const t = useTranslations();
  const router = useRouter();
  const { wallet, verified, network, signTx } = usePollar();
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [phase, setPhase] = useState<'signing' | 'submitting' | null>(null);
  const [error, setError] = useState('');
  const [state, setState] = useState(checkout.status);
  const ready =
    appVerified &&
    verified &&
    network === 'testnet' &&
    wallet?.custody === 'internal' &&
    (!wallet.chain || wallet.chain === 'STELLAR') &&
    (wallet.provisioning === 'READY' || wallet.existsOnStellar === true);
  useEffect(() => {
    setState(checkout.status);
  }, [checkout.status]);
  useEffect(() => {
    if (state !== 'submitted' || !appVerified) return;
    let active = true;
    let count = 0;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      const result = await reconcilePayment(checkout.id);
      if (!active) return;
      if (result.status && result.status !== 'submitted') {
        setState(result.status as Checkout['status']);
        router.refresh();
        return;
      }
      if (++count < 12) timer = setTimeout(() => void poll(), 5000);
    };
    timer = setTimeout(() => void poll(), 2000);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [state, appVerified, checkout.id, router]);
  async function pay() {
    if (!ready || inFlight.current || !wallet) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      const prepared = await preparePayment(checkout.id);
      if (prepared.error || !prepared.unsignedXdr) {
        setError(prepared.error ?? 'unavailable');
        router.refresh();
        return;
      }
      setPhase('signing');
      const signed = await signTx(prepared.unsignedXdr);
      if (signed.status !== 'signed') {
        setError('signing');
        return;
      }
      setPhase('submitting');
      const result = await submitPayment(checkout.id, signed.signedXdr);
      if (result.error) setError(result.error);
      if (result.status) setState(result.status as Checkout['status']);
      router.refresh();
    } catch {
      setError('unavailable');
    } finally {
      inFlight.current = false;
      setPhase(null);
      setBusy(false);
    }
  }
  async function check(retry = false) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      const result = retry ? await retryPayment(checkout.id) : await reconcilePayment(checkout.id);
      if (result.error) setError(result.error);
      if (result.status) setState(result.status as Checkout['status']);
      router.refresh();
    } catch {
      setError('unavailable');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="payment-controls">
      <p role="status">{t(`payments.status.${state}`)}</p>
      {phase ? <p role="status">{t(`payments.${phase}`)}</p> : null}
      {error ? (
        <p role="alert">
          {t.has(`payments.errors.${error}`)
            ? t(`payments.errors.${error}`)
            : t('payments.errors.unavailable')}
        </p>
      ) : null}
      {state === 'created' || state === 'prepared' ? (
        merchantView ? (
          <p>{t('payments.awaiting')}</p>
        ) : (
          <>
            <p>{t('payments.fees')}</p>
            <Button disabled={!ready || busy} onClick={() => void pay()}>
              {busy ? t('saving') : t('payments.pay')}
            </Button>
            {!ready ? <p>{t('payments.walletWait')}</p> : null}
          </>
        )
      ) : null}
      {state === 'submitted' ? (
        <>
          <p>{t('payments.pendingNote')}</p>
          <Button disabled={!appVerified || busy} onClick={() => void check()}>
            {t('payments.check')}
          </Button>
          <Button
            variant="outline"
            disabled={!ready || busy || merchantView}
            onClick={() => void check(true)}
          >
            {t('payments.retrySubmit')}
          </Button>
        </>
      ) : null}
    </div>
  );
}
