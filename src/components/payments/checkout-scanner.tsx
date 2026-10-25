'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { QrCamera } from '@/components/qr-camera';
import { Button } from '@/components/ui/button';
import { checkoutIdFromQr } from '@/lib/payments/validation';
export function CheckoutScanner({ locale }: { locale: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [value, setValue] = useState('');
  const [invalid, setInvalid] = useState(false);
  function open(input: string) {
    const id = checkoutIdFromQr(input, location.origin);
    if (!id) return false;
    router.push(`/${locale}/checkout/${id}`);
    return true;
  }
  return (
    <>
      <QrCamera onScan={open} />
      <form
        className="manual-code-form"
        onSubmit={(event) => {
          event.preventDefault();
          setInvalid(!open(value));
        }}
      >
        <label>
          {t('payments.paste')}
          <input
            name="checkout_link"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={invalid}
            aria-describedby={invalid ? 'checkout-link-error' : undefined}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setInvalid(false);
            }}
            required
            type="url"
            maxLength={2048}
          />
        </label>
        <Button>{t('payments.continue')}</Button>
        {invalid ? (
          <p className="notice error" id="checkout-link-error" role="alert">
            {t('payments.errors.invalid_link')}
          </p>
        ) : null}
      </form>
    </>
  );
}
