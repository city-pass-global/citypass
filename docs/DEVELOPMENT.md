# Development and operations

Source review: 2026-10-21. Start with the [root README](../README.md) for prerequisites and environment variables. Existing environment/hosted state is not reverified by reading this guide.

## Local modes

**Unconfigured:** editorial browsing and public UI can run without credentials; personal operations fail closed. The country/city registry, published catalog, and offers need Supabase. Do not present local preference state as account persistence.

**Connected development:** use the explicitly selected Iguapass development project (`wafunogjrczlwvdnvyfs`) or a separately approved isolated development environment. Configure Supabase public settings, matching Pollar keys, bridge key, and origin. The recorded Pollar allowlist accepts `http://localhost:3000`; `127.0.0.1` is a different browser origin.

**Production:** no deployment is authorized by this guide. Mainnet payments are not enabled by changing a key. Production needs its own approved configuration, origin/redirects, operational policy, acceptance gates, and explicit deployment approval.

## Fresh database and migration workflow

1. Select the intended development target and inspect current migration history before writes. Never apply these files to an unrelated Supabase project.
2. Discover the installed CLI before choosing commands:

   ```bash
   npx supabase --help
   npx supabase migration --help
   npx supabase migration list --help
   npx supabase db --help
   npx supabase db push --help
   ```

3. On a new isolated database, apply every checked-in migration in timestamp order. Later migrations replace earlier function bodies: reading only the foundation is insufficient. Provision the session bridge key separately through trusted administration; no seed contains it.
4. Inspect `supabase/seed.sql` before seeding. It supplies sourced discovery data, not approved partners, real reservations, pass offers, or redeemable rewards.
5. Existing development pilot offers/treasury and the labeled Lisbon demo were separate owner-authorized operations. `scripts/provision-pilot-passes.sql` refuses an existing catalog; it is not routine repeatable setup. Do not run demo/provisioning/update scripts casually.
6. For new changes, create names with `npx supabase migration new <descriptive_name>`. Review RLS, explicit grants, constraints, lock order, audit/idempotency behavior, and generated `src/lib/supabase/database.types.ts`. Test the full ordered migration set locally before a selected remote development application.

Never use a service-role key in browser or source. Never expose `private` through the Data API. Role/membership grants require trusted administration and a verified existing application identity, not user-editable JWT metadata or an email coincidence.

## Validation matrix

| Command                                                                      | What it establishes                                                  | What it does not establish                                         |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `npm run typecheck`                                                          | Strict TypeScript compatibility                                      | Runtime authorization or provider behavior                         |
| `npm test`                                                                   | Domain/unit regression behavior                                      | Independent hosted actors                                          |
| `npm run test:db`                                                            | Ordered migrations and SQL authorization/replay assertions in PGlite | Supabase/PostgREST integration or races on independent connections |
| `npm run build`                                                              | Next production compilation                                          | Deployed operation or successful transactions                      |
| `npm run test:e2e`                                                           | Desktop/mobile browser coverage against a built server               | Every authenticated or funded flow                                 |
| `npm run test:connected`                                                     | Read-only configured hosted catalog and private-data denials         | Hosted mutation, wallet signing, all-table isolation               |
| `cargo test --locked --manifest-path contracts/passport-activity/Cargo.toml` | Local Rust prototype tests, with compatible Rust toolchain           | Deployment, app integration, or target-network acceptance          |

Functional changes require all five application suites in the engineering conventions: typecheck, unit, DB, build, and e2e. Run meaningful security denials/replays as well as successful paths. Documentation-only edits should check internal links, source references, formatting, and factual consistency; do not claim old suite counts as newly executed.

Playwright uses a production server and may reuse an existing process outside CI. Build first; ensure the server matches the build/config being tested. `TEST_PORT=3017` isolates the process from the user's preview. Flags describe **actual test fixtures/configuration**, not desired features:

| Flag                         | Enable only when                                                  |
| ---------------------------- | ----------------------------------------------------------------- |
| `TEST_SUPABASE_CONFIGURED=1` | The tested app can read the configured registry                   |
| `TEST_POLLAR_CONFIGURED=1`   | Provider configuration is available for the actual browser origin |
| `TEST_PILOT_PASSES=1`        | Published development pass offers exist                           |
| `TEST_DEMO_SEEDED=1`         | The explicitly isolated demo has been provisioned                 |

An isolated port is a different Pollar origin; do not imply Google login is approved there without checking its allowlist. Browser dependencies may need `npx playwright install chromium`. When native sandbox restrictions block Next/Chromium, report the restriction; prior logs used `npm run build -- --webpack` as a build fallback. A writable npm/SWC cache can help filesystem-restricted environments, but it is not an application requirement.

## Hosted and concurrency acceptance

`scripts/verify-hosted.sql`, `verify-pollar-sessions.sql`, `verify-global-traveler.sql`, `verify-checkout.sql`, `verify-merchant-review.sql`, `verify-experiences.sql`, `verify-inquiries.sql`, and `verify-passes.sql` preserve hosted rollback checks. Review each target, fixture scope, rollback, and cleanup before running with trusted administrative tooling. They are not blanket authorization for remote writes or production use.

