-- ============================================================
-- Migration: Multi-tenant / SaaS architecture
-- Each customer gets an Organization. Properties belong to an
-- Organization. Users can be org members (full team access) or
-- granted direct access to specific properties (cross-org sharing).
-- ============================================================

-- ── Organizations ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS organizations (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Org Members ──────────────────────────────────────────────
-- role: 'owner' | 'admin' | 'member'

CREATE TABLE IF NOT EXISTS org_members (
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member'
               CHECK (role IN ('owner', 'admin', 'member')),
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON org_members(user_id);

-- ── Property Access (cross-org grants) ───────────────────────
-- Allows a user from any org (or no org) to access a specific property.
-- role: 'manager' | 'viewer'

CREATE TABLE IF NOT EXISTS property_access (
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'manager'
                CHECK (role IN ('manager', 'viewer')),
  granted_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (property_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_property_access_user ON property_access(user_id);

-- ── Invitations ───────────────────────────────────────────────
-- A row can be an org invitation (org_id set) or a property-specific
-- invitation (property_id set). At least one must be non-null.

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

CREATE INDEX IF NOT EXISTS idx_invitations_token  ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_org    ON invitations(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invitations_prop   ON invitations(property_id) WHERE property_id IS NOT NULL;

-- ── Add org_id to properties ──────────────────────────────────

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_properties_org ON properties(org_id) WHERE org_id IS NOT NULL;

-- ── Helper: can the current user access a property? ───────────

CREATE OR REPLACE FUNCTION can_access_property(prop_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    -- Direct owner (backward compat)
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = prop_id AND p.owner_id = auth.uid()
    )
    OR
    -- Member of the org that owns the property
    EXISTS (
      SELECT 1 FROM org_members om
      JOIN properties p ON p.org_id = om.org_id
      WHERE p.id = prop_id AND om.user_id = auth.uid()
    )
    OR
    -- Explicit property access grant
    EXISTS (
      SELECT 1 FROM property_access pa
      WHERE pa.property_id = prop_id AND pa.user_id = auth.uid()
    );
$$;

-- ── Helper: is the current user an org admin/owner for a property? ──

CREATE OR REPLACE FUNCTION is_property_admin(prop_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    EXISTS (SELECT 1 FROM properties p WHERE p.id = prop_id AND p.owner_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM org_members om
      JOIN properties p ON p.org_id = om.org_id
      WHERE p.id = prop_id AND om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
    );
$$;

-- ── Update property RLS to use can_access_property ────────────

DROP POLICY IF EXISTS "properties_select" ON properties;
DROP POLICY IF EXISTS "properties_insert" ON properties;
DROP POLICY IF EXISTS "properties_update" ON properties;
DROP POLICY IF EXISTS "properties_delete" ON properties;

CREATE POLICY "properties_select" ON properties
  FOR SELECT TO authenticated
  USING (can_access_property(id));

CREATE POLICY "properties_insert" ON properties
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "properties_update" ON properties
  FOR UPDATE TO authenticated
  USING (can_access_property(id))
  WITH CHECK (can_access_property(id));

CREATE POLICY "properties_delete" ON properties
  FOR DELETE TO authenticated
  USING (is_property_admin(id));

-- ── Update related-table RLS to use can_access_property ───────

-- property_status
DROP POLICY IF EXISTS "property_status_select" ON property_status;
DROP POLICY IF EXISTS "property_status_upsert" ON property_status;
CREATE POLICY "property_status_select" ON property_status
  FOR SELECT TO authenticated USING (can_access_property(property_id));
CREATE POLICY "property_status_upsert" ON property_status
  FOR ALL TO authenticated
  USING (can_access_property(property_id))
  WITH CHECK (can_access_property(property_id));

-- stays
DROP POLICY IF EXISTS "stays_select" ON stays;
DROP POLICY IF EXISTS "stays_insert" ON stays;
DROP POLICY IF EXISTS "stays_update" ON stays;
DROP POLICY IF EXISTS "stays_delete" ON stays;
CREATE POLICY "stays_select" ON stays FOR SELECT TO authenticated USING (can_access_property(property_id));
CREATE POLICY "stays_insert" ON stays FOR INSERT TO authenticated WITH CHECK (can_access_property(property_id));
CREATE POLICY "stays_update" ON stays FOR UPDATE TO authenticated USING (can_access_property(property_id)) WITH CHECK (can_access_property(property_id));
CREATE POLICY "stays_delete" ON stays FOR DELETE TO authenticated USING (is_property_admin(property_id));

-- service_requests
DROP POLICY IF EXISTS "service_requests_select" ON service_requests;
DROP POLICY IF EXISTS "service_requests_insert" ON service_requests;
DROP POLICY IF EXISTS "service_requests_update" ON service_requests;
DROP POLICY IF EXISTS "service_requests_delete" ON service_requests;
CREATE POLICY "service_requests_select" ON service_requests FOR SELECT TO authenticated USING (can_access_property(property_id));
CREATE POLICY "service_requests_insert" ON service_requests FOR INSERT TO authenticated WITH CHECK (can_access_property(property_id));
CREATE POLICY "service_requests_update" ON service_requests FOR UPDATE TO authenticated USING (can_access_property(property_id)) WITH CHECK (can_access_property(property_id));
CREATE POLICY "service_requests_delete" ON service_requests FOR DELETE TO authenticated USING (is_property_admin(property_id));

-- service_request_comments (access via join to property)
DROP POLICY IF EXISTS "comments_select" ON service_request_comments;
DROP POLICY IF EXISTS "comments_insert" ON service_request_comments;
DROP POLICY IF EXISTS "comments_update" ON service_request_comments;
DROP POLICY IF EXISTS "comments_delete" ON service_request_comments;
CREATE POLICY "comments_select" ON service_request_comments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM service_requests sr WHERE sr.id = request_id AND can_access_property(sr.property_id)));
CREATE POLICY "comments_insert" ON service_request_comments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM service_requests sr WHERE sr.id = request_id AND can_access_property(sr.property_id)));
CREATE POLICY "comments_update" ON service_request_comments FOR UPDATE TO authenticated
  USING (author_id = auth.uid());
CREATE POLICY "comments_delete" ON service_request_comments FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR EXISTS (SELECT 1 FROM service_requests sr WHERE sr.id = request_id AND is_property_admin(sr.property_id)));

-- checklist_items
DROP POLICY IF EXISTS "checklist_items_select" ON property_checklist_items;
DROP POLICY IF EXISTS "checklist_items_insert" ON property_checklist_items;
DROP POLICY IF EXISTS "checklist_items_update" ON property_checklist_items;
DROP POLICY IF EXISTS "checklist_items_delete" ON property_checklist_items;
CREATE POLICY "checklist_items_select" ON property_checklist_items FOR SELECT TO authenticated USING (can_access_property(property_id));
CREATE POLICY "checklist_items_insert" ON property_checklist_items FOR INSERT TO authenticated WITH CHECK (can_access_property(property_id));
CREATE POLICY "checklist_items_update" ON property_checklist_items FOR UPDATE TO authenticated USING (can_access_property(property_id)) WITH CHECK (can_access_property(property_id));
CREATE POLICY "checklist_items_delete" ON property_checklist_items FOR DELETE TO authenticated USING (can_access_property(property_id));

-- property_contacts
DROP POLICY IF EXISTS "contacts_select" ON property_contacts;
DROP POLICY IF EXISTS "contacts_insert" ON property_contacts;
DROP POLICY IF EXISTS "contacts_update" ON property_contacts;
DROP POLICY IF EXISTS "contacts_delete" ON property_contacts;
CREATE POLICY "contacts_select" ON property_contacts FOR SELECT TO authenticated USING (can_access_property(property_id));
CREATE POLICY "contacts_insert" ON property_contacts FOR INSERT TO authenticated WITH CHECK (can_access_property(property_id));
CREATE POLICY "contacts_update" ON property_contacts FOR UPDATE TO authenticated USING (can_access_property(property_id)) WITH CHECK (can_access_property(property_id));
CREATE POLICY "contacts_delete" ON property_contacts FOR DELETE TO authenticated USING (can_access_property(property_id));

-- guest_reports (via stay → property)
DROP POLICY IF EXISTS "guest_reports_select"      ON guest_reports;
DROP POLICY IF EXISTS "guest_reports_insert_auth" ON guest_reports;
CREATE POLICY "guest_reports_select" ON guest_reports FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM stays s WHERE s.id = stay_id AND can_access_property(s.property_id)));
CREATE POLICY "guest_reports_insert_auth" ON guest_reports FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM stays s WHERE s.id = stay_id AND can_access_property(s.property_id)));

