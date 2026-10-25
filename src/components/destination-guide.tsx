import { CollectStamp } from '@/components/collect-stamp';
import { getExplorationClaims } from '@/lib/exploration-server';
import { session } from '@/lib/supabase/server';
import Link from 'next/link';
import { DestinationPlaceArt } from '@/components/destination-place-art';
import { getTranslations } from 'next-intl/server';
import { ArrowUpRight, BookOpen, Leaf, Music, Mountain, Utensils, Waves } from 'lucide-react';
import {
  getDestinationGuide,
  matchesGuideQuery,
  parseGuideFilters,
  type GuideCategory,
} from '@/lib/destination-guides';

const icons = {
  culture: Music,
  nature: Leaf,
  food: Utensils,
  adventure: Mountain,
  wellbeing: Waves,
};

export async function DestinationGuide({
  slug,
  locale,
  path,
  country,
  filters = {},
}: {
  slug: string;
  locale: string;
  path: string;
  country: string;
  filters?: { category?: unknown; q?: unknown };
}) {
  const guide = getDestinationGuide(slug);
  if (!guide) return null;
  const [t, collectionText, claims, user] = await Promise.all([
    getTranslations('destinationGuide'),
    getTranslations('exploration'),
    getExplorationClaims(),
    session(),
  ]);
  const collected = new Set(
    claims.filter((claim) => claim.guide_slug === slug).map((claim) => claim.item_id),
  );
  const { category, q } = parseGuideFilters(filters);
  const categories = [...new Set(guide.items.map((item) => item.category))];
  const items = guide.items.filter(
    (item) =>
      (!category || item.category === category) &&
      matchesGuideQuery(
        q,
        t(`cities.${slug}.items.${item.id}.title`),
        t(`cities.${slug}.items.${item.id}.body`),
      ),
  );
  const href = (value: GuideCategory | '') => {
    const query = new URLSearchParams({
      ...(value ? { category: value } : {}),
      ...(q ? { q } : {}),
    });
    return `${path}${query.size ? `?${query}` : ''}#things-to-do`;
  };
  return (
    <section className="destination-guide" id="things-to-do" aria-labelledby="guide-title">
      <div className="section-heading">
        <div>
          <h2 id="guide-title">{t('title')}</h2>
          <p>{t('intro')}</p>
        </div>
      </div>
      <p role="status">
        {collectionText('progress', { count: collected.size, total: guide.items.length })}
      </p>
      <progress
        value={collected.size}
        max={guide.items.length}
        aria-label={collectionText('progress', {
          count: collected.size,
          total: guide.items.length,
        })}
      />
      <nav className="filters" aria-label={t('filters')}>
        <Link
          href={href('')}
          className={!category ? 'selected' : ''}
          aria-current={!category ? 'page' : undefined}
        >
          {t('categories.all')}
        </Link>
        {categories.map((value) => {
          const Icon = icons[value];
          return (
            <Link
              key={value}
              href={href(value)}
              className={category === value ? 'selected' : ''}
              aria-current={category === value ? 'page' : undefined}
            >
              <Icon size={16} aria-hidden="true" />
              {t(`categories.${value}`)}
            </Link>
          );
        })}
      </nav>
      <form action={`${path}#things-to-do`} className="directory-search">
        <label htmlFor="guide-query">{t('search')}</label>
        <div>
          {category ? <input type="hidden" name="category" value={category} /> : null}
          <input
            id="guide-query"
            type="search"
            name="q"
            maxLength={120}
            defaultValue={q}
            placeholder={t('placeholder')}
          />
          <button type="submit">{t('submit')}</button>
        </div>
      </form>
      <div className="directory-summary" aria-live="polite">
        <p>{t('results', { count: items.length })}</p>
        {category || q ? <Link href={`${path}#things-to-do`}>{t('clear')}</Link> : null}
      </div>
      <ul className="places guide-ideas">
        {items.map((item) => {
          return (
            <li key={item.id}>
              <article className="place">
                <div className="place-art" aria-hidden="true">
                  <DestinationPlaceArt kind={item.art} country={country} />
                </div>
                <div className="place-copy">
                  <span className="tag">{t(`categories.${item.category}`)}</span>
                  <h3>{t(`cities.${slug}.items.${item.id}.title`)}</h3>
                  <p>{t(`cities.${slug}.items.${item.id}.body`)}</p>
                  <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
                    {t('source', { source: t(`cities.${slug}.source`) })}
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </a>
                  <CollectStamp
                    locale={locale}
                    slug={slug}
                    itemId={item.id}
                    title={t(`cities.${slug}.items.${item.id}.title`)}
                    collected={collected.has(item.id)}
                    signedIn={Boolean(user)}
                  />
                </div>
              </article>
            </li>
          );
        })}
      </ul>
      <aside className="guide-planning" aria-labelledby="guide-planning-title">
        <BookOpen size={24} aria-hidden="true" />
        <div>
          <h3 id="guide-planning-title">{t('planning')}</h3>
          <p>{t(`cities.${slug}.tip`)}</p>
        </div>
      </aside>
      <div className="guide-provenance">
        <p>{t('artNote')}</p>
        <p>{t('note')}</p>
        <small>
          {t('checked', {
            date: new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(
              new Date(`${guide.checkedAt}T12:00:00Z`),
            ),
          })}
        </small>
      </div>
    </section>
  );
}
