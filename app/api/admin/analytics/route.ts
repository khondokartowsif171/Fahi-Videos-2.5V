import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SUPABASE_URL = (
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://spkrpwlavvbeooxijubv.supabase.co"
).replace(/\/+$/, "");

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwa3Jwd2xhdnZiZW9veGlqdWJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5NTIwODQsImV4cCI6MjEwODUyODA4NH0.cMOHFmKwBYw4hDbLu6Q4EwRB7pXIT9V2D9A42lq2J2A";

const ADMIN_EMAILS = new Set([
  "ceo@auraajenticai.cloud",
  "auraajenticai@gmail.com",
]);

const LEGACY_SEED_EMAILS = new Set([
  "demo@fahivids.cloud",
  "auraajenticai@gmail.com",
]);

interface AdminCaller {
  email: string;
  jwt: string;
}

/** Verify caller holds a valid Supabase Auth JWT belonging to an admin account. */
async function authorizeAdminRequest(
  req: NextRequest
): Promise<AdminCaller | null> {
  const authHeader = req.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  const jwt = match?.[1]?.trim();
  if (!jwt || jwt === SUPABASE_ANON_KEY) return null;

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${jwt}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const user = await res.json();
    const email = String(user?.email || "")
      .trim()
      .toLowerCase();
    const metaRole = String(
      user?.user_metadata?.role || user?.app_metadata?.role || ""
    )
      .trim()
      .toLowerCase();
    if (!email) return null;
    if (!ADMIN_EMAILS.has(email) && metaRole !== "admin") return null;
    return { email, jwt };
  } catch {
    return null;
  }
}

function resolveUserDisplayName(
  email: string,
  meta?: Record<string, any>
): string {
  const raw = String(
    meta?.full_name || meta?.name || email.split("@")[0] || "Creator"
  ).trim();
  return raw || "Creator";
}

function resolveAuthProvider(
  email: string,
  appMeta?: Record<string, any>,
  profileProvider?: string
): "google" | "email" | "supabase" | "admin" {
  if (email === "ceo@auraajenticai.cloud") return "admin";
  const p = String(appMeta?.provider || "").toLowerCase();
  const providers: string[] = Array.isArray(appMeta?.providers)
    ? appMeta.providers.map((x: unknown) => String(x).toLowerCase())
    : [];
  if (p === "google" || providers.includes("google")) return "google";
  if (profileProvider === "google") return "google";
  if (p === "email" || profileProvider === "email") return "email";
  return "supabase";
}

function mapSupabaseRestHeaders(token: string) {
  return {
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
  };
}

