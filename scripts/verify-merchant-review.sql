-- Selected development project only. All synthetic fixtures roll back.
begin;
do $$ declare p text; result jsonb; i int; begin
 for i in 1..2 loop
 p:=jsonb_build_object('application','review-rollback','subject','review-rollback-'||i,'network','testnet','wallet',case i when 1 then 'G'||repeat('A',55) else 'G'||repeat('B',55) end,'issued',floor(extract(epoch from now()))::bigint,'expires',floor(extract(epoch from now()))::bigint+300,'token_hash',encode(sha256(convert_to(repeat(i::text,64),'UTF8')),'hex'))::text;
 result:=public.create_pollar_session(p,private.bridge_hmac((select key_hex from private.pollar_bridge_config where singleton),p));
 assert result->>'id' is not null,'fixture session';
 perform set_config('test.user'||i,result->>'id',true);
 end loop;
end $$;
set local role anon;
select set_config('request.headers',jsonb_build_object('x-citypassport-session',repeat('1',64))::text,true);
do $$ declare r jsonb; begin
 r:=public.checkout_command('onboard',jsonb_build_object('name','Review rollback only','destination_id',(select id from public.destinations limit 1)));
 assert r->>'id' is not null,'merchant fixture created';
 perform set_config('test.org',r->>'id',true);
end $$;
select set_config('request.headers',jsonb_build_object('x-citypassport-session',repeat('2',64))::text,true);
do $$ begin
 assert public.merchant_review_command('context','{}')->'destinations'='[]'::jsonb,'no default reviewer privileges';
 assert public.merchant_review_command('decide',jsonb_build_object('organization_id',current_setting('test.org')))->>'error'='forbidden','unassigned reviewer denied';
 assert not has_table_privilege(current_user,'private.destination_reviewers','insert'),'no self promotion';
end $$;
reset role;
insert into private.destination_reviewers(user_id,destination_id) select current_setting('test.user2')::uuid,destination_id from public.organizations where id=current_setting('test.org')::uuid;
select set_config('test.dest',(select destination_id::text from public.organizations where id=current_setting('test.org')::uuid),true);
set local role anon;
do $$ declare r jsonb; p jsonb; begin
 r:=public.merchant_review_command('queue',jsonb_build_object('destination_id',current_setting('test.dest'),'status','pending'));
 assert (r->>'total')::integer>=1,'assigned merchant queue';
 assert (select count(*) from public.hotel_reservations)=0,'reviewer has no hotel access';
 p:=jsonb_build_object('organization_id',current_setting('test.org'),'command_id',gen_random_uuid(),'expected_version',0,'decision','approved','reason','Rollback verification only; no real approval');
 assert public.merchant_review_command('decide',p)->>'success'='true','approve within scope';
 assert public.merchant_review_command('decide',p)->>'success'='true','idempotent replay';
 assert public.merchant_review_command('decide',p||jsonb_build_object('reason','Changed verification reason'))->>'error'='idempotency_conflict','changed retry denied';
 assert public.merchant_review_command('decide',p||jsonb_build_object('command_id',gen_random_uuid(),'decision','suspended'))->>'error'='stale','stale decision denied';
 assert public.merchant_review_command('decide',p||jsonb_build_object('command_id',gen_random_uuid(),'expected_version',1,'decision','suspended'))->>'success'='true','suspension accepted';
 assert not has_table_privilege(current_user,'private.merchant_reviews','update'),'immutable internal history';
end $$;
reset role;
do $$ begin
 assert (select count(*) from private.merchant_reviews where organization_id=current_setting('test.org')::uuid)=2,'exactly two accepted decisions';
 assert (select approval_version from public.organizations where id=current_setting('test.org')::uuid)=2,'monotonic version';
end $$;
delete from private.destination_reviewers where user_id=current_setting('test.user2')::uuid;
set local role anon;
do $$ begin
 assert public.merchant_review_command('queue',jsonb_build_object('destination_id',current_setting('test.dest'),'status','suspended'))->>'error'='forbidden','revocation effective immediately';
end $$;
rollback;
select 'Merchant review hosted rollback checks passed' as verification;
