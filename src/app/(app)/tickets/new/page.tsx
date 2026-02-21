import { createClient } from '@/lib/supabase/server'
import { createTicket } from '@/lib/actions/tickets'
import Link from 'next/link'

async function handleCreate(formData: FormData) {
  'use server'
  await createTicket(formData)
}

export default async function NewTicketPage({
  searchParams,
}: {
  searchParams: Promise<{ property_id?: string }>
}) {
  const { property_id } = await searchParams
  const supabase = await createClient()

  const [{ data: properties }, { data: managers }] = await Promise.all([
    supabase.from('properties').select('id, name').order('name'),
    supabase.from('profiles').select('id, full_name').order('full_name'),
  ])

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/tickets" className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1>New Ticket</h1>
      </div>

      <div className="card p-6">
        <form action={handleCreate} className="space-y-5">
          <div>
            <label className="form-label" htmlFor="property_id">Property *</label>
            <select id="property_id" name="property_id" className="form-select" required defaultValue={property_id ?? ''}>
              <option value="" disabled>Select a property</option>
              {properties?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="form-label" htmlFor="title">Title *</label>
            <input id="title" name="title" type="text" className="form-input" required placeholder="e.g. Sink is leaking in master bathroom" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label" htmlFor="category">Category</label>
              <select id="category" name="category" className="form-select">
                <option value="maintenance">Maintenance</option>
                <option value="cleaning">Cleaning</option>
                <option value="supplies">Supplies</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="priority">Priority</label>
              <select id="priority" name="priority" className="form-select">
                <option value="low">Low</option>
                <option value="medium" selected>Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label" htmlFor="due_date">Due Date</label>
              <input id="due_date" name="due_date" type="date" className="form-input" defaultValue={tomorrowStr} />
            </div>
            <div>
              <label className="form-label" htmlFor="assignee_id">Assign To</label>
              <select id="assignee_id" name="assignee_id" className="form-select">
                <option value="">Unassigned</option>
                {managers?.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="form-label" htmlFor="description">Description</label>
            <textarea id="description" name="description" className="form-input" rows={4} placeholder="Describe the issue in detail..." />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary">Create Ticket</button>
            <Link href="/tickets" className="btn-secondary">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
