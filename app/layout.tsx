import "./globals.css";
import React from "react";
import { Metadata, Viewport } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "FahiVids — Professional Video Studio",
  description:
    "Download, edit, and create videos — free, in your browser. No signup. No watermarks.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon.ico", sizes: "64x64" },
    ],
    shortcut: "/app-icon.png",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FahiVids",
  },
};

export const viewport: Viewport = {
  themeColor: "#00c8ff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased overflow-x-hidden">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function shouldIgnore(msg) {
                  if (!msg) return false;
                  var str = String(msg).toLowerCase();
                  return str.indexOf('metamask') !== -1 ||
                         str.indexOf('ethereum') !== -1 ||
                         str.indexOf('failed to connect') !== -1 ||
                         str.indexOf('user rejected') !== -1 ||
                         str.indexOf('wallet') !== -1;
                }
                window.addEventListener('unhandledrejection', function(e) {
                  if (shouldIgnore(e.reason && (e.reason.message || e.reason))) {
                    e.preventDefault();
                    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
                  }
                }, true);
                window.addEventListener('error', function(e) {
                  if (shouldIgnore(e.message || (e.error && e.error.message))) {
                    e.preventDefault();
                    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
                  }
                }, true);
                window.addEventListener('beforeinstallprompt', function(e) {
                  e.preventDefault();
                  window.__fahiDeferredPrompt = e;
                  window.dispatchEvent(new CustomEvent('fahi-pwa-ready'));
                });
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function() {});
                  });
                }
              })();
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
