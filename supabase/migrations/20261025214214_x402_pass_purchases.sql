-- A traveler authorizes one testnet pass, one agent payer and one frozen beneficiary wallet.
-- Raw capabilities and agent keys are never stored. No partner, offer or treasury is provisioned.
create table private.x402_orders (
 request_id uuid primary key references public.checkout_requests(id),
 user_id uuid not null references public.user_profiles(id),
 command_id uuid not null,
 token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
 beneficiary_wallet text not null check(beneficiary_wallet ~ '^G[A-Z2-7]{55}$'),
 state text not null default 'authorized' check(state in ('authorized','settling','settled','confirmed','revoked')),
 payment_payload jsonb,
 payload_hash text unique check(payload_hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default now(),
 unique(user_id,command_id),
 check((payment_payload is null)=(payload_hash is null)),
 check(state not in ('settling','settled','confirmed') or payment_payload is not null)
);
create index x402_orders_user on private.x402_orders(user_id);
create table private.x402_nonces(nonce uuid primary key, created_at timestamptz not null default now());
alter table private.x402_orders enable row level security;
alter table private.x402_nonces enable row level security;
revoke all on private.x402_orders,private.x402_nonces from public,anon,authenticated;

create function private.x402_order_command(action text,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.current_actor(); profile public.user_profiles%rowtype; offer public.destination_pass_offers%rowtype; org public.organizations%rowtype; payout public.merchant_payouts%rowtype; treasury private.citypass_treasuries%rowtype; source text:='merchant'; rid uuid; old private.x402_orders%rowtype;
begin
 if uid is null then return jsonb_build_object('error','unauthorized'); end if;
 if action='list' then
  return jsonb_build_object('orders',coalesce((select jsonb_agg(to_jsonb(q) order by q.created_at desc) from (select x.request_id,x.state,c.product,c.expires_at,c.created_at from private.x402_orders x join public.checkout_requests c on c.id=x.request_id where x.user_id=uid order by c.created_at desc limit 20) q),'[]'::jsonb));
 end if;
 -- Same traveler lock as classic orders and receipt fulfillment.
 select * into profile from public.user_profiles where id=uid for update;
 if action='revoke' then
  select * into old from private.x402_orders where request_id=(payload->>'request_id')::uuid and user_id=uid for update;
  if not found then return jsonb_build_object('error','forbidden'); end if;
  if old.state='revoked' then return jsonb_build_object('ok',true); end if;
  if old.state<>'authorized' then return jsonb_build_object('error','invalid_state'); end if;
  update private.x402_orders set state='revoked' where request_id=old.request_id;
  update public.checkout_requests set status='expired' where id=old.request_id;
  insert into private.audit_events(actor_id,action,entity_id) values(uid,'x402_revoked',old.request_id);
  return jsonb_build_object('ok',true);
 end if;
 if action<>'authorize' or coalesce(payload->>'token_hash','') !~ '^[a-f0-9]{64}$' or coalesce(payload->>'agent_wallet','') !~ '^G[A-Z2-7]{55}$' then return jsonb_build_object('error','invalid'); end if;
 if profile.wallet_address is null or profile.network is distinct from 'testnet' or profile.pollar_subject is null then return jsonb_build_object('error','wallet_required'); end if;
 if not exists(select 1 from public.traveler_profiles where user_id=uid) then return jsonb_build_object('error','activate_first'); end if;
 select * into old from private.x402_orders where user_id=uid and command_id=(payload->>'command_id')::uuid;
 if found then return jsonb_build_object('error','idempotency_conflict'); end if;
 select * into offer from public.destination_pass_offers where id=(payload->>'offer_id')::uuid for share;
 if not found then return jsonb_build_object('error','unavailable'); end if;
 if exists(select 1 from public.destination_pass_holdings where user_id=uid and destination_id=offer.destination_id) then return jsonb_build_object('error','already_owned'); end if;
 if exists(select 1 from private.destination_pass_orders p join public.checkout_requests c on c.id=p.request_id left join private.x402_orders x on x.request_id=c.id where p.user_id=uid and p.destination_id=offer.destination_id and (c.status='submitted' or (c.status in ('created','prepared') and c.expires_at>now()) or x.state in ('settling','settled'))) then return jsonb_build_object('error','purchase_pending'); end if;
 select * into org from public.organizations where id=offer.organization_id for share;
 if not offer.published or org.status<>'approved' or org.kind<>'merchant' then return jsonb_build_object('error','unavailable'); end if;
 select * into treasury from private.citypass_treasuries where organization_id=org.id and destination_id=offer.destination_id for share;
 if found then source:='citypass'; payout.address:=treasury.address; payout.verified_by:=null;
 else
  select * into payout from public.merchant_payouts where organization_id=org.id for share;
  if not found or not exists(select 1 from public.organization_members m join public.user_profiles u on u.id=m.user_id where m.organization_id=org.id and m.user_id=payout.verified_by and m.role='owner' and u.wallet_address=payout.address and u.network='testnet') then return jsonb_build_object('error','wallet_required'); end if;
 end if;
 if payload->>'agent_wallet'=payout.address or profile.wallet_address=payout.address then return jsonb_build_object('error','self_payment'); end if;
 insert into public.checkout_requests(organization_id,destination_id,merchant_name,product,amount,payout_address,payout_verified_by,idempotency_key,payer_user_id,payer_address,status,payout_source)
 values(org.id,offer.destination_id,org.name,offer.names->>'en',offer.amount,payout.address,payout.verified_by,(payload->>'command_id')::uuid,uid,payload->>'agent_wallet','prepared',source) returning id into rid;
 insert into private.destination_pass_orders values(rid,offer.id,uid,offer.destination_id,offer.reputation_points);
 insert into private.x402_orders(request_id,user_id,command_id,token_hash,beneficiary_wallet) values(rid,uid,(payload->>'command_id')::uuid,payload->>'token_hash',profile.wallet_address);
 insert into private.audit_events(actor_id,organization_id,action,entity_id) values(uid,org.id,'x402_authorized',rid);
 return jsonb_build_object('id',rid);
 exception when invalid_text_representation then return jsonb_build_object('error','invalid');
end $$;
revoke all on function private.x402_order_command(text,jsonb) from public;
create function public.x402_order_command(action text,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.x402_order_command(action,payload); $$;
revoke all on function public.x402_order_command(text,jsonb) from public;
grant execute on function private.x402_order_command(text,jsonb),public.x402_order_command(text,jsonb) to anon,authenticated;

-- Only the backend can submit settlement evidence; the purchase capability is also required.
create function private.x402_delivery(payload text,mac text) returns jsonb language plpgsql security definer set search_path='' as $$
declare p jsonb; secret text; o private.x402_orders%rowtype; r public.checkout_requests%rowtype; closed timestamptz;
begin
 if payload is null or length(payload)>60000 or coalesce(mac,'') !~ '^[a-f0-9]{64}$' then return jsonb_build_object('error','payment_proof'); end if;
 select key_hex into secret from private.pollar_bridge_config where singleton;
 if secret is null or private.bridge_hmac(secret,'citypassport-x402-v1'||chr(10)||payload)<>mac then return jsonb_build_object('error','payment_proof'); end if;
 p:=payload::jsonb;
 if abs(extract(epoch from now())-(p->>'issued_at')::bigint)>60 or p->>'issued_at' is null or coalesce(p->>'token_hash','') !~ '^[a-f0-9]{64}$' then return jsonb_build_object('error','payment_proof'); end if;
 delete from private.x402_nonces where created_at<now()-interval '2 minutes';
 insert into private.x402_nonces(nonce) values((p->>'nonce')::uuid);
 -- Lock order: beneficiary profile, checkout, then authorization; matches classic fulfillment.
 perform 1 from public.user_profiles where id=(select user_id from private.x402_orders where request_id=(p->>'request_id')::uuid and token_hash=p->>'token_hash') for update;
 select * into r from public.checkout_requests where id=(p->>'request_id')::uuid for update;
 select * into o from private.x402_orders where request_id=r.id and token_hash=p->>'token_hash' for update;
 if not found then return jsonb_build_object('error','forbidden'); end if;
 if o.state='revoked' then return jsonb_build_object('error','revoked'); end if;
 if p->>'action'='stage' then
  if o.state<>'authorized' then return jsonb_build_object('error','invalid_state'); end if;
  if r.expires_at<=now()+interval '90 seconds' or exists(select 1 from public.destination_pass_holdings where user_id=o.user_id and destination_id=r.destination_id) or not exists(select 1 from public.organizations where id=r.organization_id and status='approved') then return jsonb_build_object('error','expired'); end if;
  if jsonb_typeof(p->'payment_payload') is distinct from 'object' or coalesce(p->>'payload_hash','') !~ '^[a-f0-9]{64}$' then return jsonb_build_object('error','payment_proof'); end if;
  update private.x402_orders set state='settling',payment_payload=p->'payment_payload',payload_hash=p->>'payload_hash' where request_id=r.id returning * into o;
  insert into private.audit_events(actor_id,action,entity_id) values(o.user_id,'x402_settling',r.id);
 elsif p->>'action'='settled' then
  if o.state not in ('settling','settled','confirmed') or coalesce(p->>'hash','') !~ '^[a-f0-9]{64}$' or (r.transaction_hash is not null and r.transaction_hash<>p->>'hash') then return jsonb_build_object('error','payment_proof'); end if;
  if o.state='settling' then
   update public.checkout_requests set status='submitted',transaction_hash=p->>'hash' where id=r.id returning * into r;
   update private.x402_orders set state='settled' where request_id=r.id returning * into o;
   insert into private.audit_events(actor_id,action,entity_id) values(o.user_id,'x402_settled',r.id);
  end if;
 elsif p->>'action'='confirm' then
  if o.state='confirmed' and r.transaction_hash=p->>'hash' then return jsonb_build_object('order',jsonb_build_object('checkout',private.checkout_view(r),'state',o.state)); end if;
  if o.state<>'settled' or r.transaction_hash is distinct from p->>'hash' or coalesce((p->>'ledger')::bigint,0)<=0 or p->>'closed_at' is null then return jsonb_build_object('error','payment_proof'); end if;
  closed:=to_timestamp((p->>'closed_at')::bigint);
  if closed>r.expires_at or closed<r.created_at-interval '30 seconds' then return jsonb_build_object('error','payment_proof'); end if;
  insert into public.payment_receipts(request_id,network,transaction_hash,ledger,closed_at) values(r.id,'testnet',r.transaction_hash,(p->>'ledger')::bigint,closed);
  update public.checkout_requests set status='confirmed',confirmed_at=now() where id=r.id returning * into r;
  update private.x402_orders set state='confirmed' where request_id=r.id returning * into o;
  insert into private.audit_events(actor_id,action,entity_id) values(o.user_id,'x402_confirmed',r.id);
 elsif p->>'action'<>'resolve' then return jsonb_build_object('error','invalid'); end if;
 return jsonb_build_object('order',jsonb_build_object('checkout',private.checkout_view(r),'state',o.state,'beneficiary_wallet',o.beneficiary_wallet,'payment_payload',o.payment_payload));
 exception when unique_violation then return jsonb_build_object('error','replay'); when invalid_text_representation then return jsonb_build_object('error','invalid');
end $$;
revoke all on function private.x402_delivery(text,text) from public;
create function public.x402_delivery(payload text,mac text) returns jsonb language sql security invoker set search_path='' as $$ select private.x402_delivery(payload,mac); $$;
revoke all on function public.x402_delivery(text,text) from public;
grant execute on function private.x402_delivery(text,text),public.x402_delivery(text,text) to anon,authenticated;

-- Classic signing/evidence cannot race the dedicated x402 rail.
alter function private.checkout_command(text,jsonb) rename to checkout_command_classic;
revoke all on function private.checkout_command_classic(text,jsonb) from public,anon,authenticated;
create function private.checkout_command(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if action in ('prepare','attempt') and exists(select 1 from private.x402_orders where request_id=(payload->>'request_id')::uuid) then return jsonb_build_object('error','x402_required'); end if;
 return private.checkout_command_classic(action,payload);
end $$;
revoke all on function private.checkout_command(text,jsonb) from public;
grant execute on function private.checkout_command(text,jsonb) to anon,authenticated;
create or replace function public.checkout_command(action text,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.checkout_command(action,payload); $$;
alter function private.record_checkout_evidence(text,text) rename to record_checkout_evidence_classic;
revoke all on function private.record_checkout_evidence_classic(text,text) from public,anon,authenticated;
create function private.record_checkout_evidence(payload text,mac text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if length(payload)>40000 then return jsonb_build_object('error','payment_proof'); end if;
 if exists(select 1 from private.x402_orders where request_id=(payload::jsonb->>'request_id')::uuid) then return jsonb_build_object('error','x402_required'); end if;
 return private.record_checkout_evidence_classic(payload,mac);
end $$;
revoke all on function private.record_checkout_evidence(text,text) from public;
grant execute on function private.record_checkout_evidence(text,text) to anon,authenticated;
create or replace function public.record_checkout_evidence(payload text,mac text) returns jsonb language sql security invoker set search_path='' as $$ select private.record_checkout_evidence(payload,mac); $$;

-- Never replace an indeterminate agent payment with a fresh classic charge, even after expiry.
alter function private.destination_pass_command(text,jsonb) rename to destination_pass_command_classic;
revoke all on function private.destination_pass_command_classic(text,jsonb) from public,anon,authenticated;
create function private.destination_pass_command(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if action='purchase' then
  perform 1 from public.user_profiles where id=private.current_actor() for update;
  if exists(select 1 from private.x402_orders x join public.checkout_requests c on c.id=x.request_id join public.destination_pass_offers f on f.destination_id=c.destination_id where x.user_id=private.current_actor() and f.id=(payload->>'offer_id')::uuid and x.state in ('settling','settled')) then return jsonb_build_object('error','purchase_pending'); end if;
 end if;
 return private.destination_pass_command_classic(action,payload);
end $$;
revoke all on function private.destination_pass_command(text,jsonb) from public;
grant execute on function private.destination_pass_command(text,jsonb) to anon,authenticated;
create or replace function public.destination_pass_command(action text,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$ select case when action='account' then private.destination_pass_account() else private.destination_pass_command(action,payload) end; $$;

-- Existing receipt fulfillment creates the holding and queues the traveler's frozen wallet,
-- independently of the agent's paying wallet. Earlier classic activity semantics are preserved.
alter function private.enqueue_activity() rename to enqueue_activity_classic;
create function private.enqueue_activity() returns trigger language plpgsql security definer set search_path='' as $$
declare o private.x402_orders%rowtype;
begin
 select * into o from private.x402_orders where request_id=new.request_id;
 if found then
  insert into private.activity_outbox(kind,source_id,user_id,wallet,destination_id,subject) values(1,new.id,new.user_id,o.beneficiary_wallet,new.destination_id,new.id) on conflict(kind,source_id) do nothing;
 else
  insert into private.activity_outbox(kind,source_id,user_id,wallet,destination_id,subject)
   select 1,new.id,new.user_id,c.payer_address,new.destination_id,new.id from public.checkout_requests c where c.id=new.request_id and c.network='testnet' and c.payer_user_id=new.user_id and exists(select 1 from public.payment_receipts where request_id=new.request_id) on conflict(kind,source_id) do nothing;
 end if;
 return new;
end $$;
revoke all on function private.enqueue_activity() from public,anon,authenticated;
drop trigger queue_verified_pass_activity on public.destination_pass_holdings;
create trigger queue_verified_pass_activity after insert on public.destination_pass_holdings for each row execute function private.enqueue_activity();
