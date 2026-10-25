-- Offers are provisioned by trusted administration after agreeing actual benefits and payout.
-- No directory listing becomes a merchant and no offer is seeded by this migration.
create table public.destination_pass_offers (
 id uuid primary key default gen_random_uuid(),
 destination_id uuid not null unique references public.destinations(id),
 organization_id uuid not null,
 names jsonb not null check(private.experience_text_valid(names,2,120)),
 benefits jsonb not null check(private.experience_text_valid(benefits,2,3000)),
 amount text not null default '100' check(amount='100'),
 reputation_points integer not null default 80 check(reputation_points=80),
 published boolean not null default false,
 foreign key(organization_id,destination_id) references public.organizations(id,destination_id)
);
create table private.destination_pass_orders (
 request_id uuid primary key references public.checkout_requests(id),
 offer_id uuid not null references public.destination_pass_offers(id),
 user_id uuid not null references public.user_profiles(id),
 destination_id uuid not null references public.destinations(id),
 reputation_points integer not null check(reputation_points=80)
);
create index destination_pass_orders_actor_idx on private.destination_pass_orders(user_id,destination_id);
create table public.destination_pass_holdings (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.user_profiles(id),
 destination_id uuid not null references public.destinations(id),
 request_id uuid not null unique references public.payment_receipts(request_id),
 acquired_at timestamptz not null default now(),
 unique(user_id,destination_id)
);
create table public.reputation_events (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.user_profiles(id),
 destination_id uuid not null references public.destinations(id),
 request_id uuid not null unique references public.payment_receipts(request_id),
 points integer not null check(points=80),
 created_at timestamptz not null default now()
);
create index reputation_events_user_idx on public.reputation_events(user_id);
alter table public.destination_pass_offers enable row level security;
alter table private.destination_pass_orders enable row level security;
alter table public.destination_pass_holdings enable row level security;
alter table public.reputation_events enable row level security;
revoke all on public.destination_pass_offers,private.destination_pass_orders,public.destination_pass_holdings,public.reputation_events from public,anon,authenticated;
grant select on public.destination_pass_offers,public.destination_pass_holdings,public.reputation_events to anon,authenticated;
create policy published_pass_offer on public.destination_pass_offers for select to anon,authenticated using(published and exists(select 1 from public.organizations o where o.id=organization_id and o.status='approved' and o.kind='merchant'));
create policy own_destination_pass on public.destination_pass_holdings for select to anon,authenticated using(user_id=(select private.current_actor()));
create policy own_reputation on public.reputation_events for select to anon,authenticated using(user_id=(select private.current_actor()));
create trigger immutable_pass_holding before update or delete on public.destination_pass_holdings for each row execute function private.reject_ledger_change();
create trigger immutable_reputation before update or delete on public.reputation_events for each row execute function private.reject_ledger_change();
create trigger immutable_pass_order before update or delete on private.destination_pass_orders for each row execute function private.reject_ledger_change();

create function private.destination_pass_command(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.current_actor(); offer public.destination_pass_offers%rowtype; org public.organizations%rowtype; payout public.merchant_payouts%rowtype; profile public.user_profiles%rowtype; r public.checkout_requests%rowtype; rid uuid;
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
 select * into payout from public.merchant_payouts where organization_id=org.id for share;
 if not found or not exists(select 1 from public.organization_members m join public.user_profiles u on u.id=m.user_id where m.organization_id=org.id and m.user_id=payout.verified_by and m.role='owner' and u.wallet_address=payout.address and u.network='testnet') then return jsonb_build_object('error','wallet_required'); end if;
 if profile.wallet_address=payout.address then return jsonb_build_object('error','self_payment'); end if;
 insert into public.checkout_requests(organization_id,destination_id,merchant_name,product,amount,payout_address,payout_verified_by,idempotency_key,payer_user_id,payer_address,status)
 values(org.id,offer.destination_id,org.name,offer.names->>'en',offer.amount,payout.address,payout.verified_by,gen_random_uuid(),uid,profile.wallet_address,'prepared') returning id into rid;
 insert into private.destination_pass_orders values(rid,offer.id,uid,offer.destination_id,offer.reputation_points);
 insert into private.audit_events(actor_id,organization_id,action,entity_id) values(uid,org.id,'destination_pass_ordered',rid);
 return jsonb_build_object('id',rid);
end $$;
revoke all on function private.destination_pass_command(text,jsonb) from public;
create function public.destination_pass_command(action text,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.destination_pass_command(action,payload); $$;
revoke all on function public.destination_pass_command(text,jsonb) from public;
grant execute on function private.destination_pass_command(text,jsonb),public.destination_pass_command(text,jsonb) to anon,authenticated;

-- Runs inside the independently verified receipt transaction. Failure rolls everything back.
create function private.fulfill_destination_pass() returns trigger language plpgsql security definer set search_path='' as $$
declare p private.destination_pass_orders%rowtype;
begin
 select * into p from private.destination_pass_orders where request_id=new.request_id;
 if not found then return new; end if;
 perform 1 from public.user_profiles where id=p.user_id for update;
 insert into public.destination_pass_holdings(user_id,destination_id,request_id) values(p.user_id,p.destination_id,p.request_id);
 if p.reputation_points>0 then
  insert into public.reputation_events(user_id,destination_id,request_id,points) values(p.user_id,p.destination_id,p.request_id,p.reputation_points);
 end if;
 insert into private.audit_events(actor_id,action,entity_id) values(p.user_id,'destination_pass_acquired',p.request_id);
 return new;
end $$;
revoke all on function private.fulfill_destination_pass() from public,anon,authenticated;
create trigger fulfill_destination_pass after insert on public.payment_receipts for each row execute function private.fulfill_destination_pass();
