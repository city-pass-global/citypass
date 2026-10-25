-- Cover relationship lookups identified by the hosted project advisor.
create index qr_credentials_stamp_idx on private.qr_credentials(stamp_id);
create index organizations_destination_idx on public.organizations(destination_id);
create index passports_destination_idx on public.passport_profiles(destination_id);
create index ledger_passport_idx on public.points_ledger(passport_id);
create index submissions_reservation_org_idx on public.precheckin_submissions(reservation_id,organization_id);
create index route_stops_route_destination_idx on public.route_stops(route_id,destination_id);
create index route_stops_venue_destination_idx on public.route_stops(venue_id,destination_id);
create index routes_destination_idx on public.routes(destination_id);
create index claims_credential_idx on public.stamp_claims(credential_id);
create index claims_passport_destination_idx on public.stamp_claims(passport_id,destination_id);
create index claims_stamp_destination_idx on public.stamp_claims(stamp_id,destination_id);
create index stamps_venue_destination_idx on public.stamp_definitions(venue_id,destination_id);
create index venues_organization_idx on public.venues(organization_id);
