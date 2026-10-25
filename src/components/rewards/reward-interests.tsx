'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Coffee, Compass, Flower2, Heart, Check } from 'lucide-react';
const concepts = [
  { id: 'flavors', Icon: Coffee },
  { id: 'experiences', Icon: Compass },
  { id: 'crafts', Icon: Flower2 },
] as const;
type Interest = (typeof concepts)[number]['id'];
export function RewardInterests({
  destination = 'puerto-iguazu',
  city = 'Iguazú',
}: {
  destination?: string;
  city?: string;
}) {
  const storageKey =
    destination === 'puerto-iguazu'
      ? 'iguazu:reward-interests'
      : `citypassport:reward-interests:${destination}`;
  const journey = useTranslations('destinationJourneys');
  const title = (id: Interest) =>
    destination === 'puerto-iguazu'
      ? t(`concepts.${id}.title`)
      : journey(`rewards.${id}.title`, { destination: city });
  const body = (id: Interest) =>
    destination === 'puerto-iguazu'
      ? t(`concepts.${id}.body`)
      : journey(`rewards.${id}.body`, { destination: city });
  const t = useTranslations('rewardGuide');
  const [selected, setSelected] = useState<Interest[]>([]);
  const [filter, setFilter] = useState<'all' | 'saved'>('all');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
      if (Array.isArray(stored))
        setSelected(concepts.filter((c) => stored.includes(c.id)).map((c) => c.id));
    } catch {
      setError(true);
    }
    setReady(true);
  }, [storageKey]);
  function toggle(id: Interest) {
    const next = selected.includes(id)
      ? selected.filter((value) => value !== id)
      : [...selected, id];
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setSelected(next);
      setError(false);
    } catch {
      setError(true);
    }
  }
  const visible = concepts.filter((c) => filter === 'all' || selected.includes(c.id));
  return (
    <section className="reward-interests" aria-labelledby="reward-ideas-title">
      <div className="reward-section-heading">
        <div>
          <h2 id="reward-ideas-title">{t('ideasTitle')}</h2>
          <p>{t('ideasBody')}</p>
        </div>
        <span className="reward-interest-count">
          <Heart size={16} />
          {t('count', { count: selected.length })}
        </span>
      </div>
      <div className="reward-filters" role="group" aria-label={t('filterLabel')}>
        <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
          {t('all')}
        </button>
        <button
          type="button"
          disabled={!ready}
          aria-pressed={filter === 'saved'}
          onClick={() => setFilter('saved')}
        >
          {t('savedFilter')}
        </button>
      </div>
      <div className="reward-concepts">
        {visible.map(({ id, Icon }) => (
          <article className={`reward-concept reward-${id}`} key={id}>
            <div className="reward-concept-art" aria-hidden="true">
              <Icon size={54} strokeWidth={1.2} />
              <span className="reward-art-ring" />
            </div>
            <div className="reward-concept-copy">
              <span className="reward-proposal">{t('proposal')}</span>
              <h3>{title(id)}</h3>
              <p>{body(id)}</p>
              <small>{t('termsPending')}</small>
              <button
                type="button"
                disabled={!ready}
                aria-pressed={selected.includes(id)}
                aria-label={t(selected.includes(id) ? 'removeNamed' : 'saveNamed', {
                  name: title(id),
                })}
                onClick={() => toggle(id)}
              >
                {selected.includes(id) ? <Check size={17} /> : <Heart size={17} />}{' '}
                {t(selected.includes(id) ? 'interested' : 'interest')}
              </button>
            </div>
          </article>
        ))}
      </div>
      {visible.length === 0 && (
        <div className="reward-no-interests">
          <Heart size={28} />
          <h3>{t('emptyTitle')}</h3>
          <p>{t('emptyBody')}</p>
          <button type="button" onClick={() => setFilter('all')}>
            {t('all')}
          </button>
        </div>
      )}
      <p className="reward-local-note" role="status">
        {t(error ? 'storageError' : 'localNote')}
      </p>
    </section>
  );
}
