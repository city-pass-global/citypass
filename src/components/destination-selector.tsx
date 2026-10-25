'use client';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { selectDestination } from '@/app/destination-actions';
type Choice = { slug: string; name: string; country: string };
function SelectionButton() {
  const { pending } = useFormStatus();
  const t = useTranslations('destinationContext');
  return (
    <button className="button outline" disabled={pending}>
      {pending ? t('changing') : t('choose')}
    </button>
  );
}
export function DestinationSelector({
  locale,
  selected,
  choices,
}: {
  locale: string;
  selected: string;
  choices: Choice[];
}) {
  const t = useTranslations('destinationContext');
  return (
    <form className="destination-selector" action={selectDestination.bind(null, locale)}>
      <label htmlFor="global-destination">{t('label')}</label>
      <select key={selected} id="global-destination" name="slug" defaultValue={selected} required>
        {choices.map((choice) => (
          <option key={choice.slug} value={choice.slug}>
            {choice.name}, {choice.country}
          </option>
        ))}
      </select>
      <SelectionButton />
    </form>
  );
}
