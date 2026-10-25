-- Pollar is the only login. Application profiles/sessions are independent of Supabase Auth.
create table public.user_profiles (
 id uuid primary key default gen_random_uuid(),
 pollar_application text, pollar_subject text,
 email text check(length(email)<=254), display_name text check(length(display_name)<=120),
 wallet_address text check(wallet_address ~ '^G[A-Z2-7]{55}$'),
 network text check(network in ('testnet','mainnet')),
 created_at timestamptz not null default now(),
 unique(pollar_application,pollar_subject),
 check ((pollar_application is null)=(pollar_subject is null)),
 check(pollar_application is null or length(pollar_application) between 1 and 255),
 check(pollar_subject is null or length(pollar_subject) between 1 and 255)
);
alter table public.user_profiles enable row level security;
revoke all on public.user_profiles from public,anon,authenticated;
-- Preserve original internal UUIDs. Never attach legacy records by email.
insert into public.user_profiles(id) select id from auth.users;
alter table public.organization_members drop constraint organization_members_user_id_fkey;
alter table public.organization_members add constraint organization_members_user_id_fkey foreign key(user_id) references public.user_profiles(id);
alter table public.passport_profiles drop constraint passport_profiles_user_id_fkey;
alter table public.passport_profiles add constraint passport_profiles_user_id_fkey foreign key(user_id) references public.user_profiles(id);
alter table public.traveler_profiles drop constraint traveler_profiles_user_id_fkey;
alter table public.traveler_profiles add constraint traveler_profiles_user_id_fkey foreign key(user_id) references public.user_profiles(id);

create table private.pollar_bridge_config (
 singleton boolean primary key default true check(singleton),
 key_hex text not null check(key_hex ~ '^[a-f0-9]{64}$')
);
create table private.app_sessions (
 token_hash text primary key check(token_hash ~ '^[a-f0-9]{64}$'),
 user_id uuid not null references public.user_profiles(id),
 expires_at timestamptz not null,
 revoked_at timestamptz, created_at timestamptz not null default now()
);
create index app_sessions_user_idx on private.app_sessions(user_id);
alter table private.pollar_bridge_config enable row level security;
alter table private.app_sessions enable row level security;
revoke all on private.pollar_bridge_config,private.app_sessions from public,anon,authenticated;

create function private.current_actor() returns uuid
language plpgsql stable security definer set search_path='' as $$
declare raw text;
begin
 raw:=coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb->>'x-citypassport-session';
 if raw is null or raw !~ '^[a-f0-9]{64}$' then return null; end if;
 return (select user_id from private.app_sessions where token_hash=encode(sha256(convert_to(raw,'UTF8')),'hex') and revoked_at is null and expires_at>now());
end $$;
revoke all on function private.current_actor() from public;
grant execute on function private.current_actor() to anon,authenticated;

