# Wallet swapping

Source review: 2026-10-21. Swapping is integrated through **Pollar's provider UI**. CityPassport does not directly import the Soroswap SDK, operate liquidity pools, or implement a quote API.

## Current application path

1. Open `/[locale]/wallet` and establish verified Pollar and application sessions.
2. The lazy `PollarProvider` supplies the managed Stellar wallet. Controls require internal custody, Stellar chain, and ready provisioning/account presence.
3. `client.getSwapConfig()` loads enabled provider venues. A nonempty result enables the swap action; failure/empty configuration disables it.
4. `openSwapModal()` opens Pollar's quote and signing interface. Provider configuration determines assets, routes, and execution availability.
5. Treat the resulting transaction as a wallet operation. It does not create a CityPassport checkout receipt, visit stamp, pass, or reputation award.

Code: `src/components/wallet/pollar-session.tsx`; installed interface: `@pollar/react` 0.11.5. Provider confirmation is `prompt` and logging is `silent`. Application labels are localized; vendor modal copy has its own language behavior.

The previous browser inspection recorded enabled **Stellar DEX, Aquarius, and Soroswap** choices and a read-only testnet XLM→USDC quote. This proves configuration/quote display at that time. It does not prove executable liquidity, funded swaps, current venue availability, or execution across all venues. No funded swap acceptance is recorded.

## Products and responsibilities

| Product               | Role in this project                                                                          |
| --------------------- | --------------------------------------------------------------------------------------------- |
| Pollar                | Configured venue access, swap UI, managed-wallet signing/execution integration                |
| Stellar DEX           | A provider-offered Stellar trading venue                                                      |
| Aquarius              | A provider-offered liquidity venue                                                            |
| Soroswap              | A provider-offered venue; its own contracts/SDK are not directly integrated here              |
| Reflector             | Potential future reference-price source; no current calls and not an executable quote         |
| CityPassport checkout | Separate fixed testnet-USDC payment, independently verified against its own memo and snapshot |

See [Pollar upstream](https://github.com/pollar-xyz/pollar) for provider scope and [Soroswap's contract repository](https://github.com/soroswap/core) for venue implementation. Upstream capabilities do not establish application acceptance.

## Checkout does not auto-swap

An insufficient-USDC checkout fails preflight. The user can separately acquire the exact testnet USDC asset, then return to the checkout. Sending another token, swapping into a different issuer with the same code, or transferring directly from a wallet modal cannot fulfill a checkout. Its signed source, recipient, asset, amount, memo, and deadline must all match.

## Acceptance work before claiming completed swaps

Use an authorized testnet buyer with sufficient fee reserves and actual input balance. Confirm the exact asset identities, provider-enabled venue, available route, amounts, fees, slippage/minimum output, and quote validity in the actual modal. After explicit wallet consent, independently inspect terminal ledger success and resulting balances. Exercise user rejection, missing/unauthorized trustline, no liquidity, stale quote, wrong network, provider outage, and repeat-click behavior. This is an acceptance procedure, not a record that those scenarios have passed.

A future direct Soroswap integration would require a deliberately selected SDK/network, backend-only credentials, validated quote/build inputs, integer amounts with token-specific decimals, slippage/deadline bounds, explicit signing, and independent transaction confirmation. No `SOROSWAP_API_KEY`, direct adapter, quote persistence, automatic fallback venue, or checkout swap orchestration is currently configured. Adding those variables alone would change nothing.
