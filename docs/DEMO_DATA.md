# Explicit demonstration data

The user authorized creating demo database records on 2026-10-16. Only the selected Iguapass development project is in scope. Demo content is not a partner, provider, available activity, booking, purchase, loyalty award or real operating metric.

## Catalog seed and isolation

`scripts/demo/seed-lisbon.sql` adds one published, multilingual Lisbon example with a generated UUID and stable key `lisbon-inquiry-preview-v1`. It contains no provider/contact link, price, availability, business identity or organization membership. It is intentionally separate from `supabase/seed.sql`; fresh environments and deployments do not receive it automatically. Re-running the script does not duplicate content/audit events, overwrite edits or republish a withdrawn example.

The administrative `experiences.is_demo` and `demo_key` fields are immutable once inserted. Demo experiences cannot have provider links. Existing catalog commands cannot opt a record into demo status or remove that classification. Public destination pages split actual experiences from the separate demonstration section. Detail/edit pages and related requests display localized demo notices.

The inquiry command derives the request's immutable `is_demo` snapshot from its experience, ignoring any caller-supplied flag. Demo requests use the same live Pollar session, private persistence, ownership rules, consent checks, rate limit and cancellation workflow as other inquiries. They consume the ordinary daily inquiry allowance. No agent, reviewer, editor or business privilege is automatically assigned.

## Review and withdrawal

Open the Lisbon destination page, then the explicitly labeled DEMO record. Use fictional information only. There is no external provider or reservation to confirm. Destination inquiry handling still requires a separately authorized assignment; seeding records is not authorization to grant that access.

To remove the example from public discovery, an authorized editor can withdraw it through the catalog workflow, or trusted administration can archive the exact demo-key record and append the administrative audit event. Do not erase the demo classification or delete referenced history to disguise it as real activity. Cancellation of a demo inquiry preserves its classified audit/history record; it is not deletion.

## Verification

Local SQL tests prove classification/key immutability, no provider link, caller flag denial, safe editing/publication and inquiry snapshot propagation. `scripts/demo/verify-isolation.sql` repeats the classification/link/key checks on hosted Supabase and rolls back its synthetic fixture. The seed was executed twice against Iguapass and returned the same record.

Run the browser suite with `TEST_DEMO_SEEDED=1` in addition to the existing Supabase/Pollar configuration flags to include demo separation, notices, absence of provider links and anonymous request gating. The normal suite skips this seed-specific case when no demonstration has been provisioned.

This demo does not verify an assigned agent response, a real operator's content, a funded payment, real availability or independent-connection concurrency. No deployment performed.

Live browser acceptance: using the existing real Pollar session, a fictional two-traveler inquiry was submitted through the ordinary form, opened from its saved result and cancelled through the owner action. The stored title and demo notice appeared in the private detail view. Hosted aggregate verification confirmed one demo inquiry, zero real inquiries, zero inquiry-agent assignments and one seed audit event after two seed executions. The cancelled request remains in the signed-in user's history; no external provider was contacted and no staff role was assigned.
