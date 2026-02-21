'use client'

import { useState, useTransition } from 'react'
import { updateAiInstructions } from '@/lib/actions/properties'

export default function AiInstructionsEditor({
  propertyId,
  initialInstructions,
}: {
  propertyId: string
  initialInstructions: string
}) {
  const [instructions, setInstructions] = useState(initialInstructions)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await updateAiInstructions(propertyId, instructions)
      if (result?.error) {
        setError(result.error)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    })
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-[#60608a] leading-relaxed">
        The AI agent will open every outreach message with this template. Use it to identify
        the property, the management company, and how to reach the property manager.
        Example variables you can reference: <span className="font-mono text-[#8080aa]">{`{property_name}`}</span>,{' '}
        <span className="font-mono text-[#8080aa]">{`{property_address}`}</span>,{' '}
        <span className="font-mono text-[#8080aa]">{`{manager_name}`}</span>.
      </p>
      <textarea
        className="form-input text-sm resize-none font-mono"
        rows={6}
        value={instructions}
        onChange={e => setInstructions(e.target.value)}
        placeholder={`Hi, this is the property manager for {property_name} located at {property_address}, managed by {manager_name}. We are reaching out because [ISSUE]. For any questions, please contact our property manager at [PHONE/EMAIL]. Thank you.`}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={isPending} className="btn-primary text-sm">
          {isPending ? 'Saving…' : saved ? 'Saved!' : 'Save Instructions'}
        </button>
        {saved && <span className="text-xs text-emerald-400">Changes saved</span>}
      </div>
    </div>
  )
}
