-- Selected development project only. All synthetic fixtures roll back.
begin;
do $$ declare p text; result jsonb; i int; begin
 for i in 1..2 loop
 p:=jsonb_build_object('application','inquiry-rollback','subject','inquiry-rollback-'||i,'network','testnet','wallet',case i when 1 then 'G'||repeat('A',55) else 'G'||repeat('B',55) end,'issued',floor(extract(epoch from now()))::bigint,'expires',floor(extract(epoch from now()))::bigint+300,'token_hash',encode(sha256(convert_to(repeat(i::text,64),'UTF8')),'hex'))::text;
 result:=public.create_pollar_session(p,private.bridge_hmac((select key_hex from private.pollar_bridge_config where singleton),p));
 assert result->>'id' is not null,'fixture session';
 perform set_config('test.user'||i,result->>'id',true);
 end loop;
end $$;
select set_config('test.dest',(select id::text from public.destinations limit 1),true);
select set_config('test.experience',gen_random_uuid()::text,true);
insert into public.experiences(id,destination_id,titles,descriptions,status) values(current_setting('test.experience')::uuid,current_setting('test.dest')::uuid,jsonb_build_object('es','Prueba temporal','en','Temporary test','pt','Teste temporário'),jsonb_build_object('es','Prueba temporal, no es una experiencia real.','en','Temporary test, not a real experience offer.','pt','Teste temporário, não é uma experiência real.'),'published');
set local role anon;
select set_config('request.headers',jsonb_build_object('x-citypassport-session',repeat('1',64))::text,true);
do $$ declare p jsonb; r jsonb; begin
 p:=jsonb_build_object('experience_id',current_setting('test.experience'),'command_id',gen_random_uuid(),'preferred_date',(now()+interval '1 day')::date,'party_size',2,'message','Rollback inquiry only; no real reservation.','consent','on');
 assert public.inquiry_command('create',p||jsonb_build_object('party_size',21))->>'error'='invalid','invalid count denied';
 assert public.inquiry_command('create',p||jsonb_build_object('consent','no'))->>'error'='invalid','explicit sharing required';
 r:=public.inquiry_command('create',p);
 assert r->>'id' is not null,'private inquiry created';
 assert public.inquiry_command('create',p)->>'id'=r->>'id','create retry idempotent';
 assert public.inquiry_command('create',p||jsonb_build_object('message','Changed retry details are denied.'))->>'error'='idempotency_conflict','changed replay denied';
 assert (public.inquiry_command('mine','{}')->>'total')::integer=1,'own history';
 assert not ((public.inquiry_command('detail',jsonb_build_object('request_id',r->>'id'))->'inquiry') ? 'user_id'),'identity omitted from projection';
 assert not has_table_privilege(current_user,'private.experience_inquiries','select'),'no direct message reads';
 perform set_config('test.request',r->>'id',true);
end $$;
select set_config('request.headers',jsonb_build_object('x-citypassport-session',repeat('2',64))::text,true);
do $$ begin
 assert public.inquiry_command('detail',jsonb_build_object('request_id',current_setting('test.request')))->>'error'='forbidden','cross-user privacy';
 assert not has_table_privilege(current_user,'private.destination_inquiry_agents','insert'),'no self promotion';
end $$;
reset role;
insert into private.destination_inquiry_agents(user_id,destination_id) values(current_setting('test.user2')::uuid,current_setting('test.dest')::uuid);
set local role anon;
do $$ declare p jsonb; begin
 assert (public.inquiry_command('queue',jsonb_build_object('destination_id',current_setting('test.dest')))->>'total')::integer=1,'assigned inbox';
 assert (select count(*) from public.hotel_reservations)=0,'no hotel access';
 p:=jsonb_build_object('request_id',current_setting('test.request'),'command_id',gen_random_uuid(),'expected_version',0,'response','Rollback response only; no reservation confirmed.','consent','on');
 assert public.inquiry_command('reply',p||jsonb_build_object('expected_version',9))->>'error'='stale','stale response denied';
 assert public.inquiry_command('reply',p)->>'id'=current_setting('test.request'),'authorized response';
 assert public.inquiry_command('reply',p)->>'id'=current_setting('test.request'),'response replay';
 perform set_config('test.reply',p::text,true);
end $$;
select set_config('request.headers',jsonb_build_object('x-citypassport-session',repeat('1',64))::text,true);
do $$ begin
 assert public.inquiry_command('detail',jsonb_build_object('request_id',current_setting('test.request')))->'inquiry'->>'status'='replied','traveler sees response';
 assert public.inquiry_command('cancel',jsonb_build_object('request_id',current_setting('test.request'),'command_id',gen_random_uuid(),'expected_version',1,'consent','on'))->>'id'=current_setting('test.request'),'traveler cancellation';
end $$;
select set_config('request.headers',jsonb_build_object('x-citypassport-session',repeat('2',64))::text,true);
do $$ begin
 assert public.inquiry_command('reply',current_setting('test.reply')::jsonb)->>'id'=current_setting('test.request'),'old reply replay harmless';
 assert public.inquiry_command('detail',jsonb_build_object('request_id',current_setting('test.request')))->'inquiry'->>'status'='cancelled','old reply does not reopen request';
end $$;
reset role;
do $$ begin
 assert (select count(*) from private.inquiry_commands where request_id=current_setting('test.request')::uuid)=3,'exactly three accepted transitions';
end $$;
delete from private.destination_inquiry_agents where user_id=current_setting('test.user2')::uuid;
set local role anon;
do $$ begin
 assert public.inquiry_command('detail',jsonb_build_object('request_id',current_setting('test.request')))->>'error'='forbidden','revocation denies access';
 assert public.inquiry_command('reply',current_setting('test.reply')::jsonb)->>'error'='forbidden','revocation denies response replay';
end $$;
rollback;
select 'Experience inquiries hosted rollback checks passed' as verification;
