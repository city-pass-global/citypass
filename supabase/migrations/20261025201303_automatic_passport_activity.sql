-- Durable transactional source queue. Only accepted database transitions create jobs.
create table private.activity_outbox (
 id uuid primary key default gen_random_uuid(),
 kind integer not null check(kind in (0,1,2)),
 source_id uuid not null,
 user_id uuid not null references public.user_profiles(id),
 wallet text not null check(wallet ~ '^G[A-Z2-7]{55}$'),
 destination_id uuid references public.destinations(id),
 subject uuid,
 created_at timestamptz not null default now(),
 unique(kind,source_id),
 check((kind=0 and destination_id is null and subject is null) or (kind in (1,2) and destination_id is not null and subject is not null))
);
create table private.activity_deliveries (
 job_id uuid not null references private.activity_outbox(id),
 contract_id text not null check(contract_id ~ '^C[A-Z2-7]{55}$'),
 state text not null check(state in ('pending','confirmed')),
 attempts integer not null default 0 check(attempts>=0),
 retry_at timestamptz not null default now(),
 evidence_hash text check(evidence_hash ~ '^[a-f0-9]{64}$'),
 last_error text check(last_error in ('rpc','conflict')),
 confirmed_at timestamptz,
 primary key(job_id,contract_id),
 check((state='confirmed')=(confirmed_at is not null))
);
create table private.activity_worker_lock (
 singleton boolean primary key default true check(singleton),
 lease_token uuid, job_id uuid references private.activity_outbox(id), contract_id text,
 expires_at timestamptz not null default '-infinity'
);
insert into private.activity_worker_lock(singleton) values(true);
create table private.activity_worker_nonces (
 nonce uuid primary key, created_at timestamptz not null default now()
);
alter table private.activity_outbox enable row level security;
alter table private.activity_deliveries enable row level security;
alter table private.activity_worker_lock enable row level security;
alter table private.activity_worker_nonces enable row level security;
revoke all on private.activity_outbox,private.activity_deliveries,private.activity_worker_lock,private.activity_worker_nonces from public,anon,authenticated;
create index activity_outbox_actor on private.activity_outbox(user_id,wallet);
create index activity_delivery_retry on private.activity_deliveries(contract_id,retry_at) where state='pending';
create trigger immutable_activity_source before update or delete on private.activity_outbox for each row execute function private.reject_ledger_change();

-- Freeze the verified wallet; a later profile update cannot redirect accepted activity.
create function private.enqueue_activity() returns trigger language plpgsql security definer set search_path='' as $$
declare uid uuid; address text; dest uuid; subj uuid; k integer;
begin
 if tg_table_name='destination_pass_holdings' then
  uid:=new.user_id; dest:=new.destination_id; subj:=new.id; k:=1;
  select payer_address into address from public.checkout_requests where id=new.request_id and network='testnet' and payer_user_id=uid and exists(select 1 from public.payment_receipts r where r.request_id=new.request_id);
 elsif tg_table_name='stamp_claims' then
  select p.user_id,u.wallet_address into uid,address from public.passport_profiles p join public.user_profiles u on u.id=p.user_id where p.id=new.passport_id and u.network='testnet' and u.pollar_application is not null;
  dest:=new.destination_id; subj:=new.stamp_id; k:=2;
 else
  if new.network is distinct from 'testnet' or new.wallet_address is null or new.pollar_application is null then return new; end if;
  uid:=new.id; address:=new.wallet_address; k:=0;
  insert into private.activity_outbox(kind,source_id,user_id,wallet,destination_id,subject)
   select 2,c.id,uid,address,c.destination_id,c.stamp_id from public.stamp_claims c join public.passport_profiles p on p.id=c.passport_id where p.user_id=uid
   on conflict(kind,source_id) do nothing;
 end if;
 if address is not null then
  insert into private.activity_outbox(kind,source_id,user_id,wallet,destination_id,subject) values(k,new.id,uid,address,dest,subj) on conflict(kind,source_id) do nothing;
 end if;
 return new;
