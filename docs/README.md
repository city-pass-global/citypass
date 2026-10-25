# Documentation index

Reviewed against the working tree on 2026-10-21. These guides document implemented behavior and label planned integrations. Dated verification logs record earlier runs; a source review does not establish current hosted state.

## Reading paths

- **Product and application:** [application flows](APPLICATION_FLOW.md) → [PRD](PRD.md) → [implementation status](IMPLEMENTATION_PLAN.md) → [pilot plan](PILOT_PLAN.md).
- **Developer onboarding:** [root README](../README.md) → [development/operations](DEVELOPMENT.md) → [architecture](ARCHITECTURE.md) → [RPC reference](API_REFERENCE.md).
- **Stellar and wallet integration:** [integration inventory](INTEGRATIONS.md) → [Pollar identity/wallets](POLLAR_INTEGRATION.md) → [Stellar settlement](STELLAR_INTEGRATION.md) → [swapping](SWAPPING.md) → [Reflector](REFLECTOR_INTEGRATION.md).
- **Security and data:** [authorization](AUTHORIZATION.md) → [data model](DATA_MODEL.md) → [QR security](QR_SECURITY.md) → [hotel pre-check-in](HOTEL_PRECHECKIN.md).

## Feature reference

| Document                                              | Scope                                                                         |
| ----------------------------------------------------- | ----------------------------------------------------------------------------- |
| [Destination passes](DESTINATION_PASSES.md)           | Price, reputation, treasury, receipt fulfillment, recovery, contract boundary |
| [Merchant payments](MERCHANT_PAYMENTS.md)             | Onboarding, payout provenance, checkout, independent evidence                 |
| [Merchant review](MERCHANT_REVIEW.md)                 | Destination assignments, decisions, versions, replay protection               |
| [Destination experiences](DESTINATION_EXPERIENCES.md) | Multilingual publishing, editor scope, external provider links                |
| [Destination context](DESTINATION_CONTEXT.md)         | Saved city, routing, locale/filter behavior                                   |
| [Loyalty rules](LOYALTY_RULES.md)                     | Reputation versus planned funded rewards                                      |
| [Demo data](DEMO_DATA.md)                             | Explicitly labeled Lisbon demonstration and isolation                         |
| [Experience inquiries](EXPERIENCE_INQUIRIES.md)       | Historical private subsystem; application screens retired                     |
| [Sources](SOURCES.md)                                 | Listing provenance and reference/partnership distinction                      |

## Design, verification, and historical records

[Country design](COUNTRY_DESIGN.md) and [motion design](DESIGN_MOTION.md) describe visual decisions and accessibility. [Verification](VERIFICATION.md) records test evidence and limits. [Database connection](DATABASE_CONNECTION.md) preserves connection/migration history; use [development](DEVELOPMENT.md) for current setup. [CityPassport audit](CITYPASSPORT_AUDIT.md), [PRD](PRD.md), and older plan sections capture earlier assessments, not a promise that every proposal is implemented.

When changing behavior, update the relevant feature guide and implementation plan together. New runtime integrations must include configuration, identity/network assumptions, failure behavior, authorization, test evidence, and unresolved acceptance gates. Never copy secrets, raw invitation/session tokens, guest data, or private operational payloads into documentation.

- [Stellar testnet activity deployment and operations](ACTIVITY_CONTRACT.md)

- [x402 agent purchases](X402.md): scoped testnet authorizations, settlement verification, agent CLI and recovery; development enabled; funded verification pending.
