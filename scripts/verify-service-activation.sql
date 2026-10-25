-- Selected Iguapass development project only. All synthetic identities and quotes roll back.
-- No ledger transaction is signed, submitted or marked confirmed by this test.
begin;
do $$
declare uid uuid; raw text; i integer;
begin
 for i in 1..2 loop
  uid:=gen_random_uuid(); raw:=encode(sha256(convert_to(gen_random_uuid()::text,'UTF8')),'hex');
  insert into public.user_profiles(id,wallet_address,network,pollar_application,pollar_subject)
  values(uid,'G'||upper(translate(substr(encode(sha256(convert_to(uid::text,'UTF8')),'hex'),1,55),'0189','ABCD')),'testnet','service-rollback-fixture',uid::text);
  insert into private.app_sessions(token_hash,user_id,expires_at) values(encode(sha256(convert_to(raw,'UTF8')),'hex'),uid,now()+interval '5 minutes');
  perform set_config('test.service_token_'||i,raw,true);
 end loop;
end $$;
set local role anon;
do $$
declare service public.merchant_services%rowtype; quote public.checkout_requests%rowtype; r jsonb;
begin
 perform set_config('request.headers','{}',true);
 select * into service from public.merchant_services where seller_source='citypass' and published order by id limit 1;
 assert service.id is not null,'published platform catalog is public';
 assert service.amount::numeric between 25 and 150,'selected price range';
 assert public.merchant_service_command('buy',jsonb_build_object('service_id',service.id))->>'error'='unauthorized','anonymous purchase denied';
 assert not has_table_privilege(current_user,'public.merchant_services','insert'),'direct service insertion denied';
 assert not has_table_privilege(current_user,'public.merchant_services','update'),'direct service repricing denied';
 assert not has_table_privilege(current_user,'public.merchant_service_acquisitions','insert'),'direct acquisitions denied';
 perform set_config('request.headers',jsonb_build_object('x-citypassport-session',current_setting('test.service_token_1'))::text,true);
 r:=public.merchant_service_command('buy',jsonb_build_object('service_id',service.id,'amount','1','payout_address','attacker','reputation_points',99999));
 assert r->>'id' is not null,'authenticated buyer can open checkout';
 perform set_config('test.service_quote',r->>'id',true);
 select * into quote from public.checkout_requests where id=(r->>'id')::uuid;
 assert quote.amount=service.amount and quote.merchant_service_id=service.id,'canonical service amount and identity frozen';
 assert quote.payout_source='citypass' and quote.payout_address='GC6RIEORZ5UF7L2KKXCZLSGMSIYY5NG6FXCKR3J5P7ZYIXSMXLX2QJKU' and quote.merchant_name='CityPass','selected platform seller and recipient frozen';
 assert public.merchant_service_command('buy',jsonb_build_object('service_id',service.id))->>'id'=r->>'id','retry resumes existing quote';
 assert not exists(select 1 from public.merchant_service_acquisitions),'unpaid quote awards nothing';
 assert public.record_checkout_evidence(jsonb_build_object('kind','confirmed','request_id',quote.id)::text,repeat('0',64))->>'error'='payment_proof','client cannot forge settlement';
 perform set_config('request.headers',jsonb_build_object('x-citypassport-session',current_setting('test.service_token_2'))::text,true);
 assert not exists(select 1 from public.checkout_requests where id=quote.id),'other traveler cannot read payer quote';
 assert public.checkout_command('resolve',jsonb_build_object('request_id',quote.id))->>'error'='forbidden','other traveler cannot resolve payer quote';
end $$;
reset role;
do $$ begin
 assert not exists(select 1 from public.payment_receipts where request_id=current_setting('test.service_quote')::uuid),'no receipt fabricated';
 assert not exists(select 1 from public.merchant_service_acquisitions where request_id=current_setting('test.service_quote')::uuid),'no acquisition fabricated';
 assert (select relrowsecurity from pg_class where oid='public.merchant_services'::regclass),'catalog RLS enabled';
 assert (select relrowsecurity from pg_class where oid='public.merchant_service_acquisitions'::regclass),'acquisition RLS enabled';
end $$;
rollback;
select 'hosted service publication, canonical checkout, denied access and quote replay passed; fixtures rolled back' as verification;
