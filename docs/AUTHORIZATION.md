# Authorization

| Resource / operation            | Public                               | Tourist                    | Hotel staff                            | Other organization            |
| ------------------------------- | ------------------------------------ | -------------------------- | -------------------------------------- | ----------------------------- |
| Published destination content   | Read                                 | Read                       | Read                                   | Read                          |
| Passport, stamp history, points | No                                   | Own only                   | Own tourist identity only              | No                            |
| Hotel reservation/submission    | No                                   | No                         | Assigned organization and allowed role | No                            |
| Hotel onboarding                | No                                   | Create owned pending hotel | Create owned pending hotel             | No access to existing tenants |
| Guest submission                | Valid capability + reservation email | Same capability            | Same capability                        | No privileged bypass          |
| QR generation                   | No                                   | No                         | Approved venue owner/manager           | No                            |
| Stamp claim                     | No                                   | Own active passport        | Own active passport                    | No cross-user claims          |

Membership is a database row. Do not authorize with raw_user_meta_data, a supplied user_id, local storage, UI state or a hidden field. Every RPC validates the target organization from the actual resource. RLS prevents direct reads across tenants. No application service-role client exists.

Pollar Google login is verified by the backend and exchanged for a short-lived database-backed application capability. The proxy sets internal routing headers and private/no-store responses; it does not refresh Supabase Auth credentials. The legacy OAuth callback only redirects to profile access. Server actions provide Next.js origin checks; RPC authorization remains mandatory because clients can call PostgREST directly. See [Pollar session protocol](POLLAR_INTEGRATION.md).

The public RPC is a security-invoker wrapper. Its private definer implementation deliberately bypasses RLS only after operation-specific checks. Both function grants are explicit; private schema is NOT an exposed API schema. Anonymous access is limited in the dispatcher to guest submission. Membership assignment has no self-service mutation API. Destination merchant review has its own explicitly authorized command; it cannot assign hotel membership.

Before pilot: add staff invitation/revocation UX, administrator role table and admin audit viewer; verify provider/session expiry and revocation behavior, staff authentication policy, project advisors and every policy using distinct real sessions. Suspension policy and emergency staff access must be agreed with operators.

## Current Pollar-only session authorization

Pollar server-verified identities map to `user_profiles` by application ID plus provider user ID. Owner/member checks now derive the internal UUID from `private.current_actor()`, which validates the HttpOnly application capability's stored hash, expiry and revocation. Supabase JWT `sub` and user-editable metadata cannot substitute for this session. Organization roles remain stored in `organization_members`; creating a profile/session never adds a membership.

Data API roles have SELECT grants where required, but personal/hotel rows require the owner or authorized membership under RLS. A request with no valid app session receives no private rows. No client has direct profile, session, membership, stamp, invitation or ledger writes. Anonymous guest pre-check-in remains the existing invitation capability exception. Session/profile provisioning requires a MAC over a short-lived server-verified assertion, validated inside the private transaction; replay is rejected. See POLLAR_INTEGRATION.md.

## Merchant payments

Database organization membership authorizes onboarding, payout and checkout RPCs. Pending organizations cannot accept payments; owner payouts come from verified Pollar identity. Payer binding and request locks prevent takeover. Client roles have no direct payment mutations or private envelope table access; an authorized recovery RPC can return the stored attempt to the bound payer or permitted merchant. `record_checkout_evidence` requires server HMAC over a separate payment domain and repeats exact request invariants before accepting audited transitions. Receipts are immutable and tenant-scoped. See MERCHANT_PAYMENTS.md for remaining pilot gates.

## Destination merchant reviewers

Reviewer access is derived from private database assignments and live application sessions. Queue reads are narrow projections, not new organization or hotel RLS grants. Decisions lock assignments, forbid self-review for any organization member and reject stale or changed command replays. Revocation takes effect on the next operation. Initial assignments require trusted administration. See [review provisioning](MERCHANT_REVIEW.md).

## Catalog editors

Catalog permissions require explicit private destination editor assignments. Neither merchant review nor business membership confers this permission. Public experience rows expose no actor/profile data. Private command history and assignments have RLS/default-deny and no direct client grants. Actor/experience/assignment locks, destination derivation from existing records, revisions and command idempotency protect publication and withdrawal. Revoked editors lose private reads and mutations immediately; public content remains published until explicitly withdrawn. See [catalog authorization](DESTINATION_EXPERIENCES.md).

## Destination selection is not authority

The destination cookie controls navigation and adds UI read filters only. Server selection verifies a known registry slug; malformed/unknown values fall back without identity or membership changes. Hotel reservations/submissions are filtered through the selected organizations and remain under RLS. Operator/reviewer scopes, claim destinations and frozen checkout snapshots retain their independent database authorization. No grants or schema changed.

## Retained inquiry authorization (UI retired)

Application inquiry pages return 404. The following describes retained database/RPC permissions, not an available application screen.

The traveler owns request history across destinations; a separately assigned agent may read/respond only in their assigned cities. Catalog editing, merchant review and business membership grant no inquiry access. Agents cannot answer their own requests. All table access is private; narrow commands require live app sessions, consent, row versions and appropriate owner/agent authority. Revocation takes effect for reads and replays. No hotel or payment permission is added. See [inquiry authorization](EXPERIENCE_INQUIRIES.md).

## Demo records

The user authorized a development demo seed, not privilege assignment. Demo records retain ordinary catalog/inquiry authorization. Demo markers cannot be changed, provider links are denied and caller-supplied classification is ignored. No identity, organization membership, reviewer, editor or inquiry-agent assignment is seeded.

## Pass ownership and reputation

Published pass offers are public only for an approved merchant organization. Account history, holdings, and reputation are owner-only; private orders and treasury configuration have no direct client table access. Purchases derive the actor and freeze authoritative offer/recipient values. The current CityPass treasury is distinct from a merchant-owner payout: its owner-authorized registry is validated by the database, and callers cannot substitute recipients. Receipt-triggered fulfillment atomically grants one holding and one fixed 80-point event. Submitted transactions, replayed proof, and duplicate destination ownership cannot award points. See [passes](DESTINATION_PASSES.md) and [settlement](STELLAR_INTEGRATION.md).
