-- ============================================================
-- AW Property Management — Full Deploy Script
-- Paste this entire file into:
--   Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- ========================
-- 001: Extensions & Enums
-- ========================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
  CREATE TYPE property_status_enum AS ENUM ('clean','needs_cleaning','needs_maintenance','needs_groceries');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE occupancy_enum AS ENUM ('occupied','unoccupied');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE ticket_category AS ENUM ('maintenance','cleaning','supplies','other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE ticket_priority AS ENUM ('low','medium','high','urgent');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE ticket_status AS ENUM ('open','in_progress','resolved','closed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('owner','manager');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM ('created','updated','deleted');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE audit_entity AS ENUM ('property','property_status','stay','service_request','service_request_comment','guest_report');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ========================
-- 001: Tables
-- ========================

CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role            user_role NOT NULL DEFAULT 'manager',
  full_name       TEXT NOT NULL DEFAULT '',
  phone_number    TEXT,
  email           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, email)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'manager'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, ''),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TABLE IF NOT EXISTS properties (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  address     TEXT NOT NULL DEFAULT '',
  description TEXT,
  owner_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS property_status (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL UNIQUE REFERENCES properties(id) ON DELETE CASCADE,
  status      property_status_enum NOT NULL DEFAULT 'clean',
  occupancy   occupancy_enum NOT NULL DEFAULT 'unoccupied',
  notes       TEXT,
  updated_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION handle_new_property()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.property_status (property_id, status, occupancy, updated_by)
  VALUES (NEW.id, 'clean', 'unoccupied', NEW.owner_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_property_created ON properties;
CREATE TRIGGER on_property_created
  AFTER INSERT ON properties
  FOR EACH ROW EXECUTE FUNCTION handle_new_property();

CREATE TABLE IF NOT EXISTS stays (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id      UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  guest_name       TEXT NOT NULL,
  guest_email      TEXT,
  start_date       DATE NOT NULL,
  end_date         DATE NOT NULL,
  notes            TEXT,
  guest_link_token UUID NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
  created_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS service_requests (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id  UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  stay_id      UUID REFERENCES stays(id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  category     ticket_category NOT NULL DEFAULT 'other',
  priority     ticket_priority NOT NULL DEFAULT 'medium',
  due_date     DATE,
  assignee_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status       ticket_status NOT NULL DEFAULT 'open',
  created_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_request_comments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id  UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  author_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guest_reports (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stay_id      UUID NOT NULL UNIQUE REFERENCES stays(id) ON DELETE CASCADE,
  checklist    JSONB NOT NULL DEFAULT '[]',
  notes        TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address   TEXT
);

CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type audit_entity NOT NULL,
  entity_id   UUID NOT NULL,
  action      audit_action NOT NULL,
  changed_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  before_data JSONB,
  after_data  JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity      ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at  ON audit_log(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_requests_property ON service_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status   ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_stays_property        ON stays(property_id);
CREATE INDEX IF NOT EXISTS idx_stays_dates           ON stays(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_stays_token           ON stays(guest_link_token);

-- ========================
-- 002: RLS
-- ========================

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role::TEXT FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT get_user_role() = 'owner';
$$;

CREATE OR REPLACE FUNCTION is_owner_or_manager()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT get_user_role() IN ('owner', 'manager');
$$;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select"       ON profiles;
DROP POLICY IF EXISTS "profiles_update_self"  ON profiles;
DROP POLICY IF EXISTS "profiles_update_owner" ON profiles;
CREATE POLICY "profiles_select"       ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_self"  ON profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_owner" ON profiles FOR UPDATE TO authenticated USING (is_owner()) WITH CHECK (is_owner());

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "properties_select" ON properties;
DROP POLICY IF EXISTS "properties_insert" ON properties;
DROP POLICY IF EXISTS "properties_update" ON properties;
DROP POLICY IF EXISTS "properties_delete" ON properties;
CREATE POLICY "properties_select" ON properties FOR SELECT TO authenticated USING (is_owner_or_manager());
CREATE POLICY "properties_insert" ON properties FOR INSERT TO authenticated WITH CHECK (is_owner() AND owner_id = auth.uid());
CREATE POLICY "properties_update" ON properties FOR UPDATE TO authenticated USING (is_owner_or_manager()) WITH CHECK (is_owner_or_manager());
CREATE POLICY "properties_delete" ON properties FOR DELETE TO authenticated USING (is_owner());

ALTER TABLE property_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "property_status_select" ON property_status;
DROP POLICY IF EXISTS "property_status_upsert" ON property_status;
CREATE POLICY "property_status_select" ON property_status FOR SELECT TO authenticated USING (is_owner_or_manager());
CREATE POLICY "property_status_upsert" ON property_status FOR ALL    TO authenticated USING (is_owner_or_manager()) WITH CHECK (is_owner_or_manager());

ALTER TABLE stays ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stays_select" ON stays;
DROP POLICY IF EXISTS "stays_insert" ON stays;
DROP POLICY IF EXISTS "stays_update" ON stays;
DROP POLICY IF EXISTS "stays_delete" ON stays;
CREATE POLICY "stays_select" ON stays FOR SELECT TO authenticated USING (is_owner_or_manager());
CREATE POLICY "stays_insert" ON stays FOR INSERT TO authenticated WITH CHECK (is_owner_or_manager());
CREATE POLICY "stays_update" ON stays FOR UPDATE TO authenticated USING (is_owner_or_manager()) WITH CHECK (is_owner_or_manager());
CREATE POLICY "stays_delete" ON stays FOR DELETE TO authenticated USING (is_owner());

ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_requests_select" ON service_requests;
DROP POLICY IF EXISTS "service_requests_insert" ON service_requests;
DROP POLICY IF EXISTS "service_requests_update" ON service_requests;
DROP POLICY IF EXISTS "service_requests_delete" ON service_requests;
CREATE POLICY "service_requests_select" ON service_requests FOR SELECT TO authenticated USING (is_owner_or_manager());
CREATE POLICY "service_requests_insert" ON service_requests FOR INSERT TO authenticated WITH CHECK (is_owner_or_manager());
CREATE POLICY "service_requests_update" ON service_requests FOR UPDATE TO authenticated USING (is_owner_or_manager()) WITH CHECK (is_owner_or_manager());
CREATE POLICY "service_requests_delete" ON service_requests FOR DELETE TO authenticated USING (is_owner());

ALTER TABLE service_request_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "comments_select" ON service_request_comments;
DROP POLICY IF EXISTS "comments_insert" ON service_request_comments;
DROP POLICY IF EXISTS "comments_update" ON service_request_comments;
DROP POLICY IF EXISTS "comments_delete" ON service_request_comments;
CREATE POLICY "comments_select" ON service_request_comments FOR SELECT TO authenticated USING (is_owner_or_manager());
CREATE POLICY "comments_insert" ON service_request_comments FOR INSERT TO authenticated WITH CHECK (is_owner_or_manager());
CREATE POLICY "comments_update" ON service_request_comments FOR UPDATE TO authenticated USING (author_id = auth.uid() OR is_owner()) WITH CHECK (author_id = auth.uid() OR is_owner());
CREATE POLICY "comments_delete" ON service_request_comments FOR DELETE TO authenticated USING (author_id = auth.uid() OR is_owner());

ALTER TABLE guest_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "guest_reports_select"      ON guest_reports;
DROP POLICY IF EXISTS "guest_reports_insert_auth" ON guest_reports;
CREATE POLICY "guest_reports_select"      ON guest_reports FOR SELECT TO authenticated USING (is_owner_or_manager());
CREATE POLICY "guest_reports_insert_auth" ON guest_reports FOR INSERT TO authenticated WITH CHECK (is_owner_or_manager());

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_log_select" ON audit_log;
DROP POLICY IF EXISTS "audit_log_insert" ON audit_log;
CREATE POLICY "audit_log_select" ON audit_log FOR SELECT TO authenticated USING (is_owner_or_manager());
CREATE POLICY "audit_log_insert" ON audit_log FOR INSERT TO authenticated WITH CHECK (is_owner_or_manager());

REVOKE ALL ON profiles                 FROM anon;
REVOKE ALL ON properties               FROM anon;
REVOKE ALL ON property_status          FROM anon;
REVOKE ALL ON stays                    FROM anon;
REVOKE ALL ON service_requests         FROM anon;
REVOKE ALL ON service_request_comments FROM anon;
REVOKE ALL ON guest_reports            FROM anon;
REVOKE ALL ON audit_log                FROM anon;

-- ========================
-- 004: Checklist templates
-- ========================

ALTER TYPE audit_entity ADD VALUE IF NOT EXISTS 'property_checklist_item';

CREATE TABLE IF NOT EXISTS property_checklist_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checklist_items_property ON property_checklist_items(property_id, sort_order);

ALTER TABLE property_checklist_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "checklist_items_select" ON property_checklist_items;
DROP POLICY IF EXISTS "checklist_items_insert" ON property_checklist_items;
DROP POLICY IF EXISTS "checklist_items_update" ON property_checklist_items;
DROP POLICY IF EXISTS "checklist_items_delete" ON property_checklist_items;
CREATE POLICY "checklist_items_select" ON property_checklist_items FOR SELECT TO authenticated USING (is_owner_or_manager());
CREATE POLICY "checklist_items_insert" ON property_checklist_items FOR INSERT TO authenticated WITH CHECK (is_owner_or_manager());
CREATE POLICY "checklist_items_update" ON property_checklist_items FOR UPDATE TO authenticated USING (is_owner_or_manager()) WITH CHECK (is_owner_or_manager());
CREATE POLICY "checklist_items_delete" ON property_checklist_items FOR DELETE TO authenticated USING (is_owner_or_manager());

-- Done!
SELECT 'Schema deployed successfully' AS result;
