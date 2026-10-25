# Destination experience publishing

The destination operator portal is `/[locale]/operator`, with editing at `/[locale]/operator/[id]`. Editors create multilingual drafts, explicitly publish them, withdraw live experiences and edit withdrawn records back into drafts. Public destination pages show published experience links; `/[locale]/experiences/[id]` renders published content and an optional external provider link. There is no internal booking or reservation confirmation in this slice.

## Content and public behavior

Each record requires Spanish, English and Portuguese names (2–120 characters) and descriptions (20–3000 characters). React renders plain text, not authored HTML. The optional external URL must be HTTPS, use a domain hostname, contain no credentials, nonstandard port or fragment and fit the database constraint. The application never fetches that URL. Operators must verify factual content and must not invent prices, partnerships or availability; publication does not certify a booking, business license or partnership.

No experiences were seeded or published during implementation. The existing 15 sourced discovery references remain separate. Public destination queries explicitly request `published` status and the correct destination, even when the current user can read private drafts. Unknown, withdrawn and draft public detail URLs do not expose content. Public destination pages currently show up to the 50 most recently created published experiences; operator queues have 25-row pagination.

## Authority and transactional commands

Catalog editing is an explicit `(user_id,destination_id)` assignment in `private.destination_editors`. It is separate from merchant review assignments, business ownership and hotel staff membership. No client has assignment writes; no migration assigns a real user. A trusted administrator must verify the intended existing Pollar application identity and exact destinations before provisioning access. An email match alone is never authority. Record grant/revocation through authorized administration and private audit records; there is no self-promotion endpoint.

`public.experience_command` is an invoker wrapper around a private, authorized transactional dispatcher. It derives the actor from a live Pollar application session, takes consistent actor/experience locks and locks the current destination assignment. Destination is immutable on existing records. Content checks are repeated in PostgreSQL constraints and the command. Row versions reject stale saves and transitions. Actor-scoped command IDs and immutable private payload records reject changed retries and make identical retries harmless.

Draft creation, save, publication and withdrawal each produce one private command record and audit event. Replaying an old publication after withdrawal returns the original command result without republishing the record. Editing published content is denied until withdrawal. Withdrawn content must be saved as a draft before publication again. Assignment deletion denies subsequent commands, including accepted-command retries, and hides private content immediately. It does not unpublish public content automatically; withdrawal is a separate editorial action.

`public.experiences` has RLS and explicit SELECT-only client grants. Public rows contain only catalog content, state, version and timestamps; actor/command history is private. Public SELECT sees published records; assigned editors additionally see drafts/withdrawn records for their own cities. No reviewer or hotel policy was broadened and no payment authority was granted.

## Verification and pilot gates

Verified locally: schema/content/link validation, supported transitions, cross-destination denials, no self-assignment, no hotel or merchant-review access, public/private visibility, stale forms, changed retries, immutable history, harmless publish replay after withdrawal, destination immutability and immediate revocation. Hosted `scripts/verify-experiences.sql` repeats creation/publication/withdrawal, privacy, replay and revocation checks inside a transaction that rolls back all synthetic identities, assignments, content and history.

A real assigned-editor browser flow with verified content and independent-connection concurrency tests remain pilot gates. Internal tour inquiries, operator analytics, city-pass catalog configuration, platform-wide administration and external provider availability verification remain separate work. No deployment performed.

## Authorized demonstration extension — 2026-10-16

The subsequent user-authorized demo adds a separately labeled Lisbon example and immutable demo classification on related inquiries. Earlier statements about zero records describe verification before that seed. No real partner, staff assignment or confirmed reservation is implied. See [DEMO_DATA.md](DEMO_DATA.md).
