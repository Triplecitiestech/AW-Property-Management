'use client'

import { useState, useTransition } from 'react'
import {
  updateOrgName,
  updateOrgAiInstructions,
  createOrgInvitation,
  revokeInvitation,
  removeOrgMember,
  updateMemberRole,
} from '@/lib/actions/organizations'
import type { OrgRole } from '@/lib/supabase/types'

type Org = { id: string; name: string; ai_instructions: string | null; created_at: string }
type Member = {
  org_id: string; user_id: string; role: string; joined_at: string
  profiles?: { full_name: string; email: string | null } | null
}
type Invitation = {
  id: string; token: string; role: string; email: string | null
  expires_at: string; created_at: string
}

const DEFAULT_AI_INSTRUCTIONS = `Be concise and professional. When creating work orders, always confirm the property and contact before proceeding. If a contact is missing for a category, ask the user if they'd like to add one or skip. Prefer texting over email for urgent matters. Always address the user by their first name.`

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner', admin: 'Admin', member: 'Member',
}
const ROLE_STYLES: Record<string, string> = {
  owner:  'bg-violet-950 text-violet-300 ring-1 ring-violet-700/50',
  admin:  'bg-cyan-950   text-cyan-300   ring-1 ring-cyan-700/50',
  member: 'bg-[#162030]  text-[#6480a0]  ring-1 ring-[#2a3d58]',
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-xs text-violet-400 hover:text-violet-300 transition-colors flex-shrink-0"
    >
      {copied ? 'Copied!' : 'Copy link'}
    </button>
  )
}

