# Global destination context

The global selector uses the real country/city registry and a browser preference cookie, `citypassport_destination`. Choosing a city sends a server action, validates the slug against the database registry and returns to localized discovery. The cookie is HttpOnly, SameSite=Lax, scoped to `/`, lasts one year and is Secure on HTTPS origins. It holds no identity or authorization data. Unknown or malformed values fall back to the existing Iguazú destination (or the first registered destination if Iguazú is absent). No schema migration or new permissions are required.

## Navigation and content

The shared header/footer now use localized CityPassport branding. Language changes retain the current page, including destination, checkout and catalog detail paths. Only bounded public navigation filters are copied; token, code and arbitrary redirect parameters and fragments are not propagated. This does not promise preservation of an in-progress guest invitation credential or unsaved form across a language change.

The existing Iguazú landing illustration, source catalog, suggested routes and reward-interest previews remain available when Iguazú is selected. Other cities use the shared destination view with scoped database listings and published experiences. They do not inherit Iguazú illustrations, directory references, suggested routes or reward previews. Routes query the selected destination and display an honest empty state when none exist; other-city rewards remain unavailable. Browsing a destination detail link is separate from selecting it for navigation: use the selector or the explicit “Use this destination” action to change context.

The global passport retains all destination stamps. Its selected-city note explains this distinction; switching cities does not create collections, change identity or alter history. Claim credentials continue to determine the stamped destination, not the preference cookie.

Hotel organization lists and their reservation/submission reads are filtered to the selected destination and the returned organizations. New hotel onboarding uses that destination. Merchant organization/history lists are filtered to the selected city; business registration defaults to that city while retaining an explicit destination choice. Existing RLS and mutation invariants remain authoritative. Switching cities never grants organization membership, reviewer/editor assignments, hotel guest access or payment permission. Frozen checkout destinations and payouts remain unchanged.

## Verification and limitations

Unit coverage verifies slug boundaries, locale path preservation, public filter bounds and credential-parameter stripping. Browser coverage verifies selection, reload/cookie persistence, language changes, scoped routes/rewards, the global passport note, restoring Iguazú, malformed-cookie fallback and server rejection of a forged unknown-city form submission.

Authenticated multi-destination hotel/merchant browser acceptance with real authorized organizations remains a pilot gate. Operator/reviewer destination filters intentionally use their explicit assignment scopes independently of the tourist browsing preference. No deployment performed.
