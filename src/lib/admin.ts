// Admin gating for siloed/admin-only features (e.g. the UniFi integration).
// During testing, admins are defined by the ADMIN_EMAILS env var (comma-separated).

export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return getAdminEmails().includes(email.trim().toLowerCase())
}