end $$;
revoke all on function private.enqueue_activity() from public,anon,authenticated;
create trigger queue_verified_pass_activity after insert on public.destination_pass_holdings for each row execute function private.enqueue_activity();
create trigger queue_verified_stamp_activity after insert on public.stamp_claims for each row execute function private.enqueue_activity();
create trigger queue_verified_passport_activity after insert or update of wallet_address,network on public.user_profiles for each row execute function private.enqueue_activity();

-- Existing verified records join the same queue, without creating new awards or claims.
insert into private.activity_outbox(kind,source_id,user_id,wallet)
 select 0,id,id,wallet_address from public.user_profiles where network='testnet' and wallet_address is not null and pollar_application is not null;
insert into private.activity_outbox(kind,source_id,user_id,wallet,destination_id,subject)
 select 1,h.id,h.user_id,c.payer_address,h.destination_id,h.id from public.destination_pass_holdings h join public.checkout_requests c on c.id=h.request_id where c.status='confirmed' and c.network='testnet' and c.payer_address is not null and c.payer_user_id=h.user_id;
insert into private.activity_outbox(kind,source_id,user_id,wallet,destination_id,subject)
 select 2,c.id,u.id,u.wallet_address,c.destination_id,c.stamp_id from public.stamp_claims c join public.passport_profiles p on p.id=c.passport_id join public.user_profiles u on u.id=p.user_id where u.network='testnet' and u.wallet_address is not null and u.pollar_application is not null;

-- Worker authority is a fresh, domain-separated backend MAC, never JWT metadata or an app cookie.
create function private.activity_worker_command(payload text,mac text) returns jsonb language plpgsql security definer set search_path='' as $$
declare p jsonb; secret text; issued bigint; target text; nonce uuid; job private.activity_outbox%rowtype; lockrow private.activity_worker_lock%rowtype; token uuid;
begin
 if payload is null or length(payload)>2048 or coalesce(mac,'') !~ '^[a-f0-9]{64}$' then return jsonb_build_object('error','unauthorized'); end if;
 select key_hex into secret from private.pollar_bridge_config where singleton;
 if secret is null or private.bridge_hmac(secret,'citypassport-activity-worker-v1'||chr(10)||payload)<>mac then return jsonb_build_object('error','unauthorized'); end if;
 p:=payload::jsonb; issued:=(p->>'issued')::bigint; nonce:=(p->>'nonce')::uuid; target:=p->>'contract_id';
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
   update private.activity_deliveries set state='confirmed',confirmed_at=now(),evidence_hash=p->>'evidence_hash',last_error=null where job_id=lockrow.job_id and contract_id=target and state='pending';
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
revoke all on function private.activity_worker_command(text,text) from public;
create function public.activity_worker_command(payload text,mac text) returns jsonb language sql security invoker set search_path='' as $$ select private.activity_worker_command(payload,mac); $$;
revoke all on function public.activity_worker_command(text,text) from public;
grant execute on function private.activity_worker_command(text,text),public.activity_worker_command(text,text) to anon,authenticated;

create function private.passport_activity_status(contract_id text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=private.current_actor(); address text;
begin
 if uid is null then return jsonb_build_object('error','unauthorized'); end if;
 if coalesce(contract_id,'') !~ '^C[A-Z2-7]{55}$' then return jsonb_build_object('error','invalid'); end if;
 select wallet_address into address from public.user_profiles where id=uid and network='testnet';
 return (select jsonb_build_object('pending',count(*) filter(where d.state is distinct from 'confirmed'),'failed',count(*) filter(where d.last_error is not null)) from private.activity_outbox o left join private.activity_deliveries d on d.job_id=o.id and d.contract_id=passport_activity_status.contract_id where o.user_id=uid and o.wallet=address);
end $$;
revoke all on function private.passport_activity_status(text) from public;
create function public.passport_activity_status(contract_id text) returns jsonb language sql security invoker set search_path='' as $$ select private.passport_activity_status(contract_id); $$;
revoke all on function public.passport_activity_status(text) from public;
grant execute on function private.passport_activity_status(text),public.passport_activity_status(text) to anon,authenticated;
