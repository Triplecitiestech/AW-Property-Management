import type { NextConfig } from "next";

// VERCEL_URL is set automatically by Vercel during every build to the deployment's
// own hostname (e.g. "aw-property-management-abc123-triplecitiestech.vercel.app").
// Adding it here lets server actions work on preview deployments without wildcards.
const vercelUrl = process.env.VERCEL_URL ?? ""

const securityHeaders = [
  // Prevent clickjacking — critical for PCI SAQ A (protects billing/checkout page)
  { key: "X-Frame-Options", value: "DENY" },
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Control referrer info sent to third parties
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable browser features not needed by the app
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self)",
  },
  // Force HTTPS for 1 year (HSTS) — only effective on HTTPS origins
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  // Content Security Policy — prevents XSS and data injection attacks
  // 'unsafe-inline' for styles is required by Tailwind CSS inline styles
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://checkout.stripe.com",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "property-manager-alpha-ecru.vercel.app",
        "aw-property-management.vercel.app",
        "smartsumai.com",
        "www.smartsumai.com",
        // Preview deployments: baked in at build time via VERCEL_URL
        ...(vercelUrl ? [vercelUrl] : []),
      ],
    },
  },
};

export default nextConfig;
