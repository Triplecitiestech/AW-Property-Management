import Link from 'next/link'

export const metadata = { title: 'Terms of Use — Smart Sumai' }

export default function TermsPage() {
  const updated = 'February 27, 2026'
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
          <h1 className="text-3xl font-bold text-white mb-2">Terms of Use</h1>
          <p className="text-[#6480a0] text-sm">Last updated: {updated}</p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Smart Sumai (&ldquo;the Service&rdquo;), you agree to be bound by these Terms of Use.
              If you do not agree to all of these terms, do not use the Service. These terms apply to all users,
              including property owners, managers, and any other individuals who access the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Description of Service</h2>
            <p>
              Smart Sumai is an AI-powered property management platform that provides tools for managing short-term
              rental properties, including work order tracking, guest scheduling, contact management, and AI-assisted
              communication via SMS and web chat. The Service is provided by Triplecitiestech LLC (&ldquo;Company,&rdquo;
              &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Eligibility</h2>
            <p>
              You must be at least 18 years of age and capable of entering into a legally binding agreement to use
              the Service. By using the Service, you represent and warrant that you meet these requirements.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Account Registration</h2>
            <p className="mb-2">
              You are responsible for maintaining the confidentiality of your account credentials and for all
              activities that occur under your account. You agree to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-[#94a3b8] ml-2">
              <li>Provide accurate and complete registration information</li>
              <li>Update your information to keep it accurate and current</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
              <li>Not share your credentials with third parties</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. SMS Communications</h2>
            <p className="mb-2">
              By providing your phone number and opting in to SMS communications, you consent to receive
              automated text messages from Smart Sumai related to your property management activities, including
              work order updates, AI responses, and system notifications.
            </p>
            <p className="mb-2">
              Message and data rates may apply. Message frequency varies based on your usage. You can opt out at
              any time by texting STOP to our number or by removing your phone number from your profile. For help,
              text HELP. See our{' '}
              <Link href="/sms-policy" className="text-violet-400 hover:text-violet-300 underline">SMS Consent &amp; Privacy Policy</Link>
              {' '}for full details.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. AI-Generated Content</h2>
            <p className="mb-2">
              The Service uses artificial intelligence to generate responses, work orders, and communications on
              your behalf. You acknowledge and agree that:
            </p>
            <ul className="list-disc list-inside space-y-1 text-[#94a3b8] ml-2">
              <li>AI-generated content may contain errors or inaccuracies</li>
              <li>You are responsible for reviewing AI-generated work orders and communications before relying on them</li>
              <li>The Company is not liable for any damages arising from AI-generated content</li>
              <li>External messages sent to contacts on your behalf via AI are done at your direction</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Acceptable Use</h2>
            <p className="mb-2">You agree not to:</p>
            <ul className="list-disc list-inside space-y-1 text-[#94a3b8] ml-2">
              <li>Use the Service for any unlawful purpose or in violation of these Terms</li>
              <li>Transmit spam, unsolicited communications, or harassing content</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Interfere with or disrupt the integrity or performance of the Service</li>
              <li>Collect or harvest user data without authorization</li>
              <li>Use the Service to violate any applicable laws or regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Privacy and Data</h2>
            <p>
              Your use of the Service is subject to our privacy practices. We collect and process personal
              information including your name, email address, phone number, and property data to provide the
              Service. We do not sell your personal information to third parties. Data is stored securely using
              Supabase (PostgreSQL) with row-level security policies ensuring your data is only accessible to you.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Intellectual Property</h2>
            <p>
              The Service, including its design, features, and underlying technology, is owned by Triplecitiestech LLC
              and protected by applicable intellectual property laws. You retain ownership of the data you enter
              into the Service. By using the Service, you grant us a limited license to process your data to
              provide the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">10. Disclaimers and Limitation of Liability</h2>
            <p className="mb-2">
              THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. TO THE
              FULLEST EXTENT PERMITTED BY LAW, THE COMPANY DISCLAIMS ALL WARRANTIES, INCLUDING FITNESS FOR A
              PARTICULAR PURPOSE AND NON-INFRINGEMENT.
            </p>
            <p>
              IN NO EVENT SHALL THE COMPANY BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL
              DAMAGES ARISING OUT OF YOUR USE OF THE SERVICE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
              OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID TO US IN THE THREE MONTHS PRECEDING THE CLAIM.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">11. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless Triplecitiestech LLC, its officers, directors, employees,
              and agents from any claims, damages, or expenses (including reasonable attorney&apos;s fees) arising from
              your use of the Service, your violation of these Terms, or your violation of any rights of another party.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">12. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account at any time for violations of these Terms or
              for any other reason at our sole discretion. You may terminate your account at any time by contacting
              us. Upon termination, your right to use the Service ceases immediately.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">13. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. We will notify you of significant changes via email or
              by displaying a notice within the Service. Your continued use of the Service after changes take effect
              constitutes your acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">14. Governing Law</h2>
            <p>
              These Terms are governed by and construed in accordance with the laws of the State of New York,
              without regard to its conflict of law provisions. Any disputes shall be resolved in the courts
              located in Broome County, New York.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">15. Contact</h2>
            <p>
              If you have questions about these Terms, please contact us at{' '}
              <a href="mailto:support@smartsumai.com" className="text-violet-400 hover:text-violet-300 underline">
                support@smartsumai.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-[#2a3d58] text-center text-xs text-[#6480a0]">
          <p>Smart Sumai · AI-Powered Property Management · Triplecitiestech LLC</p>
          <p className="mt-1">
            <Link href="/sms-policy" className="text-violet-400 hover:text-violet-300">SMS Consent &amp; Privacy Policy</Link>
            {' '}·{' '}
            <Link href="/auth/login" className="text-violet-400 hover:text-violet-300">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