-- audit_log (scoped by entity_id, checked per-property)
DROP POLICY IF EXISTS "audit_log_select" ON audit_log;
DROP POLICY IF EXISTS "audit_log_insert" ON audit_log;
CREATE POLICY "audit_log_select" ON audit_log FOR SELECT TO authenticated USING (
  -- Either the entity is a property the user can access, or it's a related entity (stays/tickets)
  -- Simple approach: allow all authenticated for audit_log (it's read-only for display)
  is_owner_or_manager()
);
CREATE POLICY "audit_log_insert" ON audit_log FOR INSERT TO authenticated WITH CHECK (is_owner_or_manager());

-- ── RLS for new tables ────────────────────────────────────────

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "organizations_select" ON organizations;
DROP POLICY IF EXISTS "organizations_insert" ON organizations;
DROP POLICY IF EXISTS "organizations_update" ON organizations;
CREATE POLICY "organizations_select" ON organizations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = id AND om.user_id = auth.uid()));
CREATE POLICY "organizations_insert" ON organizations FOR INSERT TO authenticated
  WITH CHECK (true); -- any authenticated user may create an org
CREATE POLICY "organizations_update" ON organizations FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM org_members om WHERE om.org_id = id AND om.user_id = auth.uid() AND om.role IN ('owner', 'admin')));

ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_members_select" ON org_members;
DROP POLICY IF EXISTS "org_members_insert" ON org_members;
DROP POLICY IF EXISTS "org_members_delete" ON org_members;
CREATE POLICY "org_members_select" ON org_members FOR SELECT TO authenticated
  USING (org_id IN (SELECT om2.org_id FROM org_members om2 WHERE om2.user_id = auth.uid()));
