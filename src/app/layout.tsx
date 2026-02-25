import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SmartSum AI — Property Management',
  description: 'AI-powered property management for short-term rental hosts.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
