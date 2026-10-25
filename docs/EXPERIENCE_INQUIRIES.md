> Retired from the application UI on 2026-10-17 at user request. This document preserves the historical database design. Inquiry pages now return 404; forms, actions and entry points have been removed. Private stored records and database authorization remain intact.

# Private experience inquiries

Published experiences link to `/[locale]/inquiries/new?experience=<id>`. A Pollar-signed-in traveler chooses a preferred local date, party size and question, then explicitly consents to share it with the authorized destination team. `/[locale]/inquiries` shows the traveler's requests across all destinations, independent of the browsing preference. `/[locale]/inquiries/[id]` shows the original experience title, request, response and status. `/[locale]/operator/inquiries` is the separate destination inbox.

This is an information request, not a booking, availability guarantee, ticket, payment or confirmed reservation. Responses are saved inside CityPassport; no email, push notification or message connector is invoked. The first version permits one response, traveler cancellation and agent closure; it is not a conversation thread. Cancellation or closure does not change any external provider booking.

## Privacy and permission

All inquiry tables are in the private schema with RLS/default-deny and no client table grants. `private.destination_inquiry_agents` holds explicit user/destination assignments, separate from catalog editors and merchant reviewers. An agent can handle only assigned destinations and cannot answer their own inquiry. Agents receive no hotel guest data, profile emails or payment access. Projections omit the traveler profile ID; no email, phone or identity document is required. User-entered text is rendered as plain text, never HTML. The form asks users not to include sensitive personal information.

Initial agent assignments require trusted administration to verify the existing Pollar application identity and exact destination. No grants are seeded and no browser self-promotion endpoint exists. Record authorized assignment/revocation in administrative change history and private audit records; never infer authority from matching email or catalog/business membership. Revoking an assignment denies subsequent reads, responses and accepted-command retries immediately. Users retain access to their own inquiries.

## Persistence and transitions

The invoker RPC `inquiry_command` delegates to a private function that derives the actor from the live application session. Requests can be created only for currently published experiences; an experience share lock serializes acceptance with withdrawal. Destination and multilingual title snapshots are copied from the experience, never caller-supplied fields. Withdrawal does not erase prior request history.

PostgreSQL repeats consent, text lengths, party bounds (1–20), date range (today through 365 days using the destination time zone) and permission checks. A user can create up to ten requests in a rolling 24-hour period, including subsequently cancelled or closed requests. Actor locks protect the limit and actor-scoped idempotency keys. Unknown/draft/withdrawn experiences reject new requests; accepted retries remain idempotent without using more quota.

Allowed states: `open` → `replied` → `closed`; the owner can cancel `open` or `replied` into `cancelled`. No state means confirmed reservation. Row locks and expected versions reject stale responses or transitions. A response cannot be overwritten, a cancelled/closed inquiry cannot be reopened, and replaying an old response cannot undo cancellation. Every accepted mutation inserts one immutable private command record and one audit event. Command history stores a canonical payload hash instead of another copy of request/response text.

## Verified and pending

Local database tests cover privacy/role separation, denied direct reads/writes, derived identity/destination, input/consent/date limits, quota, idempotency, stale versions, unsupported transitions, self-response denial, immutable history and immediate revocation. `scripts/verify-inquiries.sql` exercises hosted creation, sharing, response, cancellation, replay and revocation in a transaction that rolls back all synthetic records. No real agent was assigned, experience published or inquiry/response sent during implementation.

A real traveler/assigned-agent browser workflow with verified content remains a pilot gate, as do independent-connection races and data retention/deletion procedures. Cancellation is not deletion. There is no unattended inbox polling, notification delivery, response-time promise, external availability integration or booking/payment linkage. No deployment performed.

## Authorized demonstration extension — 2026-10-16

The subsequent user-authorized demo adds a separately labeled Lisbon example and immutable demo classification on related inquiries. Earlier statements about zero records describe verification before that seed. No real partner, staff assignment or confirmed reservation is implied. See [DEMO_DATA.md](DEMO_DATA.md).
