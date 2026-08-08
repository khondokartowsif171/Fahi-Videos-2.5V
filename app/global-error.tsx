"use client";
import React, { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error caught:", error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="bg-[#050810] text-slate-100 p-8 font-sans">
        <div className="max-w-2xl mx-auto space-y-4 border border-red-500/30 bg-red-500/10 p-6 rounded-2xl">
          <h2 className="text-xl font-bold text-red-400">Application Error Caught:</h2>
          <pre className="text-xs bg-black/60 p-4 rounded-xl text-red-200 overflow-x-auto whitespace-pre-wrap font-mono">
            {error?.message || String(error)}
            {error?.stack ? `\n\nStack:\n${error.stack}` : ""}
          </pre>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
