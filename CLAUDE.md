# Claude Code — AW Property Management
# Last updated: 2026-02-27

---

## READ THIS FIRST — Session Start Protocol

At the start of **every** session, before anything else:

1. **Read this entire file** — it is your source of truth.
2. **Check error logs** for unresolved production issues (SQL below).
3. **Fix any errors found**, autonomously, before working on new features.
4. **Then ask what's next**, or proceed with the task the user gave you.

### Error log query (run this every session start)

MCP may not be available — use the REST API directly:

```bash
SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d= -f2)
SERVICE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY .env.local | cut -d= -f2)

curl -s "$SUPABASE_URL/rest/v1/error_logs?resolved=eq.false&order=created_at.desc&limit=20" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" | jq '.'
```

**If errors exist:**
1. Group by `route + message` — find top 3 recurring issues
2. Read the relevant source files
3. Fix and deploy autonomously
4. Mark resolved:
   ```bash
   curl -s -X PATCH "$SUPABASE_URL/rest/v1/error_logs?resolved=eq.false&route=eq.<route>" \
     -H "apikey: $SERVICE_KEY" \
     -H "Authorization: Bearer $SERVICE_KEY" \
     -H "Content-Type: application/json" \
     -d '{"resolved": true}'
   ```

**Error log columns:**
- `source`: `'client'` | `'server'` | `'action'`
- `route`: URL path where crash occurred
- `message`: error message
- `stack`: full stack trace
- `metadata`: JSON extras (digest, segment, etc.)
- `resolved`: false = needs attention

---

## User Preferences — Read and Never Forget

These are standing preferences that apply to ALL work on this project:

### Design & UI
- **Dark theme everywhere** — every page, every component, no light backgrounds
- **No tables on list pages** — use clickable `<Link>`-wrapped flex card rows
- **Card rows must be** full-width, dark (`bg-zinc-900` or similar), hover state, cursor-pointer
- **Concise UI copy** — no jargon, no unnecessary words

### Color rules — NEVER use these
- **NEVER** `amber-*`, `orange-*`, or `yellow-*` Tailwind classes anywhere in the UI
- These brownish/warm tones are disliked. Use instead:
  - Warnings / info banners / medium priority / cleaning status → `sky-*`
  - High priority / maintenance role / alert badges → `rose-*`
  - AI action badges / AI-related UI → `violet-*`
  - Success / active / confirmed → `green-*`
  - Neutral secondary text → `zinc-400` or `zinc-500`

### Autonomy — Senior Developer Mode
- **Do ALL work autonomously** — never tell the user to do something manually
- **Never ask for confirmation** on routine development tasks (commits, builds, migrations)
- **Never give step-by-step UI instructions** when you can do the action yourself
- **Fix errors before reporting success** — deploy, test, verify, then summarize
- When genuinely blocked (network, missing credential), say exactly: what is blocking + what specific value you need — one sentence only
- **Deployment checklist (every time)**:
  1. Fix code → TypeScript clean → build clean
  2. Commit → push to feature branch
  3. Verify GitHub Actions deploy succeeds
  4. Curl the production URL to verify key pages load
  5. Only then report success

### Communication style
- Short, direct responses — no narrating every step
- Use file path + line number references when pointing to code (`src/lib/foo.ts:42`)
- No emojis unless the user uses them first
- Report blockers in one sentence with the exact credential/value needed

---

## Environment — Proxy & MCP Notes

### Claude Code Remote Proxy
Claude Code Remote routes ALL outbound HTTP through an egress control proxy:
```
GLOBAL_AGENT_HTTPS_PROXY=http://container_...:jwt_[token]
```
This is **Anthropic's sandbox security system** — it is expected and normal. It does NOT block Supabase or Vercel API calls. If an external HTTP call fails, it is a DNS/auth issue, not the proxy.

### Git Proxy
Git push/pull routes through a local proxy at `127.0.0.1`. It restricts pushes to **only `claude/` prefixed branches**. Attempting to push to `main` directly will fail with 403. Always push to the feature branch.