Before pilot launch, use genuinely distinct authenticated users and independent database connections to test concurrent duplicate purchase/receipt, QR capacity/claim replay, invitation consumption/reissue, stale review/catalog transitions, and immediate permission revocation. Assert one accepted result, denied cross-tenant access, no duplicate awards, and no residual fixtures. Embedded serial tests do not prove these races safe in the hosted stack.

## Operational recovery

| Symptom                                       | Investigation/action                                                                                               |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Google origin error                           | Match exact Pollar browser origin and OAuth redirect; use localhost for the recorded local setup                   |
| Provider authenticated but app unavailable    | Check server verification, matching key network, bridge config, and session expiry without printing credentials    |
| Empty private data for direct API/JWT request | Expected without a live application capability; do not broaden grants to fix it                                    |
| `self_payment`                                | Buyer wallet equals frozen recipient; use a distinct authorized buyer                                              |
| `account_unfunded` / `insufficient_usdc`      | Check payer account and exact testnet USDC issuer, authorization, available balance/liabilities; no automatic swap |
| `recipient_unavailable`                       | Check recipient account/trustline/capacity; never substitute another address                                       |
| Payment remains submitted                     | Use existing checkout status/retry; inspect stored hash with independent RPC; retry the stored envelope only       |
| Old hash is `NOT_FOUND`                       | Check provider history retention and longer-history evidence; absence is not proof of failure                      |
| Swap disabled                                 | Provider config returned no venues or errored; verify provider/network configuration, not a fake quote             |
| Reflector data absent                         | Expected: no runtime adapter exists yet                                                                            |

Do not manually mark a payment confirmed, insert a receipt, award reputation, or loosen proof checks to recover a UI failure. Use the authenticated independent reconciliation path. The 2026-10-17 receipt recovery is the documented example.

## Privacy, retention, and release gates

Logs and screenshots must exclude tokens, email, guest forms, provider sessions, signing envelopes with sensitive context, and backend secrets. Store only narrow audit metadata for accepted operations. Manual invitation sharing is performed by staff outside CityPassport; there is no notification service.

`scripts/retention.sql` is a **destructive manual operator template**, not an automated job. It deletes expired guest submissions/invitations/reservations and old rate-limit rows. Review hotel policy, exact scope, backup/recovery, and required retention before any execution; scheduling is still pending.

Release requires explicit deployment approval, real business participation checks, supported origins/networks, hosted isolation/concurrency acceptance, funded flow evidence for the intended scope, reconciliation ownership, and reviewed retention policy. Refunds, reward settlement, mainnet, and on-chain synchronization need their own implementation and acceptance. Keep [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) and [VERIFICATION.md](VERIFICATION.md) current.

## Migration inventory

Apply the complete ordered set; later files supersede earlier dispatcher/policy bodies. This describes repository scope, not a fresh hosted history check.

| Migration                                          | Responsibility                                                                                                       |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `20261010183147_foundation.sql`                    | Destination/organization/passport/hotel foundation, QR/invitation capabilities, RLS, grants, audit/ledger groundwork |
| `20261010183213_catalog_provenance.sql`            | Source review/provenance and public contact metadata                                                                 |
| `20261010183630_foreign_key_indexes.sql`           | Supporting foreign-key indexes                                                                                       |
| `20261016013956_citypassport_destinations.sql`     | Countries, multilingual destination registry, geographic constraints                                                 |
| `20261016015242_global_traveler_identity.sql`      | Global traveler and preserved destination collections                                                                |
| `20261016021417_pollar_identity_sessions.sql`      | Preserved user registry, hashed app sessions, actor-based authorization                                              |
| `20261016025838_merchant_checkout.sql`             | Merchant payouts, requests, attempts, independently evidenced receipts                                               |
| `20261016030818_merchant_review_permissions.sql`   | Separate reviewer assignments and immutable decisions                                                                |
| `20261016032536_destination_experiences.sql`       | Editor assignments, catalog lifecycle, versioned commands                                                            |
| `20261016035708_experience_inquiries.sql`          | Private inquiry subsystem retained after UI retirement                                                               |
| `20261016041344_isolated_demo_experiences.sql`     | Immutable demo classification and isolation                                                                          |
| `20261017165511_destination_pass_purchases.sql`    | Fixed offers/orders, atomic receipt-linked ownership/reputation                                                      |
| `20261017171225_citypass_destination_treasury.sql` | Owner-authorized CityPass recipients and payout provenance                                                           |
| `20261017193928_pilot_purchase_recovery.sql`       | Owner-only activation/history/recovery projection                                                                    |

The treasury migration provisions operational seller records; it is not merely a read-only schema change. Subsequent offer publication and demo content remain separate reviewed administration. Before applying any migration remotely, verify the selected development target and authorization for its actual effects.
