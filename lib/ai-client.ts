/**
 * lib/ai-client.ts
 * 
 * Centralized AI request helper for Fahi-Videos.
 * Automatically routes through n8n webhook if configured,
 * otherwise calls Gemini API directly.
 * 
 * Settings stored in localStorage:
 *   fahi_gemini_api_key  — user's personal Gemini key (optional)
 *   fahi_n8n_webhook_url — n8n webhook URL (optional)
 *   fahi_use_n8n         — "true" | "false"
 */

export interface AiRequestOptions {
  task: string;
  prompt?: string;
  model?: string;
  [key: string]: unknown;
}

export interface AiResponse {
  text?: string;
  error?: string;
  via?: "n8n" | "direct";
  [key: string]: unknown;
}

/**
 * Get configured headers for API calls (includes Gemini key and n8n webhook/key headers)
 */
export function getAiHeaders(): Record<string, string> {
  const geminiKey =
    typeof window !== "undefined"
      ? localStorage.getItem("fahi_gemini_api_key") || ""
      : "";
  const n8nUrl =
    typeof window !== "undefined"
      ? localStorage.getItem("fahi_n8n_webhook_url") || ""
      : "";
  const n8nApiKey =
    typeof window !== "undefined"
      ? localStorage.getItem("fahi_n8n_api_key") || ""
      : "";
  const useN8n =
    typeof window !== "undefined"
      ? localStorage.getItem("fahi_use_n8n") === "true"
      : false;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (geminiKey) {
    headers["x-gemini-api-key"] = geminiKey;
  }

  if (useN8n && n8nUrl) {
    headers["x-n8n-webhook-url"] = n8nUrl;
    if (n8nApiKey) {
      headers["x-n8n-api-key"] = n8nApiKey;
    }
  }

  return headers;
}

/**
 * Make an AI request. Automatically routes through n8n if configured.
 */
export async function callAi(options: AiRequestOptions): Promise<AiResponse> {
  const headers = getAiHeaders();

  const response = await fetch("/api/gemini/generate", {
    method: "POST",
    headers,
    body: JSON.stringify(options),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `API error ${response.status}`);
  }

  return { ...data, via: !!headers["x-n8n-webhook-url"] ? "n8n" : "direct" };
}

/**
 * Simple hook-friendly getter for current AI connection mode.
 */
export function getAiConnectionMode(): {
  mode: "n8n" | "direct";
  hasKey: boolean;
  n8nUrl: string;
} {
  if (typeof window === "undefined") {
    return { mode: "direct", hasKey: false, n8nUrl: "" };
  }
  const useN8n = localStorage.getItem("fahi_use_n8n") === "true";
  const n8nUrl = localStorage.getItem("fahi_n8n_webhook_url") || "";
  const hasKey = !!localStorage.getItem("fahi_gemini_api_key");
  return {
    mode: useN8n && n8nUrl ? "n8n" : "direct",
    hasKey,
    n8nUrl,
  };
}
