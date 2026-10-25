-- Merchant-owned check-in setup. Directory references are never promoted to partners.
create table private.merchant_checkin_points (
 organization_id uuid primary key references public.organizations(id),
 venue_id uuid not null unique references public.venues(id),
 stamp_id uuid not null unique references public.stamp_definitions(id),
 command_id uuid not null unique,
 created_by uuid not null references public.user_profiles(id),
 created_at timestamptz not null default now()
);
alter table private.merchant_checkin_points enable row level security;
revoke all on private.merchant_checkin_points from public,anon,authenticated;
create function private.merchant_checkin_command(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.current_actor(); org public.organizations%rowtype; point private.merchant_checkin_points%rowtype; vid uuid; sid uuid; command uuid;
begin
 if uid is null then return jsonb_build_object('error','unauthorized'); end if;
 if coalesce(length(trim(payload->>'venue_name')),0) not between 2 and 120 or coalesce(length(trim(payload->>'stamp_name')),0) not between 2 and 120 then return jsonb_build_object('error','invalid'); end if;
 command:=(payload->>'command_id')::uuid;
 if command is null then return jsonb_build_object('error','invalid'); end if;
 select * into org from public.organizations where id=(payload->>'organization_id')::uuid for update;
 if not found or org.kind<>'merchant' or org.status<>'approved' or not private.is_member(org.id,array['owner','manager']) then return jsonb_build_object('error','forbidden'); end if;
 select * into point from private.merchant_checkin_points where organization_id=org.id;
 if found then
  if point.command_id=command and exists(select 1 from public.venues where id=point.venue_id and name=trim(payload->>'venue_name')) and exists(select 1 from public.stamp_definitions where id=point.stamp_id and name=trim(payload->>'stamp_name')) then return jsonb_build_object('id',point.stamp_id); end if;
  return jsonb_build_object('error','already_configured');
 end if;
 if exists(select 1 from private.merchant_checkin_points where command_id=command) then return jsonb_build_object('error','idempotency_conflict'); end if;
 insert into public.venues(organization_id,destination_id,name,category,participation_status) values(org.id,org.destination_id,trim(payload->>'venue_name'),'culture','participating') returning id into vid;
 insert into public.stamp_definitions(venue_id,destination_id,name) values(vid,org.destination_id,trim(payload->>'stamp_name')) returning id into sid;
 insert into private.merchant_checkin_points values(org.id,vid,sid,command,uid,now());
 insert into private.audit_events(actor_id,organization_id,action,entity_id) values(uid,org.id,'merchant_checkin_configured',sid);
 return jsonb_build_object('id',sid);
 exception when invalid_text_representation then return jsonb_build_object('error','invalid');
end $$;
revoke all on function private.merchant_checkin_command(jsonb) from public;
create function public.merchant_checkin_command(payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.merchant_checkin_command(payload);$$;
revoke all on function public.merchant_checkin_command(jsonb) from public;
grant execute on function private.merchant_checkin_command(jsonb),public.merchant_checkin_command(jsonb) to anon,authenticated;

-- Preserve the actual attestation transaction so users can distinguish it from their payment.
alter table private.activity_deliveries add column transaction_hash text check(transaction_hash ~ '^[a-f0-9]{64}$');
alter function private.activity_worker_command(text,text) rename to activity_worker_command_v1;
revoke all on function private.activity_worker_command_v1(text,text) from public,anon,authenticated;
create function private.activity_worker_command(payload text,mac text) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; p jsonb;
begin
 if payload is null or length(payload)>2048 then return jsonb_build_object('error','invalid'); end if;
 p:=payload::jsonb;
 if p->>'transaction_hash' is not null and p->>'transaction_hash' !~ '^[a-f0-9]{64}$' then return jsonb_build_object('error','invalid'); end if;
 result:=private.activity_worker_command_v1(payload,mac);
 if result->>'ok'='true' and p->>'state'='confirmed' and p->>'transaction_hash' is not null then
  update private.activity_deliveries set transaction_hash=coalesce(transaction_hash,p->>'transaction_hash') where job_id=(p->>'job_id')::uuid and contract_id=p->>'contract_id' and state='confirmed';
 end if;
 return result;
 exception when invalid_text_representation then return jsonb_build_object('error','invalid');
end $$;
revoke all on function private.activity_worker_command(text,text) from public;
grant execute on function private.activity_worker_command(text,text) to anon,authenticated;
create or replace function public.activity_worker_command(payload text,mac text) returns jsonb language sql security invoker set search_path='' as $$select private.activity_worker_command(payload,mac);$$;
revoke all on function public.activity_worker_command(text,text) from public;
grant execute on function public.activity_worker_command(text,text) to anon,authenticated;

create or replace function private.passport_activity_status(contract_id text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=private.current_actor(); address text; totals jsonb; recent jsonb;
begin
 if uid is null then return jsonb_build_object('error','unauthorized'); end if;
 if coalesce(contract_id,'') !~ '^C[A-Z2-7]{55}$' then return jsonb_build_object('error','invalid'); end if;
 select wallet_address into address from public.user_profiles where id=uid and network='testnet';
 select jsonb_build_object('pending',count(*) filter(where d.state is distinct from 'confirmed'),'failed',count(*) filter(where d.last_error is not null)) into totals
  from private.activity_outbox o left join private.activity_deliveries d on d.job_id=o.id and d.contract_id=passport_activity_status.contract_id where o.user_id=uid and o.wallet=address;
 select coalesce(jsonb_agg(row_to_json(r)),'[]'::jsonb) into recent from (
  select o.id,o.kind,o.destination_id,h.request_id,coalesce(d.state,'pending') as state,d.transaction_hash,d.confirmed_at,o.created_at
  from private.activity_outbox o left join private.activity_deliveries d on d.job_id=o.id and d.contract_id=passport_activity_status.contract_id
  left join public.destination_pass_holdings h on o.kind=1 and h.id=o.source_id
  where o.user_id=uid and o.wallet=address order by o.created_at desc,o.id limit 10
 ) r;
 return totals||jsonb_build_object('recent',recent);
end $$;
