'use client'

import { useState, useEffect } from 'react'

export default function BillingPage() {
  const [loading, setLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [propCount, setPropCount] = useState<number | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('success')) setMessage('Subscription activated! Thank you.')
    if (params.get('canceled')) setMessage('Checkout was canceled.')
    // Fetch property count for pricing
    fetch('/api/config-check').then(r => r.json()).then(d => {
      // We just use this as a ping — property count fetched separately
    }).catch(() => {})
  }, [])

  async function handleCheckout() {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: Math.max(propCount ?? 1, 1) }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setMessage(data.error ?? 'Failed to start checkout')
    } finally {
      setLoading(false)
    }
  }

  async function handlePortal() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setMessage(data.error ?? 'No active subscription found')
    } finally {
      setPortalLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Billing</h1>
        <p className="text-[#6480a0] text-sm mt-1">Manage your Smart Sumai subscription</p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-sm border ${message.includes('activated') || message.includes('Thank')
          ? 'bg-emerald-950/60 border-emerald-800/50 text-emerald-300'
          : 'bg-amber-950/60 border-amber-800/50 text-amber-300'}`}>
          {message}
        </div>
      )}

      {/* Plan Card */}
      <div className="card p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-white">Property Management Plan</h2>
            <p className="text-[#6480a0] text-sm mt-1">Everything you need to manage your properties</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-white">$50</p>
            <p className="text-xs text-[#6480a0]">/ month — includes 3 properties</p>
            <p className="text-xs text-teal-400 mt-0.5">+$10/mo per additional property</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-2 mb-6">
          {[
            'Unlimited stays & guest logs',
            'Unlimited service tickets',
            'AI SMS property manager',
            'In-app AI chat assistant',
            'Custom checklists per property',
            'Team collaboration & invites',
            'Email notifications',
            'Full audit log & history',
          ].map(f => (
            <div key={f} className="flex items-center gap-2">
              <svg className="w-4 h-4 text-teal-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm text-[#94a3b8]">{f}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={handleCheckout} disabled={loading}
                  className="btn-primary flex-1 justify-center">
            {loading ? 'Redirecting…' : 'Subscribe Now'}
          </button>
          <button onClick={handlePortal} disabled={portalLoading}
                  className="btn-secondary flex-1 justify-center">
            {portalLoading ? 'Loading…' : 'Manage Billing'}
          </button>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="card p-5">
        <h3 className="font-semibold text-sm text-white mb-3">Accepted Payment Methods</h3>
        <div className="flex flex-wrap gap-2">
          {['Visa / Mastercard / Amex', 'Google Pay', 'Apple Pay', 'ACH Bank Transfer', 'PayPal'].map(m => (
            <span key={m} className="text-xs px-3 py-1.5 rounded-full bg-[#1a2436] border border-[#2a3d58] text-[#94a3b8]">
              {m}
            </span>
          ))}
        </div>
        <p className="text-xs text-[#6480a0] mt-3">Payments processed securely by Stripe. Cancel anytime.</p>
      </div>

      {/* Support */}
      <div className="card p-5 text-center">
        <p className="text-sm text-[#6480a0]">Billing questions? Contact us at{' '}
          <a href="mailto:support@smartsumai.com" className="text-teal-400 hover:text-teal-300">support@smartsumai.com</a>
        </p>
      </div>
    </div>
  )
}
