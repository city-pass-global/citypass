# Destination-scoped merchant review

The Pollar-only portal at `/[locale]/review` lists merchants for explicitly assigned destinations. It has status filters and 25-row pagination. Pending businesses can be approved; approved businesses can be suspended; suspended businesses can be reactivated. Every decision needs a 10–1000 character reason and an explicit UI confirmation. Reviewers must independently verify business legitimacy; directory references are never approval evidence. Approval is an internal participation decision, not a public claim of regulatory certification.

## Authorization and transactions

Assignments live in `private.destination_reviewers`, not JWT metadata or browser state. No client has direct privileges on that table. The context command returns only the caller's destinations. The queue command returns a narrow merchant projection and the latest internal review, without profile/email, hotel, invitation, session, payout or payment details. No organization SELECT policy was broadened for reviewers.

`merchant_review_command` is an invoker wrapper over a private transactional function. Decisions derive the actor from the live Pollar application session, lock the organization and assignment, check merchant kind and destination scope and reject any member reviewing their own business. Organization approval versions reject stale browser decisions. Actor-scoped command IDs make identical retries idempotent and reject changed payloads. Accepted decisions insert immutable private review history and an audit event in the same transaction.

Suspension blocks checkout creation and preparation. New payment submission acceptance takes a shared lock on the approved organization, serialized with review changes; a suspended organization cannot accept a previously prepared transaction as a new submission. Already submitted transactions remain reconcilable, including after suspension. Suspension does not revoke on-chain signatures or reverse payments already recorded for submission.

## Initial assignment and revocation

The migration does not grant anyone reviewer privileges. Trusted database administration must verify the intended existing Pollar application identity and destination UUID, then add exactly that assignment. Never infer authority from an email match, a legacy identity or organization ownership. There is no browser endpoint for assignment or self-promotion.

Use an authorized administrative transaction: insert the `(user_id,destination_id)` pair in `private.destination_reviewers` and append an administrative record to `private.audit_events` using action `reviewer_granted` and the reviewed destination as entity ID. Keep the authorized actor and subject/destination mapping in the administrative change record. Revoke by deleting that exact pair and recording `reviewer_revoked`. Do not print session capabilities, email, tokens or credentials. Assignment provisioning is deliberately separate from merchant approval. The application rechecks assignments on every request; deleting an assignment denies subsequent reads and decisions, even retries of formerly accepted commands.

No real assignment or business approval was performed during implementation. Synthetic hosted test identities, grants, organizations and decisions ran only inside a rolled-back transaction.

## Verification and remaining gates

Local tests cover scope denials, no self-assignment, no hotel access, reason limits, supported transitions, stale versions, replay and changed-payload denial, immutable history, immediate revocation, and suspension versus prepared submission. Hosted `scripts/verify-merchant-review.sql` verifies assigned approval/suspension, replay, stale versions, guest isolation and revocation; its fixtures roll back.

A real assigned-reviewer browser workflow and independent-connection race tests remain pilot gates. The existing Pollar user's no-assignment screen is the expected live behavior until trusted administration explicitly provisions access. Operator booking/inquiry portals and hotel approval/staff administration are separate work. No deployment was performed.
