import { describe, expect, it } from 'vitest';
import { explorationSchema } from '../src/lib/exploration';
import { getDestinationGuide } from '../src/lib/destination-guides';
import { readFileSync } from 'node:fs';

describe('exploration claims', () => {
  it('accepts only an existing idea in its own city', () => {
    expect(explorationSchema.safeParse({ guide_slug: 'lisbon', item_id: 'alfama' }).success).toBe(true);
    for (const input of [
      { guide_slug: 'porto', item_id: 'alfama' },
      { guide_slug: '__proto__', item_id: 'alfama' },
      { guide_slug: 'lisbon', item_id: 'invented' },
      { guide_slug: 'lisbon', item_id: 'x'.repeat(1000) },
    ]) expect(explorationSchema.safeParse(input).success).toBe(false);
  });
  it('keeps the database allowlist synchronized with all editorial ideas', () => {
    const messages = JSON.parse(readFileSync('messages/en.json', 'utf8'));
    const migration = readFileSync('supabase/migrations/20261025215950_exploration_stamps.sql', 'utf8');
    for (const slug of Object.keys(messages.destinationGuide.cities)) {
      for (const item of getDestinationGuide(slug)?.items ?? []) {
        expect(migration).toContain(`('${slug}','${item.id}')`);
      }
    }
  });
});