export default function OrgSettings({
  org,
  members,
  invitations,
  currentUserId,
  currentRole,
}: {
  org: Org
  members: Member[]
  invitations: Invitation[]
  currentUserId: string
  currentRole: OrgRole
}) {
  const isAdmin = currentRole === 'owner' || currentRole === 'admin'

  // ── Org Name ───────────────────────────────────────────────────────────────
  const [orgName, setOrgName] = useState(org.name)
  const [nameError, setNameError] = useState<string | null>(null)
  const [nameSaved, setNameSaved] = useState(false)
  const [namePending, startNameTransition] = useTransition()

  // ── Org AI Instructions ────────────────────────────────────────────────────
  const [aiInstructions, setAiInstructions] = useState(org.ai_instructions ?? '')
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiSaved, setAiSaved] = useState(false)
  const [aiPending, startAiTransition] = useTransition()

  function handleSaveAi() {
    setAiError(null)
    startAiTransition(async () => {
      const result = await updateOrgAiInstructions(org.id, aiInstructions)
      if (result?.error) { setAiError(result.error) }
      else { setAiSaved(true); setTimeout(() => setAiSaved(false), 2000) }
    })
  }

  function handleSaveName() {
    setNameError(null)
    startNameTransition(async () => {
      const result = await updateOrgName(org.id, orgName)
      if (result?.error) { setNameError(result.error) }
      else { setNameSaved(true); setTimeout(() => setNameSaved(false), 2000) }
    })
  }

  // ── Invite ─────────────────────────────────────────────────────────────────
  const [inviteRole, setInviteRole] = useState<OrgRole>('member')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [invitePending, startInviteTransition] = useTransition()

  function handleCreateInvite() {
    setInviteError(null)
    setInviteLink(null)
    startInviteTransition(async () => {
      const result = await createOrgInvitation(org.id, inviteRole, inviteEmail || undefined)
      if ('error' in result) { setInviteError(result.error ?? null) }
      else { setInviteLink(result.inviteUrl) }
    })
  }

  // ── Revoke invite ──────────────────────────────────────────────────────────
  const [revokePending, startRevokeTransition] = useTransition()
  function handleRevoke(id: string) {
    startRevokeTransition(async () => { await revokeInvitation(id) })
  }

  // ── Remove member ──────────────────────────────────────────────────────────
  const [removePending, startRemoveTransition] = useTransition()
  function handleRemove(userId: string, name: string) {
    if (!confirm(`Remove ${name} from the organization?`)) return
    startRemoveTransition(async () => { await removeOrgMember(org.id, userId) })
  }

  // ── Change role ────────────────────────────────────────────────────────────
  const [rolePending, startRoleTransition] = useTransition()
  function handleRoleChange(userId: string, role: OrgRole) {
    startRoleTransition(async () => { await updateMemberRole(org.id, userId, role) })
  }

  return (
    <div className="space-y-6">

      {/* ── Organization Name ──────────────────────────────────── */}
      <div className="card p-5">
        <h2 className="text-base font-semibold text-white mb-4">Organization</h2>
        <div className="space-y-3">
          <div>
            <label className="form-label text-xs">Organization Name</label>
            <input
              type="text"
              className="form-input text-sm"
              value={orgName}
              onChange={e => setOrgName(e.target.value)}
              placeholder="My Property Group"
              disabled={!isAdmin}
            />
          </div>
          {nameError && <p className="text-xs text-red-400">{nameError}</p>}
          {isAdmin && (
            <div className="flex items-center gap-3">
              <button onClick={handleSaveName} disabled={namePending} className="btn-primary text-sm">
                {namePending ? 'Saving…' : nameSaved ? 'Saved!' : 'Save Name'}
              </button>
              {nameSaved && <span className="text-xs text-emerald-400">Organization name updated</span>}
            </div>
          )}
          <p className="text-xs text-[#4a6080]">
            Created {new Date(org.created_at).toLocaleDateString()} · {members.length} member{members.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* ── General AI Instructions ────────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h2 className="text-base font-semibold text-white">General AI Instructions</h2>
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                if (confirm('Restore AI instructions to the recommended defaults? Your current instructions will be replaced.')) {
                  setAiInstructions(DEFAULT_AI_INSTRUCTIONS)
                }
              }}
              className="text-xs text-[#6480a0] hover:text-sky-400 transition-colors flex-shrink-0"
            >
              Restore defaults
            </button>
          )}
        </div>
        <p className="text-xs text-[#6480a0] mb-2">
          Default instructions for the AI agent across all your properties. Override per-property in the property&apos;s AI Agent Instructions section.
        </p>
        {/* Warning banner */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-sky-500/10 border border-sky-500/20 text-xs text-sky-300 mb-3">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>
            <strong>Customize carefully.</strong> These instructions guide every AI interaction. Removing key rules (like contact checks or property name matching) may cause the AI to behave unexpectedly. Use &ldquo;Restore defaults&rdquo; if something goes wrong.
          </span>
        </div>
        <textarea
          className="form-input text-sm w-full"
          rows={5}
          value={aiInstructions}
          onChange={e => setAiInstructions(e.target.value)}
          placeholder="e.g. Always respond politely. Prefer texting over email. For maintenance issues, always contact the plumber first..."
          disabled={!isAdmin}
        />
        {aiError && <p className="text-xs text-red-400 mt-1">{aiError}</p>}
        {isAdmin && (
          <div className="flex items-center gap-3 mt-2">
            <button onClick={handleSaveAi} disabled={aiPending} className="btn-primary text-sm">
              {aiPending ? 'Saving…' : aiSaved ? 'Saved!' : 'Save AI Instructions'}
            </button>
            {aiSaved && <span className="text-xs text-emerald-400">Instructions saved</span>}
          </div>
        )}
      </div>

      {/* ── Team Members ──────────────────────────────────────── */}
      <div className="card p-5">
        <h2 className="text-base font-semibold text-white mb-4">Team Members</h2>
        <div className="space-y-2">
          {members.map(m => {
            const name = m.profiles?.full_name || m.profiles?.email || 'Unknown'
            const email = m.profiles?.email
            const isMe = m.user_id === currentUserId
            const isOwner = m.role === 'owner'
            return (
              <div key={m.user_id} className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-xl bg-[#0f1829] border border-[#2a3d58]">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {name} {isMe && <span className="text-xs text-[#4a6080] font-normal">(you)</span>}
                  </p>
                  {email && <p className="text-xs text-[#6480a0] truncate">{email}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isAdmin && !isMe && !isOwner ? (
                    <select
                      className="form-select text-xs py-1 px-2 w-auto"
                      value={m.role}
                      onChange={e => handleRoleChange(m.user_id, e.target.value as OrgRole)}
                      disabled={rolePending}
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                    </select>
                  ) : (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_STYLES[m.role] ?? ROLE_STYLES.member}`}>
                      {ROLE_LABELS[m.role] ?? m.role}
                    </span>
                  )}
                  {isAdmin && !isMe && !isOwner && (
                    <button
                      onClick={() => handleRemove(m.user_id, name)}
                      disabled={removePending}
                      className="p-1 text-[#4a6080] hover:text-red-400 transition-colors"
                      title="Remove member"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Invite Team Member ─────────────────────────────────── */}
      {isAdmin && (
        <div className="card p-5">
          <h2 className="text-base font-semibold text-white mb-1">Invite Team Member</h2>
          <p className="text-xs text-[#6480a0] mb-4">
            Generate a shareable invite link. Anyone with the link can join your organization.
          </p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label text-xs">Email (optional hint)</label>
                <input
                  type="email"
                  className="form-input text-sm"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="team@example.com"
                />
              </div>
              <div>
                <label className="form-label text-xs">Role</label>
                <select
                  className="form-select text-sm"
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as OrgRole)}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            {inviteError && <p className="text-xs text-red-400">{inviteError}</p>}

            {inviteLink && (
              <div className="flex items-center gap-2 p-3 bg-[#0f1829] rounded-xl border border-[#2a3d58]">
                <p className="text-xs text-[#94a3b8] truncate flex-1 font-mono">{inviteLink}</p>
                <CopyButton text={inviteLink} />
              </div>
            )}

            <button onClick={handleCreateInvite} disabled={invitePending} className="btn-primary text-sm">
              {invitePending ? 'Generating…' : 'Generate Invite Link'}
            </button>
          </div>
        </div>
      )}

      {/* ── Pending Invitations ────────────────────────────────── */}
      {isAdmin && invitations.length > 0 && (
        <div className="card p-5">
          <h2 className="text-base font-semibold text-white mb-4">Pending Invitations</h2>
          <div className="space-y-2">
            {invitations.map(inv => (
              <div key={inv.id} className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-xl bg-[#0f1829] border border-[#2a3d58]">
                <div className="min-w-0">
                  <p className="text-sm text-white truncate font-mono text-xs">{inv.email || 'Anyone with link'}</p>
                  <p className="text-xs text-[#6480a0]">
                    Role: {ROLE_LABELS[inv.role] ?? inv.role} · Expires {new Date(inv.expires_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <CopyButton text={`${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${inv.token}`} />
                  <button
                    onClick={() => handleRevoke(inv.id)}
                    disabled={revokePending}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
