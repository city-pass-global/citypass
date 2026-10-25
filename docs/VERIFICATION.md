# Verification — 2026-10-10

## Passed

- Next.js 16.4.0 production compilation and route generation.
- Strict TypeScript validation.
- 5 Vitest tests: QR origin restrictions, reservation validation, guest consent/time validation, OAuth locale allowlist and dictionary parity.
- 38 SQL assertions running the actual migration in PGlite PostgreSQL. Includes anonymous denial, tenant isolation, merchant exclusion from guest data, self-escalation denial, invitation hashing/expiry/replay/rotation/attempt lockout/cancellation, hotel review transitions, passport ownership, duplicate claims, QR limits/expiry/revocation, persistent claim throttling, all-table RLS and ledger immutability.
- HTTP 200 from local production discovery route.
- In-app browser visual checks at 390×844 and 1440×1000.
- In-app browser: English discovery, category filtering, source attribution, Portuguese passport with zero fabricated stamps, disabled unconfigured Google button, language navigation back to Spanish, matching document language, no horizontal overflow at 390px, guest fragment removal and client validation for empty fields/consent.

## Blocked or not yet verified

- The standalone Playwright runner attempted 10 desktop/mobile cases but Chromium was blocked at process launch by macOS sandbox MachPortRendezvous permissions. This is NOT a passing automated E2E result. Tests remain checked in for execution in a compatible host or CI.
- No live Supabase project was selected or modified. No Google OAuth credentials were fabricated. SSR refresh behavior and PostgREST integration are implemented but not verified against a hosted service.
- PGlite uses minimal auth.users/auth.uid fixtures. It does not test Supabase Auth, network requests or independent concurrent database connections.
- Staff/guest flows were verified at the SQL layer, not end-to-end with real accounts.
- Physical camera scanning, screen-reader testing, mobile device matrix, hosted security advisors and load tests are pending.

See PILOT_PLAN.md for release gates. The app is not marked pilot-ready or production-ready.

## UI and Three.js refinement

Added Three.js 0.186.1 as a lazy scene module, with TypeScript definitions 0.186.0. Original geometry and shader water use no downloaded media. Desktop browser rendered the scene with no graphics errors; pause/resume and close-view controls were exercised. Sample-stamp preview and reset worked and did not award a real stamp. English mobile layout at 390px had no horizontal overflow. Desktop review at 1440px led to corrected cliff occlusion, lighter foliage, better camera framing and removal of the overlapping decorative caption.

TypeScript, production build, 5 validation tests and 38 database assertions passed after the UI implementation. Added Playwright cases for sample/reset, reduced-motion default, WebGL failure fallback and canvas cleanup on navigation. The updated 18-case suite was attempted with one worker and stopped at the first Chromium-launch sandbox failure; the remaining 17 did not run. Reduced-motion and forced WebGL-failure automated tests are present but not claimed as executed successfully on this host. In-app checks verify the normal rendering path and controls.

The development watcher also encountered a macOS FSEvent restriction. Production build/start was used for local preview. No live Supabase configuration or deployment changed.

## Passport collectible revision

Restored the original discovery illustration, added an opening passport, a temporary Three.js stamp press and a clickable sample waterfall stamp. Real collected records now open name/date details. Verified in the in-app browser: open passport, press stamp, open detail, pause, close-up, Escape, restored trigger focus, zero canvases after dismissal, and zero collected stamps after trying the sample. Reviewed the detail at a 390px viewport with no horizontal overflow.

Typecheck, 5 unit tests, 38 embedded PostgreSQL assertions and `npm run build -- --webpack` passed. Default Turbopack build was blocked by sandbox port binding. Playwright was attempted but macOS denied Chromium MachPortRendezvous launch; no automated browser assertions executed. Reduced-motion and WebGL-fallback cases are specified in the updated suite but not newly browser-verified. Hosted Supabase remains unconfigured.

## Visit Iguazú directory expansion

15 curated entries: 9 attractions/experiences and 6 agencies. Typecheck, 8 unit tests, 38 embedded database assertions and the Webpack production build passed. New unit coverage validates attribution, language completeness, exclusion of municipal footer contacts, accent-insensitive combined filtering, and database precedence without directory promotion. The browser suite was attempted; Chromium launch remained blocked by macOS sandbox permissions before assertions ran.

In-app browser verified agency filtering, Aguas Grandes contact disclosure, correct mailto/tel and source URLs, and a search for `entre rios` returning one agency while retaining the category. Mobile 390px review showed no horizontal page overflow. Source dates represent directory review, not direct operator confirmation. Hosted Supabase integration remains pending; no new database writes or migrations were performed.

## Routes page

Typecheck, 10 unit tests, 38 embedded database assertions and Webpack production build passed. Itinerary tests verify source-backed stop resolution and safe fallback for unknown routes. Playwright suite attempted but Chromium launch blocked by macOS before assertions. In-app browser verified route selection, two wildlife stops, bookmark persistence across reload and removal, desktop 1440px layout, and Portuguese roots route at 390px with no horizontal overflow. No real claims, bookings or route awards were generated. Browser storage failure has a visible fallback message; that branch was not manually exercised.

## Rewards preview

TypeScript, 10 unit tests, 38 embedded SQL assertions and the Webpack production build passed. Added a Playwright scenario for interest persistence, filtering, removal and accurate unavailable-reward messaging. The automated browser suite was attempted but Chromium launch remained blocked by macOS before assertions ran. In-app browser verified saved interest across reload, saved-only filtering, removal to the empty state, English FAQ disclosure, and layouts at 1440px and 390px with no horizontal overflow. Storage failure messaging exists but was not manually exercised. No offers, coupons, points or redemption functionality is live.

## Connected Iguapass verification — 2026-10-10

Supersedes earlier unconfigured-preview status. The hosted schema and 15 sourced listings are installed; generated database types are integrated. Google OAuth, passport activation and refresh persistence passed in the browser. Typecheck, 10 unit tests, 38 embedded database assertions and a configured production build passed. Hosted transactional workflow/RLS tests passed and rolled back their fixtures. See [database connection report](DATABASE_CONNECTION.md) for reproducible checks, advisor findings and remaining pilot gates.

