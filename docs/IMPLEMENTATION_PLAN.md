# Implementation plan and honest status

## Current reading guide — 2026-10-21

Source/documentation review consolidates the status below; it is not a new hosted acceptance run. Earlier milestone checkboxes are historical. For current navigation see [documentation index](README.md), [application flow](APPLICATION_FLOW.md), and [integration inventory](INTEGRATIONS.md).

- Implemented: Pollar-only login/hashed app sessions, global passport, destination discovery/context, authorized QR claims, private hotel pre-check-in, merchant checkout/review, experience publishing, destination passes, recovery, and receipt-linked reputation.
- Recorded development acceptance: owner-approved treasury/eight offers, funded testnet pass with independent receipt/award recovery, later passport inspection with two holdings/160 reputation. See the dated 2026-10-17 entries and [VERIFICATION.md](VERIFICATION.md).
- Retired application feature: inquiry pages/forms/navigation; private records and RPC authorization remain. Earlier inquiry completion entries do not mean screens are still available.
- Partial integration: Pollar swap configuration/modal and a read-only quote; funded swap execution remains unverified.
- Not wired: Reflector client is installed with no runtime adapter/feed/quote. Rust activity source is undeployed and unconnected; app activation/reputation remain in PostgreSQL.
- Pending gates/features: independent-connection concurrency, authenticated multi-user/business acceptance, third-party merchant funded workflow, provider expiry/recovery, unattended reconciliation/retention, refunds, funded rewards, mainnet, and on-chain synchronization. Deployment requires explicit approval.
- Documentation deliverables: revised README/architecture; application route/flow guide; integration inventory; Stellar, Reflector, swapping, API, development/operations references; corrected superseded authentication and payment status. Documentation-only verification is recorded separately from prior functional test runs.

## CityPassport evolution — 2026-10-15

The new product brief extends this application in place. The previous milestone below remains an account of Iguazú functionality, not CityPassport completion. See [repository audit and architecture decisions](CITYPASSPORT_AUDIT.md).

- [x] Initial repository audit: stack, routing, authentication, schema, discovery, stamps, hotels, localization, APIs, environment, deployment, reuse and limitations.
- [x] Baseline verification: typecheck, 10 unit tests and 38 embedded database assertions passed during the audit.
- [x] Add four countries/eight destinations to the selected Iguapass database; data-backed directory and destination pages with scoped listings and ES/EN/PT empty states.
- [x] Add registry-validated global destination selection with persistent cookie, locale path preservation, scoped discovery/routes/hotel/merchant views, and global-passport context. Iguazú previews remain explicitly confined to Iguazú. See DESTINATION_CONTEXT.md.
- [ ] Verify authenticated multi-city hotel/merchant browser flows with real authorized organizations.
- [x] Add global traveler identity with existing-collection backfill, idempotent activation, global stamp history and automatic collection creation for validated claims; preserve collection/claim/ledger IDs and hotel authorization.
- [x] Integrate Pollar as the only application login; user explicitly approved Pollar-managed Google custody. Server verifies Pollar tokens; Supabase stores profiles and short-lived application sessions. Real browser Google sign-in, balances, receive QR and history verified. Validation: typecheck, 14 unit tests, 91 embedded SQL assertions, Webpack build, 30 desktop/mobile tests and three hosted rollback suites.
- [ ] Complete funded send/swap execution and independent settlement verification; Pollar UI is not a merchant checkout fulfillment system.
- [ ] If needed, migrate the preserved legacy Supabase identity through an explicit verified account-recovery process; never merge by matching email.
- [x] Implement testnet merchant checkout, approved-owner payout configuration, expiring QR requests, Pollar signing, RPC verification, idempotent submission/reconciliation and immutable receipts; apply migration to selected Iguapass. See MERCHANT_PAYMENTS.md.
- [ ] Verify a complete funded checkout with a real approved merchant and separate payer; add unattended reconciliation and independent-connection race checks before pilot.
- [x] Add destination-scoped merchant reviewer permissions and approval/suspension/reactivation portal, immutable history, stale-decision protection and suspension-aware submission checks. See MERCHANT_REVIEW.md.
- [x] Implement destination-assigned catalog editing, ES/EN/PT experience drafts, explicit publish/withdraw commands, public destination/detail pages, revision/replay protection and scoped RLS. See DESTINATION_EXPERIENCES.md.
- [x] Implement private experience information requests, global traveler history, separately authorized destination inbox, single responses/cancellation/closure, consent/rate limits and replay protection. See EXPERIENCE_INQUIRIES.md.
- [x] Provision a separately labeled Lisbon demo experience after explicit user authorization; add immutable demo classification and inquiry propagation. No partner or privileged role was fabricated. See DEMO_DATA.md.
- [x] Verify authenticated Pollar traveler demo inquiry creation, persisted detail, reload and owner cancellation through ordinary application actions. Assigned-agent responses and real content remain separate acceptance gates.
- [ ] Provision authorized real reviewers/editors/inquiry agents and verify their browser workflows; add city-pass configuration, analytics and staff administration.
- [ ] Add shared Soroban pass registry, issuance recovery, redemption and verified loyalty attestations.
- [ ] Complete hosted authorization, provider integration, independent-connection concurrency and authenticated browser gates before pilot release.

The destination directory slice is now implemented and its additive migration applied to the selected Iguapass project through the Supabase plugin. Verified: typecheck, 11 unit tests, 44 embedded SQL assertions, Webpack build, 28 desktop/mobile browser tests and read-only hosted integration checks. Global traveler identity and cross-destination stamp history are now implemented and applied to Iguapass; this slice passed typecheck, 12 unit tests, 69 embedded SQL assertions, build, 28 desktop/mobile tests and hosted rollback authorization/workflow checks; The Pollar wallet UI and single-login session bridge are now implemented; funded send/swap execution, a real merchant checkout acceptance test and contracts remain pending. No web deployment performed. Detailed acceptance criteria are in the audit report.

## First working source milestone

- [x] New project directory, pinned dependencies, strict TypeScript, App Router and design primitives.
- [x] Architecture, requirements, source provenance, privacy assumptions and engineering conventions.
- [x] Normalized destination/organization/passport/hotel schema, RLS and explicit privileges.
- [x] Spanish/English/Portuguese interface dictionaries and locale-aware dates.
- [x] SSR Google OAuth code, refresh proxy, callback allowlist and sign-out.
- [x] Public discovery, passport activation/history and empty states.
- [x] Visit QR issue/revoke/claim with transactional duplicate/capacity controls and persistent rate limits.
- [x] Hotel onboarding, reservations, invitation generation, guest form and review transitions.
- [x] Database authorization and replay tests against embedded PostgreSQL.
- [x] Connect the user-selected Iguapass project and apply migrations and catalog seed.
- [x] Configure callback URLs and verify real Google sign-in, passport activation and refresh persistence.
- [ ] Complete separate guest/staff browser workflows with authorized pilot identities.
- [x] Generate and integrate database types from the selected Supabase project.
- [x] Hosted Auth settings, REST denials, transactional RLS/workflow checks and security advisor review.
- [ ] Independent-connection concurrency tests.

