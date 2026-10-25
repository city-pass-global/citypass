-- New-project migration. Mutations are capabilities, never broad table grants.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;
create table public.destinations (
 id uuid primary key default gen_random_uuid(), slug text unique not null, name text not null,
 timezone text not null default 'America/Argentina/Cordoba', country_code text not null default 'AR'
);
create table public.organizations (
 id uuid primary key default gen_random_uuid(), destination_id uuid not null references public.destinations,
 name text not null check (length(name) between 2 and 120), kind text not null check(kind in ('hotel','merchant','operator')),
 status text not null default 'pending' check(status in ('pending','approved','suspended')), created_at timestamptz not null default now()
);
create table public.organization_members (
 organization_id uuid not null references public.organizations, user_id uuid not null references auth.users,
 role text not null check(role in ('owner','manager','receptionist','merchant','operator')), primary key(organization_id,user_id)
);
create index organization_members_user_idx on public.organization_members(user_id);
create table public.venues (
 id uuid primary key default gen_random_uuid(), destination_id uuid not null references public.destinations,
 organization_id uuid references public.organizations, name text not null, category text not null,
 description jsonb not null default '{}', source_url text, participation_status text not null default 'listed' check(participation_status in ('listed','participating','suspended')),
 unique(id,destination_id)
);
create table public.passport_profiles (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users,
 destination_id uuid not null references public.destinations, created_at timestamptz not null default now(), unique(user_id,destination_id), unique(id,destination_id)
);
create table public.stamp_definitions (
 id uuid primary key default gen_random_uuid(), venue_id uuid not null, destination_id uuid not null,
 name text not null, category text not null default 'visit', tier text not null default 'explorer', active boolean not null default true,
 foreign key(venue_id,destination_id) references public.venues(id,destination_id), unique(id,destination_id)
);
create table private.qr_credentials (
 id uuid primary key default gen_random_uuid(), stamp_id uuid not null references public.stamp_definitions,
 token_hash text unique not null check(length(token_hash)=64), expires_at timestamptz not null,
 revoked_at timestamptz, max_claims integer not null check(max_claims between 1 and 10000), claims integer not null default 0 check(claims>=0)
);
create table public.stamp_claims (
 id uuid primary key default gen_random_uuid(), passport_id uuid not null, stamp_id uuid not null,
 destination_id uuid not null, credential_id uuid not null references private.qr_credentials,
 claimed_at timestamptz not null default now(), verification_method text not null default 'venue_qr',
 foreign key(passport_id,destination_id) references public.passport_profiles(id,destination_id),
 foreign key(stamp_id,destination_id) references public.stamp_definitions(id,destination_id), unique(passport_id,stamp_id)
);
create index stamp_claims_stamp_idx on public.stamp_claims(stamp_id);
create table public.routes (
 id uuid primary key default gen_random_uuid(), destination_id uuid not null references public.destinations, name jsonb not null,
 description jsonb not null default '{}', published boolean not null default false, required_stops integer not null check(required_stops>0), unique(id,destination_id)
);
create table public.route_stops (
 route_id uuid not null, venue_id uuid not null, destination_id uuid not null, position integer not null check(position>0),
 primary key(route_id,venue_id), unique(route_id,position), foreign key(route_id,destination_id) references public.routes(id,destination_id), foreign key(venue_id,destination_id) references public.venues(id,destination_id)
);
create table public.hotel_reservations (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations,
 reference text not null check(length(reference) between 2 and 60), guest_email text not null check(length(guest_email)<=254 and guest_email like '%@%'),
 arrival date not null, departure date not null check(departure>=arrival), guest_count integer not null check(guest_count between 1 and 20),
 status text not null default 'invited' check(status in ('invited','submitted','reviewed','ready_for_arrival','completed','cancelled')),
 created_at timestamptz not null default now(), unique(organization_id,reference), unique(id,organization_id)
);
create index hotel_reservations_arrival_idx on public.hotel_reservations(organization_id,arrival);
create table private.precheckin_invitations (
 id uuid primary key default gen_random_uuid(), reservation_id uuid not null references public.hotel_reservations,
 token_hash text unique not null check(length(token_hash)=64), expires_at timestamptz not null,
 consumed_at timestamptz, revoked_at timestamptz, failed_attempts integer not null default 0
);
create index invitations_reservation_idx on private.precheckin_invitations(reservation_id);
create table public.precheckin_submissions (
 id uuid primary key default gen_random_uuid(), reservation_id uuid not null unique, organization_id uuid not null,
 full_name text not null check(length(full_name) between 2 and 120), email text not null,
 phone text not null check(length(phone) between 5 and 40), nationality text not null check(length(nationality) between 2 and 80),
 residence text not null check(length(residence) between 2 and 80), arrival_time time not null,
 requests text not null default '' check(length(requests)<=1000), operational_consent_at timestamptz not null default now(),
 submitted_at timestamptz not null default now(), retention_until timestamptz not null,
 foreign key(reservation_id,organization_id) references public.hotel_reservations(id,organization_id)
);
create index precheckin_submissions_org_idx on public.precheckin_submissions(organization_id);
create table private.rate_limits (key text primary key, window_start timestamptz not null, attempts integer not null);
create table private.audit_events (
 id uuid primary key default gen_random_uuid(), actor_id uuid, organization_id uuid references public.organizations,
 action text not null, entity_id uuid, created_at timestamptz not null default now()
);
create index audit_events_org_idx on private.audit_events(organization_id,created_at);
-- Immutable accounting groundwork; intentionally no earning/redemption API until Phase 4.
create table public.points_ledger (
 id uuid primary key default gen_random_uuid(), passport_id uuid not null references public.passport_profiles,
 funding_organization_id uuid not null references public.organizations, delta integer not null check(delta<>0),
 kind text not null check(kind in ('earned','redeemed','reversed','expired')), transaction_reference text not null,
 expires_at timestamptz, created_at timestamptz not null default now(), unique(funding_organization_id,transaction_reference)
);
create function private.reject_ledger_change() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'Ledger entries are immutable; append a reversal'; end $$;
create trigger immutable_ledger before update or delete on public.points_ledger for each row execute function private.reject_ledger_change();

