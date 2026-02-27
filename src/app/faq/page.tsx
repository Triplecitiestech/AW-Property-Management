import Link from 'next/link'
import MarketingNav from '@/components/marketing/MarketingNav'

const faqs = [
  {
    q: 'What is Smart Sumai?',
    a: 'Smart Sumai is an AI-powered property management platform built for short-term rental hosts. It centralizes your properties, guest stays, service tickets, team contacts, and an AI assistant — all in one place.',
  },
  {
    q: 'How does the AI Property Manager work?',
    a: 'When you sign up, you get a dedicated phone number for SMS. Text it in plain English to check property status, file maintenance tickets, schedule guest stays, add contacts, or ask anything about your portfolio. The same AI is also available as a chat bubble inside the dashboard — and your conversations sync between SMS and web so you never lose context.',
  },
  {
    q: 'What can I do with the AI via text?',
    a: 'You can: check any property\'s current status, create urgent or routine service tickets, schedule guest stays, add or update vendor contacts, get a list of open tickets, update property cleaning status, and more — all in natural language.',
  },
  {
    q: 'How much does Smart Sumai cost?',
    a: 'It\'s $50 per month, which includes up to 3 properties. Each additional property beyond 3 is $10 per month. There are no setup fees, no contracts, and you can cancel anytime from your billing dashboard.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit and debit cards (Visa, Mastercard, Amex), Google Pay, Apple Pay, ACH bank transfers, and PayPal. All payments are securely processed.',
  },
  {
    q: 'Can my team use the platform?',
    a: 'Yes. You can invite cleaners, maintenance staff, and co-managers from the Settings page. Team members can be given access to specific properties with role-based permissions. When a team member is added to a property, their contact information is automatically included in that property\'s contact list.',
  },
  {
    q: 'How do I receive service requests via the AI?',
    a: 'Text your AI with a description of the issue (e.g., "Leaking faucet at Lake Cabin, urgent"). The AI will create a service ticket, identify the relevant contact (plumber, maintenance, etc.) from your property contacts, and send them a notification email. If no contact is on file, the AI will ask you to add one.',
  },
  {
    q: 'What is the guest checklist feature?',
    a: 'Each stay gets a unique guest link. Guests can open it without signing up, view property instructions, and submit a report (notes, issues) after their stay. Their responses are sent directly to you as a notification.',
  },
  {
    q: 'Does Smart Sumai integrate with Airbnb or Vrbo?',
    a: 'Direct calendar integrations are on our roadmap. For now, you can manually log stays and use the AI to manage them. You can submit a feature request from Settings and we\'ll prioritize the most-requested integrations.',
  },
  {
    q: 'How do I cancel my account?',
    a: 'You can manage or cancel your subscription anytime from the Billing page. To permanently delete your account and all data, go to Settings and submit a deletion request. Our team will process the request on your behalf.',
  },
  {
    q: 'Is my data secure?',
    a: 'Yes. Smart Sumai is built to meet SOC 2 security standards and PCI DSS compliance requirements. All data is stored with row-level security — users can only access data they own or have been explicitly granted access to. All connections are encrypted in transit and at rest. Payment data is never stored by Smart Sumai; it is handled entirely by our payment processor.',
  },
  {
    q: 'How do I contact support?',
    a: 'Email support@smartsumai.com — our AI-powered support agent handles most questions instantly, including login issues and billing inquiries. Escalations go to a human team member.',
  },
]

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-[#07101e] text-white">
      <MarketingNav />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-24 pt-32">
        <div className="text-center mb-14">
          <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
          <p className="text-[#8aa0be] text-lg">Everything you need to know about Smart Sumai.</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <details key={i}
                     className="group rounded-2xl border border-white/5 bg-[#0f1829]/80 overflow-hidden">
              <summary className="flex items-center justify-between px-6 py-5 cursor-pointer list-none
                                   hover:bg-white/5 transition-colors">
                <span className="font-semibold text-white pr-4">{faq.q}</span>
                <svg className="w-5 h-5 text-[#6480a0] flex-shrink-0 transition-transform group-open:rotate-180"
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-6 pb-5 text-[#8aa0be] leading-relaxed text-sm border-t border-white/5 pt-4">
                {faq.a}
              </div>
            </details>
          ))}
        </div>

        <div className="mt-16 text-center rounded-2xl border border-violet-500/20 bg-violet-950/20 p-8">
          <h2 className="text-xl font-bold text-white mb-2">Still have questions?</h2>
          <p className="text-[#8aa0be] mb-5">Our support team (AI-powered, 24/7) can help with anything.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="mailto:support@smartsumai.com"
               className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 text-white font-semibold hover:from-violet-500 hover:to-violet-400 transition-all">
              Email Support
            </a>
            <Link href="/auth/login?mode=signup"
                  className="px-6 py-3 rounded-xl border border-white/10 text-white font-semibold hover:bg-white/5 transition-all">
              Get Started Free →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
