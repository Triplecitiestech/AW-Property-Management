import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import OnboardingWizard from '@/components/properties/OnboardingWizard'

export default async function OnboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: property },
    { data: checklistItems },
  ] = await Promise.all([
    supabase
      .from('properties')
      .select('id, name, address, quick_notes, ai_instructions')
      .eq('id', id)
      .single(),
    supabase
      .from('property_checklist_items')
      .select('label, sort_order')
      .eq('property_id', id)
      .order('sort_order'),
  ])

  if (!property) notFound()

  const prop = property as typeof property & {
    quick_notes?: string | null
    ai_instructions?: string | null
  }

  return (
    <OnboardingWizard
      propertyId={id}
      propertyName={property.name}
      initialChecklist={checklistItems?.map(i => i.label) ?? []}
      initialNotes={prop.quick_notes ?? ''}
      initialAiInstructions={prop.ai_instructions ?? ''}
    />
  )
}
