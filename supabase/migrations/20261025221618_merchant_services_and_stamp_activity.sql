-- Owner-authored merchant services plus user-priced CityPassport digital services.
-- Platform prices and the existing testnet treasury were explicitly selected by the user; no source venue is promoted to a partner.
alter table public.venues add constraint venues_service_location_unique unique(id,organization_id,destination_id);
create table public.merchant_services (
 id uuid primary key, organization_id uuid not null, destination_id uuid not null,
 venue_id uuid,
 reference_venue_id uuid references public.venues(id),
 seller_source text not null default 'merchant' check(seller_source in ('merchant','citypass')),
 check((seller_source='merchant' and venue_id is not null and reference_venue_id is null) or (seller_source='citypass' and venue_id is null and reference_venue_id is not null)),
 name text not null check(length(name) between 2 and 180),
 stamp_name text not null check(length(stamp_name) between 2 and 120),
 amount text not null check(amount ~ '^(0|[1-9][0-9]{0,11})([.][0-9]{1,7})?$' and amount::numeric>=25 and amount::numeric<=150),
 published boolean not null default true, created_at timestamptz not null default now(),
 foreign key(organization_id,destination_id) references public.organizations(id,destination_id),
 foreign key(venue_id,organization_id,destination_id) references public.venues(id,organization_id,destination_id),
 foreign key(reference_venue_id,destination_id) references public.venues(id,destination_id)
);
create index merchant_services_reference_idx on public.merchant_services(reference_venue_id);
create index merchant_services_venue_idx on public.merchant_services(venue_id);
create index merchant_services_org_idx on public.merchant_services(organization_id,destination_id);
create index merchant_services_destination_idx on public.merchant_services(destination_id);
create table private.merchant_service_orders (
 request_id uuid primary key references public.checkout_requests(id),
 service_id uuid not null references public.merchant_services(id),
 user_id uuid not null references public.user_profiles(id)
);
create index merchant_service_orders_service_idx on private.merchant_service_orders(service_id);
create index merchant_service_orders_actor_idx on private.merchant_service_orders(user_id,service_id);
create table public.merchant_service_acquisitions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.user_profiles(id),
 service_id uuid not null references public.merchant_services(id),
 request_id uuid not null unique references public.payment_receipts(request_id),
 destination_id uuid not null references public.destinations(id),
 service_name text not null, stamp_name text not null, acquired_at timestamptz not null default now(),
 unique(user_id,service_id)
);
create index merchant_acquisitions_service_idx on public.merchant_service_acquisitions(service_id);
create index merchant_acquisitions_destination_idx on public.merchant_service_acquisitions(destination_id);
alter table public.merchant_services enable row level security;
alter table private.merchant_service_orders enable row level security;
alter table public.merchant_service_acquisitions enable row level security;
revoke all on public.merchant_services,private.merchant_service_orders,public.merchant_service_acquisitions from public,anon,authenticated;
grant select on public.merchant_services,public.merchant_service_acquisitions to anon,authenticated;
-- A boolean publication predicate can inspect merchant eligibility without exposing private organization rows.
create function private.merchant_service_visible(org_id uuid,venue_id uuid,destination_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.organizations o join public.venues v on v.organization_id=o.id
 join public.merchant_payouts p on p.organization_id=o.id
 join public.organization_members m on m.organization_id=o.id and m.user_id=p.verified_by and m.role='owner'
 join public.user_profiles u on u.id=m.user_id and u.wallet_address=p.address and u.network='testnet'
 where o.id=$1 and o.kind='merchant' and o.status='approved' and v.id=$2 and v.destination_id=$3 and v.participation_status='participating')
$$;
revoke all on function private.merchant_service_visible(uuid,uuid,uuid) from public;
grant execute on function private.merchant_service_visible(uuid,uuid,uuid) to anon,authenticated;
create function private.platform_service_visible(org_id uuid,ref_id uuid,dest_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.citypass_treasuries t join public.organizations o on o.id=t.organization_id
 join public.venues v on v.destination_id=t.destination_id where t.organization_id=$1 and t.destination_id=$3 and v.id=$2 and v.participation_status<>'suspended' and o.kind='merchant' and o.status='approved')
