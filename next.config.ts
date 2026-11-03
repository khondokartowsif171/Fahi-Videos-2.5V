import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: false,
  basePath: process.env.FAHI_EMBEDDED === '1' ? '/fahi-studio' : '',
  env: {
    NEXT_PUBLIC_FAHI_EMBEDDED: process.env.FAHI_EMBEDDED || '0',
    NEXT_PUBLIC_FAHI_BASE_PATH: process.env.FAHI_EMBEDDED === '1' ? '/fahi-studio' : '',
  },
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