The milestone is not declared complete until the live flows above are verified. No mock backend is substituted.

## Next slices, in dependency order

1. Connected milestone: project configuration, real tourist/hotel identities, partner approval and first authorized QR enrollment; verify complete flows.
2. Partner operations: owner-managed staff invitations/revocation, admin permissions and approval UI, guest guide, configurable fields, imports, secure invitation sessions for opened/in_progress tracking.
3. Exploration: enroll three curated routes, add provenance-aware content ingestion, route completion transactions and achievement definitions.
4. Merchant loyalty: verified purchase RPC, versioned earning rules, immutable ledger and merchant-funded reward consumption. Keep disabled until settlement/funding rules and concurrency checks pass.
5. Operator experiences: operator profiles, multilingual listings, external booking links, unconfirmed booking inquiries and manual response workflow.
6. Pilot readiness: edge throttles, privacy notices and retention jobs, backups, support, mobile camera matrix, accessibility and performance checks. Explicit deployment approval required.

### Curated Visit Iguazú directory

Implemented: 15 attributed discovery records (9 attractions/experiences, 6 agencies), multilingual original summaries, public contacts, source review dates, category filtering and accent-insensitive search. This is a manually reviewed snapshot; automatic synchronization, photo reuse, operator confirmation and official affiliation are not implemented or implied. The editorial directory supplements successful database queries, with database identity matches taking precedence. See SOURCES.md for exact coverage.

### Routes discovery

Four editorial itinerary suggestions now cover park circuits, wildlife, culture/rural visits and adventure. Each includes ordered source-linked stops, location-search links, preparation notes and agency discovery. Route selection has a stable URL; browser-local bookmarks persist across reloads and are clearly separate from stamps. Existing database route/claim rendering is retained when configured. Suggestions are not official tours, confirmed bookings, mapped directions or route awards. Hosted route progress verification remains pending.

### Rewards discovery preview

Implemented a clearly labeled upcoming-program page with three benefit concepts, browser-local interest saving/removal and filtering, future redemption explanation and FAQs in ES/EN/PT. These are proposed categories, not live merchant offers. Interests are not transmitted, synced with accounts, used as waitlist registrations or converted into bookings. No points, ledger writes, claims or redemption APIs were added. Actual reward funding, program rules and transactional redemption remain Phase 4 work.

### Multi-country passport visual refresh (2026-10-16)

Restored the original illustrated, split travel-journal composition on city discovery pages. The country atlas and passport cover link now connect Argentina, Brazil, Costa Rica and Portugal, with original SVG country vignettes, country-colored postmarks, registry-backed city links and translated ES/EN/PT copy. Iguazú retains its waterfall and original discovery flow. Illustrations are editorial impressions; source attribution, empty catalogs and the isolated demo remain explicit. Server components reuse request-cached registry reads; no persistence, authorization or database changes were introduced.

Verified: TypeScript, 29 unit tests, 266 embedded PostgreSQL assertions and 50 configured desktop/mobile browser tests. Production build succeeds with `SWC_NATIVE_BINDING_CACHE=/private/tmp/iguazu-swc-cache npm run build -- --webpack`; default Turbopack hits an environment process/port restriction. Desktop and 390px mobile visual review completed. This does not replace the existing hosted multi-user and concurrent-connection pilot gates. No deployment performed.

### Marketing home and country-first navigation (2026-10-16)

The localized home now introduces CityPassport with discovery, authorized visit stamps and invitation-based hotel pre-check-in. It remains global regardless of the saved city. `/destinations` redirects to the Spanish country picker; localized country cards open `/[locale]/destinations/{country-code}` with country-specific illustrated heroes and city choices. City discovery is at `/[locale]/explore`, and explicit city URLs remain supported. Iguazú retains its original illustrated discovery layout and source directory. Country selection validates the code against the live registry and stores only the existing destination preference cookie; it does not grant permissions.

Country colors apply through shared CSS tokens to page background, navigation, headings and actions. Explicit country/city URLs determine visual context; other application pages use the selected country. Marketing and picker pages stay neutral. A small pathname-aware client component keeps the persistent App Router layout synchronized during navigation; the server emits the initial theme. All new copy is translated in ES/EN/PT. No database migrations, remote writes or deployment were needed.

Verified: TypeScript, 32 unit tests, 266 embedded PostgreSQL assertions, production Webpack build, and 52 configured browser tests across desktop/mobile, including saved-country-neutral home, country selection, theme changes, city discovery, language navigation and returning home. Existing hosted authenticated multi-user and independent-connection pilot gates remain pending.

### Destination discovery guides (2026-10-16)

Implemented: 28 attributed editorial ideas across the seven non-Iguazú destinations, original ES/EN/PT copy, category filtering, accent-insensitive search, empty-result recovery, destination-specific preparation notes and source review dates. Explicit city pages and saved-city `/explore` share the same server component. Database venues and published/demo operator experiences remain separate; database failures still surface. The guides are editorial content rather than persisted operator listings. No database changes or deployment. Exact provenance is recorded in SOURCES.md.

Verified: `npm run typecheck`, 35 unit tests, 266 embedded PostgreSQL assertions, production Webpack build, and 70 desktop/mobile browser tests. The browser suite ran against a fresh server on port 3100 using a temporary Playwright config, leaving the existing port-3000 preview untouched; `TEST_SUPABASE_CONFIGURED=1 TEST_DEMO_SEEDED=1 TEST_POLLAR_CONFIGURED=0` matched this build (sign-in disabled). The payment scanner test now derives local checkout URLs from the active browser origin so it also works on an isolated test port. Guide coverage includes all seven cities, source attribution, ES/EN/PT language navigation, category/search recovery and saved-city `/explore` filters. Desktop and 390px mobile screenshots reviewed. Default Turbopack build encountered the existing sandbox process/port restriction; `SWC_NATIVE_BINDING_CACHE=/private/tmp/iguazu-swc-cache npm run build -- --webpack` passed. Hosted authenticated multi-user and independent-connection pilot gates remain pending.

### Iguazú-style place design across destinations (2026-10-16)

Implemented: the existing Iguazú `.places` / `.place` / `.place-art` / `.place-copy` design now renders all seven destination guides, with original SVG place vignettes, serif titles and compact mobile rows. Reused the split illustrated hero and postmark, with individual Porto, São Paulo and San José landscapes to distinguish them from other cities in their countries. Destination introductions replace generic platform copy in the hero. A passport invitation closes each city page. Search, category controls, source provenance, database venues, operator experiences and isolated demos retain their existing boundaries. No new client components, dependencies, schema, database writes or deployments.

