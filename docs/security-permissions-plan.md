# Security & Permissions Plan

Last updated: 2026-03-01

## 1. User Roles

| Level | Scope | Column | Values |
|-------|-------|--------|--------|
| Global | System-wide | `profiles.is_super_admin` | true/false |
| Organization | Multi-tenant org | `org_members.role` | owner, admin, member |
| Property | Single property | `property_access.role` | manager, viewer |
| Legacy Profile | Deprecated | `profiles.role` | owner, manager (unused by authz) |

**Super admin** is the only role with global access. All other access is scoped to org membership and property grants.

## 2. Tenant Boundaries

The tenant boundary is the **organization** (`organizations` table). Every resource is scoped through this chain:

```
organization -> org_members -> properties -> (stays, work orders, contacts, checklists)
```

A user can access a property if ANY of these is true:
1. They own it (`properties.owner_id = auth.uid()`)
2. They belong to the same org (`org_members.org_id = properties.org_id`)
3. They have a direct grant (`property_access.user_id = auth.uid()`)

This is enforced by `can_access_property(prop_id)` (SECURITY DEFINER function).

## 3. Tenant-Scoped Entities

| Entity | Scoped By | RLS Function |
|--------|-----------|-------------|
| properties | `can_access_property(id)` | SELECT, UPDATE |
| property_status | `can_access_property(property_id)` | SELECT, UPSERT |
| stays | `can_access_property(property_id)` | SELECT, INSERT, UPDATE |
| service_requests | `can_access_property(property_id)` | SELECT, INSERT, UPDATE |
| service_request_comments | via parent service_request property | SELECT, INSERT, UPDATE |
| property_contacts | `can_access_property(property_id)` | SELECT, INSERT, UPDATE |
| property_checklist_items | `can_access_property(property_id)` | SELECT, INSERT, UPDATE |
| property_checklists | `can_access_property(property_id)` | SELECT, INSERT, UPDATE |
| property_units | `can_access_property(property_id)` | SELECT, INSERT, UPDATE |
| contact_property_links | `can_access_property(property_id)` | SELECT, INSERT, UPDATE |
| guest_reports | via stay -> property | SELECT, INSERT |
| audit_log | changed_by or entity property access | SELECT, INSERT |
| conversations | `user_id = auth.uid()` | SELECT, INSERT |
| subscriptions | `user_id = auth.uid()` | SELECT |
| error_logs | `user_id = auth.uid()` | SELECT |
| organizations | org_members membership | SELECT, UPDATE |
| org_members | org membership check | SELECT, INSERT, UPDATE, DELETE |

All 22 tables have RLS enabled.

## 4. Admin Routes and API Routes

### Admin-Only Routes (server-side RBAC)

| Route | Guard | File |
|-------|-------|------|
| `/admin` | `admin/layout.tsx` (is_super_admin) + `page.tsx` (getAppContext -> effectiveUser) | `src/app/(app)/admin/` |

### Admin-Only Server Actions

| Action | Guard | File |
|--------|-------|------|
| deleteUserAccount | requireSuperAdmin() | `src/lib/actions/admin.ts` |
| updateFeatureRequestStatus | requireSuperAdmin() | `src/lib/actions/admin.ts` |
| createFreeInviteCode | requireSuperAdmin() | `src/lib/actions/free-invites.ts` |
| deactivateFreeInviteCode | requireSuperAdmin() | `src/lib/actions/free-invites.ts` |
| toggleBillingExempt | requireSuperAdmin() | `src/lib/actions/free-invites.ts` |
| startImpersonation | requireSuperAdmin() | `src/lib/actions/impersonation.ts` |
| stopImpersonation | requireSuperAdmin() | `src/lib/actions/impersonation.ts` |

### API Routes Auth

| Route | Auth Method | Status |
|-------|-------------|--------|
| POST /api/chat | Bearer (getUser) | OK |
| GET /api/chat | Bearer (getUser) | OK |
| POST /api/webhooks/sms | Twilio HMAC signature | OK |
| POST /api/stripe/webhook | Stripe signature | OK |
| POST /api/stripe/checkout | Bearer (getUser) | OK |
| POST /api/guest-report | Token-based (guest_link_token) | OK |
| POST /api/log-error | Optional user, rate-limited | OK |
| GET /api/envcheck | Bearer (service role key) | OK |
| POST /api/cleanup | Bearer (service role key) | OK |
| GET /api/health | None (public health check) | OK |
| GET /api/config-check | None (returns Supabase URL only) | OK |
| POST /api/property-summary | Bearer (getUser) | OK |

## 5. Gaps Found (Current Repo)

### GAP-1: Impersonation not used on detail/new pages (MEDIUM)
**Pages using `createClient()` instead of `getAppContext()`:**
- `src/app/(app)/properties/[id]/page.tsx`
- `src/app/(app)/properties/[id]/onboard/page.tsx`
- `src/app/(app)/stays/[id]/page.tsx`
- `src/app/(app)/stays/new/page.tsx`
- `src/app/(app)/contacts/[id]/page.tsx`
- `src/app/(app)/contacts/new/page.tsx`
- `src/app/(app)/settings/page.tsx`
- `src/app/(app)/profile/page.tsx` (acceptable - shows real user's profile)

**Impact:** During impersonation, these pages show the admin's own data, not the impersonated user's data.
**Fix:** Convert to `getAppContext()` and scope queries by `ctx.propertyIds` when impersonating.

### GAP-2: No centralized permission helpers (LOW)
Each page/action authenticates differently. Need standardized helpers:
- `requireAuth()` - authenticate or redirect
- `requireSuperAdmin()` - exists in admin.ts but not shared
- `requirePropertyAccess(propertyId)` - not implemented

### GAP-3: Server actions don't use getAppContext (LOW during normal ops)
Server actions use `createClient()` which enforces RLS via the real user's token.
During impersonation, actions execute as the admin user (not the impersonated user).
This is currently acceptable because:
- Admin creates work orders as themselves (audit trail correct)
- RLS prevents accessing unauthorized properties
**Note:** Document this as intentional behavior.

### GAP-4: free_invite_codes SELECT visible to all authenticated users (MEDIUM)
RLS policy `free_invite_codes_auth_select` uses `USING (true)`.
Any logged-in user can enumerate all invite codes.
**Fix:** Restrict to super_admin in deploy.sql.

## 6. Permission Check Helpers (To Implement)

File: `src/lib/auth/guards.ts`

```typescript
requireAuth()         // Returns user or redirects to /auth/login
requireSuperAdmin()   // Returns user or redirects to /dashboard
requireAppContext()    // Returns AppContext (impersonation-aware)
requirePropertyAccess(ctx, propertyId) // Verifies property in ctx.propertyIds
```

## 7. Impersonation Rules

- `realUserId` = the logged-in admin
- `impersonatedUserId` = the target user
- `effectiveUserId` = impersonatedUserId when active, else realUserId
- ALL UI data queries MUST use effectiveUserId
- ALL admin visibility MUST check effectiveUser's role (not real user)
- Server actions MAY operate as real user (for audit trail)
- Admin nav/pages MUST be hidden when effective user is not admin
