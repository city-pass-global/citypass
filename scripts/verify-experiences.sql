-- Selected development project only. All synthetic fixtures roll back.
begin;
do $$ declare p text; result jsonb; i int; begin
 for i in 1..2 loop
 p:=jsonb_build_object('application','experience-rollback','subject','experience-rollback-'||i,'network','testnet','wallet',case i when 1 then 'G'||repeat('A',55) else 'G'||repeat('B',55) end,'issued',floor(extract(epoch from now()))::bigint,'expires',floor(extract(epoch from now()))::bigint+300,'token_hash',encode(sha256(convert_to(repeat(i::text,64),'UTF8')),'hex'))::text;
 result:=public.create_pollar_session(p,private.bridge_hmac((select key_hex from private.pollar_bridge_config where singleton),p));
 assert result->>'id' is not null,'fixture session';
 perform set_config('test.user'||i,result->>'id',true);
 end loop;
end $$;
select set_config('test.dest',(select id::text from public.destinations limit 1),true);
set local role anon;
select set_config('request.headers',jsonb_build_object('x-citypassport-session',repeat('2',64))::text,true);
do $$ begin
 assert public.experience_command('context','{}')->'destinations'='[]'::jsonb,'no automatic catalog privilege';
 assert public.experience_command('queue',jsonb_build_object('destination_id',current_setting('test.dest'),'status','draft'))->>'error'='forbidden','unassigned editor denied';
 assert not has_table_privilege(current_user,'private.destination_editors','insert'),'self promotion denied';
end $$;
reset role;
insert into private.destination_editors(user_id,destination_id) values(current_setting('test.user2')::uuid,current_setting('test.dest')::uuid);
set local role anon;
do $$ declare p jsonb; r jsonb; begin
 p:=jsonb_build_object('command_id',gen_random_uuid(),'destination_id',current_setting('test.dest'),'titles',jsonb_build_object('es','Prueba temporal','en','Temporary test','pt','Teste temporário'),'descriptions',jsonb_build_object('es','Prueba aislada, no es una experiencia real.','en','Isolated test, not a real experience offer.','pt','Teste isolado, não é uma experiência real.'),'booking_url','https://example.com/');
 assert public.experience_command('create',p||jsonb_build_object('titles',jsonb_build_object('es','Only one')))->>'error'='invalid','missing translations denied';
 assert public.experience_command('create',p||jsonb_build_object('booking_url','javascript:alert(1)'))->>'error'='invalid','unsafe link denied';
 r:=public.experience_command('create',p);
 assert r->>'id' is not null,'draft creation';
 assert public.experience_command('create',p)->>'id'=r->>'id','creation replay idempotent';
 assert (select count(*) from public.hotel_reservations)=0,'no hotel data access';
 perform set_config('test.experience',r->>'id',true);
 perform set_config('test.publish',jsonb_build_object('experience_id',r->>'id','command_id',gen_random_uuid(),'expected_version',0,'confirmed','on')::text,true);
end $$;
select set_config('request.headers','{}',true);
do $$ begin
 assert not exists(select 1 from public.experiences where id=current_setting('test.experience')::uuid),'anonymous draft hidden';
end $$;
select set_config('request.headers',jsonb_build_object('x-citypassport-session',repeat('2',64))::text,true);
do $$ begin
 assert public.experience_command('publish',current_setting('test.publish')::jsonb)->>'id'=current_setting('test.experience'),'explicit publication';
end $$;
select set_config('request.headers','{}',true);
do $$ begin
 assert exists(select 1 from public.experiences where id=current_setting('test.experience')::uuid and status='published'),'published experience visible';
end $$;
select set_config('request.headers',jsonb_build_object('x-citypassport-session',repeat('2',64))::text,true);
do $$ begin
 assert public.experience_command('withdraw',jsonb_build_object('experience_id',current_setting('test.experience'),'command_id',gen_random_uuid(),'expected_version',0,'confirmed','on'))->>'error'='stale','stale withdrawal denied';
 assert public.experience_command('withdraw',jsonb_build_object('experience_id',current_setting('test.experience'),'command_id',gen_random_uuid(),'expected_version',1,'confirmed','on'))->>'id'=current_setting('test.experience'),'withdrawal accepted';
 assert public.experience_command('publish',current_setting('test.publish')::jsonb)->>'id'=current_setting('test.experience'),'old publication replay harmless';
 assert not has_table_privilege(current_user,'public.experiences','update'),'direct mutation denied';
 assert not has_table_privilege(current_user,'private.experience_commands','select'),'history private';
end $$;
select set_config('request.headers','{}',true);
do $$ begin
 assert not exists(select 1 from public.experiences where id=current_setting('test.experience')::uuid),'withdrawn experience stays hidden';
end $$;
reset role;
do $$ begin
 assert (select count(*) from private.experience_commands where experience_id=current_setting('test.experience')::uuid)=3,'exactly three recorded transitions';
end $$;
delete from private.destination_editors where user_id=current_setting('test.user2')::uuid;
set local role anon;
select set_config('request.headers',jsonb_build_object('x-citypassport-session',repeat('2',64))::text,true);
do $$ begin
 assert public.experience_command('publish',current_setting('test.publish')::jsonb)->>'error'='forbidden','revoked editor cannot replay publication';
 assert not exists(select 1 from public.experiences where id=current_setting('test.experience')::uuid),'revoked editor cannot read private catalog';
end $$;
rollback;
select 'Destination experiences hosted rollback checks passed' as verification;
