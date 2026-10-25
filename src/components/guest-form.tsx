'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { guestSchema, type GuestInput } from '@/lib/validation';
import { submitGuest } from '@/app/actions';
import { Button } from './ui/button';
export function GuestForm() {
  const t = useTranslations();
  const [result, setResult] = useState('');
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<GuestInput>({ resolver: zodResolver(guestSchema), defaultValues: { requests: '' } });
  useEffect(() => {
    const token = new URLSearchParams(location.hash.slice(1)).get('token') ?? '';
    setValue('token', token);
    history.replaceState(null, '', location.pathname);
  }, [setValue]);
  if (done)
    return (
      <div className="notice">
        <h2>{t('guestSuccess')}</h2>
        <p>{t('guestSuccessBody')}</p>
      </div>
    );
  const fields = [
    'email',
    'full_name',
    'phone',
    'nationality',
    'residence',
    'arrival_time',
  ] as const;
  return (
    <form
      className="form-grid"
      onSubmit={handleSubmit(async (values) => {
        const r = await submitGuest(values);
        if (r.success) setDone(true);
        else setResult(r.error ?? 'unavailable');
      })}
    >
      <input type="hidden" {...register('token')} />
      {fields.map((field) => (
        <label key={field}>
          {t(`fields.${field}`)}
          <input
            {...register(field)}
            aria-describedby={errors[field] ? `guest-${field}-error` : undefined}
            type={
              field === 'email'
                ? 'email'
                : field === 'arrival_time'
                  ? 'time'
                  : field === 'phone'
                    ? 'tel'
                    : 'text'
            }
            autoComplete={
              field === 'email'
                ? 'email'
                : field === 'full_name'
                  ? 'name'
                  : field === 'phone'
                    ? 'tel'
                    : field === 'residence'
                      ? 'country-name'
                      : 'off'
            }
            aria-invalid={Boolean(errors[field])}
          />
          {errors[field] && (
            <small id={`guest-${field}-error`} className="error" role="alert">
              {t('errors.invalid')}
            </small>
          )}
        </label>
      ))}
      <label className="wide">
        {t('fields.requests')}
        <textarea {...register('requests')} maxLength={1000} />
      </label>
      <label className="checkbox wide">
        <input type="checkbox" {...register('consent')} />
        {t('consent')}
      </label>
      {(errors.consent || errors.token) && (
        <p role="alert" className="error wide">
          {errors.token ? t('errors.invalid_invitation') : t('consentRequired')}
        </p>
      )}
      <p className="muted wide">{t('privacyNote')}</p>
      <Button disabled={isSubmitting}>{isSubmitting ? t('saving') : t('submitGuest')}</Button>
      {result && (
        <p role="alert">
          {t.has(`errors.${result}`) ? t(`errors.${result}`) : t('errors.unavailable')}
        </p>
      )}
    </form>
  );
}
