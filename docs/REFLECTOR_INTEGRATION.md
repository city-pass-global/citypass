# Reflector integration status and design

Source and installed declaration review: 2026-10-21. **`@reflector/contract-client` 2.2.0 is installed, but Reflector is not called by application code.** There is no feed contract configuration, RPC adapter, quote cache, oracle-driven UI, or oracle-dependent checkout. No live feed was read for this documentation task.

## Intended responsibility

Reflector publishes reference prices on Stellar. A future CityPassport integration could display supported local-currency estimates or reference valuations with source/time information. Current pass checkout settles a fixed amount of testnet USDC and does not need an oracle. Country `currency_code` metadata does not establish oracle coverage for that currency.

The official [contract interface](https://github.com/reflector-network/reflector-contract) defines Pulse and Beam reads and price precision. The [JS client](https://github.com/reflector-network/contract-client-js) provides Pulse/Beam/Flare/DAO bindings. Pulse is the initial candidate for reference display; choosing a product, network, and actual feed remains implementation work. Beam's caller/fee model and Flare/DAO capabilities are not configured in this project.

## Required integration contract (planned)

Before adding a runtime adapter:

1. Select the exact network, approved RPC, deployed feed, and supported asset pair from authoritative deployment data. Never copy an unverified contract ID or infer coverage from a ticker.
2. Instantiate `PulseClient` server-side with an explicit public account, contract ID, RPC URL, and matching network passphrase. The installed client's default passphrase is public network; testnet must be explicit.
3. Inspect `base()`, `assets()`, `decimals()`, and `resolution()` for the selected feed. Match its exact asset descriptor: `Stellar` uses a contract address; `Other` uses a symbol.
4. Read `lastPrice(asset)`. Missing data must return an unavailable quote. A present price must be positive and its timestamp neither stale nor implausibly future-dated under the application's documented policy.
5. Preserve price and timestamp as integers. Installed `PriceData` uses **bigint** for both; price scale comes from `decimals()`, not Stellar's seven-decimal payment scale. Use exact arithmetic and bounded string formatting.
6. Return a bounded view model containing asset/base identities, network/feed, formatted amount, quote timestamp, and unavailable reason where appropriate. Serialize bigints as decimal text, never raw JSON bigint.
7. Cache only within the chosen freshness budget; show unavailable/expired data explicitly. Do not silently reuse a stale quote or assume USDC equals USD.

The read client uses simulation; signing writes is a separate capability. Price references are not executable swap quotes, guarantees of liquidity, or settlement receipts. The application must never change a frozen checkout amount after an oracle update.

## Installed interface reference

These signatures were checked in `node_modules/@reflector/contract-client/src/index.d.ts`; they are not code currently invoked by CityPassport:

```typescript
// Interface sketch, not an implemented application adapter.
type PriceData = { price: bigint; timestamp: bigint };
// PulseClient initialization accepts publicKey, rpcUrl, contractId,
// networkPassphrase, and optional signing/fee/timeout settings.
// base(): Promise<Asset>
// assets(): Promise<Asset[]>
// decimals(): Promise<number>
// resolution(): Promise<number>
// lastPrice(asset: AssetDescriptor): Promise<PriceData | undefined>
```

Normalized price is the integer price divided by `10 ** decimals`; calculate it without lossy monetary floating-point conversion. The chosen base and asset determine conversion direction. No ARS, BRL, EUR, or other FX feed is claimed as supported here without discovery and live verification.

## Configuration and completion gates

`.env.example` intentionally has no Reflector variables because there is no runtime consumer. A future adapter must define and validate its configuration, document feed provenance, separate testnet/mainnet, and avoid hardcoded invented deployments. Adding a client package or configuration is not completion.

Acceptance must include known-pair live read, asset/base/decimal checks, unsupported pair, missing/stale/future/zero/negative price, RPC failure, bigint precision/serialization, cache expiry, localization, and UI unavailable behavior. If reference prices become security-critical, enforce the policy again in the authoritative transaction/contract and test independent failure paths. Record dated evidence and scope in [VERIFICATION.md](VERIFICATION.md) before changing the status to integrated.
