import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const FEATURES = [
  {
    title: 'Properties',
    description:
      'A guided setup wizard captures every detail — address, contacts, service providers, and checklists — so nothing lives in someone\'s head.',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    title: 'Guest stays',
    description:
      'Schedule stays, track arrivals and departures, and keep every visit tied to its property.',
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  {
    title: 'Service tickets',
    description:
      'Log issues, assign work, and follow every request from report to resolution with comments and status history.',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  },
  {
    title: 'Guest access',
    description:
      'Share a link so guests can work through arrival checklists and report problems — no account needed.',
    icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
  },
  {
    title: 'Team & sharing',
    description:
      'Invite teammates to your organization and control who can manage or view each property.',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  },
  {
    title: 'Audit trail',
    description:
      'Every change is recorded automatically, so you always know who did what and when.',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  },
]

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const cta = user
    ? { href: '/dashboard', label: 'Open dashboard' }
    : { href: '/auth/login', label: 'Sign in' }

  return (
    <div className="min-h-screen bg-[#0f1829] text-white relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        {/* Header */}
        <header className="flex items-center justify-between py-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 shadow-lg shadow-violet-900/60">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <span className="font-semibold text-lg">AW Property Management</span>
          </div>
          <Link href={cta.href} className="btn-primary">
            {cta.label}
          </Link>
        </header>

        {/* Hero */}
        <section className="text-center pt-20 pb-24">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
            Property operations,
            <br />
            <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              all in one place.
            </span>
          </h1>
          <p className="mt-6 text-lg text-[#94a3b8] max-w-2xl mx-auto">
            Smart Sumai is the operations hub for AW Property Management —
            every property, guest stay, and service request tracked from a
            single dashboard.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href={cta.href} className="btn-primary px-6 py-3 text-base">
              {cta.label}
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pb-24">
          {FEATURES.map(f => (
            <div key={f.title} className="card p-6">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-violet-600/15 border border-violet-500/20 mb-4">
                <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={f.icon} />
                </svg>
              </div>
              <h2 className="font-semibold mb-1.5">{f.title}</h2>
              <p className="text-sm text-[#94a3b8] leading-relaxed">{f.description}</p>
            </div>
          ))}
        </section>

        {/* Footer */}
        <footer className="border-t border-[#2a3d58] py-8 text-center text-sm text-[#60608a]">
          © {new Date().getFullYear()} AW Property Management · smartsumai.com
        </footer>
      </div>
    </div>
  )
}
