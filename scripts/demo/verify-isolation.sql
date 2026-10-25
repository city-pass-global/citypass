-- Selected development project only. Synthetic guard checks roll back.
begin;
insert into public.experiences(destination_id,titles,descriptions,is_demo,demo_key)
select id,jsonb_build_object('es','Prueba temporal','en','Temporary test','pt','Teste temporário'),jsonb_build_object('es','Prueba temporal sin oferta ni reserva real.','en','Temporary test without any real offer or booking.','pt','Teste temporário sem oferta ou reserva real.'),true,'rollback-demo-safety' from public.destinations where slug='lisbon';
do $$ declare denied boolean; begin
 denied:=false;
 begin update public.experiences set is_demo=false,demo_key=null where demo_key='rollback-demo-safety';exception when check_violation then denied:=true;end;
 assert denied,'demo classification cannot become real';
 denied:=false;
 begin update public.experiences set booking_url='https://example.com/' where demo_key='rollback-demo-safety';exception when check_violation then denied:=true;end;
 assert denied,'demo provider link denied';
 denied:=false;
 begin update public.experiences set demo_key='renamed-demo' where demo_key='rollback-demo-safety';exception when check_violation then denied:=true;end;
 assert denied,'demo key immutable';
end $$;
rollback;
select 'Hosted demo isolation checks passed' as verification;
