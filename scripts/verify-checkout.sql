-- Selected development project only. All synthetic fixtures roll back.
begin;
do $$ declare p text; result jsonb; i int; begin
 for i in 1..2 loop
 p:=jsonb_build_object('application','checkout-rollback','subject','checkout-rollback-'||i,'network','testnet','wallet',case i when 1 then 'G'||repeat('A',55) else 'G'||repeat('B',55) end,'issued',floor(extract(epoch from now()))::bigint,'expires',floor(extract(epoch from now()))::bigint+300,'token_hash',encode(sha256(convert_to(repeat(i::text,64),'UTF8')),'hex'))::text;
 result:=public.create_pollar_session(p,private.bridge_hmac((select key_hex from private.pollar_bridge_config where singleton),p));
 assert result->>'id' is not null,'fixture session';
 perform set_config('test.user'||i,result->>'id',true);
 end loop;
end $$;
set local role anon;
select set_config('request.headers',jsonb_build_object('x-citypassport-session',repeat('1',64))::text,true);
do $$ declare r jsonb; begin
 r:=public.checkout_command('onboard',jsonb_build_object('name','Rollback verification only','destination_id',(select id from public.destinations limit 1)));
 assert r->>'id' is not null,'owner onboarding';
 perform set_config('test.org',r->>'id',true);
 assert public.checkout_command('payout',jsonb_build_object('organization_id',r->>'id'))->>'error'='forbidden','pending approval blocks payout';
end $$;
reset role;
update public.organizations set status='approved' where id=current_setting('test.org')::uuid;
set local role anon;
do $$ declare r jsonb; args jsonb; begin
 r:=public.checkout_command('payout',jsonb_build_object('organization_id',current_setting('test.org')));
 assert r->>'id' is not null,'verified owner wallet payout';
 args:=jsonb_build_object('organization_id',current_setting('test.org'),'product','Rollback verification only','amount','1','idempotency_key',gen_random_uuid());
 r:=public.checkout_command('create',args);
 assert r->>'id' is not null,'approved merchant creates checkout';
 assert public.checkout_command('create',args)->>'id'=r->>'id','idempotent creation';
 assert public.checkout_command('create',args||jsonb_build_object('amount','2'))->>'error'='idempotency_conflict','changed retry denied';
 perform set_config('test.checkout',r->>'id',true);
 assert public.checkout_command('prepare',jsonb_build_object('request_id',r->>'id'))->>'error'='self_payment','self payment denied';
end $$;
select set_config('request.headers',jsonb_build_object('x-citypassport-session',repeat('2',64))::text,true);
do $$ declare r jsonb; begin
 assert (select count(*) from public.checkout_requests)=0,'other tenant direct read denied';
 r:=public.checkout_command('prepare',jsonb_build_object('request_id',current_setting('test.checkout')));
 assert r->'checkout'->>'status'='prepared','payer binds through opaque checkout';
 assert (select count(*) from public.checkout_requests)=1,'payer reads own bound checkout';
 assert public.record_checkout_evidence('{}',repeat('0',64))->>'error'='payment_proof','forged settlement denied';
 assert not has_table_privilege(current_user,'public.payment_receipts','insert'),'receipt direct write denied';
 assert not has_table_privilege(current_user,'private.checkout_attempts','select'),'signed envelopes private';
end $$;
select set_config('request.headers','{}',true);
do $$ begin
 assert (select count(*) from public.checkout_requests)=0,'anonymous checkout denied';
 assert (select count(*) from public.payment_receipts)=0,'anonymous receipts denied';
end $$;
rollback;
select 'Merchant checkout hosted rollback checks passed' as verification;
