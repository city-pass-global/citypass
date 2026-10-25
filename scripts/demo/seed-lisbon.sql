-- Explicitly authorized demo data. Run only on selected Iguapass development project.
-- Idempotent: never replaces existing content, republishes withdrawn content or grants roles.
begin;
do $$ begin
 assert exists(select 1 from public.destinations where slug='lisbon'),'Registered Lisbon destination required';
end $$;
with added as (
 insert into public.experiences(destination_id,titles,descriptions,is_demo,demo_key,status)
 select id,
  jsonb_build_object('es','DEMO: consulta de experiencia en Lisboa','en','DEMO: Lisbon experience inquiry','pt','DEMO: consulta de experiência em Lisboa'),
  jsonb_build_object('es','Registro de demostración para probar el catálogo y las consultas privadas. No representa un prestador, una actividad disponible, un socio ni una reserva. Usá solo información ficticia.','en','Demonstration record for testing the catalog and private inquiries. It does not represent a provider, an available activity, a partner or a booking. Use fictional information only.','pt','Registro de demonstração para testar o catálogo e as consultas privadas. Não representa um prestador, uma atividade disponível, um parceiro ou uma reserva. Use apenas informações fictícias.'),
  true,'lisbon-inquiry-preview-v1','published'
 from public.destinations where slug='lisbon'
 on conflict(demo_key) do nothing returning id
)
insert into private.audit_events(action,entity_id) select 'demo_experience_seeded',id from added;
commit;
select id,demo_key,is_demo,status,booking_url is null as no_provider_link from public.experiences where demo_key='lisbon-inquiry-preview-v1';
