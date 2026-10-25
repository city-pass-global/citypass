-- Independent of treasury provisioning: owner-only activation and purchase recovery.
create function private.destination_pass_account() returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.current_actor();
begin
 if uid is null then return jsonb_build_object('error','unauthorized'); end if;
 return jsonb_build_object(
  'active',exists(select 1 from public.traveler_profiles where user_id=uid),
  'holdings',coalesce((select jsonb_agg(to_jsonb(h)) from public.destination_pass_holdings h where h.user_id=uid),'[]'::jsonb),
  'reputation',coalesce((select sum(points) from public.reputation_events where user_id=uid),0),
  'purchases',coalesce((select jsonb_agg(to_jsonb(q) order by q.created_at desc,q.request_id) from (
   select c.id request_id,p.destination_id,c.product,c.amount,c.network,c.created_at,
    case when c.status in ('created','prepared') and c.expires_at<=now() then 'expired' else c.status end status,
    c.transaction_hash,receipt.ledger
   from private.destination_pass_orders p
   join public.checkout_requests c on c.id=p.request_id
   left join public.payment_receipts receipt on receipt.request_id=c.id
   where p.user_id=uid and c.payer_user_id=uid
   order by c.created_at desc,c.id limit 20
  ) q),'[]'::jsonb)
 );
end $$;
revoke all on function private.destination_pass_account() from public,anon,authenticated;
grant execute on function private.destination_pass_account() to anon,authenticated;

-- Keep all existing purchase/catalog behavior; project account data through its own authorized helper.
create or replace function public.destination_pass_command(action text,payload jsonb) returns jsonb
language sql security invoker set search_path='' as $$
 select case when action='account' then private.destination_pass_account()
 else private.destination_pass_command(action,payload) end;
$$;
revoke all on function public.destination_pass_command(text,jsonb) from public;
grant execute on function public.destination_pass_command(text,jsonb) to anon,authenticated;
