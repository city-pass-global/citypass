# CityPassport product requirements

Current scope reviewed against source on 2026-10-21. CityPassport extends the original Iguazú Passport into a multilingual country/city travel companion. The package name and some internal identifiers retain Iguazú naming. This document describes product boundaries; [implementation status](IMPLEMENTATION_PLAN.md) and [verification](VERIFICATION.md) distinguish source completion from accepted operation.

## Audience and proposition

Travelers discover destinations, collect verified visit stamps, and hold destination passes under one global passport. Hotels prepare arrivals using a separate private guest workflow. Approved merchants can request verified testnet payments, while explicitly assigned destination reviewers/editors administer their own scopes. ES/EN/PT are required throughout application copy.

Public browsing must not require login. Personal and business actions require server-verified Pollar identity plus database authorization, except guest submission through its one-time invitation capability. The approved custody model is Pollar-managed Google wallets; CityPassport stores no private keys or seeds.

## Implemented journeys

- Discovery: global home → country → city → sourced guide/published experience, with a persisted city preference and optional external provider links.
- Passport: Google access → global database activation → authorized QR → atomic claim → destination-grouped global stamp history.
- Pass: published city offer → authenticated buyer → fixed testnet-USDC checkout → explicit signing → independent receipt → holding and reputation.
- Hotel: owned pending hotel → private reservation → expiring invitation → anonymous guest submission → tenant-authorized review/arrival states.
- Merchant: pending onboarding → destination review → verified payout → QR checkout → independently confirmed receipt.
- Editor: explicit city assignment → multilingual draft → publish → withdraw before further editing, with version/replay protection.

[Application flow](APPLICATION_FLOW.md) supplies route-level detail. Inquiry screens are retired; retained private records/RPCs are historical infrastructure, not an available product journey.

## Pass and reputation rules

Current development passes cost exactly **100 testnet USDC**, award **80 non-transferable reputation** only after independently confirmed settlement, and allow one lifetime pass per traveler/destination. Basic/Mid/Top thresholds are 0/80/240. The enabled offers include database ownership/reputation only. No admission, priority entry, confirmed discount, cash value, or redeemable reward is implied. Proposed venue benefits need explicit real participation and terms.

The fixed-USDC checkout is separate from wallet send/swaps. Pollar supplies signing and swap UI; CityPassport independently verifies payment evidence. Reflector is installed but not wired. The local Rust activity prototype is undeployed and does not synchronize application state.

## Privacy and authority

Database memberships authorize hotel/merchant operations. Private destination assignments separately authorize review and catalog editing. Neither reviewer nor editor access permits hotel guest reads. Guests cannot enumerate reservations; invitation plus matching email permits one submission only. Public discovery sources never prove partnership. No real operator, partner, availability, price, claim, or point balance may be fabricated.

All exposed tables require RLS and explicit grants. Critical invariants live in PostgreSQL as well as Zod. Accepted transitions must be locked, unique/idempotent, and audited without sensitive payloads. No direct client writes to claims, ledger, or invitations; no browser service-role key.

## Deferred scope

Mainnet payments, refunds, transferable passes, funded loyalty redemption, automated route awards, confirmed internal bookings, live provider inventory, bank ramps, escrow, document uploads, room keys, staff invitation UX, and automated reconciliation/retention are not implemented. Saved routes/reward interests remain local-only. The application does not claim compliance with hotel registration obligations or replace required arrival identity checks.

## Acceptance and measurement

The recorded development evidence includes Pollar login, wallet reads, hosted rollback checks, and a funded testnet pass receipt/recovery. This does not clear the application for a public pilot. Distinct authenticated users, independent-connection races, actual business enrollment, provider expiry/recovery, mobile accessibility, and privacy/retention operations remain gates. Application/contract deployment requires explicit user approval.

Original controlled targets—2 hotels, 5 merchants, 2 operators, 3 routes, 100 tourist registrations—are hypotheses, not enrollment claims or forecasts. Measure real activations, unique verified claims, confirmed receipts, pass holdings, and submitted/reviewed hotel forms. Distinguish visits from purchases, proposals from funded rewards, and external links from bookings. Estimate reception time saved only through consented observation.
