'use client'

import { useState } from 'react'

export default function GuestReportForm({
  token,
  checklistLabels,
  stayId,
}: {
  token: string
  checklistLabels: string[]
  stayId: string
}) {
  const [checklist, setChecklist] = useState(
    checklistLabels.map(label => ({ label, checked: false }))
  )
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleItem(index: number) {
    setChecklist(prev =>
      prev.map((item, i) => (i === index ? { ...item, checked: !item.checked } : item))
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/guest-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, checklist, notes }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
      } else {
        setSubmitted(true)
      }
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-6">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Thank you!</h2>
        <p className="text-gray-500 text-sm">
          Your report has been submitted. We appreciate your feedback!
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="font-semibold text-gray-900 mb-1">Checklist</h2>
        <p className="text-sm text-gray-500 mb-4">Please check each item that applies to your stay.</p>

        <div className="space-y-3">
          {checklist.map((item, index) => (
            <label
              key={index}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                item.checked
                  ? 'bg-green-50 border-green-200'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                item.checked ? 'bg-green-600 border-green-600' : 'border-gray-300'
              }`}>
                {item.checked && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <input
                type="checkbox"
                className="sr-only"
                checked={item.checked}
                onChange={() => toggleItem(index)}
              />
              <span className={`text-sm ${item.checked ? 'text-green-800 font-medium' : 'text-gray-700'}`}>
                {item.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="form-label">Additional Notes (optional)</label>
        <textarea
          className="form-input"
          rows={4}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Any additional comments, issues, or feedback about your stay..."
        />
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary w-full justify-center text-base py-3"
      >
        {submitting ? 'Submitting...' : 'Submit Report'}
      </button>

      <p className="text-xs text-center text-gray-400">
        This report can only be submitted once.
      </p>
    </form>
  )
}
