# Destination passes and reputation

Source review: 2026-10-21. The selected Iguapass development project is recorded as having the pass, treasury, and recovery migrations plus eight owner-approved published offers. A funded testnet purchase and receipt recovery were recorded on 2026-10-17. These are prior observations, not a new remote verification. Earlier rollout/approval history is preserved in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) and [VERIFICATION.md](VERIFICATION.md).

## Product contract

| Rule                                  | Implemented behavior                                                                   |
| ------------------------------------- | -------------------------------------------------------------------------------------- |
| Price                                 | Exactly **100 testnet USDC**, exact issuer enforced                                    |
| Award                                 | **80 reputation** after independently confirmed settlement only                        |
| Ownership                             | One lifetime pass per traveler/destination                                             |
| Tiers                                 | Basic 0–79, Mid 80–239, Top 240+                                                       |
| Included in current development offer | Database pass holding and non-transferable reputation                                  |
| Excluded                              | Venue admission, priority entry, confirmed discount, spendable reward, cash conversion |
| Undefined/not implemented             | Duration/renewal, refund/reversal, transfer, reward redemption, mainnet checkout       |

Priority entry and 10%–50% discounts were product proposals, not confirmed provider commitments. Any future benefit needs a verified participating venue and explicit terms before being sold or promised. Neither source listings nor reputation prove a funded entitlement.

## Discovery and purchase

The landing page groups destination passes by country. Each city links to its destination pass section. Offer names/benefits are ES/EN/PT data; display copy is in the locale dictionaries. The concise summary and exclusions remain visible; native disclosures contain longer descriptions and tier rules. Detailed transaction views retain the actual network/asset information even where prominent marketing badges were removed.

The purchase action requires a live Pollar application session, active global traveler, and backend-verified testnet wallet. Pollar session establishment normally activates the database traveler; legacy inactive accounts retain an explicit activation command. This is not on-chain activation.

`destination_pass_command('purchase', {offer_id})` locks the traveler, rejects existing ownership, and reuses any live/submitted checkout for the same city. It validates the offer, approved seller, and configured recipient. Price, reputation, user, destination, and payout cannot come from the purchase form. Withdrawal or catalog edits cannot change an existing checkout snapshot. The action redirects to `/[locale]/checkout/[id]`.

The payer cannot equal the recipient. The UI detects the configured receiving account and offers Pollar account switching; PostgreSQL independently enforces self-payment denial. A new buyer must complete their own Google login and wallet consent.

## CityPass treasury versus merchant payouts

The owner authorized CityPass as seller and public testnet recipient:

```text
GC6RIEORZ5UF7L2KKXCZLSGMSIYY5NG6FXCKR3J5P7ZYIXSMXLX2QJKU
```

`private.citypass_treasuries` ties destination, CityPass organization, network, and recipient. Its records have RLS and no direct client access. The owner-authorized treasury is not falsely attributed to a verified third-party merchant wallet. One application seller organization per destination preserves tenant/destination foreign keys; it creates no third-party affiliation or staff membership.

Checkout distinguishes `citypass` and `merchant` payout provenance. Ordinary merchant payouts still require a verified owner wallet. Database checks validate treasury scope/recipient/price and prevent caller substitution or merchant takeover. `src/lib/passes/program.ts` holds the validated public address used by presentation/account guards.

The treasury migration and `scripts/provision-pilot-passes.sql` were initially blocked pending approval, then recorded as applied after the owner explicitly confirmed recipient and scope. The script published eight localized development offers at 100 testnet USDC/+80 with no venue perks. It refuses an existing catalog and is not routine repeatable setup. Do not replay it against an existing project.

## Settlement and atomic fulfillment

Payment reuses the existing Pollar signing and independent Stellar verification path. The server preflights exact buyer/recipient USDC balances, authorization, and liabilities. It builds a single payment with the frozen memo nonce and deadline, verifies signed XDR, stores the attempt before broadcast, and independently confirms hash/envelope/result/ledger/time. [STELLAR_INTEGRATION.md](STELLAR_INTEGRATION.md) details the checks.

