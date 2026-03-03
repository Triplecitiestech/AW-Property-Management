# Smart Sumai — Engineering Plan

**Date:** 2026-03-03
**Author:** Claude (Staff Engineer)
**Status:** DRAFT — awaiting approval before implementation

---

## Table of Contents

1. [Priority 1: AI Work Order False Success Bug](#priority-1)
2. [Priority 2: Dashboard UI Alignment Bug](#priority-2)
3. [Priority 3: Buildium Integration Planning](#priority-3)
4. [Open Questions](#open-questions)

---

<a id="priority-1"></a>
## Priority 1 — CRITICAL: AI Work Order False Success Bug

### A) Root Cause Analysis

After reading every line of the execution chain (`ai-handler.ts` → `execute-ai-action.ts` → `webhooks/sms/route.ts` → `api/chat/route.ts`), here is the confirmed root cause:

#### The Bug: SMS Conversation History Poisoning

**File:** `src/app/api/webhooks/sms/route.ts`, line ~122

```
1. User sends SMS: "Create a work order for leaky faucet at Lake Cabin"
2. handleAiSms() calls Claude → Claude returns JSON with:
   - type: "create_work_order"
   - reply: "Work order created.\nProperty: Lake Cabin\n..."   ← PRE-WRITTEN
3. SMS webhook saves action.reply to conversations table        ← BEFORE execution
4. executeAiAction() runs → fails (property not found, DB error, etc.)
5. User gets TwiML error response (correct)
6. BUT: conversations table now contains "Work order created..." (WRONG)
7. Next SMS turn: Claude sees "Work order created" in history
8. Claude references the phantom work order as if it exists
```

**Root cause:** Claude writes the confirmation message (`action.reply`) as part of its JSON output BEFORE any database operation executes. The SMS webhook saves this optimistic reply to conversation history at line 122, BEFORE calling `executeAiAction()` at line 130.

#### Hypothesis List (all investigated)

| # | Hypothesis | Verdict |
|---|-----------|---------|
| H1 | Tool call never executed | **CONFIRMED** — If `executeAiAction()` fails, the pre-written reply is already in conversation history |
| H2 | Execution failed silently | **PARTIAL** — `executeAiAction()` does return `{ success: false }` on failure, but the reply was already saved |
| H3 | AI assumed success without checking return | **CONFIRMED** — Claude writes "Work order created" in its JSON response before execution happens |
| H4 | Mutation returning success without DB confirmation | **NOT THE ISSUE** — `executeAiAction()` correctly checks `.select().single()` for the inserted row |
| H5 | Race condition | **NOT THE ISSUE** — The problem is sequential: save happens before execution, not concurrently |
| H6 | Web chat has the same bug | **NO** — `api/chat/route.ts` saves the reply AFTER execution (line 83), using the final result. Only SMS is affected |

#### Contributing Factor: Optimistic Reply Pattern

The system prompt in `ai-handler.ts` (lines 275-289) instructs Claude to write confirmation messages in past tense ("Work order created.") as part of the action JSON. This means EVERY `create_work_order` action arrives with a pre-written success message regardless of whether the DB write will succeed.

### B) Mutation Verification Layer

#### Design: `MutationResult` Contract

Every AI-triggered mutation in `execute-ai-action.ts` must return:

```typescript
interface MutationResult {
  success: boolean
  persistedId: string | null        // The actual DB row ID
  canonicalUrl: string | null       // e.g. "/work-orders/{id}"
  detail: string | null             // Human-readable summary (e.g. "WO-0042 Leaky faucet")
  error: {
    code: string                    // Machine-readable (e.g. "PROPERTY_NOT_FOUND")
    message: string                 // Safe to show to user
  } | null
}
```

#### Validation Rules (enforced in SMS webhook + chat route)

Before sending ANY success message to the user:

```
IF result.success !== true           → FAIL: "Could not create work order: {error.message}"
IF result.persistedId is null/empty  → FAIL: "Creation appeared to succeed but no ID was returned."
IF result.canonicalUrl is null/empty → FAIL: "Work order created but link could not be generated."
```

Only when ALL three conditions pass: send confirmation with the canonical link.

#### Changes Required

| File | Change |
|------|--------|
| `src/lib/actions/execute-ai-action.ts` | Change return type to `MutationResult`. Add `canonicalUrl` to all action returns. |
| `src/app/api/webhooks/sms/route.ts` | **Move conversation save to AFTER execution.** Validate `MutationResult` before constructing reply. |
| `src/app/api/chat/route.ts` | Already saves after execution. Add `MutationResult` validation. Return `canonicalUrl` in response. |
| `src/lib/sms/ai-handler.ts` | Update system prompt: remove past-tense confirmations from action format. Claude should write intent ("I'll create a work order for...") not confirmation ("Work order created.") |

### C) Post-Write Confirmation

After the `.insert().select().single()` succeeds in `executeAiAction`:

```typescript
// 1. Insert
const { data: ticket, error } = await svc
  .from('service_requests')
  .insert(payload)
  .select('id, work_order_number, title, property_id')
  .single()

if (error || !ticket) {
  return { success: false, persistedId: null, canonicalUrl: null, detail: null,
           error: { code: 'INSERT_FAILED', message: error?.message ?? 'Insert returned no data' } }
}

// 2. Verification read-back
const { data: verified } = await svc
  .from('service_requests')
  .select('id, work_order_number, title')
  .eq('id', ticket.id)
  .single()

if (!verified) {
  return { success: false, persistedId: ticket.id, canonicalUrl: null, detail: null,
           error: { code: 'VERIFY_FAILED', message: 'Work order was created but could not be confirmed' } }
}

// 3. Build canonical URL
const canonicalUrl = `/work-orders/${verified.id}`

return {
  success: true,
  persistedId: verified.id,
  canonicalUrl,
  detail: `WO-${String(verified.work_order_number).padStart(4, '0')} ${verified.title}`,
  error: null,
}
```

### D) Canonical Link Requirement

All AI-created resources must have deterministic URLs:

| Resource | URL Pattern | Built From |
|----------|------------|-----------|
| Work Order | `/work-orders/{id}` | `service_requests.id` |
| Stay | `/stays/{id}` | `stays.id` |
| Contact | `/contacts/{id}` | `property_contacts.id` |

The confirmation message template:

```
Work order created: WO-{number} "{title}"
Property: {propertyName}
View: {APP_URL}/work-orders/{id}
```

The `APP_URL` is read from `NEXT_PUBLIC_APP_URL` env var (= `https://smartsumai.com`).

For SMS: include the full URL since SMS clients auto-link.
For web chat: return `canonicalUrl` in the JSON response; the chat UI renders it as a clickable link.

### E) Observability

#### New: `ai_mutation_log` table

```sql
CREATE TABLE IF NOT EXISTS ai_mutation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  channel TEXT NOT NULL,                -- 'sms' | 'web_chat'
  original_prompt TEXT NOT NULL,        -- user's raw message
  parsed_intent TEXT NOT NULL,          -- action type (create_work_order, etc.)
  mutation_payload JSONB NOT NULL,      -- what was sent to the DB
  result_payload JSONB,                 -- what came back from the DB
  error_payload JSONB,                  -- error details if failed
  success BOOLEAN NOT NULL,
  persisted_id TEXT,                    -- ID of created resource
  canonical_url TEXT,                   -- generated URL
  duration_ms INTEGER,                  -- time from intent to result
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Every call to `executeAiAction` logs a row before returning. This makes silent failures impossible — every mutation attempt has a paper trail.

#### Integration Points

| File | What to log |
|------|------------|
| `execute-ai-action.ts` | Log after every mutation (success or failure) |
| `webhooks/sms/route.ts` | Pass `correlationId` and `channel: 'sms'` |
| `api/chat/route.ts` | Pass `correlationId` and `channel: 'web_chat'` |

### F) System Prompt Rule

Add to the AI system prompt in `ai-handler.ts` `buildSystemPrompt()`:

```
MUTATION SAFETY RULES:
- NEVER claim a resource was created in your reply text.
- Write your reply as INTENT, not CONFIRMATION. Example:
  WRONG: "Work order created. Property: Lake Cabin"
  RIGHT: "I'll create a work order for the leaky faucet at Lake Cabin."
- The system will replace your reply with a verified confirmation
  (including the real link) after the database write succeeds.
- If creation fails, the system will show the user the error.
  Your reply text is only used as a fallback.
```

### G) E2E Test

**File:** `tests/e2e/ai-work-order.spec.ts`

Using Browserbase + Playwright against the preview deployment:

```
Test: "AI creates work order and returns verified link"

1. Login as test user
2. Open chat bubble
3. Send: "Create a work order for broken dishwasher at [test property name]"
4. Wait for AI response
5. Assert: response contains a URL matching /work-orders/[uuid]
6. Navigate to the URL
7. Assert: page loads (not 404)
8. Assert: page contains "broken dishwasher" in the title
9. Assert: no console errors on the page
10. Query DB: SELECT * FROM service_requests WHERE id = [extracted uuid]
11. Assert: row exists
12. Assert: title matches
```

```
Test: "AI reports failure when property doesn't exist"

1. Login as test user
2. Send: "Create a work order for broken pipe at Nonexistent Property XYZ"
3. Assert: response contains error language ("could not", "not found", "failed")
4. Assert: response does NOT contain a /work-orders/ URL
5. Query DB: SELECT count(*) FROM service_requests WHERE title ILIKE '%broken pipe%'
6. Assert: count = 0
```

---

<a id="priority-2"></a>
## Priority 2 — Dashboard UI Alignment Bug

### Problem

The Properties card on the dashboard has a Condition column width of `130px`. The badge text for `needs_maintenance` renders as "Needs Maintenance" (~140px including padding), exceeding the column width. This causes:

1. Badge overflow on rows with long condition text
2. Visual stagger between "Clean" (55px badge) and "Needs Maintenance" (140px badge)
3. Inconsistent horizontal alignment between header labels and row data

### Root Cause

In `src/app/(app)/dashboard/page.tsx`, line 32:
```typescript
{ label: 'Condition', width: '130px', align: 'center' },
```

The `.badge` CSS class uses `px-2.5` (20px total padding) + `text-xs font-semibold tracking-wide`. For "Needs Maintenance" at 12px semibold with letter-spacing, the intrinsic width is ~140px — exceeding the 130px column.

### Fix Plan

#### Step 1: Widen column + add overflow protection

```typescript
// dashboard/page.tsx — PROP_COLS
{ label: 'Condition', width: '160px', align: 'center' },
```

Compensate by reducing Occupancy from `110px` → `100px` (its badges like "Occupied" / "Unoccupied" are shorter).

#### Step 2: Add `whitespace-nowrap` to `.badge` in `globals.css`

```css
.badge {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide whitespace-nowrap;
}
```

This prevents ANY badge from wrapping text, ensuring consistent row heights globally.

#### Step 3: Apply same fix to Properties full page

The full Properties page at `src/app/(app)/properties/page.tsx` has the same column:
```typescript
{ label: 'Condition', width: '140px', align: 'center' },
```

Change to `160px` for consistency.

#### Step 4: Left-align the Condition column

Per the user's requirement: "Left-align Condition column."

```typescript
// Both dashboard and properties page
{ label: 'Condition', width: '160px', align: 'left' },
```

Update corresponding `<DataGridCell align="left">` in both files.

### Files Changed

| File | Change |
|------|--------|
| `src/app/globals.css` | Add `whitespace-nowrap` to `.badge` |
| `src/app/(app)/dashboard/page.tsx` | Condition width 130→160px, Occupancy 110→100px, align left |
| `src/app/(app)/properties/page.tsx` | Condition width 140→160px, align left |

### Verification

After deployment, visually verify:
- "Clean", "Needs Cleaning", "Needs Maintenance" all render on one line
- Badges align vertically in their column
- No row height variation
- Header label aligns with data below

---

<a id="priority-3"></a>
## Priority 3 — Buildium Integration Planning (Work Orders v1)

### A) Capability Confirmation

#### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/workorders` | Create a work order |
| `GET` | `/v1/workorders` | List work orders (with filtering) |
| `GET` | `/v1/workorders/{workOrderId}` | Get single work order |
| `PUT` | `/v1/workorders/{workOrderId}` | Update a work order |

No DELETE endpoint exists.

#### Authentication

Two headers on every request:
- `x-buildium-client-id` — account identifier
- `x-buildium-client-secret` — secret key

Requires Buildium Premium subscription.

#### Rate Limiting

10 concurrent requests per second across all endpoints.

#### POST /v1/workorders — Request Body

**Top-level (`WorkOrderPostMessage`):**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `vendor_id` | Integer | **YES** | Must be a vendor already created in Buildium |
| `entry_allowed` | Enum | **YES** | `"Unknown"` / `"Yes"` / `"No"` |
| `work_details` | String | No | Max 65,535 chars |
| `invoice_number` | String | No | Max 50 chars |
| `chargeable_to` | String | No | Max 100 chars |
| `entry_notes` | String | No | Max 65,535 chars |
| `vendor_notes` | String | No | Max 65,535 chars |
| `entry_contact_id` | Integer | No | Must be RentalTenant, AssociationOwner, Staff, or RentalOwner |
| `entry_contact_ids` | Array\<Int\> | No | Same type constraint |
| `line_items` | Array | No | Each item needs `quantity` (required) and `unit_price` (required) |
| `task` | Object | No* | Nested task (see below) |

*`task` is technically optional but in practice you need either `task` or `task_id` to associate the work order with a task.

**Nested `task` (`WorkOrderPostMessageTask`):**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `title` | String | **YES** | Max 127 chars |
| `priority` | Enum | **YES** | `"Low"` / `"Normal"` / `"High"` |
| `status` | Enum | **YES** | `"New"` / `"InProgress"` / `"Completed"` / `"Deferred"` / `"Closed"` |
| `assigned_to_user_id` | Integer | **YES** | Must be a Staff user in Buildium |
| `due_date` | Date | No | Format: YYYY-MM-DD |
| `property_id` | Integer | No | Must be an active property in Buildium |
| `unit_id` | Integer | No | Must belong to the `property_id` |

#### Response (`WorkOrderMessage`)

Returns the created work order with `id`, `title`, `due_date`, `priority`, `status`, `work_details`, `vendor_id`, `entry_allowed`, `amount`, `line_items`, `task`, and more. Priority/Status enums in response include additional `"Unknown"` value.

### B) Field Mapping Plan

| Smart Sumai Field | Location | Buildium Field | Location | Notes |
|-------------------|----------|---------------|----------|-------|
| `title` | `service_requests.title` | `task.title` | Nested task | Max 127 chars — truncate if longer |
| `description` | `service_requests.description` | `work_details` | Top-level | Max 65,535 chars |
| `property_id` | `service_requests.property_id` | `task.property_id` | Nested task | **Requires mapping table** (see C) |
| — | — | `task.unit_id` | Nested task | Smart Sumai has no unit concept yet |
| `priority` | `service_requests.priority` | `task.priority` | Nested task | Enum mapping below |
| `status` | `service_requests.status` | `task.status` | Nested task | Enum mapping below |
| `assignee_id` | `service_requests.assignee_id` | `task.assigned_to_user_id` | Nested task | **Requires mapping table** |
| `due_date` | `service_requests.due_date` | `task.due_date` | Nested task | Direct pass-through (same format) |
| — | — | `vendor_id` | Top-level | **REQUIRED, no SS equivalent** |
| — | — | `entry_allowed` | Top-level | **REQUIRED, no SS equivalent** |
| `description` (extended) | `service_requests.outbound_message` | `vendor_notes` | Top-level | Vendor-facing notes |
| — | Contact on WO | `entry_contact_id` | Top-level | Map from `property_contacts` |

#### Priority Enum Mapping

| Smart Sumai | Buildium |
|-------------|----------|
| `urgent` | `"High"` |
| `high` | `"High"` |
| `medium` | `"Normal"` |
| `low` | `"Low"` |

Note: Smart Sumai has 4 levels; Buildium has 3. Both `urgent` and `high` map to Buildium `"High"`.

#### Status Enum Mapping

| Smart Sumai | Buildium |
|-------------|----------|
| `open` | `"New"` |
| `in_progress` | `"InProgress"` |
| `resolved` | `"Completed"` |
| `closed` | `"Closed"` |

Buildium also has `"Deferred"` — no Smart Sumai equivalent. We won't generate it on push but must handle it on pull.

### C) Missing Data Strategy

| Missing Data Scenario | Strategy | Rationale |
|----------------------|----------|-----------|
| **Vendor not mapped** (vendor_id required) | **Block creation + prompt user** | Buildium requires vendor_id. Show "Select a Buildium vendor" modal before push. Store mapping in `buildium_vendor_mappings` table. |
| **Vendor not selected in SS** | **Default to org-level default vendor** | Allow orgs to set a "default Buildium vendor" in settings. Fall back to prompt if no default. |
| **Property not mapped** | **Block creation + prompt user** | Show "Map this property to Buildium" flow. Store in `buildium_property_mappings`. |
| **Assignee not mapped to Buildium Staff** | **Use org default staff user** | Allow orgs to set a default `assigned_to_user_id`. Fall back to prompt. |
| **No assignee at all** | **Use org default staff user** | Buildium requires it. |
| **Priority `urgent` (no Buildium equivalent)** | **Map to `"High"` automatically** | Closest match. Log the downgrade. |
| **Status mismatch** | **Map using table above** | Direct mapping, no data loss. |
| **Entry allowed unknown** | **Default to `"Unknown"`** | Safe default — Buildium explicitly supports it. |
| **Title > 127 chars** | **Truncate with ellipsis** | Append remainder to `work_details`. |

#### Pending Sync Queue

If a push is blocked (missing mapping), the work order gets status `"pending_sync"` in a new `buildium_sync_queue` table:

```sql
CREATE TABLE buildium_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id UUID REFERENCES service_requests(id),
  org_id UUID REFERENCES organizations(id),
  status TEXT DEFAULT 'pending',        -- pending | synced | failed | skipped
  blocking_reason TEXT,                  -- e.g. "vendor_not_mapped"
  buildium_work_order_id INTEGER,        -- set after successful sync
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Users see a "Pending Sync" badge on the work order and an "Integration Issues" section in Settings.

### D) Sync Strategy

#### Source of Truth (v1)

**Smart Sumai → Buildium (one-way push).** Smart Sumai is the source of truth. No data flows back from Buildium in v1.

#### External ID Storage

New columns on `service_requests`:

```sql
ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS buildium_work_order_id INTEGER,
  ADD COLUMN IF NOT EXISTS buildium_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS buildium_sync_status TEXT DEFAULT 'not_synced';
```

#### Idempotency Rules

1. Before creating in Buildium, check `buildium_work_order_id IS NOT NULL`
2. If already synced, offer "Update in Buildium" instead of "Push to Buildium"
3. Use `buildium_work_order_id` for PUT updates
4. Never create duplicate Buildium work orders for the same SS work order

#### Retry Rules

1. On network failure: retry up to 3 times with exponential backoff (2s, 4s, 8s)
2. On 429 (rate limit): retry after `Retry-After` header or 10s
3. On 4xx validation error: do NOT retry — surface error to user
4. On 5xx: retry up to 3 times, then mark as `failed` in sync queue

#### Duplicate Prevention

- Unique constraint: `buildium_sync_queue(service_request_id)` — one queue entry per work order
- Check `buildium_work_order_id` before insert — skip if already synced
- Log every sync attempt in `ai_mutation_log` with `parsed_intent: 'buildium_push'`

#### Conflict Resolution

Not applicable in v1 (one-way push). For future v2/v3 two-way sync:
- Last-write-wins with `updated_at` comparison
- Alert user on field-level conflicts (title changed in both systems)

### E) Security

| Requirement | Implementation |
|-------------|---------------|
| API keys server-side only | Store `BUILDIUM_CLIENT_ID` and `BUILDIUM_CLIENT_SECRET` in `.env.local` + Vercel env vars. Never expose to browser. |
| No browser exposure | All Buildium API calls happen in server actions or API routes. No `NEXT_PUBLIC_` prefix. |
| Structured logging | Log every Buildium API call to `ai_mutation_log` with `parsed_intent: 'buildium_*'`. Mask the `client_secret` in logs. |
| Key rotation | Document key rotation procedure. Keys can be regenerated in Buildium dashboard. |

New env vars:
```
BUILDIUM_CLIENT_ID=...
BUILDIUM_CLIENT_SECRET=...
```

### F) Staged Rollout

#### Phase 1: Manual Push (v1)

- "Push to Buildium" button on work order detail page (`/work-orders/[id]`)
- Only visible when org has Buildium credentials configured
- Shows mapping modal if vendor/property not mapped
- Confirms success or surfaces error
- Sets `buildium_work_order_id` on success

#### Phase 2: Auto-Push on Creation

- When a work order is created (via UI or AI), auto-push to Buildium if:
  - Org has Buildium enabled
  - All required mappings exist (property, vendor, assignee)
- If mappings missing, queue in `buildium_sync_queue` as `pending`
- Show "Pending Sync" indicator on work order

#### Phase 3: Limited Two-Way Sync

- Webhook or polling from Buildium (status changes, comments)
- Conflict resolution UI
- Bi-directional status sync
- **Scope TBD** — depends on Buildium webhook availability

---

<a id="open-questions"></a>
## Open Questions (Need Answers Before Implementation)

### Priority 1 — AI Bug

1. **Was the demo on SMS or web chat?** SMS has the confirmed bug; web chat saves conversation after execution. This affects which fix is most urgent.
2. **Should we add the `ai_mutation_log` table now, or reuse the existing `audit_log` table?** A dedicated table gives better observability but adds schema complexity.

### Priority 2 — Dashboard UI

3. **Should the Condition column be left-aligned or center-aligned?** The user specification says "left-align Condition column" but the current design centers all badge columns. Confirm preference.

### Priority 3 — Buildium

4. **Do you have Buildium API credentials already?** We need a `client_id` and `client_secret` to begin integration testing.
5. **Do you have a Buildium Premium subscription?** The Open API requires Premium.
6. **Which properties should be mapped first?** Do all Smart Sumai properties have corresponding Buildium properties, or just a subset?
7. **Is there a preferred default vendor in Buildium?** Since `vendor_id` is required, we need either a per-org default or a vendor mapping UI.
8. **Who is the default `assigned_to_user_id` (Staff user) in Buildium?** Required for every work order task.
9. **Should Smart Sumai work orders created by AI also auto-push to Buildium (Phase 2), or only manually-created ones?**
