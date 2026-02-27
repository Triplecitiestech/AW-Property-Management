# TASKS.md — AW Property Management
# Last updated: 2026-02-27

Living task list. All v1 work is complete. This file tracks v2 features and ongoing improvements.

Legend: ✅ Done | 🔄 In Progress | ⬜ Pending | ❌ Blocked

---

## V1 — ALL COMPLETE ✅

All original spec items (ARCHITECT, BACKEND, FRONTEND, INTEGRATIONS, QA/DEVOPS) are shipped and live at:
`https://aw-property-management.vercel.app`

Multi-tenancy, SMS AI, work orders, contacts, stays, properties, billing, guest pages, onboarding,
SOC 2 / PCI compliance items — all deployed as of 2026-02-27.

---

## V2 ROADMAP

### P1 — High Value / Next Up

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| V2-1 | **Photo uploads on work orders** | ⬜ Pending | Supabase Storage; attach from WO detail page |
| V2-2 | **Photo uploads on guest reports** | ⬜ Pending | Guest submits photos at checkout; stored per stay |
| V2-3 | **Recurring tasks** | ⬜ Pending | Scheduled WO auto-creation (weekly/monthly); cron via Vercel |
| V2-4 | **Weekly email digest** | ⬜ Pending | Sunday AM summary: open tickets, upcoming stays, statuses |
| V2-5 | **SMS delivery status tracking** | ⬜ Pending | Twilio status webhook → show delivered/failed on WO detail |

### P2 — Growth Features

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| V2-6 | **Airbnb / Vrbo calendar sync** | ⬜ Pending | iCal feed import → auto-create stays |
| V2-7 | **QR codes per property** | ⬜ Pending | Printable QR → guest welcome page; use `qrcode` npm package |
| V2-8 | **Property summary email to guests** | ⬜ Pending | Send guest welcome email with link + key info on stay creation |

### P3 — Compliance & Security

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| V2-9 | **Password policy: 12-char minimum** | ⬜ Pending | Enforce at signup UI; PCI v4.0 requires 12+ for admin interfaces |
| V2-10 | **Mandatory MFA for admin roles** | ⬜ Pending | SOC 2 Type II; Supabase supports TOTP — enforce for org owners |

---

## Completed SOC 2 / Compliance Items

| Item | Completed |
|------|-----------|
| Security headers (CSP, HSTS, X-Frame-Options, etc.) | 2026-02-27 |
| Privacy Policy page at `/privacy` | 2026-02-27 |
| Session timeout (Supabase token max 24h) | 2026-02-27 |
| MFA UI exposed to users | 2026-02-27 |
| Account deletion flow | 2026-02-27 |
| Rate limiting on auth endpoints | 2026-02-27 |
| Data retention cleanup (90d conversations, 30d error_logs) | 2026-02-27 |
| `npm audit` in CI pipeline | 2026-02-27 |

---

## Open Bugs / Issues

_Add issues here as they are discovered. Remove when resolved._

| # | Route | Issue | Priority |
|---|-------|-------|----------|
| — | — | No open bugs as of 2026-02-27 | — |

---

## Notes for Claude

- When starting a new feature from V2 ROADMAP, move it to 🔄 In Progress and note the date
- When complete, mark ✅ Done with the date
- If a bug is found during session-start error log check, add it to Open Bugs before fixing
- Always update this file when the v2 roadmap changes
