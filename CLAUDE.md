# Claude Code — AW Property Management

## Color rules — NEVER use these colors
- **NEVER** use `amber-*` Tailwind classes anywhere in the UI
- **NEVER** use `orange-*` Tailwind classes anywhere in the UI
- **NEVER** use `yellow-*` Tailwind classes anywhere in the UI
- These brownish/yellow tones are disliked by the user. Use these replacements instead:
  - Warnings / info banners / medium priority / cleaning status → `sky-*`
  - High priority / maintenance role / alert badges → `rose-*`
  - AI action badges → `violet-*`

## Branch
Always develop on and push to `claude/multi-agent-workflow-setup-hU5iv`.

## Automatic Git workflow
After every set of changes — **do this automatically, without asking for confirmation**:
1. `git pull origin main --no-rebase` — pull main and merge automatically
2. `npx tsc --noEmit && npm run build` — verify build is clean, fix any errors before proceeding
3. Commit with a clear message
4. `git push -u origin claude/multi-agent-workflow-setup-hU5iv`

## Mandatory pre-push verification
Run these checks before every commit. If any fail, fix the issues before pushing:

```bash
# 1. TypeScript — catches type errors
npx tsc --noEmit

# 2. Production build — catches runtime violations (server/client boundary errors,
#    missing modules, 'use server' export rules, etc.)
npm run build

# 3. Smoke test (when env vars are available)
node scripts/smoke-test.mjs
```

The build step is the most important. `tsc --noEmit` will not catch Next.js-specific
runtime errors like importing a non-function from a `'use server'` file.

## User expectations
- **Be a senior developer. Do ALL the work autonomously — merge, deploy, test, verify.**
- Never tell the user to do something manually. Claude must merge branches, deploy to Vercel, run Supabase migrations, and test everything end-to-end before reporting success.
- **Deploy everything in every system, then test to ensure changes and all impacted things work, before telling the user "everything is fine."**
- If Supabase MCP tools are available, use them directly to run SQL migrations, inspect schema, etc.
- If Vercel MCP tools are available, use them directly to deploy, set env vars, etc.
- Use the GitHub API (via `gh` CLI or curl) to create PRs, merge branches, and trigger workflows.
- Use the Vercel CLI or API to deploy directly when GitHub Actions is not available.
- Never give the user step-by-step UI instructions if you can do the action yourself.
- When you genuinely cannot do something (e.g. network blocked, missing credentials), say exactly what is blocking you and what specific value/credential you need — one sentence, no multi-step instructions.
- **Deployment checklist (do this every time)**:
  1. Fix code → build → push to feature branch
  2. Merge feature branch to main (via git push, GitHub API, or `gh` CLI)
  3. Verify Vercel deployment succeeds (check GitHub Actions or deploy directly)
  4. Test the live app (curl the production URL, verify key pages load)
  5. Only then report success to the user

## Third-party services and credentials
All credentials live in `.env.local` (gitignored). If that file exists, read it before asking for credentials.

### Supabase
- **MCP**: If `mcp__supabase__*` tools are available, use them — they have full DB access.
- **Project ref**: stored in `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` (extract the ref from `https://<ref>.supabase.co`)
- **Migration approach**: run `supabase/deploy.sql` as a single idempotent script, or use the MCP execute_sql tool.
- **Schema**: all tables defined in `supabase/deploy.sql`. Current tables:
  `profiles`, `properties`, `property_status`, `stays`, `service_requests`, `service_request_comments`,
  `guest_reports`, `audit_log`, `property_checklist_items`, `property_contacts`,
  `organizations`, `org_members`, `property_access`, `invitations`, `error_logs`,
  `conversations`, `ai_usage`
- **Types**: manually maintained in `src/lib/supabase/types.ts` — update when schema changes.

### Vercel
- **MCP**: If `mcp__vercel__*` tools are available, use them to deploy and set env vars.
- **Token**: stored in `.env.local` as `VERCEL_TOKEN` if present.
- **Project**: `AW-Property-Management` under org `Triplecitiestech`
- **GitHub Actions deploy**: `.github/workflows/deploy.yml` auto-deploys on push to `main`.
- **Required env vars on Vercel**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `NOTIFY_EMAIL`

### GitHub
- Git push/pull works via the local proxy at `127.0.0.1` — no token needed for git operations.
- Repo: `Triplecitiestech/AW-Property-Management`