### Supabase MCP
- The Supabase MCP server (`mcp__supabase__*`) is listed in the Claude Code marketplace but is **not active in this environment**.
- **Claude connectors** (connected via claude.ai) are separate from Claude Code MCP tools — connecting Supabase as a Claude connector does NOT make `mcp__supabase__*` tools available here.
- **Workaround (always works)**: use the Supabase REST API directly with `SUPABASE_SERVICE_ROLE_KEY` from `.env.local`. See session-start SQL above.
- If `mcp__supabase__execute_sql` IS available in a future session, prefer it over REST for SQL queries.

### Vercel MCP
- If `mcp__vercel__*` tools are available, use them to deploy and set env vars.
- Fallback: use `VERCEL_TOKEN` from `.env.local` with the Vercel REST API.

### GitHub
- Git operations work without a token (via the `127.0.0.1` proxy).
- Repo: `Triplecitiestech/AW-Property-Management`
- `gh` CLI available for PR creation, issue management, workflow triggers.

---

## Git Workflow — Automatic, Every Time

After **every** set of changes — **do this automatically, no confirmation needed**:

```bash
# 1. Pull latest main and merge
git pull origin main --no-rebase

# 2. Verify build is clean — fix errors before committing
npx tsc --noEmit && npm run build

# 3. Commit
git add <relevant files>
git commit -m "clear descriptive message"

# 4. Push to feature branch
git push -u origin claude/multi-agent-workflow-setup-hU5iv
```

### Pre-push verification (mandatory)
```bash
# TypeScript — catches type errors
npx tsc --noEmit

# Production build — catches Next.js runtime violations
# (server/client boundary errors, 'use server' export rules, missing modules)
npm run build

# Smoke test — when env vars are available
node scripts/smoke-test.mjs
```

**The build step is the most critical.** `tsc --noEmit` will NOT catch Next.js-specific runtime errors like importing a non-function from a `'use server'` file.

---

## Branch
Always develop on and push to: **`claude/multi-agent-workflow-setup-hU5iv`**

---

## Third-Party Services & Credentials

All credentials live in `.env.local` (gitignored). **Read `.env.local` before asking for credentials.**

### .env.local keys
```
ANTHROPIC_API_KEY
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_URL          ← extract project ref: https://<ref>.supabase.co
NOTIFY_EMAIL
RESEND_API_KEY
RESEND_FROM_EMAIL
STRIPE_PRICE_ID
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
SUPABASE_ACCESS_TOKEN
SUPABASE_SERVICE_ROLE_KEY
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER
VERCEL_TOKEN
```

### Supabase
- **Project ref**: `ilooxnlkovwbxymwieaj`
- **Migration approach**: run `supabase/deploy.sql` as single idempotent script
- **Schema**: all tables defined in `supabase/deploy.sql`
- **Types**: manually maintained in `src/lib/supabase/types.ts` — update when schema changes

Current tables:
`profiles`, `properties`, `property_status`, `stays`, `service_requests`, `service_request_comments`,
`guest_reports`, `audit_log`, `property_checklist_items`, `property_contacts`,
`organizations`, `org_members`, `property_access`, `invitations`, `error_logs`,
`conversations`, `ai_usage`