$$;
revoke all on function private.platform_service_visible(uuid,uuid,uuid) from public;
grant execute on function private.platform_service_visible(uuid,uuid,uuid) to anon,authenticated;
create policy visible_merchant_services on public.merchant_services for select to anon,authenticated using(
 private.is_member(organization_id,array['owner','manager','merchant']) or
 (published and ((seller_source='merchant' and private.merchant_service_visible(organization_id,venue_id,destination_id)) or (seller_source='citypass' and private.platform_service_visible(organization_id,reference_venue_id,destination_id))))
);
create policy own_service_acquisitions on public.merchant_service_acquisitions for select to anon,authenticated using(user_id=(select private.current_actor()));
create trigger immutable_service_order before update or delete on private.merchant_service_orders for each row execute function private.reject_ledger_change();
create trigger immutable_service_acquisition before update or delete on public.merchant_service_acquisitions for each row execute function private.reject_ledger_change();

alter table public.checkout_requests add column merchant_service_id uuid references public.merchant_services(id);
create index checkout_merchant_service_idx on public.checkout_requests(merchant_service_id);
create or replace function private.validate_citypass_checkout() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.payout_source='citypass' then
  if new.merchant_name<>'CityPass' or not exists(select 1 from private.citypass_treasuries t where t.organization_id=new.organization_id and t.destination_id=new.destination_id and t.network=new.network and t.address=new.payout_address) then raise exception 'invalid_citypass_payout'; end if;
  if new.merchant_service_id is null then
   if new.amount<>'100' then raise exception 'invalid_citypass_payout'; end if;
  elsif not exists(select 1 from public.merchant_services s where s.id=new.merchant_service_id and s.seller_source='citypass' and s.organization_id=new.organization_id and s.destination_id=new.destination_id and s.amount=new.amount and s.name=new.product) then raise exception 'invalid_citypass_service'; end if;
 end if;
 return new;
end $$;

