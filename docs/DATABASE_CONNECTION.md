# Database connection and migration history

## Current setup pointer — source review 2026-10-21

The selected recorded development project is **Iguapass (`wafunogjrczlwvdnvyfs`)**. Current application login is Pollar-only, using `supabase-js` with a publishable key and database-backed app capability, not Supabase SSR OAuth. Local origin is `http://localhost:3000`. Ignored environment includes backend Pollar/bridge secrets in addition to public database configuration; no service-role key is used. See [README](../README.md), [development/operations](DEVELOPMENT.md), and [Pollar protocol](POLLAR_INTEGRATION.md) for current instructions.

The dated sections below preserve earlier connection evidence. Statements about three migrations, 16 tables, Supabase Google redirects, no submitted payments, and pending destination preference describe their original dates and are superseded by later migrations/features. Pass/treasury/recovery migrations and eight owner-approved development offers are recorded as applied in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md); a funded testnet receipt is recorded on 2026-10-17. No remote history, advisor state, or live balance was rechecked for the documentation update. Inspect the selected target before any future migration.

## Historical records

Verified 2026-10-10. Project: `Iguapass`, ref `wafunogjrczlwvdnvyfs`, region `us-east-2`.

Rechecked 2026-10-13 through both the Supabase plugin and project-scoped MCP: both identify the configured Iguapass project, which is active and healthy. Hosted migration history still matches the three local files. `npm run test:connected` passed against the configured URL and publishable key, verifying Google Auth, public catalog access and anonymous private-data denials. No remote writes or application configuration changes were required.

The current security advisor also reports a warning for disabled leaked-password protection, in addition to the four intentional private-table default-deny INFO findings. The app uses Google OAuth; review password protection before enabling password authentication. Earlier advisor results below describe the original verification, not the current warning state.

## Applied remotely

Three checked-in migrations match hosted migration history:

- `20261010183147_foundation.sql`: 12 public and 4 private tables, RLS, explicit privileges and validated command functions.
- `20261010183213_catalog_provenance.sql`: stable catalog identity, review date and public contact fields.
- `20261010183630_foreign_key_indexes.sql`: covering indexes for advisor-identified foreign keys.

`supabase/seed.sql` populated Puerto Iguazú and 15 attributed listings (9 attractions/experiences and 6 agencies). All listings remain `listed`; none is an approved partner. No redeemable stamps or rewards were fabricated.

The app uses generated database types and a request-scoped Supabase SSR client. `.env.local` contains only the project URL, public publishable key and local app origin; it is git-ignored. No service-role key is used.

## Authentication

Google is enabled; anonymous sign-ins are disabled. Site URL is `http://127.0.0.1:3000`. The exact allowed redirects are `/auth/callback?locale=es`, `/auth/callback?locale=en` and `/auth/callback?locale=pt` on that origin. Real Google sign-in, callback, passport activation and persistence after refresh passed in the local browser. That activation created a real passport with no stamp claims.

Before deployment, configure the actual origin and corresponding Auth redirects. No web deployment was performed.

## Verification

- TypeScript check, 10 unit tests, 38 embedded PostgreSQL assertions and production Webpack build passed.
- `npm run test:connected` checks live Auth settings, readable sourced listings, anonymous private-data denials and the unexposed private schema. It performs no writes.
- `scripts/verify-hosted.sql` passed against hosted PostgreSQL: account isolation, hotel onboarding/reservations, guest invitations and replay protection, review transitions, authorized QR claims and duplicate denial. Fixtures and writes were rolled back, and absence of fixture users was checked afterward. This SQL test sets database roles/JWT claims; it does not replace real multi-user browser tests.
- All 16 application tables have RLS enabled. The security advisor returned no warnings or errors. Four private-table INFO findings report RLS without policies: intentional default-deny access, mediated by validated functions. See [RLS without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- Foreign-key index findings were resolved. Remaining performance INFO findings are fresh unused indexes and Auth's fixed connection allowance. See [unused indexes](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index) and [production guidance](https://supabase.com/docs/guides/deployment/going-into-prod).

## Remaining pilot work

Independent-connection concurrency tests and full guest/staff browser workflows remain pending. Standalone Playwright Chromium has been blocked by this environment's Mach-port sandbox restriction; in-app browser checks supplement it. Obtain actual business approvals before issuing real stamps. Rewards redemption, automatic route awards, account-synced itinerary bookmarks/interests and automated data-retention jobs remain planned. This connection is not a claim of production readiness.

## CityPassport destination foundation — 2026-10-15

Applied `citypassport_destinations` through the explicitly requested Supabase plugin to this same selected development project. CLI created the migration file; its timestamp was aligned to the hosted migration version `20261016013956` after application. Existing three migration versions remain unchanged. The first plugin call failed with expired request state, and schema/history checks proved it had not applied; the retry succeeded.

Verified remotely: four countries, eight destinations, country RLS enabled, anonymous SELECT access and no INSERT/UPDATE/DELETE privileges, and preserved counts of 15 venues and one passport. Generated TypeScript types were refreshed through the plugin. The read-only connected integration script passed. The security advisor retains the existing leaked-password protection warning and four intentional private-table default-deny INFO notices; no new country-table finding. See [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) and [default-deny policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

The directory at `/{locale}/destinations` and destination detail routes read actual database metadata. Additional countries and destinations can be provisioned through administrative migrations with valid multilingual names, ISO codes and IANA zones. New destinations have no invented listings. Legacy Iguazú home/routes/hotel/passport pages retain their current scope; a persistent application-wide selector and global passport migration remain pending. No web deployment was performed.

## Global traveler identity — 2026-10-15

Applied `global_traveler_identity` through the Supabase plugin to selected Iguapass. CLI generated the local migration; the file timestamp was aligned to hosted version `20261016015242`. Generated database types refreshed. Verified one existing global traveler, one preserved destination collection, zero unlinked collections and unchanged zero claim/ledger counts.

`scripts/verify-global-traveler.sql` passed on hosted PostgreSQL: anonymous denial, idempotent activation, one audit event, direct-write and helper execution denials, stable identity across destination collections and cross-user read isolation. All fixtures rolled back; fixture users verified absent. Existing `scripts/verify-hosted.sql` also passed with zero residual test users and 15 unchanged directory listings, none participating. The security advisor retains the same existing password warning and four private default-deny INFO notices. No new finding for global profiles.

The passport now reads global history; home/routes/hotel destination context and wallet association remain separate work. No application deployment performed.

## Pollar-only application sessions — 2026-10-15

Migration `20261016021417_pollar_identity_sessions` was applied through the Supabase plugin to this same selected development project. Local filename was aligned to the hosted version after CLI generation. Backend attestation configuration was provisioned separately, with its matching key in ignored local environment; no secret appears in source migrations/seeds. Generated database types were refreshed.

Application foreign keys now reference preserved `user_profiles` UUIDs instead of requiring a Supabase Auth user. RLS and mutation functions require a valid database-backed Pollar application session. Hosted rollback scripts for Pollar sessions, global passports and hotel/stamp transactions all passed; unauthenticated data queries return empty rows. The read-only connected API script passed. The security advisor has two new intentional private default-deny INFO entries for sessions/config, alongside four existing private-table entries and the existing leaked-password warning; no new warning/error was introduced.

A real Pollar Google login created one Pollar profile and global passport. One legacy profile/collection is preserved separately, with no email-based merging. Real balances, receive QR and trustline transaction history were read through Pollar. No application-controlled payment or swap was submitted. Pollar allows localhost:3000, so APP_ORIGIN and browser tests now use that origin. No domain setting change or web deployment was performed.
