-- ============================================================
-- Migration 004: Per-Property Checklist Templates + Profile Email
-- ============================================================

-- Store email in profiles for easy access (mirrors auth.users.email)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Update trigger to also store email
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::user_role,
      'manager'
    ),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, ''),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

-- ============================================================
-- PROPERTY CHECKLIST TEMPLATES
-- Per-property customizable guest checklist items.
-- If a property has no custom items, fallback to defaults in app.
-- ============================================================

CREATE TABLE IF NOT EXISTS property_checklist_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checklist_items_property ON property_checklist_items(property_id, sort_order);

-- RLS for checklist items
ALTER TABLE property_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checklist_items_select" ON property_checklist_items
  FOR SELECT TO authenticated
  USING (is_owner_or_manager());

CREATE POLICY "checklist_items_insert" ON property_checklist_items
  FOR INSERT TO authenticated
  WITH CHECK (is_owner_or_manager());

CREATE POLICY "checklist_items_update" ON property_checklist_items
  FOR UPDATE TO authenticated
  USING (is_owner_or_manager())
  WITH CHECK (is_owner_or_manager());

CREATE POLICY "checklist_items_delete" ON property_checklist_items
  FOR DELETE TO authenticated
  USING (is_owner_or_manager());

-- Also add to audit entity enum
ALTER TYPE audit_entity ADD VALUE IF NOT EXISTS 'property_checklist_item';
