import { testMerchantServices } from './test-services-db';
import { testX402Database } from './test-x402-db';
import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
import { createHash, createHmac } from 'node:crypto';
import assert from 'node:assert/strict';
import { Keypair } from '@stellar/stellar-sdk';
import { inquiryDetailSchema, inquiryQueueSchema } from '../src/lib/inquiries/validation';
import { operatorQueueSchema } from '../src/lib/experiences/validation';
import { reviewQueueSchema, reviewerContextSchema } from '../src/lib/review/validation';
import { TESTNET_USDC_ISSUER } from '../src/lib/payments/validation';
import { passAccountSchema } from '../src/lib/passes/validation';
const db = new PGlite();
let checks = 0;
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const admin = async () =>
  db.exec("reset role; select set_config('request.jwt.claim.sub','',false)");
const as = async (id: string | null) => {
  await db.exec('reset role');
  // Test identities use the same hashed session lookup as real Pollar sessions.
  const raw = id ? hash('test-session:' + id) : null;
  if (id) {
    await db.query('insert into public.user_profiles(id) values($1) on conflict do nothing', [id]);
    await db.query(
      "insert into private.app_sessions(token_hash,user_id,expires_at) values($1,$2,now()+interval '1 hour') on conflict(token_hash) do update set expires_at=excluded.expires_at,revoked_at=null",
      [hash(raw!), id],
    );
  }
  await db.query("select set_config('request.headers',$1,false)", [
    JSON.stringify(raw ? { 'x-citypassport-session': raw } : {}),
  ]);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id ?? '']);
  await db.exec('set role anon');
};
const check = (condition: unknown, name: string) => {
  assert.ok(condition, name);
  checks++;
  console.log(`✓ ${name}`);
};
const rpc = async (action: string, payload: object) => {
  const { rows } = await db.query<{ r: Record<string, unknown> }>(
    'select public.passport_command($1,$2::jsonb) as r',
    [action, JSON.stringify(payload)],
  );
  return rows[0].r;
};
const denied = async (sql: string) => {
  try {
    await db.exec(sql);
    return false;
  } catch {
    return true;
  }
};
try {
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`,
  );
  const legacyUser = '30000000-0000-4000-8000-000000000099';
  const legacyPassport = '50000000-0000-4000-8000-000000000099';
  for (const file of (await readdir('supabase/migrations')).sort()) {
    if (file.endsWith('_global_traveler_identity.sql')) {
      await db.query('insert into auth.users values($1)', [legacyUser]);
      await db.exec(await readFile('supabase/seed.sql', 'utf8'));
      await db.query(
        "insert into public.passport_profiles(id,user_id,destination_id) select $1,$2,id from public.destinations where slug='puerto-iguazu'",
        [legacyPassport, legacyUser],
      );
    }
    await db.exec(await readFile(`supabase/migrations/${file}`, 'utf8'));
  }
  check(
    (await db.query('select id from public.passport_profiles where id=$1', [legacyPassport])).rows
      .length === 1,
    'migration preserves legacy passport ID',
  );
  check(
    (await db.query('select id from public.traveler_profiles where user_id=$1', [legacyUser])).rows
      .length === 1,
    'migration backfills global identity',
  );
  await db.exec(await readFile('supabase/seed.sql', 'utf8'));
  await as(null);
  check(
    (await db.query('select * from public.countries')).rows.length === 4,
    'anonymous can browse four countries',
  );
  check(
    (await db.query('select * from public.destinations')).rows.length === 8,
    'anonymous can browse eight destinations',
  );
  check(
    await denied("insert into public.countries values ('XX','{}','XXX')"),
    'anonymous cannot create countries',
  );
  await admin();
  check(
    await denied(
      'insert into public.destinations(slug,name,names,timezone,country_code) values (\'invalid-zone\',\'Test\',\'{"es":"Test","en":"Test","pt":"Test"}\',\'Invalid/Zone\',\'AR\')',
    ),
    'invalid destination timezone rejected',
  );
  check(
    await denied(
      "insert into public.destinations(slug,name,names,country_code) values ('invalid-language','Test','{\"es\":\"Test\"}','AR')",
    ),
    'missing destination languages rejected',
  );
  check(
    (
      await db.query(
        "select v.id from public.venues v join public.destinations d on d.id=v.destination_id where d.slug='lisbon'",
      )
    ).rows.length === 0,
    'new destination has no fabricated listings',
  );
  const owner = '30000000-0000-4000-8000-000000000001',
    other = '30000000-0000-4000-8000-000000000002',
    tourist = '30000000-0000-4000-8000-000000000003',
    tourist2 = '30000000-0000-4000-8000-000000000004',
    merchant = '30000000-0000-4000-8000-000000000005';
  const dest = '10000000-0000-4000-8000-000000000001';
  for (const id of [owner, other, tourist, tourist2, merchant]) {
    await db.query('insert into auth.users values($1)', [id]);
    await db.query('insert into public.user_profiles(id) values($1)', [id]);
  }
  await as(null);
  check(
    (await rpc('create_hotel', { name: 'Unauthorized', destination_id: dest })).error ===
      'unauthorized',
    'anonymous cannot onboard a hotel',
  );
  check(
    (await db.query('select * from public.hotel_reservations')).rows.length === 0,
    'anonymous cannot read reservations',
  );
  await as(owner);
  const org = (await rpc('create_hotel', { name: 'Pilot Hotel', destination_id: dest }))
    .id as string;
  check(Boolean(org), 'owner onboarding persists organization and membership');
  const arrival = new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    departure = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const reservation = (
    await rpc('create_reservation', {
      organization_id: org,
      reference: 'PILOT-01',
      email: 'Guest@example.com',
      arrival,
      departure,
      guest_count: 2,
    })
  ).id as string;
  check(Boolean(reservation), 'hotel creates real reservation');
  const secret = 'a'.repeat(64);
  check(
    (await rpc('issue_invitation', { reservation_id: reservation, token: secret })).ok,
    'hotel issues invitation',
  );
  await as(other);
  check(
    (await db.query('select * from public.hotel_reservations')).rows.length === 0,
    'other hotel user cannot read reservation',
  );
  check(
    (await rpc('issue_invitation', { reservation_id: reservation, token: 'b'.repeat(64) }))
      .error === 'forbidden',
    'other user cannot issue invitation',
  );
  check(
    await denied(`insert into public.organization_members values('${org}','${other}','owner')`),
    'user cannot grant themselves ownership',
  );
  await admin();
  await db.query("insert into public.organization_members values($1,$2,'merchant')", [
    org,
    merchant,
  ]);
  await as(merchant);
  check(
    (await db.query('select * from public.hotel_reservations')).rows.length === 0,
    'merchant membership does not confer guest access',
  );
  await as(null);
  const guest = {
    token: secret,
    email: 'guest@example.com',
    full_name: 'Test Guest',
    phone: '123456',
    nationality: 'Argentina',
    residence: 'Argentina',
    arrival_time: '14:30',
    requests: '',
    consent: true,
  };
  check(
    (await rpc('submit_precheckin', { ...guest, email: 'wrong@example.com' })).error ===
      'invalid_invitation',
    'invitation requires matching reservation email',
  );
  check(
    (await rpc('submit_precheckin', guest)).ok,
    'anonymous guest submits with valid capability',
  );
  check(
    (await rpc('submit_precheckin', guest)).error === 'invalid_invitation',
    'consumed invitation rejects replay',
  );
  await as(owner);
  check(
    (await db.query('select * from public.precheckin_submissions')).rows.length === 1,
    'own hotel reads submission',
  );
  check(
    (await rpc('review_reservation', { reservation_id: reservation, status: 'completed' }))
      .error === 'invalid_state',
    'cannot skip review states',
  );
  check(
    (await rpc('review_reservation', { reservation_id: reservation, status: 'reviewed' })).ok,
    'hotel reviews submission',
  );
  await as(other);
  check(
    (await db.query('select * from public.precheckin_submissions')).rows.length === 0,
    'cross-tenant guest data remains hidden',
  );
  await admin();
  const invitation = (
    await db.query<{ token_hash: string }>('select token_hash from private.precheckin_invitations')
  ).rows[0];
  check(
    invitation.token_hash === hash(secret) && invitation.token_hash !== secret,
    'only hashed invitation token is stored',
  );
  await db.query("update public.organizations set status='approved' where id=$1", [org]);
  const venue = '20000000-0000-4000-8000-000000000001',
    stamp = '40000000-0000-4000-8000-000000000001';
  await db.query(
    "update public.venues set organization_id=$1,participation_status='participating' where id=$2",
    [org, venue],
  );
  await db.query(
    "insert into public.stamp_definitions(id,venue_id,destination_id,name) values($1,$2,$3,'Pilot stamp')",
    [stamp, venue, dest],
  );
  const qr = 'c'.repeat(64);
  await as(owner);
  check(
    (await rpc('issue_qr', { stamp_id: stamp, token: qr })).ok,
    'approved venue owner issues QR',
  );
  await as(tourist);
  check(
    (await rpc('claim_stamp', { token: qr })).error === 'activate_first',
    'claim requires global passport activation',
  );
  const passport = (await rpc('activate_passport', { destination_id: dest })).id as string;
  check(Boolean((await rpc('claim_stamp', { token: qr })).id), 'authorized claim persists stamp');
  check(
    (await rpc('claim_stamp', { token: qr })).error === 'already_claimed',
    'duplicate claim is rejected',
  );
  check(
    await denied(
      `insert into public.stamp_claims(passport_id,stamp_id,destination_id,credential_id) select '${passport}','${stamp}','${dest}',id from private.qr_credentials`,
    ),
    'direct claim injection denied',
  );
  check(
    (await db.query('select * from public.stamp_claims')).rows.length === 1,
    'tourist sees own stamp',
  );
  await as(tourist2);
  await rpc('activate_passport', { destination_id: dest });
  check(
    (await db.query('select * from public.stamp_claims')).rows.length === 0,
    'tourist cannot see another passport history',
  );
  await admin();
  await db.exec('update private.qr_credentials set max_claims=1');
  await as(tourist2);
  check((await rpc('claim_stamp', { token: qr })).error === 'limit', 'global capacity enforced');
  await admin();
  await db.exec(
    "update private.qr_credentials set max_claims=100,expires_at=now()-interval '1 second'",
  );
  await as(tourist2);
  check((await rpc('claim_stamp', { token: qr })).error === 'invalid_qr', 'expired QR denied');
  await admin();
  await db.exec("update private.qr_credentials set expires_at=now()+interval '1 day'");
  await as(owner);
  await rpc('revoke_qr', { stamp_id: stamp });
  await as(tourist2);
  check((await rpc('claim_stamp', { token: qr })).error === 'invalid_qr', 'revoked QR denied');
  for (let i = 0; i < 10; i++) await rpc('claim_stamp', { token: '0'.repeat(64) });
  check(
    (await rpc('claim_stamp', { token: qr })).error === 'rate_limit',
    'failed claims consume persistent rate-limit budget',
  );
  await admin();
  const rls = await db.query<{ relname: string }>(
    "select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private') and c.relkind='r' and not c.relrowsecurity",
  );
  check(rls.rows.length === 0, 'every application table has RLS');
  await as(owner);
  check(
    await denied('update public.points_ledger set delta=999'),
    'client cannot mutate points ledger',
  );
  await as(owner);
  const r2 = (
    await rpc('create_reservation', {
      organization_id: org,
      reference: 'PILOT-02',
      email: 'guest@example.com',
      arrival,
      departure,
      guest_count: 1,
    })
  ).id;
  const oldToken = 'd'.repeat(64),
    newToken = 'e'.repeat(64);
  await rpc('issue_invitation', { reservation_id: r2, token: oldToken });
  await rpc('issue_invitation', { reservation_id: r2, token: newToken });
  await as(null);
  check(
    (await rpc('submit_precheckin', { ...guest, token: oldToken })).error === 'invalid_invitation',
    'reissue invalidates old link',
  );
  for (let i = 0; i < 5; i++)
    await rpc('submit_precheckin', { ...guest, token: newToken, email: 'wrong@example.com' });
  check(
    (await rpc('submit_precheckin', { ...guest, token: newToken })).error === 'invalid_invitation',
    'five wrong email attempts lock invitation',
  );
  await as(owner);
  await rpc('issue_invitation', { reservation_id: r2, token: 'f'.repeat(64) });
  await admin();
  await db.query(
    "update private.precheckin_invitations set expires_at=now()-interval '1 second' where reservation_id=$1",
    [r2],
  );
  await as(null);
  check(
    (await rpc('submit_precheckin', { ...guest, token: 'f'.repeat(64) })).error ===
      'invalid_invitation',
    'expired invitation cannot submit',
  );
  await as(owner);
  await rpc('issue_invitation', { reservation_id: r2, token: '9'.repeat(64) });
  await rpc('review_reservation', { reservation_id: r2, status: 'cancelled' });
  await as(null);
  check(
    (await rpc('submit_precheckin', { ...guest, token: '9'.repeat(64) })).error ===
      'invalid_invitation',
    'cancelled reservation rejects guest submission',
  );
  await as(owner);
  check(
    (await rpc('review_reservation', { reservation_id: reservation, status: 'ready_for_arrival' }))
      .ok,
    'reviewed reservation becomes ready',
  );
  check(
    (await rpc('review_reservation', { reservation_id: reservation, status: 'completed' })).ok,
    'ready reservation completes',
  );
  await admin();
  await db.query(
    "insert into public.points_ledger(passport_id,funding_organization_id,delta,kind,transaction_reference) values($1,$2,10,'earned','test-only')",
    [passport, org],
  );
  check(
    await denied('update public.points_ledger set delta=20'),
    'ledger rejects privileged updates as well',
  );
  await db.query("update public.organizations set status='pending' where id=$1", [org]);
  await as(owner);
  check(
    (await rpc('issue_qr', { stamp_id: stamp, token: '8'.repeat(64) })).error === 'forbidden',
    'unapproved partner cannot issue QR',
  );
  await as(null);
  check(
    (await rpc('activate_traveler', {})).error === 'unauthorized',
    'anonymous global activation denied',
  );
  check(
    (await db.query('select * from public.traveler_profiles')).rows.length === 0,
    'anonymous global profile reads denied',
  );
  await as(legacyUser);
  const legacyIdentity = (await rpc('activate_traveler', {})).id;
  check(
    (await rpc('activate_traveler', {})).id === legacyIdentity,
    'backfilled identity survives repeated activation',
  );
  await admin();
  const globalUser = '30000000-0000-4000-8000-000000000088';
  await db.query('insert into auth.users values($1)', [globalUser]);
  await as(globalUser);
  const identity = (await rpc('activate_traveler', { user_id: tourist })).id;
  check(Boolean(identity), 'global activation derives identity from session');
  check(
    (await rpc('activate_traveler', {})).id === identity,
    'global activation replay returns same identity',
  );
  check(
    (await db.query('select * from public.traveler_profiles')).rows.length === 1,
    'global profile reads are owner scoped',
  );
  check(
    (await db.query('select * from public.passport_profiles')).rows.length === 0,
    'global activation needs no destination collection',
  );
  check(
    await denied("insert into public.traveler_profiles(user_id) values('" + tourist + "')"),
    'direct global profile creation denied',
  );
  check(
    await denied('update public.traveler_profiles set user_id=user_id'),
    'direct identity reassignment denied',
  );
  check(
    await denied('delete from public.traveler_profiles'),
    'direct global profile deletion denied',
  );
  check(
    await denied('select private.activate_traveler()'),
    'internal activation helper cannot be called directly',
  );
  check(
    (await rpc('claim_stamp', { token: '0'.repeat(64) })).error === 'invalid_qr',
    'global activation does not bypass credential checks',
  );
  check(
    (await db.query('select * from public.passport_profiles')).rows.length === 0,
    'invalid claim creates no destination collection',
  );
  await as(tourist);
  check(
    (await db.query('select id from public.traveler_profiles where id=$1', [identity])).rows
      .length === 0,
    'other traveler cannot read global identity',
  );
  await admin();
  check(
    (
      await db.query(
        "select id from private.audit_events where actor_id=$1 and action='activate_traveler'",
        [globalUser],
      )
    ).rows.length === 1,
    'activation replay creates exactly one audit event',
  );
  await db.query("update public.organizations set status='approved' where id=$1", [org]);
  const lisbon = (
    await db.query<{ id: string }>("select id from public.destinations where slug='lisbon'")
  ).rows[0].id;
  const secondOrg = '60000000-0000-4000-8000-000000000001';
  const secondVenue = '60000000-0000-4000-8000-000000000002';
  const secondStamp = '60000000-0000-4000-8000-000000000003';
  await db.query(
    "insert into public.organizations(id,destination_id,name,kind,status) values($1,$2,'Test only Lisbon','merchant','approved')",
    [secondOrg, lisbon],
  );
  await db.query("insert into public.organization_members values($1,$2,'owner')", [
    secondOrg,
    owner,
  ]);
  await db.query(
    "insert into public.venues(id,destination_id,organization_id,name,category,participation_status) values($1,$2,$3,'Test only venue','nature','participating')",
    [secondVenue, lisbon, secondOrg],
  );
  await db.query(
    "insert into public.stamp_definitions(id,venue_id,destination_id,name) values($1,$2,$3,'Test only Lisbon stamp')",
    [secondStamp, secondVenue, lisbon],
  );
  await as(owner);
  await rpc('issue_qr', { stamp_id: secondStamp, token: 'e'.repeat(64) });
  await rpc('issue_qr', { stamp_id: stamp, token: 'f'.repeat(64) });
  await as(globalUser);
  check(
    Boolean((await rpc('claim_stamp', { token: 'e'.repeat(64) })).id),
    'global passport claims a first destination without local activation',
  );
  check(
    Boolean((await rpc('claim_stamp', { token: 'f'.repeat(64) })).id),
    'same global passport claims a second destination without local activation',
  );
  check(
    (await db.query('select * from public.passport_profiles')).rows.length === 2,
    'verified claims create two destination collections',
  );
  check(
    (await db.query('select * from public.stamp_claims')).rows.length === 2,
    'global history reads claims across destinations',
  );
  check(
    (await rpc('activate_traveler', {})).id === identity,
    'destination collection changes preserve global identity',
  );
  check(
    (await rpc('claim_stamp', { token: 'e'.repeat(64) })).error === 'already_claimed',
    'cross-destination claim replay denied',
  );
  await as(tourist2);
  check(
    (await db.query('select * from public.stamp_claims')).rows.length === 0,
    'global history retains cross-user isolation',
  );
  await admin();
  check(
    (await db.query('select id from public.traveler_profiles where user_id=$1', [globalUser])).rows
      .length === 1,
    'two destinations retain exactly one global profile',
  );
  await admin();
  const bridgeKey = 'ab'.repeat(32);
  await db.query('insert into private.pollar_bridge_config(key_hex) values($1)', [bridgeKey]);
  const hmac = (payload: string) =>
    createHmac('sha256', Buffer.from(bridgeKey, 'hex')).update(payload).digest('hex');
  const openSession = async (payload: string, mac = hmac(payload)) =>
    (
      await db.query<{ r: { id?: string; error?: string } }>(
        'select public.create_pollar_session($1,$2) as r',
        [payload, mac],
      )
    ).rows[0].r;
  const now = (
    await db.query<{ n: number }>('select floor(extract(epoch from now()))::integer as n')
  ).rows[0].n;
  const sessionRaw = 'a1'.repeat(32);
  const sessionPayload = {
    application: 'test-pollar-app',
    subject: 'test-provider-user',
    network: 'testnet',
    expires: now + 600,
    issued: now,
    token_hash: hash(sessionRaw),
    email: 'same@example.invalid',
    name: 'Test only',
    wallet: null,
    previous_hash: null,
  };
  check(
    (
      await db.query<{ mac: string }>('select private.bridge_hmac($1,$2) as mac', [
        '0b'.repeat(20) + '00'.repeat(12),
        'Hi There',
      ])
    ).rows[0].mac === 'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7',
    'session attestation matches RFC 4231 HMAC vector',
  );
  await as(null);
  const forged = JSON.stringify(sessionPayload);
  check(
    (await openSession(forged, '0'.repeat(64))).error === 'unauthorized',
    'forged Pollar login assertion denied',
  );
  check(
    (await openSession(JSON.stringify({ ...sessionPayload, expires: now - 1 }))).error ===
      'unauthorized',
    'expired session assertion denied',
  );
  check(
    (await openSession(JSON.stringify({ ...sessionPayload, issued: now - 90 }))).error ===
      'unauthorized',
    'stale login assertion denied',
  );
  check(
    (await openSession(JSON.stringify({ ...sessionPayload, expires: now + 7200 }))).error ===
      'unauthorized',
    'excessive session lifetime denied',
  );
  const newUser = (await openSession(forged)).id!;
  check(
    Boolean(newUser),
    'verified Pollar assertion creates an application profile without Supabase login',
  );
  check((await openSession(forged)).error === 'session_replay', 'login assertion replay denied');
  await db.query("select set_config('request.headers',$1,false)", [
    JSON.stringify({ 'x-citypassport-session': sessionRaw }),
  ]);
  check(
    (await db.query('select * from public.user_profiles')).rows.length === 1,
    'Pollar session reads only its own profile',
  );
  check(
    (await db.query('select * from public.traveler_profiles')).rows.length === 1,
    'Pollar login automatically creates global passport',
  );
  check(
    (await db.query('select * from public.hotel_reservations')).rows.length === 0,
    'Pollar tourist cannot read hotel guest records',
  );
  check(
    await denied("update public.user_profiles set pollar_subject='attacker'"),
    'client cannot reassign Pollar identity',
  );
  check(
    await denied('select * from private.app_sessions'),
    'client cannot read session credentials',
  );
  check(
    await denied('select * from private.pollar_bridge_config'),
    'client cannot read bridge signing key',
  );
  await db.query("select set_config('request.headers','{}',false)");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [newUser]);
  check(
    (await db.query('select * from public.user_profiles')).rows.length === 0,
    'Supabase JWT identity cannot bypass required Pollar session',
  );
  await db.query("select set_config('request.headers',$1,false)", [
    JSON.stringify({ 'x-citypassport-session': hash(sessionRaw) }),
  ]);
  check(
    (await db.query('select * from public.user_profiles')).rows.length === 0,
    'session hash cannot be replayed as bearer credential',
  );
  const secondRaw = 'b2'.repeat(32);
  const rotated = JSON.stringify({
    ...sessionPayload,
    token_hash: hash(secondRaw),
    previous_hash: hash(sessionRaw),
  });
  check(
    (await openSession(rotated)).id === newUser,
    'verified Pollar refresh retains the same profile ID',
  );
  await db.query("select set_config('request.headers',$1,false)", [
    JSON.stringify({ 'x-citypassport-session': sessionRaw }),
  ]);
  check(
    (await db.query('select * from public.user_profiles')).rows.length === 0,
    'refresh revokes previous app session',
  );
  await db.query("select set_config('request.headers',$1,false)", [
    JSON.stringify({ 'x-citypassport-session': secondRaw }),
  ]);
  await db.exec('select public.end_app_session()');
  check(
    (await db.query('select * from public.user_profiles')).rows.length === 0,
    'logout immediately revokes database session',
  );
  const differentSubject = (
    await openSession(
      JSON.stringify({
        ...sessionPayload,
        subject: 'different-provider-user',
        token_hash: hash('c3'.repeat(32)),
      }),
    )
  ).id;
  check(differentSubject !== newUser, 'matching email does not merge different Pollar subjects');
  const differentApp = (
    await openSession(
      JSON.stringify({
        ...sessionPayload,
        application: 'different-app',
        token_hash: hash('d4'.repeat(32)),
      }),
    )
  ).id;
  check(differentApp !== newUser, 'provider subjects are isolated by application');
  await admin();
  check(
    (await db.query('select id from auth.users where id=$1', [newUser])).rows.length === 0,
    'Pollar profile requires no Supabase Auth user',
  );
  await db.query(
    "update private.app_sessions set expires_at=now()-interval '1 second' where user_id=$1",
    [differentSubject],
  );
  await as(null);
  await db.query("select set_config('request.headers',$1,false)", [
    JSON.stringify({ 'x-citypassport-session': 'c3'.repeat(32) }),
  ]);
  check(
    (await db.query('select * from public.user_profiles')).rows.length === 0,
    'expired database session denies profile reads',
  );
  // Synthetic checkout fixtures, isolated in embedded PostgreSQL.
  const merchantWallet = Keypair.random().publicKey(),
    payerWallet = Keypair.random().publicKey();
  const checkoutRpc = async (action: string, payload: object) =>
    (
      await db.query<{ r: Record<string, any> }>(
        'select public.checkout_command($1,$2::jsonb) as r',
        [action, JSON.stringify(payload)],
      )
    ).rows[0].r;
  const evidenceRpc = async (proof: Record<string, unknown>, forged = false) => {
    const payload = JSON.stringify(proof);
    const mac = forged
      ? '0'.repeat(64)
      : createHmac('sha256', Buffer.from(bridgeKey, 'hex'))
          .update('citypassport-payment-evidence-v1\n' + payload)
          .digest('hex');
    return (
      await db.query<{ r: Record<string, any> }>(
        'select public.record_checkout_evidence($1,$2) as r',
        [payload, mac],
      )
    ).rows[0].r;
  };
  await as(null);
  check(
    (await checkoutRpc('onboard', { name: 'Not authorized', destination_id: dest })).error ===
      'unauthorized',
    'checkout onboarding requires a live app session',
  );
  await as(owner);
  const merchantOrg = (
    await checkoutRpc('onboard', { name: 'Test only merchant', destination_id: dest })
  ).id;
  check(Boolean(merchantOrg), 'merchant onboarding creates pending organization');
  check(
    (await checkoutRpc('payout', { organization_id: merchantOrg })).error === 'forbidden',
    'pending merchant cannot register payout',
  );
  check(
    (
      await checkoutRpc('create', {
        organization_id: merchantOrg,
        product: 'Test',
        amount: '1',
        idempotency_key: '70000000-0000-4000-8000-000000000001',
      })
    ).error === 'forbidden',
    'unapproved merchant cannot create checkout',
  );
  await admin();
  await db.query("update public.organizations set status='approved' where id=$1", [merchantOrg]);
  await db.query(
    "update public.user_profiles set pollar_application='test-app',pollar_subject='owner-wallet',network='testnet',wallet_address=$1 where id=$2",
    [merchantWallet, owner],
  );
  await db.query(
    "update public.user_profiles set pollar_application='test-app',pollar_subject='payer-wallet',network='testnet',wallet_address=$1 where id=$2",
    [payerWallet, tourist],
  );
  await as(other);
  check(
    (await checkoutRpc('payout', { organization_id: merchantOrg })).error === 'forbidden',
    'another organization cannot configure payout',
  );
  await as(owner);
  check(
    Boolean(
      (await checkoutRpc('payout', { organization_id: merchantOrg, address: payerWallet })).id,
    ),
    'payout comes from verified profile, ignoring caller address',
  );
  check(
    (
      await db.query<{ address: string }>(
        'select address from public.merchant_payouts where organization_id=$1',
        [merchantOrg],
      )
    ).rows[0].address === merchantWallet,
    'payout address is the merchant owner verified wallet',
  );
  const createInput = {
    organization_id: merchantOrg,
    product: 'Test item',
    amount: '1.0000001',
    idempotency_key: '70000000-0000-4000-8000-000000000001',
  };
  const requestId = (await checkoutRpc('create', createInput)).id;
  check(Boolean(requestId), 'approved merchant creates checkout');
  check(
    (await checkoutRpc('create', createInput)).id === requestId,
    'checkout creation replay is idempotent',
  );
  check(
    (await checkoutRpc('create', { ...createInput, amount: '2' })).error === 'idempotency_conflict',
    'idempotency key cannot change amount',
  );
  check(
    (await checkoutRpc('prepare', { request_id: requestId })).error === 'self_payment',
    'merchant cannot pay their own payout wallet',
  );
  await as(other);
  check(
    (await db.query('select id from public.checkout_requests')).rows.length === 0,
    'another merchant cannot list payment requests',
  );
  await as(tourist);
  const resolved = (await checkoutRpc('resolve', { request_id: requestId })).checkout;
  check(
    resolved.asset_code === 'USDC' && resolved.asset_issuer === TESTNET_USDC_ISSUER,
    'checkout freezes official testnet asset issuer',
  );
  check(
    Boolean((await checkoutRpc('prepare', { request_id: requestId })).checkout),
    'traveler prepares a checkout',
  );
  const frozen = (await checkoutRpc('resolve', { request_id: requestId })).checkout;
  check(
    frozen.payer_address === payerWallet,
    'checkout binds traveler wallet from verified session profile',
  );
  await as(other);
  check(
    (await checkoutRpc('prepare', { request_id: requestId })).error === 'forbidden',
    'another traveler cannot take over bound checkout',
  );
  await as(tourist);
  const hashA = '12'.repeat(32);
  const baseEvidence = {
    request_id: requestId,
    network: 'testnet',
    source: payerWallet,
    destination: merchantWallet,
    asset_code: 'USDC',
    asset_issuer: TESTNET_USDC_ISSUER,
    amount: '1.0000001',
    nonce: frozen.nonce,
    hash: hashA,
  };
  const submitted = {
    ...baseEvidence,
    kind: 'submitted',
    envelope: 'test-fixture-not-a-real-envelope',
    max_time: Math.floor(Date.parse(frozen.expires_at) / 1000),
  };
  check(
    (await evidenceRpc(submitted, true)).error === 'payment_proof',
    'client cannot forge a submitted-payment attestation',
  );
  check(
    (await evidenceRpc({ ...submitted, asset_issuer: merchantWallet })).error === 'payment_proof',
    'database rejects mismatched issuer even with trusted MAC',
  );
  check(
    (await evidenceRpc({ ...submitted, source: merchantWallet })).error === 'payment_proof',
    'database rejects wrong source',
  );
  check(
    (await evidenceRpc({ ...submitted, destination: payerWallet })).error === 'payment_proof',
    'database rejects wrong recipient',
  );
  check(
    (await evidenceRpc({ ...submitted, amount: '1' })).error === 'payment_proof',
    'database rejects wrong exact amount',
  );
  check(
    (await evidenceRpc({ ...submitted, nonce: 'f'.repeat(64) })).error === 'payment_proof',
    'database rejects wrong checkout correlation',
  );
  check(
    (await evidenceRpc({ ...submitted, max_time: submitted.max_time + 1 })).error ===
      'payment_proof',
    'database rejects payment lifetime beyond request expiry',
  );
  check(
    (await evidenceRpc(submitted)).status === 'submitted',
    'trusted submission stores reconcilable attempt before chain submission',
  );
  check(
    (await evidenceRpc(submitted)).status === 'submitted',
    'duplicate submission creates no second attempt',
  );
  const confirmed = {
    ...baseEvidence,
    kind: 'confirmed',
    ledger: 123,
    closed_at: Math.floor(Date.parse(frozen.created_at) / 1000) + 1,
  };
  check(
    (await evidenceRpc(confirmed, true)).error === 'payment_proof',
    'client callback cannot fabricate settlement',
  );
  check(
    (await evidenceRpc({ ...confirmed, hash: '13'.repeat(32) })).error === 'payment_proof',
    'settlement must match saved transaction hash',
  );
  check(
    (await evidenceRpc({ ...confirmed, closed_at: submitted.max_time + 1 })).error ===
      'payment_proof',
    'late ledger payment cannot satisfy request',
  );
  check(
    (await evidenceRpc(confirmed)).status === 'confirmed',
    'independently verified evidence confirms checkout',
  );
  check((await evidenceRpc(confirmed)).status === 'confirmed', 'settlement replay is idempotent');
  check(
    (await db.query('select * from public.payment_receipts')).rows.length === 1,
    'settlement replay creates exactly one receipt',
  );
  check(
    await denied('update public.payment_receipts set ledger=456'),
    'client cannot edit payment receipt',
  );
  check(
    await denied("update public.checkout_requests set status='confirmed'"),
    'client cannot directly mark checkout paid',
  );
  check(
    await denied('select * from private.checkout_attempts'),
    'private signed attempts are not directly readable',
  );
  await as(other);
  check(
    (await db.query('select * from public.payment_receipts')).rows.length === 0,
    'another traveler cannot read receipt',
  );
  check(
    (await evidenceRpc(confirmed)).error === 'forbidden',
    'another traveler cannot reconcile unrelated payment',
  );
  await as(owner);
  check(
    (await db.query('select * from public.payment_receipts')).rows.length === 1,
    'merchant reads their own verified receipt',
  );
  check(
    (await evidenceRpc(confirmed)).status === 'confirmed',
    'merchant can idempotently reconcile their checkout',
  );
  const expiredId = (
    await checkoutRpc('create', {
      ...createInput,
      idempotency_key: '70000000-0000-4000-8000-000000000002',
    })
  ).id;
  await admin();
  await db.query(
    "update public.checkout_requests set created_at=now()-interval '20 minutes',expires_at=now()-interval '5 minutes' where id=$1",
    [expiredId],
  );
  await as(tourist);
  check(
    (await checkoutRpc('prepare', { request_id: expiredId })).error === 'invalid_state',
    'expired checkout rejects payment preparation',
  );
  check(
    (await checkoutRpc('resolve', { request_id: expiredId })).checkout.status === 'expired',
    'expired checkout has explicit state',
  );
  await admin();
  check(
    (
      await db.query(
        "select id from private.audit_events where entity_id=$1 and action='checkout_confirmed'",
        [requestId],
      )
    ).rows.length === 1,
    'confirmed transition audited exactly once',
  );
  check(
    (await db.query('select * from private.checkout_attempts where request_id=$1', [requestId]))
      .rows.length === 1,
    'one request retains one durable submission',
  );
  check(
    await denied('delete from public.payment_receipts'),
    'receipt immutability also rejects privileged deletion',
  );
  await as(owner);
  const failedId = (
    await checkoutRpc('create', {
      ...createInput,
      idempotency_key: '70000000-0000-4000-8000-000000000003',
    })
  ).id;
  await as(tourist);
  const failedRequest = (await checkoutRpc('prepare', { request_id: failedId })).checkout;
  const failedBase = {
    ...baseEvidence,
    request_id: failedId,
    nonce: failedRequest.nonce,
    hash: '14'.repeat(32),
  };
  await evidenceRpc({
    ...failedBase,
    kind: 'submitted',
    envelope: 'test-only',
    max_time: Math.floor(Date.parse(failedRequest.expires_at) / 1000),
  });
  check(
    (await evidenceRpc({ ...failedBase, kind: 'failed' })).status === 'failed',
    'ledger failure produces a terminal failed checkout',
  );
  check(
    (await evidenceRpc({ ...failedBase, kind: 'confirmed', ledger: 124, closed_at: now })).error ===
      'invalid_state',
    'failed checkout cannot later become confirmed',
  );
  check(
    (await db.query('select * from public.payment_receipts')).rows.length === 1,
    'failed payment creates no receipt',
  );
  await as(owner);
  const duplicateId = (
    await checkoutRpc('create', {
      ...createInput,
      idempotency_key: '70000000-0000-4000-8000-000000000004',
    })
  ).id;
  await as(tourist);
  const duplicateRequest = (await checkoutRpc('prepare', { request_id: duplicateId })).checkout;
  check(
    (await evidenceRpc({ ...submitted, request_id: duplicateId, nonce: duplicateRequest.nonce }))
      .error === 'payment_conflict',
    'transaction hash cannot fulfill two checkout requests',
  );
  await admin();
  const delayedId = '70000000-0000-4000-8000-000000000005';
  await db.query(
    "insert into public.checkout_requests(id,organization_id,destination_id,merchant_name,product,amount,payout_address,payout_verified_by,idempotency_key,payer_user_id,payer_address,status,transaction_hash,created_at,expires_at) values($1,$2,$3,'Test only merchant','Prior submitted test', '1.0000001',$4,$5,$1,$6,$7,'submitted',$8,now()-interval '20 minutes',now()-interval '5 minutes')",
    [delayedId, merchantOrg, dest, merchantWallet, owner, tourist, payerWallet, '15'.repeat(32)],
  );
  await as(tourist);
  const delayed = (await checkoutRpc('resolve', { request_id: delayedId })).checkout;
  check(
    (
      await evidenceRpc({
        ...baseEvidence,
        request_id: delayedId,
        nonce: delayed.nonce,
        hash: '15'.repeat(32),
        kind: 'confirmed',
        ledger: 125,
        closed_at: Math.floor(Date.parse(delayed.created_at) / 1000) + 30,
      })
    ).status === 'confirmed',
    'delayed reconciliation accepts timely ledger inclusion after QR expiry',
  );
  await as(null);
  check(
    (await db.query('select * from public.payment_receipts')).rows.length === 0,
    'unauthenticated receipt access denied',
  );
  const reviewRpc = async (action: string, payload: object = {}) =>
    (
      await db.query<{ r: Record<string, unknown> }>(
        'select public.merchant_review_command($1,$2::jsonb) r',
        [action, JSON.stringify(payload)],
      )
    ).rows[0].r;
  const reviewer = '30000000-0000-4000-8000-000000000090';
  await as(null);
  check(
    (await reviewRpc('context')).error === 'unauthorized',
    'review requires live Pollar session',
  );
  await as(reviewer);
  check(
    JSON.stringify((await reviewRpc('context')).destinations) === '[]',
    'ordinary user has no review destinations',
  );
  check(
    (await reviewRpc('queue', { destination_id: dest, status: 'pending' })).error === 'forbidden',
    'review queue denied without assignment',
  );
  check(
    await denied(
      `insert into private.destination_reviewers(user_id,destination_id) values('${reviewer}','${dest}')`,
    ),
    'cannot self-assign review privilege',
  );
  check(
    await denied('select * from private.merchant_reviews'),
    'internal review history not directly readable',
  );
  await admin();
  await db.query(
    'insert into private.destination_reviewers(user_id,destination_id) values($1,$2)',
    [reviewer, dest],
  );
  const reviewOrg = '80000000-0000-4000-8000-000000000091';
  await db.query(
    "insert into public.organizations(id,destination_id,name,kind) values($1,$2,'Review test only merchant','merchant')",
    [reviewOrg, dest],
  );
  const foreignDest = (
    await db.query<{ id: string }>('select id from public.destinations where id<>$1 limit 1', [
      dest,
    ])
  ).rows[0].id;
  const foreignOrg = '80000000-0000-4000-8000-000000000092';
  await db.query(
    "insert into public.organizations(id,destination_id,name,kind) values($1,$2,'Foreign test only merchant','merchant')",
    [foreignOrg, foreignDest],
  );
  await as(reviewer);
  check(
    (await reviewRpc('queue', { destination_id: foreignDest, status: 'pending' })).error ===
      'forbidden',
    'reviewer cannot query another destination',
  );
  check(
    (await db.query('select * from public.hotel_reservations')).rows.length === 0,
    'reviewer receives no hotel guest access',
  );
  check(
    reviewerContextSchema.parse(await reviewRpc('context')).destinations.length === 1,
    'reviewer context returns only assigned destinations',
  );
  const assignedQueue = reviewQueueSchema.parse(
    await reviewRpc('queue', { destination_id: dest, status: 'pending' }),
  );
  check(
    assignedQueue.merchants.some((item) => item.id === reviewOrg) &&
      !assignedQueue.merchants.some((item) => item.id === foreignOrg),
    'review queue contains only assigned merchant records',
  );
  check(
    (await reviewRpc('queue', { destination_id: dest, status: 'pending', offset: -1 })).error ===
      'invalid',
    'database bounds queue pagination',
  );
  const reviewPayload = {
    organization_id: reviewOrg,
    command_id: '90000000-0000-4000-8000-000000000091',
    expected_version: 0,
    decision: 'approved',
    reason: 'Verified through isolated test fixture only',
  };
  check(
    (await reviewRpc('decide', { ...reviewPayload, organization_id: foreignOrg })).error ===
      'forbidden',
    'reviewer cannot approve another destination',
  );
  check(
    (await reviewRpc('decide', { ...reviewPayload, reason: 'short' })).error === 'invalid',
    'database enforces meaningful review reason',
  );
  check(
    (await reviewRpc('decide', { ...reviewPayload, expected_version: 2 })).error === 'stale',
    'stale review version denied',
  );
  check(
    (await reviewRpc('decide', reviewPayload)).success === true,
    'assigned reviewer approves pending merchant',
  );
  check(
    (await reviewRpc('decide', reviewPayload)).success === true,
    'identical decision replay succeeds idempotently',
  );
  check(
    (await reviewRpc('decide', { ...reviewPayload, reason: 'Different review evidence supplied' }))
      .error === 'idempotency_conflict',
    'changed decision replay denied',
  );
  check(
    (
      await reviewRpc('decide', {
        ...reviewPayload,
        command_id: '90000000-0000-4000-8000-000000000092',
        decision: 'suspended',
      })
    ).error === 'stale',
    'old browser cannot overwrite approval',
  );
  const suspendPayload = {
    ...reviewPayload,
    command_id: '90000000-0000-4000-8000-000000000093',
    expected_version: 1,
    decision: 'suspended',
  };
  check(
    (await reviewRpc('decide', suspendPayload)).success === true,
    'approved merchant can be suspended',
  );
  check(
    (
      await reviewRpc('decide', {
        ...suspendPayload,
        command_id: '90000000-0000-4000-8000-000000000094',
        expected_version: 2,
        decision: 'approved',
      })
    ).success === true,
    'suspended merchant can be reactivated',
  );
  check(
    await denied(`update public.organizations set status='approved' where id='${foreignOrg}'`),
    'reviewers cannot bypass transition RPC',
  );
  await admin();
  check(
    (await db.query('select * from private.merchant_reviews where organization_id=$1', [reviewOrg]))
      .rows.length === 3,
    'three accepted transitions produce exactly three immutable reviews',
  );
  check(
    (
      await db.query(
        "select * from private.audit_events where entity_id=$1 and action in ('merchant_approved','merchant_suspended')",
        [reviewOrg],
      )
    ).rows.length === 3,
    'replay creates no duplicate decision audit',
  );
  check(
    await denied(`delete from private.merchant_reviews where organization_id='${reviewOrg}'`),
    'review history immutable even for privileged deletion',
  );
  await db.query('insert into public.organization_members values($1,$2,$3)', [
    reviewOrg,
    reviewer,
    'owner',
  ]);
  await as(reviewer);
  check(
    (
      await reviewRpc('decide', {
        ...suspendPayload,
        command_id: '90000000-0000-4000-8000-000000000095',
        expected_version: 3,
      })
    ).error === 'forbidden',
    'reviewer cannot approve or suspend own business',
  );
  await as(owner);
  const suspendedCheckout = (
    await checkoutRpc('create', {
      organization_id: merchantOrg,
      product: 'Suspension test only',
      amount: '1.0000001',
      idempotency_key: '91000000-0000-4000-8000-000000000099',
    })
  ).id;
  await as(tourist);
  const beforeSuspension = (await checkoutRpc('prepare', { request_id: suspendedCheckout }))
    .checkout;
  await as(reviewer);
  check(
    (
      await reviewRpc('decide', {
        ...suspendPayload,
        organization_id: merchantOrg,
        command_id: '92000000-0000-4000-8000-000000000099',
        expected_version: 0,
      })
    ).success === true,
    'review can suspend existing checkout merchant',
  );
  await as(owner);
  check(
    (
      await checkoutRpc('create', {
        organization_id: merchantOrg,
        product: 'Denied after suspension',
        amount: '1',
        idempotency_key: '93000000-0000-4000-8000-000000000099',
      })
    ).error === 'forbidden',
    'suspension blocks new checkout creation',
  );
  await as(tourist);
  check(
    (await checkoutRpc('prepare', { request_id: suspendedCheckout })).error === 'unavailable',
    'suspension blocks checkout preparation',
  );
  check(
    (
      await evidenceRpc({
        ...baseEvidence,
        request_id: suspendedCheckout,
        nonce: beforeSuspension.nonce,
        hash: '99'.repeat(32),
        kind: 'submitted',
        envelope: 'test-signed-envelope',
        max_time: Math.floor(Date.parse(beforeSuspension.expires_at) / 1000),
      })
    ).error === 'invalid_state',
    'database blocks a prepared submission racing with suspension',
  );
  await admin();
  await db.query(
    'delete from public.organization_members where organization_id=$1 and user_id=$2',
    [reviewOrg, reviewer],
  );
  await db.query('delete from private.destination_reviewers where user_id=$1', [reviewer]);
  await as(reviewer);
  check(
    (await reviewRpc('decide', reviewPayload)).error === 'forbidden',
    'revoked reviewer cannot replay accepted command',
  );
  check(
    (await reviewRpc('queue', { destination_id: dest, status: 'approved' })).error === 'forbidden',
    'revocation immediately denies review queue',
  );
  const experienceRpc = async (action: string, payload: object = {}) =>
    (
      await db.query<{ r: Record<string, unknown> }>(
        'select public.experience_command($1,$2::jsonb) r',
        [action, JSON.stringify(payload)],
      )
    ).rows[0].r;
  await as(null);
  check(
    (await experienceRpc('context')).error === 'unauthorized',
    'catalog context needs live Pollar session',
  );
  await as(owner);
  check(
    JSON.stringify((await experienceRpc('context')).destinations) === '[]',
    'business ownership grants no catalog editing scope',
  );
  await as(reviewer);
  check(
    await denied(
      `insert into private.destination_editors(user_id,destination_id) values('${reviewer}','${dest}')`,
    ),
    'cannot self-assign destination catalog access',
  );
  await admin();
  await db.query('insert into private.destination_editors(user_id,destination_id) values($1,$2)', [
    reviewer,
    dest,
  ]);
  await as(reviewer);
  check(
    reviewerContextSchema.parse(await experienceRpc('context')).destinations.length === 1,
    'catalog context returns assigned cities only',
  );
  check(
    (await experienceRpc('queue', { destination_id: foreignDest, status: 'draft' })).error ===
      'forbidden',
    'editor cannot read another city catalog drafts',
  );
  check(
    (await db.query('select * from public.hotel_reservations')).rows.length === 0,
    'catalog editing does not grant hotel access',
  );
  check(
    (await reviewRpc('queue', { destination_id: dest, status: 'pending' })).error === 'forbidden',
    'catalog editor is not a merchant reviewer',
  );
  const experiencePayload = {
    destination_id: dest,
    command_id: 'a1000000-0000-4000-8000-000000000001',
    titles: {
      es: 'Solo prueba de catálogo',
      en: 'Catalog test only',
      pt: 'Somente teste de catálogo',
    },
    descriptions: {
      es: 'Contenido de prueba aislada, no es una oferta real.',
      en: 'Isolated test content; this is not a real offer.',
      pt: 'Conteúdo de teste isolado; não é uma oferta real.',
    },
    booking_url: 'https://example.com/',
  };
  check(
    (await experienceRpc('create', { ...experiencePayload, destination_id: foreignDest })).error ===
      'forbidden',
    'editor cannot create in another city',
  );
  check(
    (await experienceRpc('create', { ...experiencePayload, titles: { es: 'Solo prueba' } }))
      .error === 'invalid',
    'database rejects missing experience translations',
  );
  check(
    (await experienceRpc('create', { ...experiencePayload, titles: [] })).error === 'invalid',
    'database rejects non-object localized content',
  );
  check(
    (await experienceRpc('create', { ...experiencePayload, booking_url: 'javascript:alert(1)' }))
      .error === 'invalid',
    'database rejects active external link schemes',
  );
  check(
    (
      await experienceRpc('create', {
        ...experiencePayload,
        booking_url: 'https://user:pass@example.com/',
      })
    ).error === 'invalid',
    'database rejects credentials in provider links',
  );
  const experienceId = (await experienceRpc('create', experiencePayload)).id;
  check(experienceId === experiencePayload.command_id, 'assigned editor creates real draft row');
  const draftQueue = operatorQueueSchema.parse(
    await experienceRpc('queue', { destination_id: dest, status: 'draft' }),
  );
  check(
    draftQueue.total === 1 && draftQueue.experiences[0].id === experienceId,
    'assigned operator queue returns validated real draft record',
  );
  check(
    (await experienceRpc('queue', { destination_id: dest, status: 'draft', offset: -1 })).error ===
      'invalid',
    'database bounds operator queue pagination',
  );

  check(
    (await experienceRpc('create', experiencePayload)).id === experienceId,
    'experience creation retry is idempotent',
  );
  check(
    (await experienceRpc('create', { ...experiencePayload, booking_url: null })).error ===
      'idempotency_conflict',
    'changed creation retry rejected',
  );
  check(
    (await db.query('select * from public.experiences where id=$1', [experienceId])).rows.length ===
      1,
    'assigned editor reads own city draft',
  );
  check(
    (
      await db.query("select * from public.experiences where id=$1 and status='published'", [
        experienceId,
      ])
    ).rows.length === 0,
    'public query excludes editor-visible drafts',
  );
  await as(null);
  check(
    (await db.query('select * from public.experiences')).rows.length === 0,
    'anonymous cannot discover unpublished draft',
  );
  await as(tourist);
  check(
    (await db.query('select * from public.experiences')).rows.length === 0,
    'traveler cannot read operator drafts',
  );
  check(
    (await experienceRpc('save', { experience_id: experienceId })).error === 'forbidden',
    'traveler cannot edit operator draft',
  );
  await as(reviewer);
  const publishPayload = {
    experience_id: experienceId,
    command_id: 'a1000000-0000-4000-8000-000000000002',
    expected_version: 0,
    confirmed: 'on',
  };
  check(
    (await experienceRpc('publish', { ...publishPayload, expected_version: 99 })).error === 'stale',
    'stale experience publication rejected',
  );
  check(
    (await experienceRpc('publish', { ...publishPayload, confirmed: 'no' })).error === 'invalid',
    'database requires explicit publication confirmation',
  );
  check(
    (await experienceRpc('publish', publishPayload)).id === experienceId,
    'editor can explicitly publish draft',
  );
  await as(null);
  check(
    (await db.query('select * from public.experiences where id=$1', [experienceId])).rows.length ===
      1,
    'anonymous can discover published experience',
  );
  await as(reviewer);
  check(
    (
      await experienceRpc('save', {
        ...experiencePayload,
        experience_id: experienceId,
        command_id: 'a1000000-0000-4000-8000-000000000003',
        expected_version: 1,
      })
    ).error === 'withdraw_first',
    'live content cannot change without withdrawal',
  );
  const withdrawal = {
    experience_id: experienceId,
    command_id: 'a1000000-0000-4000-8000-000000000004',
    expected_version: 1,
    confirmed: 'on',
  };
  check(
    (await experienceRpc('withdraw', withdrawal)).id === experienceId,
    'published experience can be withdrawn',
  );
  check(
    (await experienceRpc('publish', publishPayload)).id === experienceId,
    'old publication retry is harmless after withdrawal',
  );
  await as(null);
  check(
    (await db.query('select * from public.experiences where id=$1', [experienceId])).rows.length ===
      0,
    'withdrawn experience disappears from public reads despite old publish replay',
  );
  await as(reviewer);
  const saved = {
    ...experiencePayload,
    experience_id: experienceId,
    command_id: 'a1000000-0000-4000-8000-000000000005',
    expected_version: 2,
    destination_id: foreignDest,
  };
  check(
    (await experienceRpc('save', saved)).id === experienceId,
    'withdrawn content can return to draft',
  );
  const savedItem = (
    await db.query<{ destination_id: string; status: string; version: number }>(
      'select destination_id,status,version from public.experiences where id=$1',
      [experienceId],
    )
  ).rows[0];
  check(
    savedItem.destination_id === dest && savedItem.status === 'draft' && savedItem.version === 3,
    'save cannot reassign destination and advances version',
  );
  check(
    (await experienceRpc('save', { ...saved, command_id: 'a1000000-0000-4000-8000-000000000006' }))
      .error === 'stale',
    'outdated editor form cannot overwrite newer content',
  );
  check(
    await denied(`update public.experiences set status='published' where id='${experienceId}'`),
    'catalog editors cannot bypass publishing RPC',
  );
  check(
    await denied('select * from private.experience_commands'),
    'private catalog command history cannot be read directly',
  );
  await admin();
  check(
    (
      await db.query('select * from private.experience_commands where experience_id=$1', [
        experienceId,
      ])
    ).rows.length === 4,
    'accepted catalog mutations recorded exactly once',
  );
  check(
    (
      await db.query(
        "select * from private.audit_events where entity_id=$1 and action like 'experience_%'",
        [experienceId],
      )
    ).rows.length === 4,
    'experience replays create no duplicate audit entries',
  );
  check(
    await denied(`delete from private.experience_commands where experience_id='${experienceId}'`),
    'catalog history immutable even under privileged deletion',
  );
  await db.query('delete from private.destination_editors where user_id=$1', [reviewer]);
  await as(reviewer);
  check(
    (await experienceRpc('create', experiencePayload)).error === 'forbidden',
    'revoked editor cannot replay accepted creation command',
  );
  check(
    (await db.query('select * from public.experiences where id=$1', [experienceId])).rows.length ===
      0,
    'revocation immediately hides private drafts',
  );
  const inquiryRpc = async (action: string, payload: object = {}) =>
    (
      await db.query<{ r: Record<string, unknown> }>(
        'select public.inquiry_command($1,$2::jsonb) r',
        [action, JSON.stringify(payload)],
      )
    ).rows[0].r;
  await as(null);
  check(
    (await inquiryRpc('mine')).error === 'unauthorized',
    'inquiries require live application session',
  );
  await admin();
  await db.query("update public.experiences set status='published' where id=$1", [experienceId]);
  const inquiryDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const inquiryPayload = {
    command_id: 'b1000000-0000-4000-8000-000000000001',
    experience_id: experienceId,
    preferred_date: inquiryDate,
    party_size: 2,
    message: 'Isolated test inquiry; not a real reservation.',
    consent: 'on',
  };
  await as(tourist);
  check(
    (await inquiryRpc('create', { ...inquiryPayload, party_size: 21 })).error === 'invalid',
    'database bounds inquiry traveler count',
  );
  check(
    (await inquiryRpc('create', { ...inquiryPayload, message: '\t\n\r            ' })).error ===
      'invalid',
    'database rejects blank inquiry questions',
  );
  check(
    (await inquiryRpc('create', { ...inquiryPayload, preferred_date: '2000-01-01' })).error ===
      'invalid',
    'past inquiry date denied',
  );
  check(
    (await inquiryRpc('create', { ...inquiryPayload, preferred_date: '2100-01-01' })).error ===
      'invalid',
    'excessive future inquiry date denied',
  );
  check(
    (await inquiryRpc('create', { ...inquiryPayload, consent: 'no' })).error === 'invalid',
    'inquiry sharing needs explicit consent',
  );
  const inquiryId = (
    await inquiryRpc('create', { ...inquiryPayload, user_id: other, destination_id: foreignDest })
  ).id;
  check(inquiryId === inquiryPayload.command_id, 'traveler creates persisted private inquiry');
  const canonicalPayload = { ...inquiryPayload, user_id: other, destination_id: foreignDest };
  check(
    (await inquiryRpc('create', canonicalPayload)).id === inquiryId,
    'inquiry creation replay is idempotent',
  );
  check(
    (
      await inquiryRpc('create', {
        ...canonicalPayload,
        message: 'Different retry details are not accepted.',
      })
    ).error === 'idempotency_conflict',
    'changed inquiry retry denied',
  );
  const ownedInquiry = inquiryDetailSchema.parse(
    await inquiryRpc('detail', { request_id: inquiryId }),
  );
  check(
    ownedInquiry.is_owner &&
      !ownedInquiry.can_handle &&
      ownedInquiry.inquiry.destination_id === dest,
    'inquiry owner and destination derive from session and experience',
  );
  check(
    !Object.hasOwn(
      (await inquiryRpc('detail', { request_id: inquiryId })).inquiry as object,
      'user_id',
    ),
    'inquiry projection excludes profile identity',
  );
  check(
    inquiryQueueSchema.parse(await inquiryRpc('mine')).total === 1,
    'traveler history returns own inquiry',
  );
  check(
    await denied('select * from private.experience_inquiries'),
    'inquiries cannot be read directly',
  );
  check(
    await denied(`update private.experience_inquiries set status='closed' where id='${inquiryId}'`),
    'inquiry states cannot be written directly',
  );
  await as(tourist2);
  check(
    inquiryQueueSchema.parse(await inquiryRpc('mine')).total === 0,
    'other traveler cannot list private inquiry',
  );
  check(
    (await inquiryRpc('detail', { request_id: inquiryId })).error === 'forbidden',
    'other traveler cannot read private details',
  );
  const replyPayload = {
    request_id: inquiryId,
    command_id: 'b1000000-0000-4000-8000-000000000002',
    expected_version: 0,
    response: 'Test response only; no reservation is confirmed.',
    consent: 'on',
  };
  check(
    (await inquiryRpc('cancel', { ...replyPayload })).error === 'forbidden',
    'other traveler cannot cancel inquiry',
  );
  await admin();
  await db.query('insert into private.destination_editors(user_id,destination_id) values($1,$2)', [
    reviewer,
    dest,
  ]);
  await as(reviewer);
  check(
    JSON.stringify((await inquiryRpc('context')).destinations) === '[]',
    'catalog editing does not grant inquiry handling',
  );
  check(
    (await inquiryRpc('detail', { request_id: inquiryId })).error === 'forbidden',
    'catalog editor cannot read traveler messages',
  );
  check(
    (await inquiryRpc('reply', replyPayload)).error === 'forbidden',
    'unassigned agent cannot send inquiry response',
  );
  check(
    await denied(
      `insert into private.destination_inquiry_agents(user_id,destination_id) values('${reviewer}','${dest}')`,
    ),
    'cannot self-assign inquiry handling',
  );
  await admin();
  await db.query(
    'insert into private.destination_inquiry_agents(user_id,destination_id) values($1,$2)',
    [reviewer, dest],
  );
  await as(reviewer);
  check(
    (await inquiryRpc('queue', { destination_id: foreignDest })).error === 'forbidden',
    'inquiry agents cannot read another destination queue',
  );
  check(
    inquiryQueueSchema.parse(await inquiryRpc('queue', { destination_id: dest })).total === 1,
    'assigned agent queue returns authorized requests',
  );
  check(
    (await db.query('select * from public.hotel_reservations')).rows.length === 0,
    'inquiry handling grants no hotel access',
  );
  check(
    (await inquiryRpc('reply', { ...replyPayload, expected_version: 9 })).error === 'stale',
    'stale response cannot overwrite inquiry',
  );
  check(
    (await inquiryRpc('reply', replyPayload)).id === inquiryId,
    'authorized agent records response',
  );
  check(
    (await inquiryRpc('reply', replyPayload)).id === inquiryId,
    'response replay produces no duplicate transition',
  );
  check(
    (
      await inquiryRpc('reply', {
        ...replyPayload,
        response: 'Changed response retry is rejected.',
      })
    ).error === 'idempotency_conflict',
    'changed response replay denied',
  );
  await as(tourist);
  check(
    inquiryDetailSchema.parse(await inquiryRpc('detail', { request_id: inquiryId })).inquiry
      .status === 'replied',
    'traveler reads recorded response, not reservation confirmation',
  );
  check(
    (
      await inquiryRpc('cancel', {
        ...replyPayload,
        command_id: 'b1000000-0000-4000-8000-000000000003',
        expected_version: 1,
      })
    ).id === inquiryId,
    'traveler can cancel answered information request',
  );
  await as(reviewer);
  check(
    (await inquiryRpc('reply', replyPayload)).id === inquiryId,
    'old response replay does not reopen cancelled request',
  );
  check(
    inquiryDetailSchema.parse(await inquiryRpc('detail', { request_id: inquiryId })).inquiry
      .status === 'cancelled',
    'cancelled inquiry remains terminal after old replay',
  );
  check(
    (
      await inquiryRpc('close', {
        ...replyPayload,
        command_id: 'b1000000-0000-4000-8000-000000000004',
        expected_version: 2,
      })
    ).error === 'invalid_state',
    'cancelled inquiry cannot be closed as answered',
  );
  await as(tourist);
  const secondInquiry = (
    await inquiryRpc('create', {
      ...inquiryPayload,
      command_id: 'b1000000-0000-4000-8000-000000000005',
    })
  ).id;
  await as(reviewer);
  check(
    (
      await inquiryRpc('reply', {
        ...replyPayload,
        request_id: secondInquiry,
        command_id: 'b1000000-0000-4000-8000-000000000006',
      })
    ).id === secondInquiry,
    'second inquiry receives single response',
  );
  check(
    (
      await inquiryRpc('close', {
        ...replyPayload,
        request_id: secondInquiry,
        command_id: 'b1000000-0000-4000-8000-000000000007',
        expected_version: 1,
      })
    ).id === secondInquiry,
    'answered inquiry can be explicitly closed',
  );
  await as(tourist);
  check(
    (
      await inquiryRpc('cancel', {
        ...replyPayload,
        request_id: secondInquiry,
        command_id: 'b1000000-0000-4000-8000-000000000008',
        expected_version: 2,
      })
    ).error === 'invalid_state',
    'closed inquiry cannot be cancelled as a booking',
  );
  let quotaCreated = 0;
  for (let i = 10; i < 18; i++) {
    const id = `b1000000-0000-4000-8000-${i.toString().padStart(12, '0')}`;
    if ((await inquiryRpc('create', { ...inquiryPayload, command_id: id })).id === id)
      quotaCreated++;
  }
  check(quotaCreated === 8, 'database serializes ten per-day inquiry allowance');
  check(
    (
      await inquiryRpc('create', {
        ...inquiryPayload,
        command_id: 'b1000000-0000-4000-8000-000000000099',
      })
    ).error === 'limit',
    'per-user daily inquiry limit enforced',
  );
  check(
    (await inquiryRpc('create', canonicalPayload)).id === inquiryId,
    'accepted creation replay works after quota reached',
  );
  await admin();
  await db.query("update public.experiences set status='archived' where id=$1", [experienceId]);
  await db.query(
    'insert into private.destination_inquiry_agents(user_id,destination_id) values($1,$2)',
    [tourist, dest],
  );
  await as(tourist);
  check(
    (
      await inquiryRpc('create', {
        ...inquiryPayload,
        command_id: 'b1000000-0000-4000-8000-000000000100',
      })
    ).error === 'unavailable',
    'withdrawn experience rejects new inquiries',
  );
  check(
    inquiryDetailSchema.parse(await inquiryRpc('detail', { request_id: inquiryId })).inquiry.titles
      .en === experiencePayload.titles.en,
    'withdrawal preserves original inquiry snapshot',
  );
  check(
    (
      await inquiryRpc('reply', {
        ...replyPayload,
        request_id: secondInquiry,
        command_id: 'b1000000-0000-4000-8000-000000000101',
        expected_version: 2,
      })
    ).error === 'forbidden',
    'agent cannot answer their own inquiry',
  );
  await admin();
  check(
    (await db.query('select * from private.inquiry_commands where request_id=$1', [inquiryId])).rows
      .length === 3,
    'create response cancel each audited once in command history',
  );
  check(
    await denied(`delete from private.inquiry_commands where request_id='${inquiryId}'`),
    'inquiry command history immutable',
  );
  await db.query('delete from private.destination_inquiry_agents where user_id=$1', [reviewer]);
  await as(reviewer);
  check(
    (await inquiryRpc('detail', { request_id: inquiryId })).error === 'forbidden',
    'revoked agent immediately loses message access',
  );
  check(
    (await inquiryRpc('reply', replyPayload)).error === 'forbidden',
    'revoked agent cannot replay accepted response',
  );
  await as(reviewer);
  const normalWithForgedDemo = (
    await experienceRpc('create', {
      ...experiencePayload,
      command_id: 'd1000000-0000-4000-8000-000000000001',
      is_demo: true,
      demo_key: 'caller-forged-demo',
    })
  ).id;
  check(
    (
      await db.query<{ is_demo: boolean }>('select is_demo from public.experiences where id=$1', [
        normalWithForgedDemo,
      ])
    ).rows[0].is_demo === false,
    'catalog caller cannot self-assign demo classification',
  );
  await admin();
  const demoId = 'd1000000-0000-4000-8000-000000000002';
  await db.query(
    "insert into public.experiences(id,destination_id,titles,descriptions,is_demo,demo_key,status) values($1,$2,$3,$4,true,'isolated-test-demo','draft')",
    [
      demoId,
      dest,
      JSON.stringify(experiencePayload.titles),
      JSON.stringify(experiencePayload.descriptions),
    ],
  );
  check(
    await denied(`update public.experiences set is_demo=false,demo_key=null where id='${demoId}'`),
    'demo experience cannot be reclassified as real',
  );
  check(
    await denied(`update public.experiences set demo_key='renamed-demo' where id='${demoId}'`),
    'demo seed identity is immutable',
  );
  check(
    await denied(
      `update public.experiences set booking_url='https://example.com/' where id='${demoId}'`,
    ),
    'demo experience cannot link to a real provider',
  );
  await as(reviewer);
  const demoSave = {
    ...experiencePayload,
    experience_id: demoId,
    command_id: 'd1000000-0000-4000-8000-000000000003',
    expected_version: 0,
  };
  check(
    (await experienceRpc('save', demoSave)).error === 'invalid',
    'catalog RPC rejects provider link on demo experience',
  );
  check(
    (await experienceRpc('save', { ...demoSave, booking_url: null, is_demo: false })).id === demoId,
    'demo content can be edited without changing classification',
  );
  check(
    (
      await db.query<{ is_demo: boolean }>('select is_demo from public.experiences where id=$1', [
        demoId,
      ])
    ).rows[0].is_demo === true,
    'caller payload cannot remove demo marker during save',
  );
  check(
    (
      await experienceRpc('publish', {
        experience_id: demoId,
        command_id: 'd1000000-0000-4000-8000-000000000004',
        expected_version: 1,
        confirmed: 'on',
      })
    ).id === demoId,
    'explicit demo publication preserves classification',
  );
  await as(tourist2);
  const demoInquiry = (
    await inquiryRpc('create', {
      ...inquiryPayload,
      command_id: 'd1000000-0000-4000-8000-000000000005',
      experience_id: demoId,
      is_demo: false,
    })
  ).id;
  check(
    inquiryDetailSchema.parse(await inquiryRpc('detail', { request_id: demoInquiry })).inquiry
      .is_demo === true,
    'demo inquiry classification derives from experience, ignoring caller',
  );
  await admin();
  check(
    await denied(`update private.experience_inquiries set is_demo=false where id='${demoInquiry}'`),
    'demo inquiry cannot be reclassified as real',
  );
  // Pass fixtures exist only in embedded PostgreSQL, never in the public catalog.
  const passRpc = async (action: string, payload: object = {}) => (await db.query<{r: Record<string, any>}>('select public.destination_pass_command($1,$2::jsonb) r',[action,JSON.stringify(payload)])).rows[0].r;
  await admin();
  const passOffer = 'e1000000-0000-4000-8000-000000000001';
  await db.query("update public.organizations set status='approved' where id=$1",[merchantOrg]);
  await db.query(`insert into public.destination_pass_offers(id,destination_id,organization_id,names,benefits,published) values($1,$2,$3,'{"es":"Pase de prueba","en":"Test pass","pt":"Passe de teste"}','{"es":"Prueba aislada","en":"Isolated test","pt":"Teste isolado"}',true)`,[passOffer,dest,merchantOrg]);
  check(await denied(`update public.destination_pass_offers set amount='101' where id='${passOffer}'`),'database enforces exactly 100 USDC');
  check(await denied(`update public.destination_pass_offers set reputation_points=800 where id='${passOffer}'`),'database enforces exactly 80 reputation points');
  await as(null);
  check((await passRpc('catalog',{destination_id:dest})).offers.length===1,'published pass is publicly discoverable');
  check((await passRpc('purchase',{offer_id:passOffer})).error==='unauthorized','anonymous pass purchase denied');
  check((await passRpc('account')).error==='unauthorized','anonymous purchase history denied');
  check(await denied(`insert into public.destination_pass_holdings(user_id,destination_id,request_id) values('${tourist}','${dest}','${requestId}')`),'direct entitlement writes denied');
  check(await denied(`select * from private.destination_pass_orders`),'private pass orders inaccessible');
  await as(tourist);
  const passId=(await passRpc('purchase',{offer_id:passOffer,amount:'1',reputation_points:800})).id;
  check(Boolean(passId),'activated traveler creates pass order');
  check((await passRpc('purchase',{offer_id:passOffer})).id===passId,'double-click reuses pending pass checkout');
  const passFrozen=(await checkoutRpc('resolve',{request_id:passId})).checkout;
  check(passFrozen.amount==='100' && passFrozen.payer_address===payerWallet,'pass price and payer ignore client payload');
  check((await passRpc('account')).holdings.length===0,'unsettled pass grants no ownership');
  const pendingAccount=passAccountSchema.parse(await passRpc('account'));
  check(pendingAccount.active && pendingAccount.purchases.some(p=>p.request_id===passId && p.status==='prepared' && p.transaction_hash===null),'activated traveler can recover a pending purchase without granting ownership');
  const passProof={request_id:passId,network:'testnet',source:payerWallet,destination:merchantWallet,asset_code:'USDC',asset_issuer:TESTNET_USDC_ISSUER,amount:'100',nonce:passFrozen.nonce,hash:'ab'.repeat(32)};
  check((await evidenceRpc({...passProof,kind:'submitted',envelope:'isolated-test-envelope',max_time:Math.floor(Date.parse(passFrozen.expires_at)/1000)})).status==='submitted','pass submission persists before settlement');
  const passConfirmed={...passProof,kind:'confirmed',ledger:999,closed_at:Math.floor(Date.parse(passFrozen.created_at)/1000)+1};
  check((await evidenceRpc(passConfirmed,true)).error==='payment_proof','forged settlement cannot grant pass or reputation');
  const submittedAccount=passAccountSchema.parse(await passRpc('account'));
  check(submittedAccount.purchases.find(p=>p.request_id===passId)?.transaction_hash===passProof.hash && submittedAccount.holdings.length===0,'submitted hash is recoverable before any ownership is awarded');
  check((await evidenceRpc(passConfirmed)).status==='confirmed','verified receipt atomically fulfills destination pass');
  check((await evidenceRpc(passConfirmed)).status==='confirmed','pass settlement replay remains idempotent');
  const passAccount=await passRpc('account');
  const confirmedAccount=passAccountSchema.parse(passAccount);
  check(confirmedAccount.purchases.find(p=>p.request_id===passId)?.ledger===999 && confirmedAccount.purchases.find(p=>p.request_id===passId)?.status==='confirmed','confirmed purchase exposes its verified ledger and receipt checkout');
  check(passAccount.holdings.length===1 && passAccount.reputation===80,'one receipt grants one pass and exactly 80 points');
  check((await passRpc('purchase',{offer_id:passOffer})).error==='already_owned','confirmed pass cannot be repurchased for points');
  check(await denied(`update public.reputation_events set points=800`),'client cannot edit reputation');
  await as(other);
  check(passAccountSchema.parse(await passRpc('account')).purchases.length===0,'purchase history cannot expose another traveler transactions');
  check((await passRpc('account')).holdings.length===0 && (await passRpc('account')).reputation===0,'other traveler cannot read pass ownership or reputation');
  check((await db.query('select * from public.destination_pass_holdings')).rows.length===0,'RLS hides another traveler pass');
  check((await db.query('select * from public.reputation_events')).rows.length===0,'RLS hides another traveler reputation');
  await admin();
  check(await denied('delete from public.reputation_events'),'reputation ledger is immutable even for trusted SQL');
  await db.query('update public.destination_pass_offers set published=false where id=$1',[passOffer]);
  await as(null);
  check((await passRpc('catalog',{destination_id:dest})).offers.length===0,'withdrawn offer disappears from public catalog');
  await as(tourist);
  check(passAccountSchema.parse(await passRpc('account')).purchases.some(p=>p.request_id===passId),'withdrawn offers preserve owner purchase and receipt recovery');

  await admin();
  const treasuryRow=(await db.query<{organization_id:string,address:string}>('select organization_id,address from private.citypass_treasuries where destination_id=$1',[dest])).rows[0];
  check(treasuryRow.address==='GC6RIEORZ5UF7L2KKXCZLSGMSIYY5NG6FXCKR3J5P7ZYIXSMXLX2QJKU','CityPass uses the user-authorized treasury');
  check((await db.query('select * from public.organization_members where organization_id=$1',[treasuryRow.organization_id])).rows.length===0,'treasury configuration fabricates no staff memberships');
  await db.query('update public.destination_pass_offers set organization_id=$1,published=true where id=$2',[treasuryRow.organization_id,passOffer]);
  const treasuryPayer=Keypair.random().publicKey();
  await db.query("update public.user_profiles set pollar_application='test-app',pollar_subject='treasury-payer',network='testnet',wallet_address=$1 where id=$2",[treasuryPayer,tourist2]);
  await as(tourist2);
  await rpc('activate_traveler',{});
  const treasuryId=(await passRpc('purchase',{offer_id:passOffer,payout_address:payerWallet,payout_source:'merchant'})).id;
  check(Boolean(treasuryId),'CityPass purchase does not require fabricated Pollar ownership for its treasury');
  const treasuryCheckout=(await checkoutRpc('resolve',{request_id:treasuryId})).checkout;
  check(treasuryCheckout.payout_address===treasuryRow.address && treasuryCheckout.merchant_name==='CityPass' && treasuryCheckout.payout_source==='citypass','CityPass checkout freezes treasury and ignores caller recipient');
  check((await passRpc('purchase',{offer_id:passOffer})).id===treasuryId,'CityPass purchase retry is idempotent');
  check(await denied('select * from private.citypass_treasuries'),'client cannot read private treasury registry');
  check(await denied(`update private.citypass_treasuries set address='${payerWallet}'`),'client cannot change CityPass treasury');
  check((await checkoutRpc('payout',{organization_id:treasuryRow.organization_id})).error==='forbidden','traveler cannot configure treasury through merchant payout RPC');
  await admin();
  check(await denied(`update public.checkout_requests set payout_address='${payerWallet}' where id='${treasuryId}'`),'database rejects recipient mismatch on CityPass checkout');
  check(await denied(`update public.checkout_requests set amount='99' where id='${treasuryId}'`),'database rejects changed CityPass price');
  check(await denied(`update public.checkout_requests set payout_source='merchant' where id='${treasuryId}'`),'CityPass provenance cannot be replaced by an unverified merchant payout');
  await as(tourist2);
  const treasuryProof={request_id:treasuryId,network:'testnet',source:treasuryPayer,destination:treasuryRow.address,asset_code:'USDC',asset_issuer:TESTNET_USDC_ISSUER,amount:'100',nonce:treasuryCheckout.nonce,hash:'ac'.repeat(32)};
  check((await evidenceRpc({...treasuryProof,kind:'submitted',envelope:'isolated-treasury-envelope',max_time:Math.floor(Date.parse(treasuryCheckout.expires_at)/1000)})).status==='submitted','CityPass treasury checkout records submission');
  const treasuryConfirmed={...treasuryProof,kind:'confirmed',ledger:1000,closed_at:Math.floor(Date.parse(treasuryCheckout.created_at)/1000)+1};
  check((await evidenceRpc(treasuryConfirmed)).status==='confirmed','verified CityPass receipt fulfills pass');
  check((await evidenceRpc(treasuryConfirmed)).status==='confirmed' && (await passRpc('account')).reputation===80,'treasury receipt replay cannot duplicate reputation');

  // Automatic chain delivery is private, signed, leased and derived only from accepted transitions.
  await admin();
  check(Number((await db.query<{n:number}>("select count(*)::int n from private.activity_outbox where kind=1")).rows[0].n)>0,'confirmed receipt automatically enqueues pass activity');
  check(Number((await db.query<{n:number}>("select count(*)::int n from private.activity_outbox where kind=0")).rows[0].n)>0,'verified Pollar profile automatically enqueues passport');
  check((await db.query("select 1 from private.activity_outbox o join public.destination_pass_holdings h on h.id=o.source_id join public.checkout_requests c on c.id=h.request_id where o.kind=1 and (c.status<>'confirmed' or o.wallet<>c.payer_address)")).rows.length===0,'queued purchase wallet comes from confirmed payer');
  await as(null);
  check(await denied('select * from private.activity_outbox'),'anonymous cannot read publishing jobs');
  check(await denied('update private.activity_deliveries set state=\'confirmed\''),'client cannot forge chain delivery');
  const chainTarget='C'+'A'.repeat(55);
  const statusRpc=async()=> (await db.query<{r:Record<string,unknown>}>('select public.passport_activity_status($1) r',[chainTarget])).rows[0].r;
  check((await statusRpc()).error==='unauthorized','anonymous cannot read passport publishing status');
  const workerRaw=async(payload:string,mac:string)=> (await db.query<{r:Record<string,any>}>('select public.activity_worker_command($1,$2) r',[payload,mac])).rows[0].r;
  const workerPayload=(action:string,extra:Record<string,unknown>={})=> JSON.stringify({action,contract_id:chainTarget,issued:Math.floor(Date.now()/1000),nonce:crypto.randomUUID(),...extra});
  const workerMac=(payload:string)=>createHmac('sha256',Buffer.from(bridgeKey,'hex')).update('citypassport-activity-worker-v1\n'+payload).digest('hex');
  check((await workerRaw(workerPayload('claim'),'0'.repeat(64))).error==='unauthorized','forged worker MAC denied');
  let wp=workerPayload('claim',{issued:Math.floor(Date.now()/1000)-60});
  check((await workerRaw(wp,workerMac(wp))).error==='unauthorized','expired worker assertion denied');
  wp=workerPayload('claim');
  const leased=await workerRaw(wp,workerMac(wp));
  check(Boolean(leased.job?.lease_token),'authorized worker leases one persisted event');
  check((await workerRaw(wp,workerMac(wp))).error==='replay','worker request replay denied');
  let next=workerPayload('claim');
  check((await workerRaw(next,workerMac(next))).job===null,'global issuer lease prevents concurrent source transactions');
  next=workerPayload('finish',{job_id:leased.job.id,lease_token:crypto.randomUUID(),state:'confirmed',evidence_hash:'11'.repeat(32)});
  check((await workerRaw(next,workerMac(next))).error==='stale_lease','wrong lease cannot confirm a job');
  next=workerPayload('finish',{job_id:leased.job.id,lease_token:leased.job.lease_token,state:'confirmed',evidence_hash:'11'.repeat(32)});
  check((await workerRaw(next,workerMac(next))).ok===true,'authorized delivery confirmation commits');
  const again=workerPayload('finish',{job_id:leased.job.id,lease_token:leased.job.lease_token,state:'confirmed',evidence_hash:'11'.repeat(32)});
  check((await workerRaw(again,workerMac(again))).error==='stale_lease','accepted lease cannot confirm twice');
  await as(tourist);
  check((await statusRpc()).error===undefined,'traveler can read own pending counts');
  await admin();
  check((await db.query("select 1 from private.audit_events where action='activity_confirmed' and entity_id=$1",[leased.job.id])).rows.length===1,'delivery transition audited exactly once');
  check(await denied('delete from private.activity_outbox'),'publishing source is immutable even for trusted SQL');

  // Self-reported exploration never enters the verified QR/chain award tables.
  const explorationRpc = async (slug: string, item: string) => (await db.query<{r: {error?: string; id?: string}}>(
    'select public.claim_exploration($1,$2) r', [slug,item])).rows[0].r;
  await as(null);
  check((await explorationRpc('lisbon','alfama')).error==='unauthorized','anonymous direct claim denied');
  await as(tourist);
  check((await explorationRpc('lisbon','invented')).error==='invalid','unknown exploration activity denied');
  check((await explorationRpc('porto','alfama')).error==='invalid','cross-city exploration substitution denied');
  const directClaim = await explorationRpc('lisbon','alfama');
  check(Boolean(directClaim.id),'direct claim persists without payment or QR');
  check((await explorationRpc('lisbon','alfama')).error==='already_claimed','direct claim replay cannot award twice');
  check((await db.query('select * from public.exploration_claims')).rows.length===1,'traveler reads own exploration stamp');
  check(await denied("insert into public.exploration_claims(user_id,destination_id,guide_slug,item_id) select user_id,destination_id,guide_slug,'belem' from public.exploration_claims"),'client cannot write exploration claims directly');
  check(await denied('delete from public.exploration_claims'),'client cannot erase exploration history');
  await as('30000000-0000-4000-8000-000000000098');
  check((await db.query('select * from public.exploration_claims')).rows.length===0,'other traveler cannot read exploration stamp');
  check(Boolean((await explorationRpc('porto','saoBento')).id),'first exploration claim activates a new traveler');
  check((await db.query('select * from public.traveler_profiles')).rows.length===1,'first direct claim creates only the current traveler identity');
  await db.exec('set role authenticated');
  check((await db.query('select * from public.exploration_claims')).rows.length===1,'authenticated role also scopes stamps to current actor');
  check(await denied("update public.exploration_claims set item_id='alfama'"),'authenticated client cannot alter claims');
  await as(null);
  check((await db.query('select * from public.exploration_claims')).rows.length===0,'anonymous cannot read exploration stamps');
  await admin();
  check((await db.query("select 1 from private.audit_events where action='claim_exploration' and entity_id=$1",[directClaim.id])).rows.length===1,'direct exploration audited once');
  check((await db.query('select 1 from private.activity_outbox where source_id=$1 and kind=5',[directClaim.id])).rows.length===1,'self-reported exploration queues its distinct chain event');
  check((await db.query('select 1 from private.activity_outbox where source_id=$1 and kind in (1,2,4)',[directClaim.id])).rows.length===0,'self-reported exploration cannot claim paid or QR activity');

  checks += await testMerchantServices(db, bridgeKey);
  checks += await testX402Database(db, bridgeKey, passOffer);
  console.log(`\n${checks} database assertions passed (embedded PostgreSQL; not hosted Supabase).`);
} finally {
  await db.close();
}
