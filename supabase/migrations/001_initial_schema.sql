-- ============================================================
-- Migration 001: Initial Schema
-- AW Property Management
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE property_status_enum AS ENUM (
  'clean',
  'needs_cleaning',
  'needs_maintenance',
  'needs_groceries'
);

CREATE TYPE occupancy_enum AS ENUM (
  'occupied',
  'unoccupied'
);

CREATE TYPE ticket_category AS ENUM (
  'maintenance',
  'cleaning',
  'supplies',
  'other'
);

CREATE TYPE ticket_priority AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

CREATE TYPE ticket_status AS ENUM (
  'open',
  'in_progress',
  'resolved',
  'closed'
);

CREATE TYPE user_role AS ENUM (
  'owner',
  'manager'
);

CREATE TYPE audit_action AS ENUM (
  'created',
  'updated',
  'deleted'
);

CREATE TYPE audit_entity AS ENUM (
  'property',
  'property_status',
  'stay',
  'service_request',
  'service_request_comment',
  'guest_report'
);

-- ============================================================
-- PROFILES
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role            user_role NOT NULL DEFAULT 'manager',
  full_name       TEXT NOT NULL DEFAULT '',
  phone_number TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    NEW.id,
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::user_role,
      'manager'
    ),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- PROPERTIES
-- ============================================================

CREATE TABLE IF NOT EXISTS properties (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  address     TEXT NOT NULL DEFAULT '',
  description TEXT,
  owner_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PROPERTY STATUS
-- ============================================================

CREATE TABLE IF NOT EXISTS property_status (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL UNIQUE REFERENCES properties(id) ON DELETE CASCADE,
  status      property_status_enum NOT NULL DEFAULT 'clean',
  occupancy   occupancy_enum NOT NULL DEFAULT 'unoccupied',
  notes       TEXT,
  updated_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create property_status row when a property is created
CREATE OR REPLACE FUNCTION handle_new_property()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

-- ============================================================
-- STAYS
-- ============================================================

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

-- ============================================================
-- SERVICE REQUESTS (TICKETS)
-- ============================================================

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

-- ============================================================
-- SERVICE REQUEST COMMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS service_request_comments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id  UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  author_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- GUEST REPORTS
-- ============================================================

CREATE TABLE IF NOT EXISTS guest_reports (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stay_id      UUID NOT NULL UNIQUE REFERENCES stays(id) ON DELETE CASCADE,
  checklist    JSONB NOT NULL DEFAULT '[]',
  notes        TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address   TEXT
);

-- ============================================================
-- AUDIT LOG
-- ============================================================

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

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON audit_log(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_requests_property ON service_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_stays_property ON stays(property_id);
CREATE INDEX IF NOT EXISTS idx_stays_dates ON stays(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_stays_token ON stays(guest_link_token);
