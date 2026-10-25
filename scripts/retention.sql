-- MANUAL OPERATOR TEMPLATE. Not scheduled or invoked by the app.
-- First approve the retention policy with the hotel and legal reviewer.
-- Run as a trusted operator after backup/recovery and scope review.
-- Removes expired minimal guest data and reservation contact data.
begin;
create temporary table expired_reservations on commit drop as
 select id, organization_id from public.hotel_reservations
 where departure < current_date - 30;
insert into private.audit_events(organization_id,action,entity_id)
 select organization_id,'retention_delete',id from expired_reservations;
delete from public.precheckin_submissions where reservation_id in (select id from expired_reservations);
delete from private.precheckin_invitations where reservation_id in (select id from expired_reservations);
delete from public.hotel_reservations where id in (select id from expired_reservations);
delete from private.rate_limits where window_start < now() - interval '1 day';
commit;