Revisited the requested tourism websites and expanded four catalogs to six ideas each (36 total). See SOURCES.md for additional pages and illustration boundaries. ES/EN/PT copy remains in messages. Verified: TypeScript, 35 unit tests, 266 embedded PostgreSQL assertions, production Webpack build, and 70 desktop/mobile browser tests. Browser tests ran against a fresh server on port 3101 using `/private/tmp/citypass-redesign-playwright.config.mjs` with the existing configured registry/demo flags and sign-in disabled to match the local build. Reviewed desktop screenshots for all seven cities and mobile layout screenshots. Source attribution, rendered place artwork, catalog counts, search/category behavior and locale navigation passed. Authenticated hosted multi-user and independent-connection pilot gates remain pending. No deployment.

### Global CityPassport landing experience (2026-10-16)

Implemented: eight ordered landing sections, an interactive illustrated country-postcard stack, real passport/authentication entry points, registry-backed Costa Rica/Argentina/Brazil/Portugal cards with both cities, USDC wallet and checkout-scanner links, explicit unavailable-pass rows, the existing interactive sample stamp, four journey steps, merchant registration and a destination-organization access information page. The latter clearly states that it does not submit an application; authorized operators can continue to the existing workspace. Country pages use their shared country tokens, individual city artwork and localized editorial introductions. Existing Iguazú discovery remains intact. ES/EN/PT interface copy lives in messages. Existing fictional catalog/inquiry records retain their immutable classification and explicit fictional disclosure, with localized fictional-example wording instead of event/demo promotion; stored records were not modified.

Availability boundaries: there is no configured purchasable City Pass catalog, so every purchase action is disabled and duration/benefits remain unconfirmed. No prices or inclusions were invented. Wallet funding is receiving USDC; no card top-up was added. The selected wallet is testnet and is labeled accordingly. Achievements and funded rewards remain planned. No database migrations, remote writes or deployment.

Verification: TypeScript, 35 unit tests, 266 embedded PostgreSQL assertions and the production Webpack build pass. The complete 72-case desktop/mobile browser run initially found four duplicate city-link selector failures; removing duplicate links fixed all four, and all eight affected destination/landing checks passed on rerun. These include hero selection, country/city navigation, disabled purchases, Google sign-in entry points, language/theme navigation and organization access information. The default Turbopack build encounters the existing sandbox process/port restriction. Responsive checks and final visual review are recorded below when completed. Browser checks on the isolated port do not verify OAuth completion; Pollar's registered localhost origin and real user interaction are required. Existing hosted multi-user and independent-connection pilot gates remain pending.

Final responsive review: all 12 combinations of EN/ES/PT and 320/390/768/1280px pass horizontal-overflow and excluded promotional-wording checks. The hero entrance stays inside its section during animation; reduced-motion navigation is covered by browser tests. Desktop/mobile landing and Costa Rica/Portugal country screenshots were reviewed. The existing localhost:3000 preview was refreshed to the final production build, and the real Pollar Google sign-in button is enabled at that registered origin. OAuth completion, funded payments and authenticated multi-user workflows were not performed in this redesign.

### Application design alignment (2026-10-16)

Implemented: shared editorial page introductions, paper surfaces and country-aware accents across the passport, wallet, profile, scanners, guest pre-check-in, privacy, inquiry/detail and business workspace pages. Traveler account links are readable rows; organization/staff tools live in a separate disclosure with access requirements. Active desktop/mobile navigation and a horizontally scrollable journey navigation connect city discovery, routes, rewards and inquiries. Empty destination catalogs provide next actions, and localized loading, recovery and 404 screens retain the travel identity. Country discovery now follows the landing's country order and editorial introductions. Passport sign-in precedes its empty stamp history, including on mobile.

The wallet shows receiving-USDC guidance and honest network status without fabricated balances. Provider actions have distinct icons and button hierarchy; provider loading has a translated status. Merchant approval, session verification, database reads, RPCs and signing/settlement boundaries are preserved. Camera controls now reflect opening/running state, cancel pending attempts, release tracks and clear the last frame on stop/navigation. Manual checkout validation clears stale errors on editing, and guest field errors are associated with their inputs. All new copy is in ES/EN/PT messages. No dependencies, migrations, remote data changes or deployment.

Verified so far: TypeScript, 35 unit tests, 266 embedded PostgreSQL security/workflow assertions, production Webpack build and all 80 desktop/mobile browser tests. New browser checks cover navigation/access disclosure, explicit camera activation/manual fallback, stopping/navigation releasing camera resources, and Portuguese 404 recovery. Reviewed 18 routes in fresh anonymous desktop/mobile browsers; all 36 route/viewport combinations returned successfully without document overflow. Final translated narrow/tablet checks and preview refresh are recorded below. Authenticated staff content was styled from existing authorized components rather than granting test roles; full hosted multi-user, funded-payment and independent-connection acceptance gates remain pending.

Final review: checked 108 combinations of 18 routes, ES/EN/PT and 320/768px. The only detected overflow was the English country-picker heading/passport combination at 320px; a smaller, bounded heading/cover layout fixes it, with all six EN/ES/PT checks at 320/390px passing afterward. Final desktop/mobile screenshots of wallet, profile, scanning, passport, hotel entry and pre-check-in were reviewed. The four passport checks passed after prioritizing sign-in. The final ten application checks pass, including the new narrow-country test and a late camera-frame failure after restart (an old attempt cannot stop the new stream). TypeScript and the final production Webpack build pass. The complete earlier 80-case suite was green; subsequent changes were covered by these targeted reruns. The registered localhost:3000 preview was refreshed; Google sign-in remains enabled there. OAuth completion, physical-device camera behavior and authenticated staff/payment acceptance were not performed in this visual alignment pass. No deployment.

### Remove the shared destination bar (2026-10-16)

Removed the full-width “Your destination” selector from the shared layout. Destinations remains available in desktop/mobile navigation; country city-choice forms and explicit city-page selection still validate and persist the preferred city. Destination filtering, country themes and authorization are unchanged. Browser coverage now selects cities through those existing entry points and asserts that the removed bar is absent. No database changes or deployment.

TypeScript, 35 unit tests, 266 embedded PostgreSQL assertions and the production Webpack build pass. The localhost:3000 preview has been refreshed. The complete 82-case browser run passed 79 checks; three test timing failures were resolved by waiting for the city-selection redirect before reloading or navigating. All four affected desktop/mobile checks pass on rerun, including saved-city persistence and guide filtering.

### Country stamps around the hero passport (2026-10-16)