CREATE POLICY "org_members_insert" ON org_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()  -- inserting own record (initial org creation / invite acceptance)
    OR EXISTS (
      SELECT 1 FROM org_members om WHERE om.org_id = org_id AND om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
    )
  );
CREATE POLICY "org_members_delete" ON org_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()  -- leaving org
    OR EXISTS (
      SELECT 1 FROM org_members om WHERE om.org_id = org_id AND om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
    )
  );

ALTER TABLE property_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "property_access_select" ON property_access;
DROP POLICY IF EXISTS "property_access_insert" ON property_access;
DROP POLICY IF EXISTS "property_access_delete" ON property_access;
CREATE POLICY "property_access_select" ON property_access FOR SELECT TO authenticated
  USING (can_access_property(property_id));
CREATE POLICY "property_access_insert" ON property_access FOR INSERT TO authenticated
  WITH CHECK (is_property_admin(property_id));
CREATE POLICY "property_access_delete" ON property_access FOR DELETE TO authenticated
  USING (is_property_admin(property_id) OR user_id = auth.uid());

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invitations_select" ON invitations;
DROP POLICY IF EXISTS "invitations_insert" ON invitations;
DROP POLICY IF EXISTS "invitations_delete" ON invitations;
-- Anyone authenticated can read invitations (token is the secret; used for acceptance page)
CREATE POLICY "invitations_select" ON invitations FOR SELECT TO authenticated USING (true);
CREATE POLICY "invitations_insert" ON invitations FOR INSERT TO authenticated
  WITH CHECK (invited_by = auth.uid());
CREATE POLICY "invitations_delete" ON invitations FOR DELETE TO authenticated
  USING (invited_by = auth.uid());

-- Extend audit_entity enum
ALTER TYPE audit_entity ADD VALUE IF NOT EXISTS 'org_member';
ALTER TYPE audit_entity ADD VALUE IF NOT EXISTS 'property_access';