create function private.merchant_service_command(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.current_actor(); org public.organizations%rowtype; venue public.venues%rowtype; service public.merchant_services%rowtype;
 payout public.merchant_payouts%rowtype; treasury private.citypass_treasuries%rowtype; source text:='merchant'; profile public.user_profiles%rowtype; r public.checkout_requests%rowtype; sid uuid; rid uuid;
begin
 if uid is null then return jsonb_build_object('error','unauthorized'); end if;
 if action='publish' then
  sid:=(payload->>'service_id')::uuid;
  if sid is null or coalesce(length(trim(payload->>'name')),0) not between 2 and 180 or coalesce(length(trim(payload->>'stamp_name')),0) not between 2 and 120
   or coalesce(payload->>'amount','') !~ '^(0|[1-9][0-9]{0,11})([.][0-9]{1,7})?$' then return jsonb_build_object('error','invalid'); end if;
  if (payload->>'amount')::numeric<25 or (payload->>'amount')::numeric>150 then return jsonb_build_object('error','invalid'); end if;
  select * into org from public.organizations where id=(payload->>'organization_id')::uuid for update;
  if not found or org.kind<>'merchant' or org.status<>'approved' or not private.is_member(org.id,array['owner','manager']) then return jsonb_build_object('error','forbidden'); end if;
  select * into venue from public.venues where id=(payload->>'venue_id')::uuid and organization_id=org.id and destination_id=org.destination_id and participation_status='participating' for share;
  if not found then return jsonb_build_object('error','invalid'); end if;
  select * into payout from public.merchant_payouts where organization_id=org.id for share;
  if not found or not exists(select 1 from public.organization_members m join public.user_profiles u on u.id=m.user_id where m.organization_id=org.id and m.user_id=payout.verified_by and m.role='owner' and u.wallet_address=payout.address and u.network='testnet') then return jsonb_build_object('error','wallet_required'); end if;
  select * into service from public.merchant_services where id=sid;
  if found then
   if service.organization_id=org.id and service.venue_id=venue.id and service.name=trim(payload->>'name') and service.stamp_name=trim(payload->>'stamp_name') and service.amount::numeric=(payload->>'amount')::numeric then return jsonb_build_object('id',sid); end if;
   return jsonb_build_object('error','idempotency_conflict');
  end if;
  insert into public.merchant_services(id,organization_id,destination_id,venue_id,name,stamp_name,amount)
   values(sid,org.id,org.destination_id,venue.id,trim(payload->>'name'),trim(payload->>'stamp_name'),payload->>'amount');
  insert into private.audit_events(actor_id,organization_id,action,entity_id) values(uid,org.id,'service_published',sid);
  return jsonb_build_object('id',sid);
 elsif action='retire' then
  select * into service from public.merchant_services where id=(payload->>'service_id')::uuid for update;
  if not found or not private.is_member(service.organization_id,array['owner','manager']) then return jsonb_build_object('error','forbidden'); end if;
  update public.merchant_services set published=false where id=service.id and published;
  if found then insert into private.audit_events(actor_id,organization_id,action,entity_id) values(uid,service.organization_id,'service_retired',service.id); end if;
  return jsonb_build_object('id',service.id);
 elsif action='buy' then
  select * into profile from public.user_profiles where id=uid for update;
  if profile.wallet_address is null or profile.network<>'testnet' or profile.pollar_application is null then return jsonb_build_object('error','wallet_required'); end if;
  select * into service from public.merchant_services where id=(payload->>'service_id')::uuid for share;
  if not found then return jsonb_build_object('error','unavailable'); end if;
  if exists(select 1 from public.merchant_service_acquisitions where user_id=uid and service_id=service.id) then return jsonb_build_object('error','already_owned'); end if;
  select c.* into r from private.merchant_service_orders o join public.checkout_requests c on c.id=o.request_id
   where o.user_id=uid and o.service_id=service.id and (c.status='submitted' or(c.status in ('created','prepared') and c.expires_at>now())) order by c.created_at desc limit 1;
  if found then return jsonb_build_object('id',r.id); end if;
  select * into org from public.organizations where id=service.organization_id for share;
  if not service.published or org.kind<>'merchant' or org.status<>'approved' or not ((service.seller_source='merchant' and private.merchant_service_visible(org.id,service.venue_id,service.destination_id)) or (service.seller_source='citypass' and private.platform_service_visible(org.id,service.reference_venue_id,service.destination_id))) then return jsonb_build_object('error','unavailable'); end if;
  if service.seller_source='citypass' then
   select * into treasury from private.citypass_treasuries where organization_id=org.id and destination_id=service.destination_id for share;
   if not found then return jsonb_build_object('error','wallet_required'); end if;
   source:='citypass'; payout.address:=treasury.address; payout.verified_by:=null;
  else
  select * into payout from public.merchant_payouts where organization_id=org.id for share;
  if not found or not exists(select 1 from public.organization_members m join public.user_profiles u on u.id=m.user_id where m.organization_id=org.id and m.user_id=payout.verified_by and m.role='owner' and u.wallet_address=payout.address and u.network='testnet') then return jsonb_build_object('error','wallet_required'); end if;
  end if;
  if profile.wallet_address=payout.address or private.is_member(org.id,array['owner','manager','merchant']) then return jsonb_build_object('error','self_payment'); end if;
  perform private.activate_traveler();
  insert into public.checkout_requests(organization_id,destination_id,merchant_name,product,amount,payout_address,payout_verified_by,idempotency_key,payer_user_id,payer_address,status,payout_source,merchant_service_id)
   values(org.id,service.destination_id,org.name,service.name,service.amount,payout.address,payout.verified_by,gen_random_uuid(),uid,profile.wallet_address,'prepared',source,service.id) returning id into rid;
  insert into private.merchant_service_orders values(rid,service.id,uid);
  insert into private.audit_events(actor_id,organization_id,action,entity_id) values(uid,org.id,'service_ordered',rid);
  return jsonb_build_object('id',rid);
 end if;
 return jsonb_build_object('error','invalid');
 exception when invalid_text_representation or numeric_value_out_of_range then return jsonb_build_object('error','invalid');
end $$;
revoke all on function private.merchant_service_command(text,jsonb) from public;
create function public.merchant_service_command(action text,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.merchant_service_command(action,payload);$$;
revoke all on function public.merchant_service_command(text,jsonb) from public;
grant execute on function private.merchant_service_command(text,jsonb),public.merchant_service_command(text,jsonb) to anon,authenticated;

-- Extend canonical sources: 4 paid service acquisition; 5 self-reported exploration.
alter table private.activity_outbox drop constraint activity_outbox_kind_check;
alter table private.activity_outbox add constraint activity_outbox_kind_check check(kind in (0,1,2,4,5));
alter table private.activity_outbox drop constraint activity_outbox_check;
alter table private.activity_outbox add constraint activity_outbox_check check((kind=0 and destination_id is null and subject is null) or(kind in (1,2,4,5) and destination_id is not null and subject is not null));
alter table private.exploration_activities add column id uuid not null default gen_random_uuid() unique;
create function private.enqueue_exploration_activity() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into private.activity_outbox(kind,source_id,user_id,wallet,destination_id,subject)
 select 5,new.id,u.id,u.wallet_address,new.destination_id,a.id from public.user_profiles u cross join private.exploration_activities a
 where u.id=new.user_id and u.network='testnet' and u.wallet_address is not null and u.pollar_application is not null and a.guide_slug=new.guide_slug and a.item_id=new.item_id
 on conflict(kind,source_id) do nothing;
 return new;
end $$;
revoke all on function private.enqueue_exploration_activity() from public,anon,authenticated;
create trigger queue_exploration_activity after insert on public.exploration_claims for each row execute function private.enqueue_exploration_activity();
-- Backfill real collected exploration stamps, never fabricate a claim.
insert into private.activity_outbox(kind,source_id,user_id,wallet,destination_id,subject)
 select 5,c.id,u.id,u.wallet_address,c.destination_id,a.id from public.exploration_claims c join public.user_profiles u on u.id=c.user_id join private.exploration_activities a on a.guide_slug=c.guide_slug and a.item_id=c.item_id
 where u.network='testnet' and u.wallet_address is not null and u.pollar_application is not null on conflict(kind,source_id) do nothing;

create function private.fulfill_merchant_service() returns trigger language plpgsql security definer set search_path='' as $$
declare o private.merchant_service_orders%rowtype; s public.merchant_services%rowtype; c public.checkout_requests%rowtype; acquisition uuid;
begin
 select * into o from private.merchant_service_orders where request_id=new.request_id;
 if not found then return new; end if;
 select * into c from public.checkout_requests where id=new.request_id;
 select * into s from public.merchant_services where id=o.service_id;
 if c.merchant_service_id is distinct from s.id or c.payer_user_id is distinct from o.user_id or c.network<>'testnet' or c.transaction_hash is distinct from new.transaction_hash or c.amount::numeric<>s.amount::numeric or c.organization_id<>s.organization_id or c.destination_id<>s.destination_id then raise exception 'service receipt mismatch'; end if;
 perform 1 from public.user_profiles where id=o.user_id for update;
 insert into public.merchant_service_acquisitions(user_id,service_id,request_id,destination_id,service_name,stamp_name)
 values(o.user_id,s.id,new.request_id,s.destination_id,s.name,s.stamp_name) returning id into acquisition;
 insert into private.activity_outbox(kind,source_id,user_id,wallet,destination_id,subject) values(4,acquisition,o.user_id,c.payer_address,s.destination_id,s.id);
 insert into private.audit_events(actor_id,organization_id,action,entity_id) values(o.user_id,s.organization_id,'service_acquired',acquisition);
 return new;
end $$;
revoke all on function private.fulfill_merchant_service() from public,anon,authenticated;
create trigger fulfill_merchant_service after insert on public.payment_receipts for each row execute function private.fulfill_merchant_service();

-- Backfill newly verified wallets as well as claims made after login.
create function private.enqueue_extra_wallet_activity() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.network='testnet' and new.wallet_address is not null and new.pollar_application is not null then
  insert into private.activity_outbox(kind,source_id,user_id,wallet,destination_id,subject)
  select 5,c.id,new.id,new.wallet_address,c.destination_id,a.id from public.exploration_claims c join private.exploration_activities a on a.guide_slug=c.guide_slug and a.item_id=c.item_id where c.user_id=new.id
  on conflict(kind,source_id) do nothing;
 end if;
 return new;
end $$;
revoke all on function private.enqueue_extra_wallet_activity() from public,anon,authenticated;
create trigger queue_extra_wallet_activity after insert or update of wallet_address,network on public.user_profiles for each row execute function private.enqueue_extra_wallet_activity();

alter table private.activity_deliveries add column if not exists transaction_hash text check(transaction_hash ~ '^[a-f0-9]{64}$');
create or replace function private.activity_worker_command(payload text,mac text) returns jsonb language plpgsql security definer set search_path='' as $$
declare p jsonb; secret text; issued bigint; target text; nonce uuid; job private.activity_outbox%rowtype; lockrow private.activity_worker_lock%rowtype; token uuid;
begin
 if payload is null or length(payload)>2048 or coalesce(mac,'') !~ '^[a-f0-9]{64}$' then return jsonb_build_object('error','unauthorized'); end if;
 select key_hex into secret from private.pollar_bridge_config where singleton;
 if secret is null or private.bridge_hmac(secret,'citypassport-activity-worker-v1'||chr(10)||payload)<>mac then return jsonb_build_object('error','unauthorized'); end if;
 p:=payload::jsonb;
 if p->>'transaction_hash' is not null and p->>'transaction_hash' !~ '^[a-f0-9]{64}$' then return jsonb_build_object('error','invalid'); end if;
 issued:=(p->>'issued')::bigint; nonce:=(p->>'nonce')::uuid; target:=p->>'contract_id';
 if issued is null or issued<extract(epoch from now())::bigint-30 or issued>extract(epoch from now())::bigint+5 or nonce is null or coalesce(target,'') !~ '^C[A-Z2-7]{55}$' then return jsonb_build_object('error','unauthorized'); end if;
 delete from private.activity_worker_nonces where created_at<now()-interval '2 minutes';
 insert into private.activity_worker_nonces(nonce) values(nonce) on conflict do nothing;
 if not found then return jsonb_build_object('error','replay'); end if;
 select * into lockrow from private.activity_worker_lock where singleton for update;
 if p->>'action'='claim' then
  if lockrow.expires_at>now() then return jsonb_build_object('job',null); end if;
  select o.* into job from private.activity_outbox o left join private.activity_deliveries d on d.job_id=o.id and d.contract_id=target
   where d.job_id is null or (d.state='pending' and d.retry_at<=now()) order by o.created_at,o.kind,o.id limit 1;
  if not found then return jsonb_build_object('job',null); end if;
  token:=gen_random_uuid();
  update private.activity_worker_lock set lease_token=token,job_id=job.id,contract_id=target,expires_at=now()+interval '2 minutes' where singleton;
  insert into private.activity_deliveries(job_id,contract_id,state,attempts) values(job.id,target,'pending',1)
   on conflict(job_id,contract_id) do update set attempts=private.activity_deliveries.attempts+1;
  return jsonb_build_object('job',jsonb_build_object('id',job.id,'kind',job.kind,'source_id',job.source_id,'wallet',job.wallet,'destination_id',job.destination_id,'subject',job.subject,'lease_token',token));
 elsif p->>'action'='finish' then
  if lockrow.expires_at<=now() or lockrow.lease_token is distinct from (p->>'lease_token')::uuid or lockrow.job_id is distinct from (p->>'job_id')::uuid or lockrow.contract_id is distinct from target then return jsonb_build_object('error','stale_lease'); end if;
  if p->>'state'='confirmed' and coalesce(p->>'evidence_hash','') ~ '^[a-f0-9]{64}$' then
   update private.activity_deliveries set state='confirmed',confirmed_at=now(),evidence_hash=p->>'evidence_hash',last_error=null,transaction_hash=coalesce(p->>'transaction_hash',transaction_hash) where job_id=lockrow.job_id and contract_id=target and state='pending';
   if found then insert into private.audit_events(action,entity_id) values('activity_confirmed',lockrow.job_id); end if;
  elsif p->>'state'='retry' and p->>'error' in ('rpc','conflict') then
   update private.activity_deliveries set retry_at=now()+interval '1 minute',last_error=p->>'error' where job_id=lockrow.job_id and contract_id=target and state='pending';
  else return jsonb_build_object('error','invalid'); end if;
  update private.activity_worker_lock set expires_at='-infinity',lease_token=null,job_id=null,contract_id=null where singleton;
  return jsonb_build_object('ok',true);
 end if;
 return jsonb_build_object('error','invalid');
 exception when invalid_text_representation or numeric_value_out_of_range then return jsonb_build_object('error','invalid');
end $$;

create or replace function private.passport_activity_status(contract_id text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=private.current_actor(); address text; totals jsonb; recent jsonb;
begin
 if uid is null then return jsonb_build_object('error','unauthorized'); end if;
 if coalesce(contract_id,'') !~ '^C[A-Z2-7]{55}$' then return jsonb_build_object('error','invalid'); end if;
 select wallet_address into address from public.user_profiles where id=uid and network='testnet';
 select jsonb_build_object('pending',count(*) filter(where d.state is distinct from 'confirmed'),'failed',count(*) filter(where d.last_error is not null)) into totals
 from private.activity_outbox o left join private.activity_deliveries d on d.job_id=o.id and d.contract_id=passport_activity_status.contract_id where o.user_id=uid and o.wallet=address;
 select coalesce(jsonb_agg(row_to_json(r)),'[]'::jsonb) into recent from (
  select o.id,o.kind,coalesce(h.request_id,a.request_id) as request_id,coalesce(d.state,'pending') as state,d.transaction_hash,d.confirmed_at,o.created_at
  from private.activity_outbox o left join private.activity_deliveries d on d.job_id=o.id and d.contract_id=passport_activity_status.contract_id
  left join public.destination_pass_holdings h on o.kind=1 and h.id=o.source_id
  left join public.merchant_service_acquisitions a on o.kind=4 and a.id=o.source_id
  where o.user_id=uid and o.wallet=address order by o.created_at desc,o.id limit 20
 ) r;
 return totals||jsonb_build_object('recent',recent);
end $$;

create function private.immutable_service_terms() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' then raise exception 'service history is immutable'; end if;
 if (to_jsonb(new)-'published') is distinct from (to_jsonb(old)-'published') then raise exception 'published service terms are immutable'; end if;
 return new;
end $$;
revoke all on function private.immutable_service_terms() from public,anon,authenticated;
create trigger immutable_service_terms before update or delete on public.merchant_services for each row execute function private.immutable_service_terms();

-- User-approved platform services and prices. Seller remains CityPass; source venues remain discovery references.
-- Each service delivers a digital passport purchase record/stamp, not venue admission or third-party fulfillment.
insert into public.merchant_services(id,organization_id,destination_id,reference_venue_id,seller_source,name,stamp_name,amount)
 select gen_random_uuid(),t.organization_id,v.destination_id,v.id,'citypass',v.name,v.name,
 (25+25*((row_number() over(partition by v.destination_id order by v.id)-1)%6))::text
 from public.venues v join private.citypass_treasuries t on t.destination_id=v.destination_id
 where v.participation_status<>'suspended' and v.organization_id is null;
