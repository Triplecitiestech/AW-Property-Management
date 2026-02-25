'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { OrgRole, PropertyRole } from '@/lib/supabase/types'
import { sendWelcomeEmail } from '@/lib/email/resend'

// ─── Internal: Get or create the current user's primary org ──────────────────
// Used by property-creation to ensure an org always exists.

export async function getOrCreateUserOrg(): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Check for ANY existing membership (not just 'owner')
    const { data: existing } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (existing?.org_id) return existing.org_id

    // Use service client to bypass RLS — regular client can't insert orgs/members
    // without a profile row existing first (FK constraint).
    const svc = createServiceClient()

    // Ensure profile exists (required for org_members FK)
    await svc.from('profiles').upsert({
      id: user.id,
      role: 'manager',
      full_name: (user.user_metadata?.full_name as string) || user.email || '',
      email: user.email || '',
    }, { onConflict: 'id' })

    const { data: profile } = await svc
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .maybeSingle()

    const orgName = profile?.full_name?.trim() || profile?.email?.split('@')[0] || 'My Organization'

    const { data: org, error: orgError } = await svc
      .from('organizations')
      .insert({ name: orgName })
      .select('id')
      .single()

    if (orgError || !org) return null

    await svc.from('org_members').insert({
      org_id: org.id,
      user_id: user.id,
      role: 'owner',
    })

    // Send welcome email to new user (fire-and-forget)
    if (user.email) {
      const twilioPhone = process.env.TWILIO_PHONE_NUMBER ?? ''
      sendWelcomeEmail({
        to: user.email,
        name: profile?.full_name || user.email,
        twilioPhone,
      }).catch(console.error)
    }

    return org.id
  } catch {
    return null
  }
}

// ─── Get the current user's org ───────────────────────────────────────────────

export async function getMyOrg() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('org_members')
    .select('org_id, role, organizations(id, name, created_at)')
    .eq('user_id', user.id)
    .order('joined_at')
    .limit(1)
    .maybeSingle()

  return data ?? null
}

// ─── Update org name ──────────────────────────────────────────────────────────

export async function updateOrgName(orgId: string, name: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  if (!name.trim()) return { error: 'Name is required.' }

  const { error } = await supabase
    .from('organizations')
    .update({ name: name.trim() })
    .eq('id', orgId)

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { success: true }
}

// ─── List org members ─────────────────────────────────────────────────────────

export async function getOrgMembers(orgId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('org_members')
    .select('*, profiles(full_name, email)')
    .eq('org_id', orgId)
    .order('joined_at')

  return data ?? []
}

// ─── Update a member's role ───────────────────────────────────────────────────

export async function updateMemberRole(orgId: string, userId: string, role: OrgRole) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { error } = await supabase
    .from('org_members')
    .update({ role })
    .eq('org_id', orgId)
    .eq('user_id', userId)

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { success: true }
}

// ─── Remove a member from the org ────────────────────────────────────────────

export async function removeOrgMember(orgId: string, userId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { error } = await supabase
    .from('org_members')
    .delete()
    .eq('org_id', orgId)
    .eq('user_id', userId)

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { success: true }
}

// ─── Create an org invitation link ───────────────────────────────────────────

export async function createOrgInvitation(orgId: string, role: OrgRole, email?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data, error } = await supabase
    .from('invitations')
    .insert({
      org_id: orgId,
      role,
      invited_by: user.id,
      email: email?.trim() || null,
    })
    .select('token')
    .single()

  if (error) return { error: error.message }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return { token: data.token, inviteUrl: `${appUrl}/invite/${data.token}` }
}

// ─── Create a property-specific invitation link ───────────────────────────────

export async function createPropertyInvitation(propertyId: string, role: PropertyRole, email?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data, error } = await supabase
    .from('invitations')
    .insert({
      property_id: propertyId,
      role,
      invited_by: user.id,
      email: email?.trim() || null,
    })
    .select('token')
    .single()

  if (error) return { error: error.message }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return { token: data.token, inviteUrl: `${appUrl}/invite/${data.token}` }
}

// ─── List active invitations for an org ──────────────────────────────────────

export async function getOrgInvitations(orgId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('invitations')
    .select('*')
    .eq('org_id', orgId)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  return data ?? []
}

// ─── Revoke an invitation ─────────────────────────────────────────────────────

export async function revokeInvitation(invitationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { error } = await supabase
    .from('invitations')
    .delete()
    .eq('id', invitationId)

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { success: true }
}

// ─── Accept an invitation (by token) ─────────────────────────────────────────

export async function acceptInvitation(token: string): Promise<{ type: 'org' | 'property'; targetId: string } | { error: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    // Fetch the invitation (uses service client to bypass RLS)
    const { data: inv, error: invError } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (invError || !inv) return { error: 'Invitation not found or has expired.' }

    if (inv.org_id) {
      // Org invitation — add the user as an org member
      const { error: memberError } = await supabase
        .from('org_members')
        .insert({ org_id: inv.org_id, user_id: user.id, role: inv.role, invited_by: inv.invited_by })

      if (memberError && !memberError.message.includes('duplicate')) {
        return { error: memberError.message }
      }

      // Mark as accepted
      await supabase
        .from('invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', inv.id)

      revalidatePath('/settings')
      return { type: 'org', targetId: inv.org_id }
    }

    if (inv.property_id) {
      // Property invitation — grant direct property access
      const { error: accessError } = await supabase
        .from('property_access')
        .insert({ property_id: inv.property_id, user_id: user.id, role: inv.role, granted_by: inv.invited_by })

      if (accessError && !accessError.message.includes('duplicate')) {
        return { error: accessError.message }
      }

      await supabase
        .from('invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', inv.id)

      revalidatePath(`/properties/${inv.property_id}`)
      return { type: 'property', targetId: inv.property_id }
    }

    return { error: 'Invalid invitation.' }
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'NEXT_REDIRECT') throw err
    return { error: err instanceof Error ? err.message : 'Failed to accept invitation.' }
  }
}

// ─── Get property access list ─────────────────────────────────────────────────

export async function getPropertyAccessList(propertyId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('property_access')
    .select('*, profiles(full_name, email)')
    .eq('property_id', propertyId)
    .order('created_at')

  return data ?? []
}

// ─── Revoke property access ───────────────────────────────────────────────────

export async function revokePropertyAccess(propertyId: string, userId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { error } = await supabase
    .from('property_access')
    .delete()
    .eq('property_id', propertyId)
    .eq('user_id', userId)

  if (error) return { error: error.message }
  revalidatePath(`/properties/${propertyId}`)
  return { success: true }
}
