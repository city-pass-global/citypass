-- Self-reported exploration is deliberately separate from verified QR claims and chain awards.
create table private.exploration_activities (
 guide_slug text not null, item_id text not null, primary key(guide_slug,item_id)
);
alter table private.exploration_activities enable row level security;
revoke all on private.exploration_activities from public,anon,authenticated;
insert into private.exploration_activities values
('buenos-aires','sanTelmo'),
('buenos-aires','palermo'),
('buenos-aires','colon'),
('buenos-aires','laBoca'),
('buenos-aires','ateneo'),
('buenos-aires','rosedal'),
('lisbon','alfama'),
('lisbon','belem'),
('lisbon','santaLuzia'),
('lisbon','fado'),
('lisbon','jeronimos'),
('lisbon','oceanario'),
('san-jose','theatre'),
('san-jose','jade'),
('san-jose','national'),
('san-jose','gold'),
('san-jose','children'),
('san-jose','musicTemple'),
('la-fortuna','arenal'),
('la-fortuna','waterfall'),
('la-fortuna','springs'),
('la-fortuna','lake'),
('la-fortuna','mistico'),
('la-fortuna','venado'),
('rio-de-janeiro','coast'),
('rio-de-janeiro','tijuca'),
('rio-de-janeiro','selaron'),
('rio-de-janeiro','port'),
('sao-paulo','ibirapuera'),
('sao-paulo','masp'),
('sao-paulo','pinacoteca'),
('sao-paulo','market'),
('porto','ribeira'),
('porto','saoBento'),
('porto','clerigos'),
('porto','serralves');
create table public.exploration_claims (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.user_profiles(id),
 destination_id uuid not null references public.destinations(id),
 guide_slug text not null, item_id text not null,
 claimed_at timestamptz not null default now(),
 foreign key(guide_slug,item_id) references private.exploration_activities,
 unique(user_id,guide_slug,item_id)
);
create index exploration_claims_destination_idx on public.exploration_claims(destination_id);
create index exploration_claims_activity_idx on public.exploration_claims(guide_slug,item_id);
alter table public.exploration_claims enable row level security;
revoke all on public.exploration_claims from public,anon,authenticated;
grant select on public.exploration_claims to anon,authenticated;
create policy own_exploration_claims on public.exploration_claims for select to anon,authenticated
 using(user_id=(select private.current_actor()));
create function private.claim_exploration(guide_slug text,item_id text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.current_actor(); destination uuid; claim uuid;
begin
 if uid is null then return jsonb_build_object('error','unauthorized'); end if;
 if not exists(select 1 from private.exploration_activities a where a.guide_slug=claim_exploration.guide_slug and a.item_id=claim_exploration.item_id) then
  return jsonb_build_object('error','invalid');
 end if;
 select d.id into destination from public.destinations d where d.slug=guide_slug;
 if destination is null then return jsonb_build_object('error','invalid'); end if;
 -- Serialize a traveler's claims, including concurrent first activation.
 perform 1 from public.user_profiles where id=uid for update;
 perform private.activate_traveler();
 insert into public.exploration_claims(user_id,destination_id,guide_slug,item_id)
 values(uid,destination,guide_slug,item_id)
 on conflict on constraint exploration_claims_user_id_guide_slug_item_id_key do nothing returning id into claim;
 if claim is null then return jsonb_build_object('error','already_claimed'); end if;
 insert into private.audit_events(actor_id,action,entity_id) values(uid,'claim_exploration',claim);
 return jsonb_build_object('id',claim);
end $$;
create function public.claim_exploration(guide_slug text,item_id text) returns jsonb
language sql security invoker set search_path='' as $$ select private.claim_exploration(guide_slug,item_id) $$;
revoke all on function private.claim_exploration(text,text),public.claim_exploration(text,text) from public;
grant execute on function private.claim_exploration(text,text),public.claim_exploration(text,text) to anon,authenticated;
