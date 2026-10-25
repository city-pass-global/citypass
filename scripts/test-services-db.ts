import type { PGlite } from '@electric-sql/pglite';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { Keypair } from '@stellar/stellar-sdk';
import assert from 'node:assert/strict';
export async function testMerchantServices(db: PGlite, bridgeKey: string) {
  let count = 0;
  const check = (value: unknown, name: string) => {
    assert.ok(value, name);
    count++;
    console.log(`✓ services: ${name}`);
  };
  const hash = (value: string) => createHash('sha256').update(value).digest('hex');
  const owner = randomUUID(),
    buyer = randomUUID(),
    other = randomUUID();
  const ownerWallet = Keypair.random().publicKey(),
    buyerWallet = Keypair.random().publicKey();
  const admin = () => db.exec('reset role');
  const actor = async (uid: string | null) => {
    await admin();
    const raw = uid ? hash(`service-test:${uid}`) : '';
    if (uid)
      await db.query(
        "insert into private.app_sessions(token_hash,user_id,expires_at) values($1,$2,now()+interval '1 hour') on conflict do nothing",
        [hash(raw), uid],
      );
    await db.query("select set_config('request.headers',$1,false)", [
      JSON.stringify(raw ? { 'x-citypassport-session': raw } : {}),
    ]);
    await db.exec('set role anon');
  };
  const command = async (action: string, payload: object) =>
    (
      await db.query<{ r: Record<string, any> }>(
        'select public.merchant_service_command($1,$2::jsonb) r',
        [action, JSON.stringify(payload)],
      )
    ).rows[0].r;
  const denied = async (sql: string) => {
    try {
      await db.exec(sql);
      return false;
    } catch {
      return true;
    }
  };
  await admin();
  for (const [uid, wallet] of [
    [owner, ownerWallet],
    [buyer, buyerWallet],
    [other, Keypair.random().publicKey()],
  ])
    await db.query(
      "insert into public.user_profiles(id,wallet_address,network,pollar_application,pollar_subject) values($1::uuid,$2,'testnet','service-db-test',$1::text)",
      [uid, wallet],
    );
  const destination = (
    await db.query<{ id: string }>("select id from public.destinations where slug='lisbon'")
  ).rows[0].id;
  const org = (
    await db.query<{ id: string }>(
      "insert into public.organizations(destination_id,name,kind,status) values($1,'Embedded test merchant','merchant','approved') returning id",
      [destination],
    )
  ).rows[0].id;
  await db.query("insert into public.organization_members values($1,$2,'owner')", [org, owner]);
  const venue = (
    await db.query<{ id: string }>(
      "insert into public.venues(destination_id,organization_id,name,category,participation_status) values($1,$2,'Embedded test location','culture','participating') returning id",
      [destination, org],
    )
  ).rows[0].id;
  const publish = {
    service_id: randomUUID(),
    organization_id: org,
    venue_id: venue,
    name: 'Embedded test service',
    stamp_name: 'Embedded purchase stamp',
    amount: '25',
  };
  await actor(null);
  check((await command('publish', publish)).error === 'unauthorized', 'anonymous cannot publish');
  check(
    (await command('buy', { service_id: publish.service_id })).error === 'unauthorized',
    'anonymous cannot buy',
  );
  await actor(other);
  check(
    (await command('publish', publish)).error === 'forbidden',
    'nonmember cannot publish merchant service',
  );
  await actor(owner);
  check(
    (await command('publish', publish)).error === 'wallet_required',
    'unconfigured payout blocks publishing',
  );
  await db.query("select public.checkout_command('payout',$1::jsonb)", [
    JSON.stringify({ organization_id: org }),
  ]);
  check(
    (await command('publish', { ...publish, amount: '24.9999999' })).error === 'invalid',
    'database rejects price below requested range',
  );
  check(
    (await command('publish', { ...publish, amount: '150.0000001' })).error === 'invalid',
    'database rejects price above requested range',
  );
  check(
    (await command('publish', { ...publish, venue_id: randomUUID() })).error === 'invalid',
    'unrelated venue rejected',
  );
  check(
    (await command('publish', publish)).id === publish.service_id,
    'merchant publishes canonical priced service',
  );
  check(
    (await command('publish', publish)).id === publish.service_id,
    'publish replay is idempotent',
  );
  check(
    (await command('publish', { ...publish, amount: '50' })).error === 'idempotency_conflict',
    'published terms cannot be changed by replay',
  );
  check(
    (await command('buy', { service_id: publish.service_id })).error === 'self_payment',
    'merchant cannot farm own service reputation',
  );
  await actor(null);
  check(
    (await db.query('select 1 from public.merchant_services where id=$1', [publish.service_id]))
      .rows.length === 1,
    'published service is publicly discoverable',
  );
  check(
    await denied('select * from private.merchant_service_orders'),
    'private order metadata denied',
  );
  check(
    await denied("update public.merchant_services set amount='1'"),
    'clients cannot change prices directly',
  );
  await actor(buyer);
  const requestId = (
    await command('buy', {
      service_id: publish.service_id,
      amount: '0.01',
      payout_address: buyerWallet,
    })
  ).id;
  check(Boolean(requestId), 'traveler creates embedded-wallet checkout');
  check(
    (await command('buy', { service_id: publish.service_id })).id === requestId,
    'duplicate clicks reuse open checkout',
  );
  const checkout = (
    await db.query<{ r: Record<string, any> }>(
      "select public.checkout_command('resolve',$1::jsonb) r",
      [JSON.stringify({ request_id: requestId })],
    )
  ).rows[0].r.checkout;
  check(
    checkout.amount === '25' &&
      checkout.payout_address === ownerWallet &&
      checkout.payer_address === buyerWallet,
    'client cannot override amount recipient or payer',
  );
  check(
    (await db.query('select * from public.merchant_service_acquisitions')).rows.length === 0,
    'prepared checkout awards nothing',
  );
  const proof = {
    request_id: requestId,
    network: 'testnet',
    source: buyerWallet,
    destination: ownerWallet,
    asset_code: checkout.asset_code,
    asset_issuer: checkout.asset_issuer,
    amount: checkout.amount,
    nonce: checkout.nonce,
    hash: hash(requestId),
  };
  const evidence = async (p: object, valid = true) => {
    const payload = JSON.stringify(p),
      mac = valid
        ? createHmac('sha256', Buffer.from(bridgeKey, 'hex'))
            .update('citypassport-payment-evidence-v1\n' + payload)
            .digest('hex')
        : '00'.repeat(32);
    return (
      await db.query<{ r: Record<string, any> }>(
        'select public.record_checkout_evidence($1,$2) r',
        [payload, mac],
      )
    ).rows[0].r;
  };
  const submitted = {
    ...proof,
    kind: 'submitted',
    envelope: 'embedded-service-test-envelope',
    max_time: Math.floor(Date.parse(checkout.expires_at) / 1000),
  };
  check(
    (await evidence(submitted, false)).error === 'payment_proof',
    'browser cannot forge submission evidence',
  );
  check(
    (await evidence(submitted)).status === 'submitted',
    'trusted verifier records submission without award',
  );
  check(
    (await db.query('select * from public.merchant_service_acquisitions')).rows.length === 0,
    'unconfirmed payment awards no stamp',
  );
  const confirmed = {
    ...proof,
    kind: 'confirmed',
    ledger: 9999,
    closed_at: Math.floor(Date.parse(checkout.created_at) / 1000) + 1,
  };
  check(
    (await evidence({ ...confirmed, amount: '1' })).error === 'payment_proof',
    'mismatched settlement denied',
  );
  check(
    (await evidence(confirmed)).status === 'confirmed',
    'verified receipt fulfills acquisition',
  );
  check(
    (await evidence(confirmed)).status === 'confirmed',
    'settlement retry preserves accepted receipt',
  );
  const acquisition = (
    await db.query<{ id: string; stamp_name: string }>(
      'select id,stamp_name from public.merchant_service_acquisitions',
    )
  ).rows;
  check(
    acquisition.length === 1 && acquisition[0].stamp_name === publish.stamp_name,
    'exactly one persisted purchase stamp',
  );
  check(
    (await command('buy', { service_id: publish.service_id })).error === 'already_owned',
    'acquired service cannot trigger another charge',
  );
  check(
    await denied('delete from public.merchant_service_acquisitions'),
    'client cannot erase acquisition to farm rewards',
  );
  await actor(other);
  check(
    (await db.query('select * from public.merchant_service_acquisitions')).rows.length === 0,
    'other traveler cannot see private acquisition',
  );
  check(
    (await command('retire', { service_id: publish.service_id })).error === 'forbidden',
    'nonmember cannot retire service',
  );
  await actor(owner);
  check(
    (await command('retire', { service_id: publish.service_id })).id === publish.service_id,
    'owner retires service',
  );
  await actor(other);
  check(
    (await command('buy', { service_id: publish.service_id })).error === 'unavailable',
    'retired service cannot create new charge',
  );
  check(
    (await db.query('select 1 from public.merchant_services where id=$1', [publish.service_id]))
      .rows.length === 0,
    'retired service removed from public directory',
  );
  await admin();
  check(
    (
      await db.query(
        'select 1 from private.activity_outbox where kind=4 and source_id=$1 and subject=$2 and wallet=$3',
        [acquisition[0].id, publish.service_id, buyerWallet],
      )
    ).rows.length === 1,
    'receipt atomically queues one purchase and stamp for frozen payer',
  );
  check(
    (
      await db.query(
        "select 1 from private.audit_events where action='service_acquired' and entity_id=$1",
        [acquisition[0].id],
      )
    ).rows.length === 1,
    'acquisition audited exactly once',
  );
  check(
    await denied(
      "update public.merchant_services set amount='50' where id='" + publish.service_id + "'",
    ),
    'published terms remain immutable even for trusted SQL',
  );
  const platform = (
    await db.query<{
      id: string;
      amount: string;
      reference_venue_id: string;
      organization_id: string;
      destination_id: string;
    }>(
      "select s.* from public.merchant_services s join public.venues v on v.id=s.reference_venue_id where s.seller_source='citypass' and v.organization_id is null order by s.amount::numeric,s.id limit 1",
    )
  ).rows[0];
  check(
    Boolean(platform) && Number(platform.amount) >= 25 && Number(platform.amount) <= 150,
    'platform services use the requested price range',
  );
  const treasury = (
    await db.query<{ address: string }>(
      'select address from private.citypass_treasuries where organization_id=$1',
      [platform.organization_id],
    )
  ).rows[0].address;
  check(
    (
      await db.query<{ organization_id: string | null }>(
        'select organization_id from public.venues where id=$1',
        [platform.reference_venue_id],
      )
    ).rows[0].organization_id === null,
    'source listing is not promoted to a merchant partner',
  );
  await actor(null);
  check(
    (await db.query('select id from public.merchant_services where id=$1', [platform.id])).rows
      .length === 1,
    'platform offer is public without a fabricated merchant payout',
  );
  await actor(buyer);
  const platformId = (
    await command('buy', { service_id: platform.id, payout_address: ownerWallet, amount: '1' })
  ).id;
  check(Boolean(platformId), 'platform service opens a real checkout');
  const platformCheckout = (
    await db.query<{ r: Record<string, any> }>(
      "select public.checkout_command('resolve',$1::jsonb) r",
      [JSON.stringify({ request_id: platformId })],
    )
  ).rows[0].r.checkout;
  check(
    platformCheckout.payout_address === treasury &&
      platformCheckout.amount === platform.amount &&
      platformCheckout.merchant_name === 'CityPass',
    'platform checkout freezes the selected treasury price and seller',
  );
  const platformProof = {
    request_id: platformId,
    network: 'testnet',
    source: buyerWallet,
    destination: treasury,
    asset_code: platformCheckout.asset_code,
    asset_issuer: platformCheckout.asset_issuer,
    amount: platformCheckout.amount,
    nonce: platformCheckout.nonce,
    hash: hash(platformId),
  };
  check(
    (
      await evidence({
        ...platformProof,
        kind: 'submitted',
        envelope: 'embedded-platform-envelope',
        max_time: Math.floor(Date.parse(platformCheckout.expires_at) / 1000),
      })
    ).status === 'submitted',
    'platform submission uses existing verified payment pipeline',
  );
  check(
    (
      await evidence({
        ...platformProof,
        kind: 'confirmed',
        ledger: 10001,
        closed_at: Math.floor(Date.parse(platformCheckout.created_at) / 1000) + 1,
      })
    ).status === 'confirmed',
    'verified platform payment grants acquisition',
  );
  check(
    (await command('buy', { service_id: platform.id })).error === 'already_owned',
    'platform service replay cannot charge twice',
  );
  await admin();
  check(
    (
      await db.query(
        'select 1 from private.activity_outbox o join public.merchant_service_acquisitions a on a.id=o.source_id where a.request_id=$1 and o.kind=4 and o.wallet=$2',
        [platformId, buyerWallet],
      )
    ).rows.length === 1,
    'platform payment queues one canonical contract event',
  );
  return count;
}
