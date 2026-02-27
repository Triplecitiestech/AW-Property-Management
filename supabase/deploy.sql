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
  CREATE TYPE ticket_category AS ENUM ('maintenance','cleaning','supplies','plumbing','electrical','hvac','landscaping','other');
EXCEPTION WHEN duplicate_object THEN null; END $$;
-- Expand existing enum if it exists (idempotent — postgres ignores if value already present)
DO $$ BEGIN ALTER TYPE ticket_category ADD VALUE IF NOT EXISTS 'plumbing';     EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN ALTER TYPE ticket_category ADD VALUE IF NOT EXISTS 'electrical';   EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN ALTER TYPE ticket_category ADD VALUE IF NOT EXISTS 'hvac';         EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN ALTER TYPE ticket_category ADD VALUE IF NOT EXISTS 'landscaping';  EXCEPTION WHEN others THEN null; END $$;

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
  CREATE TYPE audit_entity AS ENUM (
    'property','property_status','stay','service_request',
    'service_request_comment','guest_report',
    'property_checklist_item','org_member','property_access'
  );
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

CREATE SEQUENCE IF NOT EXISTS work_order_number_seq;
CREATE TABLE IF NOT EXISTS service_requests (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id        UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  stay_id            UUID REFERENCES stays(id) ON DELETE SET NULL,
  title              TEXT NOT NULL,
  description        TEXT,
  category           ticket_category NOT NULL DEFAULT 'other',
  priority           ticket_priority NOT NULL DEFAULT 'medium',
  due_date           DATE,
  assignee_id        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_contact_id UUID REFERENCES property_contacts(id) ON DELETE SET NULL,
  status             ticket_status NOT NULL DEFAULT 'open',
  source             TEXT,
  created_by         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Add work_order_number and source to existing tables (idempotent)
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS work_order_number INTEGER DEFAULT nextval('work_order_number_seq');
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS assigned_contact_id UUID REFERENCES property_contacts(id) ON DELETE SET NULL;

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

-- ========================
-- 005: Property contacts, quick notes, AI instructions
-- ========================

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS quick_notes      TEXT,
  ADD COLUMN IF NOT EXISTS ai_instructions TEXT;

CREATE TABLE IF NOT EXISTS property_contacts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'other',
  phone       TEXT,
  email       TEXT,
  notes       TEXT,
  is_primary  BOOLEAN NOT NULL DEFAULT false,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_contacts_property
  ON property_contacts(property_id, sort_order);

ALTER TABLE property_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contacts_select" ON property_contacts;
DROP POLICY IF EXISTS "contacts_insert" ON property_contacts;
DROP POLICY IF EXISTS "contacts_update" ON property_contacts;
DROP POLICY IF EXISTS "contacts_delete" ON property_contacts;
CREATE POLICY "contacts_select" ON property_contacts FOR SELECT TO authenticated USING (is_owner_or_manager());
CREATE POLICY "contacts_insert" ON property_contacts FOR INSERT TO authenticated WITH CHECK (is_owner_or_manager());
CREATE POLICY "contacts_update" ON property_contacts FOR UPDATE TO authenticated USING (is_owner_or_manager()) WITH CHECK (is_owner_or_manager());
CREATE POLICY "contacts_delete" ON property_contacts FOR DELETE TO authenticated USING (is_owner_or_manager());

-- ========================
-- 006: Multi-tenant / SaaS
-- ========================

CREATE TABLE IF NOT EXISTS organizations (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS org_members (
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (org_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON org_members(user_id);

CREATE TABLE IF NOT EXISTS property_access (
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'manager' CHECK (role IN ('manager', 'viewer')),
  granted_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (property_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_property_access_user ON property_access(user_id);

CREATE TABLE IF NOT EXISTS invitations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token       TEXT UNIQUE NOT NULL
                DEFAULT replace(gen_random_uuid()::text, '-', '') ||
                         replace(gen_random_uuid()::text, '-', ''),
  org_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member',
  invited_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  email       TEXT,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT invitation_target CHECK (org_id IS NOT NULL OR property_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);

ALTER TABLE properties ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION can_access_property(prop_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    EXISTS (SELECT 1 FROM properties p WHERE p.id = prop_id AND p.owner_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM org_members om JOIN properties p ON p.org_id = om.org_id
      WHERE p.id = prop_id AND om.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM property_access pa WHERE pa.property_id = prop_id AND pa.user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION is_property_admin(prop_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    EXISTS (SELECT 1 FROM properties p WHERE p.id = prop_id AND p.owner_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM org_members om JOIN properties p ON p.org_id = om.org_id
      WHERE p.id = prop_id AND om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
    );
$$;

-- Re-apply property + related-table RLS using new functions
DROP POLICY IF EXISTS "properties_select" ON properties;
DROP POLICY IF EXISTS "properties_insert" ON properties;
DROP POLICY IF EXISTS "properties_update" ON properties;
DROP POLICY IF EXISTS "properties_delete" ON properties;
CREATE POLICY "properties_select" ON properties FOR SELECT TO authenticated USING (can_access_property(id));
CREATE POLICY "properties_insert" ON properties FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "properties_update" ON properties FOR UPDATE TO authenticated USING (can_access_property(id)) WITH CHECK (can_access_property(id));
CREATE POLICY "properties_delete" ON properties FOR DELETE TO authenticated USING (is_property_admin(id));

DROP POLICY IF EXISTS "property_status_select" ON property_status;
DROP POLICY IF EXISTS "property_status_upsert" ON property_status;
CREATE POLICY "property_status_select" ON property_status FOR SELECT TO authenticated USING (can_access_property(property_id));
CREATE POLICY "property_status_upsert" ON property_status FOR ALL TO authenticated USING (can_access_property(property_id)) WITH CHECK (can_access_property(property_id));

DROP POLICY IF EXISTS "stays_select" ON stays; DROP POLICY IF EXISTS "stays_insert" ON stays; DROP POLICY IF EXISTS "stays_update" ON stays; DROP POLICY IF EXISTS "stays_delete" ON stays;
CREATE POLICY "stays_select" ON stays FOR SELECT TO authenticated USING (can_access_property(property_id));
CREATE POLICY "stays_insert" ON stays FOR INSERT TO authenticated WITH CHECK (can_access_property(property_id));
CREATE POLICY "stays_update" ON stays FOR UPDATE TO authenticated USING (can_access_property(property_id)) WITH CHECK (can_access_property(property_id));
CREATE POLICY "stays_delete" ON stays FOR DELETE TO authenticated USING (is_property_admin(property_id));

DROP POLICY IF EXISTS "service_requests_select" ON service_requests; DROP POLICY IF EXISTS "service_requests_insert" ON service_requests; DROP POLICY IF EXISTS "service_requests_update" ON service_requests; DROP POLICY IF EXISTS "service_requests_delete" ON service_requests;
CREATE POLICY "service_requests_select" ON service_requests FOR SELECT TO authenticated USING (can_access_property(property_id));
CREATE POLICY "service_requests_insert" ON service_requests FOR INSERT TO authenticated WITH CHECK (can_access_property(property_id));
CREATE POLICY "service_requests_update" ON service_requests FOR UPDATE TO authenticated USING (can_access_property(property_id)) WITH CHECK (can_access_property(property_id));
CREATE POLICY "service_requests_delete" ON service_requests FOR DELETE TO authenticated USING (is_property_admin(property_id));

DROP POLICY IF EXISTS "checklist_items_select" ON property_checklist_items; DROP POLICY IF EXISTS "checklist_items_insert" ON property_checklist_items; DROP POLICY IF EXISTS "checklist_items_update" ON property_checklist_items; DROP POLICY IF EXISTS "checklist_items_delete" ON property_checklist_items;
CREATE POLICY "checklist_items_select" ON property_checklist_items FOR SELECT TO authenticated USING (can_access_property(property_id));
CREATE POLICY "checklist_items_insert" ON property_checklist_items FOR INSERT TO authenticated WITH CHECK (can_access_property(property_id));
CREATE POLICY "checklist_items_update" ON property_checklist_items FOR UPDATE TO authenticated USING (can_access_property(property_id)) WITH CHECK (can_access_property(property_id));
CREATE POLICY "checklist_items_delete" ON property_checklist_items FOR DELETE TO authenticated USING (can_access_property(property_id));

DROP POLICY IF EXISTS "contacts_select" ON property_contacts; DROP POLICY IF EXISTS "contacts_insert" ON property_contacts; DROP POLICY IF EXISTS "contacts_update" ON property_contacts; DROP POLICY IF EXISTS "contacts_delete" ON property_contacts;
CREATE POLICY "contacts_select" ON property_contacts FOR SELECT TO authenticated USING (can_access_property(property_id));
CREATE POLICY "contacts_insert" ON property_contacts FOR INSERT TO authenticated WITH CHECK (can_access_property(property_id));
CREATE POLICY "contacts_update" ON property_contacts FOR UPDATE TO authenticated USING (can_access_property(property_id)) WITH CHECK (can_access_property(property_id));
CREATE POLICY "contacts_delete" ON property_contacts FOR DELETE TO authenticated USING (can_access_property(property_id));

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "organizations_select" ON organizations FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = id AND om.user_id = auth.uid()));
CREATE POLICY "organizations_insert" ON organizations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "organizations_update" ON organizations FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = id AND om.user_id = auth.uid() AND om.role IN ('owner', 'admin')));

ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_members_select" ON org_members FOR SELECT TO authenticated USING (org_id IN (SELECT om2.org_id FROM org_members om2 WHERE om2.user_id = auth.uid()));
CREATE POLICY "org_members_insert" ON org_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = org_id AND om.user_id = auth.uid() AND om.role IN ('owner', 'admin')));
CREATE POLICY "org_members_delete" ON org_members FOR DELETE TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = org_id AND om.user_id = auth.uid() AND om.role IN ('owner', 'admin')));

ALTER TABLE property_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "property_access_select" ON property_access FOR SELECT TO authenticated USING (can_access_property(property_id));
CREATE POLICY "property_access_insert" ON property_access FOR INSERT TO authenticated WITH CHECK (is_property_admin(property_id));
CREATE POLICY "property_access_delete" ON property_access FOR DELETE TO authenticated USING (is_property_admin(property_id) OR user_id = auth.uid());

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invitations_select" ON invitations FOR SELECT TO authenticated USING (true);
CREATE POLICY "invitations_insert" ON invitations FOR INSERT TO authenticated WITH CHECK (invited_by = auth.uid());
CREATE POLICY "invitations_delete" ON invitations FOR DELETE TO authenticated USING (invited_by = auth.uid());

-- ========================
-- 007: Tighten remaining RLS
-- ========================

-- service_request_comments: scope to property access (was is_owner_or_manager — global leak)
DROP POLICY IF EXISTS "comments_select" ON service_request_comments;
DROP POLICY IF EXISTS "comments_insert" ON service_request_comments;
DROP POLICY IF EXISTS "comments_update" ON service_request_comments;
DROP POLICY IF EXISTS "comments_delete" ON service_request_comments;
CREATE POLICY "comments_select" ON service_request_comments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM service_requests sr WHERE sr.id = request_id AND can_access_property(sr.property_id))
);
CREATE POLICY "comments_insert" ON service_request_comments FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM service_requests sr WHERE sr.id = request_id AND can_access_property(sr.property_id))
);
CREATE POLICY "comments_update" ON service_request_comments FOR UPDATE TO authenticated
  USING   (author_id = auth.uid() OR EXISTS (SELECT 1 FROM service_requests sr WHERE sr.id = request_id AND is_property_admin(sr.property_id)))
  WITH CHECK (author_id = auth.uid() OR EXISTS (SELECT 1 FROM service_requests sr WHERE sr.id = request_id AND is_property_admin(sr.property_id)));
