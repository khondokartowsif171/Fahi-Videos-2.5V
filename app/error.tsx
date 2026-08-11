"use client";

import React from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-8 max-w-xl mx-auto my-12 bg-red-950/20 border border-red-500/30 rounded-2xl text-center space-y-4">
      <h2 className="text-lg font-bold text-red-400">Something went wrong!</h2>
      <p className="text-xs font-mono text-red-300/80">{error?.message || "An unexpected error occurred."}</p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
