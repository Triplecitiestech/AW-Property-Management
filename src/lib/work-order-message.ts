/**
 * Builds a professional outbound message to send to an assigned contact
 * when a work order is created or manually triggered.
 * Used by both the AI action executor and the manual "Notify Contact" action.
 */
export function buildOutboundMessage(params: {
  category: string
  title: string
  priority: string
  propertyName: string
  ownerName: string
  ownerEmail: string | null
  ownerPhone: string | null
  checklistItems?: string[]
}): string {
  const { category, title, priority, propertyName, ownerName, ownerEmail, ownerPhone, checklistItems } = params

  const replyLine = ownerEmail
    ? `Please reply to this email with confirmation, updates, and payment info.`
    : ownerPhone
    ? `Please reply to ${ownerPhone} with confirmation, updates, and payment info.`
    : `Please reply to confirm receipt and provide updates.`

  const intro = `Hi,\n\nI'm reaching out on behalf of ${ownerName} regarding the following service request at ${propertyName}:\n\n`
  const details = `Work Order: ${title}\nPriority: ${priority.toUpperCase()}\nProperty: ${propertyName}\n\n`

  let specifics = ''
  const cat = category.toLowerCase()

  if (cat === 'cleaning') {
    const items: string[] = checklistItems && checklistItems.length > 0
      ? checklistItems
      : [
          'Vacuum/sweep all floors',
          'Mop hard surface floors',
          'Clean and sanitize all bathrooms',
          'Clean kitchen (counters, appliances, sink)',
          'Change all bed linens and towels',
          'Empty trash in all rooms',
          'Dust surfaces and ceiling fans',
          'Wipe down windows and mirrors',
          'Restock any supplies (soap, toilet paper, etc.)',
          'Lock up securely when finished',
        ]
    specifics = `Cleaning Checklist:\n${items.map(i => `□ ${i}`).join('\n')}\n\n`
  } else if (cat === 'plumbing') {
    specifics = `Issue Details:\n${title}\n\n` +
      `Please assess the situation and provide:\n` +
      `• Description of the problem and root cause\n` +
      `• Parts needed (if any) and estimated cost\n` +
      `• Estimated time to complete\n` +
      `• Your earliest available appointment\n\n`
  } else if (cat === 'electrical') {
    specifics = `Issue Details:\n${title}\n\n` +
      `Please assess and provide:\n` +
      `• Safety assessment of the issue\n` +
      `• Required parts and estimated cost\n` +
      `• Estimated time to complete\n` +
      `• Your earliest available appointment\n\n` +
      `Note: Ensure all work meets local electrical code requirements.\n\n`
  } else if (cat === 'hvac') {
    specifics = `Issue Details:\n${title}\n\n` +
      `Please assess and provide:\n` +
      `• Diagnosis of the HVAC issue\n` +
      `• Required parts/refrigerant (if applicable) and cost\n` +
      `• Estimated repair time\n` +
      `• Your earliest available appointment\n\n`
  } else if (cat === 'landscaping') {
    specifics = `Landscaping Request:\n${title}\n\n` +
      `Please include in your response:\n` +
      `• Scope of work and estimated time\n` +
      `• Any equipment or materials needed\n` +
      `• Your available dates\n` +
      `• Cost estimate\n\n`
  } else if (cat === 'maintenance') {
    specifics = `Maintenance Details:\n${title}\n\n` +
      `Please provide:\n` +
      `• Your assessment and recommended fix\n` +
      `• Materials/parts needed and cost estimate\n` +
      `• Estimated time to complete\n` +
      `• Your earliest availability\n\n`
  } else if (cat === 'supplies') {
    specifics = `Supplies Needed:\n${title}\n\n` +
      `Please confirm:\n` +
      `• Availability of requested items\n` +
      `• Total cost and delivery timeline\n\n`
  } else {
    specifics = `Details:\n${title}\n\n`
  }

  const closing = `${replyLine}\n\nThank you,\n${ownerName}\n(via Smart Sumi AI Property Manager)`
  return intro + details + specifics + closing
}
