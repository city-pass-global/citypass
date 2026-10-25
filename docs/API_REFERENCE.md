# Server actions and PostgreSQL RPC reference

Source review: 2026-10-21. This is an internal integration contract, not a public third-party REST API. Next.js server actions validate untrusted inputs with Zod; the Supabase client invokes database functions using a publishable key plus the current application capability. Do not bypass those entry points or infer permission from the browser.

## Common rules

UUIDs identify records, not authority. Actor identity is resolved from the live hashed application session; no caller `user_id`, role, email match, or destination preference grants privileges. Money is a positive decimal string with at most seven fractional digits. Idempotency keys/command IDs are UUIDs, scoped by the specific transaction; changed retries are rejected. Versioned editors/reviewers must submit the version actually read.

RPCs generally return domain JSON, including `{error: string}` for controlled business denial; transport/database errors are separate. Server actions map these to bounded localized error keys and invalidate relevant pages after success. A JSON domain error can intentionally commit abuse-attempt counters; do not assume every denial rolls back. Exact result schemas live with the relevant domain validator.

## Public invoker wrappers

| RPC                                                | Actions/arguments                                              | Authority and purpose                                                       |
| -------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `create_pollar_session(payload text, mac text)`    | Signed provider identity/session assertion                     | Backend verifier and MAC; replay/expiry guarded profile/session transaction |
| `end_app_session()`                                | No caller identity argument                                    | Revoke the current capability                                               |
| `passport_command(action, payload)`                | Commands below                                                 | Live actor, or constrained guest invitation exception                       |
| `checkout_command(action, payload)`                | `onboard`, `payout`, `create`, `resolve`, `prepare`, `attempt` | Membership/payer rules; no direct receipt creation                          |
| `record_checkout_evidence(payload text, mac text)` | Domain-authenticated submission/settlement evidence            | Server HMAC plus session and frozen request checks                          |
| `destination_pass_command(action, payload)`        | `catalog`, `account`, `purchase`                               | Public published catalog; actor-only account/purchase                       |
| `merchant_review_command(action, payload)`         | `context`, `queue`, `decide`                                   | Explicit destination reviewer assignments                                   |
| `experience_command(action, payload)`              | `context`, `queue`, `create`, `save`, `publish`, `withdraw`    | Explicit destination editor assignments                                     |
| `inquiry_command(action, payload)`                 | Retained historical commands                                   | Database capability remains; application UI/actions retired                 |

Wrappers run as invoker and delegate to authorized private transactional helpers. The private schema is not exposed through PostgREST. Exposed SELECT grants are still constrained by RLS; no direct client mutations to claims, ledgers, invitations, receipts, memberships, holdings, or reputation exist.

## Passport and hotel command payloads

Entry points: `execute(locale, action, previous, form)` and `submitGuest(input)` in `src/app/actions.ts`. Validation: `src/lib/validation.ts`.

| Action                  | Payload fields from application                                                                                | Notes                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `activate_traveler`     | Empty object                                                                                                   | Idempotent global database identity                                                 |
| `activate_passport`     | `destination_id`                                                                                               | Legacy destination collection activation                                            |
| `create_hotel`          | `destination_id`, `name`                                                                                       | Pending organization and owner membership                                           |
| `create_reservation`    | `organization_id`, `reference`, `email`, `arrival`, `departure`, `guest_count`                                 | Dates validated; party 1–20; membership required                                    |
| `issue_invitation`      | `reservation_id`                                                                                               | Server generates raw 32-byte token; database hashes it; response link returned once |
| `review_reservation`    | `reservation_id`, `status`                                                                                     | Status is reviewed/ready_for_arrival/completed/cancelled, with DB transition checks |
| `claim_stamp`           | `token`                                                                                                        | Live traveler, credential/participation/rate/capacity/uniqueness checks             |
| `issue_qr`, `revoke_qr` | `stamp_id`                                                                                                     | Approved participating organization and role; issue token generated server-side     |
| `submit_precheckin`     | `token`, `email`, `full_name`, `phone`, `nationality`, `residence`, `arrival_time`, `requests`, `consent=true` | Guest write-only capability; exact matching email; no profile login                 |

Token format is 64 lowercase hexadecimal characters. Invitation and QR links use URL fragments and must not be logged. `execute` returns `{success?, error?, url?}`; guest submission returns success/error without reservation read access.

## Merchant and pass commands

Merchant action validation is in `src/lib/payments/validation.ts`:

- `onboard`: `name`, `destination_id`; creates a pending merchant and owner membership.
- `payout`: `organization_id`; approved owner only; wallet comes from the server-verified profile, not the form.
- `create`: `organization_id`, `product`, `amount`, `idempotency_key`; approved owner/manager/merchant role; duplicate key with changed product/amount fails.
- `resolve`, `prepare`, `attempt`: `request_id`; authenticated lookup, payer binding, and restricted recovery respectively. An unbound fresh link permits signed-in review; after binding, another nonmember cannot take it over. `attempt` can expose the stored attempt only through authorized RPC, never a public table read.

Pass `catalog` uses `destination_id`; `purchase` uses `offer_id` only. Price, award, recipient, destination, and identity are authoritative database values. `account` derives the actor and returns activation, holdings, reputation, and latest 20 purchase summaries. It never accepts another user's account ID. `purchaseDestinationPass` redirects to the returned checkout; do not intercept Next's redirect as a payment failure.

## Payment server actions

File: `src/app/[locale]/checkout/[id]/actions.ts`.

| Action             | Input                                        | Result/behavior                                                                   |
| ------------------ | -------------------------------------------- | --------------------------------------------------------------------------------- |
| `preparePayment`   | Checkout UUID                                | Bind/check payer and return `unsignedXdr`, or bounded error                       |
| `submitPayment`    | UUID, signed XDR (maximum 32,768 characters) | Verify, persist attempt, broadcast, reconcile; uncertain lookup remains submitted |
| `reconcilePayment` | UUID                                         | Independently inspect stored hash; record authenticated terminal evidence         |
| `retryPayment`     | UUID                                         | Retrieve/re-submit the exact stored envelope; no second charge construction       |

`PaymentResult` is `{error?: string, status?: string, unsignedXdr?: string}`. Checkout statuses: `created`, `prepared`, `submitted`, `confirmed`, `failed`, `expired`. Controlled errors include unauthorized/forbidden, wallet_required, self_payment, invalid_state, payment_proof/payment_conflict, recipient_unavailable, expired, insufficient_usdc, account_unfunded, and unavailable. [Stellar guide](STELLAR_INTEGRATION.md) defines the verification invariants.

## Review and catalog commands

`reviewMerchant` accepts `organization_id`, `command_id`, `expected_version`, decision `approved|suspended`, and a 10–1000 character reason. Scope and valid state transition are rechecked in PostgreSQL. Review context/queue expose narrow projections, not hotel, profile, payout, or payment data.

Experience create/save content requires exactly ES/EN/PT titles (2–120 characters) and descriptions (20–3000), plus optional constrained HTTPS `booking_url`. Create takes `destination_id`/`command_id`; save takes `experience_id`/`command_id`/`expected_version`; publish/withdraw require those IDs, expected version, and `confirmed='on'`. Published content must be withdrawn before editing. No change may move an experience to another destination. Accepted retries cannot republish withdrawn content.

See [merchant review](MERCHANT_REVIEW.md) and [experience publishing](DESTINATION_EXPERIENCES.md) for assignment provisioning, lock order, and revocation semantics. The [historical inquiry guide](EXPERIENCE_INQUIRIES.md) documents the retained private subsystem without implying application availability.
