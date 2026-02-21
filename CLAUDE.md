# Claude Code — AW Property Management

## Branch
Always develop on and push to `claude/multi-agent-workflow-setup-hU5iv`.

## Automatic Git workflow
After every set of changes:
1. `git pull origin main --no-rebase` — pull main and merge automatically
2. Commit with a clear message
3. `git push -u origin claude/multi-agent-workflow-setup-hU5iv`

Do this without asking for confirmation. The user expects automatic pull → merge → push.

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

## Project structure
```
src/
  app/(app)/          # Authenticated app pages
  app/auth/           # Login / auth callback
  app/guest/          # Public guest checklist pages
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
```
