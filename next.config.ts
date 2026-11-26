import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lolipop! Deploy Now publishes `.next/standalone` and runs its server.js.
  // Next.js 16.3.5+ still emits the server file trace Vercel's adapter expects,
  // so this setting stays compatible with the existing Vercel deployment.
  output: "standalone",
  reactStrictMode: true,
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