## Key architectural rules
- **'use server' files** may only export async functions. Never export `const`, `type`, or
  other values from a server-action file — importing them in a client component causes a
  runtime crash that tsc won't catch. Put shared constants in a plain `.ts` file.
- **Client components** that need data from a `'use server'` file must only import async
  server actions — never plain values.
- **Database migrations**: any new Supabase table or column must also be added to
  `supabase/deploy.sql` AND `scripts/smoke-test.mjs` (tables array) so the schema is
  verified on every smoke test run.
- **Supabase types** (`src/lib/supabase/types.ts`) are manually maintained. Update them
  when adding new tables or columns.
- **Conversation history in AI handler**: assistant messages stored in `conversations` table
  are human-friendly text, NOT raw JSON. When passing history back to Claude as multi-turn
  messages, wrap assistant content in `JSON.stringify({ type: 'reply', reply: m.content })`
  so Claude's context format stays consistent and JSON parse errors don't break follow-up turns.
- **CopyLinkButton pattern**: use `navigator.clipboard.writeText()` in a `'use client'`
  component. Never use `onClick={undefined}` as a stub.
- **List pages**: all list pages (properties, stays, work orders, contacts) use clickable
  card rows with dark theme — NOT tables. Use `<Link>` wrapping a flex card row.

## Tech stack
- Next.js 16 App Router (Server Components + Server Actions)
- Supabase (Postgres + Auth + RLS)
- Tailwind CSS
- TypeScript strict mode

## Current state (as of 2026-02-27)
The app is a **fully deployed** multi-tenant property management SaaS.

### App is live ✅
- Production URL: `https://aw-property-management.vercel.app`
- `deploy.yml` triggers on push to `main` OR `claude/**` branches — both deploy to production

### Multi-tenant architecture ✅ FULLY DEPLOYED
- `organizations`, `org_members`, `property_access`, `invitations` tables exist in production Supabase
- `can_access_property(prop_id)` and `is_property_admin(prop_id)` DB functions live
- Properties auto-assigned to an org via `getOrCreateUserOrg()` on creation
- `deploy.yml` runs `supabase/deploy.sql` (full idempotent schema) as part of every deploy — schema is always in sync

### Sign-up flow ✅
- Login page at `/auth/login` toggles between Login and Sign Up modes
- Phone number is **required** on sign up (needed for SMS AI)
- ToS checkbox required; SMS consent checkbox shown when phone is provided
- Sign up creates Supabase auth user + profile + org automatically
- `/terms` and `/sms-policy` pages exist (public, dark theme)

### SMS & AI handler ✅
- SMS webhook at `/api/webhooks/sms` — receives Twilio SMS, responds via AI
- Web chat at `/api/chat` — same AI handler for in-app chat bubble
- AI handler: `src/lib/sms/ai-handler.ts` — uses Claude Haiku 4.5 with structured JSON responses
- Conversation history stored in `conversations` table; last 10 exchanges passed as multi-turn messages
- **History wrapping**: old assistant messages wrapped as `{"type":"reply","reply":"..."}` before
  passing to Claude API to prevent JSON parse errors on follow-up messages
- Action executor: `src/lib/actions/execute-ai-action.ts` — handles `create_work_order`,
  `create_stay`, `update_status`, `create_contact`
- AI rules enforced in system prompt:
  - EXACT property name required (verbatim from PROPERTIES context)
  - CONTACT CHECK: must have matching contact before creating service work orders; asks user to add or skip
  - STAY CREATION: must have guest name before creating stay; asks if missing
  - Must use action types to create things — never announce creation via `type:"reply"`
  - Auto-updates property status (cleaning → needs_cleaning, maintenance → needs_maintenance)
  - Uses real property checklist items for cleaning outbound messages
  - **PRIVACY HARD LIMIT**: NEVER include phone numbers, email addresses, or personal contact details in any reply — contact data is for internal use only (work order notifications), never relay it to the user
  - **UNSUPPORTED ACTIONS**: creating properties, deleting records, billing, inviting team → direct to dashboard UI, never try to perform them

