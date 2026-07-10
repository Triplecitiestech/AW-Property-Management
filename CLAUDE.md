# Claude Code — AW Property Management (Smart Sumai)

## READ THIS FIRST — Session Start Protocol

At the start of **every** session, before anything else:

1. **Read this entire file** — it is your source of truth.
2. **Check error logs** for unresolved production issues (`error_logs` table,
   `resolved=eq.false` — via Supabase MCP `execute_sql` or the REST API with the
   service role key).
3. **Fix any errors found**, autonomously, before working on new features.
4. **Then proceed** with the task the user gave you.

---

## Branch
Develop on and push to the branch designated for the current session/task
(e.g. `claude/website-504-gateway-timeout-5rimdw`). If no branch is designated,
create a new `claude/<task>-<suffix>` branch off `main`. The git proxy only
allows pushes to `claude/*` branches — pushing `main` directly fails with 403;
`main` moves only by merging PRs.

## Automatic Git workflow
After every set of changes — **do this automatically, without asking for confirmation**:
1. `git pull origin main --no-rebase` — pull main and merge automatically
2. `npx tsc --noEmit && npm run build` — verify build is clean, fix any errors before proceeding
3. Commit with a clear message
4. `git push -u origin <designated-branch>`

## Security — never commit credentials
This is a **public repository**. Never put tokens, API keys, or service-role keys
in workflow files, source, or docs — not even split into fragments. Use GitHub
repository secrets (`${{ secrets.X }}`) in workflows and Vercel project env vars
at runtime. Credentials previously committed here (Vercel token, Supabase access
token, Twilio auth token, Resend key) were exposed and must be considered
compromised until rotated.

## Mandatory pre-push verification
Run before every commit; fix failures before pushing:

```bash
npx tsc --noEmit        # type errors
npm run build           # Next.js runtime violations (server/client boundaries,
                        # 'use server' export rules) — the most important check
node scripts/smoke-test.mjs   # when env vars are available
```

---

## User Preferences — Read and Never Forget

### Design & UI
- **Dark theme everywhere** — every page, every component, no light backgrounds
- **No tables on list pages** — use clickable `<Link>`-wrapped flex card rows
  (full-width, dark, hover state, cursor-pointer)
- **Concise UI copy** — no jargon, no unnecessary words

### Color rules — NEVER use these
- **NEVER** `amber-*`, `orange-*`, or `yellow-*` Tailwind classes anywhere. Instead:
  - Warnings / info / medium priority / cleaning status → `sky-*`
  - High priority / maintenance / alert badges → `rose-*`
  - AI-related UI → `violet-*`
  - Success / active / confirmed → `green-*`
  - Neutral secondary text → `zinc-400` / `zinc-500`

### Autonomy — Senior Developer Mode
- **Do ALL work autonomously** — never tell the user to do something manually if
  an API, MCP tool, CLI, or code can do it
- Never ask for confirmation on routine tasks (commits, builds, migrations)
- Fix errors before reporting success — deploy, test, verify, then summarize
- When genuinely blocked (network, missing credential): one sentence — what is
  blocking + the exact value needed

### Communication style
- Short, direct responses; no narrating every step
- Reference code as `src/lib/foo.ts:42`
- No emojis unless the user uses them first

---

## Third-party services and credentials
All credentials live in `.env.local` (gitignored) locally, GitHub repo secrets in
CI, and Vercel project env vars at runtime. Read `.env.local` first if it exists.

### Supabase
- **MCP**: if `mcp__Supabase__*` tools are available, use them — full DB access.
- **Project ref**: `vixpadnfeguwajummnfo` (created 2026-07-08 via the Vercel
  marketplace integration after the original project `ilooxnlkovwbxymwieaj` was
  deleted — free-tier projects paused long enough get removed, which took all
  data and auth users with it).
- **Migration approach**: run `supabase/deploy.sql` as a single idempotent
  script (MCP `execute_sql`/`apply_migration`).
