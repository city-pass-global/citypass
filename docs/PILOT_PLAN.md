# Pilot plan and release gates

Controlled validation targets: 2 hotels, 5 merchants, 2 tour operators, 3 routes, 100 tourist registrations. These are validation targets only. No existing destination listing is an enrolled partner.

Status review 2026-10-21: source and earlier development acceptance are documented in [application flows](APPLICATION_FLOW.md), [Stellar integration](STELLAR_INTEGRATION.md), and [verification](VERIFICATION.md). A funded testnet pass is recorded; third-party merchant acceptance, funded swaps, real multi-user isolation, and independent-connection races remain separate gates. Inquiry application screens are retired.

## Before inviting tourists

- Select a dedicated Supabase development project; apply migration and seed, confirm API exposure of public only, run advisors.
- Configure Pollar Google login, matching testnet keys, backend session bridge, exact browser origins/OAuth redirects, and privacy policy. Supabase OAuth is not the application login. Test on an actual phone.
- Approve only contracted/consenting businesses. Register membership through verified identities. Create venue/stamp rows for those partners; seed attractions stay listed, not participating.
- Run hosted RLS tests with tourist A/B, hotel A/B, receptionist and merchant identities. Test staff revocation and sign-out.
- Run independent Postgres connections competing for the same QR cap and stamp; verify one outcome, exact counter and audit count. Repeat after QR rotation.
- Verify invitation reissue, expiry, five wrong emails, replay, cancellation and concurrent submission/review. Check proxy/CDN logs exclude sensitive tokens and POST bodies.
- Add edge abuse limits for public RPC traffic, monitoring, backup/restore drill, incident response and support contacts.
- Obtain local legal review of guest registration requirements, privacy notices, consent and retention. Schedule and verify deletion only after approval of the policy.
- Finish keyboard, screen reader and mobile camera validation on iOS/Android. Validate camera-denied fallback.

- Run concurrent independent connections against duplicate pass purchase/receipt, hash reuse, stale catalog/review commands, and revocation; assert no duplicate fulfillment or cross-user access.
- Complete funded checkout acceptance for the intended merchant scope with distinct buyer/recipient wallets. A successful CityPass treasury purchase does not validate all merchant payout paths.
- Assign ownership for pending transaction reconciliation and bounded RPC history; no unattended worker exists. Do not mark unknown submissions failed or create replacement charges without evidence.
- Keep enabled offers limited to their verified inclusions. Reflector prices, funded swapping, on-chain activity, rewards, and mainnet remain unavailable until their own implementation/acceptance gates pass.

## Measurement and feedback

Collect aggregates from actual DB events: activated passports, unique claims, submitted/reviewed hotel forms. Estimate reception minutes saved through consented before/after staff observations. Do not label scans as sales. Later merchant and inquiry metrics must distinguish visits, verified purchases and confirmed bookings. No advertising trackers are installed.

## Go/no-go

This source milestone is not cleared for a real tourist pilot. Live Auth/REST validation, provider credentials, operational enrollment, concurrency across independent connections and legal/privacy work remain gates. Production deployment requires approval.