`private.destination_pass_orders` links a checkout to the authoritative offer, traveler, destination, and award. Inserting a verified receipt invokes `private.fulfill_destination_pass` within the same transaction:

- Create one immutable owner-only `destination_pass_holdings` row.
- Create one immutable receipt-linked `reputation_events` row with exactly 80 points.
- Enforce unique request/receipt IDs and `(user_id, destination_id)` holding uniqueness.
- Roll back the receipt if fulfillment fails.

Forged callback, unsigned/wrong envelope, changed amount/issuer/recipient/memo, failed settlement, hash reuse, and replay do not award ownership or reputation. Buying a pass never fabricates a visit stamp. Reputation is not the spendable `points_ledger` groundwork or a Stellar token.

## Passport and purchase recovery

`destination_pass_command('account', {})` delegates to an owner-authorized account helper and returns activation, holdings, total reputation, and the latest 20 purchase summaries. Caller identity arguments are ignored. Orders/envelopes and other users' histories are not exposed by this account projection. Created/prepared requests past their deadline are projected as expired; submitted requests remain recoverable.

The passport separates acquired passes from a purchase-history disclosure, which opens when an unfinished checkout exists. Each holding links to a receipt. Validated StellarExpert transaction/ledger links expose recorded evidence. Submitted state alone grants nothing.

Wallet controls guard repeated clicks immediately and show signing/submission progress. A dropped broadcast/lookup response retains the durable submitted attempt. Check/retry reconciles or re-submits the stored envelope/hash; it never creates a replacement charge. Successful settlement within the deadline can be reconciled after the QR expires. There is no unattended reconciliation worker.

## Optional on-chain activity

`contracts/passport-activity` contains the deployed testnet activity contract with pinned SDK 29.0.1 and Cargo lockfile. It has issuer-sponsored registration, issuer-authorized attestations, purchase/stamp/redemption counters, fixed purchase reputation, tier computation, pause control, replay/conflict checks, and persistent TTL extensions. It does not execute payments, issue tokens, transfer reputation, or fund reward redemption.

The revised contract was deployed on 2026-10-25. Verified Pollar login queues registration automatically; confirmed receipts and accepted stamp claims queue issuer-paid attestations inside their database transactions. The Node app runs a leased, retrying publisher. No separate traveler signature or sync button exists. The passport displays contract reputation, pending status and automatic refresh; PostgreSQL retains verified ownership and its internal reputation journal. The approved existing two passes are confirmed on-chain as 160 reputation. See [operations](ACTIVITY_CONTRACT.md).

## Evidence and remaining gates

Embedded SQL tests cover fixed price/award, forged evidence, atomic receipt fulfillment, duplicate orders/settlements, immutable ownership/reputation, public/private access denials, cross-user isolation, catalog withdrawal, treasury spoofing, and recovery. Hosted `scripts/verify-passes.sql` records rollback coverage for activation, ownership, reuse, fixed-price and denied reads/writes.

The recorded funded 2026-10-17 fee-sponsored transaction settled 100 USDC at ledger 5248819. A runtime RPC timestamp representation mismatch initially left the checkout submitted. The adapter was corrected to strictly normalize decimal-text timestamps and require inner fee-bump success. The ordinary authenticated reconciliation path recovered one receipt/holding/+80 without another transaction or direct ledger write. Later real-browser inspection records two holdings/160 reputation. These observations do not establish independent-connection concurrency or all-user acceptance.

The latest recorded general regression in [VERIFICATION.md](VERIFICATION.md) is TypeScript, 54 unit tests, 308 embedded SQL assertions, Webpack build, and 114 desktop/mobile cases with two optional demo skips. Those suites were not rerun for this documentation-only update. Independent hosted connections, multi-user business workflows, mainnet, refunds, actual benefits, funded rewards, unattended reconciliation, and authenticated on-chain browser acceptance remain pending.
