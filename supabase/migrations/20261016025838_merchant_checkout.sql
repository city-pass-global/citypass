-- Testnet-only direct USDC checkout. Circle's official Stellar page links this issuer:
-- https://www.circle.com/multi-chain-usdc/stellar (testnet asset).
alter table public.organizations add constraint organizations_id_destination_unique unique(id,destination_id);
create table public.merchant_payouts (
 organization_id uuid primary key references public.organizations(id),
 network text not null check(network='testnet'),
 address text not null check(address ~ '^G[A-Z2-7]{55}$'),
 verified_by uuid not null references public.user_profiles(id),
 verified_at timestamptz not null default now()
);
create index merchant_payouts_verifier_idx on public.merchant_payouts(verified_by);
create table public.checkout_requests (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null, destination_id uuid not null,
 merchant_name text not null,
 product text not null check(length(product) between 1 and 180),
 amount text not null check(amount ~ '^(0|[1-9][0-9]{0,11})([.][0-9]{1,7})?$' and amount::numeric>0 and amount::numeric<=922337203685.4775807),
 network text not null default 'testnet' check(network='testnet'),
 asset_code text not null default 'USDC' check(asset_code='USDC'),
 asset_issuer text not null default 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5' check(asset_issuer='GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'),
 payout_address text not null check(payout_address ~ '^G[A-Z2-7]{55}$'),
 payout_verified_by uuid not null references public.user_profiles(id),
 nonce text not null unique default replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','') check(nonce ~ '^[a-f0-9]{64}$'),
 idempotency_key uuid not null,
 payer_user_id uuid references public.user_profiles(id),
 payer_address text check(payer_address ~ '^G[A-Z2-7]{55}$'),
 status text not null default 'created' check(status in ('created','prepared','submitted','confirmed','failed','expired')),
 transaction_hash text check(transaction_hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '15 minutes', confirmed_at timestamptz,
 foreign key(organization_id,destination_id) references public.organizations(id,destination_id),
 unique(organization_id,idempotency_key),unique(network,transaction_hash),
 check((payer_user_id is null)=(payer_address is null)),
 check(expires_at>created_at and expires_at<=created_at+interval '15 minutes'),
 check(status='created' or payer_user_id is not null or status='expired'),
 check(status not in ('submitted','confirmed','failed') or transaction_hash is not null),
 check((status='confirmed')=(confirmed_at is not null))
);
create index checkout_org_destination_idx on public.checkout_requests(organization_id,destination_id);
create index checkout_destination_idx on public.checkout_requests(destination_id);
create index checkout_payer_idx on public.checkout_requests(payer_user_id,created_at);
create index checkout_payout_verifier_idx on public.checkout_requests(payout_verified_by);
create table private.checkout_attempts (
 request_id uuid primary key references public.checkout_requests(id),
 transaction_hash text not null unique check(transaction_hash ~ '^[a-f0-9]{64}$'),
 signed_envelope text not null check(length(signed_envelope) between 1 and 32768),
 created_at timestamptz not null default now()
);
create table public.payment_receipts (
 request_id uuid primary key references public.checkout_requests(id),
 network text not null check(network='testnet'),
 transaction_hash text not null check(transaction_hash ~ '^[a-f0-9]{64}$'),
 ledger bigint not null check(ledger>0), closed_at timestamptz not null,
 created_at timestamptz not null default now(), unique(network,transaction_hash)
);
create trigger immutable_payment_receipt before update or delete on public.payment_receipts for each row execute function private.reject_ledger_change();
alter table public.merchant_payouts enable row level security;
alter table public.checkout_requests enable row level security;
alter table public.payment_receipts enable row level security;
alter table private.checkout_attempts enable row level security;
revoke all on public.merchant_payouts,public.checkout_requests,public.payment_receipts,private.checkout_attempts from public,anon,authenticated;
grant select on public.merchant_payouts,public.checkout_requests,public.payment_receipts to anon,authenticated;
create policy own_payout on public.merchant_payouts for select to anon,authenticated using(private.is_member(organization_id,array['owner','manager','merchant']));
create policy own_checkout on public.checkout_requests for select to anon,authenticated using(payer_user_id=(select private.current_actor()) or private.is_member(organization_id,array['owner','manager','merchant']));
create policy own_receipt on public.payment_receipts for select to anon,authenticated using(exists(select 1 from public.checkout_requests r where r.id=request_id));

create function private.checkout_view(r public.checkout_requests) returns jsonb
language sql stable security invoker set search_path='' as $$
 select (to_jsonb(r)-'payer_user_id'-'idempotency_key'-'payout_verified_by')||jsonb_build_object('destination_names',d.names,'receipt',(select to_jsonb(p) from public.payment_receipts p where p.request_id=r.id)) from public.destinations d where d.id=r.destination_id;
$$;
revoke all on function private.checkout_view(public.checkout_requests) from public,anon,authenticated;

create function private.checkout_command(action text,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.current_actor(); org public.organizations%rowtype; payout public.merchant_payouts%rowtype; r public.checkout_requests%rowtype; profile public.user_profiles%rowtype; rid uuid; idem uuid;
begin
 if uid is null then return jsonb_build_object('error','unauthorized'); end if;
 if action='onboard' then
  if coalesce(length(trim(payload->>'name')),0) not between 2 and 120 then return jsonb_build_object('error','invalid'); end if;
  perform 1 from public.user_profiles where id=uid for update;
  if (select count(*) from public.organization_members where user_id=uid and role='owner')>=3 then return jsonb_build_object('error','limit'); end if;
  insert into public.organizations(destination_id,name,kind) values((payload->>'destination_id')::uuid,trim(payload->>'name'),'merchant') returning id into rid;
  insert into public.organization_members(organization_id,user_id,role) values(rid,uid,'owner');
  insert into private.audit_events(actor_id,organization_id,action,entity_id) values(uid,rid,'merchant_onboard',rid);
  return jsonb_build_object('id',rid);
 elsif action='payout' then
  select * into org from public.organizations where id=(payload->>'organization_id')::uuid for update;
  if not found or org.kind<>'merchant' or org.status<>'approved' or not private.is_member(org.id,array['owner']) then return jsonb_build_object('error','forbidden'); end if;
  select * into profile from public.user_profiles where id=uid;
  if profile.wallet_address is null or profile.network<>'testnet' or profile.pollar_subject is null then return jsonb_build_object('error','wallet_required'); end if;
  insert into public.merchant_payouts(organization_id,network,address,verified_by) values(org.id,'testnet',profile.wallet_address,uid)
   on conflict(organization_id) do update set address=excluded.address,verified_by=excluded.verified_by,verified_at=now();
  insert into private.audit_events(actor_id,organization_id,action,entity_id) values(uid,org.id,'merchant_payout',org.id);
  return jsonb_build_object('id',org.id);
 elsif action='create' then
  select * into org from public.organizations where id=(payload->>'organization_id')::uuid for update;
  if not found or org.kind<>'merchant' or org.status<>'approved' or not private.is_member(org.id,array['owner','manager','merchant']) then return jsonb_build_object('error','forbidden'); end if;
  if coalesce(length(trim(payload->>'product')),0) not between 1 and 180 or coalesce(payload->>'amount','') !~ '^(0|[1-9][0-9]{0,11})([.][0-9]{1,7})?$' then return jsonb_build_object('error','invalid'); end if;
  if (payload->>'amount')::numeric<=0 or (payload->>'amount')::numeric>922337203685.4775807 then return jsonb_build_object('error','invalid'); end if;
  idem:=(payload->>'idempotency_key')::uuid;
  select * into r from public.checkout_requests where organization_id=org.id and idempotency_key=idem;
  if found then
   if r.product<>trim(payload->>'product') or r.amount::numeric<>(payload->>'amount')::numeric then return jsonb_build_object('error','idempotency_conflict'); end if;
   return jsonb_build_object('id',r.id);
  end if;
  select * into payout from public.merchant_payouts where organization_id=org.id;
  if not found or not private.is_member(org.id,array['owner','manager','merchant']) or not exists(select 1 from public.organization_members m join public.user_profiles u on u.id=m.user_id where m.organization_id=org.id and m.user_id=payout.verified_by and m.role='owner' and u.wallet_address=payout.address and u.network='testnet') then return jsonb_build_object('error','wallet_required'); end if;
  insert into public.checkout_requests(organization_id,destination_id,merchant_name,product,amount,payout_address,payout_verified_by,idempotency_key)
   values(org.id,org.destination_id,org.name,trim(payload->>'product'),payload->>'amount',payout.address,payout.verified_by,idem) returning id into rid;
  insert into private.audit_events(actor_id,organization_id,action,entity_id) values(uid,org.id,'checkout_created',rid);
  return jsonb_build_object('id',rid);
 elsif action in ('resolve','prepare','attempt') then
  select * into r from public.checkout_requests where id=(payload->>'request_id')::uuid for update;
  if not found then return jsonb_build_object('error','unavailable'); end if;
  if r.payer_user_id is not null and r.payer_user_id<>uid and not private.is_member(r.organization_id,array['owner','manager','merchant']) then return jsonb_build_object('error','forbidden'); end if;
  if r.status in ('created','prepared') and r.expires_at<=now() then
   update public.checkout_requests set status='expired' where id=r.id; r.status:='expired';
   insert into private.audit_events(actor_id,organization_id,action,entity_id) values(uid,r.organization_id,'checkout_expired',r.id);
  end if;
  if not exists(select 1 from public.organizations where id=r.organization_id and status='approved' and kind='merchant') and r.status not in ('confirmed','failed','submitted') then return jsonb_build_object('error','unavailable'); end if;
  if action='prepare' then
   if r.status not in ('created','prepared') then return jsonb_build_object('error','invalid_state'); end if;
   select * into profile from public.user_profiles where id=uid;
   if profile.wallet_address is null or profile.network<>'testnet' or profile.pollar_subject is null then return jsonb_build_object('error','wallet_required'); end if;
   if profile.wallet_address=r.payout_address then return jsonb_build_object('error','self_payment'); end if;
   if r.payer_user_id is not null and (r.payer_user_id<>uid or r.payer_address<>profile.wallet_address) then return jsonb_build_object('error','forbidden'); end if;
   if r.payer_user_id is null then
    update public.checkout_requests set payer_user_id=uid,payer_address=profile.wallet_address,status='prepared' where id=r.id returning * into r;
    insert into private.audit_events(actor_id,organization_id,action,entity_id) values(uid,r.organization_id,'checkout_prepared',r.id);
   end if;
  elsif action='attempt' then
   if r.payer_user_id<>uid and not private.is_member(r.organization_id,array['owner','manager','merchant']) then return jsonb_build_object('error','forbidden'); end if;
   return jsonb_build_object('checkout',private.checkout_view(r),'attempt',(select to_jsonb(a) from private.checkout_attempts a where a.request_id=r.id));
  end if;
  return jsonb_build_object('checkout',private.checkout_view(r));
 end if;
 return jsonb_build_object('error','invalid');
end $$;
revoke all on function private.checkout_command(text,jsonb) from public;
create function public.checkout_command(action text,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.checkout_command(action,payload); $$;
revoke all on function public.checkout_command(text,jsonb) from public;
grant execute on function private.checkout_command(text,jsonb),public.checkout_command(text,jsonb) to anon,authenticated;

create function private.record_checkout_evidence(payload text,mac text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.current_actor(); secret text; p jsonb; r public.checkout_requests%rowtype; kind text; closed timestamptz;
begin
 if uid is null then return jsonb_build_object('error','unauthorized'); end if;
 if payload is null or length(payload)>40000 or mac is null or mac !~ '^[a-f0-9]{64}$' then return jsonb_build_object('error','payment_proof'); end if;
 select key_hex into secret from private.pollar_bridge_config where singleton;
 if secret is null or private.bridge_hmac(secret,'citypassport-payment-evidence-v1'||chr(10)||payload)<>mac then return jsonb_build_object('error','payment_proof'); end if;
 p:=payload::jsonb;kind:=p->>'kind';
 select * into r from public.checkout_requests where id=(p->>'request_id')::uuid for update;
 if not found then return jsonb_build_object('error','unavailable'); end if;
 if r.payer_user_id is null or (r.payer_user_id<>uid and not private.is_member(r.organization_id,array['owner','manager','merchant'])) then return jsonb_build_object('error','forbidden'); end if;
 if coalesce(p->>'network','')<>r.network or coalesce(p->>'source','')<>r.payer_address or coalesce(p->>'destination','')<>r.payout_address or coalesce(p->>'asset_code','')<>r.asset_code or coalesce(p->>'asset_issuer','')<>r.asset_issuer or coalesce(p->>'amount','')<>r.amount or coalesce(p->>'nonce','')<>r.nonce or coalesce(p->>'hash','') !~ '^[a-f0-9]{64}$' then return jsonb_build_object('error','payment_proof'); end if;
 if kind='submitted' then
  if r.payer_user_id<>uid then return jsonb_build_object('error','forbidden'); end if;
  if r.status in ('submitted','confirmed') and r.transaction_hash=p->>'hash' then return jsonb_build_object('status',r.status); end if;
  if r.status<>'prepared' or r.expires_at<=now() then return jsonb_build_object('error','invalid_state'); end if;
  if coalesce(length(p->>'envelope'),0) not between 1 and 32768 or (p->>'max_time')::bigint>floor(extract(epoch from r.expires_at))::bigint or coalesce((p->>'max_time')::bigint,0)<=0 then return jsonb_build_object('error','payment_proof'); end if;
  insert into private.checkout_attempts(request_id,transaction_hash,signed_envelope) values(r.id,p->>'hash',p->>'envelope');
  update public.checkout_requests set status='submitted',transaction_hash=p->>'hash' where id=r.id;
 elsif kind in ('confirmed','failed') then
  if r.transaction_hash is distinct from p->>'hash' then return jsonb_build_object('error','payment_proof'); end if;
  if r.status=kind then return jsonb_build_object('status',r.status); end if;
  if r.status<>'submitted' then return jsonb_build_object('error','invalid_state'); end if;
  if kind='confirmed' then
   closed:=to_timestamp((p->>'closed_at')::bigint);
   if coalesce((p->>'ledger')::bigint,0)<=0 or closed is null or closed>r.expires_at or closed<r.created_at-interval '30 seconds' then return jsonb_build_object('error','payment_proof'); end if;
   insert into public.payment_receipts(request_id,network,transaction_hash,ledger,closed_at) values(r.id,r.network,r.transaction_hash,(p->>'ledger')::bigint,closed);
   update public.checkout_requests set status='confirmed',confirmed_at=now() where id=r.id;
  else update public.checkout_requests set status='failed' where id=r.id;
  end if;
 else return jsonb_build_object('error','payment_proof'); end if;
 insert into private.audit_events(actor_id,organization_id,action,entity_id) values(uid,r.organization_id,'checkout_'||kind,r.id);
 return jsonb_build_object('status',kind);
 exception when unique_violation then return jsonb_build_object('error','payment_conflict');
end $$;
revoke all on function private.record_checkout_evidence(text,text) from public;
create function public.record_checkout_evidence(payload text,mac text) returns jsonb language sql security invoker set search_path='' as $$ select private.record_checkout_evidence(payload,mac); $$;
revoke all on function public.record_checkout_evidence(text,text) from public;
grant execute on function private.record_checkout_evidence(text,text),public.record_checkout_evidence(text,text) to anon,authenticated;
