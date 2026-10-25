# QR security

## Visit claim implemented

A trusted approved organization issues a 32-byte cryptographically random token. The URL carries it in the fragment, which is not transmitted with the page request. The claim form removes the fragment from browser history. Database stores SHA-256 hashes only. Secrets must not be logged, included in analytics, or shared in screenshots. Referrer-Policy is no-referrer.

Issue QR requires venue membership plus approved organization and participating venue. Credentials expire in seven days, cap at 1,000 claims and can all be revoked per stamp. Claim checks authentication, destination passport, credential validity, active stamp, approved participation, rate limit, capacity and uniqueness. Ten attempts per account per minute are permitted, including invalid codes. Locks and unique constraints cover simultaneous and rotated-QR duplicates. Audit events record accepted claims and QR issue/revocation, not secrets.

Camera scanning uses BarcodeDetector when available; other browsers can use the phone's native QR camera or manually enter the authorized token. Scanning alone does not submit until the tourist confirms. After OAuth, rescan to avoid storing credentials across the sign-in redirect.

## Threats and limitations

Static QR codes can be photographed and shared; they are appropriate only for low-value visit stamps. They are not proof of location or purchase. Account throttling does not prevent mass-account abuse. Add gateway/IP throttles and abuse monitoring before public pilot exposure. No geolocation collection is required.

## Payment checkout versus planned loyalty/reward QR

Verified purchase must require authenticated merchant authorization, integer minor-unit amount, ISO currency, versioned earning rule and merchant transaction idempotency key. Reward tokens must be short-lived, single-use, merchant-scoped, and atomically debit ledger/consume entitlement under a passport/program lock. No public scan may award purchase points. Merchant and destination-pass payment checkout are now implemented through a separate request UUID/nonce and independently verified Stellar settlement; see [merchant payments](MERCHANT_PAYMENTS.md) and [Stellar integration](STELLAR_INTEGRATION.md). The general loyalty earning and spendable reward-token/debit flows described here remain planned. A static visit QR never substitutes for a payment receipt.
