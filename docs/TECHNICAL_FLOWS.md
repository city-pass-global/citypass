# Technical flows

Source reviewed 2026-10-26. These sequences describe the implemented server path. They omit secrets, tokens, guest payloads, and raw credentials. Protocol detail remains in [Pollar](POLLAR_INTEGRATION.md), [Stellar settlement](STELLAR_INTEGRATION.md), [activity operations](ACTIVITY_CONTRACT.md), [x402](X402.md), and [authorization](AUTHORIZATION.md).

## Request shell

```mermaid
flowchart TD
  browser["Browser request"] --> proxy["Proxy sets locale and path headers"]
  proxy --> layout["Locale layout"]
  layout --> session{"Valid application cookie?"}
  session -->|No| guest["Public pages and Sign in"]
  session -->|Yes| actor["Data API resolves the live actor"]
  actor --> named["Account menu uses the profile name"]
  actor --> page["Page reads only what that actor may see"]
```

`src/proxy.ts` overwrites internal routing headers and sends `Cache-Control: private, no-store`. The layout reads the cached session to choose the account control. A cookie that does not resolve to a live profile is treated as signed out. Membership is read from database tables during the action that needs it. It is not copied into the cookie.

Language links keep the current public path. They drop credential query parameters. They do not carry a guest invitation fragment.

## Pollar session exchange

```mermaid
sequenceDiagram
  participant Browser
  participant Pollar
  participant Next as Next.js action
  participant DB as PostgreSQL
  Browser->>Pollar: Google sign-in
  Pollar-->>Browser: Verified provider session
  Browser->>Next: Provider access token
  Next->>Pollar: Verify token with the server secret
  Pollar-->>Next: Application, subject, expiry, profile
  Next->>Next: Fresh capability and HMAC assertion
  Next->>DB: create_pollar_session
  DB->>DB: Upsert profile, ensure traveler, rotate session, audit
  DB-->>Next: Internal profile id
  Next-->>Browser: HttpOnly capability cookie
  Browser->>Browser: Reload the account shell
```

The browser cookie is a random 256-bit capability. PostgreSQL stores its hash. The provider token, the HMAC key, and the raw capability are not written to public tables or logs. The session ends at provider expiry or one hour, whichever is earlier. A replayed assertion rolls back. Profiles match `pollar_application` plus `pollar_subject`. Email does not merge a legacy account.

Later Data API calls send the capability in `x-citypassport-session`. `private.current_actor()` accepts only a live, unrevoked hash. Direct client writes to claims, receipts, invitations, memberships, and the ledger stay closed.

## Sign-out

```mermaid
sequenceDiagram
  participant Menu as Account menu
  participant Pollar
  participant Next as Next.js action
  participant DB as PostgreSQL
  Menu->>Next: End application session
  Next->>DB: end_app_session
  DB->>DB: Revoke the capability
  Next->>Next: Delete the cookie
  Menu->>Pollar: Provider logout when Pollar is configured
  Next-->>Menu: Refresh, or redirect to profile
```

The client waits for an in-flight token exchange before logout, so an older exchange cannot recreate the session. When Pollar is not configured, the server action still ends the database session and redirects to profile. Profile then shows the sign-in gate.

## Visit claim

```mermaid
sequenceDiagram
  participant Traveler
  participant Next as Claim action
  participant DB as PostgreSQL
  Traveler->>Next: Confirmed code
  Next->>Next: Reject a missing session
  Next->>DB: passport_command claim
  DB->>DB: Lock account limiter and credential
  DB->>DB: Check activation, stamp, venue, expiry, capacity, uniqueness
  DB->>DB: Create destination collection if missing, then the claim
  DB-->>Next: Accepted claim or denial
  DB->>DB: Enqueue public stamp activity for the verified wallet
```

The fragment token is hashed before storage. Invalid codes count toward the account limit and create no stamp. Exploration-guide claims use `claim_exploration` and are labeled as guide stamps. They do not pass the venue-QR checks and they do not add reputation.

## Destination pass and merchant checkout

