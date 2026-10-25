'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PollarProvider, usePollar } from '@pollar/react';
import '@pollar/react/styles.css';
import { exchangePollarSession, closePollarSession } from '@/app/pollar-actions';
import { PaymentControls } from '@/components/payments/payment-controls';
import type { Checkout } from '@/lib/payments/validation';
import { Button } from '@/components/ui/button';
import { Wallet, ArrowDownLeft, ArrowUpRight, History, ArrowLeftRight, LogOut } from 'lucide-react';
type Props = {
  apiKey: string;
  network: 'testnet' | 'mainnet';
  mode: 'login' | 'wallet' | 'logout' | 'checkout' | 'switch';
  checkout?: Checkout;
  merchantView?: boolean;
  loadingLabel: string;
};
export default function PollarSession(props: Props) {
  const [oauthUrl, setOauthUrl] = useState<string | null>(null);
  const [config] = useState(() => ({
    apiKey: props.apiKey,
    stellarNetwork: props.network,
    confirmation: 'prompt' as const,
    logLevel: 'silent' as const,
    openAuthUrl: async ({ getUrl }: { getUrl: () => Promise<string | null> }) => {
      // Reserve the window while the click still carries browser activation.
      const popup = window.open('about:blank', '_blank');
      if (popup) popup.opener = null;
      setOauthUrl(null);
      const url = await getUrl();
      if (!url) {
        popup?.close();
        return;
      }
      if (popup) popup.location.href = url;
      else setOauthUrl(url);
    },
  }));
  return (
    <PollarProvider client={config}>
      <SessionControls {...props} oauthUrl={oauthUrl} />
    </PollarProvider>
  );
}
function SessionControls({
  mode,
  network,
  loadingLabel,
  checkout,
  merchantView,
  oauthUrl,
}: Props & { oauthUrl: string | null }) {
  const t = useTranslations();
  const router = useRouter();
  const {
    getClient,
    isAuthenticated,
    verified,
    wallet,
    login,
    configStatus,
    retryConfig,
    openReceiveModal,
    openSendModal,
    openTxHistoryModal,
    openWalletBalanceModal,
    openSwapModal,
  } = usePollar();
  const client = getClient();
  const [authStep, setAuthStep] = useState(client.getAuthState().step);
  const lastToken = useRef('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [appVerified, setAppVerified] = useState(false);
  const [swapAvailable, setSwapAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    if (mode !== 'wallet' || !isAuthenticated || !verified) return;
    let active = true;
    void client
      .getSwapConfig()
      .then((venues) => {
        if (active) setSwapAvailable(venues.length > 0);
      })
      .catch(() => {
        if (active) setSwapAvailable(false);
      });
    return () => {
      active = false;
    };
  }, [client, mode, isAuthenticated, verified]);
  const inFlight = useRef<Promise<void> | null>(null);
  const ending = useRef(false);
  const sync = useCallback(async () => {
    if (ending.current || inFlight.current) return;
    const run = async () => {
      while (!ending.current) {
        const state = client.getAuthState();
        if (
          state.step !== 'authenticated' ||
          !state.verified ||
          lastToken.current === state.session.token.accessToken
        )
          return;
        const token = state.session.token.accessToken;
        lastToken.current = token;
        setBusy(true);
        setError('');
        setAppVerified(false);
        const result = await exchangePollarSession(token);
        if (result.error) {
          lastToken.current = '';
          setError(result.error);
          setBusy(false);
          return;
        }
        const current = client.getAuthState();
        if (
          !ending.current &&
          current.step === 'authenticated' &&
          current.verified &&
          current.session.token.accessToken === token
        ) {
          setAppVerified(true);
          if (mode === 'login') {
            // Refresh the entire account-dependent shell after login/registration.
            // The login route then redirects using the newly verified server session.
            window.location.reload();
            return;
          }
          router.refresh();
          setBusy(false);
          return;
        }
        // A refresh/account change waits for the prior exchange before issuing another.
      }
    };
    inFlight.current = run();
    try {
      await inFlight.current;
    } finally {
      inFlight.current = null;
    }
  }, [client, mode, router]);
  useEffect(() => {
    void sync();
    return client.onAuthStateChange((state) => {
      setAuthStep(state.step);
      if (state.step === 'authenticated' && state.verified) void sync();
    });
  }, [client, sync]);
  async function signOut() {
    ending.current = true;
    setBusy(true);
    setError('');
    await inFlight.current;
    const result = await closePollarSession();
    if (result.error) {
      ending.current = false;
      setError(result.error);
      setBusy(false);
      return;
    }
    lastToken.current = '';
    setAppVerified(false);
    await client.logout();
    ending.current = false;
    router.refresh();
    setBusy(false);
  }
  const ready =
    appVerified &&
    !error &&
    isAuthenticated &&
    verified &&
    wallet?.custody === 'internal' &&
    (!wallet.chain || wallet.chain === 'STELLAR') &&
    (wallet.provisioning === 'READY' || wallet.existsOnStellar === true);
  return (
    <div className="pollar-controls">
      {error ? <p role="alert">{t(`pollar.${error}`)}</p> : null}
      {configStatus === 'error' ? (
        <Button variant="outline" onClick={retryConfig}>
          {t('pollar.retry')}
        </Button>
      ) : null}
      {mode === 'switch' && isAuthenticated ? (
        <Button variant="outline" disabled={busy} onClick={() => void signOut()}>
          {t('pollar.switchAccount')}
        </Button>
      ) : mode === 'logout' ? (
        <Button variant="outline" disabled={busy} onClick={signOut}>
          <LogOut size={17} aria-hidden="true" />
          {t('signOut')}
        </Button>
      ) : !isAuthenticated ? (
        <>
          {authStep === 'error' ? <p role="alert">{t('pollar.pollarSession')}</p> : null}
          {oauthUrl ? (
            <>
              <p role="status">{t('pollar.openGoogleNote')}</p>
              <Button onClick={() => window.open(oauthUrl, '_blank', 'noopener,noreferrer')}>
                {t('pollar.openGoogle')}
              </Button>
            </>
          ) : (
            <Button
              disabled={busy || configStatus !== 'ready'}
              onClick={() => login({ provider: 'google' })}
            >
              {t('signIn')}
            </Button>
          )}
          {['creating_session', 'opening_oauth', 'authenticating'].includes(authStep) ? (
            <p role="status">{t('pollar.googleWait')}</p>
          ) : null}
        </>
      ) : (
        <>
          {busy || !verified ? <p role="status">{loadingLabel}</p> : null}
          {error ? (
            <Button onClick={() => void sync()} disabled={busy}>
              {t('pollar.retry')}
            </Button>
          ) : null}
          {mode === 'checkout' && checkout && verified ? (
            <PaymentControls
              checkout={checkout}
              appVerified={appVerified}
              merchantView={merchantView}
            />
          ) : null}
          {mode === 'wallet' && verified ? (
            <>
              <details className="pass-details">
                <summary>{t('payments.networkDetails')}</summary>
                <p>{t(network === 'testnet' ? 'pollar.testnet' : 'pollar.mainnet')}</p>
              </details>
              <p>{t('pollar.custody')}</p>
              {wallet ? (
                <label>
                  {t('pollar.address')}
                  <input
                    readOnly
                    value={wallet.address}
                    onFocus={(event) => event.target.select()}
                  />
                </label>
              ) : (
                <p role="status">{t('pollar.creating')}</p>
              )}
              {wallet && !ready ? <p role="status">{t('pollar.creating')}</p> : null}
              <div className="inline-actions">
                <Button disabled={!ready || busy} onClick={openWalletBalanceModal}>
                  <Wallet size={18} aria-hidden="true" />
                  {t('pollar.balance')}
                </Button>
                <Button variant="outline" disabled={!ready || busy} onClick={openReceiveModal}>
                  <ArrowDownLeft size={18} aria-hidden="true" />
                  {t('pollar.receive')}
                </Button>
                <Button variant="outline" disabled={!ready || busy} onClick={openSendModal}>
                  <ArrowUpRight size={18} aria-hidden="true" />
                  {t('pollar.send')}
                </Button>
                <Button variant="outline" disabled={!ready || busy} onClick={openTxHistoryModal}>
                  <History size={18} aria-hidden="true" />
                  {t('pollar.history')}
                </Button>
                <Button
                  variant="ghost"
                  disabled={!ready || busy || !swapAvailable}
                  onClick={openSwapModal}
                >
                  <ArrowLeftRight size={18} aria-hidden="true" />
                  {t(swapAvailable === false ? 'pollar.swapUnavailable' : 'pollar.swap')}
                </Button>
              </div>
              <p className="muted">{t('pollar.availability')}</p>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
