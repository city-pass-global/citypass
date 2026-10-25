-- Inquiry handling is a separate privilege from catalog publishing and hotel access.
create table private.destination_inquiry_agents (
 user_id uuid not null references public.user_profiles(id),destination_id uuid not null references public.destinations(id),
 granted_at timestamptz not null default now(),primary key(user_id,destination_id)
);
create index inquiry_agents_destination_idx on private.destination_inquiry_agents(destination_id);
create table private.experience_inquiries (
 id uuid primary key,user_id uuid not null references public.user_profiles(id),
 experience_id uuid not null references public.experiences(id),destination_id uuid not null references public.destinations(id),
 titles jsonb not null check(private.experience_text_valid(titles,2,120)),
 preferred_date date not null,party_size integer not null check(party_size between 1 and 20),
 message text not null check(length(btrim(message,E' \t\n\r')) between 10 and 1000),
 response text check(length(btrim(response,E' \t\n\r')) between 10 and 2000),responded_at timestamptz,
 status text not null default 'open' check(status in ('open','replied','closed','cancelled')),
 version integer not null default 0 check(version>=0),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check((response is null)=(responded_at is null)),check(status not in ('replied','closed') or response is not null)
);
create index inquiries_user_created_idx on private.experience_inquiries(user_id,created_at desc,id);
create index inquiries_destination_status_idx on private.experience_inquiries(destination_id,status,created_at,id);
create index inquiries_experience_idx on private.experience_inquiries(experience_id);
create table private.inquiry_commands (
 actor_id uuid not null references public.user_profiles(id),command_id uuid not null,request_id uuid not null references private.experience_inquiries(id),
 action text not null check(action in ('create','reply','cancel','close')),payload_hash text not null check(payload_hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default now(),primary key(actor_id,command_id)
);
create index inquiry_commands_request_idx on private.inquiry_commands(request_id);
create trigger immutable_inquiry_command before update or delete on private.inquiry_commands for each row execute function private.reject_ledger_change();
alter table private.destination_inquiry_agents enable row level security;
alter table private.experience_inquiries enable row level security;
alter table private.inquiry_commands enable row level security;
revoke all on private.destination_inquiry_agents,private.experience_inquiries,private.inquiry_commands from public,anon,authenticated;
create function private.inquiry_view(r private.experience_inquiries) returns jsonb language sql stable security invoker set search_path='' as $$ select to_jsonb(r)-'user_id'; $$;
revoke all on function private.inquiry_view(private.experience_inquiries) from public,anon,authenticated;
create function private.inquiry_command(action text,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.current_actor(); dest uuid; cid uuid; rid uuid; signature text; prior private.inquiry_commands%rowtype; r private.experience_inquiries%rowtype; item public.experiences%rowtype; skip integer; state text; party integer; day date; note text; ver integer;
begin
 if uid is null then return jsonb_build_object('error','unauthorized'); end if;
 if action='context' then
  return jsonb_build_object('destinations',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'names',d.names) order by d.slug) from private.destination_inquiry_agents a join public.destinations d on d.id=a.destination_id where a.user_id=uid),'[]'::jsonb));
 elsif action in ('mine','queue') then
  skip:=coalesce((payload->>'offset')::integer,0);state:=coalesce(payload->>'status','all');
  if skip<0 or skip>100000 or state not in ('all','open','replied','closed','cancelled') then return jsonb_build_object('error','invalid'); end if;
  if action='queue' then
   dest:=(payload->>'destination_id')::uuid;
   perform 1 from private.destination_inquiry_agents where user_id=uid and destination_id=dest for share;
   if not found then return jsonb_build_object('error','forbidden'); end if;
  end if;
  return jsonb_build_object('total',(select count(*) from private.experience_inquiries i where (case when action='mine' then i.user_id=uid else i.destination_id=dest end) and (state='all' or i.status=state)),
   'inquiries',coalesce((select jsonb_agg(private.inquiry_view(q) order by q.created_at desc,q.id) from (select i.* from private.experience_inquiries i where (case when action='mine' then i.user_id=uid else i.destination_id=dest end) and (state='all' or i.status=state) order by i.created_at desc,i.id limit 25 offset skip) q),'[]'::jsonb));
 elsif action='detail' then
  select * into r from private.experience_inquiries where id=(payload->>'request_id')::uuid;
  if not found or (r.user_id<>uid and not exists(select 1 from private.destination_inquiry_agents where user_id=uid and destination_id=r.destination_id)) then return jsonb_build_object('error','forbidden'); end if;
  return jsonb_build_object('inquiry',private.inquiry_view(r),'is_owner',r.user_id=uid,'can_handle',r.user_id<>uid and exists(select 1 from private.destination_inquiry_agents where user_id=uid and destination_id=r.destination_id));
 end if;
 if action not in ('create','reply','cancel','close') then return jsonb_build_object('error','invalid'); end if;
 -- Actor lock serializes idempotency and per-user creation limits.
 perform 1 from public.user_profiles where id=uid for update;
 cid:=(payload->>'command_id')::uuid;
 if cid is null then return jsonb_build_object('error','invalid'); end if;
 signature:=encode(sha256(convert_to(payload::text,'UTF8')),'hex');
 if action='create' then
  select * into item from public.experiences where id=(payload->>'experience_id')::uuid for share;
  if not found then return jsonb_build_object('error','unavailable'); end if;
  rid:=cid;
 else
  select * into r from private.experience_inquiries where id=(payload->>'request_id')::uuid for update;
  if not found then return jsonb_build_object('error','forbidden'); end if;
  if action='cancel' then
   if r.user_id<>uid then return jsonb_build_object('error','forbidden'); end if;
  else
   perform 1 from private.destination_inquiry_agents where user_id=uid and destination_id=r.destination_id for share;
   if not found or r.user_id=uid then return jsonb_build_object('error','forbidden'); end if;
  end if;
  rid:=r.id;
 end if;
 select * into prior from private.inquiry_commands c where c.actor_id=uid and c.command_id=cid;
 if found then
  if prior.action<>action or prior.payload_hash<>signature or prior.request_id<>rid then return jsonb_build_object('error','idempotency_conflict'); end if;
  return jsonb_build_object('id',rid);
 end if;
 if action='create' then
  if item.status<>'published' then return jsonb_build_object('error','unavailable'); end if;
  party:=(payload->>'party_size')::integer;day:=(payload->>'preferred_date')::date;note:=btrim(payload->>'message',E' \t\n\r');
  select (now() at time zone timezone)::date into day from public.destinations where id=item.destination_id;
  if (payload->>'preferred_date')::date is null or (payload->>'preferred_date')::date<day or (payload->>'preferred_date')::date>day+365 or party is null or party not between 1 and 20 or coalesce(length(note),0) not between 10 and 1000 or coalesce(payload->>'consent','')<>'on' then return jsonb_build_object('error','invalid'); end if;
  if (select count(*) from private.experience_inquiries where user_id=uid and created_at>now()-interval '24 hours')>=10 then return jsonb_build_object('error','limit'); end if;
  insert into private.experience_inquiries(id,user_id,experience_id,destination_id,titles,preferred_date,party_size,message) values(rid,uid,item.id,item.destination_id,item.titles,(payload->>'preferred_date')::date,party,note);
 else
  ver:=(payload->>'expected_version')::integer;
  if ver is null or ver<>r.version then return jsonb_build_object('error','stale'); end if;
  if coalesce(payload->>'consent','')<>'on' then return jsonb_build_object('error','invalid'); end if;
  if action='reply' then
   note:=btrim(payload->>'response',E' \t\n\r');
   if coalesce(length(note),0) not between 10 and 2000 then return jsonb_build_object('error','invalid'); end if;
   if r.status<>'open' then return jsonb_build_object('error','invalid_state'); end if;
   update private.experience_inquiries set response=note,responded_at=now(),status='replied',version=version+1,updated_at=now() where id=rid;
  elsif action='cancel' then
   if r.status not in ('open','replied') then return jsonb_build_object('error','invalid_state'); end if;
   update private.experience_inquiries set status='cancelled',version=version+1,updated_at=now() where id=rid;
  else
   if r.status<>'replied' then return jsonb_build_object('error','invalid_state'); end if;
   update private.experience_inquiries set status='closed',version=version+1,updated_at=now() where id=rid;
  end if;
 end if;
 insert into private.inquiry_commands(actor_id,command_id,request_id,action,payload_hash) values(uid,cid,rid,action,signature);
 insert into private.audit_events(actor_id,action,entity_id) values(uid,'inquiry_'||action,rid);
 return jsonb_build_object('id',rid);
 exception when unique_violation then return jsonb_build_object('error','idempotency_conflict');
end $$;
revoke all on function private.inquiry_command(text,jsonb) from public;
create function public.inquiry_command(action text,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.inquiry_command(action,payload); $$;
revoke all on function public.inquiry_command(text,jsonb) from public;
grant execute on function private.inquiry_command(text,jsonb),public.inquiry_command(text,jsonb) to anon,authenticated;
