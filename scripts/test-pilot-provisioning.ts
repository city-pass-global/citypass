import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const db = new PGlite();
try {
  await db.exec(
    "create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;",
  );
  for (const file of (await readdir('supabase/migrations')).sort()) {
    if (file.endsWith('_global_traveler_identity.sql'))
      await db.exec(await readFile('supabase/seed.sql', 'utf8'));
    await db.exec(await readFile(`supabase/migrations/${file}`, 'utf8'));
  }
  const script = await readFile('scripts/provision-pilot-passes.sql', 'utf8');
  await db.exec(script);
  const offers = (
    await db.query<{
      names: Record<string, string>;
      benefits: Record<string, string>;
      amount: string;
      reputation_points: number;
      published: boolean;
    }>(
      'select names,benefits,amount,reputation_points,published from public.destination_pass_offers',
    )
  ).rows;
  assert.equal(offers.length, 8);
  for (const offer of offers) {
    assert.equal(offer.amount, '100');
    assert.equal(offer.reputation_points, 80);
    assert.equal(offer.published, true);
    for (const locale of ['es', 'en', 'pt']) {
      const messages = JSON.parse(await readFile(`messages/${locale}.json`, 'utf8'));
      assert.equal(offer.names[locale], messages.destinationPass.pilotOfferName);
      assert.equal(offer.benefits[locale], messages.destinationPass.pilotOfferBenefits);
    }
  }
  await assert.rejects(db.exec(script));
  await db.exec('rollback');
  assert.equal(
    (await db.query<{ n: number }>('select count(*)::int n from public.destination_pass_offers'))
      .rows[0].n,
    8,
  );
  await db.exec('set role anon');
  const catalogs = await db.query<{ r: { offers: unknown[] } }>(
    "select public.destination_pass_command('catalog',jsonb_build_object('destination_id',id)) r from public.destinations",
  );
  assert.equal(catalogs.rows.length, 8);
  assert.ok(catalogs.rows.every((row) => row.r.offers.length === 1));
  assert.equal((await db.query('select id from public.destination_pass_holdings')).rows.length, 0);
  console.log(
    'Pilot provisioning verified in isolated embedded PostgreSQL: eight localized fixed-price offers, duplicate-run refusal, public RPC discovery, no holdings. No remote writes.',
  );
} finally {
  await db.close();
}
