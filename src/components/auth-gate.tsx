import { getTranslations } from 'next-intl/server';
import { pollarConfigured, walletConfiguration } from '@/lib/wallet/server';
import { configured } from '@/lib/supabase/server';
import { PollarPortal } from './wallet/pollar-portal';
import { Button } from './ui/button';
import { BookOpen, ShieldCheck } from 'lucide-react';
export async function AuthGate({
  locale: _locale,
  variant = 'default',
}: {
  locale: string;
  variant?: 'default' | 'passport';
}) {
  const t = await getTranslations();
  const config = walletConfiguration();
  const Heading = variant === 'passport' ? 'h1' : 'h2';
  return (
    <div className="auth-gate">
      <span className="auth-symbol" aria-hidden="true">
        <BookOpen size={25} strokeWidth={1.3} />
      </span>
      <Heading>{t(variant === 'passport' ? 'passportAccess.title' : 'loginRequired')}</Heading>
      <p>{t(variant === 'passport' ? 'passportAccess.body' : 'pollar.signInNote')}</p>
      {configured() && pollarConfigured() && config ? (
        <PollarPortal apiKey={config.apiKey} network={config.network} mode="login" />
      ) : (
        <>
          <Button disabled>{t('signIn')}</Button>
          <p>{t('pollar.pollarUnavailable')}</p>
        </>
      )}
      <p className="auth-footnote">
        <ShieldCheck size={15} aria-hidden="true" />
        {t('appUi.authFootnote')}
      </p>
    </div>
  );
}
