-- Selected development project only. All synthetic identities roll back.
begin;
insert into public.user_profiles(id) values
 ('f1000000-0000-4000-8000-000000000001'),
 ('f1000000-0000-4000-8000-000000000002');
insert into private.app_sessions(token_hash,user_id,expires_at)
select encode(sha256(convert_to(replace(id::text,'-','')||repeat('0',32),'UTF8')),'hex'),id,now()+interval '1 hour'
from public.user_profiles where id::text like 'f1000000%';
select set_config('request.headers','{}',true);
set local role anon;
do $$ begin
 assert public.passport_command('activate_traveler','{}')->>'error'='unauthorized','anonymous activation denied';
 assert (select count(*) from public.traveler_profiles)=0,'anonymous global reads denied';
end $$;
reset role;
select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000001',true);
select set_config('request.headers',jsonb_build_object('x-citypassport-session',replace('f1000000-0000-4000-8000-000000000001','-','')||repeat('0',32))::text,true);
set local role authenticated;
do $$ declare first_id text; begin
 first_id:=public.passport_command('activate_traveler','{}')->>'id';
 assert first_id is not null,'global activation succeeds';
 assert public.passport_command('activate_traveler','{}')->>'id'=first_id,'activation is idempotent';
 assert (select count(*) from public.traveler_profiles)=1,'own global profile visible';
 assert (select count(*) from public.passport_profiles)=0,'no destination collection required';
 assert not has_table_privilege(current_user,'public.traveler_profiles','insert'),'direct creation denied';
 assert not has_table_privilege(current_user,'public.traveler_profiles','update'),'direct reassignment denied';
 assert not has_table_privilege(current_user,'public.traveler_profiles','delete'),'direct deletion denied';
 assert not has_function_privilege(current_user,'private.activate_traveler()','execute'),'internal helper denied';
 perform public.passport_command('activate_passport',jsonb_build_object('destination_id',(select id from public.destinations where slug='lisbon')));
 perform public.passport_command('activate_passport',jsonb_build_object('destination_id',(select id from public.destinations where slug='puerto-iguazu')));
 assert (select count(*) from public.passport_profiles)=2,'legacy collections remain supported';
 assert public.passport_command('activate_traveler','{}')->>'id'=first_id,'destination changes preserve identity';
end $$;
reset role;
select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000002',true);
select set_config('request.headers',jsonb_build_object('x-citypassport-session',replace('f1000000-0000-4000-8000-000000000002','-','')||repeat('0',32))::text,true);
set local role authenticated;
do $$ begin
 assert (select count(*) from public.traveler_profiles)=0,'other global profile hidden';
 assert (select count(*) from public.passport_profiles)=0,'other collections hidden';
end $$;
reset role;
do $$ begin
 assert (select count(*) from private.audit_events where actor_id='f1000000-0000-4000-8000-000000000001' and action='activate_traveler')=1,'activation audit not duplicated';
end $$;
rollback;
select 'global traveler rollback checks passed' as verification;
