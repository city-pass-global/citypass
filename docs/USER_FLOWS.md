# User flows

Source reviewed 2026-10-26. These diagrams follow the routes a person can use today. They do not add partners, prices, or acceptance that the feature guides do not already record. Route detail stays in [application flows](APPLICATION_FLOW.md). Session, payment, and publishing mechanics stay in [technical flows](TECHNICAL_FLOWS.md).

Replace `[locale]` with `es`, `en`, or `pt`.

## Discover a destination

```mermaid
flowchart TD
  home["Global home"] --> countries["Country list"]
  countries --> country["Country overview"]
  country --> city["City page"]
  city --> prefer["Use this destination"]
  prefer --> explore["City guide for the saved city"]
  explore --> experience["Published experience"]
  explore --> merchants["Venue and service directory"]
  explore --> routes["Route ideas"]
  explore --> rewards["Reward ideas"]
  experience --> outside["Provider website"]
```

Home does not depend on a saved city. Choosing a city stores `citypassport_destination` and filters later discovery. That cookie is a browsing preference, not staff access and not a passport stamp. Listings and external links are references. They do not confirm a partnership, a vacancy, or a booking. Route bookmarks and reward interests stay in the browser. They are not account records and they do not redeem anything.

The phone tab bar covers home, passport, destinations, wallet, and account. A second row for the city guide, venues, routes, and rewards appears on those journeys.

## See whether you are signed in

```mermaid
flowchart TD
  guest["Header and phone tab say Sign in"] --> login["Login page"]
  login --> google["Continue with Google"]
  google --> named["Header shows initials and name"]
  named --> menu["Account menu"]
  menu --> profile["Profile"]
  menu --> passport["Passport"]
  menu --> wallet["Wallet"]
  menu --> leave["Sign out"]
  leave --> guest
```

Until a database session exists, the header and the last phone tab both say **Sign in** and open `/[locale]/login`. After login, the header shows initials and the traveler name, or the email name when no display name is stored. The menu opens profile, passport, and wallet. **Sign out** ends the application session and returns the header to **Sign in**.

The green passport button is separate. It offers a passport to a guest, opens the passport for an active account, and offers activation only when that account is known to be inactive. A failed account lookup does not invite an existing traveler to create another passport.

Profile still holds traveler links and, behind a closed disclosure, hotel, merchant, operator, and review workspaces. Opening one of those pages does not grant the role.

## Collect a visit stamp

```mermaid
flowchart TD
  qr["Scan or paste an authorized venue code"] --> signed{"Signed in with an active passport?"}
  signed -->|No| again["Sign in, then scan the code again"]
  signed -->|Yes| confirm["Review and confirm"]
  confirm --> decision{"Credential, venue, capacity, and uniqueness pass?"}
  decision -->|Yes| book["Stamp is added to the passport"]
  decision -->|No| none["Nothing is collected"]
```

Open `/[locale]/claim`. The camera recognizes a code; it does not submit until the traveler confirms. The code lives in the URL fragment and is removed from history after use. Sign in before scanning again. Do not keep the credential through the Google redirect.

A valid code records one visit for that stamp. It does not prove the person was physically present, and it does not pay a merchant. Guide stamps collected from a city page are labeled separately in the passport. They are not venue QR claims.

## Buy a destination pass

```mermaid
flowchart TD
  offer["Open the published pass for the saved city"] --> ready{"Signed in, active passport, and no holding yet?"}
  ready -->|No| stop["Sign in, activate, or stop if this city is already held"]
  ready -->|Yes| checkout["Review the frozen checkout"]
  checkout --> approve["Approve the payment in the wallet"]
  approve --> result{"Stellar result"}
  result -->|Confirmed| held["One pass, one receipt, reputation updated"]
  result -->|Unknown| same["Return to this same checkout and check again"]
  result -->|Failed| denied["No pass is granted"]
```

