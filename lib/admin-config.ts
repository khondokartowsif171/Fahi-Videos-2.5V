import fs from "node:fs";
import path from "node:path";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://spkrpwlavvbeooxijubv.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwa3Jwd2xhdnZiZW9veGlqdWJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5NTIwODQsImV4cCI6MjEwODUyODA4NH0.cMOHFmKwBYw4hDbLu6Q4EwRB7pXIT9V2D9A42lq2J2A";

export const DEFAULT_ADMIN_EMAIL = "ceo@auraajenticai.cloud";

export interface AdminServerConfig {
  geminiApiKey: string;
  n8nWebhookUrl: string;
  useN8n: boolean;
  approvedEmails: string[];
  requestedEmails: string[];
  updatedAt: string;
}

function getConfigPath() {
  const dir = path.resolve(process.env.AURA_DATA_DIR || ".aura-data");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "admin-ai-config.json");
}

export function readLocalAdminConfig(): AdminServerConfig {
  try {
    const raw = fs.readFileSync(getConfigPath(), "utf8");
    const parsed = JSON.parse(raw);
    return {
      geminiApiKey: parsed.geminiApiKey || process.env.GEMINI_API_KEY || "",
      n8nWebhookUrl: parsed.n8nWebhookUrl || "",
      useN8n: Boolean(parsed.useN8n),
      approvedEmails: Array.isArray(parsed.approvedEmails)
        ? parsed.approvedEmails
        : [DEFAULT_ADMIN_EMAIL],
      requestedEmails: Array.isArray(parsed.requestedEmails)
        ? parsed.requestedEmails
        : [],
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return {
      geminiApiKey: process.env.GEMINI_API_KEY || "",
      n8nWebhookUrl: "",
      useN8n: false,
      approvedEmails: [DEFAULT_ADMIN_EMAIL],
      requestedEmails: [],
      updatedAt: new Date().toISOString(),
    };
  }
}

export function writeLocalAdminConfig(cfg: AdminServerConfig) {
  fs.writeFileSync(getConfigPath(), JSON.stringify(cfg, null, 2), "utf8");
}

export async function syncAuraAccessWithSupabase(
  approvedEmails: string[],
  requestedEmails: string[]
) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/fahi_settings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        setting_key: "aura_access_control",
        setting_value: {
          approvedEmails: Array.from(
            new Set([
              DEFAULT_ADMIN_EMAIL,
              ...approvedEmails.map((e) => e.toLowerCase()),
            ])
          ),
          requestedEmails: Array.from(
            new Set(requestedEmails.map((e) => e.toLowerCase()))
          ),
        },
        updated_at: new Date().toISOString(),
      }),
    });
  } catch {}
}

export async function fetchAuraAccessFromSupabase(): Promise<{
  approvedEmails: string[];
  requestedEmails: string[];
}> {
  const local = readLocalAdminConfig();
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/fahi_settings?setting_key=eq.aura_access_control&select=*`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        cache: "no-store",
      }
    );
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0 && rows[0].setting_value) {
        const val = rows[0].setting_value;
        const approved = Array.from(
          new Set([
            DEFAULT_ADMIN_EMAIL,
            ...(Array.isArray(val.approvedEmails) ? val.approvedEmails : []),
            ...local.approvedEmails,
          ])
        ).map((e) => String(e).toLowerCase());
        const requested = Array.from(
          new Set([
            ...(Array.isArray(val.requestedEmails) ? val.requestedEmails : []),
            ...local.requestedEmails,
          ])
        ).map((e) => String(e).toLowerCase());
        return { approvedEmails: approved, requestedEmails: requested };
      }
    }
  } catch {}
  return {
    approvedEmails: Array.from(
      new Set([DEFAULT_ADMIN_EMAIL, ...local.approvedEmails])
    ).map((e) => e.toLowerCase()),
    requestedEmails: local.requestedEmails.map((e) => e.toLowerCase()),
  };
}