- **Schema**: all tables in `supabase/deploy.sql`. Current tables: `profiles`,
  `properties`, `property_status`, `stays`, `service_requests`,
  `service_request_comments`, `guest_reports`, `audit_log`,
  `property_checklist_items`, `property_contacts`, `organizations`,
  `org_members`, `property_access`, `invitations`, `error_logs`,
  `conversations`, `ai_usage`
- **Types**: manually maintained in `src/lib/supabase/types.ts`.
- `src/lib/supabase/config.ts` holds public URL/anon-key fallbacks baked into
  the bundle — keep them pointed at the CURRENT project ref.

### Vercel
- **MCP**: if `mcp__Vercel__*` tools are available, use them to deploy and set env vars.
- **Project**: `aw-property-management` under team `Triplecitiestech`
  (`team_Z6t21AVeWBIps4nwkzVAVM95`); production domain `https://smartsumai.com`
  (+ `www`, `aw-property-management.vercel.app`). Production branch: `main`.
- **Required env vars**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, `RESEND_API_KEY`,
  `RESEND_FROM_EMAIL`, `NOTIFY_EMAIL`, `ANTHROPIC_API_KEY`, `TWILIO_ACCOUNT_SID`,
  `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### GitHub
- Git push/pull works via the local proxy at `127.0.0.1` — no token needed;
  pushes restricted to `claude/*` branches.
- Repo: `Triplecitiestech/AW-Property-Management`

---

## Key architectural rules
- **'use server' files** may only export async functions — importing anything
  else from one in a client component is a runtime crash tsc won't catch.
  Shared constants go in plain `.ts` files (see `src/lib/contact-roles.ts`).
- **Database migrations**: new tables/columns go in `supabase/deploy.sql` AND
  `scripts/smoke-test.mjs` (tables array) AND `src/lib/supabase/types.ts`.
- **AI conversation history**: assistant messages in `conversations` are stored
  as human-friendly text. When passing history back to the Claude API, wrap
  assistant content as `JSON.stringify({ type: 'reply', reply: m.content })`.
- **List pages** use `<Link>`-wrapped card rows, never HTML tables.

## Tech stack
- Next.js 16 App Router (Server Components + Server Actions), TypeScript strict
- Supabase (Postgres + Auth + RLS), Tailwind (dark theme, no amber/orange/yellow)
- Resend (email), Twilio (SMS), Stripe (billing — Checkout hosted redirect, SAQ A)
- Anthropic SDK — Claude Haiku for the SMS/chat AI handler (`src/lib/sms/ai-handler.ts`)

---

## Current state (as of 2026-07-09)

Production runs the full feature set from the restored
`claude/review-documentation-1ydwF` line (111 commits that were never merged to
`main`), merged into the active fix branch. The database is the NEW Supabase
project — **all pre-July-2026 data was lost** when the old project was deleted;
users and data are being re-entered.

### Features
- **Marketing site (public)**: `/` homepage with UI sample, `/pricing`, `/faq`,
  `/terms`, `/privacy`, `/sms-policy`
- **Multi-tenant**: organizations / org_members / property_access / invitations,
  RLS via `can_access_property()` + `is_property_admin()`
- **Sign-up**: `/auth/login` toggles login/sign-up; phone required; ToS + SMS consent
- **SMS & AI**: Twilio webhook `/api/webhooks/sms` + in-app `/api/chat` →
  `src/lib/sms/ai-handler.ts` (structured JSON actions, privacy hard limits);
  executor `src/lib/actions/execute-ai-action.ts`
- **Work orders**: `/work-orders` list/detail, internal/external comments
  (external emails the assigned contact)
- **Contacts**: `/contacts` list/detail/new
- **Stays**: `/stays` list/detail, guest welcome link (`/guest/[token]`, public)
- **Properties**: list/detail with Overview, Contacts, Checklist, AI Instructions,
  Notes tabs; onboarding wizard at `/properties/[id]/onboard`
- **Admin**: `/admin` usage stats + token budget bar (sky ≥80%, rose ≥95%)
- **Billing**: `/billing` Stripe Checkout; pricing: $50/mo base incl. 3
  properties, +$10/property beyond
- **Welcome**: `/welcome` 6-step onboarding guide
- **Error logging**: `error_logs` table + `/api/log-error`; data-retention
  cleanup (90d conversations, 30d error_logs)

### Deployment
- `.github/workflows/deploy.yml`: checks + CLI deploy to production on push to
  `main` only (requires `VERCEL_TOKEN` repo secret; skipped gracefully otherwise).
  Preview deploys for `claude/*` branches come from the Vercel Git integration.
- `.github/workflows/migrate.yml`: manual migration runner (needs
  `SUPABASE_ACCESS_TOKEN` secret).

### Monitoring & backups (added 2026-07-08)
- **UptimeRobot** keyword monitor (id `803470203`) checks
  `https://www.smartsumai.com/auth/login` every 5 minutes for "Smart Sumai"
  and emails kurtis@triplecitiestech.com after 5 minutes of downtime. The
  checks also keep constant Supabase API traffic flowing so the free-tier
  project can never be flagged inactive/paused again.
- **Nightly data backup**: `.github/workflows/backup.yml` exports every table
  plus auth users to an encrypted artifact (90-day retention) at 06:00 UTC.
  Requires repo secrets `SUPABASE_SERVICE_ROLE_KEY` and `BACKUP_PASSPHRASE`;
  fails loudly until they are added. Restore instructions in the header comment.

---

## SOC 2 & PCI DSS
**Standing instruction:** warn explicitly if asked for something that violates
SOC 2 / PCI best practice; suggest the compliant alternative.

- PCI scope SAQ A: all payments via Stripe Checkout hosted redirect; webhook
  signatures verified. **Never** store/log card data or Stripe secrets; never
  build custom card forms.
- RLS on all tables, SECURITY DEFINER functions pinned (`search_path`, EXECUTE
  revoked from anon where applicable), security headers, audit + error logs,
  rate limiting on auth, session timeout, MFA UI exposed, retention cleanup.
- Remaining gaps: 12-char password minimum at signup (PCI v4.0), mandatory MFA
  for admin roles (SOC 2 Type II).

---

## What still needs to be done
1. **Rotate exposed credentials** — Vercel token, Supabase account access token,
   Twilio auth token, Resend API key are public in git history and were still
   valid 2026-07-08. Rotate all four; add new `VERCEL_TOKEN` +
   `SUPABASE_ACCESS_TOKEN` repo secrets and update Vercel env vars.
2. **Add backup secrets** — `SUPABASE_SERVICE_ROLE_KEY` + `BACKUP_PASSPHRASE`
   repo secrets so `.github/workflows/backup.yml` starts succeeding.
3. **Re-add third-party env vars on Vercel** — `ANTHROPIC_API_KEY`, `TWILIO_*`,
   `STRIPE_*` were configured for the app's AI/SMS/billing features and need
   fresh values after rotation (see Required env vars above).
4. **Re-enter data** — the old database is unrecoverable; properties, stays,
   contacts, and remaining user accounts must be re-created by hand.
5. **Upgrade Supabase to Pro** (recommended) — free-tier projects pause after
   ~1 week of inactivity and are deleted if paused ~90 days, which is exactly
   how all data was lost. Pro never pauses and includes daily backups.

## v2 Roadmap (next to build)
1. Photo uploads (work orders + guest reports, Supabase Storage)
2. Recurring tasks (scheduled work orders)
3. Weekly email digest
4. SMS delivery status tracking (Twilio delivery webhooks)
5. Airbnb/Vrbo iCal sync
6. QR codes per property (guest welcome page)
7. 12-char password minimum at signup
8. Mandatory MFA for admin roles
