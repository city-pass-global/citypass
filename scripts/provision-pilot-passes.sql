-- Owner approved testnet pilot passes without venue perks and confirmed the CityPass wallet on 2026-10-17.
-- Applied once to Iguapass development; repeat runs intentionally refuse an existing catalog.
-- Selected development project: Iguapass (wafunogjrczlwvdnvyfs). Never run against another project.
-- Requires citypass_destination_treasury. No memberships or third-party affiliations are created here.
begin;
do $$ begin
 assert to_regclass('private.citypass_treasuries') is not null,'CityPass treasury migration must be approved and applied first';
 assert (select count(*) from public.destinations)=8,'Review destination scope again';
 assert (select count(*) from private.citypass_treasuries t join public.destinations d on d.id=t.destination_id
  where d.slug in ('puerto-iguazu','buenos-aires','rio-de-janeiro','sao-paulo','lisbon','porto','san-jose','la-fortuna')
   and t.network='testnet' and t.address='GC6RIEORZ5UF7L2KKXCZLSGMSIYY5NG6FXCKR3J5P7ZYIXSMXLX2QJKU')=8,'Review configured recipient and destination scope';
 assert not exists(select 1 from public.destination_pass_offers),'Do not overwrite an existing catalog; reconcile it explicitly';
end $$;
with offers as (
 insert into public.destination_pass_offers(destination_id,organization_id,names,benefits,published)
 select destination_id,organization_id,'{"en": "CityPass destination pass", "es": "Pase de destino CityPass", "pt": "Passe de destino CityPass"}'::jsonb,'{"en": "Your destination pass, linked to your passport. A confirmed purchase adds 80 reputation points. Venue admission, priority entry, discounts and redeemable rewards are not included.", "es": "Tu pase de destino, vinculado a tu pasaporte. Una compra confirmada suma 80 puntos de reputación. No incluye entradas, acceso prioritario, descuentos ni recompensas canjeables.", "pt": "Seu passe de destino, vinculado ao seu passaporte. Uma compra confirmada adiciona 80 pontos de reputação. Não inclui ingressos, entrada prioritária, descontos ou recompensas resgatáveis."}'::jsonb,true
 from private.citypass_treasuries
 returning id,organization_id
)
insert into private.audit_events(organization_id,action,entity_id)
 select organization_id,'pilot_pass_published',id from offers;
commit;
