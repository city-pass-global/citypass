-- Destination-scoped merchant reviewers are provisioned only by trusted administration.
-- No identities, assignments or approvals are seeded by this migration.
alter table public.organizations add column approval_version integer not null default 0 check(approval_version>=0);
create table private.destination_reviewers (
 user_id uuid not null references public.user_profiles(id),
 destination_id uuid not null references public.destinations(id),
 granted_at timestamptz not null default now(),
 primary key(user_id,destination_id)
);
create index destination_reviewers_destination_idx on private.destination_reviewers(destination_id);
create table private.merchant_reviews (
 actor_id uuid not null references public.user_profiles(id),
 command_id uuid not null,
 organization_id uuid not null references public.organizations(id),
 previous_status text not null check(previous_status in ('pending','approved','suspended')),
 next_status text not null check(next_status in ('approved','suspended')),
 previous_version integer not null check(previous_version>=0),
 reason text not null check(length(trim(reason)) between 10 and 1000),
 created_at timestamptz not null default now(),
 primary key(actor_id,command_id),unique(organization_id,previous_version)
);
create index merchant_reviews_org_created_idx on private.merchant_reviews(organization_id,created_at desc);
create trigger immutable_merchant_review before update or delete on private.merchant_reviews for each row execute function private.reject_ledger_change();
alter table private.destination_reviewers enable row level security;
alter table private.merchant_reviews enable row level security;
revoke all on private.destination_reviewers,private.merchant_reviews from public,anon,authenticated;

create function private.merchant_review_command(action text,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.current_actor(); dest uuid; org public.organizations%rowtype; prior private.merchant_reviews%rowtype; cid uuid; ver integer; decision text; note text; state text; skip integer; result jsonb;
begin
 if uid is null then return jsonb_build_object('error','unauthorized'); end if;
 if action='context' then
  return jsonb_build_object('destinations',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'names',d.names) order by d.slug) from private.destination_reviewers a join public.destinations d on d.id=a.destination_id where a.user_id=uid),'[]'::jsonb));
 elsif action='queue' then
  dest:=(payload->>'destination_id')::uuid;
  perform 1 from private.destination_reviewers where user_id=uid and destination_id=dest for share;
  if not found then return jsonb_build_object('error','forbidden'); end if;
  state:=payload->>'status';skip:=coalesce((payload->>'offset')::integer,0);
  if state is null or state not in ('pending','approved','suspended') or skip<0 or skip>100000 then return jsonb_build_object('error','invalid'); end if;
  select jsonb_build_object('total',(select count(*) from public.organizations o where o.kind='merchant' and o.destination_id=dest and o.status=state),'merchants',coalesce(jsonb_agg(to_jsonb(q) order by q.created_at,q.id),'[]'::jsonb)) into result from (
   select o.id,o.name,o.status,o.approval_version,o.created_at,
    exists(select 1 from public.organization_members m where m.organization_id=o.id and m.user_id=uid) as own_business,
    (select jsonb_build_object('reason',r.reason,'status',r.next_status,'created_at',r.created_at) from private.merchant_reviews r where r.organization_id=o.id order by r.previous_version desc limit 1) as last_review
   from public.organizations o where o.kind='merchant' and o.destination_id=dest and o.status=state order by o.created_at,o.id limit 25 offset skip
  ) q;
  return result;
 elsif action='decide' then
  -- Lock the organization and assignment; stale browser forms cannot overwrite newer decisions.
  select * into org from public.organizations where id=(payload->>'organization_id')::uuid for update;
  if not found or org.kind<>'merchant' then return jsonb_build_object('error','forbidden'); end if;
  perform 1 from private.destination_reviewers where user_id=uid and destination_id=org.destination_id for share;
  if not found or exists(select 1 from public.organization_members where organization_id=org.id and user_id=uid) then return jsonb_build_object('error','forbidden'); end if;
  cid:=(payload->>'command_id')::uuid;ver:=(payload->>'expected_version')::integer;decision:=payload->>'decision';note:=trim(payload->>'reason');
  if cid is null or ver is null or ver<0 or decision is null or decision not in ('approved','suspended') or coalesce(length(note),0) not between 10 and 1000 then return jsonb_build_object('error','invalid'); end if;
  select * into prior from private.merchant_reviews where actor_id=uid and command_id=cid;
  if found then
   if prior.organization_id<>org.id or prior.previous_version<>ver or prior.next_status<>decision or prior.reason<>note then return jsonb_build_object('error','idempotency_conflict'); end if;
   return jsonb_build_object('success',true);
  end if;
  if org.approval_version<>ver then return jsonb_build_object('error','stale'); end if;
  if org.status=decision or (org.status='pending' and decision<>'approved') then return jsonb_build_object('error','invalid_state'); end if;
  insert into private.merchant_reviews(actor_id,command_id,organization_id,previous_status,next_status,previous_version,reason) values(uid,cid,org.id,org.status,decision,ver,note);
  update public.organizations set status=decision,approval_version=approval_version+1 where id=org.id;
  insert into private.audit_events(actor_id,organization_id,action,entity_id) values(uid,org.id,'merchant_'||decision,org.id);
  return jsonb_build_object('success',true);
 end if;
 return jsonb_build_object('error','invalid');
end $$;
revoke all on function private.merchant_review_command(text,jsonb) from public;
create function public.merchant_review_command(action text,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.merchant_review_command(action,payload); $$;
revoke all on function public.merchant_review_command(text,jsonb) from public;
grant execute on function private.merchant_review_command(text,jsonb),public.merchant_review_command(text,jsonb) to anon,authenticated;

-- Serialize acceptance of new submissions with merchant suspension.
create or replace function private.record_checkout_evidence(payload text,mac text) returns jsonb
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
  perform 1 from public.organizations o where o.id=r.organization_id and o.kind='merchant' and o.status='approved' for share;
  if not found then return jsonb_build_object('error','invalid_state'); end if;
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
