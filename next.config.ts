import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    config.resolve.symlinks = false;

    // Force single instance of react & next router modules to eliminate Windows casing duplicate instances
    config.resolve.alias = {
      ...config.resolve.alias,
      react: path.resolve("./node_modules/react"),
      "react-dom": path.resolve("./node_modules/react-dom"),
      "next/dist/client/components/layout-router": path.resolve("./node_modules/next/dist/client/components/layout-router.js"),
      "next/dist/client/components/app-router": path.resolve("./node_modules/next/dist/client/components/app-router.js"),
    };

    config.plugins.push({
      apply: (compiler: any) => {
        compiler.hooks.normalModuleFactory.tap("CaseSensitivityFix", (nmf: any) => {
          nmf.hooks.beforeResolve.tap("CaseSensitivityFix", (resolveData: any) => {
            if (resolveData && resolveData.contextInfo && resolveData.contextInfo.issuer) {
              resolveData.contextInfo.issuer = resolveData.contextInfo.issuer.replace(/d:\\fahi-videos/gi, "D:\\Fahi-videos");
            }
            if (resolveData && typeof resolveData.request === "string") {
              resolveData.request = resolveData.request.replace(/d:\\fahi-videos/gi, "D:\\Fahi-videos");
            }
          });
        });
      },
    });

    return config;
  },
};

export default nextConfig;
