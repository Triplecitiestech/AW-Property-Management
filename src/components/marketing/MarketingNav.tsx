'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function MarketingNav() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-[#0a1020]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                            bg-gradient-to-br from-violet-500 to-teal-400 shadow-lg shadow-violet-900/40
                            group-hover:shadow-violet-600/50 transition-shadow">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none">
                <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 7l1 2.5L15.5 10.5 13 11.5 12 14 11 11.5 8.5 10.5 11 9.5z" fill="white" opacity="0.9"/>
              </svg>
            </div>
            <span className="font-bold text-white text-lg tracking-tight">Smart <span className="text-teal-400">Sumai</span></span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/pricing" className="text-sm text-[#8aa0be] hover:text-white transition-colors">Pricing</Link>
            <Link href="/auth/login" className="text-sm text-[#8aa0be] hover:text-white transition-colors">Sign In</Link>
            <Link href="/auth/login?mode=signup"
              className="text-sm px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-violet-500
                         text-white font-medium hover:from-violet-500 hover:to-violet-400 transition-all shadow-lg shadow-violet-900/30">
              Get Started Free
            </Link>
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-[#8aa0be] hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/5 bg-[#0a1020] px-4 py-4 space-y-2">
          <Link href="/pricing" onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm text-[#8aa0be] hover:text-white hover:bg-white/5 transition-colors">
            Pricing
          </Link>
          <Link href="/auth/login" onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm text-[#8aa0be] hover:text-white hover:bg-white/5 transition-colors">
            Sign In
          </Link>
          <Link href="/auth/login?mode=signup" onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm bg-violet-600 text-white font-medium hover:bg-violet-500 transition-colors text-center mt-2">
            Get Started Free
          </Link>
        </div>
      )}
    </header>
  )
}
