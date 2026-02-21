# AW Property Management — Product Specification v1

## Overview
A property operations web app for a small team managing short-term rental or vacation properties. Enables an owner and managers to track occupancy, property status, service tickets, and guest experience — with email notifications and a Telegram bot for quick updates.

---

## Roles & Permissions

| Role    | Description                                            |
|---------|--------------------------------------------------------|
| owner   | Full access: manage users, properties, everything      |
| manager | Read/write on stays, tickets, status; cannot delete properties or manage users |
| guest   | No account needed; accesses stay-specific checklist via signed token link |

---

## Data Model

### `profiles`
Extends `auth.users`. Created via trigger on signup.

| Column           | Type      | Notes                            |
|------------------|-----------|----------------------------------|
| id               | uuid PK   | References auth.users.id         |
| role             | text      | 'owner' or 'manager'             |
| full_name        | text      |                                  |
| telegram_chat_id | text      | Optional, for DM notifications   |
| created_at       | timestamptz |                                |

### `properties`
| Column      | Type        | Notes               |
|-------------|-------------|---------------------|
| id          | uuid PK     |                     |
| name        | text        | e.g. "Lake Cabin"   |
| address     | text        |                     |
| description | text        | Optional            |
| owner_id    | uuid        | FK → profiles.id    |
| created_at  | timestamptz |                     |

### `property_status`
One row per property (upsert on update).

| Column     | Type        | Notes                                                          |
|------------|-------------|----------------------------------------------------------------|
| id         | uuid PK     |                                                                |
| property_id| uuid UNIQUE | FK → properties.id                                             |
| status     | text        | clean \| needs_cleaning \| needs_maintenance \| needs_groceries |
| occupancy  | text        | occupied \| unoccupied                                         |
| notes      | text        | Optional freeform                                              |
| updated_by | uuid        | FK → profiles.id                                               |
| updated_at | timestamptz |                                                                |

### `stays`
| Column           | Type        | Notes                              |
|------------------|-------------|------------------------------------|
| id               | uuid PK     |                                    |
| property_id      | uuid        | FK → properties.id                 |
| guest_name       | text        |                                    |
| guest_email      | text        | Optional, for sending guest link   |
| start_date       | date        |                                    |
| end_date         | date        |                                    |
| notes            | text        | Optional                           |
| guest_link_token | uuid UNIQUE | Signed link token for guest access |
| created_by       | uuid        | FK → profiles.id                   |
| created_at       | timestamptz |                                    |

### `service_requests`
| Column      | Type        | Notes                                         |
|-------------|-------------|-----------------------------------------------|
| id          | uuid PK     |                                               |
| property_id | uuid        | FK → properties.id                            |
| stay_id     | uuid        | Optional FK → stays.id                        |
| title       | text        |                                               |
| description | text        | Optional                                      |
| category    | text        | maintenance \| cleaning \| supplies \| other  |
| priority    | text        | low \| medium \| high \| urgent               |
| due_date    | date        | Optional                                      |
| assignee_id | uuid        | Optional FK → profiles.id                     |
| status      | text        | open \| in_progress \| resolved \| closed     |
| created_by  | uuid        | FK → profiles.id                              |
| created_at  | timestamptz |                                               |

### `service_request_comments`
| Column     | Type        | Notes                  |
|------------|-------------|------------------------|
| id         | uuid PK     |                        |
| request_id | uuid        | FK → service_requests  |
| author_id  | uuid        | FK → profiles.id       |
| content    | text        |                        |
| created_at | timestamptz |                        |

### `guest_reports`
One report per stay (submitted once by guest).

| Column       | Type        | Notes                              |
|--------------|-------------|------------------------------------|
| id           | uuid PK     |                                    |
| stay_id      | uuid UNIQUE | FK → stays.id                      |
| checklist    | jsonb       | Array of {label, checked}          |
| notes        | text        | Optional freeform notes            |
| submitted_at | timestamptz |                                    |
| ip_address   | text        | For audit                          |

