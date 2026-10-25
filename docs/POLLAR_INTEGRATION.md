# Pollar login and wallet integration

Implemented 2026-10-15 using the official [quickstart](https://docs.pollar.xyz/docs/getting-started/quickstart), [payments UI](https://docs.pollar.xyz/docs/guides/payments-ui), [swaps guide](https://docs.pollar.xyz/docs/guides/swaps-guide), [server API](https://docs.pollar.xyz/llms-full.txt), and the vendor's `llms-full.txt` bundle, checked against installed React/core 0.11.5 declarations.

## Identity and custody decisions

Pollar is the sole application login. The user explicitly approved Pollar-managed Google wallets, replacing the original non-custodial requirement. CityPassport stores no wallet private keys or seed phrases. Supabase Auth's Google provider is no longer called by the application. Its old callback only redirects to the Pollar profile page. Existing Supabase credentials alone cannot authorize application data.

Pollar's documented backend token verifier is `POST https://server.api.pollar.xyz/v1/tokens/verify`, authenticated with the backend Pollar secret key. Only its successful, app-bound response supplies the external user ID, application ID, expiry, network and profile data. Browser-supplied profile/role fields are never accepted. The browser SDK's optimistic session is not sufficient: exchange waits for its verified state and server-side verification.

Supabase's [custom OIDC integration](https://supabase.com/docs/guides/auth/third-party/custom-oidc) requires discovery, asymmetric signing, a key ID and role claim. Pollar's supplied documentation instead provides token verification; the checked public discovery endpoints did not establish those OIDC requirements. This implementation uses server-verified, database-backed application sessions rather than assuming a Pollar JWT is a Supabase JWT.

## Session flow and authorization

1. Pollar signs the traveler in with Google and provisions its managed testnet wallet.
2. A Next server action verifies the SDK access token with Pollar. It validates the response and caps the application session at the earlier of provider expiry or one hour.
3. The server generates a fresh 256-bit capability, signs a short-lived profile/session assertion with an application-specific HMAC key, and calls a narrow invoker RPC. This key is unrelated to wallet custody and is not a Supabase service-role key.
4. The private transaction checks the MAC, issue/expiry limits and one-time session hash. It upserts a profile by `(pollar_application,pollar_subject)`, creates the global passport if needed, rotates the prior application session and audits the accepted session. A replayed assertion is denied and rolls back.
5. The browser receives only the random capability in an HttpOnly, SameSite=Lax cookie, Secure on HTTPS. PostgreSQL stores its SHA-256 hash. The Pollar token, refresh token, MAC key and raw capability are not stored in public tables or application logs.
6. Server-side Supabase requests carry the cookie capability in `x-citypassport-session`. `private.current_actor()` resolves only a live, non-revoked hash to the internal UUID. RLS and transactional commands use that actor; organization roles remain database memberships. `anon`/`authenticated` SELECT grants still require this capability under owner/member policies. Unauthenticated reads return empty rows; direct mutations remain denied. The private schema is not exposed.
7. Logout revokes the database session before clearing the cookie and Pollar state. The client serializes token exchanges and waits for an in-flight exchange before logout, preventing an older exchange from recreating a session after logout.

The 32-byte-key HMAC implementation uses PostgreSQL's built-in SHA-256 and is tested against RFC 4231 and Node crypto. It avoids requiring a nonportable extension in the embedded PostgreSQL suite. Provision `private.pollar_bridge_config` only through trusted administration. Keep its value matched to the server environment; rotation invalidates outstanding login assertions, while existing application sessions retain their bounded expiry. This is a backend session protocol, not a general-purpose third-party JWT issuer.

## Data preservation

`user_profiles` is now the application user registry. The migration copies legacy user UUIDs and moves application foreign keys from `auth.users` to this registry. Existing passports, claims, ledger and membership IDs remain intact. Legacy profiles are retained with no external identity assigned. They are not automatically merged with a Pollar profile by email. Any legacy account transfer requires an explicit verified recovery process. New Pollar users do not require a Supabase Auth account.

## Configuration

- `NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY`: browser-safe `pub_testnet_…` or `pub_mainnet_…` key. The existing local `POLLAR_PUSHABLE_KEY` spelling is accepted server-side only after validating its publishable prefix.
- `POLLAR_SECRET_KEY`: backend-only matching network secret; never sent to a client component.
- `POLLAR_SESSION_BRIDGE_KEY`: backend-only 32-byte hex key matched to `private.pollar_bridge_config`. Provisioned in the selected Iguapass development project; kept only in git-ignored `.env.local` locally.
- `APP_ORIGIN=http://localhost:3000`: the existing Pollar application allows this origin. `127.0.0.1:3000` was rejected with `ORIGIN_NOT_ALLOWED`; it is not equivalent to localhost for CORS.
- Supabase URL/publishable key continue to point to selected Iguapass. No service-role key is used.

Pollar's [Domains settings](https://docs.pollar.xyz/llms-full.txt) distinguish browser origins from OAuth redirects. Both must allow an actual deployed origin before production. No domain settings or deployment were changed here.

## Wallet UI and current limits

Pollar is loaded lazily on sign-in, profile logout and wallet surfaces. Provider logging is disabled and signature confirmation is set to `prompt`. Application controls use ES/EN/PT dictionaries; vendor modals currently use their own English copy and the UI discloses that. Wallet operations wait for a verified application session, a verified Pollar session and a provisioned Stellar managed wallet.

Native Pollar views provide balances, receive QR, send and transaction history. Balances are provider chain reads, never sums of database records. Swap UI is wired through `openSwapModal`; enabled venues are queried before enabling its action. The initial check found no enabled swap venues. After the user enabled them in the dashboard, the wallet reloaded the configuration and enabled the swap action. The live modal now lists Aquarius, Stellar DEX and Soroswap routes plus configured assets. Funded testnet execution/liquidity must still be verified before claiming completed swaps.

A send-modal result is not merchant fulfillment. CityPassport checkout now implements frozen recipient/asset/amount/correlation, independent ledger verification, and recovery through a separate application path; see [Stellar settlement](STELLAR_INTEGRATION.md). No payment or swap was executed during the original Pollar-login slice. Later funded testnet pass settlement is recorded in [VERIFICATION.md](VERIFICATION.md); funded swapping remains unverified. Reflector prices are not fabricated for unsupported FX/display currencies.

## Verification

- Real Google sign-in through Pollar succeeded in the local browser and created one actual Pollar profile/global passport in Supabase.
- Wallet address, live testnet balances, receive QR and provider transaction history were read. A read-only testnet XLM-to-USDC Stellar DEX quote loaded after the user enabled swap venues; no execution was submitted. Logout/re-login preserved one Pollar profile/global traveler. Trustline provisioning records were visible; these are not purchase receipts.
- Hosted SQL session, global-passport and hotel/stamp workflow checks passed with rolled-back synthetic fixtures. Read-only API isolation checks passed.
- Local typecheck, unit and embedded database suites pass. Browser/build counts and remaining gates are recorded in VERIFICATION.md.
- Generic wallet sends, funded swaps, multi-user browser isolation, refresh-token expiry/revocation behavior at the provider, independent database-connection races and production operation remain verification gates. The later destination-pass checkout has recorded funded testnet acceptance; this does not prove generic send/swap acceptance. Application logout/replay/expiry are covered at the database layer.
