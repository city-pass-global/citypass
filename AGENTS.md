# Iguazú Passport engineering conventions

Read README.md and docs/ARCHITECTURE.md before changes. TypeScript strict; App Router server components by default. All visible copy belongs in messages/{es,en,pt}.json. Validate untrusted input with Zod and repeat security-critical invariants in PostgreSQL.

No fabricated partners, availability, prices, points or claims. Source listings are discovery references, never partnership evidence. No mock backend presented as working persistence. Do not deploy without user approval.

Every exposed table requires RLS and explicit grants. Membership lives in the database, never user-editable JWT metadata. Private hotel records must never be available to tourists or other organizations. Mutation RPCs use narrow invoker wrappers over explicitly authorized private transactional functions. Lock shared resources, enforce unique constraints and audit accepted transitions. No direct client writes to claims, ledger or invitations. Never log tokens, email, form payloads or secrets.

Run npm run typecheck, npm test, npm run test:db, npm run build and npm run test:e2e for functional changes. Security tests must prove denied access and replay resistance, not just happy paths. The embedded PostgreSQL suite is not a substitute for Supabase integration and concurrent independent-connection tests before pilot launch.

No service-role key in browser or source. Commit lockfile; exact dependency versions. Use migration CLI to generate migration names. No changes to an unrelated Supabase project. Apply remote migrations only to a selected development project. Keep docs/IMPLEMENTATION_PLAN.md honest about verified versus pending work.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
