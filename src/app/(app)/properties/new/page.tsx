import { createProperty } from '@/lib/actions/properties'
import Link from 'next/link'

async function handleCreate(formData: FormData) {
  'use server'
  await createProperty(formData)
}

export default function NewPropertyPage() {
  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/properties" className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1>Add Property</h1>
      </div>

      <div className="card p-6">
        <form action={handleCreate} className="space-y-5">
          <div>
            <label className="form-label" htmlFor="name">Property Name *</label>
            <input id="name" name="name" type="text" className="form-input" required placeholder="e.g. Lake Cabin" />
          </div>
          <div>
            <label className="form-label" htmlFor="address">Address</label>
            <input id="address" name="address" type="text" className="form-input" placeholder="123 Main St, City, State ZIP" />
          </div>
          <div>
            <label className="form-label" htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              className="form-input"
              rows={3}
              placeholder="Optional notes about this property..."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary">Create Property</button>
            <Link href="/properties" className="btn-secondary">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
