import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, address } = await req.json()
  if (!address && !name) return NextResponse.json({ error: 'Address or name required' }, { status: 400 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ summary: '', error: 'ANTHROPIC_API_KEY not set in Vercel environment variables.' })

  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Write a single concise paragraph (3-4 sentences) describing this property for a property manager. Include the type of property and location feel. Keep it professional and helpful for managing the property. Do not invent specific details like number of rooms — only describe based on what you can reasonably infer from the address and name.

Property name: ${name || 'Not specified'}
Address: ${address || 'Not specified'}

Reply with only the paragraph, no intro or quotes.`,
      }],
    })

    const summary = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    return NextResponse.json({ summary })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Anthropic API error'
    return NextResponse.json({ summary: '', error: msg })
  }
}

// PATCH — save AI summary to a property
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { propertyId, summary } = await req.json()
  if (!propertyId || !summary) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const svc = createServiceClient()
  const { error } = await svc.from('properties').update({ ai_summary: summary }).eq('id', propertyId).eq('owner_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
