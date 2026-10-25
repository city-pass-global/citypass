-- Demo metadata is administrative, immutable and separate from business participation.
alter table public.experiences add column is_demo boolean not null default false;
alter table public.experiences add column demo_key text unique;
alter table public.experiences add constraint experience_demo_identity check((not is_demo and demo_key is null) or (is_demo and demo_key is not null and demo_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(demo_key)<=80));
alter table public.experiences add constraint demo_has_no_provider_link check(not is_demo or booking_url is null);
alter table private.experience_inquiries add column is_demo boolean not null default false;
create function private.preserve_demo_classification() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if old.is_demo is distinct from new.is_demo then raise exception 'Demo classification is immutable' using errcode='23514'; end if;
 if tg_table_name='experiences' and to_jsonb(old)->'demo_key' is distinct from to_jsonb(new)->'demo_key' then raise exception 'Demo identity is immutable' using errcode='23514'; end if;
 return new;
end $$;
revoke all on function private.preserve_demo_classification() from public,anon,authenticated;
create trigger experience_demo_immutable before update on public.experiences for each row execute function private.preserve_demo_classification();
create trigger inquiry_demo_immutable before update on private.experience_inquiries for each row execute function private.preserve_demo_classification();

create or replace function private.experience_command(action text,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.current_actor(); dest uuid; cid uuid; rid uuid; ver integer; item public.experiences%rowtype; prior private.experience_commands%rowtype; skip integer; state text; link text;
begin
 if uid is null then return jsonb_build_object('error','unauthorized'); end if;
 if action='context' then
  return jsonb_build_object('destinations',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'names',d.names) order by d.slug) from private.destination_editors a join public.destinations d on d.id=a.destination_id where a.user_id=uid),'[]'::jsonb));
 end if;
 if action<>'queue' then perform 1 from public.user_profiles where id=uid for update; end if;
 if action in ('queue','create') then dest:=(payload->>'destination_id')::uuid;
 else
  select * into item from public.experiences where id=(payload->>'experience_id')::uuid for update;
  if not found then return jsonb_build_object('error','forbidden'); end if;
  dest:=item.destination_id;
 end if;
 perform 1 from private.destination_editors where user_id=uid and destination_id=dest for share;
 if not found then return jsonb_build_object('error','forbidden'); end if;
 if action='queue' then
  skip:=coalesce((payload->>'offset')::integer,0);state:=payload->>'status';
  if skip<0 or skip>100000 or state is null or state not in ('draft','published','archived') then return jsonb_build_object('error','invalid'); end if;
  return jsonb_build_object('total',(select count(*) from public.experiences e where e.destination_id=dest and e.status=state),'experiences',coalesce((select jsonb_agg(to_jsonb(q) order by q.created_at,q.id) from (select * from public.experiences e where e.destination_id=dest and e.status=state order by e.created_at,e.id limit 25 offset skip) q),'[]'::jsonb));
 end if;
 if action not in ('create','save','publish','withdraw') then return jsonb_build_object('error','invalid'); end if;
 cid:=(payload->>'command_id')::uuid;
 if cid is null then return jsonb_build_object('error','invalid'); end if;
 -- Actor lock above serializes command retries, including first-time creation.
 select * into prior from private.experience_commands c where c.actor_id=uid and c.command_id=cid;
 if found then
  if prior.action<>action or prior.payload<>payload then return jsonb_build_object('error','idempotency_conflict'); end if;
  return jsonb_build_object('id',prior.experience_id);
 end if;
 if action<>'create' then
  ver:=(payload->>'expected_version')::integer;
  if ver is null or ver<>item.version then return jsonb_build_object('error','stale'); end if;
 end if;
 if action in ('publish','withdraw') and coalesce(payload->>'confirmed','')<>'on' then return jsonb_build_object('error','invalid'); end if;
 if action in ('create','save') then
  if action='save' and item.status='published' then return jsonb_build_object('error','withdraw_first'); end if;
  link:=nullif(payload->>'booking_url','');
  if not private.experience_text_valid(payload->'titles',2,120) or not private.experience_text_valid(payload->'descriptions',20,3000) or not private.experience_link_valid(link) or (action='save' and item.is_demo and link is not null) then return jsonb_build_object('error','invalid'); end if;
  if action='create' then
   insert into public.experiences(id,destination_id,titles,descriptions,booking_url) values(cid,dest,payload->'titles',payload->'descriptions',link) returning id into rid;
  else
   update public.experiences set titles=payload->'titles',descriptions=payload->'descriptions',booking_url=link,status='draft',version=version+1,updated_at=now() where id=item.id returning id into rid;
  end if;
 elsif action='publish' then
  if item.status<>'draft' then return jsonb_build_object('error','invalid_state'); end if;
  update public.experiences set status='published',version=version+1,updated_at=now() where id=item.id returning id into rid;
 else
  if item.status<>'published' then return jsonb_build_object('error','invalid_state'); end if;
  update public.experiences set status='archived',version=version+1,updated_at=now() where id=item.id returning id into rid;
 end if;
 insert into private.experience_commands(actor_id,command_id,experience_id,action,payload) values(uid,cid,rid,action,payload);
 insert into private.audit_events(actor_id,action,entity_id) values(uid,'experience_'||action,rid);
 return jsonb_build_object('id',rid);
 exception when unique_violation then return jsonb_build_object('error','idempotency_conflict');
end $$;

create or replace function private.inquiry_command(action text,payload jsonb) returns jsonb
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
  insert into private.experience_inquiries(id,user_id,experience_id,destination_id,titles,preferred_date,party_size,message,is_demo) values(rid,uid,item.id,item.destination_id,item.titles,(payload->>'preferred_date')::date,party,note,item.is_demo);
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
