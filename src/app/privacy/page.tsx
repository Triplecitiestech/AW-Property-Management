import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy — Smart Sumi',
  description: 'How Smart Sumi collects, uses, and protects your personal information.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#07101e] text-white">
      <div className="max-w-3xl mx-auto px-4 py-16 sm:px-6">
        <div className="mb-10">
          <Link href="/" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
            ← Back to Home
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-[#6480a0] text-sm mb-10">Last updated: February 27, 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-[#8aa0be]">

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Who We Are</h2>
            <p>
              Smart Sumi (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) is an AI-powered property management
              platform operated by Triple Cities Tech. Our registered address and contact email:
              {' '}<a href="mailto:support@smartsumai.com" className="text-violet-400 hover:text-violet-300">support@smartsumai.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Information We Collect</h2>
            <p className="mb-3">We collect the following categories of information:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-white">Account information:</strong> Name, email address, phone number, and password when you create an account.</li>
              <li><strong className="text-white">Property data:</strong> Property names, addresses, access codes, WiFi credentials, and notes you enter.</li>
              <li><strong className="text-white">Guest data:</strong> Guest names, check-in/check-out dates, and any notes or reports submitted through guest links.</li>
              <li><strong className="text-white">Contact data:</strong> Names, phone numbers, and email addresses of service contacts you add.</li>
              <li><strong className="text-white">Usage data:</strong> AI chat and SMS conversations, work orders, audit logs, and error logs used to operate and improve the service.</li>
              <li><strong className="text-white">Billing data:</strong> Subscription status managed by Stripe. We do not store credit card numbers or payment card data.</li>
              <li><strong className="text-white">Technical data:</strong> IP addresses (for guest checkout reports), browser type, and device information collected automatically.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide, operate, and improve the Smart Sumi platform</li>
              <li>Process AI requests via SMS and in-app chat (your messages are sent to Anthropic&rsquo;s Claude API)</li>
              <li>Send email notifications related to work orders, guest reports, and account activity</li>
              <li>Send SMS messages related to property management via Twilio (with your consent)</li>
              <li>Process payments via Stripe</li>
              <li>Detect and prevent fraud and abuse</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Third-Party Services</h2>
            <p className="mb-3">We share data with the following sub-processors to operate the service:</p>
            <div className="overflow-hidden rounded-xl border border-[#2a3d58]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2a3d58] bg-[#0f1829]">
                    <th className="text-left px-4 py-3 text-white font-semibold">Service</th>
                    <th className="text-left px-4 py-3 text-white font-semibold">Purpose</th>
                    <th className="text-left px-4 py-3 text-white font-semibold">Data Shared</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2d42]">
                  {[
                    ['Supabase', 'Database & authentication', 'All app data'],
                    ['Vercel', 'Hosting & infrastructure', 'Request logs'],
                    ['Anthropic (Claude)', 'AI responses', 'Chat messages, property context'],
                    ['Twilio', 'SMS messaging', 'Phone number, SMS content'],
                    ['Resend', 'Email notifications', 'Name, email, work order details'],
                    ['Stripe', 'Payment processing', 'Email, subscription status'],
                  ].map(([s, p, d]) => (
                    <tr key={s} className="bg-[#0d1627]">
                      <td className="px-4 py-3 text-white font-medium">{s}</td>
                      <td className="px-4 py-3">{p}</td>
                      <td className="px-4 py-3 text-[#6480a0]">{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Data Retention</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Account data is retained until you delete your account</li>
              <li>AI conversation history (SMS and web chat) is retained for 90 days</li>
              <li>Error logs are retained for 30 days</li>
              <li>Audit logs are retained for 1 year</li>
              <li>Guest checkout reports and IP addresses are retained for the duration of your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Your Rights</h2>
            <p className="mb-3">
              Depending on your location, you may have the following rights regarding your personal data:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-white">Access:</strong> Request a copy of the personal data we hold about you.</li>
              <li><strong className="text-white">Correction:</strong> Request that we correct inaccurate data.</li>
              <li><strong className="text-white">Deletion:</strong> Request that we delete your account and associated personal data.</li>
              <li><strong className="text-white">Portability:</strong> Request an export of your data in a machine-readable format.</li>
              <li><strong className="text-white">Opt-out of SMS:</strong> Reply STOP to any SMS message or contact us to stop SMS communications.</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, email{' '}
              <a href="mailto:support@smartsumai.com" className="text-violet-400 hover:text-violet-300">support@smartsumai.com</a>.
              We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Security</h2>
            <p>
              We implement industry-standard security measures including TLS encryption in transit,
              encryption at rest, row-level database security, and regular access reviews. Payments are
              processed exclusively by Stripe — we never store credit card numbers. Despite these measures,
              no system is completely secure. If you believe your account has been compromised, contact us
              immediately at{' '}
              <a href="mailto:support@smartsumai.com" className="text-violet-400 hover:text-violet-300">support@smartsumai.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Cookies</h2>
            <p>
              We use session cookies required for authentication (managed by Supabase Auth). We do not
              use advertising or tracking cookies. No third-party analytics scripts are loaded.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Children</h2>
            <p>
              Smart Sumi is not intended for use by individuals under the age of 18. We do not knowingly
              collect personal data from children.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify registered users by email
              of material changes. Continued use of the service after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">11. Contact Us</h2>
            <p>
              For privacy questions, data requests, or security concerns:
            </p>
            <div className="mt-3 p-4 rounded-xl border border-[#2a3d58] bg-[#0f1829]">
              <p className="text-white font-medium">Smart Sumi / Triple Cities Tech</p>
              <p>Email: <a href="mailto:support@smartsumai.com" className="text-violet-400 hover:text-violet-300">support@smartsumai.com</a></p>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
