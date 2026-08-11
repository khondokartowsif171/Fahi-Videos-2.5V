"use client";

import React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-[#050810] text-white flex items-center justify-center min-h-screen font-sans">
        <div className="p-8 max-w-xl mx-auto bg-red-950/20 border border-red-500/30 rounded-2xl text-center space-y-4">
          <h2 className="text-lg font-bold text-red-400">Application Error</h2>
          <p className="text-xs font-mono text-red-300/80">{error?.message || "An unexpected application error occurred."}</p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
