import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import TicketStatusSelect from '@/components/tickets/TicketStatusSelect'
import AddCommentForm from '@/components/tickets/AddCommentForm'
import DeleteTicketButton from '@/components/tickets/DeleteTicketButton'

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: ticket },
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
        creator:profiles!service_requests_created_by_fkey(full_name)
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

  if (!ticket) notFound()

  const propertyName = (ticket.properties as {name:string}|null)?.name ?? 'Unknown'
  const assignee = ticket.assignee as {id:string; full_name:string; email:string}|null
  const creator = ticket.creator as {full_name:string}|null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Link href="/tickets" className="text-gray-400 hover:text-gray-600 mt-1 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{ticket.title}</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {propertyName} · {ticket.category} · Created {new Date(ticket.created_at).toLocaleDateString()} by {creator?.full_name ?? 'Unknown'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`badge badge-${ticket.priority}`}>{ticket.priority}</span>
          <TicketStatusSelect ticketId={ticket.id} currentStatus={ticket.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {ticket.description && (
            <div className="card p-5">
              <h3 className="font-semibold mb-3">Description</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
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
              <AddCommentForm requestId={ticket.id} />
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
                          <span className="text-gray-500"> {entry.action} this ticket</span>
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
                <Link href={`/properties/${(ticket.properties as {id:string}|null)?.id}`} className="text-blue-600 hover:underline">{propertyName}</Link>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-0.5">Category</p>
                <p className="capitalize text-gray-700">{ticket.category}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-0.5">Priority</p>
                <span className={`badge badge-${ticket.priority}`}>{ticket.priority}</span>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-0.5">Due Date</p>
                <p className="text-gray-700">{ticket.due_date ?? 'Not set'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-0.5">Assignee</p>
                {assignee ? (
                  <p className="text-gray-700">{assignee.full_name}</p>
                ) : (
                  <p className="text-gray-400">Unassigned</p>
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
                <label className="form-label text-xs">Reassign to</label>
                <select name="assignee_id" className="form-select text-sm" defaultValue={assignee?.id ?? ''}>
                  <option value="">Unassigned</option>
                  {profiles?.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label text-xs">Due Date</label>
                <input name="due_date" type="date" className="form-input text-sm" defaultValue={ticket.due_date ?? ''} />
              </div>
              {/* Hidden fields to preserve other values */}
              <input type="hidden" name="title" value={ticket.title} />
              <input type="hidden" name="description" value={ticket.description ?? ''} />
              <input type="hidden" name="category" value={ticket.category} />
              <input type="hidden" name="priority" value={ticket.priority} />
              <button type="submit" className="btn-secondary text-sm w-full justify-center">Update</button>
            </form>
          </div>

          {/* Delete */}
          <div className="card p-5">
            <DeleteTicketButton ticketId={ticket.id} ticketTitle={ticket.title} />
          </div>
        </div>
      </div>
    </div>
  )
}
