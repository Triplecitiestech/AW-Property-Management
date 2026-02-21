# AW Property Management

A property operations web app for managing high-end short-term rental properties. Track occupancy, property status, service tickets, and guest experience — with email notifications and a Telegram bot for quick updates from your phone.

## Features

- **Dashboard** — At-a-glance status of all properties, open tickets, and active stays
- **Properties** — Manage properties with live status (clean/needs cleaning/maintenance/groceries) and occupancy
- **Stays** — Track guest occupancy with auto-generated guest checklist links
- **Service Tickets** — Full ticket management with categories, priorities, assignees, comments, and status tracking
- **Guest Reports** — Signed links for guests to submit checklists (customizable per property, no account needed)
- **Email Notifications** — New tickets, status changes, guest reports via Resend
- **Telegram Bot** — Text your bot to update status, create tickets, and add stays from your phone
- **Audit Log** — Complete history of who changed what and when

## Quick Start

### 1. Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier works)
- A [Resend](https://resend.com) account for emails (optional for basic use)
- A Telegram bot for mobile updates (optional)

### 2. Clone and Install

```bash
git clone https://github.com/your-username/aw-property-management.git
cd aw-property-management
npm install
```

### 3. Environment Setup

```bash
cp .env.example .env.local
# Edit .env.local with your values
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

See [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md) for detailed Supabase setup.

### 4. Run Database Migrations

In your Supabase SQL Editor, run these files in order:
1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `supabase/migrations/004_checklist_and_profile_email.sql`

Optional (dev only): `supabase/migrations/003_seed.sql`

### 5. Start Development Server

```bash
npm run dev
# Open http://localhost:3000
```

### 6. Create Your Account

Go to `http://localhost:3000` → sign up → then run this in Supabase SQL Editor to make yourself owner:

```sql
UPDATE profiles SET role = 'owner' WHERE email = 'your@email.com';
```

## Setup Guides

| Guide | Description |
|-------|-------------|
| [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md) | Database, auth, and RLS setup |
| [docs/EMAIL_SETUP_RESEND.md](docs/EMAIL_SETUP_RESEND.md) | Email notification setup |
| [docs/TELEGRAM_SETUP.md](docs/TELEGRAM_SETUP.md) | Telegram bot for mobile updates |
| [docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md) | Deploy to production on Vercel |

## Telegram Commands

Once set up, text your bot:

```
# Update property status
status: Lake Cabin | needs cleaning
status: City Loft | clean

# Create a service ticket
ticket: Lake Cabin | Sink leaking | high
Create maintenance ticket: heater noise at Mountain Retreat, urgent priority

# Add a stay
stay: City Loft | Jordan Smith | 2024-06-01 to 2024-06-07
```

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Row Level Security)
- **Email**: Resend
- **Deployment**: Vercel

## Roles

| Role | Permissions |
|------|-------------|
| Owner | Full access: all properties, all data, user management |
| Manager | Read/write on stays, tickets, status; no delete on properties |
| Guest | Access their stay's checklist via signed link only; no account needed |

## Running Tests

```bash
# Smoke tests (requires running app + Supabase)
APP_URL=http://localhost:3000 npm run smoke
```

## Project Structure

```
src/
├── app/
│   ├── (app)/          # Authenticated app pages
│   │   ├── dashboard/
│   │   ├── properties/
│   │   ├── stays/
│   │   └── tickets/
│   ├── auth/           # Login + callback
│   ├── guest/[token]/  # Public guest report (no auth)
│   └── api/            # API routes (webhook, guest report)
├── components/         # React components
└── lib/
    ├── actions/        # Server actions (CRUD)
    ├── email/          # Resend email helpers
    ├── supabase/       # Client, server, types
    └── telegram/       # Command parser
supabase/migrations/    # SQL migrations
docs/                   # Setup guides
scripts/                # Smoke tests
```