### `audit_log`
| Column       | Type        | Notes                                       |
|--------------|-------------|---------------------------------------------|
| id           | uuid PK     |                                             |
| entity_type  | text        | 'property_status' \| 'service_request' \| 'stay' \| 'guest_report' |
| entity_id    | uuid        |                                             |
| action       | text        | 'created' \| 'updated' \| 'deleted'         |
| changed_by   | uuid        | Nullable (guest actions have no user)       |
| changed_at   | timestamptz |                                             |
| before_data  | jsonb       | Snapshot before change                      |
| after_data   | jsonb       | Snapshot after change                       |

---

## Core Features (v1)

### Dashboard
- Cards: total properties, active stays today, open tickets (by priority), properties needing attention
- Table: property list with current status, occupancy, open ticket count
- Recent audit activity feed

### Properties
- List, create, edit, (soft-delete for owner)
- Status widget: current status + occupancy, quick-update inline

### Stays / Occupancy
- List stays (filterable by property, date range, active)
- Create/edit stay with guest info
- Auto-generate guest_link_token on creation
- Send guest link via email (Resend) or copy-to-clipboard

### Service Requests (Tickets)
- List with filters (property, status, priority, assignee)
- Create ticket (title, category, priority, due date, assignee, notes)
- Ticket detail: description, comments thread, status updates
- Status transitions logged to audit_log

### Guest Report (Public — no auth)
- URL: `/guest/[token]`
- Shows: property name, stay dates, guest name
- Default checklist: cleanliness, towels/linens, kitchen supplies, damage/issues, general satisfaction
- Freeform notes field
- Submit once; after submission shows confirmation
- Triggers email notification to owner/manager

### Email Notifications (Resend)
- New service request created
- Service request status changed
- Guest report submitted

### Telegram Webhook (Phase 1)
- Endpoint: `POST /api/webhooks/telegram`
- Commands parsed from message text:
  - `status: [Property Name] | [status value]` → updates property_status
  - `ticket: [Property Name] | [title] | [priority]` → creates service_request
  - `stay: [Property Name] | [Guest Name] | [start] to [end]` → creates stay
- Bot replies with confirmation or error
- Setup: configure bot webhook URL in BotFather

---

## Acceptance Criteria

### AC-1: Auth
- [ ] Owner can sign up and log in via Supabase email auth
- [ ] Manager can be invited (owner sets their role in profiles table)
- [ ] Unauthenticated users redirected to /auth/login
- [ ] Guest link works without login

### AC-2: Properties
- [ ] Owner can create/edit/delete properties
- [ ] Manager can view/edit (not delete) properties
- [ ] Property status can be updated inline

### AC-3: Stays
- [ ] Owner/manager can create stays with required fields
- [ ] Guest link token is unique per stay
- [ ] Guest link email sent if guest_email provided

### AC-4: Tickets
- [ ] Ticket created with all required fields
- [ ] Status changes recorded in audit_log
- [ ] Comments can be added by owner/manager
- [ ] Email sent on create and status change

### AC-5: Guest Report
- [ ] `/guest/[token]` loads stay info without auth
- [ ] Checklist + notes submittable
- [ ] Cannot re-submit (shows "already submitted" state)
- [ ] Submission triggers email notification

### AC-6: Dashboard
- [ ] Shows aggregate stats
- [ ] Properties with issues highlighted

### AC-7: Telegram
- [ ] Webhook receives messages and responds
- [ ] Valid commands create/update records
- [ ] Invalid commands return helpful error message

---

## v2 Ideas (Not Built)
- Turnover mode with automated status transitions
- QR code per property (links to property status update)
- Photo uploads on guest reports and tickets
- Recurring tasks / scheduled maintenance
- Weekly email digest
- Multi-tenancy (SaaS model, multiple owner organizations)
