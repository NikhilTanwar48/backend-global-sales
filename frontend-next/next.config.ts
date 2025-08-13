import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Skip ESLint during builds (for Vercel deploy)
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
