import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const steps = [
  {
    number: 1,
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    color: 'from-violet-600 to-violet-400',
    title: 'Add your first property',
    description: 'Start by adding a property — your Airbnb, VRBO, or any rental unit. Give it a name, address, and any notes you need.',
    bullets: [
      'Enter property name and address',
      'Add internal notes and AI instructions (used to auto-fill tickets)',
      'Set a custom checklist for cleaners or staff',
    ],
    action: { label: 'Add Your First Property →', href: '/properties/new' },
    tip: 'Tip: The onboarding wizard walks you through every detail step by step.',
  },
  {
    number: 2,
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    color: 'from-teal-600 to-teal-400',
    title: 'Add contacts for each property',
    description: 'Store cleaners, plumbers, electricians, and property managers directly on each property — so your whole team always knows who to call.',
    bullets: [
      'Primary contact (property manager, owner)',
      'Service contacts — add as many as you need',
      'Assign roles: cleaner, plumber, electrician, HVAC, pest control, and more',
    ],
    action: { label: 'Go to Properties →', href: '/properties' },
    tip: 'Tip: Open a property → Contacts tab to add and manage contacts.',
  },
  {
    number: 3,
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    color: 'from-amber-600 to-amber-400',
    title: 'Build property checklists',
    description: 'Create custom checklists for each property — perfect for cleaners, maintenance staff, or guest turnover. Share as a link, no app needed.',
    bullets: [
      'Add checklist items specific to each property',
      'Reorder by dragging',
      'Share via auto-generated guest link — guests can report issues directly',
    ],
    action: { label: 'Go to Properties →', href: '/properties' },
    tip: 'Tip: Open a property → Checklist tab to build and edit your list.',
  },
  {
    number: 4,
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    color: 'from-emerald-600 to-emerald-400',
    title: 'Track guest stays',
    description: 'Log every check-in and check-out. SmartSum AI auto-generates a unique checklist link for each stay — send it to your guest before arrival.',
    bullets: [
      'Record guest name, check-in and check-out dates',
      'Get a sharable checklist link for the stay',
      'Guests can submit reports (issues, notes) without an account',
    ],
    action: { label: 'Log a Stay →', href: '/stays/new' },
    tip: 'Tip: Guest reports automatically create service tickets so nothing falls through the cracks.',
  },
  {
    number: 5,
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    color: 'from-rose-600 to-rose-400',
    title: 'Manage service tickets',
    description: 'Create tickets for anything that needs attention — maintenance, cleaning, restocking. Assign priorities and track resolution from start to finish.',
    bullets: [
      'Ticket categories: maintenance, cleaning, supplies, other',
      'Priority levels: urgent, high, medium, low',
      'Add comments, update status, view full audit trail',
    ],
    action: { label: 'Create a Ticket →', href: '/tickets/new' },
    tip: 'Tip: Your team gets email notifications automatically when a ticket is created or updated.',
  },
  {
    number: 6,
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    color: 'from-blue-600 to-blue-400',
    title: 'Invite your team',
    description: 'Bring in your cleaners, co-hosts, and maintenance crew. Control which properties each person can access with role-based permissions.',
    bullets: [
      'Generate a shareable invite link from Settings',
      'Assign roles: owner, admin, or member',
      'Set property-level access per team member',
    ],
    action: { label: 'Go to Settings →', href: '/settings' },
    tip: 'Tip: Team members get their own login — they only see what you allow.',
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
          <h1 className="text-3xl font-bold text-white">Welcome, {firstName}! 👋</h1>
          <p className="text-[#6480a0] mt-2 text-base">
            You&apos;re all set. Here&apos;s how to get the most out of SmartSum AI — follow these steps and you&apos;ll be up and running in minutes.
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
      <div className="space-y-6">
        {steps.map(step => (
          <div key={step.number}
            className="relative rounded-2xl border border-[#2a3d58] bg-[#0f1829] overflow-hidden
                       hover:border-[#3a5070] transition-colors">
            {/* Step number accent bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${step.color}`} />

            <div className="p-6 pl-8">
              <div className="flex items-start gap-5">
                {/* Icon */}
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
          Pricing is simple — $10/property/month, billed monthly.
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
