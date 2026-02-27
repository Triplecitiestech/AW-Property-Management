import { redirect } from 'next/navigation'
import MarketingNav from '@/components/marketing/MarketingNav'
import Link from 'next/link'

export const metadata = {
  title: 'Smart Sumai — AI Property Manager for Short-Term Rentals',
  description: 'Smart Sumai is your AI property manager. Text it to create work orders, schedule cleanings, track guests, and manage your team — all from any phone. $50/month includes 3 properties.',
  openGraph: {
    title: 'Smart Sumai — AI Property Manager for Short-Term Rentals',
    description: 'Text in plain English to create work orders, schedule stays, manage contacts, and check property status. Your AI handles the details so you can focus on what matters.',
    url: 'https://aw-property-management.vercel.app',
    siteName: 'Smart Sumai',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Smart Sumai — AI Property Manager for Short-Term Rentals',
    description: 'Your AI property manager. Text it to manage your properties from anywhere. $50/month includes 3 properties.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; next?: string }>
}) {
  const params = await searchParams

  if (params.code) {
    const qs = new URLSearchParams({ code: params.code, ...(params.next ? { next: params.next } : {}) })
    redirect(`/auth/callback?${qs}`)
  }

  return (
    <div className="min-h-screen bg-[#07101e] text-white overflow-x-hidden">
      <MarketingNav />

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative min-h-[100vh] flex items-center pt-16">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[600px]
                          bg-gradient-radial from-violet-600/20 via-violet-900/5 to-transparent blur-3xl" />
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px]
                          bg-teal-600/10 rounded-full blur-3xl" />
          <div className="absolute inset-0 opacity-[0.03]"
            style={{backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px'}} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Copy */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                              bg-violet-500/15 border border-violet-500/30 text-violet-300 text-sm font-medium mb-6">
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                AI Property Manager
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 leading-[1.05]">
                Your AI runs<br />your properties.{' '}
                <span className="bg-gradient-to-r from-violet-400 via-violet-300 to-teal-400 bg-clip-text text-transparent">
                  You just own them.
                </span>
              </h1>
              <p className="text-xl text-[#8aa0be] mb-4 leading-relaxed">
                Smart Sumai is an AI property manager you text like a person. It creates work orders,
                schedules cleanings, contacts your vendors, tracks guest stays, and updates property
                status — automatically, from any phone.
              </p>
              <p className="text-base text-[#6480a0] mb-10 leading-relaxed">
                No app for guests. No training for your team. Just text in plain English and your AI handles the rest.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/auth/login?mode=signup"
                  className="px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500
                             text-white font-semibold text-lg hover:from-violet-500 hover:to-violet-400
                             transition-all shadow-2xl shadow-violet-900/50 hover:shadow-violet-700/40 text-center">
                  Start Free — No credit card needed
                </Link>
                <Link href="/pricing"
                  className="px-8 py-4 rounded-xl border border-white/10 bg-white/5
                             text-white font-semibold text-lg hover:bg-white/10 transition-all text-center">
                  See Pricing →
                </Link>
              </div>
            </div>

            {/* Right: AI Chat Demo */}
            <div className="relative">
              <div className="absolute -inset-4 bg-violet-600/10 rounded-3xl blur-2xl" />
              <div className="relative rounded-2xl border border-white/10 bg-[#0c1525] shadow-2xl shadow-black/60 overflow-hidden">
                {/* Phone header */}
                <div className="flex items-center gap-3 px-5 py-4 bg-[#0f1829] border-b border-white/5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-teal-400
                                  flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Smart Sumai AI</p>
                    <p className="text-xs text-teal-400">● Online — SMS &amp; Web Chat</p>
                  </div>
                </div>
                {/* Conversation */}
                <div className="p-5 space-y-4 text-sm">
                  {[
                    { from: 'user', text: 'Leaking faucet under the kitchen sink at Beach House — pretty urgent' },
                    { from: 'ai',   text: 'Urgent plumbing work order created at Beach House. Mike\'s Plumbing has been notified with full details.' },
                    { from: 'user', text: 'Schedule a cleaning after the guests check out Friday' },
                    { from: 'ai',   text: 'Cleaning work order created for Saturday morning at Beach House. Sarah (cleaner) has been notified.' },
                    { from: 'user', text: 'Who\'s checking in next week?' },
                    { from: 'ai',   text: 'Jake Miller at Beach House (Fri Jun 14) and Sarah Chen at Lake Cabin (Mon Jun 17).' },
                    { from: 'user', text: 'Mark Lake Cabin as clean' },
                    { from: 'ai',   text: 'Lake Cabin → clean ✓' },
                  ].map((m, i) => (
                    <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                        ${m.from === 'user'
                          ? 'bg-violet-600/80 text-white rounded-br-md'
                          : 'bg-[#1a2d44] text-[#c0d4e8] rounded-bl-md border border-white/5'}`}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHAT IS SMART SUMAI ──────────────────────────────────────── */}
      <section className="py-20 border-t border-white/5 bg-gradient-to-b from-violet-950/10 to-transparent">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-5">
            One platform. Every part of property management.
          </h2>
          <p className="text-[#8aa0be] text-lg max-w-3xl mx-auto mb-12 leading-relaxed">
            Smart Sumai is a complete property management system with an AI at the center.
            Add your properties, your team, and your service vendors — then let the AI handle
            day-to-day operations while you keep full visibility from the dashboard.
          </p>
          <div className="grid sm:grid-cols-3 gap-6 text-left">
            {[
              {
                icon: '🏠',
                title: 'Property & Status Hub',
                desc: 'Track every property\'s real-time status — clean, needs cleaning, occupied, or needs maintenance. See open tickets, upcoming guests, and team activity all in one place.',
              },
              {
                icon: '🤖',
                title: 'AI That Does the Work',
                desc: 'Text your AI in plain English from anywhere. It creates tickets, contacts vendors, schedules stays, and updates statuses — no manual data entry, no app switching.',
              },
              {
                icon: '👥',
                title: 'Team & Vendor Network',
                desc: 'Invite your cleaning crew and co-hosts. Add your plumber, electrician, and landscaper as contacts. The AI automatically routes work orders to the right person and sends professional notification emails.',
              },
            ].map(c => (
              <div key={c.title} className="rounded-2xl border border-white/5 bg-[#0f1829] p-6">
                <div className="text-3xl mb-3">{c.icon}</div>
                <h3 className="text-base font-semibold text-white mb-2">{c.title}</h3>
                <p className="text-sm text-[#6480a0] leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI WORKFLOWS ─────────────────────────────────────────────── */}
      <section className="py-24 border-t border-white/5" id="ai">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                            bg-violet-500/15 border border-violet-500/30 text-violet-300 text-sm font-medium mb-4">
              AI Property Manager
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Text it. It handles it.
            </h2>
            <p className="text-[#8aa0be] text-lg max-w-2xl mx-auto">
              Your AI understands your properties, your team, and your vendors.
              It takes action — not just advice.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                color: 'border-red-500/20 bg-red-950/10',
                badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30',
                badge: 'Maintenance',
                example: '"Urgent — leaking pipe at the Monroe St property, under the kitchen sink"',
                outcome: 'Creates an urgent plumbing work order, identifies your plumber from your contacts, and sends them a detailed professional notification email — all instantly.',
                icon: '🔧',
              },
              {
                color: 'border-teal-500/20 bg-teal-950/10',
                badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
                badge: 'Cleaning',
                example: '"Schedule a cleaning at Beach House after the guests check out this Friday"',
                outcome: 'Creates a cleaning work order for the correct property, assigns your cleaner as the contact, sends them a notification, and marks the property as needs_cleaning.',
                icon: '🧹',
              },
              {
                color: 'border-violet-500/20 bg-violet-950/10',
                badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
                badge: 'Guest Stays',
                example: '"Add a stay for Jake Miller at the lake cabin, checking in July 5th through the 9th"',
                outcome: 'Logs the stay, generates a personalized guest welcome page with your property info, WiFi codes, and house rules — ready to share immediately.',
                icon: '🛎️',
              },
              {
                color: 'border-amber-500/20 bg-amber-950/10',
                badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                badge: 'Status Updates',
                example: '"Mark the Vestal property clean" or "Beach House needs groceries"',
                outcome: 'Updates property status instantly across your dashboard. Your whole team sees the current state in real time — no calls, no texts to the group chat.',
                icon: '✅',
              },
              {
                color: 'border-blue-500/20 bg-blue-950/10',
                badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
                badge: 'Work Order Updates',
                example: '"Close the spring cleaning ticket at the cabin — it\'s done" or "bump the faucet ticket to urgent"',
                outcome: 'Closes, updates priority, changes status, or reassigns work orders by partial name match. Full audit trail of every AI action with the ability to reverse mistakes.',
                icon: '📋',
              },
              {
                color: 'border-emerald-500/20 bg-emerald-950/10',
                badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
                badge: 'Portfolio Overview',
                example: '"What\'s the status of all my properties?" or "Who\'s checking in next week?"',
                outcome: 'Instant summary of every property status, upcoming guest arrivals, and open tickets across your entire portfolio — without opening the dashboard.',
                icon: '📊',
              },
            ].map(w => (
              <div key={w.badge} className={`rounded-2xl border ${w.color} p-6`}>
                <div className="flex items-start gap-4">
                  <div className="text-2xl flex-shrink-0">{w.icon}</div>
                  <div>
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border mb-3 ${w.badgeColor}`}>
                      {w.badge}
                    </span>
                    <p className="text-sm text-white font-medium italic mb-2">{w.example}</p>
                    <p className="text-sm text-[#8aa0be] leading-relaxed">{w.outcome}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-violet-500/15 bg-violet-950/15 p-6 text-center">
            <p className="text-[#8aa0be] text-sm">
              Available via <strong className="text-white">SMS text message</strong> and the <strong className="text-white">in-app chat bubble</strong> — conversations sync across both.
              Your AI knows your property names, your contacts, and your history.
            </p>
          </div>
        </div>
      </section>

      {/* ── FULL FEATURES ────────────────────────────────────────────── */}
      <section className="py-24 relative border-t border-white/5" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything built in. Nothing extra to buy.</h2>
            <p className="text-[#8aa0be] text-lg max-w-xl mx-auto">
              One platform covers your entire operation — from the AI to the guest page.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                ),
                color: 'from-violet-600 to-violet-400',
                glow: 'group-hover:shadow-violet-900/40',
                title: 'AI Property Manager',
                desc: 'Text your AI to create work orders, update property status, schedule stays, and manage contacts. Available via SMS and in-app chat. Responds in seconds, 24/7.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                ),
                color: 'from-teal-600 to-teal-400',
                glow: 'group-hover:shadow-teal-900/40',
                title: 'Property Dashboard',
                desc: 'Track every property\'s status (clean, needs cleaning, occupied, needs maintenance). Custom AI instructions, checklists, notes, and contacts per property.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                ),
                color: 'from-amber-600 to-amber-400',
                glow: 'group-hover:shadow-amber-900/40',
                title: 'Work Orders',
                desc: 'Create, assign, and track maintenance, cleaning, plumbing, HVAC, electrical, landscaping, and supply requests. AI auto-routes to the right contact with full audit history.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                ),
                color: 'from-emerald-600 to-emerald-400',
                glow: 'group-hover:shadow-emerald-900/40',
                title: 'Guest Stays',
                desc: 'Log check-ins with guest name and dates. Auto-generate a unique welcome page with WiFi, door codes, and house rules. Guests submit checkout reports — no account needed.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
                color: 'from-blue-600 to-blue-400',
                glow: 'group-hover:shadow-blue-900/40',
                title: 'Team & Contacts',
                desc: 'Invite co-hosts and staff with role-based access per property. Add external vendors (plumbers, cleaners, electricians) — the AI contacts them automatically when work orders are created.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                ),
                color: 'from-rose-600 to-pink-400',
                glow: 'group-hover:shadow-rose-900/40',
                title: 'Notifications & Audit Log',
                desc: 'Instant email alerts for new tickets, guest reports, and status changes. Every AI and manual action is logged with full history — and AI actions can be undone.',
              },
            ].map(f => (
              <div key={f.title}
                className="group relative rounded-2xl border border-white/5 bg-[#0f1829]/80 p-6
                           hover:border-white/10 hover:bg-[#111d30] transition-all cursor-default">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center
                                 mb-4 shadow-lg ${f.glow} transition-shadow`}>
                  <span className="text-white">{f.icon}</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-[#6480a0] text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section className="py-24 relative border-t border-white/5">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-950/10 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Up and running in minutes</h2>
            <p className="text-[#8aa0be] text-lg">No complex setup. No training required.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 relative">
            <div className="hidden md:block absolute top-8 left-[12.5%] right-[12.5%] h-px
                            bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
            {[
              {
                step: '1',
                title: 'Add your properties',
                desc: 'Enter property details, add WiFi/door codes, and set custom AI instructions and checklists. Under 5 minutes per property.',
                color: 'bg-violet-600',
              },
              {
                step: '2',
                title: 'Add team & contacts',
                desc: 'Add your cleaners, plumbers, and other vendors as contacts. Invite co-hosts and staff with role-based access.',
                color: 'bg-teal-600',
              },
              {
                step: '3',
                title: 'Text your AI',
                desc: 'Send your first message to your AI. File a ticket, schedule a cleaning, or ask what\'s open — in plain English.',
                color: 'bg-violet-500',
              },
              {
                step: '4',
                title: 'Manage from anywhere',
                desc: 'Your dashboard stays current. Track status, view open tickets, and see upcoming guests from any device.',
                color: 'bg-teal-500',
              },
            ].map(s => (
              <div key={s.step} className="text-center">
                <div className={`w-16 h-16 rounded-2xl ${s.color} flex items-center justify-center
                                 text-2xl font-bold text-white mx-auto mb-5 shadow-xl`}>
                  {s.step}
                </div>
                <h3 className="text-lg font-semibold text-white mb-3">{s.title}</h3>
                <p className="text-[#6480a0] text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING PREVIEW ──────────────────────────────────────────── */}
      <section className="py-24 border-t border-white/5" id="pricing">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
          <p className="text-[#8aa0be] text-lg mb-12">3 properties included. Pay as you grow.</p>

          <div className="relative rounded-2xl border border-violet-500/30 bg-gradient-to-b from-violet-950/30 to-[#0f1829]
                          p-8 sm:p-12 shadow-2xl shadow-violet-900/20 overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-violet-600/20 blur-3xl pointer-events-none" />

            <div className="relative">
              <div className="inline-block px-3 py-1 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-300 text-sm font-medium mb-6">
                Everything included
              </div>
              <div className="mb-2">
                <div className="flex flex-wrap items-end justify-center gap-1">
                  <span className="text-xl text-[#8aa0be] font-medium mb-2">$</span>
                  <span className="text-6xl sm:text-7xl font-extrabold text-white">50</span>
                  <span className="text-lg sm:text-xl text-[#8aa0be] font-medium mb-2">/month</span>
                </div>
                <p className="text-teal-400 font-medium mt-1">Includes 3 properties · +$10/month per additional property</p>
                <p className="text-[#8aa0be] text-sm mt-1">Billed monthly · Cancel anytime · No contracts</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-left my-10 max-w-lg mx-auto">
                {[
                  'AI SMS property manager',
                  'In-app AI chat assistant',
                  'Unlimited work orders',
                  'Unlimited stays & guest logs',
                  'Auto-generated guest welcome pages',
                  'Custom checklists per property',
                  'Property contacts & vendor directory',
                  'Team collaboration & invites',
                  'Email notifications',
                  'Full audit log & history',
                ].map(f => (
                  <div key={f} className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-teal-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-[#c0d4e8]">{f}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auth/login?mode=signup"
                  className="px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500
                             text-white font-semibold text-lg hover:from-violet-500 hover:to-violet-400
                             transition-all shadow-xl shadow-violet-900/40">
                  Get Started Free
                </Link>
                <Link href="/pricing"
                  className="px-8 py-4 rounded-xl border border-white/10 text-white font-semibold text-lg
                             hover:bg-white/5 transition-all">
                  See Full Pricing →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6
                          bg-gradient-to-br from-violet-500 to-teal-400 shadow-2xl shadow-violet-900/50">
            <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="none">
              <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 7l1 2.5L15.5 10.5 13 11.5 12 14 11 11.5 8.5 10.5 11 9.5z" fill="white" opacity="0.9"/>
            </svg>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Stop managing your properties.<br />Let AI manage them for you.
          </h2>
          <p className="text-[#8aa0be] text-lg mb-10">
            Set up in minutes. Your first text to the AI will feel like the future.
          </p>
          <Link href="/auth/login?mode=signup"
            className="inline-block px-10 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500
                       text-white font-semibold text-lg hover:from-violet-500 hover:to-violet-400
                       transition-all shadow-2xl shadow-violet-900/50">
            Create Your Free Account
          </Link>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center
                              bg-gradient-to-br from-violet-500 to-teal-400">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                  <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="font-bold text-white">Smart <span className="text-teal-400">Sumai</span></span>
            </div>
            <div className="flex items-center gap-6 text-sm text-[#4a6080]">
              <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
              <Link href="/faq" className="hover:text-white transition-colors">FAQ</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/auth/login" className="hover:text-white transition-colors">Sign In</Link>
              <Link href="/auth/login?mode=signup" className="hover:text-white transition-colors">Sign Up</Link>
            </div>
            <p className="text-sm text-[#4a6080]">
              © {new Date().getFullYear()} Smart Sumai. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
