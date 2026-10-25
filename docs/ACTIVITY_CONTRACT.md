# Automatic Stellar passport

Updated 2026-10-25. This replaces the earlier separate activation/manual-sync design.

## Traveler flow

A verified Pollar testnet login automatically queues passport registration. A confirmed pass receipt automatically queues a purchase; an accepted QR claim automatically queues a stamp. The app's dedicated issuer signs and pays the recording fees. Travelers do not activate the contract, sign a separate registration transaction, or press a sync button. Pollar already provisions their wallet; issuer-authorized `register(user)` creates the contract's passport state separately without consuming the traveler's signing authority.

The passport reads reputation and stamp counters from Stellar, never substituting PostgreSQL reputation during a chain outage. Pending delivery is shown as pending; failed RPC reads show unavailable. While pending/unavailable, the page refreshes automatically. Pass ownership, payment recovery and private guest workflows still use PostgreSQL. The contract does not receive USDC, execute checkout payments or fund rewards.

## Current deployment

See [public deployment manifest](../contracts/passport-activity/testnet-deployment.json).

- Network: Stellar testnet, protocol 29; Rust SDK pinned to 29.0.1.
- Contract: `CBTPNY2ALTSFDWIUNMVGYOKYLAZT6LWRB4DJWZEL3IKRUFVYQ4ZBR3VS`.
- Dedicated issuer: `GCKLQUFDIXAGOHNS6VIRLLCJP6JGMHCN7Q645GSS2MR73PA7B3KJ3XUM`.
- Optimized WASM: 6,210 bytes; SHA-256 `e1970288ef2221667b13497d99fba9de833d7eb2d1cecccaac113563b4c7c7d9`.
- [Deployment transaction](https://stellar.expert/explorer/testnet/tx/917289150c386aaf52a0ffa2e6d5252e969efd6f9065807f1ea678398fa2ad9f).

The replacement was explicitly approved and deployed on 2026-10-25. Read-back of its WASM matched the reviewed SHA-256 and size; its read-only issuer getter matched the dedicated issuer. Five Rust tests passed. **The app and supervised publisher now use this replacement contract**, following explicit approval of the Iguapass development migrations and stamp backfill. The prior deployment manifest is preserved in `previous-testnet-deployment.json`.

All six existing real canonical sources were confirmed on the replacement contract: two passport registrations, three pass purchases and one collected exploration stamp. Independent ledger reads confirmed the stamp event and successful [stamp transaction](https://stellar.expert/explorer/testnet/tx/7c9b910ed011d5fec74a60202ed3848649340c65e0464203305353ea9b6fc0bf). For that passport, chain totals are three purchases, 240 reputation and one stamp (one self-reported exploration stamp). The stamp added no reputation. No purchase or synthetic award was fabricated during replay. The queue had zero pending jobs after activation.

The initial opt-in contract remains on testnet as a superseded deployment; no application records were published to it. The new deployment removes its activation requirement. Only the issuer can register passports or attest activity. `record` can initialize a passport atomically on its first valid event, so ordering registration after a receipt never loses or resets counters. Purchase events add exactly 80 reputation, stamps add no reputation; redemption publishing is not implemented. Identical event replay preserves counters; changed replays and duplicate collections are denied. There is pause and issuer rotation, but no code-upgrade entry point.

## Durable queue and authorization

Migration `20261025201303_automatic_passport_activity.sql` was generated through the migration CLI, locally tested, then explicitly approved by the user and applied only to Iguapass development (`wafunogjrczlwvdnvyfs`). The first automatic approval review rejected the remote mutation for insufficient exact approval; it was applied only after the user approved this target, migration and automatic publishing.

Private RLS-enabled outbox/delivery/lease/nonce tables have no Data API read/write grants. Triggers enqueue sources inside the transaction that accepts them. Pass jobs freeze the independently verified receipt payer; stamp jobs freeze the verified Pollar wallet. A later profile update cannot redirect a queued event. Existing verified profiles and real holdings are backfilled without inserting new purchases, claims or reputation awards. No hotel data enters the queue.

The public worker RPC is a narrow invoker wrapper over a private transactional function. Every command requires a fresh, domain-separated HMAC using the backend bridge key, a timestamp and one-use nonce. Application cookies and user-editable metadata cannot authorize it. A locked singleton row leases only one issuer job across independent workers. The lease lasts two minutes; confirmations require the matching job, target contract and lease token. Wrong/stale leases, forged MACs, expired assertions and replayed requests are denied. Confirmed transitions are audited once.

The worker obtains canonical event data from the queue, never from the traveler. It checks the deployed issuer and the existing contract event before submitting, rejects conflicting evidence, checks simulated fees against a 1-XLM limit and accepts only a successful ledger response. Typed contract errors never count as success. If a response or acknowledgement is lost, the next lease recovers from the immutable contract event. Network failures remain pending and retry automatically. Failed jobs back off for one minute; no raw provider/database error, token, secret or source payload is logged.

Delivery state is scoped by contract ID. A testnet reset/redeployment can replay canonical sources to a new contract without changing the stable event hash key. `passport_activity_status` exposes only the requesting traveler's pending/error counts, authorized through the live database-backed session.

## Runtime and secrets

`npm run dev` and `npm run start` launch the Next.js app and the worker together through `scripts/run-app.mjs`. Worker failure stops the app rather than silently losing publishing. The worker uses `scripts/activity-worker.ts`; an independent operator can run `npm run activity:worker`. Multiple instances coordinate through the database lease. Automated browser servers set `ACTIVITY_WORKER_DISABLED=1` so test runs never process real remote activity.

This is a local Node runtime integration. Serverless hosting needs an independently hosted worker or a scheduled runner before deployment; no app hosting deployment was performed. Once the local app stops, automatic processing stops until it restarts, while the durable queue retains accepted events.

Ignored `.env.local` contains `STELLAR_ACTIVITY_NETWORK=testnet`, the current contract ID, `STELLAR_ACTIVITY_ISSUER_SECRET`, a stable 32-byte `STELLAR_ACTIVITY_HASH_KEY`, and the existing `POLLAR_SESSION_BRIDGE_KEY`. Back up these credentials through a trusted secret store. The dedicated CLI identity is in ignored `.stellar/identity/citypass-activity-testnet.toml` (file mode 600; directory mode 700). The signer imports `server-only`; Node operations use `--conditions=react-server`. No production, treasury or traveler private key is used. Next.js Server Function argument logging is disabled.

The privacy page explains automatic public recording: wallet association, counters and pseudonymous event identifiers persist publicly. No names, emails, hotel details, raw database IDs or QR credentials are published. Wallet reassignment is not an account-migration feature; previously accepted events stay bound to their original wallet, and another wallet cannot replay them for new awards.

## Operations and verification

Build/test:

```bash
cargo test --locked --manifest-path contracts/passport-activity/Cargo.toml
stellar contract build --manifest-path contracts/passport-activity/Cargo.toml
node --conditions=react-server --import tsx scripts/test-activity-testnet.ts --run
node --conditions=react-server --env-file=.env.local --import tsx scripts/test-activity-worker-connected.ts --run
```

The first Node test deploys an isolated fixture contract, proves issuer-sponsored registration without a traveler signature, publishes a fixture event through the real adapter, checks replay and unauthorized/conflicting calls, and never writes test events to the application contract. Fixture `CBGBZZU72XTXTRPKHJOPPTS3KU45AK25WADRG46TRIPZ5BZT36FC6OSP` passed; its [registration transaction](https://stellar.expert/explorer/testnet/tx/1b62f85279be969de23cbdc8fba0c8fcdf8bf2eac01ef637a65bf40bfa77f2db) confirmed. The second test intentionally leases a real development job with two independent HTTP requests, rejects a wrong token and releases it for retry; it does not publish or forge a delivery confirmation.

The approved live worker completed two verified profile jobs and two actual pass jobs. A direct contract read of the purchaser wallet confirmed 2 purchases, 160 reputation and 0 stamps; no new payment or synthetic award was created. Registration after purchase preserves those totals. This verifies live delivery and hosted lease serialization, but not all business-domain multi-user/concurrent-connection acceptance gates.

Use `stellar contract invoke --id citypass-activity-auto --source-account citypass-activity-testnet --config-dir .stellar --network testnet -- set_paused --paused true` to pause new event recording, and `false` to resume. `set_issuer --issuer NEW_PUBLIC_ADDRESS` requires the current issuer signature. Fund and secure the replacement, rotate, update only the signer secret and retain the event hash key. Paused or failed deliveries remain queued. TTL extensions occur on writes/replays; idle archival/restoration monitoring and production custody remain operational work. Mainnet, refunds, funded redemption and hosting deployment remain unsupported or pending separate approval.

## Prepared service and exploration recording revision

The reviewed replacement was deployed as the current deployment listed above; it is not an in-place upgrade of the prior contract. `service-activity-candidate.json` records its WASM hash. Kind 4 grants +80 reputation, a purchase and a stamp for the first independently settled service acquisition; wallet/service uniqueness prevents replay farming. Kind 5 records a self-reported exploration stamp with no reputation, including an `exploration_stamps` counter. Both require issuer authorization. The existing kind 1/2/3 semantics remain intact.

The applied merchant-services migration queues new exploration claims, backfilled the existing real claim, and captures contract transaction hashes for successful deliveries. The replacement was necessary because the previous contract cannot upgrade itself and does not accept kinds 4/5. The replacement deployment, Iguapass database migrations, runtime pointer switch and real-record replay are now approved and complete. Hosted SQL/API checks and browser results are recorded in the implementation plan. See the implementation plan for exact activation steps and remaining verification gates.
