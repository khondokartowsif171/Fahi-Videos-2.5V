import "./globals.css";
import React from "react";
import { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Fahi Vids — Professional Video Studio",
  description: "Download, edit, and create videos with AI — free, in your browser. No signup. No watermarks.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FahiVids",
  },
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
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
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
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
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased overflow-x-hidden">{children}</body>
    </html>
  );
}
