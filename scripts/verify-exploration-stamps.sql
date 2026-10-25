-- Iguapass development project only. Synthetic identities and all claims roll back.
begin;
do $$
declare uid uuid; raw text; i integer;
begin
 for i in 1..2 loop
  uid:=gen_random_uuid();
  raw:=encode(sha256(convert_to(gen_random_uuid()::text,'UTF8')),'hex');
  insert into public.user_profiles(id) values(uid);
  insert into private.app_sessions(token_hash,user_id,expires_at)
   values(encode(sha256(convert_to(raw,'UTF8')),'hex'),uid,now()+interval '5 minutes');
  perform set_config('test.exploration_user_'||i,uid::text,true);
  perform set_config('test.exploration_token_'||i,raw,true);
 end loop;
end $$;
set local role anon;
do $$
declare r jsonb;
begin
 perform set_config('request.headers','{}',true);
 assert public.claim_exploration('lisbon','alfama')->>'error'='unauthorized','anonymous claim denied';
 assert not exists(select 1 from public.exploration_claims),'anonymous cannot read claims';
 perform set_config('request.headers',jsonb_build_object('x-citypassport-session',current_setting('test.exploration_token_1'))::text,true);
 assert public.claim_exploration('lisbon','invented')->>'error'='invalid','unknown activity denied';
 assert public.claim_exploration('porto','alfama')->>'error'='invalid','cross-city activity denied';
 r:=public.claim_exploration('lisbon','alfama');
 assert r->>'id' is not null,'direct claim accepted';
 perform set_config('test.exploration_claim',r->>'id',true);
 assert public.claim_exploration('lisbon','alfama')->>'error'='already_claimed','replay denied';
 assert (select count(*)=1 from public.exploration_claims),'owner reads exactly one stamp';
 assert exists(select 1 from public.traveler_profiles where user_id=current_setting('test.exploration_user_1')::uuid),'traveler activated';
 assert not has_table_privilege(current_user,'public.exploration_claims','insert'),'no direct insert grant';
 assert not has_table_privilege(current_user,'public.exploration_claims','update'),'no direct update grant';
 assert not has_table_privilege(current_user,'public.exploration_claims','delete'),'no direct delete grant';
 begin
  delete from public.exploration_claims;
  raise exception 'direct deletion unexpectedly accepted';
 exception when insufficient_privilege then null;
 end;
 perform set_config('request.headers',jsonb_build_object('x-citypassport-session',current_setting('test.exploration_token_2'))::text,true);
 assert not exists(select 1 from public.exploration_claims),'other traveler cannot read claim';
end $$;
set local role authenticated;
do $$ begin
 assert not exists(select 1 from public.exploration_claims),'authenticated other traveler cannot read claim';
 assert not has_table_privilege(current_user,'public.exploration_claims','insert'),'authenticated role cannot insert';
end $$;
reset role;
do $$ begin
 assert (select count(*)=1 from private.audit_events where action='claim_exploration' and entity_id=current_setting('test.exploration_claim')::uuid),'accepted claim audited once';
 assert not exists(select 1 from private.activity_outbox where source_id=current_setting('test.exploration_claim')::uuid and kind in (1,2,4)),'no paid or QR chain stamp awarded';
 assert (select destination_id=(select id from public.destinations where slug='lisbon') from public.exploration_claims where id=current_setting('test.exploration_claim')::uuid),'destination derived by database';
 assert (select relrowsecurity from pg_class where oid='public.exploration_claims'::regclass),'RLS enabled';
end $$;
rollback;
select 'exploration hosted checks passed; all fixtures rolled back' as verification;