## CityPassport destination foundation — 2026-10-15

Typecheck, 11 Vitest tests, 44 embedded PostgreSQL assertions, production Webpack build and all 28 Playwright desktop/mobile tests passed. Default build encountered the native SWC cache restriction; `SWC_NATIVE_BINDING_CACHE=/private/tmp/iguazu-swc-cache npm run build -- --webpack` passed. Browser server startup initially failed inside the sandbox; the authorized run outside it passed. The older Portuguese auth assertion was corrected to respect `TEST_SUPABASE_CONFIGURED=1`. Unknown destination paths render Next's not-found view; streamed responses can carry HTTP 200, so the browser test verifies the rendered rejection.

Reviewed desktop and mobile screenshots of the destination directory. New tests verify scoped Lisbon empty state, no Iguazú listing leakage, Iguazú source-backed records and unknown-slug rejection. DB assertions add registry access, write denial, invalid time zones, missing languages and absence of invented Lisbon venues. Existing hotel isolation, claim and invitation replay checks remain passing.

Supabase plugin applied migration `20261016013956_citypassport_destinations` to selected Iguapass. Read-only hosted integration checks passed with network access. Hosted metadata/role checks verified four countries, eight destinations, RLS and SELECT-only client country privileges; 15 venues and one existing passport remain. Generated types refreshed. No global identity migration, payment settlement, Reflector quote, authenticated multi-user browser test or independent-connection concurrency test is claimed. No deployment performed.

## Global traveler identity — 2026-10-15

Passed: TypeScript, 12 Vitest tests, 69 embedded PostgreSQL assertions, production Webpack build with writable SWC cache, all 28 configured desktop/mobile Playwright cases, and read-only hosted integration checks. React review retained server rendering and parallel reads, added a destination Map for history lookup, and introduced no new client effects/dependencies. The interactive passport cover and localization browser checks remain passing.

New SQL coverage verifies legacy collection-ID preservation and global backfill, session-derived ownership, idempotent activation with one audit event, denial of anonymous access/direct writes/internal-helper calls, cross-user isolation and two destinations sharing one global identity. Validated claims create destination collections lazily; invalid credentials create none; replay remains denied. These cross-destination claim tests use isolated embedded database fixtures, not real partner activity.

Applied hosted migration `20261016015242_global_traveler_identity` through the Supabase plugin to selected Iguapass and regenerated types. New rollback-only global identity checks and existing hosted hotel/QR workflow checks passed; all synthetic users were removed by rollback. The existing one passport collection is linked to one traveler; no unlinked collection, claim/ledger change or new advisor finding. Existing leaked-password warning and intentional default-deny private-table notices remain documented in DATABASE_CONNECTION.md.

Authenticated cross-destination browser flows and independent-connection races remain unverified pilot gates. Wallet linkage and chain integrations are not implemented by this slice. No deployment performed.

## Pollar-only login and wallet — 2026-10-15

User approved managed Google wallet custody and requested Pollar as the only login. Implemented SDK 0.11.5 integration using the supplied official quickstart, payments and swap guides plus backend token verification. Supabase OAuth is retired from application login; a Supabase JWT subject alone grants no application data access.

Passed: typecheck, 14 unit tests, 91 embedded PostgreSQL assertions, production Webpack build, all 30 configured desktop/mobile browser tests, read-only hosted API checks, and all three rollback-only hosted SQL suites (Pollar sessions, global travelers, hotel/QR workflows). Hosted fixtures verified absent. Migration `20261016021417_pollar_identity_sessions` applied to selected Iguapass through the plugin; types regenerated and the backend attestation key provisioned outside source/migrations.

New database checks include an RFC 4231 HMAC vector, forged/stale/expired assertions, maximum session lifetime, exchange replay, session rotation, immediate logout revocation, session-hash replay denial, identity/credential write and read denials, JWT-only impersonation denial, cross-application subject isolation and no email-based identity merging. Existing hotel/claim replay and cross-user denials remain passing under capability sessions.

Real local browser verification: Pollar Google login succeeded; Supabase created one Pollar application profile/global traveler with its verified wallet address; wallet state survived navigation/reload; live testnet balances, receive QR and real provisioning/trustline transaction history loaded. The one legacy passport collection remains preserved separately. No transfer, swap, purchase claim or merchant receipt was created by CityPassport. Swap configuration returned no enabled venues; the action is visibly disabled. Enabled-venue quotes and funded execution remain pending.

The first browser run exposed a real provider-origin mismatch: `127.0.0.1:3000` returned `ORIGIN_NOT_ALLOWED`. `localhost:3000` is already allowed by the existing Pollar app; local APP_ORIGIN, README and Playwright URL now use it. No Pollar domain configuration was changed. App controls are localized; vendor modals currently display English and the interface discloses that.

Security advisor: no new warning/error, two intentional private default-deny INFO findings for app sessions/config added to the previous four; existing Supabase password-protection warning remains. Full provider token expiry/revocation lifecycle, multi-user authenticated browser checks and independent-connection concurrency remain pilot gates. No deployment performed.

Live logout was additionally verified in the browser: the profile returned to Pollar sign-in, and a hosted aggregate confirmed zero live application sessions. A subsequent Pollar login succeeded and retained exactly one Pollar profile/global traveler with one live session. After the user enabled swap venues, the wallet automatically enabled its swap action and loaded the configured asset and route selectors.

After the user's dashboard update, a real read-only testnet XLM-to-USDC quote loaded via Stellar DEX with a minimum-received value. No Swap button was pressed and no transaction was submitted. Receive and quote verification screenshots were saved locally. Logout/re-login preserved one Pollar profile and one Pollar global traveler; live session count changed from zero after logout to one after re-login. This validates login restoration, not an elapsed provider-refresh-token lifecycle.

## Testnet merchant checkout — 2026-10-16

Passed: typecheck, 18 unit tests, 140 embedded PostgreSQL assertions and production Webpack build. Applied migration `20261016025838_merchant_checkout` to selected Iguapass via the Supabase plugin and regenerated types. Hosted `scripts/verify-checkout.sql` passed approval/payout authorization, idempotency conflict, payer binding, self-payment, forged-proof denial, private-envelope and receipt write/read denials. All synthetic fixtures rolled back; hosted counts afterward showed zero test profiles, test merchants, checkouts and receipts.

