import type { NextConfig } from "next";

// Allow Server Actions from localhost and, when configured, the deployed app
// origin. This covers reverse-proxy setups where the forwarded host differs
// from the request host.
const allowedOrigins = ["localhost:3000"];
if (process.env.NEXT_PUBLIC_APP_URL) {
  try {
    allowedOrigins.push(new URL(process.env.NEXT_PUBLIC_APP_URL).host);
  } catch {
    // Ignore a malformed NEXT_PUBLIC_APP_URL.
  }
}

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins,
    },
  },
};

export default nextConfig;
