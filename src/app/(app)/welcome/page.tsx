import { createServiceClient } from '@/lib/supabase/server'
import { getAppContext } from '@/lib/impersonation'
import Link from 'next/link'

const steps = [
  {
    number: 1,
    color: 'from-violet-600 to-violet-400',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    title: 'Add your properties',
    description: 'Start here — everything else connects to a property. The onboarding wizard walks you through each step.',
    bullets: [
      'Enter property name, address, and access info (WiFi, door codes)',
      'Add AI instructions — the AI will use these when managing work orders',
      'Checklists are created automatically: Cleaning, Maintenance, and Landscaping',
      'Customize each checklist to match exactly what you need done',
    ],
    action: { label: 'Add Your First Property →', href: '/properties/new' },
    tip: 'Tip: You can always edit checklists later from a property\'s Checklist tab.',
  },
  {
    number: 2,
    color: 'from-teal-600 to-teal-400',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Add team & contacts',
    description: 'Your people are what make the AI powerful. Add external vendors for fully automated work order routing, and invite your co-hosts or staff for full platform access.',
    bullets: [
      'Add service contacts (cleaner, plumber, electrician, HVAC, landscaper) — the AI assigns them to work orders automatically',
      'Include email for each contact so the AI can send professional notification messages when work orders are created',
      'Invite co-hosts and staff from Settings — they get their own login and see only the properties you allow',
      'Assign roles: owner, admin, or member — admins can manage work orders and post notes',
    ],
    action: { label: 'Add Contacts →', href: '/contacts/new' },
    tip: 'Tip: A missing service contact means the AI will ask before creating a work order — add contacts first for full automation.',
  },
  {
    number: 3,
    color: 'from-violet-500 to-violet-400',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
    title: 'Text your AI',
    description: 'Text your AI from anywhere via SMS or the in-app chat bubble — create work orders, check status, add stays, and more using plain language.',
    bullets: [
      'Text "Schedule a cleaning at the Lewis house after checkout this Friday" — AI creates the work order and notifies your cleaner',
      'Text "Mark the Vestal property as clean" — status updates instantly across your whole team',
      'Text "Urgent leaking pipe at Beach House" — AI creates a ticket and contacts your plumber',
      'All AI changes are logged with full history — you can always review and reverse a mistake',
    ],
    action: { label: 'Open Dashboard →', href: '/dashboard' },
    tip: 'Tip: The AI learns your property names — even partial names and addresses work.',
  },
  {
    number: 4,
    color: 'from-teal-500 to-teal-400',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
    title: 'Manage from anywhere',
    description: 'Your dashboard stays current in real time. Track guest stays, open work orders, and property status from any device.',
    bullets: [
      'Log guest check-ins with dates — AI generates a shareable welcome page with WiFi, door codes, and house rules',
      'Guests can submit a checkout report from their welcome page — issues auto-create work orders',
      'Create work orders for cleaning, maintenance, plumbing, HVAC, electrical, landscaping, and supplies',
      'Priority levels, assigned contacts, and full audit trail — the AI notifies the right person every time',
    ],
    action: { label: 'Go to Dashboard →', href: '/dashboard' },
    tip: 'Tip: Copy the guest link from any stay page and paste it directly into your Airbnb or VRBO message.',
  },
]

export default async function WelcomePage() {
  // Use effective user identity (respects impersonation)
  const ctx = await getAppContext()
  const svc = createServiceClient()
  const { data: profile } = await svc
    .from('profiles')
    .select('full_name')
    .eq('id', ctx.userId)
    .single()

  let firstName = 'there'
  if (profile?.full_name) {
    firstName = profile.full_name.split(' ')[0]
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-10 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center
                            bg-gradient-to-br from-violet-600 to-teal-400 shadow-lg shadow-violet-900/40">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none">
                <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 7l1 2.5L15.5 10.5 13 11.5 12 14 11 11.5 8.5 10.5 11 9.5z" fill="white" opacity="0.9"/>
              </svg>
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-violet-400">Getting Started</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Welcome, {firstName}!</h1>
          <p className="text-[#6480a0] mt-2 text-base">
            Follow these steps and you&apos;ll be managing properties on autopilot in minutes.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="flex-shrink-0 px-4 py-2.5 rounded-xl border border-[#2a3d58] text-sm font-medium
                     text-[#8aa0be] hover:text-white hover:bg-[#1a2436] transition-all whitespace-nowrap"
        >
          Skip to Dashboard →
        </Link>
      </div>

      {/* Steps */}
      <div className="space-y-5">
        {steps.map(step => (
          <div key={step.number}
            className="relative rounded-2xl border border-[#2a3d58] bg-[#0f1829] overflow-hidden
                       hover:border-[#3a5070] transition-colors">
            <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${step.color}`} />

            <div className="p-6 pl-8">
              <div className="flex items-start gap-5">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center
                                 flex-shrink-0 shadow-lg text-white`}>
                  {step.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-[#4a6080] uppercase tracking-wider">Step {step.number}</span>
                      </div>
                      <h2 className="text-lg font-semibold text-white">{step.title}</h2>
                    </div>
                    <Link
                      href={step.action.href}
                      className={`flex-shrink-0 px-4 py-2 rounded-lg bg-gradient-to-r ${step.color}
                                 text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-lg`}
                    >
                      {step.action.label}
                    </Link>
                  </div>

                  <p className="text-[#6480a0] text-sm mt-2 mb-4 leading-relaxed">{step.description}</p>

                  <ul className="space-y-1.5 mb-4">
                    {step.bullets.map(b => (
                      <li key={b} className="flex items-start gap-2 text-sm text-[#8aa0be]">
                        <svg className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        {b}
                      </li>
                    ))}
                  </ul>

                  <div className="flex items-start gap-2 text-xs text-[#4a6080] bg-[#1a2436] rounded-lg px-3 py-2">
                    <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {step.tip}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* All done CTA */}
      <div className="mt-10 rounded-2xl border border-teal-500/20 bg-gradient-to-br from-teal-950/30 to-[#0f1829] p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-teal-400
                        flex items-center justify-center mx-auto mb-4 shadow-xl">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">You&apos;re all set!</h3>
        <p className="text-[#6480a0] text-sm mb-6 max-w-md mx-auto">
          Your dashboard is ready. You can always come back to this guide from the sidebar.
          Your plan is $50/month and includes 3 properties — additional properties are $10/month each.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-8 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500
                     text-white font-semibold hover:from-violet-500 hover:to-violet-400 transition-all
                     shadow-xl shadow-violet-900/40"
        >
          Go to Dashboard →
        </Link>
      </div>
    </div>
  )
}
