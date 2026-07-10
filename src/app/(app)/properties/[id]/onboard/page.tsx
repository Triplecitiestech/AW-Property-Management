import { requireAppContext, requirePropertyAccess } from '@/lib/auth/guards'
import { notFound } from 'next/navigation'
import OnboardingWizard from '@/components/properties/OnboardingWizard'

export default async function OnboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await requireAppContext()
  if (!requirePropertyAccess(ctx, id)) notFound()
  const supabase = ctx.supabase

  const [
    { data: property },
    { data: checklistItems },
  ] = await Promise.all([
    supabase
      .from('properties')
      .select('id, name, address, description, quick_notes, ai_instructions')
      .eq('id', id)
      .single(),
    supabase
      .from('property_checklist_items')
      .select('label, sort_order')
      .eq('property_id', id)
      .order('sort_order'),
  ])

  if (!property) notFound()

  return (
    <OnboardingWizard
      propertyId={id}
      initialName={property.name}
      initialAddress={property.address}
      initialDescription={property.description ?? ''}
      initialChecklist={checklistItems?.map(i => i.label) ?? []}
      initialNotes={property.quick_notes ?? ''}
      initialAiInstructions={property.ai_instructions ?? ''}
    />
  )
}
