'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { QrCamera } from './qr-camera';
import { ActionForm } from './action-form';
import { extractToken } from '@/lib/validation';
export function ClaimForm({ locale }: { locale: string }) {
  const t = useTranslations();
  const [token, setToken] = useState('');
  useEffect(() => {
    setToken(extractToken(location.href, location.origin));
    history.replaceState(null, '', location.pathname);
  }, []);
  return (
    <div className="scan-workbench">
      <QrCamera
        successMessage={t('appUi.codeReady')}
        onScan={(value) => {
          const found = extractToken(value, location.origin);
          if (!found) return false;
          setToken(found);
          return true;
        }}
      />
      <ActionForm locale={locale} command="claim_stamp" label={t('claim')}>
        <label>
          {t('qrCode')}
          <input
            name="token"
            spellCheck={false}
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            pattern="[a-f0-9]{64}"
            autoComplete="off"
          />
        </label>
      </ActionForm>
      <p className="muted">{t('scanNote')}</p>
    </div>
  );
}
