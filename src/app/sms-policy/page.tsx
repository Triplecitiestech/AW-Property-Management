import Link from 'next/link'

export const metadata = { title: 'SMS Consent & Privacy Policy — Smart Sumai' }

export default function SmsPolicyPage() {
  const updated = 'February 27, 2026'
  const twilioPhone = process.env.NEXT_PUBLIC_TWILIO_PHONE ?? '(888) 621-9169'

  return (
    <div className="min-h-screen bg-[#0f1829] text-[#cbd5e1]">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-10">
          <Link href="/" className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 text-sm mb-8 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Smart Sumai
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">SMS Consent &amp; Privacy Policy</h1>
          <p className="text-[#6480a0] text-sm">Last updated: {updated}</p>
        </div>

        {/* Consent Summary Box */}
        <div className="mb-8 p-5 rounded-xl border border-violet-500/30 bg-violet-500/10">
          <h2 className="text-base font-semibold text-violet-300 mb-3">Summary — What You&apos;re Agreeing To</h2>
          <ul className="space-y-2 text-sm text-[#cbd5e1]">
            <li className="flex gap-2"><span className="text-teal-400 flex-shrink-0">✓</span>You consent to receive automated text messages from Smart Sumai at the phone number you provide</li>
            <li className="flex gap-2"><span className="text-teal-400 flex-shrink-0">✓</span>Messages relate to your property management activity (work orders, AI responses, updates)</li>
            <li className="flex gap-2"><span className="text-teal-400 flex-shrink-0">✓</span>Message and data rates may apply</li>
            <li className="flex gap-2"><span className="text-teal-400 flex-shrink-0">✓</span>You can opt out at any time by texting STOP</li>
            <li className="flex gap-2"><span className="text-teal-400 flex-shrink-0">✓</span>We do not sell or share your phone number for marketing purposes</li>
          </ul>
        </div>

        <div className="space-y-8 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Who We Are</h2>
            <p>
              Smart Sumai is an AI-powered property management platform operated by Triplecitiestech LLC.
              Our SMS service is powered by Twilio and allows users to interact with their AI property manager
              via text message. Our SMS number is <strong className="text-white">{twilioPhone}</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. How We Collect Your Phone Number</h2>
            <p className="mb-2">
              We collect your mobile phone number when you:
            </p>
            <ul className="list-disc list-inside space-y-1 text-[#94a3b8] ml-2">
              <li>Create an account on Smart Sumai and provide your phone number during sign-up</li>
              <li>Add or update your phone number in your profile settings</li>
            </ul>
            <p className="mt-2">
              By providing your phone number and checking the consent box during sign-up (or saving your phone
              number in your profile), you expressly consent to receive SMS messages from Smart Sumai.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Types of Messages We Send</h2>
            <p className="mb-2">We send the following types of automated text messages:</p>
            <ul className="list-disc list-inside space-y-1 text-[#94a3b8] ml-2">
              <li><strong className="text-[#cbd5e1]">AI Responses:</strong> Replies to messages you send to your AI property manager</li>
              <li><strong className="text-[#cbd5e1]">Work Order Confirmations:</strong> Notifications when work orders are created or updated via SMS</li>
              <li><strong className="text-[#cbd5e1]">Status Updates:</strong> Property status change confirmations when requested via SMS</li>
              <li><strong className="text-[#cbd5e1]">Help Messages:</strong> Replies to HELP commands with instructions</li>
            </ul>
            <p className="mt-2 text-[#94a3b8]">
              Message frequency varies based on your activity. You control the frequency by how often you text the AI.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Message and Data Rates</h2>
            <p>
              Standard message and data rates may apply from your mobile carrier. Smart Sumai does not charge
              separately for SMS messages, but your carrier&apos;s standard rates apply. Check with your carrier if
              you are unsure about your plan.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. How to Opt Out</h2>
            <p className="mb-2">
              You can opt out of SMS messages at any time using any of the following methods:
            </p>
            <ul className="list-disc list-inside space-y-1 text-[#94a3b8] ml-2">
              <li>Text <strong className="text-white">STOP</strong> to {twilioPhone} — you will receive a confirmation and no further messages will be sent</li>
              <li>Remove your phone number from your profile at <strong className="text-white">Settings → Profile</strong> in the app</li>
              <li>Contact us at <a href="mailto:support@smartsumai.com" className="text-violet-400 hover:text-violet-300 underline">support@smartsumai.com</a></li>
            </ul>
            <p className="mt-2">
              After opting out, you will no longer receive AI responses via SMS. You can still use the web chat
              interface at <strong className="text-white">smartsumai.com</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. How to Get Help</h2>
            <p>
              For help with SMS features, text <strong className="text-white">HELP</strong> to {twilioPhone}.
              You can also email us at{' '}
              <a href="mailto:support@smartsumai.com" className="text-violet-400 hover:text-violet-300 underline">
                support@smartsumai.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. How We Use Your Phone Number</h2>
            <p className="mb-2">Your phone number is used to:</p>
            <ul className="list-disc list-inside space-y-1 text-[#94a3b8] ml-2">
              <li>Identify you when you text the AI property manager</li>
              <li>Send AI-generated responses to your SMS messages</li>
              <li>Deliver work order confirmations and status updates</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Sharing of Your Phone Number</h2>
            <p className="mb-2">
              <strong className="text-white">We do not sell, rent, or share your phone number for marketing purposes.</strong>
            </p>
            <p className="mb-2">We may share your phone number only with:</p>
            <ul className="list-disc list-inside space-y-1 text-[#94a3b8] ml-2">
              <li><strong className="text-[#cbd5e1]">Twilio:</strong> Our SMS messaging provider, to deliver messages to you</li>
              <li><strong className="text-[#cbd5e1]">Law enforcement:</strong> When required by applicable law or legal process</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Data Retention</h2>
            <p>
              Your phone number is stored in your account profile and retained as long as your account is active.
              When you remove your phone number from your profile or delete your account, we will remove it from
              our active systems. Backup retention may extend up to 90 days per our standard data retention policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">10. TCPA Compliance</h2>
            <p>
              Our SMS messaging practices comply with the Telephone Consumer Protection Act (TCPA) and all
              applicable regulations. We obtain express written consent before sending automated messages,
              honor all opt-out requests promptly (within one business day), and maintain records of consent.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">11. Changes to This Policy</h2>
            <p>
              We may update this policy from time to time. We will notify you of significant changes via email.
              Your continued use of SMS features after changes take effect constitutes acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">12. Contact Us</h2>
            <p>
              For questions about this SMS policy or to manage your SMS preferences, contact us at:{' '}
              <a href="mailto:support@smartsumai.com" className="text-violet-400 hover:text-violet-300 underline">
                support@smartsumai.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-[#2a3d58] text-center text-xs text-[#6480a0]">
          <p>Smart Sumai · AI-Powered Property Management · Triplecitiestech LLC</p>
          <p className="mt-1">
            <Link href="/terms" className="text-violet-400 hover:text-violet-300">Terms of Use</Link>
            {' '}·{' '}
            <Link href="/auth/login" className="text-violet-400 hover:text-violet-300">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
