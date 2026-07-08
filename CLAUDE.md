# Claude Code — AW Property Management

## Branch
Develop on and push to the branch designated for the current session/task
(e.g. `claude/website-504-gateway-timeout-5rimdw`). If no branch is designated,
create a new `claude/<task>-<suffix>` branch off `main`.

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
- **Do all the work autonomously.** Never ask the user to manually do something in a UI if there is any way to accomplish it via an API, MCP tool, CLI, or code.
- If Supabase MCP tools are available, use them directly to run SQL migrations, inspect schema, etc.
- If Vercel MCP tools are available, use them directly to deploy, set env vars, etc.
- Never give the user step-by-step UI instructions if you can do the action yourself.
- When you genuinely cannot do something (e.g. network blocked, missing credentials), say exactly what is blocking you and what specific value/credential you need — one sentence, no multi-step instructions.

## Third-party services and credentials
All credentials live in `.env.local` (gitignored). If that file exists, read it before asking for credentials.

### Supabase
- **MCP**: If `mcp__supabase__*` tools are available, use them — they have full DB access.
- **Project ref**: `vixpadnfeguwajummnfo` (created 2026-07-08 via the Vercel
  marketplace integration after the original project `ilooxnlkovwbxymwieaj` was
  deleted — free-tier projects paused long enough get removed, which took all
  data and auth users with it).
- **Migration approach**: run `supabase/deploy.sql` as a single idempotent script, or use the MCP execute_sql tool.
- **Schema**: all tables defined in `supabase/deploy.sql`. Current tables: `profiles`, `properties`, `property_status`, `stays`, `service_requests`, `service_request_comments`, `guest_reports`, `audit_log`, `property_checklist_items`, `property_contacts`, `organizations`, `org_members`, `property_access`, `invitations`
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

## Tech stack
- Next.js 16 App Router (Server Components + Server Actions)
- Supabase (Postgres + Auth + RLS)
- Tailwind CSS
- TypeScript strict mode

## Current state (as of 2026-07-08)
The app is a multi-tenant property management SaaS. Here is what has been built:

### Multi-tenant architecture (fully implemented, migration not yet run in production)
- `organizations` table — one org per customer
- `org_members` table — users belonging to an org (roles: owner/admin/member)
- `property_access` table — cross-org property sharing (roles: manager/viewer)
- `invitations` table — token-based invite links (org-wide or property-specific)
- `can_access_property(prop_id)` and `is_property_admin(prop_id)` DB functions used by all RLS policies
- New properties automatically assigned to an org via `getOrCreateUserOrg()` in `src/lib/actions/organizations.ts`
- Migration file: `supabase/migrations/20260221_multi_tenant.sql`
- **STATUS: Full schema (`supabase/deploy.sql`) applied to project `vixpadnfeguwajummnfo` on 2026-07-08.**

### Settings & invites (fully implemented)
- `/settings` — org name editing, team member management, invite link generation
- `/invite/[token]` — public invite acceptance page
- Components: `src/components/settings/OrgSettings.tsx`
- Server actions: `src/lib/actions/organizations.ts`

### Property onboarding wizard (fully implemented)
- Triggered when clicking "Add Property" — multi-step wizard
- Steps: Property Details → Primary Contact → Service Contacts → Checklist → Notes/AI
- Edit mode: accessible via "Edit Setup" button on property detail page
- Components: `src/components/properties/OnboardingWizard.tsx`

### UI
- Dark navy-slate theme (body `#0f1829`, card `#1a2436`, borders `#2a3d58`)
- Sidebar includes: Dashboard, Properties, Stays, Tickets, Settings

### Deployment
- Vercel project `aw-property-management` is linked to this GitHub repo
  (production branch `main`); production domain is `https://smartsumai.com`
  (`NEXT_PUBLIC_APP_URL`), plus `aw-property-management.vercel.app`.
- GitHub Actions: `.github/workflows/deploy.yml` (checks + CLI deploy on push to
  main; deploy step requires the `VERCEL_TOKEN` repo secret, otherwise skipped)
- GitHub Actions: `.github/workflows/migrate.yml` (manual migration runner;
  requires the `SUPABASE_ACCESS_TOKEN` repo secret)
- **STATUS (2026-07-08): Vercel env vars point at Supabase project
  `vixpadnfeguwajummnfo` for production/preview/development.**

### Monitoring & backups (added 2026-07-08)
- **UptimeRobot** keyword monitor (id `803470203`) checks
  `https://www.smartsumai.com/auth/login` every 5 minutes for "Welcome back"
  and emails kurtis@triplecitiestech.com after 5 minutes of downtime. The
  checks also generate constant Supabase API traffic (middleware auth call),
  which keeps the free-tier project from ever being flagged inactive/paused.
- **Nightly data backup**: `.github/workflows/backup.yml` exports every table
  plus auth users to an encrypted artifact (90-day retention) at 06:00 UTC.
  Requires repo secrets `SUPABASE_SERVICE_ROLE_KEY` and `BACKUP_PASSPHRASE`;
  fails loudly until they are added. Restore instructions are in the
  workflow's header comment.

## What still needs to be done
1. **Rotate exposed credentials** — the Vercel token, Supabase access token,
   Twilio auth token, and Resend API key committed to old workflow files are
   public in git history and were still valid as of 2026-07-08. Rotate all
   four, then add the new values as GitHub repo secrets (`VERCEL_TOKEN`,
   `SUPABASE_ACCESS_TOKEN`) and Vercel env vars.
2. **Re-provision users and data** — the original database was deleted with
   all auth users. `aweitsman@awproperties.com` and
   `kurtis@triplecitiestech.com` (role: owner) were recreated on 2026-07-08;
   both have randomly generated passwords (the hardcoded one from the old
   `scripts/create-user.mjs` was rotated because it was public). All property
   data must be re-entered by hand — there is no backup to restore from.
3. **Add a sign-up flow** — the login page has no sign-up form (the "Sign up"
   link is a dead end), and there is no password-reset or password-change
   page; passwords can only be set via the admin API.
4. **Add backup secrets** — `.github/workflows/backup.yml` needs the
   `SUPABASE_SERVICE_ROLE_KEY` and `BACKUP_PASSPHRASE` repo secrets before
   nightly backups start succeeding.
5. **Upgrade Supabase to Pro** (recommended) — free-tier projects pause after
   ~1 week of inactivity and are deleted if paused ~90 days, which is exactly
   how all data was lost. Pro projects never pause and include daily backups.

## Project structure
```
src/
  app/(app)/          # Authenticated app pages
  app/auth/           # Login / auth callback
  app/guest/          # Public guest checklist pages
  app/invite/         # Public invite acceptance
  components/         # React components
  lib/
    actions/          # 'use server' files (server actions only)
    contact-roles.ts  # Shared constants (no 'use server' directive)
    supabase/         # Supabase client helpers + types
scripts/
  smoke-test.mjs      # End-to-end smoke test
  create-user.mjs     # One-time user provisioning
supabase/
  migrations/         # Incremental SQL migrations
  deploy.sql          # Full schema (all migrations concatenated)
.github/
  workflows/
    deploy.yml        # Vercel auto-deploy on push to main
    migrate.yml       # Manual migration runner
    backup.yml        # Nightly encrypted data backup (tables + auth users)
```
