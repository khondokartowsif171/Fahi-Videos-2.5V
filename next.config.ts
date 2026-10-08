import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  outputFileTracingRoot: process.cwd(),
  experimental: { webpackBuildWorker: false },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