The development offer is exactly 100 testnet USDC. Settlement adds 80 non-transferable reputation. The pass does not include venue admission, a discount, or a reward that can be spent. One traveler can hold a destination once. There is no renewal or refund in the product.

If the network lookup is interrupted, the traveler uses the passport's recent purchase and the original checkout. A new payment is not the recovery path. A recorded funded testnet purchase is historical evidence in [verification](VERIFICATION.md), not a new balance checked for this page.

## Pay a merchant

```mermaid
flowchart TD
  staff["Approved merchant creates a checkout QR"] --> scan["Traveler scans it from Pay"]
  scan --> review["Review merchant, city, and USDC amount"]
  review --> approve["Approve in the wallet"]
  approve --> receipt{"Independent confirmation"}
  receipt -->|Yes| done["Immutable receipt"]
  receipt -->|Not yet| wait["Keep the same checkout"]
```

`/[locale]/pay` accepts a CityPassport checkout. A merchant payment follows the same confirmation rule as a pass and does not by itself create a destination-pass holding. Pending organizations cannot take payment. Wallet send and swap are separate and do not complete a checkout.

## Use the travel wallet

```mermaid
flowchart TD
  open["Open Wallet while signed in"] --> ready{"Managed Stellar wallet is ready?"}
  ready -->|No| wait["Stay on the sign-in or provisioning state"]
  ready -->|Yes| tools["Balance, receive, send, and history"]
  tools --> swap{"Provider returns swap venues?"}
  swap -->|Yes| quote["Open the swap modal"]
  swap -->|No| noswap["Swap stays unavailable"]
```

Balances come from the wallet provider, not from a sum of CityPassport receipts. A swap quote is not a completed exchange. Funded swap execution is still unverified. Card top-ups are not offered.

## Prepare a hotel arrival

```mermaid
flowchart TD
  owner["Create a pending hotel"] --> reservation["Add a reservation"]
  reservation --> invite["Issue one invitation"]
  invite --> share["Staff share the link themselves"]
  share --> guest["Guest opens the pre-check-in form"]
  guest --> submit["Submit matching email, details, and consent"]
  submit --> review["Staff review the arrival"]
```

The guest does not need a passport account. The form cannot look up the reservation. Staff move a submission from submitted, to reviewed, to ready for arrival, to completed. Cancellation invalidates invitations. CityPassport does not email the link. Hotel records stay inside that hotel's authorized staff.

## Review a merchant or publish an experience

```mermaid
flowchart TD
  merchant["Merchant registers a pending organization"] --> reviewer["Assigned reviewer decides"]
  reviewer --> payout["Approved owner sets a payout wallet"]
  editor["Assigned editor writes a draft"] --> published["Publish the experience"]
  published --> public["Public experience page"]
  public --> withdraw["Withdraw before editing again"]
```

Review and editing are different assignments. A hotel owner, a merchant member, and a signed-in traveler do not receive either role by signing in. Review covers approve, suspend, and reactivate with a reason. Public experience pages show published records only.

## Authorize an agent to buy a pass

```mermaid
flowchart TD
  traveler["Signed-in traveler opens passport agents"] --> choose["Choose the published pass and the agent wallet"]
  choose --> credential["Copy the purchase credential once"]
  credential --> agent["Agent calls the purchase URL"]
  agent --> pay{"Exact testnet USDC settlement"}
  pay -->|Confirmed| holding["Pass is granted to the traveler"]
  pay -->|Pending| poll["Poll the same order"]
  traveler --> revoke["Revoke before payment starts"]
```

This rail is enabled in the approved local development setup. The agent uses its own purchase credential, not the traveler's session cookie. A funded agent purchase has not been verified. Unknown settlement does not start a second charge. See [x402](X402.md).

## Outside these flows

Inquiry pages return 404. Reward redemption, refunds, mainnet checkout, automatic route awards, and unattended retention are not available. Signing in never creates an organization membership or a destination assignment.
