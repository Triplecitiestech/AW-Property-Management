# Claude Code — AW Property Management

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
- **Do all the work autonomously.** Never ask the user to manually do something in a UI if there is any way to accomplish it via an API, MCP tool, CLI, or code.
- If Supabase MCP tools are available, use them directly to run SQL migrations, inspect schema, etc.
- If Vercel MCP tools are available, use them directly to deploy, set env vars, etc.
- Never give the user step-by-step UI instructions if you can do the action yourself.
- When you genuinely cannot do something (e.g. network blocked, missing credentials), say exactly what is blocking you and what specific value/credential you need — one sentence, no multi-step instructions.

## Third-party services and credentials
All credentials live in `.env.local` (gitignored). If that file exists, read it before asking for credentials.

### Supabase
- **MCP**: If `mcp__supabase__*` tools are available, use them — they have full DB access.
- **Project ref**: stored in `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` (extract the ref from `https://<ref>.supabase.co`)
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

## Current state (as of 2026-02-23)
The app is a multi-tenant property management SaaS. Here is what has been built:

### Multi-tenant architecture (fully implemented, migration not yet run in production)
- `organizations` table — one org per customer
- `org_members` table — users belonging to an org (roles: owner/admin/member)
- `property_access` table — cross-org property sharing (roles: manager/viewer)
- `invitations` table — token-based invite links (org-wide or property-specific)
- `can_access_property(prop_id)` and `is_property_admin(prop_id)` DB functions used by all RLS policies
- New properties automatically assigned to an org via `getOrCreateUserOrg()` in `src/lib/actions/organizations.ts`
- Migration file: `supabase/migrations/20260221_multi_tenant.sql`
- **STATUS: Migration NOT yet run in production Supabase — must be run before the app works**

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
- GitHub Actions: `.github/workflows/deploy.yml` (auto-deploy to Vercel on push to main)
- GitHub Actions: `.github/workflows/migrate.yml` (manual migration runner)
- **STATUS: Vercel project exists but env vars not yet configured — app not live yet**

## What still needs to be done
1. **Run the Supabase migration** — execute `supabase/migrations/20260221_multi_tenant.sql` in production
2. **Configure Vercel env vars** — set all required env vars on the Vercel project
3. **Merge branch to main** — merge `claude/multi-agent-workflow-setup-hU5iv` into `main` so GitHub Actions deploys
4. **Add a sign-up flow** — the login page has no sign-up form; new tenants can't self-register yet

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
```