Replaced the stacked hero postcards with four illustrated country postage stamps surrounding a larger central CityPassport cover. Existing registry-backed country artwork/names/routes remain unchanged. Perforated paper edges use a CSS mask, framed artwork and decorative ink postmarks; no issued stamp, visit, value or achievement is implied. Country buttons emphasize their stamp with a restrained lift, and all four country links are now keyboard-accessible. The passport still links to the real passport/authentication page. Reduced-motion behavior is retained, with no additional dependencies, copy, database writes or deployment.

Verified: TypeScript, 35 unit tests, 266 embedded PostgreSQL assertions and production Webpack build. Reviewed hero screenshots at 1280/768/390/320px; all 12 width/language combinations pass overflow checks. Clicking the Portugal stamp opens its working country route. The full 82-case browser run passed 80 checks and exposed an incorrect success-redirect assertion in the forged-city rejection test. Removing that contradictory assertion restores the intended denied-access check; both desktop/mobile reruns pass. The local preview at localhost:3000 now serves the stamp hero. No application authorization behavior changed.

### Open passport hero spread (2026-10-16)

The hero now shows an open CityPassport with two paper pages inside a forest-green cover, a visible spine, subtle page-edge shadows and two illustrated country stamps on each page. The same registry-backed country links, selection buttons, postmarks and reduced-motion support remain. The title inside the passport links to the existing passport/authentication page. This remains editorial destination artwork, not a display of a visitor’s collected stamps. No new copy, dependencies, database writes or deployment.

Verified: TypeScript, 35 unit tests, 266 embedded PostgreSQL assertions, production Webpack build and visual review of desktop/mobile hero captures. All 12 EN/ES/PT and 1280/768/390/320px combinations pass overflow checks, and the Portugal stamp still navigates to its country route. All 82 desktop/mobile browser tests pass. The localhost:3000 preview has been refreshed with the open passport hero.

### Circular landing country seals (2026-10-16)

Changed only the landing country illustrations from arched rectangles to circles, with a subtle inner seal ring and centered country-code badge. Country and city-page artwork shapes, the hero passport stamps, copy and navigation remain unchanged. This is a CSS-only presentation change. Verified TypeScript, production Webpack build, desktop/mobile visual review and all four landing browser checks. Browser geometry checks confirm all four landing illustrations are circular and country city-card shapes are preserved. No database changes or deployment.

### Destination routes and reward proposals (2026-10-17)

- All seven additional editorial destinations now reuse their sourced discovery stops in a suggested itinerary, with preparation guidance and browser-local route saving. These are not database award routes or timed tours.
- Rewards now show destination-named proposals for every selected city. Interest storage is isolated by destination; existing Iguazú interests remain compatible. No provider, funded benefit, redemption or persistence backend is implied.
- Local verification results are recorded after checks; hosted multi-user and concurrent-connection pilot gates remain pending. No migration or deployment is needed for this editorial change.

Verification for destination routes/reward proposals: `npm run typecheck`, `npm test` (35 tests), `npm run test:db` (266 assertions), and `npm run build -- --webpack` passed. Default Turbopack build was blocked by worker port permissions. Browser suite ran against the new production build on port 3100 because port 3000 served an older instance: 90 passed, 2 demo tests skipped, 4 sign-in enablement assertions failed (Google button disabled on the alternate origin). All 14 new destination journey tests and existing route/reward tests passed. Browser-local saves and destination isolation verified; authenticated sign-in on the alternate origin is not verified.

### Inquiry UI retired (2026-10-17)

At the user's request, traveler and operator inquiry screens now return 404. Inquiry navigation, profile tools, experience request links, UI forms and their server action were removed. Experience discovery and external provider links remain. Historical private database records, RLS and RPC authorization are preserved; this change does not delete data or revoke database RPCs. Earlier inquiry implementation entries describe historical work, not a currently available app feature.

Inquiry retirement verification: typecheck, 35 unit tests, 266 embedded database assertions and Webpack production build passed. Full browser run: 92 passed, 2 demo tests skipped, 2 new tests initially failed because streamed Next.js not-found responses use HTTP 200. Corrected those assertions to verify the rendered not-found screen and absence of forms; all 4 inquiry retirement browser checks then passed on desktop/mobile, covering ES/EN/PT.

## Destination pass purchase slice — 2026-10-17

- [x] Local source: pass section per destination, existing Pollar/Stellar testnet checkout integration, immutable receipt-backed ownership and 80-point awards for a fixed 100-USDC purchase; Basic/Mid/Top thresholds 0/80/240; localized passport ownership and reputation.
- [x] Local migration: RLS/grants, authorized purchase wrapper, locks, replay and duplicate-ownership prevention. No offers/benefits/approved merchants fabricated.
- [x] Rust activity-contract prototype source with wallet activation, trusted issuer, pause, replay/subject guards and fixed reputation awards.
- [ ] Apply the new migration to the selected Iguapass development project; provision approved offers with agreed benefits and real payout ownership.
- [ ] Deploy contract only after user approval, confirm SDK/network compatibility, wire wallet activation and protected issuer delivery/reconciliation. Current app activity is database-backed, not on-chain.
- [ ] Verify funded browser purchase, hosted authorization and independent-connection concurrency. Funded reward redemption remains unimplemented.

See [destination-pass design and boundaries](DESTINATION_PASSES.md).

Destination-pass local verification completed: typecheck; 37 unit tests; 288 embedded PostgreSQL assertions; Webpack production build; three Rust tests and optimized WASM build; 96 desktop/mobile browser tests passed, two demo tests skipped. Browser run used isolated port 3017 with Pollar sign-in expected unavailable on that unapproved origin. Funded payment and live on-chain activity remain unverified.

### CityPass treasury and benefits follow-up — 2026-10-17

- [x] Local migration configures owner-authorized CityPass testnet receiving wallet `GC6RIEORZ5UF7L2KKXCZLSGMSIYY5NG6FXCKR3J5P7ZYIXSMXLX2QJKU` with explicit payout provenance and no fabricated owner identity, staff membership or third-party affiliation.
- [x] Public testnet read confirms account and authorized USDC trustline; pre-signing checks validate exact receiving capacity.
- [x] Localized proposed priority-entry, 10%–50% venue/date discounts and reputation loyalty model, explicitly pending actual venue terms.
- [x] Typecheck, 38 unit tests, 302 embedded SQL assertions and Webpack production build.
- [ ] Apply remote migrations only after deployment approval; publish real offers once specific benefits are confirmed. Funded payment and reward redemption remain acceptance gates.

Treasury browser verification completed: 96 passed, 2 demo tests skipped on isolated port 3017; funded signing remains pending.

### Landing pass details — 2026-10-17

