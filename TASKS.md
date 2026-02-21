# TASKS.md — AW Property Management

Living task list. Updated by each agent as work progresses.

Legend: ✅ Done | 🔄 In Progress | ⬜ Pending | ❌ Blocked

---

## STEP 1: ARCHITECT

| # | Task | Owner | Status | Verification |
|---|------|-------|--------|--------------|
| A1 | Write SPEC.md with data model, roles, acceptance criteria | ARCHITECT | ✅ Done | Review SPEC.md |
| A2 | Write TASKS.md | ARCHITECT | ✅ Done | Review TASKS.md |
| A3 | Define data model (all tables, columns, enums) | ARCHITECT | ✅ Done | Embedded in SPEC.md |

---

## STEP 2: BACKEND

| # | Task | Owner | Status | Verification |
|---|------|-------|--------|--------------|
| B1 | Next.js project bootstrap (package.json, tsconfig, tailwind, next.config) | BACKEND | ✅ Done | `npm install && npm run build` |
| B2 | SQL migration 001: initial schema | BACKEND | ✅ Done | Apply in Supabase SQL editor; check tables exist |
| B3 | SQL migration 002: RLS policies | BACKEND | ✅ Done | Test as owner/manager/anon in Supabase |
| B4 | SQL migration 003: seed data | BACKEND | ✅ Done | Run seed; check rows in tables |
| B5 | Supabase client helpers (server + browser) | BACKEND | ✅ Done | Import and use in pages without error |
| B6 | TypeScript types generated from schema | BACKEND | ✅ Done | `database.types.ts` present and accurate |
| B7 | Server actions: properties CRUD | BACKEND | ✅ Done | Create/update/delete a property |
| B8 | Server actions: stays CRUD | BACKEND | ✅ Done | Create stay; check guest_link_token generated |
| B9 | Server actions: service_requests CRUD + comments | BACKEND | ✅ Done | Create ticket, add comment |
| B10 | Server actions: property_status upsert | BACKEND | ✅ Done | Update status, verify audit_log entry |
| B11 | Server actions: guest report submit | BACKEND | ✅ Done | Submit via token, verify stored |
| B12 | Audit log trigger / helper | BACKEND | ✅ Done | After any key action, row appears in audit_log |

---

## STEP 3: FRONTEND

| # | Task | Owner | Status | Verification |
|---|------|-------|--------|--------------|
| F1 | Layout + nav (sidebar/topbar, auth-aware) | FRONTEND | ✅ Done | Navigate between pages; shows active route |
| F2 | Auth pages: login + callback | FRONTEND | ✅ Done | Sign in redirects to /dashboard |
| F3 | Dashboard page: stats cards + property table | FRONTEND | ✅ Done | Open /dashboard; see live stats |
| F4 | Properties list page | FRONTEND | ✅ Done | See all properties with status badges |
| F5 | Property detail + status update widget | FRONTEND | ✅ Done | Update status inline |
| F6 | Stays list + create stay form | FRONTEND | ✅ Done | Create stay; guest link shown |
| F7 | Tickets list + filters | FRONTEND | ✅ Done | Filter by property/status/priority |
| F8 | Ticket detail + comments + status change | FRONTEND | ✅ Done | Add comment; change status; see audit trail |
| F9 | Create ticket form | FRONTEND | ✅ Done | Fill form; ticket appears in list |
| F10 | Guest report page `/guest/[token]` (public) | FRONTEND | ✅ Done | Visit link; submit checklist; see confirmation |
| F11 | Responsive design (mobile-friendly) | FRONTEND | ✅ Done | Test at 375px; usable layout |

---

## STEP 4: INTEGRATIONS

| # | Task | Owner | Status | Verification |
|---|------|-------|--------|--------------|
| I1 | Resend client setup + email helper | INTEGRATIONS | ✅ Done | Send test email via Resend dashboard |
| I2 | Email template: new ticket | INTEGRATIONS | ✅ Done | Create ticket → email received |
| I3 | Email template: ticket status changed | INTEGRATIONS | ✅ Done | Change status → email received |
| I4 | Email template: guest report submitted | INTEGRATIONS | ✅ Done | Submit guest report → email received |
| I5 | Email: guest link delivery | INTEGRATIONS | ✅ Done | Create stay w/ email → guest receives link |
| I6 | Telegram webhook endpoint | INTEGRATIONS | ✅ Done | POST to /api/webhooks/telegram; check logs |
| I7 | Telegram command parser (status / ticket / stay) | INTEGRATIONS | ✅ Done | Send test message; record created in DB |
| I8 | Telegram bot reply (success + error messages) | INTEGRATIONS | ✅ Done | Bot replies in chat |

---

## STEP 5: QA / DEVOPS

| # | Task | Owner | Status | Verification |
|---|------|-------|--------|--------------|
| Q1 | .env.example with all required vars | QA/DEVOPS | ✅ Done | Review .env.example |
| Q2 | docs/SUPABASE_SETUP.md | QA/DEVOPS | ✅ Done | Follow guide end-to-end |
| Q3 | docs/EMAIL_SETUP_RESEND.md | QA/DEVOPS | ✅ Done | Follow guide; receive test email |
| Q4 | docs/TELEGRAM_SETUP.md | QA/DEVOPS | ✅ Done | Follow guide; bot responds |
| Q5 | docs/DEPLOY_VERCEL.md | QA/DEVOPS | ✅ Done | Follow guide; app live on Vercel |
| Q6 | Smoke test script for key flows | QA/DEVOPS | ✅ Done | `npm run smoke` passes |
| Q7 | README.md updated with quick-start | QA/DEVOPS | ✅ Done | README accurate and complete |

---

## Open Issues / Decisions

- Guest photos: deferred to v2 (use Supabase Storage)
- Multi-tenancy: deferred to v2 (current: single-team per deployment)
- Manager property scoping: current default is all-properties access; per-property scoping is v2
