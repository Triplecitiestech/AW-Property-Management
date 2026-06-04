# UniFi Tenant Provisioning

Automates tenant **onboarding** and **offboarding** for apartment buildings on the
Ubiquiti UniFi ecosystem (Access + Network + Protect). A manual admin intake form
drives automated provisioning and a welcome email.

> Status: v1 foundation. Runs **end-to-end in dry-run** today; flips to live by
> setting the `UNIFI_*` env vars. The live HTTP calls are written to the documented
> API contracts and must be verified against the real controller (we can't reach a
> local controller from CI).

## What it does

**Onboard** (admin clicks "Provision & send welcome"):
1. Create a UniFi **Access** user, assign a generated **door PIN**, grant the
   front-intercom + back-door Access groups.
2. Set/rotate the apartment's **Wi-Fi** password (per-apartment SSID + VLAN).
3. Email the tenant: property info, Wi-Fi SSID + password, door PIN, intercom
   "ring the manager" instructions, and the **NFC card** opt-in.

**Offboard**: revoke the Access user, rotate the apartment Wi-Fi password (so the
old one stops working), and email a goodbye note.

**NFC** is intentionally an *opt-in request*, not auto-issued: NFC cards require a
physical tap to enroll, so the manager hands one over and activates it.

## The Ubiquiti API landscape (researched)

| API | Base / Auth | Used for |
|-----|-------------|----------|
| Network Integration API | `https://<console>/proxy/network/integration/v1`, `X-API-KEY` | Per-apartment Wi-Fi (`/wifi-broadcasts`), VLANs |
| Access Developer API | `https://<host>:12445/api/v1/developer`, `Bearer` | Users, PINs, door groups, NFC, unlock |
| Protect Integration API | `https://<console>/proxy/protect/integration/v1`, `X-API-KEY` | Entrance/intercom cameras |
| Site Manager API (cloud) | `https://api.ui.com/v1`, `X-API-Key` | **Read-only** — monitoring only, cannot provision |

Key constraint: **provisioning must hit the local controller** (the cloud API is
read-only). Connectivity model chosen: **UniFi remote access** (console reachable
over the internet with a valid cert + per-app API keys).

## Architecture

```
src/lib/unifi/
  config.ts        env config + live/dry-run detection
  http.ts          JSON fetch wrapper + UniFiHttpError
  access.ts        AccessClient   (Access Developer API)
  network.ts       NetworkClient  (Network Integration API)
  protect.ts       ProtectClient  (Protect Integration API)
  provider.ts      UniFiProvider: LiveUniFiProvider | DryRunUniFiProvider (factory)
  credentials.ts   PIN + Wi-Fi password generators (pure, unit-tested)
src/lib/email/unifi-emails.ts   welcome + offboarding emails (Resend)
src/lib/actions/unifi.ts        admin-gated server actions (orchestration)
src/app/(app)/admin/unifi/      admin UI (page) + UnifiAdmin component
supabase/migrations/20260603_unifi_integration.sql
```

Data model (`unifi_*`, additive & namespaced): `unifi_buildings` → `unifi_units`
→ `unifi_tenancies` → `unifi_provisioning`. RLS is enabled with **no policies** —
these tables are reachable only via the service-role key from admin-gated server
actions.

## Setup

1. Run the migration (`supabase/migrations/20260603_unifi_integration.sql`) or the
   full `supabase/deploy.sql`.
2. Set `ADMIN_EMAILS` to your email and visit `/admin/unifi`.
3. Click **Create test building** (seeds 257 Washington Street + 4 sample units).
4. Add a tenant via the intake form, then **Provision & send welcome** — works in
   dry-run immediately.
5. To go live, set `UNIFI_CONSOLE_URL`, `UNIFI_API_KEY` (one Integration key for
   Network + Protect), and `UNIFI_ACCESS_API_TOKEN` (separate Access token), then
   fill the building's Access group IDs + each unit's SSID/VLAN/camera in the UI.

## Verified vs. still-to-confirm

Verified against the live console docs (Network 10.4.57 / Protect 7.1.75):
- One Integration key (`X-API-KEY`) covers **Network + Protect**; **Access uses a
  separate Bearer token** (port 12445).
- Network WiFi is `GET/PUT /v1/sites/{siteId}/wifi/broadcasts/{id}` with a
  full-object PUT; the site is a **UUID** from `GET /v1/sites` (auto-resolved).
- Protect exposes `/v1/cameras/{id}/snapshot`, RTSPS streams, and a `ring` event
  stream (`/v1/subscribe/events`) usable for the intercom "ring the manager" flow.

Still to confirm:
- The exact PSK field inside `securityConfiguration` on a WiFi broadcast (set here
  as `passphrase`) — needs one live read.
- **UniFi Access** endpoints for PIN / NFC / door-group binding (`access.ts`) — the
  Access API reference isn't fetchable by tooling; paste it or confirm against the
  Access app's API page.
- Whether port **12445** (Access) is reachable over your remote-access path or needs a tunnel.

## Security notes / follow-ups

- `unifi_provisioning` stores the door PIN and Wi-Fi password in plaintext (needed
  to re-send/display). Service-role-only, but consider encrypting at rest.
- Admin gating is env-based (`ADMIN_EMAILS`) for testing; replace with a real admin
  role before broadening beyond this test property.
- Multi-building/customer rollout will need per-building credential storage
  (currently single-building via env) and reconciliation with the production
  `property_units` table.
