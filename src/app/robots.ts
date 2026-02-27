import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://aw-property-management.vercel.app'

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/pricing', '/terms', '/sms-policy', '/privacy'],
        disallow: [
          '/dashboard',
          '/properties/',
          '/stays/',
          '/work-orders/',
          '/contacts/',
          '/settings',
          '/admin',
          '/welcome',
          '/billing',
          '/guest/',
          '/invite/',
          '/api/',
          '/auth/callback',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
