import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AW Property Management',
  description: 'Property operations dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
