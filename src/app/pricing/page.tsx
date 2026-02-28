import MarketingNav from '@/components/marketing/MarketingNav'
import Link from 'next/link'

export const metadata = {
  title: 'Pricing — Smart Sumai',
  description: 'Simple, transparent pricing for property managers. $50/month includes 3 properties. $10/month per additional property.',
}

const features = [
  { category: 'Properties', items: ['Unlimited property profiles', 'Custom checklists per property', 'Property status tracking (clean / needs service / occupied)', 'AI-powered notes & instructions', 'Property contacts & service provider directory'] },
  { category: 'Guests & Stays', items: ['Unlimited stay tracking', 'Auto-generated guest checklist links', 'Guest report submission (no app required)', 'Check-in / check-out logging'] },
  { category: 'Work Orders', items: ['Unlimited work orders', 'Priority levels (urgent / high / medium / low)', 'Categories: maintenance, cleaning, supplies, other', 'Comments, status updates & audit trail', 'AI auto-assigns best contact for each job'] },
  { category: 'Team', items: ['Unlimited team members', 'Invite by link', 'Role-based access (owner / admin / member)', 'Property-level permissions', 'Team activity log'] },
  { category: 'Notifications', items: ['Email alerts for new tickets', 'Status change notifications', 'Guest report alerts', 'Configurable notification recipients'] },
]