CREATE POLICY "comments_delete" ON service_request_comments FOR DELETE TO authenticated USING (
  author_id = auth.uid() OR EXISTS (SELECT 1 FROM service_requests sr WHERE sr.id = request_id AND is_property_admin(sr.property_id))
);

-- guest_reports: scope to property access via stay (was is_owner_or_manager — global leak)
DROP POLICY IF EXISTS "guest_reports_select"      ON guest_reports;
DROP POLICY IF EXISTS "guest_reports_insert_auth" ON guest_reports;
CREATE POLICY "guest_reports_select" ON guest_reports FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM stays s WHERE s.id = stay_id AND can_access_property(s.property_id))
);
CREATE POLICY "guest_reports_insert_auth" ON guest_reports FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM stays s WHERE s.id = stay_id AND can_access_property(s.property_id))
);

-- audit_log: scope to own entries + accessible properties (was is_owner_or_manager — global leak)
DROP POLICY IF EXISTS "audit_log_select" ON audit_log;
DROP POLICY IF EXISTS "audit_log_insert" ON audit_log;
CREATE POLICY "audit_log_select" ON audit_log FOR SELECT TO authenticated USING (
  changed_by = auth.uid()
  OR (entity_type = 'property' AND can_access_property(entity_id))
  OR EXISTS (SELECT 1 FROM stays          s  WHERE s.id  = entity_id AND can_access_property(s.property_id))
  OR EXISTS (SELECT 1 FROM service_requests sr WHERE sr.id = entity_id AND can_access_property(sr.property_id))
  OR EXISTS (SELECT 1 FROM property_status  ps WHERE ps.id = entity_id AND can_access_property(ps.property_id))
);
CREATE POLICY "audit_log_insert" ON audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- org_members: add missing UPDATE policy (needed for role changes)
DROP POLICY IF EXISTS "org_members_update" ON org_members;
CREATE POLICY "org_members_update" ON org_members FOR UPDATE TO authenticated
  USING   (EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = org_id AND om.user_id = auth.uid() AND om.role IN ('owner', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = org_id AND om.user_id = auth.uid() AND om.role IN ('owner', 'admin')));

