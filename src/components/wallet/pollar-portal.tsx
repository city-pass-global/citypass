'use client';
import dynamic from 'next/dynamic';
import type { Checkout } from '@/lib/payments/validation';
import { useTranslations } from 'next-intl';
function PortalLoading() {
  const t = useTranslations();
  return (
    <p className="app-caption" role="status">
      {t('appUi.walletFallback')}
    </p>
  );
}
const Portal = dynamic(() => import('./pollar-session'), { ssr: false, loading: PortalLoading });
export function PollarPortal(props: {
  apiKey: string;
  network: 'testnet' | 'mainnet';
  mode: 'login' | 'wallet' | 'logout' | 'checkout' | 'switch';
  checkout?: Checkout;
  merchantView?: boolean;
}) {
  const t = useTranslations();
  return <Portal {...props} loadingLabel={t('pollar.loading')} />;
}
