import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MarketingNav from '@/components/marketing/MarketingNav'
import Link from 'next/link'

export const metadata = {
  title: 'Smart Sumai — Property Management Made Smart',
  description: 'AI-powered property management for short-term rental hosts. Manage properties, guests, tickets, and teams — all in one place. $10/property/month.',
}

export default async function Home() {
  // Redirect logged-in users
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-[#07101e] text-white overflow-x-hidden">
      <MarketingNav />

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative min-h-[100vh] flex items-center pt-16">
        {/* Background glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px]
                          bg-gradient-radial from-violet-600/20 via-violet-900/5 to-transparent blur-3xl" />
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px]
                          bg-teal-600/10 rounded-full blur-3xl" />
          {/* Subtle grid */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px'}} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                          border border-violet-500/30 bg-violet-500/10 text-violet-300 text-sm font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            Now live — $10 per property/month
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-[1.05]">
            Property management,{' '}
            <span className="bg-gradient-to-r from-violet-400 via-violet-300 to-teal-400 bg-clip-text text-transparent">
              powered by AI
            </span>
          </h1>
          <p className="text-xl text-[#8aa0be] max-w-2xl mx-auto mb-10 leading-relaxed">
            Run your short-term rentals without the chaos. Smart Sumai centralizes your properties,
            guest stays, service tickets, and team — in one beautifully simple dashboard.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/login?mode=signup"
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500
                         text-white font-semibold text-lg hover:from-violet-500 hover:to-violet-400
                         transition-all shadow-2xl shadow-violet-900/50 hover:shadow-violet-700/40">
              Start Free — No credit card needed
            </Link>
            <Link href="/pricing"
              className="px-8 py-4 rounded-xl border border-white/10 bg-white/5
                         text-white font-semibold text-lg hover:bg-white/10 transition-all">
              See Pricing →
            </Link>
          </div>

          {/* Hero screenshot / mockup placeholder */}
          <div className="mt-20 relative max-w-5xl mx-auto">
            <div className="rounded-2xl border border-white/10 bg-[#0f1829] shadow-2xl shadow-black/60 overflow-hidden">
              {/* Fake browser bar */}
              <div className="flex items-center gap-2 px-4 py-3 bg-[#0c1220] border-b border-white/5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
                <div className="flex-1 mx-4 h-6 rounded-md bg-white/5 flex items-center px-3">
                  <span className="text-xs text-[#6480a0]">smartsumai.com/dashboard</span>
                </div>
              </div>
              {/* Dashboard preview */}
              <div className="p-6">
                <div className="flex gap-4 mb-6">
                  {[
                    { label: 'Properties', value: '12', color: 'text-violet-400' },
                    { label: 'Active Stays', value: '4', color: 'text-teal-400' },
                    { label: 'Open Tickets', value: '2', color: 'text-amber-400' },
                    { label: 'Team Members', value: '5', color: 'text-emerald-400' },
                  ].map(s => (
                    <div key={s.label} className="flex-1 rounded-xl bg-[#1a2436] border border-[#2a3d58] p-4">
                      <p className="text-xs text-[#6480a0] font-medium">{s.label}</p>
                      <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-[#1a2436] border border-[#2a3d58] p-4 space-y-3">
                    <p className="text-sm font-semibold text-white">Recent Properties</p>
                    {['Lakeside Cottage', 'Downtown Loft', 'Beach House A'].map(p => (
                      <div key={p} className="flex items-center justify-between">
                        <span className="text-sm text-[#8aa0be]">{p}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400 border border-emerald-800/40">Clean</span>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl bg-[#1a2436] border border-[#2a3d58] p-4 space-y-3">
                    <p className="text-sm font-semibold text-white">Open Tickets</p>
                    {[
                      { title: 'Fix kitchen faucet', priority: 'high' },
                      { title: 'Restock linens', priority: 'medium' },
                    ].map(t => (
                      <div key={t.title} className="flex items-center justify-between">
                        <span className="text-sm text-[#8aa0be]">{t.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border
                          ${t.priority === 'high'
                            ? 'bg-red-900/40 text-red-400 border-red-800/40'
                            : 'bg-amber-900/40 text-amber-400 border-amber-800/40'}`}>
                          {t.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────── */}
      <section className="py-24 relative" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything you need to run your rentals</h2>
            <p className="text-[#8aa0be] text-lg max-w-xl mx-auto">
              One platform for properties, guests, maintenance, and your whole team.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                ),
                color: 'from-violet-600 to-violet-400',
                glow: 'group-hover:shadow-violet-900/40',
                title: 'Property Management',
                desc: 'Track status, notes, AI instructions, and custom checklists for every property. Know exactly what needs attention at a glance.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                ),
                color: 'from-teal-600 to-teal-400',
                glow: 'group-hover:shadow-teal-900/40',
                title: 'Guest Stay Tracking',
                desc: 'Log check-ins and check-outs. Automatically generate guest checklist links and collect post-stay reports — no app required.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                ),
                color: 'from-amber-600 to-amber-400',
                glow: 'group-hover:shadow-amber-900/40',
                title: 'Service Tickets',
                desc: 'Create, assign, and track maintenance, cleaning, and supply requests with priority levels, comments, and full audit history.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
                color: 'from-emerald-600 to-emerald-400',
                glow: 'group-hover:shadow-emerald-900/40',
                title: 'Team Collaboration',
                desc: 'Invite your cleaning crew, maintenance staff, and co-hosts. Assign roles, control property access, and work together seamlessly.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                ),
                color: 'from-blue-600 to-blue-400',
                glow: 'group-hover:shadow-blue-900/40',
                title: 'Email Notifications',
                desc: 'Get instant alerts for new tickets, guest reports, and status changes. Your whole team stays in the loop automatically.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
                color: 'from-rose-600 to-rose-400',
                glow: 'group-hover:shadow-rose-900/40',
                title: 'Audit & Activity Log',
                desc: 'Full history of every change — who updated what and when. Stay accountable and troubleshoot issues in seconds.',
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

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connector lines */}
            <div className="hidden md:block absolute top-8 left-1/3 right-1/3 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />

            {[
              {
                step: '1',
                title: 'Add your properties',
                desc: 'Enter property details, add contacts (cleaners, plumbers, managers), and set up custom checklists — takes under 5 minutes per property.',
                color: 'bg-violet-600',
              },
              {
                step: '2',
                title: 'Invite your team',
                desc: 'Share an invite link with your cleaning crew and maintenance team. Control who sees which properties with role-based access.',
                color: 'bg-teal-600',
              },
              {
                step: '3',
                title: 'Manage from anywhere',
                desc: 'Track live property status, log guest stays, file tickets, and get notified — all from any device, anywhere.',
                color: 'bg-violet-500',
              },
            ].map(s => (
              <div key={s.step} className="text-center">
                <div className={`w-16 h-16 rounded-2xl ${s.color} flex items-center justify-center
                                 text-2xl font-bold text-white mx-auto mb-5 shadow-xl`}>
                  {s.step}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{s.title}</h3>
                <p className="text-[#6480a0] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING PREVIEW ──────────────────────────────────────────── */}
      <section className="py-24 border-t border-white/5" id="pricing">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
          <p className="text-[#8aa0be] text-lg mb-12">Pay only for what you use. No hidden fees.</p>

          <div className="relative rounded-2xl border border-violet-500/30 bg-gradient-to-b from-violet-950/30 to-[#0f1829]
                          p-8 sm:p-12 shadow-2xl shadow-violet-900/20 overflow-hidden">
            {/* Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-violet-600/20 blur-3xl pointer-events-none" />

            <div className="relative">
              <div className="inline-block px-3 py-1 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-300 text-sm font-medium mb-6">
                One simple plan
              </div>
              <div className="mb-8">
                <div className="flex items-end justify-center gap-1">
                  <span className="text-xl text-[#8aa0be] font-medium mb-2">$</span>
                  <span className="text-7xl font-extrabold text-white">10</span>
                  <span className="text-xl text-[#8aa0be] font-medium mb-2">/property/mo</span>
                </div>
                <p className="text-[#8aa0be] mt-2">Billed monthly · Cancel anytime</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-left mb-10 max-w-lg mx-auto">
                {[
                  'Unlimited stays & guest logs',
                  'Unlimited service tickets',
                  'Custom checklists per property',
                  'Property contacts & roles',
                  'Team collaboration & invites',
                  'Email notifications',
                  'Full audit log & history',
                  'AI-powered property notes',
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
            Ready to simplify your<br />property operations?
          </h2>
          <p className="text-[#8aa0be] text-lg mb-10">
            Join property managers who use Smart Sumai to save hours every week.
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
