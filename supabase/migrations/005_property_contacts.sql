-- ============================================================
-- Migration 005: Property Quick Notes, AI Instructions & Contacts
-- Smart Sumai
-- ============================================================

-- Add per-property overview notes and AI message instructions
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS quick_notes      TEXT,
  ADD COLUMN IF NOT EXISTS ai_instructions TEXT;

-- ============================================================
-- PROPERTY CONTACTS
-- Per-property contact directory (maintenance, plumbing, etc.)
-- ============================================================

CREATE TABLE IF NOT EXISTS property_contacts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'other',
  -- roles: primary, maintenance, plumbing, hvac, electrical, cleaning, groceries, other
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

CREATE POLICY "contacts_select" ON property_contacts
  FOR SELECT TO authenticated USING (is_owner_or_manager());

CREATE POLICY "contacts_insert" ON property_contacts
  FOR INSERT TO authenticated WITH CHECK (is_owner_or_manager());

CREATE POLICY "contacts_update" ON property_contacts
  FOR UPDATE TO authenticated
  USING (is_owner_or_manager()) WITH CHECK (is_owner_or_manager());

CREATE POLICY "contacts_delete" ON property_contacts
  FOR DELETE TO authenticated USING (is_owner_or_manager());
