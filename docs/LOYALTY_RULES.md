# Loyalty rules

Phase 4, not an enabled first-milestone feature. No demo point balances, fictional coupons or unsupported redemption controls are shown.

Every earning, redemption, reversal and expiration is an immutable ledger entry. Balance is a sum over the appropriate program/funding scope, never a freely editable number. Corrections append compensating entries. Use integer points and integer monetary minor units with explicit ISO currency on purchases. Never assign points an arbitrary cash conversion.

Default rewards are merchant funded. Funding organization and campaign budget must be explicit. Cross-merchant spending is disabled until a settlement agreement exists. Earning rules are versioned and saved with verified purchases. Expiration is configurable and executed as ledger events by an idempotent job. Concurrent redemption must lock the spendable account and re-evaluate balance in the same transaction.

Before implementation, agree reward funding, cap, validity, refund behavior, expiry notice and accounting reconciliation with the pilot partners. Add authorization, insufficient balance, replay, expiry and independent-connection concurrency tests before enabling any redemption.

## Destination-pass reputation exception — 2026-10-17

The implemented development purchase flow records **reputation**, separate from a spendable loyalty balance: exactly 80 points for one confirmed 100-USDC destination-pass purchase, Basic/Mid/Top at 0/80/240. It does not enable funded reward redemption or assign reputation a cash conversion. Its immutable receipt-linked events and owner-only reads are described in [destination passes](DESTINATION_PASSES.md). The pass migrations and owner-approved offers are recorded as applied to the selected development project; funded testnet receipt/award acceptance is recorded on 2026-10-17. On-chain activity synchronization and spendable reward settlement remain pending.