export async function GET(req: NextRequest) {
  const caller = await authorizeAdminRequest(req);
  if (!caller) {
    return NextResponse.json(
      { error: "Admin Supabase authentication required." },
      { status: 401 }
    );
  }

  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const readToken = serviceRoleKey || caller.jwt;

  try {
    const requests: Promise<Response>[] = [
      fetch(
        `${SUPABASE_URL}/rest/v1/fahi_user_profiles?select=*&order=last_active_at.desc&limit=500`,
        {
          headers: {
            apikey: serviceRoleKey || SUPABASE_ANON_KEY,
            Authorization: `Bearer ${readToken}`,
          },
          cache: "no-store",
        }
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/fahi_analytics_events?select=*&order=created_at.desc&limit=1000`,
        {
          headers: {
            apikey: serviceRoleKey || SUPABASE_ANON_KEY,
            Authorization: `Bearer ${readToken}`,
          },
          cache: "no-store",
        }
      ),
    ];

    if (serviceRoleKey) {
      requests.push(
        fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=500`, {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          cache: "no-store",
        })
      );
    }

    const [profilesRes, eventsRes, authUsersRes] = await Promise.all(requests);
    const profilesRows = profilesRes.ok
      ? ((await profilesRes.json()) as any[])
      : [];
    const eventsRows = eventsRes.ok ? ((await eventsRes.json()) as any[]) : [];
    const authPayload =
      authUsersRes && authUsersRes.ok ? await authUsersRes.json() : null;
    const authUsers: any[] = Array.isArray(authPayload?.users)
      ? authPayload.users
      : [];

    const profileMap = new Map<string, any>();
    for (const row of Array.isArray(profilesRows) ? profilesRows : []) {
      const email = String(row?.email || "")
        .trim()
        .toLowerCase();
      if (!email || LEGACY_SEED_EMAILS.has(email)) continue;
      profileMap.set(email, {
        id: row.id || email,
        name: row.name || resolveUserDisplayName(email),
        email,
        provider:
          email === "ceo@auraajenticai.cloud"
            ? "admin"
            : row.provider || "supabase",
        createdAt: row.created_at
          ? new Date(row.created_at).getTime()
          : Date.now(),
        lastActiveAt: row.last_active_at
          ? new Date(row.last_active_at).getTime()
          : Date.now(),
        loginCount: Number(row.login_count) || 1,
        actionCount: Number(row.action_count) || 0,
        isBlocked:
          email === "ceo@auraajenticai.cloud"
            ? false
            : Boolean(row.is_blocked),
      });
    }

    for (const u of authUsers) {
      const email = String(u?.email || "")
        .trim()
        .toLowerCase();
      if (!email || LEGACY_SEED_EMAILS.has(email)) continue;
      const existing = profileMap.get(email);
      const createdMs = u?.created_at
        ? new Date(u.created_at).getTime()
        : Date.now();
      const signInMs = u?.last_sign_in_at
        ? new Date(u.last_sign_in_at).getTime()
        : createdMs;

      profileMap.set(email, {
        id: u.id || existing?.id || email,
        name: resolveUserDisplayName(email, u?.user_metadata) || existing?.name,
        email,
        provider: resolveAuthProvider(
          email,
          u?.app_metadata,
          existing?.provider
        ),
        createdAt: existing ? Math.min(existing.createdAt, createdMs) : createdMs,
        lastActiveAt: existing
          ? Math.max(existing.lastActiveAt, signInMs)
          : signInMs,
        loginCount: Math.max(1, Number(existing?.loginCount) || 1),
        actionCount: Number(existing?.actionCount) || 0,
        isBlocked:
          email === "ceo@auraajenticai.cloud"
            ? false
            : Boolean(existing?.isBlocked),
      });
    }

    const users = Array.from(profileMap.values()).sort(
      (a, b) => b.lastActiveAt - a.lastActiveAt
    );

    const events = (Array.isArray(eventsRows) ? eventsRows : [])
      .filter(
        (r: any) =>
          r &&
          !LEGACY_SEED_EMAILS.has(
            String(r.user_email || "")
              .trim()
              .toLowerCase()
          )
      )
      .map((r: any, i: number) => ({
        id: r.id || `cloud_e_${i}`,
        type: r.event_type || "tool_open",
        tool: r.tool || "home",
        title: r.title || r.action || "Studio Action",
        userEmail: r.user_email || "guest@public-visitor",
        userName: r.user_name || "Visitor",
        timestamp: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
      }));

    return NextResponse.json({
      serverConfigured: Boolean(serviceRoleKey || profilesRes.ok),
      users,
      events,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch admin analytics." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const caller = await authorizeAdminRequest(req);
  if (!caller) {
    return NextResponse.json(
      { error: "Admin Supabase authentication required." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const action = String(body?.action || "");
    if (action !== "toggle_block") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const email = String(body?.email || "")
      .trim()
      .toLowerCase();
    if (!email || email === "ceo@auraajenticai.cloud") {
      return NextResponse.json(
        { error: "Cannot block master CEO account." },
        { status: 400 }
      );
    }

    const isBlocked = Boolean(body?.isBlocked);
    const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
    const writeToken = serviceRoleKey || caller.jwt;

    const patchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/fahi_user_profiles?email=eq.${encodeURIComponent(email)}`,
      {
        method: "PATCH",
        headers: serviceRoleKey
          ? {
              "Content-Type": "application/json",
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
            }
          : mapSupabaseRestHeaders(writeToken),
        body: JSON.stringify({
          is_blocked: isBlocked,
          last_active_at: new Date().toISOString(),
        }),
      }
    );

    if (!patchRes.ok) {
      const detail = await patchRes.text();
      return NextResponse.json(
        { error: detail || "Failed to update user block state." },
        { status: patchRes.status }
      );
    }

    return NextResponse.json({ success: true, email, isBlocked });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server analytics action failed." },
      { status: 500 }
    );
  }
}