- [x] Show one landing row per destination with 100 USDC, 80 reputation points and a direct destination-pass link.
- [x] Share proposed benefits, tier thresholds and CityPass recipient across landing/destination pages; localized ES/EN/PT with responsive layout.
- [x] Typecheck, 38 unit tests, 302 embedded SQL assertions and Webpack production build passed.
- [x] Landing browser verification: 102 passed, 2 demo tests skipped; all three languages, desktop/mobile, direct destination-pass navigation and screenshot inspection.

### Pass UI refinement — 2026-10-17

- [x] Compact country-based landing selection, shared price/points summary, three short benefit previews and expandable conditions/tier rules.
- [x] Remove recipient block/raw wallet from pass presentation and checkout; preserve payment verification and configured treasury.
- [x] Compact passport reputation display and expandable checkout technical details; localized ES/EN/PT.
- [x] Typecheck, 38 unit tests, 302 embedded SQL assertions and Webpack production build passed.
- [x] Final pass refinement browser checks: 102 passed, 2 demo tests skipped; focused pass suite 8/8; desktop/mobile screenshot review; refreshed local production preview on localhost:3000.

### Expanded pass details layout — 2026-10-17

- [x] Full-width desktop benefits/reputation columns with labeled Basic/Mid/Top ranges; stacked mobile layout and tighter heading spacing, shared by landing and destination pages.
- [x] Typecheck, 38 unit tests, 302 embedded SQL assertions and Webpack production build passed.
- [x] Full browser regression: 102 passed, 2 demo tests skipped; final CSS inheritance fixes rebuilt and verified with 8/8 focused pass tests plus expanded desktop/mobile screenshot review. Local preview refreshed.

### Purchase recovery and pilot activation wiring — 2026-10-17

- [x] Destination offers gate checkout through sign-in and persisted passport activation. Pollar session creation already activates the database passport automatically; the activation action remains available for legacy inactive accounts. UI explicitly distinguishes database activation from public blockchain activity.
- [x] Owner-only, bounded purchase history (latest 20), checkout recovery after navigation, receipt links, and StellarExpert transaction/ledger links. Submitted transactions never grant holdings or reputation.
- [x] Duplicate payment clicks are guarded immediately; signing/submission progress is localized. A lost broadcast/lookup response retains the durable submitted state for reconciliation.
- [x] Applied `destination_pass_purchases` and independent `pilot_purchase_recovery` migrations to the selected Iguapass development project only. Hosted rollback checks prove activation, purchase creation/reuse, fixed price, anonymous denial and cross-user isolation. No test order persists or blockchain payment is broadcast.
- [x] StellarExpert read of the configured testnet treasury succeeded; it reported zero payments. This is not evidence of wallet control or funded checkout acceptance.
- [ ] **Treasury provisioning blocked by automatic approval review.** The existing `citypass_destination_treasury` migration creates CityPass seller/treasury records for all eight destinations. It was rejected for missing explicit approval of those operational records and scope. It remains unapplied remotely; local migration remains reviewable. No workaround was executed. Recovery was separated into an independent read-only account capability and applied without changing seller/payment configuration.
- [ ] Offers remain unpublished. Pilot needs a product decision: testnet pass ownership/reputation only, or concrete confirmed venue benefits. Priority entry and discounts remain proposals.
- [ ] Funded Pollar browser purchase, independent-connection concurrency, and multi-user authenticated browser checks remain required before pilot launch. No app or contract deployment was performed. Activity contract remains a separate unconnected prototype.
- [x] Final checks: 42 unit tests, TypeScript, 308 embedded PostgreSQL assertions, Webpack production build, and 102 desktop/mobile browser tests passed (two optional demo tests skipped). Browser suite used isolated port 3017 and preserved the existing port-3000 process. Configurable `TEST_PORT` supports this isolation.
- [x] Prepared `scripts/provision-pilot-passes.sql` for explicit approval: eight destination offers at 100 testnet USDC, +80 confirmed-purchase reputation, no venue benefits or real-money sale. Localized offer copy comes from `messages/{es,en,pt}.json`. The script refuses an existing catalog and unexpected destination/recipient scope. It has not been run remotely.

### Pilot offers enabled in development — 2026-10-17

This supersedes the treasury-approval and unpublished-offer status in the previous section.

- [x] Owner selected pilot test passes with no promised venue perks and explicitly confirmed the CityPass recipient `GC6RIEORZ5UF7L2KKXCZLSGMSIYY5NG6FXCKR3J5P7ZYIXSMXLX2QJKU`. Automatic approval review accepted the treasury migration with this additional authorization.
- [x] Applied `citypass_destination_treasury` and ran `scripts/provision-pilot-passes.sql` on the selected Iguapass development project. Eight published localized offers route to the approved testnet recipient; no staff memberships or third-party affiliations were created.
- [x] Read-only Horizon preflight confirmed capacity for 100 official testnet USDC. Public catalog RPC returns one published offer for each of the eight destinations. Hosted rollback purchase checks passed using an actual published offer and asserted its CityPass recipient; no order survives and no funds move.
- [ ] Funded Pollar browser acceptance and independent-connection concurrency remain pilot gates. App and contract deployments remain unperformed.
- [x] Publication verification: TypeScript, 42 unit tests, 308 embedded SQL assertions, provisioning validation and Webpack build passed. Browser checks passed: 102 existing regression tests plus all six new localized pilot checks (14/14 focused pass tests after correcting a shared-selector assertion). Refreshed localhost:3000 preview.

### Purchase action diagnosis and buyer account switching — 2026-10-17

- [x] Reproduced the reported button in the authenticated browser. The request returned `self_payment`: the connected Google/Pollar wallet was the configured CityPass receiving wallet. No checkout or payment was created. Self-payment denial remains enforced in PostgreSQL.
- [x] Detect the receiving account before showing the purchase form; offer an inline Google/Pollar account switch. Verified actual logout and return to Google sign-in in the user's browser. User chose a different Google/Pollar account as buyer; selecting/authenticating that account remains a user step.
- [x] Purchase action now redirects on the server to the created checkout, outside its error handler. Added tests that prove navigation is not swallowed, anonymous requests do not create orders, and self-payment stays denied.
- [x] Removed pilot branding and prominent test-network labels from destination/checkout presentation. Updated all eight catalog descriptions and the provisioning source from localized dictionaries. Actual payment network and test-asset disclosure remain accessible inside transaction/wallet details; configured Pollar key, asset issuer and all settlement verification remain testnet.
- [x] Preflight buyer USDC availability checks the exact issuer, authorization and selling liabilities. Clear localized errors explain insufficient USDC or a Stellar account needing XLM activation. No alternate asset conversion or mainnet support is implied.
- [x] TypeScript, 46 unit tests, 308 embedded PostgreSQL assertions, isolated provisioning checks, Webpack production build and 108 desktop/mobile browser tests passed (two demo tests skipped). Refreshed localhost:3000.
- [ ] Buyer Google selection, wallet signature and funded receipt acceptance remain pending. Current local configuration has a testnet Pollar key and no mainnet RPC configuration. No production deployment or funds transfer was performed.
- [x] Google sign-in has visible progress/error states and a manual opener for blocked popups using the supported SDK OAuth opener. Removed remaining home-page test-network badge and pilot language in rewards/privacy presentation; retained factual network details and unavailable-reward boundaries.
- [x] Final post-OAuth/copy regression: 108 browser tests passed, two optional demo tests skipped. The receiving-account guard is visually verified on localhost:3000; current session remains the receiving identity. Distinct-buyer login and wallet approval remain user steps.

