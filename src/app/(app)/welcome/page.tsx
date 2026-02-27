import { createClient } from '@/lib/supabase/server'
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
    title: 'Add your first property',
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
    title: 'Add your team & service contacts',
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
    color: 'from-emerald-600 to-emerald-400',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Track guest stays',
    description: 'Log every check-in. Smart Sumai generates a unique welcome page for each stay that you can share with guests.',
    bullets: [
      'Record guest name, check-in and check-out dates',
      'Add WiFi, door codes, and house rules — they appear on the guest welcome page',
      'Guests can submit a checkout report — issues auto-create work orders',
      'No account needed for guests',
    ],
    action: { label: 'Log a Stay →', href: '/stays/new' },
    tip: 'Tip: Copy the guest link from the stay page and paste it into your Airbnb message.',
  },
  {
    number: 4,
    color: 'from-rose-600 to-rose-400',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    title: 'Manage work orders',
    description: 'Create work orders for anything that needs attention. The AI assigns the right contact and sends them a detailed professional message automatically.',
    bullets: [
      'Categories: cleaning, maintenance, plumbing, HVAC, electrical, landscaping, supplies',
      'Priority levels: urgent, high, medium, low',
      'AI auto-notifies the assigned contact with a full work description',
      'Add internal notes for your team, or send external updates to the contact',
    ],
    action: { label: 'Create a Work Order →', href: '/work-orders/new' },
    tip: 'Tip: All AI actions are logged — so you can always review what the AI did and reverse a mistake.',
  },
  {
    number: 5,
    color: 'from-amber-600 to-amber-400',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
    title: 'Use the AI assistant',
    description: 'Text your AI from anywhere via SMS or the chat bubble — create work orders, check status, add stays, and more using plain language.',
    bullets: [
      'Text "Schedule a cleaning at the Lewis house after checkout this Friday"',
      'Text "Mark the Vestal property as clean" — status updates instantly',
      'Text "Urgent leaking pipe at Beach House" — AI creates a ticket and contacts your plumber',
      'All AI changes are logged with full history — never worry about mistakes',
    ],
    action: { label: 'Open Dashboard →', href: '/dashboard' },
    tip: 'Tip: The AI learns your property names — even partial names and addresses work.',
  },
]

export default async function WelcomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let firstName = 'there'
  if (user) {
    const fullName = user.user_metadata?.full_name as string | undefined
    if (fullName) firstName = fullName.split(' ')[0]
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
