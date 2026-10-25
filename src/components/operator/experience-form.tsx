'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { experienceAction, type ExperienceResult } from '@/app/[locale]/operator/actions';
import type { Experience } from '@/lib/experiences/validation';
import { Button } from '@/components/ui/button';
export function ExperienceForm({
  locale,
  action,
  commandId,
  destination,
  item,
}: {
  locale: string;
  action: 'create' | 'save' | 'publish' | 'withdraw';
  commandId: string;
  destination?: string;
  item?: Experience;
}) {
  const t = useTranslations('operator');
  const td = useTranslations('demo');
  const [state, submit, pending] = useActionState(
    experienceAction.bind(null, locale, action),
    {} as ExperienceResult,
  );
  const content = action === 'create' || action === 'save';
  return (
    <form action={submit} className="action-form experience-form">
      <input type="hidden" name="command_id" value={commandId} />
      {destination ? <input type="hidden" name="destination_id" value={destination} /> : null}
      {item ? (
        <>
          <input type="hidden" name="experience_id" value={item.id} />
          <input type="hidden" name="expected_version" value={item.version} />
        </>
      ) : null}
      {content ? (
        <>
          {(['es', 'en', 'pt'] as const).map((language) => (
            <fieldset key={language}>
              <legend>{t(`languages.${language}`)}</legend>
              <label>
                {t('name')}
                <input
                  name={`title_${language}`}
                  defaultValue={item?.titles[language] ?? ''}
                  required
                  minLength={2}
                  maxLength={120}
                />
              </label>
              <label>
                {t('description')}
                <textarea
                  name={`description_${language}`}
                  defaultValue={item?.descriptions[language] ?? ''}
                  required
                  minLength={20}
                  maxLength={3000}
                  rows={4}
                />
              </label>
            </fieldset>
          ))}
          <label>
            {t('bookingUrl')}
            <input
              type="url"
              name="booking_url"
              disabled={item?.is_demo}
              defaultValue={item?.booking_url ?? ''}
              maxLength={2048}
            />
          </label>
          {item?.is_demo ? (
            <>
              <input type="hidden" name="booking_url" value="" />
              <p>{td('noProvider')}</p>
            </>
          ) : (
            <p>{t('bookingHelp')}</p>
          )}
        </>
      ) : (
        <label className="review-confirm">
          <input type="checkbox" name="confirmed" required />
          {t(action === 'publish' ? 'publishConfirmation' : 'withdrawConfirmation')}
        </label>
      )}
      <Button
        variant={action === 'withdraw' ? 'outline' : 'default'}
        disabled={pending || Boolean(action === 'create' && state.id)}
      >
        {pending ? t('saving') : t(`actions.${action}`)}
      </Button>
      {state.error ? (
        <p role="alert">
          {t.has(`errors.${state.error}`) ? t(`errors.${state.error}`) : t('errors.unavailable')}
        </p>
      ) : null}
      {state.id ? (
        <p role="status">
          {t('saved')}{' '}
          {action === 'create' ? (
            <Link href={`/${locale}/operator/${state.id}`}>{t('edit')}</Link>
          ) : null}
        </p>
      ) : null}
    </form>
  );
}
