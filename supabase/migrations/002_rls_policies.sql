-- ============================================================
-- Migration 002: Row Level Security Policies
-- Smart Sumi
-- ============================================================

-- ============================================================
-- Helper: get current user role
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role::TEXT FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT get_user_role() = 'owner';
$$;

CREATE OR REPLACE FUNCTION is_owner_or_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT get_user_role() IN ('owner', 'manager');
$$;

-- ============================================================
-- PROFILES
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read all profiles (needed to display assignee names etc.)
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT TO authenticated
  USING (true);

-- Users can update their own profile
CREATE POLICY "profiles_update_self" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Only owner can update other profiles (e.g., assign manager role)
CREATE POLICY "profiles_update_owner" ON profiles
  FOR UPDATE TO authenticated
  USING (is_owner())
  WITH CHECK (is_owner());

-- ============================================================
-- PROPERTIES
-- ============================================================

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view properties
CREATE POLICY "properties_select" ON properties
  FOR SELECT TO authenticated
  USING (is_owner_or_manager());

-- Only owner can create properties
CREATE POLICY "properties_insert" ON properties
  FOR INSERT TO authenticated
  WITH CHECK (is_owner() AND owner_id = auth.uid());

-- Owner can update any property; manager can update (but not delete)
CREATE POLICY "properties_update" ON properties
  FOR UPDATE TO authenticated
  USING (is_owner_or_manager())
  WITH CHECK (is_owner_or_manager());

-- Only owner can delete properties
CREATE POLICY "properties_delete" ON properties
  FOR DELETE TO authenticated
  USING (is_owner());

-- ============================================================
-- PROPERTY STATUS
-- ============================================================

ALTER TABLE property_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "property_status_select" ON property_status
  FOR SELECT TO authenticated
  USING (is_owner_or_manager());

CREATE POLICY "property_status_upsert" ON property_status
  FOR ALL TO authenticated
  USING (is_owner_or_manager())
  WITH CHECK (is_owner_or_manager());

-- ============================================================
-- STAYS
-- ============================================================

ALTER TABLE stays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stays_select" ON stays
  FOR SELECT TO authenticated
  USING (is_owner_or_manager());

CREATE POLICY "stays_insert" ON stays
  FOR INSERT TO authenticated
  WITH CHECK (is_owner_or_manager());

CREATE POLICY "stays_update" ON stays
  FOR UPDATE TO authenticated
  USING (is_owner_or_manager())
  WITH CHECK (is_owner_or_manager());

-- Only owner can delete stays
CREATE POLICY "stays_delete" ON stays
  FOR DELETE TO authenticated
  USING (is_owner());

-- ============================================================
-- SERVICE REQUESTS
-- ============================================================

ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_requests_select" ON service_requests
  FOR SELECT TO authenticated
  USING (is_owner_or_manager());

CREATE POLICY "service_requests_insert" ON service_requests
  FOR INSERT TO authenticated
  WITH CHECK (is_owner_or_manager());

CREATE POLICY "service_requests_update" ON service_requests
  FOR UPDATE TO authenticated
  USING (is_owner_or_manager())
  WITH CHECK (is_owner_or_manager());

CREATE POLICY "service_requests_delete" ON service_requests
  FOR DELETE TO authenticated
  USING (is_owner());

-- ============================================================
-- SERVICE REQUEST COMMENTS
-- ============================================================

ALTER TABLE service_request_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments_select" ON service_request_comments
  FOR SELECT TO authenticated
  USING (is_owner_or_manager());

CREATE POLICY "comments_insert" ON service_request_comments
  FOR INSERT TO authenticated
  WITH CHECK (is_owner_or_manager());

-- Authors can edit their own comments; owners can edit any
CREATE POLICY "comments_update" ON service_request_comments
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR is_owner())
  WITH CHECK (author_id = auth.uid() OR is_owner());

CREATE POLICY "comments_delete" ON service_request_comments
  FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR is_owner());

-- ============================================================
-- GUEST REPORTS
-- ============================================================

ALTER TABLE guest_reports ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read guest reports
CREATE POLICY "guest_reports_select" ON guest_reports
  FOR SELECT TO authenticated
  USING (is_owner_or_manager());

-- Guest reports are inserted via service role (API route) — no RLS insert for anon
-- Authenticated users can also insert (for testing)
CREATE POLICY "guest_reports_insert_auth" ON guest_reports
  FOR INSERT TO authenticated
  WITH CHECK (is_owner_or_manager());

-- ============================================================
-- AUDIT LOG
-- ============================================================

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Only owner/manager can read audit log
CREATE POLICY "audit_log_select" ON audit_log
  FOR SELECT TO authenticated
  USING (is_owner_or_manager());

-- Audit log is written via service role or triggers; no direct user insert
-- Allow authenticated insert for server actions running with user context
CREATE POLICY "audit_log_insert" ON audit_log
  FOR INSERT TO authenticated
  WITH CHECK (is_owner_or_manager());

-- ============================================================
-- GRANT service_role full bypass (already default in Supabase)
-- Ensure anon role has no access by default (covered by RLS)
-- ============================================================

-- Revoke anon access to all tables (RLS handles it, but explicit is safer)
REVOKE ALL ON profiles FROM anon;
REVOKE ALL ON properties FROM anon;
REVOKE ALL ON property_status FROM anon;
REVOKE ALL ON stays FROM anon;
REVOKE ALL ON service_requests FROM anon;
REVOKE ALL ON service_request_comments FROM anon;
REVOKE ALL ON guest_reports FROM anon;
REVOKE ALL ON audit_log FROM anon;