### Funded payment confirmation recovery — 2026-10-17

- [x] Independently checked the reported payment on Stellar RPC: SUCCESS, ledger 5248819, exact 100-USDC issuer/recipient/payer and checkout memo. The payment was a Pollar fee-sponsored envelope.
- [x] Fixed RPC boundary normalization: `createdAt` can be decimal text at runtime despite the SDK number declaration. Strict Zod validation accepts safe positive integer seconds, rejects malformed/unsafe values and retains signature/hash/amount/asset/memo/expiry checks. Fee-bump success also requires inner transaction success.
- [x] Recovered the existing submitted checkout through the application's authenticated reconciliation path after refreshing the local server. Hosted verification confirms one receipt, exactly one pass and 80 reputation points. The actual buyer's Chrome passport displays the San José holding, confirmed purchase and Mid tier. No new transaction, direct ledger write or duplicate award was used.
- [x] TypeScript, 47 unit tests, 308 embedded PostgreSQL assertions, Webpack production build and 108 desktop/mobile browser tests passed (two optional demo tests skipped). Live funded signing/submission/receipt fulfillment is now verified for this purchase. Independent-connection concurrency and on-chain activity-contract synchronization remain pending.

### Pass and passport typography — 2026-10-17

- [x] Refined section headings, smaller sans-serif subheadings and restrained description widths. Shortened supporting copy in Spanish, English and Portuguese.
- [x] Separated acquired passes from purchase history; purchase rows now align amount, date and status, with distinct receipt and explorer actions.
- [x] Visually reviewed the destination pass on desktop/mobile and the authenticated buyer's passport with the confirmed San José purchase. TypeScript, 47 unit tests, Webpack build and 108 browser tests passed (two optional demo skips). No payment or database rules changed.
- [x] Follow-up browser comments: replaced the dense offer paragraph with a concise fulfillment summary and separate visible exclusions, keeping the published full description in an accessible disclosure. Removed repeated city introduction from the guide; reduced guide title/search-label hierarchy. Localized new copy in all three languages. Rechecked desktop/mobile pass presentation, disclosure interaction and 108 browser cases; TypeScript, 47 unit tests, 308 embedded DB assertions and Webpack build passed.

### Passport entry points — 2026-10-17

- [x] Replaced all creation CTAs in the shared header, home and Iguazú guide with one server component. Verified sessions use the database-backed active state: active users open their passport, known inactive users receive activation, and anonymous visitors reach a dedicated account-access screen.
- [x] Added localized account creation/login guidance and redirect existing sessions from `/[locale]/login` to their passport. Login completion reloads the account-dependent shell to prevent stale anonymous navigation after session exchange.
- [x] Real browser inspection confirmed zero creation links and four passport-access links on the active account's home page, plus correct Iguazú guide links and authenticated login-route redirect. No synthetic authenticated session was used. TypeScript, 52 unit tests, 308 embedded DB assertions and Webpack build passed.
- [x] Final regression: 114 desktop/mobile browser tests passed, two optional demo tests skipped. Anonymous/invalid-session CTAs reach login in Spanish, English and Portuguese; the real buyer's refreshed Chrome header now displays passport access. Preview updated on localhost:3000.

### Active passport workspace — 2026-10-17

- [x] Active accounts now prioritize the stamp collection and destination passes, with a compact identity cover, actual activation date, counts, reputation and current destination alongside them. Scan QR is available in the page header. The interactive sample remains in the anonymous presentation.
- [x] Acquired passes have individual receipt links. Purchase history is an accessible disclosure, defaulting open when an unfinished checkout exists; transaction/explorer recovery links remain available.
- [x] Reviewed a real empty account at desktop and 390px mobile width (no horizontal overflow), then the buyer account with two passes/160 reputation and its receipt/explorer history. No new stamps, purchases or reputation were created. TypeScript, 52 unit tests, 308 embedded DB assertions, Webpack build and 114 browser tests passed (two optional demo skips). Preview updated locally.

### Collected-stamp passport book — 2026-10-17

- [x] Replaced the active collection's static empty block with an opening passport cover and paper pages. Verified visit claims are grouped by destination, four per page; each stamp retains its actual name/date and detail dialog. Desktop shows two leaves and mobile one, with bounded pagination and close-to-cover focus restoration. Purchased passes remain their own records below the book.
- [x] The empty collection has one clearly empty first page. The active book has no sample-stamp action or fabricated visits. Anonymous sample behavior remains separate. Added localized labels and reduced-motion styles.
- [x] Browser-verified a real empty active account: click/keyboard opening, closing/focus restoration, desktop spread, mobile leaf, disabled boundary controls and no horizontal overflow. Tests prove preservation/order of claims across destination grouping and page breaks. Positive authenticated multi-page stamp records were not created for visual testing.
- [x] TypeScript, 54 unit tests, 308 embedded DB assertions, Webpack build and final 114 browser tests passed (two optional demo skips). The first regression had five destination-page timeouts; all five passed in the complete final rerun. Preview updated on localhost:3000.


### Stellar testnet activity deployment — 2026-10-25

This supersedes earlier entries describing the activity contract as undeployed or unconnected.

