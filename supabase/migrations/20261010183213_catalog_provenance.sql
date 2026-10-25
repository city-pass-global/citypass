-- Public, sourced directory metadata; never a partner approval.
alter table public.venues
 add column catalog_key text,
 add column checked_at date,
 add column address text,
 add column phone text,
 add column email text;
create unique index venues_destination_catalog_key_idx on public.venues(destination_id,catalog_key) where catalog_key is not null;