```mermaid
sequenceDiagram
  participant Traveler
  participant Next as Next.js
  participant DB as PostgreSQL
  participant Horizon as Horizon testnet
  participant Pollar
  participant RPC as Stellar RPC
  Traveler->>Next: Start or open a checkout
  Next->>DB: Lock the request and bind the verified payer
  Next->>Horizon: Read buyer balance and recipient trustline
  Next-->>Traveler: Unsigned frozen testnet payment
  Traveler->>Pollar: Review and sign
  Pollar-->>Traveler: Signed XDR
  Traveler->>Next: Submit the envelope
  Next->>Next: Check source, asset, amount, memo, expiry, signature
  Next->>DB: Store the envelope and hash
  Next->>RPC: Broadcast, then getTransaction
  Next->>DB: HMAC settlement evidence
  DB->>DB: One receipt and, for a pass, one holding and reputation event
```

Both rails use classic testnet USDC. The server freezes recipient, issuer, amount, memo nonce, and deadline. A provider callback is not a receipt. Unknown RPC results stay submitted. Retry resubmits the stored envelope. The state machine and exact XDR checks are in [Stellar integration](STELLAR_INTEGRATION.md).

A pass receipt also inserts one holding and +80 reputation in that same transaction. Merchant checkout does not do that unless the request belongs to a pass order. The buyer wallet must differ from the treasury wallet.

## Automatic activity publishing

```mermaid
sequenceDiagram
  participant DB as PostgreSQL
  participant Worker as Activity worker
  participant Contract as Testnet contract
  DB->>DB: Queue registration, purchase, or stamp in the accepting transaction
  Worker->>DB: Lease one job with a fresh HMAC
  Worker->>Contract: Issuer-signed register or record
  Contract-->>Worker: Successful ledger event
  Worker->>DB: Confirm that lease and contract
  Note over Worker,Contract: Lost responses are recovered from the contract event
```

The traveler does not sign registration. The issuer pays the fee. Purchase events add 80 reputation. Stamp events add a stamp and no reputation. The passport page reads those counters from Stellar. A failed read shows unavailable and does not fall back to the PostgreSQL reputation journal. The worker runs beside `npm run dev` and `npm run start`. If the worker stops, the app stops, and the queue keeps the unpublished events. Browser tests disable the worker.

## Agent purchase

```mermaid
sequenceDiagram
  participant Traveler
  participant DB as PostgreSQL
  participant Agent
  participant Next as Agent API
  participant Facilitator as x402 facilitator
  participant RPC as Stellar RPC
  Traveler->>DB: Authorize one pass, one agent wallet, one credential hash
  Agent->>Next: GET with the purchase credential
  Next-->>Agent: 402 exact testnet USDC requirements
  Agent->>Next: Same order with the signed authorization
  Next->>DB: Store that signed payload before settlement
  Next->>Facilitator: Settle the stored authorization
  Next->>RPC: Read the original transfer and authorization
  Next->>DB: Receipt, holding, reputation, and activity job
```

The credential is not the application session. Classic checkout actions cannot spend an x402 order. A lost response can be bound only to the original transaction hash. A second payment is refused while settlement is unknown. This path is implemented and locally enabled. A funded agent purchase remains unverified. See [x402](X402.md).

## Who may do what

```mermaid
flowchart LR
  session["Live application session"] --> traveler["Own passport, claims, and checkouts"]
  session --> hotel["Hotel actions only with that hotel membership"]
  session --> merchant["Merchant actions only with that organization membership"]
  session --> review["Review only an assigned destination"]
  session --> edit["Edit only an assigned destination"]
  cookie["Saved city cookie"] --> browse["Filter discovery"]
  invite["Invitation capability"] --> guest["One guest submission"]
```

The city cookie, a profile row, and a Pollar wallet do not grant hotel, merchant, review, or editor rights. Guest pre-check-in is the invitation exception: the guest proves the token and the reservation email, and cannot read the reservation. Reviewers cannot review their own organization. Editors must withdraw a published experience before changing it.
