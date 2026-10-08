export async function auraFetch(input: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const key = localStorage.getItem("fahi_gemini_api_key");
  if (key) headers.set("x-gemini-api-key", key);
  let clientId = localStorage.getItem("fahi_aura_client_id");
  if (!clientId) { clientId = crypto.randomUUID(); localStorage.setItem("fahi_aura_client_id", clientId); }
  headers.set("x-aura-client-id", clientId);
  const settings = JSON.parse(localStorage.getItem("fahi_aura_settings") || "{}");
  if (init.body && typeof init.body === "string") {
    init = { ...init, body: JSON.stringify({ ...settings, ...JSON.parse(init.body) }) };
  }
  return window.fetch(input.replace(/^\/api\//, "/api/aura/"), { ...init, headers });
}
