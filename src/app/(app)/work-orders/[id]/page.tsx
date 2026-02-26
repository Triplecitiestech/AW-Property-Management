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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Link href="/work-orders" className="text-gray-400 hover:text-gray-600 mt-1 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{workOrder.title}</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {propertyName} · {workOrder.category} · Created {new Date(workOrder.created_at).toLocaleDateString()} by {creator?.full_name ?? 'Unknown'}
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
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{workOrder.description}</p>
            </div>
          )}

          {/* Comments */}
          <div className="card">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-semibold">Comments ({comments?.length ?? 0})</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {comments?.map(comment => (
                <div key={comment.id} className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-sm text-gray-900">
                      {(comment.profiles as {full_name:string}|null)?.full_name ?? 'Unknown'}
                    </span>
                    <span className="text-xs text-gray-400">{new Date(comment.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                </div>
              ))}
              {(!comments || comments.length === 0) && (
                <div className="px-5 py-6 text-sm text-gray-400">No comments yet.</div>
              )}
            </div>
            <div className="p-5 border-t border-gray-100">
              <AddWorkOrderCommentForm requestId={workOrder.id} />
            </div>
          </div>

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
                        <span className="font-medium text-gray-800">{actor}</span>
                        {statusChange ? (
                          <span className="text-gray-500"> changed status: <span className="font-medium">{String(beforeData.status)}</span> → <span className="font-medium">{String(afterData.status)}</span></span>
                        ) : (
                          <span className="text-gray-500"> {entry.action} this work order</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{new Date(entry.changed_at).toLocaleDateString()}</span>
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
                <p className="text-gray-400 text-xs mb-0.5">Property</p>
                <Link href={`/properties/${(workOrder.properties as {id:string}|null)?.id}`} className="text-blue-600 hover:underline">{propertyName}</Link>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-0.5">Category</p>
                <p className="capitalize text-gray-700">{workOrder.category}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-0.5">Priority</p>
                <span className={`badge badge-${workOrder.priority}`}>{workOrder.priority.charAt(0).toUpperCase() + workOrder.priority.slice(1)}</span>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-0.5">Due Date</p>
                <p className="text-gray-700">{workOrder.due_date ?? 'Not set'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-0.5">Assignee</p>
                {assignee ? (
                  <p className="text-gray-700">{assignee.full_name}</p>
                ) : (
                  <p className="text-gray-400">Unassigned</p>
                )}
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-0.5">Contact Assigned</p>
                {assignedContact ? (
                  <div>
                    <p className="text-gray-700 font-medium">{assignedContact.name}</p>
                    <p className="text-gray-400 text-xs capitalize">{assignedContact.role}</p>
                    {assignedContact.email && <p className="text-xs text-blue-500">{assignedContact.email}</p>}
                    {assignedContact.phone && <p className="text-xs text-gray-500">{assignedContact.phone}</p>}
                  </div>
                ) : (
                  <p className="text-gray-400">None assigned</p>
                )}
              </div>
            </div>

            {/* Edit form */}
            <form action={async (formData) => {
              'use server'
              const { updateTicket } = await import('@/lib/actions/tickets')
              await updateTicket(id, formData)
            }} className="mt-4 pt-4 border-t border-gray-100 space-y-3">
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