- [x] User authorized deployment and new keys. Generated/Friendbot-funded a dedicated testnet issuer, with its identity and backend environment secrets ignored by Git; no production or treasury key was used.
- [x] Verified live RPC protocol 29; pinned SDK 29.0.1 and regenerated Cargo.lock. Added public issuer/event reads and issuer-authorized rotation; four native tests cover denial, pause, replay, duplicate subjects, recovery and rotation.
- [x] Deployed optimized WASM `f4b4b342af3bc6676128a81c0f4fb856e96a2a5eae4c1ae76da73ca8bd83975c` to `CAMNGYB64TCHHHQGYHZZ27ZIRRFDN6PMDMSLIVXMBIZGBBI7YAZMZ54H`. Deployment manifest and [operations guide](ACTIVITY_CONTRACT.md) contain public evidence only.
- [x] Added optional localized passport consent, wallet-signed activation, strict signed-envelope validation, on-chain totals and user-triggered issuer synchronization in five-record batches. Immutable PostgreSQL holdings and RLS-scoped claims are the only event sources; pending payments, hotel data and client activity payloads cannot become attestations. No remote database write or new migration was needed.
- [x] Event lookup plus deterministic keyed identifiers recover partial deliveries and lost responses without duplicate awards. Enforced a simulated issuer fee cap, contract-error checks and a server-only signing boundary. Existing PostgreSQL holdings/reputation remain authoritative for application behavior.
- [x] A separate fixture testnet contract passed real wallet activation, issuer delivery, accepted-event recovery, actual on-chain replay, unauthorized issuer denial and changed replay denial. No synthetic events were sent to the application contract and no database fixtures were created remotely.
- [x] TypeScript and 80 unit tests passed; 308 embedded SQL assertions passed; desktop/mobile regression: 108 passed, 8 configuration-dependent skips; all four new privacy/access-denial browser checks passed. Webpack build succeeded; the final build/credential scan is recorded in VERIFICATION.md. The default Turbopack build remains subject to this environment's worker-port restriction. Next.js continues to report an existing security upgrade recommendation.
- [ ] Real authenticated Pollar browser signature and synchronization of an existing traveler's records. Local testnet Pollar credentials exist through the legacy publishable-key fallback; the isolated regression origin does not enable Google signing. Traveler consent has not been bypassed.
- [ ] Mainnet, application hosting deployment, unattended publishing, distributed issuer coordination, archival restoration rehearsal, production key custody, independent-connection concurrency and hosted multi-user acceptance remain separate work. This deployment does not implement funded reward redemption.


### Automatic blockchain passport — 2026-10-25

This supersedes the manual opt-in/sync design above. Pollar wallets do not need an extra contract activation prompt.

- [x] Redeployed issuer-sponsored `register` and atomic first-record initialization on testnet: `CBU3NMC7UJTHYIHS4HUJAZVVHTQESAYRUV3LMOELAVUZKHTVWGT2DJ2G`. The app issuer funds recording; no traveler signature or sync button is used.
- [x] CLI-generated durable outbox migration, private RLS/grants, accepted-transition triggers, frozen verified wallet, per-contract delivery records, HMAC/timestamp/nonce authorization, exclusive two-minute worker lease, audited confirmation and automatic retry. After an initial automatic-review rejection, the user explicitly approved the exact Iguapass development target, migration, backfill and automatic publishing; migration then applied successfully.
- [x] `npm run dev/start` supervise app and worker together; browser test servers disable publishing. Sources survive crashes and do not depend on the traveler opening the passport. Production/serverless hosting still requires a hosted worker.
- [x] Passport reputation/stamp summary comes from the contract. Pending data automatically refreshes; chain outages show unavailable rather than database reputation. Localized privacy copy explains automatic public activity.
- [x] Isolated testnet rehearsal passed sponsored registration, issuer delivery, recovery, replay and denials. Independent hosted HTTP calls proved exclusive leasing and wrong-token rejection. The actual approved queue completed 2 profile and 2 purchase jobs; direct contract read confirms 2 purchases, 160 reputation, 0 stamps.
- [x] Four Rust tests, TypeScript, 67 unit tests, 325 embedded database assertions and 112 desktop/mobile browser cases passed (8 configuration-dependent skips). Webpack build passed after retrying the existing Next.js security notice.
- [ ] Full real-wallet browser checkout/claim of a new event, archival/restore rehearsal, production key custody and hosting, and broader multi-user/business concurrency remain separate gates. No mainnet or funded redemption implemented.

### 2026-10-25 — x402 agent purchases (development enabled)

Added a dedicated Stellar testnet x402 purchase rail, scoped traveler authorizations, a capped agent CLI, private durable settlement state, independent SAC transfer verification and receipt-triggered fulfillment. Existing USDC offer pricing is used; Reflector conversion is not needed or implemented. The user explicitly approved the Iguapass development migration and local activation; both are complete. Hosted HTTP denial/replay checks and RLS/grant inspection passed. Typecheck, 84 unit tests, 358 embedded DB assertions, Webpack build and 122 browser checks passed (2 demo skips). A dedicated protected testnet agent key/account and USDC trustline are prepared. Funding that agent with testnet USDC, traveler purchase authorization, funded facilitator settlement, authenticated hosted integration and independent-connection concurrency validation remain pending. Merchant/hotel provisioning from the earlier request is also still pending; this change does not create partner records or alter treasury recipients.

## Merchant discovery and self-reported exploration stamps (2026-10-25)

Implemented locally:
- `/{locale}/merchants` lists public, non-suspended venues across all destinations with name/description/city search and destination filtering. Discovery links and journey navigation expose the directory. Listing labels preserve the distinction between a source reference and an approved participant.
- Every editorial guide idea offers **Collect Stamp**, with QR scanning through the existing verified claim flow and a direct **Claim Stamp** action. Direct claims need a live application session, require no payment, activate the traveler if needed, and persist as self-reported exploration. They do not verify presence, grant admission, award reputation, or enter the verified chain outbox.
- The passport book and total count include exploration stamps with an explicit self-reported label. Destination guides display persisted completion progress. Revalidation refreshes the book and guide after accepted claims.
- Migration `20261025215950_exploration_stamps.sql` adds a private editorial allowlist, owner-scoped reads, SELECT-only client grants, and an invoker wrapper over a session-authorized private transaction. Per-user locks and uniqueness prevent duplicate awards; accepted claims are audited.

Verified locally: TypeScript; 86 unit tests; 374 embedded PostgreSQL assertions including anonymous denial, cross-user read denial, invalid/cross-city claims, denied direct writes, automatic traveler activation, replay resistance, and exclusion from the verified activity outbox. Production build passed using `npm run build -- --webpack`; default Turbopack encountered an environment worker-port restriction. Browser verification: 116 passed, 8 skipped, 4 failed. All new merchant-directory and stamp-choice tests passed on desktop and mobile, including search empty recovery, six CTAs, both collection options, anonymous login gates, Escape/focus return and overflow checks. The four failures are existing Pollar login-button readiness assertions on the isolated localhost:3017 origin; the documented provider origin is localhost:3000. Authenticated claims were not browser-verified.

Development migration applied after explicit user approval on 2026-10-25 to Iguapass (`wafunogjrczlwvdnvyfs`). Remote migration history records `20261025220833_exploration_stamps`; the local CLI-generated source remains `20261025215950_exploration_stamps.sql`. `scripts/verify-exploration-stamps.sql` passed on hosted PostgreSQL: accepted claim and automatic activation, replay rejection, unknown/cross-city denial, owner reads, cross-user and anonymous denial, denied direct writes, correct destination derivation, audit uniqueness, and exclusion from verified chain awards. All synthetic fixtures rolled back. A publishable-key Data API check also confirmed that the RPC is reachable, anonymous claims return `unauthorized`, and anonymous claim reads return no rows. Post-migration advisors report only the expected default-deny/no-policy informational notice for the private allowlist in this change.