Unit tests use actual signed Stellar transaction envelopes to reject a changed sender, recipient, amount, issuer, memo, time bound, operation count, missing signature and wrong network signature. Embedded tests also cover durable submission, duplicate hashes, settlement replay, exact financial evidence, immutable receipts, failed transactions and timely settlement reconciled after QR expiry. These tests do not substitute for a real funded transfer or independent-connection concurrency.

React review retained server-rendered pages, parallel independent reads and the existing lazy Pollar boundary. Camera cleanup stops acquired tracks even after an unmount race. Forms use labels, localized errors and pending controls. Manual browser inspection showed the real Pollar session restoring the merchant registration form with the eight database destinations; no business was registered for a screenshot.

Advisor review added only the intentional default-deny private checkout-attempt INFO notice. No missing public-table policy or foreign-key index finding. Existing unused-index INFO notices are retained for the development database. The pre-existing Supabase password-protection warning concerns unused Supabase password login; see [Supabase remediation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Private-table RLS without policies is intentional: [advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

A funded merchant/payer browser checkout, independent-connection races, unattended reconciliation and provider session lifecycle remain pilot gates. No deployment or payment was performed. Design and operational limitations: [MERCHANT_PAYMENTS.md](MERCHANT_PAYMENTS.md).

Final browser suite: all 34 desktop/mobile Playwright tests passed, including merchant/checkout Pollar-only gates, foreign checkout-link rejection and local checkout navigation. The initial run exposed an ambiguous test selector matching Next.js's hidden announcer; the selector was narrowed and the scanner received a dedicated localized invalid-link message before the successful full rerun.

## Destination-scoped merchant review — 2026-10-16

Passed: typecheck, 20 unit tests, 170 embedded PostgreSQL assertions, production Webpack build and all 36 desktop/mobile Playwright tests. Added review validation, assigned-destination queue/context checks, unsupported/reason/stale/replay denials, no self-promotion or self-review, no hotel access, immutable history, immediate revocation and suspension-versus-prepared-submission checks. React review: server-rendered queue, bounded pagination and narrow validated JSON; only the action form is client-rendered, with labels, pending/disabled states and no new effects or dependencies. UI retains the canopy/paper palette, Georgia headings, left alignment and existing business sections.

Applied `20261016030818_merchant_review_permissions` to selected Iguapass through the Supabase plugin and regenerated types. `scripts/verify-merchant-review.sql` passed hosted approval/suspension, scoped queue, changed retry/stale denial, no hotel access, monotonic versions and revocation checks. A transient plugin request-state error was retried once; the hosted suite then completed successfully. Post-rollback counts confirmed zero reviewer assignments, review history, fixture profiles and fixture organizations. No real privilege was assigned or business approved.

The existing Pollar browser session restored automatically at `/es/review`, where the actual no-assignment notice appeared and approval controls were absent. This verifies denied access, not the full assigned-reviewer browser workflow. A real reviewer assignment requires explicit authorized administration, with instructions in MERCHANT_REVIEW.md. Independent-connection races and a funded merchant checkout remain pilot gates.

Supabase advisor review: no new warning/error; two intentional private default-deny INFO findings for reviewer assignments/history. The existing password-protection warning and development unused-index/Auth connection INFO notices remain. See the prior advisor remediation links above. No missing foreign-key index finding. No deployment performed.

## Destination operator experience catalog — 2026-10-16

Passed: typecheck, 23 unit tests, 210 embedded PostgreSQL assertions, production Webpack build and all 38 desktop/mobile Playwright tests. New checks cover all three translations, text bounds, constrained provider links, separate catalog scope, no self-assignment or hotel/reviewer access, scoped queue validation/pagination, draft/public visibility, explicit publish confirmation, stale revisions, changed command retries, withdrawal before editing, immutable destination/history and harmless old publish replay after withdrawal. Role revocation denies private reads and accepted-command retries immediately.

Applied migration `20261016032536_destination_experiences` to selected Iguapass via the Supabase plugin and regenerated types. Hosted `scripts/verify-experiences.sql` passed draft creation, invalid translations/link denial, public visibility only after publication, stale withdrawal denial, withdrawal, old publish replay and revocation checks. A transient plugin request-state failure was retried once. After rollback, hosted counts confirmed zero editor assignments, experiences, commands and fixture profiles. No real privileges or content were created.

React/design review retained server-rendered catalog/detail pages and parallel independent reads. Native language fieldsets and labeled bounded fields keep editing accessible; only the form uses action state, with no new effects, dependencies or providers. The existing canopy/paper palette, Georgia headings and left-aligned destination listings are preserved. Public queries explicitly filter published records even for editors who can read drafts. Provider links use noopener/noreferrer and never trigger server fetching.

Manual browser verification: the existing Pollar session restored into the operator portal and saw the correct no-assignment notice; Lisbon's public page showed its real empty experience catalog and unconfirmed-reservation notice. No draft/publish browser workflow with an assigned real editor is claimed. Real content/editor acceptance and independent-connection races remain pilot gates. Internal booking inquiries and city-pass configuration are pending. No deployment performed.

Advisors: no new warning/error or missing foreign-key index finding. Two intentional private-table default-deny INFO notices were added for destination editors and immutable experience commands; existing password-protection WARN and development unused-index/Auth connection INFO notices remain. Remediation references are recorded above. Design, provisioning and limitations: [DESTINATION_EXPERIENCES.md](DESTINATION_EXPERIENCES.md).

## Global destination context — 2026-10-16

Passed: typecheck, 26 unit tests, 210 embedded PostgreSQL assertions, production Webpack build and all 44 desktop/mobile Playwright cases. The first unit run exposed an unresolved application alias in the pure navigation module; changing that import to a relative path resolved it before the successful full run. New coverage verifies selected city persistence, HttpOnly/SameSite preference attributes, root discovery without Iguazú leakage, path-preserving language changes, scoped routes/rewards, the global passport note, restoring Iguazú, unknown-cookie fallback and server rejection of a forged unknown-city form submission. Credential query parameters are excluded from language links.

No database schema, memberships, reviewer/editor assignments or payments changed. A Supabase plugin read confirmed the existing eight destinations/four countries. Hotel reads now additionally scope reservations/submissions through selected-city organizations; merchant reads scope organizations/history to that city. The existing database denial/replay suite remains passing. Authenticated multi-city organization browser flows with real authorized hotel/merchant accounts remain a pilot gate, not a claimed acceptance result.

React/design review retained server components, request-cached registry/context reads, parallel independent queries and the existing Iguazú illustration. The compact selector uses existing mist/canopy colors and native labeled controls; only pending form state and locale-aware links run client-side. CityPassport header/footer/metadata and new copy are localized. Other destinations share the same source-backed destination component and display actual empty states. No fabricated city illustrations, listings, routes, rewards or backend persistence were added. See [DESTINATION_CONTEXT.md](DESTINATION_CONTEXT.md). No deployment performed.

## Private experience inquiries — 2026-10-16

Passed: typecheck, 29 unit tests, 256 embedded PostgreSQL assertions, production Webpack build and all 48 desktop/mobile Playwright tests. New SQL coverage verifies derived traveler/destination ownership, no identity in projections, direct-table denials, traveler isolation, separate catalog/inquiry scopes, no hotel access or self-assignment, destination queue scope, party/date/text/consent limits, per-user 24-hour quota, stale/replay/changed-payload denial, cancellation/closure, harmless response replay after cancellation, immutable command history and immediate revocation. Unit tests add schema bounds and public experience-reference preservation across language changes without forwarding credentials.

Applied `20261016035708_experience_inquiries` to selected Iguapass through the Supabase plugin and regenerated types. Hosted `scripts/verify-inquiries.sql` passed creation, consent/count denial, private history, profile-ID omission, cross-user isolation, assigned inbox, no hotel access, stale response denial, response/cancellation replay and revocation. A transient plugin request-state failure was retried once. Post-rollback counts showed zero inquiry agents, requests, command records, fixture profiles and published/test experiences. No real response was sent or role assigned.

Browser coverage verifies forged-session denials for traveler history/detail and destination inbox, absent response controls, all three localized headings and refusal to create a request for an unknown/unpublished experience. The full real traveler/agent request-response browser workflow with verified published content remains unverified, as do independent-connection races and privacy retention/deletion procedures. No email or booking/payment integration is claimed.

React/design review kept server-rendered read pages, bounded/paginated queues and parallel independent reads. Only action forms use client action state; no new effects, SDKs or dependencies were introduced. Native labeled fields, explicit consent, pending/disabled actions, plain-text rendering and the existing canopy/paper palette are retained. All new visible copy is in ES/EN/PT dictionaries. Details: [EXPERIENCE_INQUIRIES.md](EXPERIENCE_INQUIRIES.md).

Advisor review: no new warning/error or missing foreign-key index finding. Three intentional private-table default-deny INFO notices were added; existing Supabase password-protection WARN and development unused-index/Auth connection INFO notices remain. Remediation links are recorded above. No deployment performed.

Manual live browser check: the existing Pollar session restored at `/es/inquiries` and loaded the actual zero-inquiry history, all-destination note, localized status filter and explicit unconfirmed-reservation notice. No test request or message was added for the screenshot.

## Authorized persistent demo and authenticated inquiry acceptance — 2026-10-16

User explicitly allowed demo database data. Applied `20261016041344_isolated_demo_experiences` to selected Iguapass through the Supabase plugin and regenerated types. Published one multilingual Lisbon demonstration using `scripts/demo/seed-lisbon.sql`; executing it twice retained one record and one seed audit event. No provider link, real offer, organization or staff permission was created. Real experiences remain separate from the demo section.

Passed: typecheck, 29 unit tests, 266 embedded PostgreSQL assertions, production Webpack build and all 50 desktop/mobile browser tests with `TEST_DEMO_SEEDED=1`. New SQL assertions cover immutable classification/key, no provider links, caller metadata denial, safe demo editing/publication and immutable inquiry classification derived from its experience. One new guard test initially tried to edit a published fixture and hit the existing withdraw-first rule; the fixture was corrected to draft before testing the provider-link guard. Hosted `scripts/demo/verify-isolation.sql` passed classification/key/link denial checks and rolled its temporary row back.

Real authenticated browser acceptance now verified for demo inquiry creation, persisted private detail and owner cancellation through normal server actions. The existing Pollar account used fictional content only, including an explicitly demo question. Hosted aggregates confirmed one demo experience/inquiry, zero real experiences/inquiries and zero agent assignments. The live request retained its immutable demo marker. This validates the traveler workflow with a demo fixture; real content, assigned-agent responses, funded payment and independent-connection concurrency remain separate pilot gates.

UI review verified separate demo discovery, notices on detail/create/history, demo-only consent/button wording and no provider action. Classification persists in database history rather than relying on a title prefix. Existing RLS and role scopes remain unchanged. Advisor review returned no new warning/error or missing foreign-key index finding; prior intentional private default-deny INFO notices and pre-existing password/unused-index/Auth-connection notices remain. No deployment performed. See [DEMO_DATA.md](DEMO_DATA.md).

After cancellation, the detail page was reloaded. Pollar restored the application session and the page showed the persisted `cancelled` state with its demo notice and fictional request details. A hosted aggregate confirmed `version=1`, `is_demo=true`, a verified Pollar owner and exactly two accepted command records (create/cancel). Seed execution retained exactly one seed audit event.

## Destination guides — 2026-10-16

Added 28 attributed editorial ideas across seven non-Iguazú destinations, translated into ES/EN/PT. Verified the actual destination registry → city page / saved-city exploration → guide render → category links / GET search → translated results flow. Source links remain external discovery references, separate from published operator experiences and demos.

- TypeScript: passed.
- Unit: 35 passed, including malformed filter input, accent-insensitive search and unknown/prototype slug isolation.
- Embedded PostgreSQL: 266 assertions passed; no schema or remote changes.
- Production build: Webpack passed; default Turbopack hit the environment’s process/port restriction.
- Playwright: 70 passed across desktop and mobile using a fresh port-3100 server and temporary config at `/private/tmp/citypass-guide-playwright.config.mjs`. Flags: `TEST_SUPABASE_CONFIGURED=1 TEST_DEMO_SEEDED=1 TEST_POLLAR_CONFIGURED=0`; sign-in is disabled in this build, so this does not verify live Pollar login. All seven guides, correct source domains, filters, accent-insensitive search, empty recovery, language switching and saved-city exploration passed.
- Desktop and 390px mobile screenshots reviewed. Corrected a shared footer style affecting the guide source note.

These are source-reviewed static guides, not a live tourism sync. No deployments, database migrations, provider availability checks or partnership approvals were performed. Existing hosted authenticated multi-user and independent-connection pilot requirements remain pending.

## Iguazú-style destination redesign — 2026-10-16

All seven other city guides now reuse the existing Iguazú place grid and compact mobile row styling. Original server-rendered SVG vignettes replace category-only icons; city hero artwork distinguishes San José, Porto and São Paulo from the other cities in their countries. Added eight source-reviewed places (36 total) with ES/EN/PT copy and attribution. Native SVGs are explicitly editorial illustrations, not site photographs. No source photos, database records or client-side artwork dependencies were added.

Passed: `npm run typecheck`, `npm test` (35), `npm run test:db` (266 embedded PostgreSQL assertions), `SWC_NATIVE_BINDING_CACHE=/private/tmp/iguazu-swc-cache npm run build -- --webpack`, and `TEST_SUPABASE_CONFIGURED=1 TEST_POLLAR_CONFIGURED=0 TEST_DEMO_SEEDED=1 npm run test:e2e -- --config /private/tmp/citypass-redesign-playwright.config.mjs` (70 desktop/mobile tests). The isolated browser server used port 3101, while the user preview stayed on 3100. Screenshots for all seven cities were generated at `/private/tmp/citypassport-{slug}-redesign-{desktop|mobile}.png`; desktop and compact mobile layouts were visually reviewed. No horizontal layout or text clipping was observed.

The existing source/authentication/pilot limitations still apply. This verifies public browsing against the registry and fail-closed guest states, not authenticated hosted workflows or concurrent database connections. No deployment performed.

## Destination passes — 2026-10-17 local verification

Typecheck, 37 unit tests, 288 embedded SQL assertions, Webpack production build, three native Rust contract tests and the optimized WASM build passed. Stable production browser run on isolated localhost:3017: 96 passed, 2 skipped (demo fixture). Pollar expectations reflected the unapproved origin; funded wallet checkout was not tested. Default Turbopack build was blocked by sandbox worker-port restrictions. No remote migration or deployment was performed. See DESTINATION_PASSES.md for source coverage and remaining hosted, funded and contract synchronization gates.

CityPass treasury follow-up (2026-10-17): typecheck, 38 unit tests, 302 embedded SQL assertions and Webpack build passed. Public testnet account read confirmed the owner-supplied receiving wallet exists with an authorized USDC trustline. Tests prove private treasury denial, recipient spoofing rejection, provenance/price constraints, fulfillment and replay resistance. No transfer, remote migration or deployment was performed.

Treasury browser validation: 96 passed, 2 demo tests skipped on stable production port 3017, including the CityPass recipient address and proposed-benefit disclosures. The existing localhost:3000 preview was preserved. Pollar sign-in is expected unavailable on the unapproved test origin; real signing remains unverified.

## Landing destination-pass details — 2026-10-17

Typecheck, 38 unit tests, 302 embedded PostgreSQL assertions and Webpack production build passed. Final browser suite: 102 passed, 2 demo tests skipped, using stable production port 3017 with Pollar sign-in expected unavailable on the unapproved origin. New ES/EN/PT desktop/mobile checks cover all eight city prices and reputation awards, shared benefits and wallet, tier thresholds, no horizontal overflow and direct links to the corresponding destination-pass section. Desktop English and mobile Spanish section screenshots were visually inspected. No migration or deployment was performed for this UI change.

## Pass UI simplification — 2026-10-17

Typecheck, 38 unit tests, 302 embedded SQL assertions and Webpack production build passed. Final stable-build browser run on isolated localhost:3017: 102 passed, 2 demo tests skipped. Pollar sign-in remained expected unavailable on that unapproved origin. The focused pass suite also passed 8/8 desktop/mobile checks on port 3018. New checks cover collapsed country selection, keyboard Enter/Space toggling, per-destination links/prices, expandable conditions/tier rules, recipient-address absence, localization and viewport overflow. An initial focus-only keyboard test ran before the page settled; it was replaced with an explicit click/open assertion followed by locator-targeted keyboard toggles, then the complete suite was rerun successfully.

Visually inspected compact English desktop landing, Spanish mobile landing and desktop destination section screenshots. The local localhost:3000 preview was restarted with the verified build. No database or contract deployment, payment rule or recipient configuration changed. Authenticated funded checkout and reputation-account acceptance retain the previously documented integration gates.

## Expanded pass details spacing — 2026-10-17

Typecheck, 38 unit tests, 302 embedded SQL assertions and Webpack production build passed. Full browser suite: 102 passed, 2 demo tests skipped on isolated production port 3017. Screenshot review then identified inherited two-column `dl` tracks and open-summary margin affecting the new panel; explicit single-column tier tracks and zero open-summary margin corrected them. Rebuilt and reran the focused pass suite: 8/8 passed in ES/EN/PT on desktop/mobile, including side-by-side versus stacked geometry, tier-row order and expanded-state overflow. Final Spanish desktop/mobile expanded screenshots were visually inspected. Local localhost:3000 preview restarted with the final build; no deployment or payment rule changed.

### Pilot purchase recovery — 2026-10-17

- TypeScript and 42 unit tests passed, including durable-submit recovery under lost broadcast and lookup responses, no broadcast before durable recording, anonymous submission denial and validated StellarExpert URLs.
- 308 embedded PostgreSQL assertions passed. New assertions cover owner-only pending/submitted/confirmed history, activation state, anonymous denial and receipt recovery after offer withdrawal.
- Hosted `scripts/verify-passes.sql` rollback suite passed on Iguapass: existing merchant checkout protections, automatic Pollar passport activation, activation replay, pass-order reuse, fixed 100-USDC pricing and private purchase-history isolation. No funds moved and no fixtures persist.
- Supabase advisors reported only default-deny private-table information notices and the existing unused Supabase password-auth warning; no new public-table RLS finding.
- Production Webpack build passed. Default Turbopack build failed on a subprocess port sandbox restriction, including an escalated attempt; no source compilation issue was reported by Webpack.
- StellarExpert's testnet API returned the configured treasury account and zero payments. Funded acceptance remains pending.
- Remote treasury provisioning was rejected by automatic approval review for missing explicit all-destinations operational-record approval. No offers are published, no deployment occurred, and the activity contract remains unconnected.
- Full public/browser regression: 102 passed, two optional demo tests skipped, desktop/mobile against the fresh Webpack production server on isolated port 3017 (`TEST_SUPABASE_CONFIGURED=1`, `TEST_POLLAR_CONFIGURED=0`). This does not verify authenticated wallet signing. Existing port-3000 process was preserved.
- `node --import tsx scripts/test-pilot-provisioning.ts` passed in isolated embedded PostgreSQL: all eight proposed offers match locale dictionaries and fixed rules, public catalog RPC discovery works, repeat provisioning refuses to overwrite, and no holdings exist. The proposal script was not executed against Supabase.

### Published CityPass testnet pilot — 2026-10-17

- Owner confirmed the CityPass wallet and selected pilot passes without venue perks. Treasury migration passed automatic approval review with that additional authorization; eight pilot offers are now published only in the selected Iguapass development project.
- Hosted catalog RPC returned one offer per destination. SQL checks confirmed eight matching testnet treasuries, eight fixed-price/fixed-award published offers, zero treasury staff grants, private treasury RLS/no anonymous SELECT, no client offer INSERT, and the public invoker wrapper intact.
- A read-only Horizon account lookup confirmed receiving capacity for 100 official testnet USDC. Hosted rollback verification passed against a published offer, including the approved CityPass payout assertion, activation, retry reuse and cross-user history isolation. No payment was broadcast.
- TypeScript, 42 unit tests, 308 embedded PostgreSQL assertions, isolated provisioning validation and Webpack production build passed.
- Browser regression: 102 existing tests passed, two demo tests skipped. The six new localized offer tests initially used an overly broad shared CSS selector; after correcting it to assert the exact sale-pending message, the complete focused pass suite passed 14/14 on desktop/mobile, including all six new tests. Application code was unchanged by that test correction.
- Refreshed the local production preview on localhost:3000, the approved Pollar origin. No app or contract deployment occurred. Funded signing/settlement and independent-connection concurrency remain unverified.

### Reported purchase button — 2026-10-17

Authenticated browser reproduction showed that `Review wallet purchase` submitted the server action and then displayed `You cannot pay your own receiving wallet`. The source wallet equaled the configured CityPass treasury. This was not a successful or silently completed purchase. The UI now detects that account and offers `Use another Google account`. Actual browser interaction verified server session revocation, Pollar logout and replacement with Google sign-in. The user selected another Google/Pollar identity as the intended buyer; login and signing require the user.

Server redirect is covered by a test proving framework navigation exceptions are not swallowed. Payer preflight checks exact USDC issuer, authorization and spendable balance after selling liabilities; additional tests deny insufficient/frozen/wrong-issuer balances. No self-payment rule was relaxed. Public pass titles/descriptions were updated only for the eight approved CityPass treasury-backed offers. Pricing, awards, payout and network were unchanged. Network/test-asset information moved into transaction and wallet details; this does not convert testnet assets into real-value mainnet assets.

Final automated checks: TypeScript, 46 unit tests, 308 embedded PostgreSQL assertions, provisioning validation, Webpack production build and 108 desktop/mobile tests passed; two optional demo tests skipped. Current configuration uses testnet Pollar credentials and has no mainnet RPC. No funded payment was executed or claimed verified.

Google sign-in recovery now surfaces provider progress/error state and supplies a user-clicked opener if the browser blocks the initial OAuth popup. It uses the SDK's supported `openAuthUrl` strategy; no session URLs, tokens or provider error payloads are logged. Account switching awaits Pollar logout as well as application-session revocation. Production presentation changes also remove the home-page test-network badge and pilot wording in rewards/privacy copy; factual network/test-asset disclosure stays in expandable payment details. The live browser returned to the receiving account after Google sign-in, so no distinct-buyer purchase or wallet signature is claimed verified.

Final post-copy/OAuth regression passed: 108 desktop/mobile tests, two optional demo tests skipped, against the stable final build on isolated port 3017. TypeScript, 46 unit tests and production Webpack build passed after the last source/copy edits. Network descriptions on the home wallet section, wallet page and merchant workspace are now expandable details. The unavailable-reward message remains explicit. The final localhost:3000 screenshot shows the receiving-account guard and `Use another Google account`; no distinct-buyer checkout, signature, transfer or confirmed receipt was performed.

### Live receipt recovery — 2026-10-17

The buyer funded its wallet and signed an actual 100-testnet-USDC payment. RPC reported SUCCESS at ledger 5248819. Independent envelope verification matched the bound payer, approved CityPass recipient, exact USDC issuer/amount, hash memo and time bounds. The confirmed fee-sponsored transaction's `createdAt` value was decimal text even though the installed SDK's type declaration says number, causing the old integer check to reject valid settlement.

The boundary now normalizes only validated decimal epoch seconds (or safe positive integers) and fails closed on malformed/unsafe timestamps, changed hashes, invalid ledgers, failed success codes and mismatched memo. Added a generated fee-bump regression fixture with text timestamps and denial cases; no user's transaction data was committed as a test fixture. The original real transaction was also verified locally through the corrected helper.

After serving the corrected build, the existing authenticated checkout reconciled and the buyer's Chrome passport displayed San José acquired, the confirmed purchase, 80 reputation and Mid tier. Hosted queries independently confirmed a single holding, a verified receipt at ledger 5248819 and exactly 80 points for that checkout. No second payment was sent and no direct receipt/ledger write or forged user session was used. TypeScript, 47 unit tests, 308 embedded SQL assertions, Webpack build and 108 browser tests passed; two optional demo tests skipped. This verifies one live funded Pollar flow; it does not establish multi-connection race safety, mainnet readiness or contract synchronization.

### Pass and passport typography — 2026-10-17

Scoped styles now distinguish serif section headings from smaller sans-serif subheadings and supporting copy. The passport separates holdings and history, aligns amounts, displays localized purchase dates/status and gives receipt/explorer links separate actions. Updated supporting copy in all three locales. No settlement, pricing or award behavior changed.

Visually inspected destination-pass screenshots at desktop/mobile sizes and the real buyer's authenticated Chrome passport with the confirmed San José purchase. Saved local evidence to `/private/tmp/citypass-destination-typography.png` and `/private/tmp/citypass-passport-typography.png`. Authenticated mobile history was not visually inspected. TypeScript, 47 unit tests, Webpack production build and 108 desktop/mobile browser tests passed; two optional demo tests skipped. The unchanged database suite had passed 308 assertions during the preceding receipt fix.

Follow-up to two browser comments: separated fulfillment and exclusions from the long published description, which remains accessible through a native details/summary control. The guide now omits its repeated city introduction and uses a restrained section heading and search label. Visually inspected both updated blocks in the browser and the mobile pass screenshot; opened/closed the full-description disclosure successfully. Evidence: `/private/tmp/citypass-pass-comments-after.png`, `/private/tmp/citypass-guide-comments-after.png`. TypeScript, 47 unit tests, 308 embedded DB assertions, Webpack build and 108 desktop/mobile browser tests passed; two optional demo tests skipped. No hosted database mutation or deployment occurred.

### Passport entry points — 2026-10-17

All creation CTAs in the header, home and Iguazú guide share the same server-verified session/account decision. Anonymous visitors go to localized `/login`, active travelers open `/passport`, and only a known inactive account sees activation. Account lookup failure does not advertise creation to an authenticated user. The login screen explains that Google supports both registration and existing accounts, and redirects verified sessions to their passport. Login completion refreshes the full document so account-dependent navigation cannot retain an anonymous label across the redirect.

Unit checks cover anonymous access without private lookup, active/inactive accounts, unavailable account data and the authenticated login redirect. TypeScript, 52 unit tests, 308 embedded DB assertions and Webpack build passed. Browser inspection with a real active session found zero creation links and four passport links on home, correct Iguazú guide links and a redirect from login to passport. Local visual proof: `/private/tmp/citypass-active-passport-cta.png`. No synthetic authenticated cookie, new permission grant or deployment was used.

Final browser regression passed 114 cases on desktop/mobile, with two optional demo skips. Added three localized anonymous/invalid-session navigation cases; they verify every creation CTA destination and the account-access screen. A first test assertion omitted the intentionally hidden mobile header; including hidden links correctly checks all four CTAs. The real buyer's refreshed Chrome header also displays `Open my passport`. The Google identity-provider flow was not repeated with new credentials in this change; existing verified Pollar credentials restored the browser session during inspection.

### Active passport workspace — 2026-10-17

Reorganized the authenticated passport around collected stamps, acquired passes and receipt history. The static identity cover uses the actual activation date and database counts/reputation; the interactive sample remains for anonymous visitors. Pending checkout states cause the history disclosure to default open. All new visible copy is localized; no backend/payment rules changed.

Browser verification covered a real empty active account at desktop and 390px width, with no horizontal overflow, and the buyer account showing two acquired passes and 160 reputation. Opened its history and verified both confirmed purchase rows, receipt links and StellarExpert transaction links, then collapsed it. Mobile viewport override was reset. Evidence: `/private/tmp/citypass-passport-redesign-desktop.png`, `/private/tmp/citypass-passport-redesign-mobile.png`, `/private/tmp/citypass-passport-redesign-buyer.png`, `/private/tmp/citypass-passport-redesign-receipts.png`. No sample stamp was added to an active collection and no new payment was made. TypeScript, 52 unit tests, 308 embedded database assertions, Webpack production build and 114 desktop/mobile browser tests passed; two optional demo tests skipped. Positive real-stamp rendering and pending-checkout default-open behavior were not newly exercised with authenticated records in this visual pass.

### Collected-stamp passport book — 2026-10-17

The active collection now opens from a cover into destination pages built solely from the user's existing verified claims. Server-side grouping retains every claim once and preserves within-destination order, with up to four stamps per page. Each stamp uses the existing real-record detail dialog. Client state controls only opening and page navigation; it cannot issue stamps. Empty collections receive one empty first page, not a sample visit. Desktop uses two leaves and mobile one; navigation is bounded and reduced-motion styles suppress the page/cover effects.

Inspected a real empty active account in the browser, opened with click and Enter, closed and confirmed focus returned to the cover. Checked the desktop spread, 390px mobile leaf, disabled first/last navigation controls and no horizontal overflow; reset the viewport afterward. Evidence: `/private/tmp/citypass-stamp-book-cover.png`, `/private/tmp/citypass-stamp-book-detail.png`, `/private/tmp/citypass-stamp-book-open.png`, `/private/tmp/citypass-stamp-book-mobile.png`. Two data-level tests cover an empty collection and claim preservation across destination/page boundaries. Positive authenticated multi-page visual behavior remains unverified because no valid visit records were manufactured for the check.

TypeScript, 54 unit tests, 308 embedded DB assertions and Webpack build passed. An initial regression had five destination-page timeouts; the final complete run passed all 114 desktop/mobile cases, with two optional demo skips, including those five cases. No database mutation, payment or deployment was performed for this change.

## Documentation consolidation — 2026-10-21

Reviewed the working-tree routes, server actions, payment/session adapters, migration sequence, environment example, package versions, installed Pollar/Reflector declarations, and separate Rust prototype. Updated the README and technical guides to describe Pollar-only login, classic testnet USDC settlement, durable recovery, receipt-linked holdings/reputation, retired inquiry screens, provider-managed swaps, and the unconnected Reflector/contract boundaries. Older funded-payment/offer blocks above are historical; later 2026-10-17 acceptance supersedes them.

This update is documentation-only. No application code, dependency, migration, remote configuration, payment, swap, deployment, or user data was changed. Previous test counts are retained as dated evidence, not claimed as new executions. Validation for this edit is Markdown formatting plus internal link and referenced source-path checks; full functional suites, hosted authorization, and funded flows were not rerun.

Documentation checks passed: Prettier formatting for all edited guides; 123 relative links across 32 Markdown files; 33 explicit source references in the new architecture/integration/flow guides; and `git diff --check` for README/docs. All 14 migration inventory filenames also resolve to the 14 checked-in migrations. Additional product/operations edits were included in the final repeated documentation checks. No functional suite was run.


## Stellar activity deployment and application adapter — 2026-10-25

- User-authorized deployment to Stellar testnet succeeded: contract `CAMNGYB64TCHHHQGYHZZ27ZIRRFDN6PMDMSLIVXMBIZGBBI7YAZMZ54H`, protocol 29, SDK 29.0.1, optimized WASM 5,819 bytes. Public hashes and deployment transactions are in `contracts/passport-activity/testnet-deployment.json`.
- Final app SDK read confirmed the configured issuer matches the deployed issuer. No application traveler was activated or synthetic activity published to this instance.
- Separate live fixture `CBIHW5DNMCQDHGJFQRRNBGM5FVQRANLWLJD44APJKVKLK5JBNCTNSPM2` passed wallet-signed activation via the app verifier, issuer delivery, response-loss recovery, actual on-chain replay, unauthorized issuer denial and conflicting replay denial. The initial rehearsal assertion incorrectly treated a typed contract error as a rejected construction promise; corrected to inspect the SDK Result. No application DB fixture was created.
- Four native Rust tests passed. TypeScript and 80 unit tests passed, including tampered envelopes, wrong signers/network, unsupported methods, fee caps, source/session checks and partial-delivery recovery. All 308 existing embedded PostgreSQL assertions passed, including source RLS, replay and cross-tenant denial.
- General desktop/mobile browser suite: 108 passed and 8 configuration-dependent skips on isolated port 3017. Four additional focused desktop/mobile cases passed for anonymous/forged-session publishing denial and the new privacy disclosure in ES/EN/PT.
- Webpack production build passed. Next.js repeatedly interrupted the first build after changes for an existing security-upgrade notice; rerunning completed. This task does not upgrade Next.js. Turbopack's existing worker-port restriction remains documented.
- Browser static output scan checked the actual issuer, activity hash, Pollar server and bridge secrets without printing them: no values found in 71 static files. `.env.local`, dedicated issuer identity and fixture keys are ignored; secret files have mode 600.
- Disabled Next.js development Server Function argument logging after observing that the default includes sensitive action arguments. No token or signed payload is reproduced here. This prevents future argument logs; it does not erase prior local terminal history.
- Real Pollar traveler activation/publishing in the browser remains pending Google/Pollar sign-in and wallet approval. Local testnet credentials exist through the legacy publishable-key fallback; browser signing was not automated or bypassed. Mainnet, application deployment, production custody, unattended delivery, archival rehearsal and independent-connection concurrency remain unverified.

See [activity operations](ACTIVITY_CONTRACT.md) for configuration, recovery, pause/rotation and the isolated integration command.


## Automatic passport correction — 2026-10-25

Supersedes the manual activation/sync verification above. Current deployment and source hashes are in the manifest and ACTIVITY_CONTRACT.md. Issuer-sponsored passport registration requires no traveler signature; first receipt/stamp can initialize counters atomically. The UI reads confirmed chain reputation with automatic pending refresh.

The explicitly approved Iguapass development migration backfilled 2 verified profiles and 2 real pass holdings. Two independent hosted worker calls obtained only one lease; a wrong lease was denied, and the valid probe lease was released for retry without confirming or publishing anything. The real automatic worker subsequently completed all four jobs. Direct contract read returned reputation `160`, purchases `2`, stamps `0`, redemptions `0` for the existing purchaser wallet. No new purchase, payment or synthetic app event was made.

An isolated fixture of the revised WASM passed sponsored registration, issuer publishing, accepted-event recovery, real on-chain replay, unauthorized issuer denial and changed-replay denial. Four native Rust tests, TypeScript, 67 unit tests, 325 embedded PostgreSQL assertions and 112 browser cases passed; 8 optional browser cases skipped. Browser test servers disabled the real publisher. Webpack compilation/build passed after the existing Next.js upgrade reminder; the security upgrade remains separate work. Existing real-user browser checkout and QR business acceptance are not re-proven by these queue tests.


## 2026-10-25 — x402 development rail

The user explicitly approved the x402 migration on Iguapass `wafunogjrczlwvdnvyfs` and local testnet activation. Applied `20261025214214_x402_pass_purchases.sql`; enabled `X402_ENABLED=1`. No identities, offers, prices or recipient wallets were changed. Migration history generated by the connector may use its own timestamp; the local CLI-generated filename is retained.

Typecheck, 84 unit tests, 358 embedded PostgreSQL assertions, Webpack production build and 122 desktop/mobile browser checks passed (2 optional demo skips). Browser suite used isolated port 3017 with the actual migrated destination registry and published testnet pilot offers; it did not complete Pollar OAuth or a funded transaction. The application and activity worker were restarted on port 3000 afterwards.

`npm run test:x402:connected` passed hosted HTTP anonymous authorization denial, forged backend evidence denial, wrong-capability denial, nonce replay rejection and the facilitator's live Stellar testnet sponsored-payment advertisement. Database catalog inspection confirmed RLS on both private x402 tables, no anonymous/authenticated table privileges, invoker public wrappers and denied classic-helper execution. No real user/profile lookup or mutation was needed. Only transient security nonces were written by these checks.

Dedicated testnet agent account `GB5YIP5CO7573MYUDX4EMWZMPXY5L4NORJIDRB3O6FYT3PYT5V4XBTHK` was created with a protected ignored key file, funded by Friendbot and given the official testnet USDC trustline. It has not been funded with USDC or used to buy a pass. Funded facilitator settlement, authenticated hosted multi-user browser coverage, independent-connection concurrency and fully automatic unknown-hash reconciliation remain pending. Mainnet/production deployment was not performed. See [x402 operations](X402.md).
