# Merchant checkout — testnet implementation

CityPassport now has a merchant portal (`/[locale]/merchant`), QR scanner (`/[locale]/pay`) and checkout review/receipt page (`/[locale]/checkout/[id]`). Login remains Pollar-only. Supabase stores authorization, immutable request snapshots, private submission attempts and receipts. No approved merchant, live offer or payment was fabricated for verification.

## Authorization and payout

Onboarding creates a pending merchant organization and owner membership. Only an approved merchant can configure payouts or create checkouts. Payout configuration derives the address from the owner's backend-verified Pollar testnet profile; client-provided destination addresses are ignored. Checkout creation rechecks owner membership and wallet provenance, then freezes the merchant, destination, product, amount, issuer and payout address. Existing requests retain that snapshot if payout configuration later changes.

Owners, managers and merchant staff can create requests for their organization. Idempotency keys are unique per organization; a retry with changed details is rejected. Amounts use exact decimal strings and seven-decimal integer arithmetic, never floating-point arithmetic. The testnet asset is Circle USDC, issuer `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`, linked from [Circle's Stellar page](https://www.circle.com/multi-chain-usdc/stellar).

## Payment and verification

Requests expire after 15 minutes and contain an opaque UUID and a unique 32-byte nonce. QR links must use the application origin over HTTPS (localhost HTTP is allowed for development). Knowing a fresh link permits an authenticated traveler to review it; preparing binds the payer to their verified profile wallet. A different payer cannot take over. Self-payment is denied.

The server builds one Stellar payment with the frozen asset, amount and recipient, the nonce as a hash memo, and a maximum time bounded by request expiry. Pollar asks the traveler to review and sign. The server independently checks the network signature, source, operation count, recipient, asset issuer, exact amount, memo and time bound. It records the signed envelope and transaction hash privately before attempting network submission.

A provider callback or client success message cannot confirm a purchase. Reconciliation uses Stellar testnet RPC `getTransaction`, verifies the successful ledger result, the returned envelope/hash and ledger close time, then submits domain-separated HMAC evidence to PostgreSQL. The transactional function repeats frozen-request invariants, locks the request, enforces unique transaction hashes and inserts one immutable receipt. All accepted transitions are audited. A failed ledger result creates no receipt.

The payer or authorized merchant can check a submitted payment. A retry submits the same stored envelope/hash, never builds a second payment. Unknown RPC results remain submitted; elapsed QR time alone cannot turn an already submitted payment into a failure. A timely ledger settlement can be reconciled after the QR expires. The page polls for approximately one minute while open and offers explicit check/retry controls afterward.

## Verified and pending

Applied `20261016025838_merchant_checkout` through the Supabase plugin to the selected Iguapass development project. Generated database types match that schema. Embedded SQL tests cover forged proof, tenant denials, replay, changed idempotency payloads, duplicate transaction hashes, immutable receipts, late reconciliation and failed settlement. `scripts/verify-checkout.sql` exercises hosted approval, payout, binding, idempotency and access denials in a transaction that rolls back all synthetic fixtures.

The shared payment pipeline has a recorded funded Pollar browser acceptance for an owner-authorized CityPass destination pass on 2026-10-17, including fee sponsorship, independent RPC confirmation, receipt recovery, and atomic holding/reputation. This supersedes the original statement that no funded payment was verified. It does not prove third-party merchant onboarding/payout acceptance. Before a third-party merchant pilot, enroll an authorized real merchant, use distinct funded testnet merchant/payer wallets with the required trustlines, complete signing, and verify its receipt. Also run independent-connection race tests, provider expiry/recovery tests and an authenticated multi-user browser matrix.

There is no unattended reconciliation worker, mainnet checkout, refund flow, purchase-stamp fulfillment, or spendable loyalty issuance. The destination-scoped [merchant review UI](MERCHANT_REVIEW.md) is implemented; initial reviewer assignments still need trusted administration. Linked pass receipts grant holdings and non-spendable reputation, separately from generic merchant fulfillment. Old unknown submissions require operational reconciliation, especially beyond RPC retention. No deployment was performed.
