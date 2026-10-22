import { createHash } from "node:crypto";
import { embedded } from "./studio-context";
const cache = new Map<string, { expires: number; names: string[] }>();
/** Discovery is read-only. A key never implies access to every creative model. */
export async function creativeModel(
  key: string,
  kind: "image" | "text" | "tts",
  configured: string | undefined,
  fallback: string,
) {
  if (!embedded()) return configured || fallback;
  const hash = createHash("sha256").update(key).digest("hex");
  let entry = cache.get(hash);
  if (!entry || entry.expires < Date.now()) {
    const names: string[] = [];
    let page = "";
    do {
      const url = new URL(
        "https://generativelanguage.googleapis.com/v1beta/models",
      );
      url.searchParams.set("pageSize", "1000");
      if (page) url.searchParams.set("pageToken", page);
      const r = await fetch(url, {
        headers: { "x-goog-api-key": key },
        signal: AbortSignal.timeout(20000),
      });
      if (!r.ok)
        throw Error(
          `Creative model access check failed (${r.status}). Check your workspace provider settings.`,
        );
      const data = await r.json();
      for (const model of data.models || [])
        if (
          (model.supportedGenerationMethods || []).includes("generateContent")
        )
          names.push(String(model.name).replace(/^models\//, ""));
      page = data.nextPageToken || "";
    } while (page);
    if (cache.size > 100) cache.clear();
    entry = { expires: Date.now() + 300000, names };
    cache.set(hash, entry);
  }
  if (configured) {
    if (!entry.names.includes(configured))
      throw Error("The configured creative model is unavailable to this key.");
    return configured;
  }
  const matches = entry.names.filter((n) =>
    kind === "image"
      ? /gemini.*image/.test(n)
      : kind === "tts"
        ? /gemini.*tts/.test(n)
        : /^gemini-/.test(n) &&
          !/image|tts|omni|robotics|embedding|live/.test(n),
  );
  const stable = matches.filter((n) => !/preview|exp|latest/.test(n));
  const candidates = (stable.length ? stable : matches).sort((a, b) =>
    b.localeCompare(a, undefined, { numeric: true }),
  );
  if (!candidates.length)
    throw Error(
      `No supported ${kind} model is available to this workspace key.`,
    );
  return candidates.find((n) => n.includes("flash")) || candidates[0];
}
