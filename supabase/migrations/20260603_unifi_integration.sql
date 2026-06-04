-- ============================================================
-- UniFi tenant provisioning integration
-- Admin-only feature. These tables are intentionally accessible ONLY via the
-- service-role key from admin-gated server actions: RLS is enabled with NO
-- policies, so the `authenticated` and `anon` roles have no direct access.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- A building wired into a UniFi console. Secrets (API keys) live in env vars,
-- never here — this row only holds non-secret references/config.
CREATE TABLE IF NOT EXISTS unifi_buildings (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id         UUID REFERENCES properties(id) ON DELETE SET NULL,
  name                TEXT NOT NULL,
  address             TEXT,
  console_url         TEXT,                       -- e.g. https://console.example.com
  network_site_id     TEXT NOT NULL DEFAULT 'default',
  front_door_group_id TEXT,                       -- UniFi Access group: front intercom
  back_door_group_id  TEXT,                       -- UniFi Access group: back door PIN entry
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Per-apartment configuration (their setup: each apartment has its own SSID + VLAN).
CREATE TABLE IF NOT EXISTS unifi_units (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id       UUID NOT NULL REFERENCES unifi_buildings(id) ON DELETE CASCADE,
  label             TEXT NOT NULL,                -- e.g. "Apt 2B"
  wifi_ssid         TEXT,                         -- per-apartment SSID
  wifi_network_id   TEXT,                         -- UniFi Network wifi-broadcast id
  vlan_id           INTEGER,
  door_group_id     TEXT,                         -- optional per-unit Access group
  protect_camera_id TEXT,                         -- entrance camera (UniFi Protect)
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_unifi_units_building ON unifi_units(building_id);

-- A tenant's stay in a unit (the manual intake record).
CREATE TABLE IF NOT EXISTS unifi_tenancies (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id      UUID NOT NULL REFERENCES unifi_units(id) ON DELETE CASCADE,
  tenant_name  TEXT NOT NULL,
  tenant_email TEXT NOT NULL,
  tenant_phone TEXT,
  move_in      DATE,
  move_out     DATE,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','active','offboarded','failed')),
  wants_nfc    BOOLEAN NOT NULL DEFAULT false,
  created_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_unifi_tenancies_unit ON unifi_tenancies(unit_id);

-- System-generated provisioning state for a tenancy (PIN, WiFi key, Access user…).
CREATE TABLE IF NOT EXISTS unifi_provisioning (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenancy_id     UUID NOT NULL UNIQUE REFERENCES unifi_tenancies(id) ON DELETE CASCADE,
  mode           TEXT NOT NULL DEFAULT 'dry-run',  -- 'live' | 'dry-run'
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','provisioned','revoked','failed')),
  access_user_id TEXT,
  door_pin       TEXT,
  wifi_ssid      TEXT,
  wifi_password  TEXT,
  nfc_status     TEXT NOT NULL DEFAULT 'none'
                   CHECK (nfc_status IN ('none','requested','issued')),
  last_error     TEXT,
  provisioned_at TIMESTAMPTZ,
  revoked_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE unifi_buildings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE unifi_units        ENABLE ROW LEVEL SECURITY;
ALTER TABLE unifi_tenancies    ENABLE ROW LEVEL SECURITY;
ALTER TABLE unifi_provisioning ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies — access is service-role only (admin server actions).

REVOKE ALL ON unifi_buildings    FROM anon, authenticated;
REVOKE ALL ON unifi_units        FROM anon, authenticated;
REVOKE ALL ON unifi_tenancies    FROM anon, authenticated;
REVOKE ALL ON unifi_provisioning FROM anon, authenticated;
