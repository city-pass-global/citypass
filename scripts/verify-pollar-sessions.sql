-- Selected development project. Synthetic identities/capabilities all roll back.
begin;
do $$ declare p text; mac text; result jsonb; begin
 p:=jsonb_build_object('application','rollback-test-app','subject','rollback-test-pollar-user','network','testnet','issued',floor(extract(epoch from now()))::bigint,'expires',floor(extract(epoch from now()))::bigint+300,'token_hash',encode(sha256(convert_to(repeat('7',64),'UTF8')),'hex'))::text;
 mac:=private.bridge_hmac((select key_hex from private.pollar_bridge_config where singleton),p);
 assert public.create_pollar_session(p,repeat('0',64))->>'error'='unauthorized','forged login denied';
 result:=public.create_pollar_session(p,mac);
 assert result->>'id' is not null,'verified login opens app session';
 assert public.create_pollar_session(p,mac)->>'error'='session_replay','assertion replay denied';
 perform set_config('test.pollar_user',result->>'id',true);
end $$;
set local role anon;
select set_config('request.headers','{}',true);
select set_config('request.jwt.claim.sub',current_setting('test.pollar_user'),true);
do $$ begin
 assert (select count(*) from public.user_profiles)=0,'JWT sub alone grants no access';
end $$;
select set_config('request.headers',jsonb_build_object('x-citypassport-session',repeat('7',64))::text,true);
do $$ begin
 assert (select count(*) from public.user_profiles)=1,'valid session reads own profile';
 assert (select count(*) from public.traveler_profiles)=1,'login creates global passport';
 assert (select count(*) from public.hotel_reservations)=0,'tourist cannot read hotel data';
 assert not has_table_privilege(current_user,'public.user_profiles','update'),'identity writes denied';
 assert not has_table_privilege(current_user,'private.app_sessions','select'),'session table hidden';
 perform public.end_app_session();
 assert (select count(*) from public.user_profiles)=0,'revoked session loses access';
end $$;
rollback;
select 'Pollar session rollback checks passed' as verification;
