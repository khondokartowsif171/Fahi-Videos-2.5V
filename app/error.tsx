"use client";
import React, { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error caught:", error);
  }, [error]);

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-4 border border-red-500/30 bg-red-500/10 p-6 rounded-2xl">
      <h2 className="text-xl font-bold text-red-400">Page Error Caught:</h2>
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
  );
}