create function private.is_member(org uuid, roles text[] default array['owner','manager','receptionist','merchant','operator']) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.organization_members where organization_id=org and user_id=auth.uid() and role=any(roles));
$$;
-- Explicit grants + RLS, no writable business tables through PostgREST.
do $$ declare t text; begin
 foreach t in array array['destinations','organizations','organization_members','venues','passport_profiles','stamp_definitions','stamp_claims','routes','route_stops','hotel_reservations','precheckin_submissions','points_ledger'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 end loop;
 foreach t in array array['qr_credentials','precheckin_invitations','rate_limits','audit_events'] loop
 execute format('alter table private.%I enable row level security',t);
 end loop;
end $$;
grant select on public.destinations, public.venues, public.stamp_definitions, public.routes, public.route_stops to anon, authenticated;
grant select on public.organizations, public.organization_members, public.passport_profiles, public.stamp_claims, public.hotel_reservations, public.precheckin_submissions, public.points_ledger to authenticated;
create policy public_destinations on public.destinations for select to anon,authenticated using(true);
create policy public_venues on public.venues for select to anon,authenticated using(participation_status<>'suspended');
create policy public_stamps on public.stamp_definitions for select to anon,authenticated using(active and exists(select 1 from public.venues v where v.id=venue_id and v.participation_status='participating'));
create policy public_routes on public.routes for select to anon,authenticated using(published);
create policy public_stops on public.route_stops for select to anon,authenticated using(exists(select 1 from public.routes r where r.id=route_id and r.published));
create policy own_org on public.organizations for select to authenticated using(private.is_member(id));
create policy own_membership on public.organization_members for select to authenticated using(user_id=(select auth.uid()));
create policy own_passport on public.passport_profiles for select to authenticated using(user_id=(select auth.uid()));
create policy own_claims on public.stamp_claims for select to authenticated using(exists(select 1 from public.passport_profiles p where p.id=passport_id and p.user_id=(select auth.uid())));
create policy hotel_reservations_access on public.hotel_reservations for select to authenticated using(private.is_member(organization_id,array['owner','manager','receptionist']));
create policy hotel_submissions_access on public.precheckin_submissions for select to authenticated using(private.is_member(organization_id,array['owner','manager','receptionist']));
create policy own_ledger on public.points_ledger for select to authenticated using(exists(select 1 from public.passport_profiles p where p.id=passport_id and p.user_id=(select auth.uid())));

create function private.command(action text, payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); org uuid; dest uuid; rid uuid; pid uuid; raw text; hashed text;
 reservation public.hotel_reservations%rowtype; invitation private.precheckin_invitations%rowtype;
 qr private.qr_credentials%rowtype; stamp public.stamp_definitions%rowtype; rate private.rate_limits%rowtype;
 target_status text; claim_id uuid;
begin
 if action<>'submit_precheckin' and uid is null then return jsonb_build_object('error','unauthorized'); end if;
 if action='activate_passport' then
  dest:=(payload->>'destination_id')::uuid;
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
  select id into pid from public.passport_profiles where user_id=uid and destination_id=stamp.destination_id;
  if pid is null then return jsonb_build_object('error','activate_first'); end if;
  if exists(select 1 from public.stamp_claims where passport_id=pid and stamp_id=stamp.id) then return jsonb_build_object('error','already_claimed'); end if;
  if qr.claims>=qr.max_claims then return jsonb_build_object('error','limit'); end if;
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
create function public.passport_command(action text, payload jsonb) returns jsonb
language sql security invoker set search_path='' as $$ select private.command(action,payload); $$;
revoke all on all functions in schema private from public;
revoke all on function public.passport_command(text,jsonb) from public;
grant execute on function private.is_member(uuid,text[]) to authenticated;
grant execute on function private.command(text,jsonb), public.passport_command(text,jsonb) to anon,authenticated;
-- No private schema exposure in PostgREST. Direct SQL must not be granted to app users.
