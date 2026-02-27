import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import WorkOrderStatusSelect from '@/components/work-orders/WorkOrderStatusSelect'
import AddWorkOrderCommentForm from '@/components/work-orders/AddWorkOrderCommentForm'
import DeleteWorkOrderButton from '@/components/work-orders/DeleteWorkOrderButton'

export default async function WorkOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: workOrder },
    { data: comments },
    { data: auditEntries },
    { data: profiles },
  ] = await Promise.all([
    supabase
      .from('service_requests')
      .select(`
        *,
        properties(id, name),
        assignee:profiles!service_requests_assignee_id_fkey(id, full_name, email),
        creator:profiles!service_requests_created_by_fkey(full_name),
        assigned_contact:property_contacts!service_requests_assigned_contact_id_fkey(id, name, role, email, phone)
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('service_request_comments')
      .select('*, profiles(full_name)')
      .eq('request_id', id)
      .order('created_at'),
    supabase
      .from('audit_log')
      .select('*, profiles(full_name)')
      .eq('entity_id', id)
      .order('changed_at', { ascending: false })
      .limit(10),
    supabase.from('profiles').select('id, full_name').order('full_name'),
  ])

  if (!workOrder) notFound()

  const { data: propertyContacts } = await supabase
    .from('property_contacts')
    .select('id, name, role')
    .eq('property_id', workOrder.property_id)
    .order('name')

  const propertyName = (workOrder.properties as {name:string}|null)?.name ?? 'Unknown'
  const assignee = workOrder.assignee as {id:string; full_name:string; email:string}|null
  const creator = workOrder.creator as {full_name:string}|null
  const assignedContact = workOrder.assigned_contact as {id:string; name:string; role:string; email:string|null; phone:string|null}|null
  const woNum = workOrder.work_order_number ? `WO-${String(workOrder.work_order_number).padStart(4, '0')}` : null
  const isAiComment = (content: string) => content.startsWith('[Smart Sumai AI')

  // Outbound message metadata
  const outboundMessage = workOrder.outbound_message as string | null
  const outboundSentTo = workOrder.outbound_sent_to as string | null
  const outboundMethod = workOrder.outbound_method as string | null
  const outboundSentAt = workOrder.outbound_sent_at as string | null

  const methodLabel = outboundMethod === 'email' ? 'Email' : outboundMethod === 'sms' ? 'SMS' : 'No contact'
  const methodIcon = outboundMethod === 'email' ? '✉' : outboundMethod === 'sms' ? '💬' : '—'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Link href="/work-orders" className="text-[#6480a0] hover:text-white mt-1 flex-shrink-0 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="min-w-0">
            {woNum && <p className="font-mono text-xs text-[#6480a0] mb-0.5">{woNum}</p>}
            <h1 className="text-2xl font-bold text-white truncate">{workOrder.title}</h1>
            <p className="text-[#6480a0] text-sm mt-0.5">
              {propertyName} · <span className="capitalize">{workOrder.category}</span> · Created {new Date(workOrder.created_at).toLocaleDateString()} by {creator?.full_name ?? 'Unknown'}
              {workOrder.source && <span className="ml-1 text-xs text-[#4a6080]">via {workOrder.source === 'sms' ? 'SMS' : 'web chat'} AI</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`badge badge-${workOrder.priority}`}>{workOrder.priority.charAt(0).toUpperCase() + workOrder.priority.slice(1)}</span>
          <WorkOrderStatusSelect workOrderId={workOrder.id} currentStatus={workOrder.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {workOrder.description && (
            <div className="card p-5">
              <h3 className="font-semibold mb-3">Description</h3>
              <p className="text-sm text-[#94a3b8] whitespace-pre-wrap">{workOrder.description}</p>
            </div>
          )}

          {/* Internal AI Conversation Log */}
          <div className="card">
            <div className="px-5 py-4 border-b border-[#2a3d58] flex items-center gap-2">
              <span className="text-[#6480a0]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </span>
              <h3 className="font-semibold">Internal Log</h3>
              <span className="text-xs text-[#6480a0] ml-auto">AI conversation · visible to team only</span>
            </div>
            <div className="divide-y divide-[#1e2d42]">
              {comments?.map(comment => {
                const aiComment = isAiComment(comment.content)
                const isExternal = comment.is_internal === false
                return (
                  <div key={comment.id} className={`px-5 py-4 ${aiComment ? 'bg-violet-500/5 border-l-2 border-violet-500/40' : isExternal ? 'bg-teal-500/5 border-l-2 border-teal-500/40' : ''}`}>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {aiComment ? (
                        <>
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-full px-2.5 py-0.5">
                            <span>🤖</span> Smart Sumai AI
                          </span>
                          <span className="text-xs text-[#4a6080]">{new Date(comment.created_at).toLocaleString()}</span>
                        </>
                      ) : (
                        <>
                          <div className="w-6 h-6 rounded-full bg-[#2a3d58] flex items-center justify-center text-xs font-bold text-[#94a3b8]">
                            {((comment.profiles as {full_name:string}|null)?.full_name ?? '?')[0]?.toUpperCase()}
                          </div>
                          <span className="font-medium text-sm text-[#e2e8f0]">
                            {(comment.profiles as {full_name:string}|null)?.full_name ?? 'Unknown'}
                          </span>
                          <span className="text-xs text-[#4a6080]">{new Date(comment.created_at).toLocaleString()}</span>
                          {isExternal ? (
                            <span className="text-[10px] font-semibold text-teal-400 bg-teal-500/10 border border-teal-500/20 rounded-full px-2 py-0.5 ml-auto">External · sent to contact</span>
                          ) : (
                            <span className="text-[10px] font-semibold text-[#4a6080] bg-[#1a2436] rounded-full px-2 py-0.5 ml-auto">Internal</span>
                          )}
                        </>
                      )}
                    </div>
                    <p className={`text-sm whitespace-pre-wrap leading-relaxed ${aiComment ? 'text-[#94a3b8] font-mono text-xs' : 'text-[#cbd5e1]'}`}>{comment.content}</p>
                  </div>
                )
              })}
              {(!comments || comments.length === 0) && (
                <div className="px-5 py-6 text-sm text-[#4a6080]">No internal notes yet.</div>
              )}
            </div>
            <div className="p-5 border-t border-[#2a3d58]">
              <AddWorkOrderCommentForm requestId={workOrder.id} />
            </div>
          </div>

          {/* External Outbound Message */}
          {outboundMessage && (
            <div className="card">
              <div className="px-5 py-4 border-b border-[#2a3d58] flex items-center gap-2">
                <span className="text-teal-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
                <h3 className="font-semibold">External Message Sent</h3>
                <span className="text-xs text-[#6480a0] ml-auto">sent to contact · {methodLabel}</span>
              </div>
              <div className="px-5 py-4 border-b border-[#1e2d42] bg-teal-500/5">
                <div className="flex flex-wrap gap-4 text-xs text-[#6480a0]">
                  <div className="flex items-center gap-1.5">
                    <span>{methodIcon}</span>
                    <span className="font-medium text-[#94a3b8]">Method:</span>
                    <span className="text-teal-400 font-semibold">{methodLabel}</span>
                  </div>
                  {outboundSentTo && (
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-[#94a3b8]">To:</span>
                      <span className="text-[#cbd5e1]">{outboundSentTo}</span>
                    </div>
                  )}
                  {outboundSentAt && (
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-[#94a3b8]">Sent:</span>
                      <span>{new Date(outboundSentAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm text-[#94a3b8] whitespace-pre-wrap font-mono leading-relaxed text-xs">{outboundMessage}</p>
              </div>
            </div>
          )}

          {/* Audit Trail */}
          {auditEntries && auditEntries.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold mb-3">Activity Log</h3>
              <div className="space-y-2">
                {auditEntries.map(entry => {
                  const actor = (entry.profiles as {full_name:string}|null)?.full_name ?? 'System'
                  const afterData = entry.after_data as Record<string,unknown>|null
                  const beforeData = entry.before_data as Record<string,unknown>|null
                  const statusChange = afterData?.status && beforeData?.status
                  return (
                    <div key={entry.id} className="flex items-start justify-between text-sm gap-4">
                      <div>
                        <span className="font-medium text-[#e2e8f0]">{actor}</span>
                        {statusChange ? (
                          <span className="text-[#6480a0]"> changed status: <span className="font-medium text-[#94a3b8]">{String(beforeData.status)}</span> → <span className="font-medium text-[#94a3b8]">{String(afterData.status)}</span></span>
                        ) : (
                          <span className="text-[#6480a0]"> {entry.action} this work order</span>
                        )}
                      </div>
                      <span className="text-xs text-[#4a6080] flex-shrink-0">{new Date(entry.changed_at).toLocaleDateString()}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Metadata */}
          <div className="card p-5">
            <h3 className="font-semibold mb-4">Details</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-[#4a6080] text-xs mb-0.5">Property</p>
                <Link href={`/properties/${(workOrder.properties as {id:string}|null)?.id}`} className="text-violet-400 hover:text-violet-300 transition-colors">{propertyName}</Link>
              </div>
              <div>
                <p className="text-[#4a6080] text-xs mb-0.5">Category</p>
                <p className="capitalize text-[#cbd5e1]">{workOrder.category}</p>
              </div>
              <div>
                <p className="text-[#4a6080] text-xs mb-0.5">Priority</p>
                <span className={`badge badge-${workOrder.priority}`}>{workOrder.priority.charAt(0).toUpperCase() + workOrder.priority.slice(1)}</span>
              </div>
              <div>
                <p className="text-[#4a6080] text-xs mb-0.5">Due Date</p>
                <p className="text-[#cbd5e1]">{workOrder.due_date ?? 'Not set'}</p>
              </div>
              <div>
                <p className="text-[#4a6080] text-xs mb-0.5">Assignee</p>
                {assignee ? (
                  <p className="text-[#cbd5e1]">{assignee.full_name}</p>
                ) : (
                  <p className="text-[#4a6080]">Unassigned</p>
                )}
              </div>
              <div>
                <p className="text-[#4a6080] text-xs mb-0.5">Contact Assigned</p>
                {assignedContact ? (
                  <div>
                    <p className="text-[#cbd5e1] font-medium">{assignedContact.name}</p>
                    <p className="text-[#6480a0] text-xs capitalize">{assignedContact.role}</p>
                    {assignedContact.email && <p className="text-xs text-violet-400">{assignedContact.email}</p>}
                    {assignedContact.phone && <p className="text-xs text-[#6480a0]">{assignedContact.phone}</p>}
                  </div>
                ) : (
                  <p className="text-[#4a6080]">None assigned</p>
                )}
              </div>
            </div>

            {/* Edit form */}
            <form action={async (formData) => {
              'use server'
              const { updateTicket } = await import('@/lib/actions/tickets')
              await updateTicket(id, formData)
            }} className="mt-4 pt-4 border-t border-[#2a3d58] space-y-3">
              <div>
                <label className="form-label text-xs">Reassign to (Team)</label>
                <select name="assignee_id" className="form-select text-sm" defaultValue={assignee?.id ?? ''}>
                  <option value="">Unassigned</option>
                  {profiles?.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label text-xs">Send To Contact</label>
                <select name="assigned_contact_id" className="form-select text-sm" defaultValue={assignedContact?.id ?? ''}>
                  <option value="">None</option>
                  {propertyContacts?.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.role})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label text-xs">Due Date</label>
                <input name="due_date" type="date" className="form-input text-sm" defaultValue={workOrder.due_date ?? ''} />
              </div>
              {/* Hidden fields to preserve other values */}
              <input type="hidden" name="title" value={workOrder.title} />
              <input type="hidden" name="description" value={workOrder.description ?? ''} />
              <input type="hidden" name="category" value={workOrder.category} />
              <input type="hidden" name="priority" value={workOrder.priority} />
              <button type="submit" className="btn-secondary text-sm w-full justify-center">Update</button>
            </form>
          </div>

          {/* Delete */}
          <div className="card p-5">
            <DeleteWorkOrderButton workOrderId={workOrder.id} workOrderTitle={workOrder.title} />
          </div>
        </div>
      </div>
    </div>
  )
}