### Work Orders ✅
- List at `/work-orders` — clickable card rows (WO#, priority badge, status, property, category)
- Detail at `/work-orders/[id]` — full dark theme, comments section
- Comments have **internal/external toggle** (default: internal)
  - Internal = team-only note
  - External = emailed to assigned contact; stored with `is_internal = false`
- `is_internal BOOLEAN NOT NULL DEFAULT true` column on `service_request_comments`
- Outbound message fields on `service_requests`: `outbound_message`, `outbound_sent_to`,
  `outbound_method`, `outbound_sent_at` — shows who was notified and how

### Contacts ✅
- List at `/contacts` — clickable card rows with avatar, role, property, phone, email
- Detail at `/contacts/[id]` — edit form (admins only), work orders list, reach-out sidebar
- Add contact at `/contacts/new` — select properties and roles

### Stays ✅
- List at `/stays` — clickable card rows with guest avatar, dates, status
- Detail at `/stays/[id]`:
  - Notes renamed to "Notes for Your Guest" (hidden on guest view if blank)
  - "Guest Link" renamed to "Guest Welcome Page"
  - "Open Guest Checklist" renamed to "Open Guest Welcome Page"
  - "Danger Zone" removed; replaced with plain "Remove Stay" card
  - Copy Link button uses `CopyLinkButton` client component (navigator.clipboard)

### Properties ✅
- List at `/properties` — clickable card rows with dark theme, status badges, open ticket count
- Detail at `/properties/[id]` — tabs: Overview, Contacts, Checklist, AI Instructions, Notes

### Settings ✅
- `/settings` — org name, team members, invitations
- **General AI Instructions**: editable textarea with amber warning banner + "Restore defaults" button
  (admins only). Restore button fills with recommended default instructions via `confirm()` dialog.

### Admin ✅
- `/admin` — usage stats, token usage progress bar (80% amber warning, 95% red critical, 5M limit)

### Getting Started ✅
- `/welcome` — 6-step onboarding guide
  - Step 1 → Add Property (`/properties/new`)
  - Step 2 → Add Contacts (`/contacts`)
  - Steps 3-6 → Checklists, Stays, Work Orders, Team

### Guest pages ✅
- `/guest/[token]` — public guest welcome page (no auth required)
  - Shows property info, wifi/codes from stay notes (if provided)
  - Guests can submit checkout report

### Schema additions (recent)
- `service_request_comments.is_internal` — BOOLEAN NOT NULL DEFAULT true
- `service_requests.outbound_message`, `.outbound_sent_to`, `.outbound_method`, `.outbound_sent_at`
- `profiles.tos_agreed_at`, `.sms_consent`
- `conversations` — stores AI chat history (role, content, channel, user_id, created_at)
- `ai_usage` — tracks token consumption per user per feature

### Deployment
- GitHub Actions: `.github/workflows/deploy.yml` (auto-deploy + auto-migrate on push to `main` OR `claude/**`)
- Git proxy only allows pushing to `claude/` branches — use the feature branch, not main

## Session start: always check error logs first

At the start of EVERY session, before doing anything else, check for unresolved errors:

```sql
SELECT id, created_at, source, route, message, metadata
FROM error_logs
WHERE resolved = false
ORDER BY created_at DESC
LIMIT 20;
```

Run this via the Supabase MCP tool (`mcp__supabase__execute_sql`) or via the management API
(same pattern as `scripts/run-migration.mjs` but with a SELECT).

**If unresolved errors exist:**
1. Group by `route + message` to find the top 3 recurring issues
2. Investigate the relevant code
3. Implement fixes autonomously
4. After deploying fixes, mark errors resolved:
   ```sql
   UPDATE error_logs SET resolved = true
   WHERE resolved = false AND route = '<route>' AND message = '<message>';
   ```

**Error log columns:**
- `source`: 'client' | 'server' | 'action'
- `route`: URL path where crash occurred
- `message`: error message
- `stack`: full stack trace
- `metadata`: JSON with extras (digest, segment, etc.)
- `resolved`: false = needs attention

## SOC 2 & PCI DSS Compliance

**Standing instruction:** If the user asks to implement something that violates SOC 2 or PCI DSS best practices, warn them explicitly before proceeding. Suggest the compliant alternative.

### Compliance posture (as of 2026-02-27)
- **PCI scope**: SAQ A (Stripe Checkout hosted redirect — no card data ever touches the server). ✅
- **SOC 2 target**: Type II (Security, Availability, Confidentiality criteria)

### What is already compliant ✅
- All payments via Stripe Checkout (card data never on our servers)
- Stripe webhook signature verification
- Row-Level Security on all Supabase tables
- SECURITY DEFINER functions prevent privilege escalation
- HTTPS enforced by Vercel
- Encryption at rest (Supabase) and in transit (Vercel TLS)
- Audit log (`audit_log` table) for all changes
- Error logging (`error_logs` table)
- ToS and SMS consent captured at signup
- Property-level and org-level RBAC

### Compliance gaps & known items to address
- **Security headers** — CSP, X-Frame-Options, HSTS, Referrer-Policy, Permissions-Policy must be set (critical for PCI + SOC 2)
- **Privacy Policy** — required for GDPR, CCPA, and SOC 2 Privacy criteria; page must exist at `/privacy`
- **Password policy** — Supabase default minimum is 6 chars; PCI v4.0 requires 12 for admin interfaces; enforce 8+ minimum at minimum, ideally 12
- **MFA** — SOC 2 Type II and PCI DSS v4.0 require MFA for admin access; Supabase supports it but it is not yet exposed to users
- **Session timeout** — No automatic logout after inactivity; configure Supabase token refresh max to 24h
- **Data retention** — `conversations`, `error_logs`, and `guest_reports` IP addresses have no TTL/cleanup; add scheduled cleanup (90-day retention for conversations, 30-day for error_logs)
- **Rate limiting** — Login endpoint has no brute-force protection; add `upstash/ratelimit` or middleware-based limiting
- **Vulnerability scanning** — No automated SAST/dependency scanning in CI; add `npm audit` to deploy.yml

### PCI-specific rules (never violate these)
- NEVER store full card numbers, CVV, or PAN in any table, log, or variable
- NEVER log Stripe secret keys, webhook secrets, or customer payment data
- NEVER render cardholder data on any app page
- ALWAYS verify Stripe webhook signatures before processing
- ALWAYS use Stripe Checkout or Elements — never custom card input forms

## Pricing model (as of 2026-02-27)
- **Base plan**: $50/month — includes 3 properties
- **Additional properties**: $10/month each beyond 3
- **Billing owner**: properties are counted per account owner (not per shared team member)
- Example: 5 properties = $50 + (2 × $10) = $70/month

## What still needs to be done
- See compliance gaps above (security headers + privacy page were implemented 2026-02-27)
- SOC 2 items completed 2026-02-27: session timeout, MFA UI, account deletion, rate limiting, data retention cleanup, npm audit in CI
- **v2 ideas**: photo uploads on tickets/guest reports, recurring tasks, weekly email digest,
  QR codes per property, SMS delivery status tracking, Airbnb/Vrbo calendar integration

## Project structure
```
src/
  app/(app)/          # Authenticated app pages
    admin/            # Usage stats + token bar
    contacts/         # List + [id] detail page
    dashboard/
    properties/       # List + [id] detail + [id]/onboard wizard
    stays/            # List + [id] detail (guest welcome page link)
    welcome/          # 6-step getting started guide
    work-orders/      # List + [id] detail + new
    settings/
  app/auth/           # Login / auth callback (phone required on signup)
  app/guest/          # Public guest welcome page
  app/invite/         # Public invite acceptance
  app/terms/          # Public Terms of Use
  app/sms-policy/     # Public SMS consent policy
  components/
    stays/
      CopyLinkButton.tsx    # 'use client' clipboard copy button
      DeleteStayButton.tsx
    work-orders/
      AddWorkOrderCommentForm.tsx  # internal/external toggle
    settings/
      OrgSettings.tsx       # AI instructions + restore defaults button
  lib/
    actions/          # 'use server' files (server actions only)
      contacts.ts
      execute-ai-action.ts  # AI action executor (WO, stay, status, contact)
      organizations.ts
      stays.ts
      tickets.ts      # addTicketComment with isInternal param + email for external
    sms/
      ai-handler.ts   # Claude Haiku AI handler with conversation history
    contact-roles.ts  # Shared constants (no 'use server' directive)
    supabase/         # Supabase client helpers + types
scripts/
  smoke-test.mjs      # End-to-end smoke test
supabase/
  migrations/         # Incremental SQL migrations
  deploy.sql          # Full schema (all migrations concatenated, idempotent)
.github/
  workflows/
    deploy.yml        # Vercel auto-deploy on push to main OR claude/**
    migrate.yml       # Manual migration runner
```