-- RFC 2104 HMAC-SHA256. Fixed 32-byte key; validated against Node crypto in tests.
create function private.bridge_hmac(key_hex text,message text) returns text
language plpgsql immutable security invoker set search_path='' as $$
declare padded bytea:=decode(key_hex||repeat('00',32),'hex'); ipad bytea:=padded; opad bytea:=padded; i integer;
begin
 for i in 0..63 loop
  ipad:=set_byte(ipad,i,get_byte(padded,i)#54); opad:=set_byte(opad,i,get_byte(padded,i)#92);
 end loop;
 return encode(sha256(opad||sha256(ipad||convert_to(message,'UTF8'))),'hex');
end $$;
revoke all on function private.bridge_hmac(text,text) from public,anon,authenticated;

create function private.create_pollar_session(payload text,mac text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare secret text; p jsonb; uid uuid; exp bigint; issued bigint;
begin
 if payload is null or length(payload)>8192 or mac is null or mac !~ '^[a-f0-9]{64}$' then return jsonb_build_object('error','unauthorized'); end if;
 select key_hex into secret from private.pollar_bridge_config where singleton;
 if secret is null or private.bridge_hmac(secret,payload)<>mac then return jsonb_build_object('error','unauthorized'); end if;
 p:=payload::jsonb; exp:=(p->>'expires')::bigint; issued:=(p->>'issued')::bigint;
 if exp is null or issued is null or issued<extract(epoch from now())::bigint-30 or issued>extract(epoch from now())::bigint+5 or exp<=extract(epoch from now())::bigint or exp>issued+3600
 or coalesce(p->>'token_hash','') !~ '^[a-f0-9]{64}$'
 or coalesce(length(p->>'application'),0) not between 1 and 255 or coalesce(length(p->>'subject'),0) not between 1 and 255
 or coalesce(p->>'network','') not in ('testnet','mainnet') then return jsonb_build_object('error','unauthorized'); end if;
 insert into public.user_profiles(pollar_application,pollar_subject,email,display_name,wallet_address,network)
 values(p->>'application',p->>'subject',p->>'email',p->>'name',p->>'wallet',p->>'network')
 on conflict(pollar_application,pollar_subject) do update set email=excluded.email,display_name=excluded.display_name,wallet_address=excluded.wallet_address,network=excluded.network
 returning id into uid;
 insert into private.app_sessions(token_hash,user_id,expires_at) values(p->>'token_hash',uid,to_timestamp(exp));
 if p->>'previous_hash' ~ '^[a-f0-9]{64}$' then
  update private.app_sessions set revoked_at=now() where token_hash=p->>'previous_hash' and revoked_at is null;
 end if;
 -- Global identity creation is automatic on first verified Pollar login.
 insert into public.traveler_profiles(user_id) values(uid) on conflict(user_id) do nothing;
 insert into private.audit_events(actor_id,action,entity_id) values(uid,'pollar_session',uid);
 return jsonb_build_object('id',uid);
 exception when unique_violation then return jsonb_build_object('error','session_replay');
end $$;
revoke all on function private.create_pollar_session(text,text) from public;
create function public.create_pollar_session(payload text,mac text) returns jsonb
language sql security invoker set search_path='' as $$ select private.create_pollar_session(payload,mac); $$;
revoke all on function public.create_pollar_session(text,text) from public;
grant execute on function private.create_pollar_session(text,text),public.create_pollar_session(text,text) to anon,authenticated;

create function private.end_app_session() returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.current_actor(); raw text;
begin
 if uid is null then return; end if;
 raw:=current_setting('request.headers',true)::jsonb->>'x-citypassport-session';
 update private.app_sessions set revoked_at=now() where token_hash=encode(sha256(convert_to(raw,'UTF8')),'hex') and user_id=uid;
end $$;
revoke all on function private.end_app_session() from public;
create function public.end_app_session() returns void language sql security invoker set search_path='' as $$ select private.end_app_session(); $$;
revoke all on function public.end_app_session() from public;
grant execute on function private.end_app_session(),public.end_app_session() to anon,authenticated;

-- Both Data API roles still require an opaque, live, database-validated session.
-- Supabase Auth JWTs and caller-supplied user IDs no longer authorize application data.
grant select on public.user_profiles,public.traveler_profiles,public.organizations,public.organization_members,public.passport_profiles,public.stamp_claims,public.hotel_reservations,public.precheckin_submissions,public.points_ledger to anon,authenticated;
create policy own_user_profile on public.user_profiles for select to anon,authenticated using(id=(select private.current_actor()));
drop policy own_traveler on public.traveler_profiles;
create policy own_traveler on public.traveler_profiles for select to anon,authenticated using(user_id=(select private.current_actor()));
drop policy own_org on public.organizations;
create policy own_org on public.organizations for select to anon,authenticated using(private.is_member(id));
drop policy own_membership on public.organization_members;
create policy own_membership on public.organization_members for select to anon,authenticated using(user_id=(select private.current_actor()));
drop policy own_passport on public.passport_profiles;
create policy own_passport on public.passport_profiles for select to anon,authenticated using(user_id=(select private.current_actor()));
drop policy own_claims on public.stamp_claims;
create policy own_claims on public.stamp_claims for select to anon,authenticated using(exists(select 1 from public.passport_profiles p where p.id=passport_id and p.user_id=(select private.current_actor())));
drop policy hotel_reservations_access on public.hotel_reservations;
create policy hotel_reservations_access on public.hotel_reservations for select to anon,authenticated using(private.is_member(organization_id,array['owner','manager','receptionist']));
drop policy hotel_submissions_access on public.precheckin_submissions;
create policy hotel_submissions_access on public.precheckin_submissions for select to anon,authenticated using(private.is_member(organization_id,array['owner','manager','receptionist']));
drop policy own_ledger on public.points_ledger;
create policy own_ledger on public.points_ledger for select to anon,authenticated using(exists(select 1 from public.passport_profiles p where p.id=passport_id and p.user_id=(select private.current_actor())));

create or replace function private.is_member(org uuid,roles text[] default array['owner','manager','receptionist','merchant','operator']) returns boolean
language sql stable security definer set search_path='' as $$
 select private.current_actor() is not null and exists(select 1 from public.organization_members where organization_id=org and user_id=private.current_actor() and role=any(roles));
$$;
grant execute on function private.is_member(uuid,text[]) to anon,authenticated;

create or replace function private.activate_traveler() returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.current_actor(); traveler uuid;
begin
 if uid is null then return jsonb_build_object('error','unauthorized'); end if;
 insert into public.traveler_profiles(user_id) values(uid)
  on conflict(user_id) do nothing returning id into traveler;
 if traveler is not null then
  insert into private.audit_events(actor_id,action,entity_id) values(uid,'activate_traveler',traveler);
 else
  select id into traveler from public.traveler_profiles where user_id=uid;
 end if;
 return jsonb_build_object('id',traveler);
end $$;

create or replace function private.command(action text, payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=private.current_actor(); org uuid; dest uuid; rid uuid; pid uuid; raw text; hashed text;
 reservation public.hotel_reservations%rowtype; invitation private.precheckin_invitations%rowtype;
 qr private.qr_credentials%rowtype; stamp public.stamp_definitions%rowtype; rate private.rate_limits%rowtype;
 target_status text; claim_id uuid;
begin
 if action<>'submit_precheckin' and uid is null then return jsonb_build_object('error','unauthorized'); end if;
 if action='activate_traveler' then
  return private.activate_traveler();
 elsif action='activate_passport' then
  dest:=(payload->>'destination_id')::uuid;
  perform private.activate_traveler();
  insert into public.passport_profiles(user_id,destination_id) values(uid,dest) on conflict(user_id,destination_id) do nothing;
  select id into pid from public.passport_profiles where user_id=uid and destination_id=dest;
  return jsonb_build_object('id',pid);
 elsif action='create_hotel' then
  if length(trim(payload->>'name')) not between 2 and 120 then return jsonb_build_object('error','invalid'); end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  if (select count(*) from public.organization_members where user_id=uid and role='owner')>=3 then return jsonb_build_object('error','limit'); end if;
  insert into public.organizations(destination_id,name,kind) values((payload->>'destination_id')::uuid,trim(payload->>'name'),'hotel') returning id into org;
  insert into public.organization_members values(org,uid,'owner');
  insert into private.audit_events(actor_id,organization_id,action,entity_id) values(uid,org,action,org);
  return jsonb_build_object('id',org);
 elsif action='create_reservation' then
  org:=(payload->>'organization_id')::uuid;
  if not private.is_member(org,array['owner','manager','receptionist']) or not exists(select 1 from public.organizations where id=org and kind='hotel' and status<>'suspended') then return jsonb_build_object('error','forbidden'); end if;
  insert into public.hotel_reservations(organization_id,reference,guest_email,arrival,departure,guest_count)
   values(org,trim(payload->>'reference'),lower(trim(payload->>'email')),(payload->>'arrival')::date,(payload->>'departure')::date,(payload->>'guest_count')::int) returning id into rid;
  insert into private.audit_events(actor_id,organization_id,action,entity_id) values(uid,org,action,rid);
  return jsonb_build_object('id',rid);
 elsif action in ('issue_invitation','review_reservation') then
  select * into reservation from public.hotel_reservations where id=(payload->>'reservation_id')::uuid for update;
  if not found or not private.is_member(reservation.organization_id,array['owner','manager','receptionist']) then return jsonb_build_object('error','forbidden'); end if;
  if action='issue_invitation' then
   if reservation.status<>'invited' or reservation.departure<current_date then return jsonb_build_object('error','invalid_state'); end if;
   raw:=payload->>'token';
   if raw is null or raw !~ '^[a-f0-9]{64}$' then return jsonb_build_object('error','invalid'); end if;
   hashed:=encode(sha256(convert_to(raw,'UTF8')),'hex');
   update private.precheckin_invitations set revoked_at=now() where reservation_id=reservation.id and consumed_at is null and revoked_at is null;
   insert into private.precheckin_invitations(reservation_id,token_hash,expires_at) values(reservation.id,hashed,least(now()+interval '72 hours',(reservation.departure+1)::timestamp at time zone 'UTC'));
  else
   target_status:=payload->>'status';
   if not ((reservation.status='submitted' and target_status='reviewed') or (reservation.status='reviewed' and target_status='ready_for_arrival') or (reservation.status='ready_for_arrival' and target_status='completed') or (reservation.status not in ('completed','cancelled') and target_status='cancelled')) then return jsonb_build_object('error','invalid_state'); end if;
   update public.hotel_reservations set status=target_status where id=reservation.id;
   if target_status='cancelled' then update private.precheckin_invitations set revoked_at=now() where reservation_id=reservation.id; end if;
  end if;
  insert into private.audit_events(actor_id,organization_id,action,entity_id) values(uid,reservation.organization_id,action||coalesce(':'||target_status,''),reservation.id);
  return jsonb_build_object('ok',true);
 elsif action='submit_precheckin' then
  raw:=payload->>'token';
  if raw is null or raw !~ '^[a-f0-9]{64}$' then return jsonb_build_object('error','invalid_invitation'); end if;
  hashed:=encode(sha256(convert_to(raw,'UTF8')),'hex');
  -- Lock reservation first, matching staff mutation order to avoid deadlocks.
  select reservation_id into rid from private.precheckin_invitations where token_hash=hashed;
  select * into reservation from public.hotel_reservations where id=rid for update;
  select * into invitation from private.precheckin_invitations where token_hash=hashed for update;
  if not found or invitation.consumed_at is not null or invitation.revoked_at is not null or invitation.expires_at<=now() or invitation.failed_attempts>=5 or reservation.status<>'invited' then return jsonb_build_object('error','invalid_invitation'); end if;
  if lower(trim(payload->>'email')) is distinct from reservation.guest_email then
   update private.precheckin_invitations set failed_attempts=failed_attempts+1 where id=invitation.id;
   return jsonb_build_object('error','invalid_invitation');
  end if;
  if payload->>'consent' is distinct from 'true' then return jsonb_build_object('error','invalid'); end if;
  insert into public.precheckin_submissions(reservation_id,organization_id,full_name,email,phone,nationality,residence,arrival_time,requests,retention_until)
  values(reservation.id,reservation.organization_id,trim(payload->>'full_name'),reservation.guest_email,payload->>'phone',payload->>'nationality',payload->>'residence',(payload->>'arrival_time')::time,coalesce(payload->>'requests',''),reservation.departure::timestamptz+interval '30 days');
  update private.precheckin_invitations set consumed_at=now() where id=invitation.id;
  update public.hotel_reservations set status='submitted' where id=reservation.id;
  insert into private.audit_events(organization_id,action,entity_id) values(reservation.organization_id,action,reservation.id);
  return jsonb_build_object('ok',true);
 elsif action='claim_stamp' then
  -- Persistent failed-attempt counter. Return business errors rather than rolling it back.
  insert into private.rate_limits values('claim:'||uid,now(),0) on conflict do nothing;
  select * into rate from private.rate_limits where key='claim:'||uid for update;
  if rate.window_start<now()-interval '1 minute' then update private.rate_limits set window_start=now(),attempts=0 where key=rate.key; rate.attempts:=0; end if;
  if rate.attempts>=10 then return jsonb_build_object('error','rate_limit'); end if;
  update private.rate_limits set attempts=attempts+1 where key=rate.key;
  raw:=payload->>'token';
  if raw is null or raw !~ '^[a-f0-9]{64}$' then return jsonb_build_object('error','invalid_qr'); end if;
  select * into qr from private.qr_credentials where token_hash=encode(sha256(convert_to(raw,'UTF8')),'hex') for update;
  if not found or qr.revoked_at is not null or qr.expires_at<=now() then return jsonb_build_object('error','invalid_qr'); end if;
  select * into stamp from public.stamp_definitions where id=qr.stamp_id and active;
  if not found or not exists(select 1 from public.venues v join public.organizations o on o.id=v.organization_id where v.id=stamp.venue_id and v.participation_status='participating' and o.status='approved') then return jsonb_build_object('error','invalid_qr'); end if;
  if not exists(select 1 from public.traveler_profiles where user_id=uid) then return jsonb_build_object('error','activate_first'); end if;
  select id into pid from public.passport_profiles where user_id=uid and destination_id=stamp.destination_id;
  if exists(select 1 from public.stamp_claims where passport_id=pid and stamp_id=stamp.id) then return jsonb_build_object('error','already_claimed'); end if;
  if qr.claims>=qr.max_claims then return jsonb_build_object('error','limit'); end if;
  -- Only an accepted claim creates a destination collection. User rate-limit and
  -- credential locks above serialize claims, while uniqueness also guards replay.
  if pid is null then
   insert into public.passport_profiles(user_id,destination_id) values(uid,stamp.destination_id)
    on conflict(user_id,destination_id) do nothing;
   select id into pid from public.passport_profiles where user_id=uid and destination_id=stamp.destination_id;
  end if;
  insert into public.stamp_claims(passport_id,stamp_id,destination_id,credential_id) values(pid,stamp.id,stamp.destination_id,qr.id) on conflict(passport_id,stamp_id) do nothing returning id into claim_id;
  if claim_id is null then return jsonb_build_object('error','already_claimed'); end if;
  update private.qr_credentials set claims=claims+1 where id=qr.id;
  insert into private.audit_events(actor_id,action,entity_id) values(uid,action,claim_id);
  return jsonb_build_object('id',claim_id);
 elsif action in ('issue_qr','revoke_qr') then
  select s.* into stamp from public.stamp_definitions s join public.venues v on v.id=s.venue_id where s.id=(payload->>'stamp_id')::uuid and private.is_member(v.organization_id,array['owner','manager','merchant']);
  if not found then return jsonb_build_object('error','forbidden'); end if;
  if action='issue_qr' then
   if not exists(select 1 from public.venues v join public.organizations o on o.id=v.organization_id where v.id=stamp.venue_id and o.status='approved' and v.participation_status='participating') then return jsonb_build_object('error','forbidden'); end if;
   raw:=payload->>'token';
   if raw is null or raw !~ '^[a-f0-9]{64}$' then return jsonb_build_object('error','invalid'); end if;
   insert into private.qr_credentials(stamp_id,token_hash,expires_at,max_claims) values(stamp.id,encode(sha256(convert_to(raw,'UTF8')),'hex'),now()+interval '7 days',1000);
  else
   update private.qr_credentials set revoked_at=now() where stamp_id=stamp.id and revoked_at is null;
  end if;
  insert into private.audit_events(actor_id,action,entity_id) values(uid,action,stamp.id);
  return jsonb_build_object('ok',true);
 end if;
 return jsonb_build_object('error','invalid');
end $$;
