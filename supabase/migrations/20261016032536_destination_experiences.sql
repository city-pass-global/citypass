-- Explicit catalog authority is separate from merchant review and business membership.
create table private.destination_editors (
 user_id uuid not null references public.user_profiles(id),
 destination_id uuid not null references public.destinations(id),
 granted_at timestamptz not null default now(),primary key(user_id,destination_id)
);
create index destination_editors_destination_idx on private.destination_editors(destination_id);
alter table private.destination_editors enable row level security;
revoke all on private.destination_editors from public,anon,authenticated;
create function private.is_destination_editor(dest uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.destination_editors where user_id=(select private.current_actor()) and destination_id=dest);
$$;
revoke all on function private.is_destination_editor(uuid) from public;
grant execute on function private.is_destination_editor(uuid) to anon,authenticated;
create function private.experience_text_valid(value jsonb,minimum integer,maximum integer) returns boolean language sql immutable security invoker set search_path='' as $$
 select case when jsonb_typeof(value) is distinct from 'object' then false else coalesce((select count(*) from jsonb_object_keys(value))=3 and value ?& array['es','en','pt'] and not exists(select 1 from jsonb_each(value) t where jsonb_typeof(t.value)<>'string' or length(trim(t.value#>>'{}')) not between minimum and maximum),false) end;
$$;
revoke all on function private.experience_text_valid(jsonb,integer,integer) from public,anon,authenticated;
create function private.experience_link_valid(value text) returns boolean language sql immutable security invoker set search_path='' as $$
 select value is null or (length(value)<=2048 and value ~ '^https://([A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?[.])+[A-Za-z]{2,63}(/[^[:space:][:cntrl:]#]*)?$');
$$;
revoke all on function private.experience_link_valid(text) from public,anon,authenticated;
create table public.experiences (
 id uuid primary key default gen_random_uuid(),destination_id uuid not null references public.destinations(id),
 titles jsonb not null check(private.experience_text_valid(titles,2,120)),
 descriptions jsonb not null check(private.experience_text_valid(descriptions,20,3000)),
 booking_url text check(private.experience_link_valid(booking_url)),
 status text not null default 'draft' check(status in ('draft','published','archived')),
 version integer not null default 0 check(version>=0),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index experiences_destination_status_idx on public.experiences(destination_id,status,created_at,id);
alter table public.experiences enable row level security;
revoke all on public.experiences from public,anon,authenticated;
grant select on public.experiences to anon,authenticated;
create policy experience_visibility on public.experiences for select to anon,authenticated using(status='published' or private.is_destination_editor(destination_id));
create table private.experience_commands (
 actor_id uuid not null references public.user_profiles(id),command_id uuid not null,
 experience_id uuid not null references public.experiences(id),action text not null check(action in ('create','save','publish','withdraw')),
 payload jsonb not null,created_at timestamptz not null default now(),primary key(actor_id,command_id)
);
create index experience_commands_experience_idx on private.experience_commands(experience_id);
alter table private.experience_commands enable row level security;
revoke all on private.experience_commands from public,anon,authenticated;
create trigger immutable_experience_command before update or delete on private.experience_commands for each row execute function private.reject_ledger_change();
create function private.experience_command(action text,payload jsonb) returns jsonb
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
  if not private.experience_text_valid(payload->'titles',2,120) or not private.experience_text_valid(payload->'descriptions',20,3000) or not private.experience_link_valid(link) then return jsonb_build_object('error','invalid'); end if;
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
revoke all on function private.experience_command(text,jsonb) from public;
create function public.experience_command(action text,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.experience_command(action,payload); $$;
revoke all on function public.experience_command(text,jsonb) from public;
grant execute on function private.experience_command(text,jsonb),public.experience_command(text,jsonb) to anon,authenticated;
