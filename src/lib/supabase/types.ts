// ============================================================
// Database Types — AW Property Management
// Manually maintained; regenerate with: supabase gen types typescript
// ============================================================

export type UserRole = 'owner' | 'manager'
export type OrgRole = 'owner' | 'admin' | 'member'
export type PropertyRole = 'manager' | 'viewer'
export type PropertyStatusEnum = 'clean' | 'needs_cleaning' | 'needs_maintenance' | 'needs_groceries'
export type OccupancyEnum = 'occupied' | 'unoccupied'
export type TicketCategory = 'maintenance' | 'cleaning' | 'supplies' | 'other'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type AuditAction = 'created' | 'updated' | 'deleted'
export type AuditEntity = 'property' | 'property_status' | 'stay' | 'service_request' | 'service_request_comment' | 'guest_report' | 'org_member' | 'property_access'

export interface Profile {
  id: string
  role: UserRole
  full_name: string
  phone_number: string | null
  created_at: string
}

export interface Organization {
  id: string
  name: string
  created_at: string
}

export interface OrgMember {
  org_id: string
  user_id: string
  role: OrgRole
  invited_by: string | null
  joined_at: string
  profiles?: { full_name: string; email: string | null }
}

export interface PropertyAccess {
  property_id: string
  user_id: string
  role: PropertyRole
  granted_by: string | null
  created_at: string
  profiles?: { full_name: string; email: string | null }
}

export interface Invitation {
  id: string
  token: string
  org_id: string | null
  property_id: string | null
  role: string
  invited_by: string | null
  email: string | null
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export interface Property {
  id: string
  name: string
  address: string
  description: string | null
  quick_notes: string | null
  ai_instructions: string | null
  owner_id: string
  org_id: string | null
  created_at: string
}

export interface PropertyStatus {
  id: string
  property_id: string
  status: PropertyStatusEnum
  occupancy: OccupancyEnum
  notes: string | null
  updated_by: string | null
  updated_at: string
}

export interface Stay {
  id: string
  property_id: string
  guest_name: string
  guest_email: string | null
  start_date: string
  end_date: string
  notes: string | null
  guest_link_token: string
  created_by: string | null
  created_at: string
}

export interface ServiceRequest {
  id: string
  property_id: string
  stay_id: string | null
  title: string
  description: string | null
  category: TicketCategory
  priority: TicketPriority
  due_date: string | null
  assignee_id: string | null
  status: TicketStatus
  created_by: string | null
  created_at: string
}

export interface ServiceRequestComment {
  id: string
  request_id: string
  author_id: string | null
  content: string
  created_at: string
}

export interface ChecklistItem {
  label: string
  checked: boolean
}

export interface GuestReport {
  id: string
  stay_id: string
  checklist: ChecklistItem[]
  notes: string | null
  submitted_at: string
  ip_address: string | null
}

export interface AuditLog {
  id: string
  entity_type: AuditEntity
  entity_id: string
  action: AuditAction
  changed_by: string | null
  changed_at: string
  before_data: Record<string, unknown> | null
  after_data: Record<string, unknown> | null
}

// ---- Joined / View Types ----

export interface PropertyWithStatus extends Property {
  property_status: PropertyStatus | null
}

export interface ServiceRequestWithDetails extends ServiceRequest {
  properties: { name: string } | null
  assignee: Profile | null
  creator: Profile | null
  comments_count?: number
}

export interface StayWithProperty extends Stay {
  properties: { name: string } | null
}

export interface AuditLogWithProfile extends AuditLog {
  profiles: { full_name: string } | null
}

// ---- Default Guest Checklist ----
export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { label: 'Property was clean on arrival', checked: false },
  { label: 'Towels and linens were provided', checked: false },
  { label: 'Kitchen was stocked with basics', checked: false },
  { label: 'All appliances working correctly', checked: false },
  { label: 'No visible damage to report', checked: false },
  { label: 'WiFi / TV working as expected', checked: false },
  { label: 'Overall stay was comfortable', checked: false },
]

// ---- UniFi integration ----
export type UnifiTenancyStatus = 'pending' | 'active' | 'offboarded' | 'failed'
export type UnifiProvisioningStatus = 'pending' | 'provisioned' | 'revoked' | 'failed'
export type UnifiNfcStatus = 'none' | 'requested' | 'issued'
export type UnifiMode = 'live' | 'dry-run'

export interface UnifiBuilding {
  id: string
  property_id: string | null
  name: string
  address: string | null
  console_url: string | null
  network_site_id: string
  front_door_group_id: string | null
  back_door_group_id: string | null
  created_at: string
}

export interface UnifiUnit {
  id: string
  building_id: string
  label: string
  wifi_ssid: string | null
  wifi_network_id: string | null
  vlan_id: number | null
  door_group_id: string | null
  protect_camera_id: string | null
  created_at: string
}

export interface UnifiTenancy {
  id: string
  unit_id: string
  tenant_name: string
  tenant_email: string
  tenant_phone: string | null
  move_in: string | null
  move_out: string | null
  status: UnifiTenancyStatus
  wants_nfc: boolean
  created_by: string | null
  created_at: string
}

export interface UnifiProvisioning {
  id: string
  tenancy_id: string
  mode: UnifiMode
  status: UnifiProvisioningStatus
  access_user_id: string | null
  door_pin: string | null
  wifi_ssid: string | null
  wifi_password: string | null
  nfc_status: UnifiNfcStatus
  last_error: string | null
  provisioned_at: string | null
  revoked_at: string | null
  created_at: string
  updated_at: string
}

export interface UnifiTenancyWithProvisioning extends UnifiTenancy {
  unifi_provisioning: UnifiProvisioning | UnifiProvisioning[] | null
}
