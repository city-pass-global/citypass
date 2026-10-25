-- Run on the selected development project only. All synthetic rows roll back.
begin;
insert into public.user_profiles(id) values
 ('f0000000-0000-4000-8000-000000000001'),
 ('f0000000-0000-4000-8000-000000000002'),
 ('f0000000-0000-4000-8000-000000000003');
insert into private.app_sessions(token_hash,user_id,expires_at)
select encode(sha256(convert_to(replace(id::text,'-','')||repeat('0',32),'UTF8')),'hex'),id,now()+interval '1 hour'
from public.user_profiles where id::text like 'f0000000%';
select set_config('request.headers','{}',true);
set local role anon;
do $$ begin
 assert (select count(*) from public.venues)=15, 'public catalog readable';
 assert public.passport_command('activate_passport','{"destination_id":"10000000-0000-4000-8000-000000000001"}') ->> 'error' = 'unauthorized', 'anonymous activation denied';
 assert (select count(*) from public.hotel_reservations)=0, 'anonymous guest access denied';
 assert not has_table_privilege(current_user,'public.stamp_claims','insert'), 'direct claim writes denied';
end $$;
reset role;
select set_config('request.jwt.claim.sub','f0000000-0000-4000-8000-000000000001',true);
select set_config('request.headers',jsonb_build_object('x-citypassport-session',replace('f0000000-0000-4000-8000-000000000001','-','')||repeat('0',32))::text,true);
set local role authenticated;
do $$ declare r jsonb; begin
 r:=public.passport_command('activate_passport','{"destination_id":"10000000-0000-4000-8000-000000000001"}');
 assert r ? 'id', 'passport activation';
 assert (select count(*) from public.passport_profiles)=1,'own passport visible';
 r:=public.passport_command('create_hotel','{"destination_id":"10000000-0000-4000-8000-000000000001","name":"Rollback verification hotel"}');
 assert r ? 'id','hotel onboarding';
 perform set_config('test.org',r->>'id',true);
 r:=public.passport_command('create_reservation',jsonb_build_object('organization_id',current_setting('test.org'),'reference','VERIFY-ROLLBACK','email','verification@example.invalid','arrival',current_date+1,'departure',current_date+2,'guest_count',1));
 assert r ? 'id','reservation created';
 perform set_config('test.reservation',r->>'id',true);
 r:=public.passport_command('issue_invitation',jsonb_build_object('reservation_id',current_setting('test.reservation'),'token',repeat('a',64)));
 assert r->>'ok'='true','invitation issued';
end $$;
reset role;
select set_config('request.jwt.claim.sub','f0000000-0000-4000-8000-000000000002',true);
select set_config('request.headers',jsonb_build_object('x-citypassport-session',replace('f0000000-0000-4000-8000-000000000002','-','')||repeat('0',32))::text,true);
set local role authenticated;
do $$ begin
 assert (select count(*) from public.passport_profiles)=0,'other passport hidden';
 assert (select count(*) from public.hotel_reservations)=0,'other hotel hidden';
 assert public.passport_command('issue_invitation',jsonb_build_object('reservation_id',current_setting('test.reservation'),'token',repeat('b',64)))->>'error'='forbidden','other hotel mutation denied';
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.headers','{}',true);
set local role anon;
do $$ declare payload jsonb; begin
 payload:=jsonb_build_object('token',repeat('a',64),'email','verification@example.invalid','full_name','Verification Guest','phone','0000000000','nationality','Argentina','residence','Argentina','arrival_time','14:00','consent',true);
 assert public.passport_command('submit_precheckin',payload)->>'ok'='true','guest submission';
 assert public.passport_command('submit_precheckin',payload)->>'error'='invalid_invitation','invitation replay denied';
end $$;
reset role;
select set_config('request.jwt.claim.sub','f0000000-0000-4000-8000-000000000001',true);
select set_config('request.headers',jsonb_build_object('x-citypassport-session',replace('f0000000-0000-4000-8000-000000000001','-','')||repeat('0',32))::text,true);
set local role authenticated;
do $$ begin
 assert (select count(*) from public.precheckin_submissions)=1,'hotel reads submitted guest';
 assert public.passport_command('review_reservation',jsonb_build_object('reservation_id',current_setting('test.reservation'),'status','reviewed'))->>'ok'='true','hotel reviews submission';
end $$;
reset role;
-- A synthetic participating fixture only exists within this rolled-back transaction.
update public.organizations set status='approved' where id=current_setting('test.org')::uuid;
insert into public.venues(id,destination_id,organization_id,name,category,participation_status)
 values('f0000000-0000-4000-8000-000000000010','10000000-0000-4000-8000-000000000001',current_setting('test.org')::uuid,'Rollback verification venue','nature','participating');
insert into public.stamp_definitions(id,venue_id,destination_id,name)
 values('f0000000-0000-4000-8000-000000000011','f0000000-0000-4000-8000-000000000010','10000000-0000-4000-8000-000000000001','Rollback verification stamp');
set local role authenticated;
do $$ begin
 assert public.passport_command('issue_qr',jsonb_build_object('stamp_id','f0000000-0000-4000-8000-000000000011','token',repeat('c',64)))->>'ok'='true','authorized QR issuance';
end $$;
reset role;
select set_config('request.jwt.claim.sub','f0000000-0000-4000-8000-000000000003',true);
select set_config('request.headers',jsonb_build_object('x-citypassport-session',replace('f0000000-0000-4000-8000-000000000003','-','')||repeat('0',32))::text,true);
set local role authenticated;
do $$ declare r jsonb; begin
 assert public.passport_command('claim_stamp',jsonb_build_object('token',repeat('c',64)))->>'error'='activate_first','claim needs passport';
 r:=public.passport_command('activate_passport','{"destination_id":"10000000-0000-4000-8000-000000000001"}');
 assert r ? 'id','tourist passport';
 r:=public.passport_command('claim_stamp',jsonb_build_object('token',repeat('c',64)));
 assert r ? 'id','authorized claim';
 assert public.passport_command('claim_stamp',jsonb_build_object('token',repeat('c',64)))->>'error'='already_claimed','duplicate claim denied';
 assert (select count(*) from public.stamp_claims)=1,'own claim visible';
end $$;
reset role;
rollback;
select 'hosted transactional assertions passed' as result,
 (select count(*) from public.user_profiles where id in ('f0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000002','f0000000-0000-4000-8000-000000000003')) as remaining_test_users,
 (select count(*) from public.venues) as catalog_entries,
 (select count(*) from public.venues where participation_status='participating') as participating_entries;
