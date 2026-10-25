-- Add destination metadata without replacing existing passports or hotel data.
create table public.countries (
 code text primary key check (code ~ '^[A-Z]{2}$'),
 names jsonb not null check (
  jsonb_typeof(names)='object' and
  jsonb_typeof(names->'es')='string' and length(names->>'es')>0 and
  jsonb_typeof(names->'en')='string' and length(names->>'en')>0 and
  jsonb_typeof(names->'pt')='string' and length(names->>'pt')>0
 ),
 currency_code text not null check (currency_code ~ '^[A-Z]{3}$')
);
alter table public.countries enable row level security;
revoke all on public.countries from public, anon, authenticated;
grant select on public.countries to anon, authenticated;
create policy public_countries on public.countries for select to anon,authenticated using(true);
insert into public.countries(code,names,currency_code) values
 ('AR','{"es":"Argentina","en":"Argentina","pt":"Argentina"}','ARS'),
 ('BR','{"es":"Brasil","en":"Brazil","pt":"Brasil"}','BRL'),
 ('CR','{"es":"Costa Rica","en":"Costa Rica","pt":"Costa Rica"}','CRC'),
 ('PT','{"es":"Portugal","en":"Portugal","pt":"Portugal"}','EUR');

alter table public.destinations add column names jsonb;
update public.destinations set names=jsonb_build_object('es',name,'en',name,'pt',name);
alter table public.destinations alter column names set not null;
alter table public.destinations add constraint destinations_names_check check (
 jsonb_typeof(names)='object' and
 jsonb_typeof(names->'es')='string' and length(names->>'es')>0 and
 jsonb_typeof(names->'en')='string' and length(names->>'en')>0 and
 jsonb_typeof(names->'pt')='string' and length(names->>'pt')>0
);
-- CHECK predicates must reject missing keys as well as incorrect JSON types.
alter table public.countries add constraint countries_languages_check check(names ?& array['es','en','pt']);
alter table public.destinations add constraint destinations_languages_check check(names ?& array['es','en','pt']);
alter table public.destinations add constraint destinations_country_fkey foreign key(country_code) references public.countries(code);
create index destinations_country_idx on public.destinations(country_code);
alter table public.destinations add constraint destinations_slug_check check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
-- Validate IANA identifiers against PostgreSQL's installed time-zone database.
create function private.validate_destination_timezone() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from pg_catalog.pg_timezone_names where name=new.timezone and name like '%/%') then
  raise exception 'Invalid destination timezone' using errcode='23514';
 end if;
 return new;
end $$;
revoke all on function private.validate_destination_timezone() from public,anon,authenticated;
create trigger destination_timezone before insert or update of timezone on public.destinations
 for each row execute function private.validate_destination_timezone();

-- Preserve the original Iguazú ID on existing databases; generate IDs for new rows.
insert into public.destinations(slug,name,names,timezone,country_code) values
 ('san-jose','San José','{"es":"San José","en":"San José","pt":"San José"}','America/Costa_Rica','CR'),
 ('la-fortuna','La Fortuna','{"es":"La Fortuna, San Carlos","en":"La Fortuna, San Carlos","pt":"La Fortuna, San Carlos"}','America/Costa_Rica','CR'),
 ('buenos-aires','Buenos Aires','{"es":"Buenos Aires","en":"Buenos Aires","pt":"Buenos Aires"}','America/Argentina/Buenos_Aires','AR'),
 ('rio-de-janeiro','Rio de Janeiro','{"es":"Río de Janeiro","en":"Rio de Janeiro","pt":"Rio de Janeiro"}','America/Sao_Paulo','BR'),
 ('sao-paulo','São Paulo','{"es":"São Paulo","en":"São Paulo","pt":"São Paulo"}','America/Sao_Paulo','BR'),
 ('lisbon','Lisboa','{"es":"Lisboa","en":"Lisbon","pt":"Lisboa"}','Europe/Lisbon','PT'),
 ('porto','Porto','{"es":"Oporto","en":"Porto","pt":"Porto"}','Europe/Lisbon','PT');
-- Iguazú already exists remotely. Local seed retains its stable ID.
update public.destinations set names='{"es":"Puerto Iguazú","en":"Puerto Iguazú","pt":"Puerto Iguazú"}' where slug='puerto-iguazu';