const faqs = [
  {
    q: 'Is Smart Sumai free right now?',
    a: 'Yes. During the alpha period, all accounts are completely free. No credit card required. Once we release version 1.0, paid plans will begin. Existing alpha testers will receive a 14-day grace period to add payment information before their access is affected.',
  },
  {
    q: 'How will billing work after launch?',
    a: 'Your $50/month plan will include up to 3 properties. Each additional property beyond 3 is $10/month. Billing is based on the number of properties owned by the account holder — not shared team members.',
  },
  {
    q: 'Can I manage multiple properties?',
    a: 'Absolutely. Smart Sumai is built for property managers with portfolios of any size. Your base plan covers 3 properties, and each additional one is just $10/month.',
  },
  {
    q: 'Can I invite my team?',
    a: 'Yes. You can invite unlimited team members (cleaners, maintenance staff, co-hosts) to your account and control exactly which properties they can access.',
  },
  {
    q: 'What payment methods will you accept?',
    a: 'We will accept all major credit and debit cards. Payments are processed securely via Stripe.',
  },
  {
    q: 'Will I lose my data after the alpha?',
    a: 'We intend to preserve all data through the transition to version 1.0. However, during the alpha period, features and data structures are subject to change, and there is a small possibility of data loss. We recommend not relying on Smart Sumai as your sole record-keeping system during this phase.',
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#07101e] text-white overflow-x-hidden">
      <MarketingNav />

      {/* ── ALPHA BANNER ────────────────────────────────────────────── */}
      <div className="pt-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="rounded-xl border border-violet-500/30 bg-violet-950/20 p-4 text-center">
            <div className="inline-block px-2.5 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/30
                            text-violet-300 text-xs font-semibold uppercase tracking-wider mb-2">
              Alpha
            </div>
            <p className="text-sm text-[#c0d4e8] leading-relaxed">
              Smart Sumai is currently in alpha. All accounts are <strong className="text-white">free</strong> during
              this period. Features and data structures are subject to change, and there is potential for data loss.
              Creating an account right now is experimental until we release version 1.0.
            </p>
          </div>
        </div>
      </div>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="pt-12 pb-16 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px]
                          bg-violet-600/15 blur-3xl rounded-full" />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Simple, honest pricing
          </h1>
          <p className="text-[#8aa0be] text-xl max-w-xl mx-auto">
            One plan. Every feature included. Free during alpha — paid plans begin at version 1.0.
          </p>
        </div>
      </section>

      {/* ── PRICING CARD ─────────────────────────────────────────────── */}
      <section className="pb-24">
        <div className="max-w-lg mx-auto px-4 sm:px-6">
          <div className="relative rounded-2xl border border-violet-500/40 bg-gradient-to-b from-violet-950/40 to-[#0f1829]
                          p-8 shadow-2xl shadow-violet-900/20 overflow-hidden">
            {/* Top glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-violet-600/25 blur-2xl pointer-events-none" />

            <div className="relative text-center">
              <div className="inline-block px-3 py-1 rounded-full bg-teal-500/20 border border-teal-500/30
                              text-teal-300 text-sm font-medium mb-6">
                Free during alpha
              </div>

              <div className="mb-2 flex items-end justify-center gap-1">
                <span className="text-2xl text-[#8aa0be] font-medium mb-2">$</span>
                <span className="text-8xl font-extrabold text-white leading-none">50</span>
              </div>
              <p className="text-[#8aa0be] text-lg mb-1">per month after version 1.0 — includes 3 properties</p>
              <p className="text-teal-400 text-sm font-medium mb-1">+ $10 / month per additional property</p>
              <p className="text-[#4a6080] text-sm mb-8">No credit card required during alpha</p>

              <Link href="/auth/login?mode=signup"
                className="block w-full py-4 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500
                           text-white font-semibold text-lg hover:from-violet-500 hover:to-violet-400
                           transition-all shadow-xl shadow-violet-900/40 mb-3 text-center">
                Join the Alpha
              </Link>
              <Link href="/auth/login"
                className="block w-full py-3 rounded-xl border border-white/10 text-[#8aa0be] font-medium
                           hover:text-white hover:bg-white/5 transition-all text-center">
                Sign In to Existing Account
              </Link>
            </div>
          </div>

          {/* Example calculation */}
          <div className="mt-6 rounded-xl border border-white/5 bg-[#0f1829] p-5">
            <p className="text-sm font-semibold text-white mb-3">Example billing</p>
            {[
              { count: 1,  label: '1 property',    price: 50  },
              { count: 3,  label: '3 properties',  price: 50  },
              { count: 5,  label: '5 properties',  price: 70  },
              { count: 10, label: '10 properties', price: 120 },
              { count: 25, label: '25 properties', price: 270 },
            ].map(({ label, price }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-sm text-[#8aa0be]">{label}</span>
                <span className="text-sm font-semibold text-white">${price}/month</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ALL FEATURES ─────────────────────────────────────────────── */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Every feature, always included</h2>
            <p className="text-[#8aa0be]">No add-ons, no tiers, no surprises.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map(cat => (
              <div key={cat.category}>
                <h3 className="text-sm font-semibold uppercase tracking-widest text-violet-400 mb-4">
                  {cat.category}
                </h3>
                <ul className="space-y-2.5">
                  {cat.items.map(item => (
                    <li key={item} className="flex items-start gap-2.5">
                      <svg className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-[#c0d4e8]">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────── */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Frequently asked questions</h2>
          </div>
          <div className="space-y-6">
            {faqs.map(f => (
              <div key={f.q} className="rounded-xl border border-white/5 bg-[#0f1829] p-6">
                <h3 className="text-base font-semibold text-white mb-2">{f.q}</h3>
                <p className="text-sm text-[#6480a0] leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <section className="py-24 border-t border-white/5 text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4">Try it during the alpha</h2>
          <p className="text-[#8aa0be] mb-8">
            Full access, no credit card. Paid plans begin after version 1.0 — alpha testers
            get a 14-day grace period to decide.
          </p>
          <Link href="/auth/login?mode=signup"
            className="inline-block px-10 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500
                       text-white font-semibold text-lg hover:from-violet-500 hover:to-violet-400
                       transition-all shadow-2xl shadow-violet-900/50">
            Join the Alpha
          </Link>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row
                        items-center justify-between gap-4 text-sm text-[#4a6080]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center
                            bg-gradient-to-br from-violet-500 to-teal-400">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-bold text-white">Smart <span className="text-teal-400">Sumai</span></span>
          </div>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/auth/login" className="hover:text-white transition-colors">Sign In</Link>
            <Link href="/auth/login?mode=signup" className="hover:text-white transition-colors">Sign Up</Link>
          </div>
          <p>© {new Date().getFullYear()} Smart Sumai. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