### Vercel
- **Project**: `AW-Property-Management` under org `Triplecitiestech`
- **Required env vars**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `NOTIFY_EMAIL`, `ANTHROPIC_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- **GitHub Actions deploy**: `.github/workflows/deploy.yml` auto-deploys on push to `main` OR `claude/**`

---

## Key Architectural Rules

### Server Actions (`'use server'` files)
- May only export **async functions** — never export `const`, `type`, or other values
- Importing a non-function from a `'use server'` file in a client component causes a **runtime crash that TypeScript won't catch**
- Put shared constants in a plain `.ts` file (no directive) — see `src/lib/contact-roles.ts`

### Client Components
- Components that need data from a server action may only import **async functions**, never plain values
- Use `'use client'` directive only when needed (event handlers, browser APIs, state)

### Database Migrations
- New tables/columns must be added to **both**:
  1. `supabase/deploy.sql` (idempotent full schema)
  2. `scripts/smoke-test.mjs` (tables array for verification)
- Also update `src/lib/supabase/types.ts` manually

### AI Conversation History
- Assistant messages in `conversations` table are stored as human-friendly text (NOT raw JSON)
- When passing history back to Claude API as multi-turn messages, wrap assistant content:
  ```ts
  JSON.stringify({ type: 'reply', reply: m.content })
  ```
  This prevents JSON parse errors on follow-up turns.

### CopyLinkButton Pattern
- Use `navigator.clipboard.writeText()` in a `'use client'` component
- Never use `onClick={undefined}` as a stub
- Component lives at: `src/components/stays/CopyLinkButton.tsx`

### List Pages
- All list pages (properties, stays, work orders, contacts) use `<Link>`-wrapped flex card rows
- Dark theme, hover state, full-width — **NOT HTML tables**

---

## Tech Stack

- **Next.js 16** App Router (Server Components + Server Actions)
- **Supabase** (Postgres + Auth + RLS)
- **Tailwind CSS** (dark theme; no amber/orange/yellow)
- **TypeScript** strict mode
- **Resend** for transactional email
- **Twilio** for SMS (AI webhook + outbound)
- **Stripe** for billing (Checkout hosted redirect, SAQ A scope)
- **Anthropic SDK** — Claude Haiku 4.5 for AI handler (`src/lib/sms/ai-handler.ts`)

---

## Current State (as of 2026-02-27)

The app is a **fully deployed** multi-tenant property management SaaS.

### Live URLs
- **Production**: `https://aw-property-management.vercel.app`
- `deploy.yml` triggers on push to `main` OR `claude/**` — both deploy to production

---

### Features — Fully Deployed ✅

#### Multi-tenant Architecture
- `organizations`, `org_members`, `property_access`, `invitations` tables live in production
- `can_access_property(prop_id)` and `is_property_admin(prop_id)` DB functions deployed
- Properties auto-assigned to org via `getOrCreateUserOrg()` on creation
- `deploy.yml` runs `supabase/deploy.sql` on every deploy — schema always in sync

#### Sign-up Flow
- Login page at `/auth/login` — toggles between Login and Sign Up
- Phone number **required** on sign up (needed for SMS AI)
- ToS checkbox required; SMS consent checkbox shown when phone provided
- Sign up creates: Supabase auth user + profile + org automatically
- Public pages: `/terms`, `/sms-policy`, `/privacy`

#### SMS & AI Handler
- SMS webhook: `/api/webhooks/sms` — receives Twilio SMS, responds via AI
- Web chat: `/api/chat` — same AI handler for in-app chat bubble
- AI handler: `src/lib/sms/ai-handler.ts` — Claude Haiku 4.5, structured JSON responses
- Conversation history: `conversations` table, last 10 exchanges as multi-turn messages
- Action executor: `src/lib/actions/execute-ai-action.ts`
  - Handles: `create_work_order`, `create_stay`, `update_status`, `create_contact`
- AI system prompt rules:
  - EXACT property name required (verbatim from PROPERTIES context)
  - CONTACT CHECK: must have matching contact before creating service work orders
  - STAY CREATION: must have guest name; asks if missing
  - Must use action types to create things — never announce via `type:"reply"`
  - Auto-updates property status (cleaning → needs_cleaning, maintenance → needs_maintenance)
  - Uses real property checklist items for cleaning outbound messages
  - **PRIVACY HARD LIMIT**: NEVER include phone/email/contact details in any reply
  - **UNSUPPORTED ACTIONS**: creating properties, deleting, billing, inviting → direct to UI

#### Work Orders
- List: `/work-orders` — card rows (WO#, priority badge, status, property, category)
- Detail: `/work-orders/[id]` — full dark theme, comments section
- Comments: internal/external toggle (default: internal)
  - Internal = team-only note
  - External = emailed to assigned contact; `is_internal = false`
- DB: `service_request_comments.is_internal BOOLEAN NOT NULL DEFAULT true`
- Outbound fields on `service_requests`: `outbound_message`, `outbound_sent_to`, `outbound_method`, `outbound_sent_at`

#### Contacts
- List: `/contacts` — card rows with avatar, role, property, phone, email
- Detail: `/contacts/[id]` — edit form (admins only), work orders list, reach-out sidebar
- New: `/contacts/new` — select properties and roles

#### Stays
- List: `/stays` — card rows with guest avatar, dates, status
- Detail: `/stays/[id]`:
  - Notes field labeled "Notes for Your Guest" (hidden on guest view if blank)
  - "Guest Welcome Page" link with `CopyLinkButton`
  - "Remove Stay" replaces "Danger Zone"

#### Properties
- List: `/properties` — card rows with dark theme, status badges, open ticket count
- Detail: `/properties/[id]` — tabs: Overview, Contacts, Checklist, AI Instructions, Notes

#### Settings
- `/settings` — org name, team members, invitations
- General AI Instructions: editable textarea (admins only), "Restore defaults" button

#### Admin
- `/admin` — usage stats, token usage progress bar
  - 80% → sky warning, 95% → rose critical, 5M token limit

#### Getting Started / Onboarding
- `/welcome` — 6-step onboarding guide
  - Step 1 → Add Property, Step 2 → Add Contacts, Steps 3-6 → Checklists, Stays, Work Orders, Team

#### Guest Pages
- `/guest/[token]` — public guest welcome page (no auth required)
  - Shows property info, wifi/codes from stay notes
  - Guests can submit checkout report

#### Billing
- `/billing` — Stripe Checkout hosted redirect
- `/pricing`, `/faq` — public marketing pages

---

## SOC 2 & PCI DSS Compliance

**Standing instruction:** Warn explicitly if the user asks for something that violates SOC 2 or PCI best practices. Suggest the compliant alternative.

### PCI Scope: SAQ A ✅
Stripe Checkout hosted redirect — no card data ever touches the server.

### What Is Compliant ✅
- All payments via Stripe Checkout (SAQ A scope)
- Stripe webhook signature verification
- Row-Level Security on all Supabase tables
- SECURITY DEFINER functions prevent privilege escalation
- HTTPS enforced by Vercel
- Encryption at rest (Supabase) and in transit (Vercel TLS)
- Audit log (`audit_log` table) for all changes
- Error logging (`error_logs` table)
- ToS and SMS consent captured at signup
- Property-level and org-level RBAC
- Security headers (CSP, X-Frame-Options, HSTS, Referrer-Policy, Permissions-Policy) ✅ 2026-02-27
- Privacy Policy at `/privacy` ✅ 2026-02-27
- Session timeout configured ✅ 2026-02-27
- MFA UI exposed to users ✅ 2026-02-27
- Account deletion flow ✅ 2026-02-27
- Rate limiting on login/auth endpoints ✅ 2026-02-27
- Data retention cleanup (90d conversations, 30d error_logs) ✅ 2026-02-27
- `npm audit` in CI ✅ 2026-02-27

### Remaining Compliance Gaps
- **Password policy**: Supabase default is 6 chars. PCI v4.0 requires 12+ for admin interfaces. Enforce 12-char minimum at signup UI level.
- **MFA enforcement**: MFA is exposed but not required for admin roles. SOC 2 Type II requires mandatory MFA for admins.

### PCI Hard Rules — Never Violate
- NEVER store card numbers, CVV, PAN in any table, log, or variable
- NEVER log Stripe secret keys, webhook secrets, or payment data
- NEVER render cardholder data on any app page
- ALWAYS verify Stripe webhook signatures before processing
- ALWAYS use Stripe Checkout or Elements — never custom card input forms

---

## Pricing Model

- **Base plan**: $50/month — includes 3 properties
- **Additional properties**: $10/month each beyond 3
- **Billing owner**: counted per account owner, not per team member
- Example: 5 properties = $50 + (2 × $10) = $70/month

---

## v2 Roadmap (next to build)

Priority order based on user value:

1. **Photo uploads** — attach photos to work orders and guest reports (Supabase Storage)
2. **Recurring tasks** — scheduled work orders (weekly, monthly) with auto-creation
3. **Weekly email digest** — summary of open tickets, upcoming stays, property statuses
4. **SMS delivery status tracking** — Twilio delivery webhooks, show delivered/failed in UI
5. **Airbnb / Vrbo calendar integration** — iCal sync for stay auto-creation
6. **QR codes per property** — printable QR linking to guest welcome page
7. **Password policy enforcement** — 12-char minimum at signup (PCI compliance)
8. **Mandatory MFA for admin roles** (SOC 2 Type II)

---

## Project Structure

```
src/
  app/
    (app)/                    # Authenticated app pages
      admin/                  # Usage stats + token bar
      billing/                # Stripe billing portal
      contacts/               # List + [id] detail + new
      dashboard/
      profile/
      properties/             # List + [id] detail + [id]/onboard wizard
      stays/                  # List + [id] detail
      welcome/                # 6-step onboarding guide
      work-orders/            # List + [id] detail + new
      settings/
    api/
      webhooks/sms/           # Twilio SMS webhook → AI handler
      chat/                   # In-app chat bubble API
      guest-report/           # Public guest checkout submission
      property-summary/
      cleanup/                # Data retention cleanup endpoint
      log-error/              # Client-side error logging
      stripe/                 # checkout, portal, webhook
      config-check/
    auth/                     # Login + callback (phone required on signup)
    guest/[token]/            # Public guest welcome page
    terms/                    # Public ToS
    sms-policy/               # Public SMS consent policy
    privacy/                  # Public privacy policy
    pricing/                  # Public pricing page
    faq/                      # Public FAQ
  components/
    stays/
      CopyLinkButton.tsx      # 'use client' clipboard copy
      DeleteStayButton.tsx
    work-orders/
      AddWorkOrderCommentForm.tsx   # internal/external toggle
    settings/
      OrgSettings.tsx              # AI instructions + restore defaults
  lib/
    actions/                  # 'use server' server actions (async functions ONLY)
      contacts.ts
      execute-ai-action.ts    # AI action executor
      organizations.ts
      stays.ts
      tickets.ts              # addTicketComment with isInternal + email
    sms/
      ai-handler.ts           # Claude Haiku AI handler + conversation history
    contact-roles.ts          # Shared constants (NO 'use server' directive)
    supabase/                 # Client helpers + types.ts
scripts/
  smoke-test.mjs              # End-to-end smoke test
supabase/
  migrations/                 # Incremental SQL migrations
  deploy.sql                  # Full idempotent schema
.github/
  workflows/
    deploy.yml                # Auto-deploy on push to main OR claude/**
    migrate.yml               # Manual migration runner
    bootstrap.yml
    setup-vercel-env.yml
    e2e.yml
    cleanup.yml
    smoke-test.yml
```

---

## Schema — Recent Additions

- `service_request_comments.is_internal` — `BOOLEAN NOT NULL DEFAULT true`
- `service_requests.outbound_message`, `.outbound_sent_to`, `.outbound_method`, `.outbound_sent_at`
- `profiles.tos_agreed_at`, `.sms_consent`
- `conversations` — AI chat history (role, content, channel, user_id, created_at)
- `ai_usage` — token consumption per user per feature

---

## System-First Instruction Rule

When giving instructions that involve external systems, ALWAYS begin with:
"In <SYSTEM> ..." where SYSTEM is one of:

- **In GitHub** (repo settings / Actions / secrets / logs) ...
- **In GitHub Actions** (specific workflow run > job > step) ...
- **In Vercel** (project > settings > environment variables > scope Production/Preview/Development) ...
- **In Supabase** (project dashboard > settings > API / database / SQL editor) ...
- **In Twilio** (console > phone numbers / messaging services / webhooks) ...
- **In the repo** (edit file path ...) ...

Never give a task without naming the system and click-path (or file path).

### Capabilities + Limits (this sandbox environment)

```
SYSTEM: GitHub
- Can: read/write repo files, push to claude/* branches, view Actions run status via API
- Cannot: push to main (proxy restriction), access GitHub repo settings UI, modify secrets

SYSTEM: GitHub Actions
- Can: trigger workflows via push, read run results via API, access secrets at runtime
- Cannot: view secret values, modify secrets from sandbox, access runner shell

SYSTEM: Vercel
- Can: deploy via CI (vercel CLI in workflow), push env vars via scripts/setup-vercel-env.mjs
- Cannot: access Vercel dashboard UI, edit settings directly from sandbox

SYSTEM: Supabase
- Can: apply migrations via CI (scripts/run-migration.mjs), query via REST if service key in CI env
- Cannot: access Supabase dashboard UI, run SQL directly from sandbox (no egress)

SYSTEM: Twilio
- Can: read/write webhook config via Twilio REST API in CI (credentials assembled in workflow)
- Cannot: access Twilio console UI from sandbox
```

If you can't do something directly, say so and propose a workaround:
1. CI-based automation (preferred)
2. Manual action in the right system (with exact click-path)
3. Add a minimal credential/integration (with security notes)

---

## Deployment Notes

- In GitHub Actions, `deploy.yml` auto-deploys on push to `main` OR any `claude/**` branch
- Git proxy restricts pushes to `claude/` branches — **never try to push to main directly**
- In GitHub Actions, `deploy.yml` runs `supabase/deploy.sql` — schema is always in sync on deploy
- Production URL: `https://aw-property-management.vercel.app`

### D1: CI Environment Preflight

`scripts/ci-env-preflight.mjs` runs as the FIRST step after `npm ci` in `deploy.yml`.
It verifies all required CI env vars exist and are non-empty BEFORE any migrations,
Twilio config, builds, or deploys run. If any are missing, it exits 1 immediately.

**Reading preflight failures:**
- Output names each missing/empty var and which system it belongs to
- Example: `Missing: TWILIO_AUTH_TOKEN  (set in: Twilio)`
- Fix: In the repo, check `.github/workflows/deploy.yml` env block and "Assemble credentials" step

**Key file:** `scripts/ci-env-preflight.mjs`

### D2: Runtime Environment Check (/api/envcheck)

`GET /api/envcheck` returns booleans for all required runtime env vars on the deployed Vercel app.
Never returns values — only `true`/`false` per key.

**Security:** Requires `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` header.
Returns 401 without it. The service role key is already available in CI.

**Response format:**
```json
{
  "ok": true,
  "present": {
    "NEXT_PUBLIC_SUPABASE_URL": true,
    "SUPABASE_SERVICE_ROLE_KEY": true,
    "TWILIO_AUTH_TOKEN": true
  },
  "environment": "production"
}
```

If `ok: false`, one or more vars are missing. Fix: In Vercel (project > settings > environment variables), ensure the missing key is set with scope = Production.

**Key file:** `src/app/api/envcheck/route.ts`

### Post-Deploy Verification Gate

After every successful deploy, `scripts/post-deploy-verify.mjs` runs as the final step in `deploy.yml`. It performs five checks:

- **A. Supabase schema** — All 17 required tables exist. Calls `list_public_tables()` RPC (defined in `deploy.sql`) via PostgREST. If it fails: In Supabase (SQL editor), check the migration output.
- **B. Twilio webhook** — SMS webhook URL matches `EXPECTED_TWILIO_WEBHOOK_URL`. Reads phone config from Twilio REST API. If it fails: In Twilio (console > phone numbers), verify the phone is in the account.
- **C. App health** — `/api/health` returns `200 { ok: true }`. Retries 3x with 10s delay. If it fails: In Vercel (project > deployments), check the deploy logs.
- **D. CI env vars** — All required env vars are set in CI before running checks. If it fails: In the repo, check `deploy.yml` env block.
- **E. Runtime env vars** — Calls `/api/envcheck` on the deployed app to confirm Vercel runtime vars. If it fails: In Vercel (project > settings > environment variables > Production scope), add the missing key.

**If any check fails, the entire deploy workflow is red.**

**Key files:**
- `scripts/post-deploy-verify.mjs` — the verification script
- `scripts/ci-env-preflight.mjs` — the CI preflight script
- `src/app/api/health/route.ts` — the health endpoint
- `src/app/api/envcheck/route.ts` — the runtime env check endpoint
- `supabase/deploy.sql` — contains `list_public_tables()` RPC function

---

## Environment Variable Matrix

Each variable, where it must be set, and whether it is build-time or runtime.

**Build-time (NEXT_PUBLIC_*) — baked into client JS bundle at build. Must be set in both GitHub Actions env block AND Vercel project env vars (Production scope).**

```
NEXT_PUBLIC_SUPABASE_URL
  GitHub Actions: deploy.yml env block (hardcoded)
  Vercel: Production scope (pushed by scripts/setup-vercel-env.mjs)

NEXT_PUBLIC_SUPABASE_ANON_KEY
  GitHub Actions: deploy.yml env block (hardcoded)
  Vercel: Production scope (pushed by scripts/setup-vercel-env.mjs)

NEXT_PUBLIC_APP_URL
  GitHub Actions: deploy.yml env block (hardcoded)
  Vercel: Production scope (pushed by scripts/setup-vercel-env.mjs)

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  GitHub Actions: deploy.yml env block (${{ secrets.* }})
  Vercel: Production scope (pushed by scripts/setup-vercel-env.mjs)
```

**Server-only runtime — NOT baked into bundle. Must be set in Vercel project env vars (Production scope). Also present in GitHub Actions for CI scripts.**

```
SUPABASE_SERVICE_ROLE_KEY
  GitHub Actions: deploy.yml env block (hardcoded)
  Vercel: Production scope (runtime)

ANTHROPIC_API_KEY
  GitHub Actions: assembled from _AK fragment in deploy.yml
  Vercel: Production scope (runtime)

TWILIO_ACCOUNT_SID
  GitHub Actions: assembled from _TS fragment in deploy.yml
  Vercel: Production scope (runtime)

TWILIO_AUTH_TOKEN
  GitHub Actions: assembled from _TA fragment in deploy.yml
  Vercel: Production scope (runtime)

TWILIO_PHONE_NUMBER
  GitHub Actions: deploy.yml env block (hardcoded)
  Vercel: Production scope (runtime)

RESEND_API_KEY
  GitHub Actions: deploy.yml env block (hardcoded)
  Vercel: Production scope (runtime)

RESEND_FROM_EMAIL
  GitHub Actions: deploy.yml env block (hardcoded)
  Vercel: Production scope (runtime)

NOTIFY_EMAIL
  GitHub Actions: deploy.yml env block (hardcoded)
  Vercel: Production scope (runtime)

STRIPE_SECRET_KEY
  GitHub Actions: deploy.yml env block (${{ secrets.* }})
  Vercel: Production scope (runtime)

STRIPE_WEBHOOK_SECRET
  GitHub Actions: deploy.yml env block (${{ secrets.* }})
  Vercel: Production scope (runtime)

STRIPE_PRICE_ID
  GitHub Actions: deploy.yml env block (${{ secrets.* }})
  Vercel: Production scope (runtime)
```

**CI-only — used only during deploy workflow, NOT needed on Vercel.**

```
VERCEL_TOKEN
  GitHub Actions: assembled from _VT fragment in deploy.yml

SUPABASE_ACCESS_TOKEN
  GitHub Actions: assembled from _SA fragment in deploy.yml

SUPABASE_PROJECT_REF
  GitHub Actions: deploy.yml env block (hardcoded constant)

EXPECTED_TWILIO_WEBHOOK_URL
  GitHub Actions: deploy.yml env block (hardcoded constant)
```
