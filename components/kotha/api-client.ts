export async function kothaFetch(input: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  try {
    const key = localStorage.getItem("fahi_gemini_api_key");
    if (key) headers.set("x-gemini-api-key", key);
  } catch {
    // ignore storage read error
  }
  return window.fetch(input.replace(/^\/api\//, "/api/kotha/"), { ...init, headers });
}
