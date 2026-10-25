import type { PGlite } from '@electric-sql/pglite';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { Keypair } from '@stellar/stellar-sdk';
import assert from 'node:assert/strict';
export async function testX402Database(db: PGlite, bridgeKey: string, offerId: string) {
  let count = 0;
  const check = (value: unknown, name: string) => {
    assert.ok(value, name);
    count++;
    console.log(`✓ x402: ${name}`);
  };
  const hash = (s: string) => createHash('sha256').update(s).digest('hex');
  const admin = () => db.exec('reset role');
  const actor = async (uid: string | null) => {
    await admin();
    const raw = uid ? hash('test-x402:' + uid) : '';
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
  const uid = randomUUID(),
    other = randomUUID();
  const wallet = Keypair.random().publicKey(),
    payer = Keypair.random().publicKey();
  await admin();
  for (const [id, address] of [
    [uid, wallet],
    [other, Keypair.random().publicKey()],
  ]) {
    await db.query(
      "insert into public.user_profiles(id,wallet_address,network,pollar_application,pollar_subject) values($1::uuid,$2,'testnet','x402-embedded-test',$1::text)",
      [id, address],
    );
    await actor(id);
    await db.query("select public.passport_command('activate_traveler','{}')");
    await admin();
  }
  const command = async (action: string, payload: Record<string, unknown>) =>
    (
      await db.query<{ r: Record<string, any> }>(
        'select public.x402_order_command($1,$2::jsonb) r',
        [action, JSON.stringify(payload)],
      )
    ).rows[0].r;
  const token = '98'.repeat(32);
  const authorization = () => ({
    offer_id: offerId,
    agent_wallet: payer,
    command_id: randomUUID(),
    token_hash: hash(token),
    amount: '1',
    payout_address: payer,
    reputation_points: 99999,
  });
  await actor(null);
  check(
    (await command('authorize', authorization())).error === 'unauthorized',
    'anonymous authorization denied',
  );
  await actor(uid);
  const first = authorization();
  let id = (await command('authorize', first)).id;
  check(Boolean(id), 'traveler authorizes exactly one pass for a separate agent wallet');
  check(
    (await command('authorize', first)).error === 'idempotency_conflict',
    'replayed creation cannot replace capability',
  );
  const delivery = async (
    action: string,
    extra: Record<string, unknown> = {},
    secret = bridgeKey,
    proofToken = token,
  ) => {
    const payload = JSON.stringify({
      ...extra,
      action,
      request_id: id,
      token_hash: hash(proofToken),
      issued_at: Math.floor(Date.now() / 1000),
      nonce: randomUUID(),
    });
    const mac = createHmac('sha256', Buffer.from(secret, 'hex'))
      .update('citypassport-x402-v1\n' + payload)
      .digest('hex');
    return (
      await db.query<{ r: Record<string, any> }>('select public.x402_delivery($1,$2) r', [
        payload,
        mac,
      ])
    ).rows[0].r;
  };
  check(
    (await delivery('resolve', {}, '00'.repeat(32))).error === 'payment_proof',
    'capability alone cannot forge backend evidence',
  );
  check(
    (await delivery('resolve', {}, bridgeKey, '00'.repeat(32))).error === 'forbidden',
    'wrong purchase capability denied',
  );
  const frozen = (await delivery('resolve')).order;
  check(
    frozen.checkout.amount === '100' &&
      frozen.checkout.payer_address === payer &&
      frozen.checkout.payout_address !== payer &&
      frozen.beneficiary_wallet === wallet,
    'price, recipient, agent payer and beneficiary are frozen independently of untrusted overrides',
  );
  await actor(other);
  check(
    (await command('revoke', { request_id: id })).error === 'forbidden',
    'other traveler cannot revoke authorization',
  );
  check(
    (await db.query('select * from public.checkout_requests where id=$1', [id])).rows.length === 0,
    'RLS hides another traveler checkout',
  );
  await actor(uid);
  check((await command('revoke', { request_id: id })).ok, 'owner can revoke unused authorization');
  check((await delivery('resolve')).error === 'revoked', 'revocation prevents payment');
  check((await command('revoke', { request_id: id })).ok, 'revocation retry is idempotent');
  const second = authorization();
  second.token_hash = hash('97'.repeat(32));
  // The helper token is fixed; a distinct capability is required per new order.
  const secondToken = '97'.repeat(32);
  id = (await command('authorize', second)).id;
  check(Boolean(id), 'revoked order permits a fresh explicit authorization');
  const pay = (action: string, extra: Record<string, unknown> = {}) =>
    delivery(action, extra, bridgeKey, secondToken);
  const { checkout } = (await pay('resolve')).order;
  check(
    (
      await db.query<{ r: Record<string, any> }>(
        "select public.checkout_command('prepare',$1::jsonb) r",
        [JSON.stringify({ request_id: id })],
      )
    ).rows[0].r.error === 'x402_required',
    'classic signing cannot race agent rail',
  );
  const classic = JSON.stringify({ request_id: id });
  const classicMac = createHmac('sha256', Buffer.from(bridgeKey, 'hex'))
    .update('citypassport-payment-evidence-v1\n' + classic)
    .digest('hex');
  check(
    (
      await db.query<{ r: Record<string, any> }>(
        'select public.record_checkout_evidence($1,$2) r',
        [classic, classicMac],
      )
    ).rows[0].r.error === 'x402_required',
    'classic evidence cannot fulfill an agent order',
  );
  const stage = { payment_payload: { embedded_test: true }, payload_hash: '96'.repeat(32) };
  check(
    (
      await pay('confirm', {
        hash: '95'.repeat(32),
        ledger: 5,
        closed_at: Math.floor(Date.now() / 1000),
      })
    ).error === 'payment_proof',
    'confirmation before accepted submission denied',
  );
  check(
    (await pay('stage', stage)).order.state === 'settling',
    'verified authorization is persisted before external settlement',
  );
  check(
    (await pay('stage', { ...stage, payload_hash: '94'.repeat(32) })).error === 'invalid_state',
    'second caller cannot start another charge',
  );
  check(
    (await command('revoke', { request_id: id })).error === 'invalid_state',
    'in-flight settlement cannot be revoked and replaced',
  );
  await admin();
  await db.query(
    "update public.checkout_requests set created_at=now()-interval '20 minutes',expires_at=now()-interval '5 minutes' where id=$1",
    [id],
  );
  await actor(uid);
  check(
    (await command('authorize', { ...authorization(), token_hash: '93'.repeat(32) })).error ===
      'purchase_pending',
    'expired indeterminate settlement blocks a fresh agent charge',
  );
  check(
    (
      await db.query<{ r: Record<string, any> }>(
        "select public.destination_pass_command('purchase',$1::jsonb) r",
        [JSON.stringify({ offer_id: offerId })],
      )
    ).rows[0].r.error === 'purchase_pending',
    'expired indeterminate settlement blocks a fresh classic charge',
  );
  await admin();
  await db.query('update public.checkout_requests set created_at=$2,expires_at=$3 where id=$1', [
    id,
    checkout.created_at,
    checkout.expires_at,
  ]);
  await actor(null);
  const tx = '92'.repeat(32);
  check(
    (await pay('settled', { hash: tx })).order.checkout.transaction_hash === tx,
    'server records settlement hash without granting ownership',
  );
  check(
    (await pay('settled', { hash: '91'.repeat(32) })).error === 'payment_proof',
    'settlement hash cannot be replaced',
  );
  const evidence = {
    hash: tx,
    ledger: 12345,
    closed_at: Math.floor(Date.parse(checkout.created_at) / 1000) + 1,
  };
  check(
    (await pay('confirm', { ...evidence, closed_at: 1 })).error === 'payment_proof',
    'settlement timestamp outside authorization rejected',
  );
  check(
    (await pay('confirm', evidence)).order.state === 'confirmed',
    'independent backend proof fulfills pass transactionally',
  );
  check(
    (await pay('confirm', evidence)).order.state === 'confirmed',
    'settlement retries cannot duplicate awards',
  );
  await admin();
  check(
    (await db.query('select * from public.destination_pass_holdings where user_id=$1', [uid])).rows
      .length === 1,
    'one pass belongs to the beneficiary',
  );
  check(
    (
      await db.query<{ points: number }>(
        'select points from public.reputation_events where user_id=$1',
        [uid],
      )
    ).rows[0].points === 80,
    'exactly 80 reputation awarded once',
  );
  check(
    (
      await db.query<{ wallet: string }>(
        'select o.wallet from private.activity_outbox o join public.destination_pass_holdings h on h.id=o.source_id where h.request_id=$1',
        [id],
      )
    ).rows[0].wallet === wallet,
    'automatic contract activity targets beneficiary rather than agent payer',
  );
  check(
    (await db.query('select * from public.reputation_events where user_id=$1', [other])).rows
      .length === 0,
    'other traveler receives no reputation',
  );
  await actor(uid);
  for (const sql of [
    'select * from private.x402_orders',
    'select * from private.x402_nonces',
    "select private.checkout_command_classic('resolve','{}')",
    "select private.destination_pass_command_classic('purchase','{}')",
  ]) {
    let denied = false;
    try {
      await db.exec(sql);
    } catch {
      denied = true;
    }
    check(denied, 'private tables and bypass helpers deny client access');
  }
  return count;
}
