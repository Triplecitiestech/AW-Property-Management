# Supabase Setup Guide

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in or create an account.
2. Click **New Project** → name it (e.g. "aw-property-management") → choose a region close to you → set a strong database password → click **Create new project**.
3. Wait for the project to initialize (~1-2 minutes).

## 2. Get Your API Keys

In your Supabase project dashboard:

1. Go to **Settings** → **API**
2. Copy these values into your `.env.local`:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role / secret** key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret — never expose in browser)

## 3. Run the Migrations

In the Supabase project dashboard, go to **SQL Editor** → click **New query**.

Run the migrations in order:

### Migration 1: Initial Schema
Copy and paste the contents of `supabase/migrations/001_initial_schema.sql` → click **Run**.

### Migration 2: RLS Policies
Copy and paste `supabase/migrations/002_rls_policies.sql` → click **Run**.

### Migration 3: Checklist + Profile Email
Copy and paste `supabase/migrations/004_checklist_and_profile_email.sql` → click **Run**.

> **Note:** Skip `003_seed.sql` in production. Run it only in development after creating a user account.

## 4. Enable Email Auth

1. Go to **Authentication** → **Providers**
2. Make sure **Email** is enabled (it is by default).
3. Under **Email** settings, configure as needed:
   - Enable "Confirm email" for production
   - Disable it for faster local development

## 5. Configure the Auth Redirect URL

1. Go to **Authentication** → **URL Configuration**
2. Add your site URL: `http://localhost:3000` (dev) and your production URL (e.g. `https://yourapp.vercel.app`)
3. Add the redirect URL: `http://localhost:3000/auth/callback` and `https://yourapp.vercel.app/auth/callback`

## 6. Create Your First User (Owner)

**Option A: From the app**
1. Start the app: `npm run dev`
2. Go to `http://localhost:3000/auth/login`
3. Click "Sign up" and create an account.
4. The profile is auto-created with role `manager` by default.
5. In Supabase SQL Editor, run:
   ```sql
   UPDATE profiles SET role = 'owner' WHERE email = 'your@email.com';
   ```

**Option B: From Supabase Dashboard**
1. Go to **Authentication** → **Users** → **Add user**
2. Enter email and password → click **Create user**.
3. Run the UPDATE above to make them owner.

## 7. (Optional) Run Seed Data in Development

After creating at least one user:

```sql
-- In Supabase SQL Editor:
-- Copy and paste the contents of supabase/migrations/003_seed.sql
-- Then click Run
```

This creates 3 sample properties, 2 stays, and 3 tickets.

## 8. Verify Setup

Run this in SQL Editor to confirm everything is working:

```sql
SELECT COUNT(*) FROM profiles;       -- Should show your user
SELECT COUNT(*) FROM properties;     -- Should show 3 if seed was run
SELECT COUNT(*) FROM property_status; -- Should match properties count
```

## Roles

To add a manager:
1. Have them sign up at your app's `/auth/login` page (or create them in Supabase Auth dashboard).
2. Their profile is auto-created as `manager`.
3. No further action needed — managers already have access to all properties.

To promote a user to owner:
```sql
UPDATE profiles SET role = 'owner' WHERE id = 'their-user-uuid';
```

## Troubleshooting

- **"violates row-level security policy"** — Check that the user has the correct role in `profiles`.
- **Profile not created after signup** — Verify the `on_auth_user_created` trigger exists. Run migration 001 again if needed.
- **Can't log in after signup** — Check if email confirmation is required (Authentication settings). In dev, disable it.
