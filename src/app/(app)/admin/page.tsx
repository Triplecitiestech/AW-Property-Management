import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import DeleteUserButton from '@/components/admin/DeleteUserButton'
import FeatureRequestAdmin from '@/components/admin/FeatureRequestAdmin'

export default async function AdminPage() {
  const svc = createServiceClient()

  const [
    { data: profiles },
    { data: properties },
    { data: usageRaw },
    { data: auditRaw },
    { data: featureRequests },
    { data: conversations },
  ] = await Promise.all([
    svc.from('profiles').select('id, full_name, email, role, is_super_admin, created_at, phone_number').order('created_at', { ascending: false }),
    svc.from('properties').select('id, owner_id'),
    svc.from('ai_usage').select('user_id, tokens_in, tokens_out'),
    svc.from('audit_log').select('changed_by, changed_at').order('changed_at', { ascending: false }).limit(500),
    svc.from('feature_requests').select('*').order('votes', { ascending: false }),
    svc.from('conversations').select('user_id, created_at').order('created_at', { ascending: false }).limit(1000),
  ])

  type Profile = { id: string; full_name: string | null; email: string | null; role: string; is_super_admin: boolean; created_at: string; phone_number: string | null }
  type Property = { id: string; owner_id: string | null }
  type Usage = { user_id: string | null; tokens_in: number | null; tokens_out: number | null }
  type Audit = { changed_by: string | null; changed_at: string }
  type Conv = { user_id: string | null; created_at: string }

  // Aggregate per-user stats
  const userStats = (profiles as Profile[] ?? []).map((p: Profile) => {
    const propCount = (properties as Property[] ?? []).filter((prop: Property) => prop.owner_id === p.id).length
    const aiIn = (usageRaw as Usage[] ?? []).filter((u: Usage) => u.user_id === p.id).reduce((s: number, u: Usage) => s + (u.tokens_in ?? 0), 0)
    const aiOut = (usageRaw as Usage[] ?? []).filter((u: Usage) => u.user_id === p.id).reduce((s: number, u: Usage) => s + (u.tokens_out ?? 0), 0)
    const activityCount = (auditRaw as Audit[] ?? []).filter((a: Audit) => a.changed_by === p.id).length
    const messageCount = (conversations as Conv[] ?? []).filter((c: Conv) => c.user_id === p.id).length
    const lastActive = (auditRaw as Audit[] ?? []).find((a: Audit) => a.changed_by === p.id)?.changed_at
    return { ...p, propCount, aiIn, aiOut, activityCount, messageCount, lastActive }
  }).sort((a: { activityCount: number }, b: { activityCount: number }) => b.activityCount - a.activityCount)

  const totalTokens = (usageRaw as Usage[] ?? []).reduce((s: number, u: Usage) => s + (u.tokens_in ?? 0) + (u.tokens_out ?? 0), 0)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-[#6480a0] text-sm mt-1">Super admin — full access</p>
        </div>
        <span className="px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-semibold">
          Super Admin
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: profiles?.length ?? 0, color: 'text-violet-400' },
          { label: 'Total Properties', value: properties?.length ?? 0, color: 'text-teal-400' },
          { label: 'AI Tokens Used', value: totalTokens.toLocaleString(), color: 'text-amber-400' },
          { label: 'Feature Requests', value: featureRequests?.length ?? 0, color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="card p-5">
            <p className="text-xs text-[#6480a0] font-medium">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="px-5 py-4 border-b border-[#1e2d42] flex items-center justify-between">
          <h2 className="font-semibold text-white">Users</h2>
          <p className="text-xs text-[#6480a0]">Sorted by activity</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e2d42]">
                {['User', 'Properties', 'AI Tokens', 'Messages', 'Actions', 'Last Active', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-[#6480a0] font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2d42]">
              {userStats.map(u => (
                <tr key={u.id} className="hover:bg-[#1a2436] transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{u.full_name || '—'}</p>
                    <p className="text-xs text-[#6480a0]">{u.email}</p>
                    {u.is_super_admin && <span className="text-[10px] text-violet-400">super admin</span>}
                  </td>
                  <td className="px-4 py-3 text-[#94a3b8]">{u.propCount}</td>
                  <td className="px-4 py-3 text-[#94a3b8]">{(u.aiIn + u.aiOut).toLocaleString()}</td>
                  <td className="px-4 py-3 text-[#94a3b8]">{u.messageCount}</td>
                  <td className="px-4 py-3 text-[#94a3b8]">{u.activityCount}</td>
                  <td className="px-4 py-3 text-xs text-[#6480a0] whitespace-nowrap">
                    {u.lastActive ? new Date(u.lastActive).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    {!u.is_super_admin && <DeleteUserButton userId={u.id} userName={u.full_name || u.email || ''} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Feature Requests */}
      <div className="card p-5">
        <h2 className="font-semibold text-white mb-4">Feature Requests</h2>
        <FeatureRequestAdmin requests={featureRequests ?? []} />
      </div>

      {/* System Workflow Diagram */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-white">System Workflow Diagram</h2>
            <p className="text-xs text-[#6480a0] mt-0.5">Live visual of how the system works — update this whenever workflows change</p>
          </div>
          <a href="/workflow-diagram.svg" target="_blank" rel="noopener noreferrer"
             className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
            Open full size ↗
          </a>
        </div>
        <div className="rounded-xl overflow-hidden border border-[#1e2d42]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/workflow-diagram.svg"
            alt="SmartSumai system workflow diagram"
            className="w-full h-auto"
          />
        </div>
      </div>
    </div>
  )
}