-- Make organizations policies idempotent (drop before re-create)
DROP POLICY IF EXISTS "organizations_select" ON organizations;
DROP POLICY IF EXISTS "organizations_insert" ON organizations;
DROP POLICY IF EXISTS "organizations_update" ON organizations;
CREATE POLICY "organizations_select" ON organizations FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = id AND om.user_id = auth.uid()));
CREATE POLICY "organizations_insert" ON organizations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "organizations_update" ON organizations FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = id AND om.user_id = auth.uid() AND om.role IN ('owner', 'admin')));

-- ========================
-- 008: AI Chat, Billing, Super Admin
-- ========================

-- Super admin flag
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT false;

-- AI property summary
ALTER TABLE properties ADD COLUMN IF NOT EXISTS ai_summary TEXT;

-- Checklist checked state
ALTER TABLE property_checklist_items ADD COLUMN IF NOT EXISTS is_checked BOOLEAN NOT NULL DEFAULT false;

-- Conversations (synced between SMS and web chat)
CREATE TABLE IF NOT EXISTS conversations (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT NOT NULL,
  channel    TEXT NOT NULL DEFAULT 'web' CHECK (channel IN ('sms', 'web')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id, created_at DESC);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conversations_select" ON conversations;
DROP POLICY IF EXISTS "conversations_insert" ON conversations;
CREATE POLICY "conversations_select" ON conversations FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "conversations_insert" ON conversations FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Feature requests
CREATE TABLE IF NOT EXISTS feature_requests (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewing','planned','done','declined')),
  votes       INT NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "feature_requests_select" ON feature_requests;
DROP POLICY IF EXISTS "feature_requests_insert" ON feature_requests;
CREATE POLICY "feature_requests_select" ON feature_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "feature_requests_insert" ON feature_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- AI token usage tracking
CREATE TABLE IF NOT EXISTS ai_usage (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  feature    TEXT NOT NULL DEFAULT 'chat' CHECK (feature IN ('chat','sms','property_summary')),
  tokens_in  INT NOT NULL DEFAULT 0,
  tokens_out INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage(user_id, created_at DESC);

-- Stripe subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_customer_id      TEXT UNIQUE NOT NULL,
  stripe_subscription_id  TEXT UNIQUE,
  status                  TEXT NOT NULL DEFAULT 'trialing',
  current_period_end      TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscriptions_select" ON subscriptions;
CREATE POLICY "subscriptions_select" ON subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Set kurtis@triplecitiestech.com as super admin (idempotent)
UPDATE public.profiles SET is_super_admin = true WHERE email = 'kurtis@triplecitiestech.com';

-- ========================
-- 009: Contact assignment, org AI instructions, policy hardening
-- ========================

-- General AI instructions for the organization
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS ai_instructions TEXT;

-- External contact assignment on tickets (property_contacts, not internal users)
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS assigned_contact_id UUID REFERENCES property_contacts(id) ON DELETE SET NULL;

-- Guest-facing stay info fields
ALTER TABLE stays ADD COLUMN IF NOT EXISTS wifi_name TEXT;
ALTER TABLE stays ADD COLUMN IF NOT EXISTS wifi_password TEXT;
ALTER TABLE stays ADD COLUMN IF NOT EXISTS door_code TEXT;
ALTER TABLE stays ADD COLUMN IF NOT EXISTS host_instructions TEXT;

-- Guarantee the correct properties INSERT policy (owner_id = auth.uid() only, no is_owner() check)
DROP POLICY IF EXISTS "properties_insert" ON properties;
CREATE POLICY "properties_insert" ON properties FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

-- ========================
-- 010: Fix org_members / organizations RLS infinite recursion
-- ========================
-- The org_members_select policy referenced org_members itself, causing infinite
-- recursion. Same with organizations policies that queried org_members directly.
-- Fix: SECURITY DEFINER helper functions that bypass RLS.

-- Drop and recreate to allow changing return type (SETOF UUID → UUID[])
DROP FUNCTION IF EXISTS get_user_org_ids() CASCADE;
CREATE FUNCTION get_user_org_ids()
RETURNS UUID[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ARRAY(SELECT org_id FROM org_members WHERE user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION is_org_admin(p_org_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = p_org_id AND user_id = auth.uid() AND role IN ('owner', 'admin')
  );
$$;

-- Recreate org_members policies (no self-referencing subqueries)
DROP POLICY IF EXISTS "org_members_select" ON org_members;
DROP POLICY IF EXISTS "org_members_insert" ON org_members;
DROP POLICY IF EXISTS "org_members_update" ON org_members;
DROP POLICY IF EXISTS "org_members_delete" ON org_members;

CREATE POLICY "org_members_select" ON org_members FOR SELECT TO authenticated
  USING (org_id = ANY(get_user_org_ids()));
CREATE POLICY "org_members_insert" ON org_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR is_org_admin(org_id));
CREATE POLICY "org_members_update" ON org_members FOR UPDATE TO authenticated
  USING (is_org_admin(org_id)) WITH CHECK (is_org_admin(org_id));
CREATE POLICY "org_members_delete" ON org_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR is_org_admin(org_id));

-- Recreate organizations policies (also queried org_members directly → recursion)
DROP POLICY IF EXISTS "organizations_select" ON organizations;
DROP POLICY IF EXISTS "organizations_insert" ON organizations;
DROP POLICY IF EXISTS "organizations_update" ON organizations;

CREATE POLICY "organizations_select" ON organizations FOR SELECT TO authenticated
  USING (id = ANY(get_user_org_ids()));
CREATE POLICY "organizations_insert" ON organizations FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "organizations_update" ON organizations FOR UPDATE TO authenticated
  USING (is_org_admin(id));

-- ========================
-- 011: Multi-property contacts
-- ========================
-- contact_property_links lets one contact be associated with multiple properties,
-- each with its own role and is_primary flag.

CREATE TABLE IF NOT EXISTS contact_property_links (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id  UUID NOT NULL REFERENCES property_contacts(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'other',
  is_primary  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (contact_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_cpl_contact  ON contact_property_links(contact_id);
CREATE INDEX IF NOT EXISTS idx_cpl_property ON contact_property_links(property_id);

ALTER TABLE contact_property_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cpl_select" ON contact_property_links;
DROP POLICY IF EXISTS "cpl_insert" ON contact_property_links;
DROP POLICY IF EXISTS "cpl_update" ON contact_property_links;
DROP POLICY IF EXISTS "cpl_delete" ON contact_property_links;

CREATE POLICY "cpl_select" ON contact_property_links FOR SELECT TO authenticated
  USING (can_access_property(property_id));
CREATE POLICY "cpl_insert" ON contact_property_links FOR INSERT TO authenticated
  WITH CHECK (can_access_property(property_id));
CREATE POLICY "cpl_update" ON contact_property_links FOR UPDATE TO authenticated
  USING (can_access_property(property_id)) WITH CHECK (can_access_property(property_id));
CREATE POLICY "cpl_delete" ON contact_property_links FOR DELETE TO authenticated
  USING (can_access_property(property_id));

-- Backfill existing property_contacts → junction table
-- Use a DO block to handle the case where the unique constraint doesn't exist yet
DO $$
BEGIN
  INSERT INTO contact_property_links (contact_id, property_id, role, is_primary)
  SELECT id, property_id, role, is_primary
  FROM property_contacts
  ON CONFLICT (contact_id, property_id) DO NOTHING;
EXCEPTION
  WHEN others THEN
    -- If the backfill fails (e.g., constraint not yet in place), skip it safely
    RAISE NOTICE 'Backfill skipped: %', SQLERRM;
END;
$$;

-- ========================
-- Error Logs — persisted client + server errors for session-start diagnostics
-- ========================
CREATE TABLE IF NOT EXISTS error_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  level      TEXT NOT NULL DEFAULT 'error',
  source     TEXT NOT NULL,
  route      TEXT,
  message    TEXT NOT NULL,
  stack      TEXT,
  user_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  metadata   JSONB,
  resolved   BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved, created_at DESC);

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "error_logs_insert" ON error_logs;
DROP POLICY IF EXISTS "error_logs_select" ON error_logs;
CREATE POLICY "error_logs_insert" ON error_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "error_logs_select" ON error_logs FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ========================
-- 012: Property access info + stay type
-- ========================

-- Property-level access info (shared with tenants/guests on invitation)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS wifi_name       TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS wifi_password   TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS door_code       TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS gate_code       TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS parking_info    TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS trash_schedule  TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS check_in_time   TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS check_out_time  TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS house_rules     TEXT;

-- Stay type: short_term (guests/Airbnb) vs long_term (tenants/renters)
ALTER TABLE stays ADD COLUMN IF NOT EXISTS stay_type TEXT NOT NULL DEFAULT 'short_term'
  CHECK (stay_type IN ('short_term', 'long_term'));

-- ========================
-- 013: Outbound messaging + consent tracking
-- ========================

-- Outbound message sent to contact when a work order is created by AI
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS outbound_message   TEXT;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS outbound_sent_to   TEXT;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS outbound_method    TEXT;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS outbound_sent_at   TIMESTAMPTZ;

-- ToS / SMS consent tracking on user profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tos_agreed_at  TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sms_consent    BOOLEAN NOT NULL DEFAULT false;

-- Done!
SELECT 'Schema deployed successfully' AS result;

-- ========================
-- FINAL: Re-apply org_members / organizations RLS fix (idempotent, runs last)
-- ========================
-- This is intentionally repeated here to guarantee it is the LAST migration step.
-- The functions are SECURITY DEFINER so they bypass RLS when querying org_members,
-- preventing the infinite recursion that breaks settings and properties pages.

-- Drop and recreate to allow changing return type (SETOF UUID → UUID[])
DROP FUNCTION IF EXISTS get_user_org_ids() CASCADE;
CREATE FUNCTION get_user_org_ids()
RETURNS UUID[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ARRAY(SELECT org_id FROM org_members WHERE user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION is_org_admin(p_org_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = p_org_id AND user_id = auth.uid() AND role IN ('owner', 'admin')
  );
$$;

DROP POLICY IF EXISTS "org_members_select" ON org_members;
DROP POLICY IF EXISTS "org_members_insert" ON org_members;
DROP POLICY IF EXISTS "org_members_update" ON org_members;
DROP POLICY IF EXISTS "org_members_delete" ON org_members;

CREATE POLICY "org_members_select" ON org_members FOR SELECT TO authenticated
  USING (org_id = ANY(get_user_org_ids()));
CREATE POLICY "org_members_insert" ON org_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR is_org_admin(org_id));
CREATE POLICY "org_members_update" ON org_members FOR UPDATE TO authenticated
  USING (is_org_admin(org_id)) WITH CHECK (is_org_admin(org_id));
CREATE POLICY "org_members_delete" ON org_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR is_org_admin(org_id));

DROP POLICY IF EXISTS "organizations_select" ON organizations;
DROP POLICY IF EXISTS "organizations_insert" ON organizations;
DROP POLICY IF EXISTS "organizations_update" ON organizations;

CREATE POLICY "organizations_select" ON organizations FOR SELECT TO authenticated
  USING (id = ANY(get_user_org_ids()));
CREATE POLICY "organizations_insert" ON organizations FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "organizations_update" ON organizations FOR UPDATE TO authenticated
  USING (is_org_admin(id));

SELECT 'RLS fix verified and applied' AS final_check;


-- ========================
-- 010: is_internal column on service_request_comments
-- ========================

ALTER TABLE service_request_comments
  ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT true;

-- ========================
-- 011: Fix comments_insert RLS — use is_owner_or_manager() as primary check
-- (can_access_property may return false for the owner in edge cases due to
--  org_id join; is_owner_or_manager is a proven, simpler fallback)
-- ========================

DROP POLICY IF EXISTS "comments_insert" ON service_request_comments;
CREATE POLICY "comments_insert" ON service_request_comments FOR INSERT TO authenticated WITH CHECK (
  is_owner_or_manager()
  OR EXISTS (SELECT 1 FROM service_requests sr WHERE sr.id = request_id AND can_access_property(sr.property_id))
);

-- ========================
-- 014: Multi-category checklists per property
-- ========================

CREATE TABLE IF NOT EXISTS property_checklists (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'general',
  enabled     BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_checklists_property
  ON property_checklists(property_id, sort_order);

ALTER TABLE property_checklists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "checklists_select" ON property_checklists;
DROP POLICY IF EXISTS "checklists_insert" ON property_checklists;
DROP POLICY IF EXISTS "checklists_update" ON property_checklists;
DROP POLICY IF EXISTS "checklists_delete" ON property_checklists;
CREATE POLICY "checklists_select" ON property_checklists FOR SELECT TO authenticated USING (can_access_property(property_id));
CREATE POLICY "checklists_insert" ON property_checklists FOR INSERT TO authenticated WITH CHECK (can_access_property(property_id));
CREATE POLICY "checklists_update" ON property_checklists FOR UPDATE TO authenticated USING (can_access_property(property_id)) WITH CHECK (can_access_property(property_id));
CREATE POLICY "checklists_delete" ON property_checklists FOR DELETE TO authenticated USING (is_property_admin(property_id));

-- Link checklist items to a specific checklist (nullable for backward compat)
ALTER TABLE property_checklist_items ADD COLUMN IF NOT EXISTS checklist_id UUID REFERENCES property_checklists(id) ON DELETE CASCADE;

-- Migrate existing items: create a default "Cleaning" checklist per property and link items to it
DO $$
DECLARE
  prop_rec RECORD;
  new_checklist_id UUID;
BEGIN
  FOR prop_rec IN
    SELECT DISTINCT p.id AS property_id
    FROM properties p
    JOIN property_checklist_items pci ON pci.property_id = p.id
    WHERE pci.checklist_id IS NULL
  LOOP
    -- Create a cleaning checklist for this property if none exists
    INSERT INTO property_checklists (property_id, name, category, sort_order)
    VALUES (prop_rec.property_id, 'Cleaning Checklist', 'cleaning', 0)
    ON CONFLICT DO NOTHING
    RETURNING id INTO new_checklist_id;

    IF new_checklist_id IS NOT NULL THEN
      UPDATE property_checklist_items
        SET checklist_id = new_checklist_id
      WHERE property_id = prop_rec.property_id
        AND checklist_id IS NULL;
    END IF;
  END LOOP;
END;
$$;

-- ========================
-- 015: Audit log improvements — track AI source + revert support
-- ========================

ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS is_ai_action BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS reverted_at TIMESTAMPTZ;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS reverted_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

