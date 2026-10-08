import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  distDir: process.env.FAHI_PREVIEW_DIR || ".next",
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
