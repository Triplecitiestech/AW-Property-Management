import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "property-manager-alpha-ecru.vercel.app",
      ],
    },
  },
};

export default nextConfig;
