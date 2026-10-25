# CityPassport

A multilingual travel passport for discovering destinations, collecting verified visit stamps, buying destination passes, and preparing hotel arrivals. The repository/package retains the original **Iguazú Passport** name; the application now supports a country and city directory. Interface languages are Spanish, English, and Portuguese.

## What works today

| Area               | Implementation and evidence                                                                                                                                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Discovery          | Country → city browsing, sourced listings, destination guides, published experiences, and a saved city preference. Listings are discovery references, not partner endorsements.                                                          |
| Accounts           | Pollar Google login and managed Stellar wallets, with independently verified, database-backed application sessions. Supabase Auth is not the application login.                                                                          |
| Passport           | Global traveler identity, destination collections, authorized QR claims, and an interactive book containing actual collected stamps. Anonymous sample stamps never create records.                                                       |
| Destination passes | Development offers at exactly 100 **testnet USDC**, one lifetime holding per traveler/city, and +80 non-transferable reputation after independently verified settlement. No venue admission, discount, or redeemable reward is included. |
| Payments           | Frozen checkout requests, Pollar signing, Stellar verification, durable submission recovery, immutable receipts, and atomic pass fulfillment. A real funded testnet pass purchase was recorded as verified on 2026-10-17.                |
| Business tools     | Hotel reservations/pre-check-in, merchant onboarding/checkout, destination-scoped merchant review, and experience editing. Access requires the relevant database membership or assignment.                                               |
| Wallet and swaps   | Pollar balance/receive/send/history views and configured swap venues. A quote was previously inspected; funded swap execution remains unverified.                                                                                        |
| Reflector          | Client dependency installed; no runtime oracle adapter, feed configuration, or displayed oracle quote yet.                                                                                                                               |
| On-chain activity  | Deployed testnet passport contract, issuer-sponsored registration and automatic durable publishing of verified purchases/stamps. Passport reputation is read from Stellar.                                                                                                       |

Saved itineraries and reward interests are browser-local. Inquiry screens are retired (404); their private database records and RPC remain. Funded loyalty redemption, refunds, mainnet checkout, automatic route awards, and unattended reconciliation/retention jobs are not implemented. See the [documentation index](docs/README.md) for the complete map.

Status above comes from source inspection on **2026-10-21** and earlier dated verification records. Remote configuration, balances, and historical acceptance were not re-tested during this documentation update. See [verification](docs/VERIFICATION.md) and the [implementation plan](docs/IMPLEMENTATION_PLAN.md).

## Run locally

Requires **Node.js 22+** and npm. Dependencies are pinned in `package.json` and `package-lock.json`.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open [localhost:3000/es](http://localhost:3000/es). Although the npm script binds to `127.0.0.1`, use **localhost** in the browser: the recorded Pollar development allowlist uses that exact origin. Public editorial discovery works without credentials; database-backed directory and personal/business features require configuration. Connection failures do not turn into fake live data.

For a local production server:

```bash
npm run build
npm run start
```

## Configuration

Use `.env.example` as the variable inventory; keep actual values in ignored `.env.local`.

| Variable                               | Purpose                                                                                     | Browser-safe?               |
| -------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Selected development project's Data API                                                     | Yes                         |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable API key; RLS still controls data                                                | Yes                         |
| `APP_ORIGIN`                           | Canonical origin for links, QR checks, and cookie security; locally `http://localhost:3000` | Configuration, not a secret |
| `NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY`   | Pollar application; network follows `pub_testnet_` / `pub_mainnet_` prefix                  | Yes                         |
| `POLLAR_SECRET_KEY`                    | Server token verification; must match the publishable key's network                         | **No**                      |
| `POLLAR_SESSION_BRIDGE_KEY`            | 32-byte lowercase hex backend attestation key matching `private.pollar_bridge_config`       | **No**                      |

No Supabase service-role key is used. Provision the bridge key through trusted administration, never a seed or migration. Allow the exact browser origin and OAuth redirect in Pollar. Changing the Pollar key to mainnet does **not** enable mainnet checkout: the payment implementation explicitly supports testnet only.

The recorded selected development project is **Iguapass (`wafunogjrczlwvdnvyfs`)**. Apply migrations only to an explicitly selected development database. Fresh setup, seed boundaries, CLI workflow, and troubleshooting are in [development and operations](docs/DEVELOPMENT.md). Do not rerun offer/demo provisioning against an existing database as routine setup.

## Validation

Functional changes require:

```bash
npm run typecheck
npm test
npm run test:db
npm run build
npx playwright install chromium
npm run test:e2e
```

Playwright runs desktop and mobile Chromium. Build before testing; it starts `next start`. Use `TEST_PORT=3017` for an isolated port, with `TEST_SUPABASE_CONFIGURED=1` and `TEST_POLLAR_CONFIGURED=1` only when the tested configuration actually supports those features and origin. `TEST_PILOT_PASSES=1` enables published-offer checks; `TEST_DEMO_SEEDED=1` enables optional demo coverage. See [development](docs/DEVELOPMENT.md) for environment restrictions.

`npm run test:connected` performs read-only hosted API checks using `.env.local`. The embedded PostgreSQL suite tests real migrations, access denials, replay, and transactional behavior; it does not replace hosted Supabase, authenticated multi-user browser tests, or independent-connection concurrency tests.

## Repository map

```text
src/app/                  App Router pages and validated server actions
src/app/[locale]/         Traveler, hotel, merchant, review, and operator routes
src/components/           UI, passport book, Pollar portal, payment controls
src/lib/                  Domain validation, data reads, session and Stellar adapters
messages/{es,en,pt}.json   All application-visible interface copy
supabase/migrations/      Ordered schema, RLS, grants, transactional RPCs
supabase/seed.sql          Sourced discovery catalog, not approved partners
contracts/passport-activity/  Stellar testnet activity contract
scripts/                  Database tests, hosted checks, reviewed admin utilities
tests/                   Unit and desktop/mobile browser coverage
docs/                    Application, integration, security, and operations guides
```

## Documentation

The optional [x402 agent purchase API](docs/X402.md) adds scoped testnet pass purchases for agents. It is enabled in the approved local development setup; a funded agent purchase remains unverified.

Start with [application flows](docs/APPLICATION_FLOW.md), [architecture](docs/ARCHITECTURE.md), and the [integration inventory](docs/INTEGRATIONS.md).

For the payment stack: [Pollar](docs/POLLAR_INTEGRATION.md), [Stellar settlement](docs/STELLAR_INTEGRATION.md), [swapping](docs/SWAPPING.md), [Reflector](docs/REFLECTOR_INTEGRATION.md), and [destination passes](docs/DESTINATION_PASSES.md). Developers should also read [RPC contracts](docs/API_REFERENCE.md), [data model](docs/DATA_MODEL.md), [authorization](docs/AUTHORIZATION.md), and [development/operations](docs/DEVELOPMENT.md).

The [full documentation index](docs/README.md) links product rules, privacy boundaries, historical decisions, verification evidence, and remaining pilot gates. Application and contract deployment require explicit user approval.
