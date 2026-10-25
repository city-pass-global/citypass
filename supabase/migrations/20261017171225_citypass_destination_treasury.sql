-- User-authorized CityPass recipient. No third-party listing or membership is promoted.
create table private.citypass_treasuries (
 organization_id uuid primary key,
 destination_id uuid not null unique,
 network text not null check(network='testnet'),
 address text not null check(address='GC6RIEORZ5UF7L2KKXCZLSGMSIYY5NG6FXCKR3J5P7ZYIXSMXLX2QJKU'),
 foreign key(organization_id,destination_id) references public.organizations(id,destination_id)
);
alter table private.citypass_treasuries enable row level security;
revoke all on private.citypass_treasuries from public,anon,authenticated;

-- One operational CityPass organization per destination preserves tenant FKs.
-- These are the application's own seller records, not affiliated venues.
do $$
declare d record; oid uuid;
begin
 for d in select id from public.destinations loop
  insert into public.organizations(destination_id,name,kind,status) values(d.id,'CityPass','merchant','approved') returning id into oid;
  insert into private.citypass_treasuries values(oid,d.id,'testnet','GC6RIEORZ5UF7L2KKXCZLSGMSIYY5NG6FXCKR3J5P7ZYIXSMXLX2QJKU');
  insert into private.audit_events(organization_id,action,entity_id) values(oid,'citypass_treasury_configured',oid);
 end loop;
end $$;
-- No offers are published: venue entitlements are not established by a proposed program.

alter table public.checkout_requests alter column payout_verified_by drop not null;
alter table public.checkout_requests add column payout_source text not null default 'merchant' check(payout_source in ('merchant','citypass'));
alter table public.checkout_requests add constraint checkout_payout_provenance check((payout_source='merchant' and payout_verified_by is not null) or (payout_source='citypass' and payout_verified_by is null));

create function private.validate_citypass_checkout() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.payout_source='citypass' and (new.amount<>'100' or new.merchant_name<>'CityPass' or not exists(select 1 from private.citypass_treasuries t where t.organization_id=new.organization_id and t.destination_id=new.destination_id and t.network=new.network and t.address=new.payout_address)) then
  raise exception 'invalid_citypass_payout';
 end if;
 return new;
end $$;
revoke all on function private.validate_citypass_checkout() from public,anon,authenticated;
create trigger validate_citypass_checkout before insert or update on public.checkout_requests for each row execute function private.validate_citypass_checkout();

create or replace function private.destination_pass_command(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.current_actor(); offer public.destination_pass_offers%rowtype; org public.organizations%rowtype; payout public.merchant_payouts%rowtype; treasury private.citypass_treasuries%rowtype; source text:='merchant'; profile public.user_profiles%rowtype; r public.checkout_requests%rowtype; rid uuid;
begin
 if action='catalog' then
  return jsonb_build_object('offers',coalesce((select jsonb_agg(to_jsonb(o)) from public.destination_pass_offers o join public.organizations g on g.id=o.organization_id where o.destination_id=(payload->>'destination_id')::uuid and o.published and g.status='approved' and g.kind='merchant'),'[]'::jsonb));
 end if;
 if uid is null then return jsonb_build_object('error','unauthorized'); end if;
 if action='account' then
  return jsonb_build_object('holdings',coalesce((select jsonb_agg(to_jsonb(h)) from public.destination_pass_holdings h where h.user_id=uid),'[]'::jsonb),'reputation',coalesce((select sum(points) from public.reputation_events where user_id=uid),0));
 end if;
 if action<>'purchase' then return jsonb_build_object('error','invalid'); end if;
 -- Serialize purchases across offers for this traveler, including retries and settlement.
 select * into profile from public.user_profiles where id=uid for update;
 if profile.wallet_address is null or profile.network<>'testnet' or profile.pollar_subject is null then return jsonb_build_object('error','wallet_required'); end if;
 if not exists(select 1 from public.traveler_profiles where user_id=uid) then return jsonb_build_object('error','activate_first'); end if;
 select * into offer from public.destination_pass_offers where id=(payload->>'offer_id')::uuid for share;
 if not found then return jsonb_build_object('error','unavailable'); end if;
 if exists(select 1 from public.destination_pass_holdings where user_id=uid and destination_id=offer.destination_id) then return jsonb_build_object('error','already_owned'); end if;
 select c.* into r from private.destination_pass_orders p join public.checkout_requests c on c.id=p.request_id where p.user_id=uid and p.destination_id=offer.destination_id and (c.status='submitted' or (c.status in ('created','prepared') and c.expires_at>now())) order by c.created_at desc limit 1;
 if found then return jsonb_build_object('id',r.id); end if;
 select * into org from public.organizations where id=offer.organization_id for share;
 if not offer.published or org.status<>'approved' or org.kind<>'merchant' then return jsonb_build_object('error','unavailable'); end if;
 select * into treasury from private.citypass_treasuries where organization_id=org.id and destination_id=offer.destination_id for share;
 if found then
  source:='citypass';
  payout.address:=treasury.address;
  payout.verified_by:=null;
 else
 select * into payout from public.merchant_payouts where organization_id=org.id for share;
 if not found or not exists(select 1 from public.organization_members m join public.user_profiles u on u.id=m.user_id where m.organization_id=org.id and m.user_id=payout.verified_by and m.role='owner' and u.wallet_address=payout.address and u.network='testnet') then return jsonb_build_object('error','wallet_required'); end if;
 end if;
 if profile.wallet_address=payout.address then return jsonb_build_object('error','self_payment'); end if;
 insert into public.checkout_requests(organization_id,destination_id,merchant_name,product,amount,payout_address,payout_verified_by,idempotency_key,payer_user_id,payer_address,status,payout_source)
 values(org.id,offer.destination_id,org.name,offer.names->>'en',offer.amount,payout.address,payout.verified_by,gen_random_uuid(),uid,profile.wallet_address,'prepared',source) returning id into rid;
 insert into private.destination_pass_orders values(rid,offer.id,uid,offer.destination_id,offer.reputation_points);
 insert into private.audit_events(actor_id,organization_id,action,entity_id) values(uid,org.id,'destination_pass_ordered',rid);
 return jsonb_build_object('id',rid);
end $$;