Pending: authenticated browser persistence across reload/login and independent-connection concurrency tests before pilot. No application deployment was performed. The embedded suite and rolled-back hosted SQL checks do not replace these gates.

## Merchant service checkout and complete stamp activity (activated in development 2026-10-25)

Implemented, tested and **activated in Iguapass development with the replacement testnet contract**:

- Merchant owners/managers can publish an immutable service name, purchase-stamp name, participating venue and price. Prices are constrained to 25–150 testnet USDC in Zod and PostgreSQL, following the user's requested range. Merchant-owned offers require an owner-verified payout wallet.
- The user subsequently selected the existing **platform testnet wallet** and requested no demo/example badges. The prepared migration creates CityPassport digital services alongside existing unowned discovery references, priced deterministically in 25-USDC steps through 150 USDC. The seller remains CityPass; the source venue's organization and listing status remain unchanged. Services deliver a digital purchase record/stamp; they do not assert venue admission, a booking or third-party fulfillment. All interface copy states the actual scope, network and seller; transaction review shows the actual recipient.
- Platform settlement uses the already-configured destination treasury (`GC6RIEORZ5UF7L2KKXCZLSGMSIYY5NG6FXCKR3J5P7ZYIXSMXLX2QJKU`) through explicitly validated payout provenance, not a fabricated merchant wallet. The database's platform-checkout guard permits only canonical service IDs, terms, destination, seller and treasury. Existing destination passes retain their exact 100-USDC constraint.
- Eligible offers expose **Buy service** on discovery cards and the merchant directory. The server creates a payer-bound checkout using canonical terms; the existing Pollar embedded wallet signs, and the Stellar verifier independently checks settlement. **Acquired** links to the payment receipt.
- Accepted payment receipts atomically grant one service acquisition/stamp and one durable activity event. Repeated clicks resume the same open checkout. An unresolved submission cannot open a replacement charge. Existing ownership, unique constraints, locks, immutable terms and audited transitions prevent duplicate awards. Merchant members and payout wallets cannot purchase their own service to farm reputation.
- Contract kind 4 represents a first paid service acquisition: it follows the existing fixed +80 settled-purchase reputation rule and adds one stamp. Wallet/service uniqueness independently prevents duplicate awards. Kind 5 records self-reported exploration: it adds a stamp and a separate exploration counter, with **no reputation or proof-of-visit claim**, distinct from QR stamps.
- New exploration claims enter the durable outbox; the migration backfills only existing real exploration claims. Hosted read-only inventory confirmed the user's existing stamp (one exploration claim, zero QR claims) was absent from the old outbox because the earlier feature intentionally excluded it.
- Passport activity shows chain counters, pending/confirmed events, receipt links and contract transaction links when available. Successful recording captures the actual Stellar transaction hash. Recovery from an already-present contract event may lack a historical transaction hash; the contract link remains available. Public-activity copy explains self-reported recording.
- Pending service schema/configuration has an explicit unavailable state; existing passport, discovery and merchant data remain accessible without claiming that service purchases are enabled.

Local verification: TypeScript, 93 unit tests, 419 embedded PostgreSQL assertions, five Rust tests and optimized WASM build passed. Database coverage includes canonical platform seller/treasury/price, no source-listing promotion, independent receipt fulfillment, denied direct writes, cross-user isolation, replay prevention and separate contract outbox kinds. Final Webpack production build passed (the default Turbopack worker-port restriction remains environmental). Final desktop/mobile browser suite: 122 passed, eight configuration-dependent skips, using `TEST_POLLAR_CONFIGURED=0` for the unlisted localhost:3017 origin. The earlier run incorrectly expected Pollar readiness on that origin and had four login-readiness failures; funded signing on the approved localhost:3000 origin remains unverified. No funded merchant payment or authenticated service browser run is claimed.

Activation was explicitly approved and completed on 2026-10-25:

1. Applied the prepared prerequisite and service migration only to **Iguapass development** (`wafunogjrczlwvdnvyfs`). Remote history records `20261025224525_merchant_checkin_and_delivery_receipts` and `20261025224539_merchant_services_and_stamp_activity`; local CLI-generated sources retain their reviewed filenames. The catalog contains 15 CityPassport services spanning 25–150 testnet USDC. No source venue was promoted to a merchant partner.
2. Deployed and verified replacement contract `CBTPNY2ALTSFDWIUNMVGYOKYLAZT6LWRB4DJWZEL3IKRUFVYQ4ZBR3VS` using the existing dedicated issuer. SHA-256 `e1970288ef2221667b13497d99fba9de833d7eb2d1cecccaac113563b4c7c7d9` (6,210 bytes); upload `dcd53a79bc3c6c3d50f57546a28bac4738d388348191974d13d7eba8e88bae51`, deployment `917289150c386aaf52a0ffa2e6d5252e969efd6f9065807f1ea678398fa2ad9f`. The previous manifest is preserved separately.
3. Stopped the old local supervisor, switched the ignored runtime contract pointer while preserving the hash key, published/recovered all six real source jobs, and restarted the app with its supervised publisher on localhost:3000. The queue reports six confirmed jobs and zero pending. Independent contract/event/transaction reads verified the real collected exploration stamp. Its passport now has three purchases, 240 reputation and one stamp, including one self-reported exploration stamp. [Stamp ledger transaction](https://stellar.expert/explorer/testnet/tx/7c9b910ed011d5fec74a60202ed3848649340c65e0464203305353ea9b6fc0bf) succeeded. No new purchase was made to create those totals.

Hosted verification: `scripts/verify-exploration-stamps.sql` and `scripts/verify-service-activation.sql` passed on real PostgreSQL with all synthetic identities, claims and quotes rolled back. They prove claim replay/denials, canonical service amount/identity/platform recipient, owner quote access, cross-user quote denial, denied direct writes and forged settlement rejection. Publishable-key Data API checks returned all 15 platform services, denied anonymous purchases, and hid private acquisitions. Post-migration advisors showed expected default-deny informational notices on private tables and the pre-existing Supabase Auth password-protection warning; no new exposed-table RLS/grant finding was introduced.

Activated browser verification: **128 passed, two optional demo-data skips**, with real service catalog and published-pass checks enabled on desktop/mobile. Pollar readiness was disabled for the unlisted localhost:3017 test origin. The app and publisher are running on the configured localhost:3000 origin. Production build and prior local TypeScript/93-unit/419-DB/five-Rust checks passed for this exact implementation.

Remaining pilot gates: independently concurrent service purchase connections, authenticated cross-reload passport/merchant browser acceptance and a funded embedded-wallet service checkout. SQL fixture proofs and browser sign-in gates do not claim a funded payment. No mainnet or application hosting deployment was performed.
