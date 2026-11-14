/**
 * lib/supabase-client.ts
 *
 * Supabase Authentication, Admin Analytics, User Management & Cloud Storage Client
 * - Zero external npm dependencies (uses Supabase REST & GoTrue Auth v1 endpoints directly)
 * - Supports Email/Password Sign Up, Sign In, Session Verification, and Sign Out
 * - Tracks Registered Users, Tool Usage, and Live Traffic for the Super Admin Dashboard
 * - Supports 1-click User Block/Unblock and CSV Export
 */

import {
  buildSupabaseGoogleAuthorizeUrl,
  createPkceChallenge,
  extractSupabaseOAuthUser,
  formatOAuthErrorMessage,
  generateCodeVerifier,
  parseOAuthCallbackUrl,
} from "./oauth-helpers";

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  isConfigured: boolean;
}

export interface FahiUser {
  id: string;
  email: string;
  name: string;
  accessToken?: string;
  refreshToken?: string;
  avatarUrl?: string;
  authMethod?: "google" | "email";
  provider: "supabase" | "admin" | "local";
}

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  provider: "google" | "email" | "supabase" | "local" | "admin";
  createdAt: number;
  lastActiveAt: number;
  loginCount: number;
  actionCount: number;
  isBlocked?: boolean;
}

export interface AdminAnalyticsEvent {
  id: string;
  type:
    | "page_view"
    | "youtube_download"
    | "video_edit"
    | "image_edit"
    | "ai_generate"
    | "kotha_dub"
    | "tool_open";
  tool: "home" | "downloader" | "editor" | "thumbnail" | "ai" | "kotha" | "mcp";
  title: string;
  userEmail: string;
  userName: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

const SESSION_STORAGE_KEY = "fahi_auth_session_v1";
const OAUTH_PKCE_STORAGE_KEY = "fahi_oauth_pkce_v1";
const LOCAL_USERS_KEY = "fahi_registered_users_v1";
const ADMIN_USERS_INDEX_KEY = "fahi_admin_users_index_v1";
const ADMIN_EVENTS_KEY = "fahi_admin_analytics_events_v1";
const BLOCKED_EMAILS_KEY = "fahi_blocked_emails_v1";
const ADMIN_SUPABASE_TOKEN_KEY = "fahi_admin_supabase_token_v1";

export function getSupabaseConfig(): SupabaseConfig {
  const envUrl =
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SUPABASE_URL || "https://spkrpwlavvbeooxijubv.supabase.co" : "";
  const envKey =
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwa3Jwd2xhdnZiZW9veGlqdWJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5NTIwODQsImV4cCI6MjEwODUyODA4NH0.cMOHFmKwBYw4hDbLu6Q4EwRB7pXIT9V2D9A42lq2J2A" : "";

  if (typeof window === "undefined") {
    return {
      supabaseUrl: envUrl.replace(/\/$/, ""),
      supabaseAnonKey: envKey,
      isConfigured: Boolean(envUrl && envKey),
    };
  }

  const supabaseUrl = (
    localStorage.getItem("fahi_supabase_url") ||
    envUrl ||
    ""
  )
    .trim()
    .replace(/\/$/, "");
  const supabaseAnonKey = (
    localStorage.getItem("fahi_supabase_anon_key") ||
    envKey ||
    ""
  ).trim();

  return {
    supabaseUrl,
    supabaseAnonKey,
    isConfigured: Boolean(supabaseUrl && supabaseAnonKey),
  };
}

const LEGACY_SEED_EMAILS = new Set([
  "demo@fahivids.cloud",
  "auraajenticai@gmail.com",
]);

export function getBlockedEmails(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(BLOCKED_EMAILS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function isEmailBlocked(email: string): boolean {
  const clean = email.trim().toLowerCase();
  if (clean === DEFAULT_ADMIN_EMAIL.toLowerCase()) return false;
  return getBlockedEmails().includes(clean);
}

export function toggleBlockUserEmail(email: string): boolean {
  if (typeof window === "undefined") return false;
  const clean = email.trim().toLowerCase();
  if (clean === DEFAULT_ADMIN_EMAIL.toLowerCase()) return false;

  const current = getBlockedEmails();
  const exists = current.includes(clean);
  const nextBlockedState = !exists;
  const next = exists ? current.filter((e) => e !== clean) : [...current, clean];
  localStorage.setItem(BLOCKED_EMAILS_KEY, JSON.stringify(next));

  // Also update user index record locally
  const users = getAdminUsersList();
  const updated = users.map((u) =>
    u.email.toLowerCase() === clean ? { ...u, isBlocked: nextBlockedState } : u
  );
  localStorage.setItem(ADMIN_USERS_INDEX_KEY, JSON.stringify(updated));

  // Sync block/unblock status directly to Supabase Cloud (fahi_user_profiles) using admin JWT
  const { supabaseUrl, supabaseAnonKey, isConfigured } = getSupabaseConfig();
  if (isConfigured) {
    ensureAdminSupabaseSession()
      .then(async (adminJwt) => {
        if (!adminJwt) return;
        const apiRes = await fetch("/api/admin/analytics", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminJwt}`,
          },
          body: JSON.stringify({
            action: "toggle_block",
            email: clean,
            isBlocked: nextBlockedState,
          }),
        }).catch(() => null);
        if (apiRes && apiRes.ok) return;

        await fetch(
          `${supabaseUrl}/rest/v1/fahi_user_profiles?email=eq.${encodeURIComponent(clean)}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              apikey: supabaseAnonKey,
              Authorization: `Bearer ${adminJwt}`,
            },
            body: JSON.stringify({
              is_blocked: nextBlockedState,
              last_active_at: new Date().toISOString(),
            }),
          }
        );
      })
      .catch(() => {});
  }

  return nextBlockedState;
}

export function getAdminUsersList(): AdminUserRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const blocked = getBlockedEmails();
    const indexRaw = JSON.parse(
      localStorage.getItem(ADMIN_USERS_INDEX_KEY) || "[]"
    ) as AdminUserRecord[];
    const localRaw = JSON.parse(
      localStorage.getItem(LOCAL_USERS_KEY) || "[]"
    ) as Array<{ id: string; name: string; email: string; createdAt?: number }>;

    const map = new Map<string, AdminUserRecord>();
    for (const item of indexRaw) {
      if (item && item.email) {
        const cleanKey = item.email.trim().toLowerCase();
        if (LEGACY_SEED_EMAILS.has(cleanKey)) continue;
        map.set(cleanKey, {
          ...item,
          email: cleanKey,
          isBlocked:
            cleanKey === DEFAULT_ADMIN_EMAIL.toLowerCase()
              ? false
              : blocked.includes(cleanKey) || Boolean(item.isBlocked),
        });
      }
    }
    for (const loc of localRaw) {
      const key = (loc.email || "").trim().toLowerCase();
      if (key && !LEGACY_SEED_EMAILS.has(key) && !map.has(key)) {
        map.set(key, {
          id: loc.id,
          name: loc.name || key.split("@")[0],
          email: key,
          provider: "local",
          createdAt: loc.createdAt || Date.now(),
          lastActiveAt: loc.createdAt || Date.now(),
          loginCount: 1,
          actionCount: 0,
          isBlocked: blocked.includes(key),
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.lastActiveAt - a.lastActiveAt);
  } catch {
    return [];
  }
}

export function upsertAdminUserRecord(
  user: FahiUser,
  incrementLogin = false,
  incrementAction = false
): void {
  if (typeof window === "undefined" || !user?.email) return;
  try {
    const cleanEmail = user.email.trim().toLowerCase();
    const list = getAdminUsersList();
    const now = Date.now();
    const existingIdx = list.findIndex((u) => u.email.toLowerCase() === cleanEmail);

    const resolvedProvider: AdminUserRecord["provider"] =
      cleanEmail === DEFAULT_ADMIN_EMAIL.toLowerCase()
        ? "admin"
        : user.authMethod === "google"
          ? "google"
          : user.provider === "admin"
            ? "admin"
            : user.provider === "supabase"
              ? "email"
              : user.provider || "local";

    let record: AdminUserRecord;
    if (existingIdx >= 0) {
      const prev = list[existingIdx];
      record = {
        ...prev,
        name: user.name || prev.name,
        provider: resolvedProvider || prev.provider,
        lastActiveAt: now,
        loginCount: prev.loginCount + (incrementLogin ? 1 : 0),
        actionCount: prev.actionCount + (incrementAction ? 1 : 0),
        isBlocked: isEmailBlocked(cleanEmail),
      };
      list[existingIdx] = record;
    } else {
      record = {
        id: user.id || `usr_${now}`,
        name: user.name || cleanEmail.split("@")[0] || "Creator",
        email: cleanEmail,
        provider: resolvedProvider,
        createdAt: now,
        lastActiveAt: now,
        loginCount: 1,
        actionCount: incrementAction ? 1 : 0,
        isBlocked: isEmailBlocked(cleanEmail),
      };
      list.unshift(record);
    }

    localStorage.setItem(ADMIN_USERS_INDEX_KEY, JSON.stringify(list.slice(0, 500)));

    // Sync asynchronously to Supabase when holding an authenticated JWT (prevents anon RLS 403)
    const { supabaseUrl, supabaseAnonKey, isConfigured } = getSupabaseConfig();
    if (isConfigured && user.accessToken) {
      fetch(`${supabaseUrl}/rest/v1/fahi_user_profiles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${user.accessToken}`,
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify({
          email: record.email,
          name: record.name,
          provider: record.provider,
          created_at: new Date(record.createdAt).toISOString(),
          last_active_at: new Date(record.lastActiveAt).toISOString(),
          login_count: record.loginCount,
          action_count: record.actionCount,
          is_blocked: Boolean(record.isBlocked),
        }),
      }).catch(() => {});
    }
  } catch {}
}

export function getAdminAnalyticsEvents(): AdminAnalyticsEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(
      localStorage.getItem(ADMIN_EVENTS_KEY) || "[]"
    ) as AdminAnalyticsEvent[];
    return raw.filter(
      (ev) => ev && !LEGACY_SEED_EMAILS.has((ev.userEmail || "").toLowerCase())
    );
  } catch {
    return [];
  }
}

export function recordAdminAnalyticsEvent(
  event: Omit<AdminAnalyticsEvent, "id" | "timestamp" | "userEmail" | "userName">
): void {
  if (typeof window === "undefined") return;
  try {
    const current = getCurrentUser();
    const userEmail = current?.email || "guest@public-visitor";
    const userName = current?.name || "Public Visitor";

    const newEvent: AdminAnalyticsEvent = {
      ...event,
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      userEmail,
      userName,
    };

    const existing = getAdminAnalyticsEvents();
    const updated = [newEvent, ...existing].slice(0, 300);
    localStorage.setItem(ADMIN_EVENTS_KEY, JSON.stringify(updated));

    if (current && event.type !== "page_view") {
      upsertAdminUserRecord(current, false, true);
    }

    // Optional non-blocking sync to Supabase analytics table
    const { supabaseUrl, supabaseAnonKey, isConfigured } = getSupabaseConfig();
    if (isConfigured) {
      fetch(`${supabaseUrl}/rest/v1/fahi_analytics_events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${current?.accessToken || supabaseAnonKey}`,
        },
        body: JSON.stringify({
          event_type: newEvent.type,
          tool: newEvent.tool,
          title: newEvent.title,
          user_email: newEvent.userEmail,
          user_name: newEvent.userName,
          created_at: new Date(newEvent.timestamp).toISOString(),
        }),
      }).catch(() => {});
    }
  } catch {}
}

export function recordTrafficVisit(
  tab: "home" | "downloader" | "editor" | "thumbnail" | "ai" | "kotha" | "mcp"
): void {
  if (typeof window === "undefined") return;
  const labels: Record<string, string> = {
    home: "Visited Public Home Page",
    downloader: "Opened Universal YT/FB/Insta Downloader",
    editor: "Opened CapCut Pro Video Studio",
    thumbnail: "Opened HD Thumbnail Designer",
    ai: "Opened Aura AI Studio",
    kotha: "Opened Kotha Studio (কণ্ঠধ্বনি)",
    mcp: "Opened MCP AI Connector Hub",
  };
  recordAdminAnalyticsEvent({
    type: tab === "home" ? "page_view" : "tool_open",
    tool: tab,
    title: labels[tab] || `Opened ${tab}`,
  });
}

function isAdminEmailAddress(email?: string | null): boolean {
  const clean = String(email || "").trim().toLowerCase();
  return (
    clean === DEFAULT_ADMIN_EMAIL.toLowerCase() ||
    clean === "auraajenticai@gmail.com"
  );
}

function isJwtUnexpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    if (!payload?.exp) return true;
    return Number(payload.exp) * 1000 > Date.now() + 30_000;
  } catch {
    return false;
  }
}

export function hasValidAdminSession(): boolean {
  if (typeof window === "undefined") return false;
  const current = getCurrentUser();
  if (
    current?.accessToken &&
    isAdminEmailAddress(current.email) &&
    isJwtUnexpired(current.accessToken)
  ) {
    return true;
  }
  const cachedToken = localStorage.getItem(ADMIN_SUPABASE_TOKEN_KEY) || "";
  return Boolean(
    localStorage.getItem("fahi_admin_logged_in") === "true" &&
      cachedToken &&
      isJwtUnexpired(cachedToken)
  );
}

export async function authenticateAdminWithSupabase(
  email: string,
  password: string
): Promise<{ user?: FahiUser; accessToken?: string; error?: string }> {
  if (typeof window === "undefined") {
    return { error: "Admin login requires a browser session." };
  }
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = password.trim();
  if (!cleanEmail || !cleanPass) {
    return { error: "Admin email and password are required." };
  }
  if (!isAdminEmailAddress(cleanEmail)) {
    return { error: "Unauthorized: only verified Super Admin accounts may sign in." };
  }

  const { supabaseUrl, supabaseAnonKey, isConfigured } = getSupabaseConfig();
  if (!isConfigured) {
    return { error: "Supabase Auth configuration is missing." };
  }

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({ email: cleanEmail, password: cleanPass }),
    });
    const data = await res.json().catch(() => ({}));
    const token = String(data?.access_token || "");
    if (!res.ok || !token) {
      return {
        error:
          data?.error_description ||
          data?.msg ||
          data?.message ||
          "Invalid Admin email or password.",
      };
    }

    localStorage.removeItem("fahi_admin_password");
    localStorage.setItem("fahi_admin_logged_in", "true");
    localStorage.setItem("fahi_admin_username", cleanEmail);
    localStorage.setItem(ADMIN_SUPABASE_TOKEN_KEY, token);

    const adminUser: FahiUser = {
      id: data.user?.id || "super-admin",
      email: data.user?.email || cleanEmail,
      name: data.user?.user_metadata?.full_name || "CEO — Aura Agentic AI",
      accessToken: token,
      refreshToken: data.refresh_token,
      provider: "admin",
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(adminUser));
    upsertAdminUserRecord(adminUser, true, false);
    window.dispatchEvent(
      new CustomEvent("fahi-admin-login-change", { detail: { isLoggedIn: true } })
    );
    window.dispatchEvent(
      new CustomEvent("fahi-user-auth-change", { detail: { user: adminUser } })
    );
    return { user: adminUser, accessToken: token };
  } catch (err: any) {
    return { error: err?.message || "Could not verify admin session with Supabase." };
  }
}

export async function updateAdminSupabasePassword(
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (typeof window === "undefined") {
    return { success: false, error: "Browser session required." };
  }
  const cleanPass = newPassword.trim();
  if (cleanPass.length < 8) {
    return { success: false, error: "Password must be at least 8 characters long." };
  }
  const token = await ensureAdminSupabaseSession();
  if (!token) {
    return { success: false, error: "Active Supabase Admin session required. Please log in again." };
  }
  const { supabaseUrl, supabaseAnonKey, isConfigured } = getSupabaseConfig();
  if (!isConfigured) {
    return { success: false, error: "Supabase Auth is not configured." };
  }
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ password: cleanPass }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        error: data?.msg || data?.message || data?.error_description || "Password update failed.",
      };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to reach Supabase Auth." };
  }
}

export async function ensureAdminSupabaseSession(
  email?: string,
  password?: string
): Promise<string | null> {
  if (typeof window === "undefined") return null;

  localStorage.removeItem("fahi_admin_password");

  const current = getCurrentUser();
  if (current?.accessToken && isAdminEmailAddress(current.email) && isJwtUnexpired(current.accessToken)) {
    localStorage.setItem(ADMIN_SUPABASE_TOKEN_KEY, current.accessToken);
    return current.accessToken;
  }

  if (email && password) {
    const authRes = await authenticateAdminWithSupabase(email, password);
    return authRes.accessToken || null;
  }

  const cachedToken = localStorage.getItem(ADMIN_SUPABASE_TOKEN_KEY) || "";
  if (cachedToken && isJwtUnexpired(cachedToken)) {
    return cachedToken;
  }

  return null;
}

export function clearAdminSupabaseToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(ADMIN_SUPABASE_TOKEN_KEY);
    localStorage.removeItem("fahi_admin_password");
  }
}

function cacheAdminUsersList(cleanUsers: AdminUserRecord[]): void {
  localStorage.setItem(ADMIN_USERS_INDEX_KEY, JSON.stringify(cleanUsers));
  const cloudBlocked = cleanUsers
    .filter((u) => u.isBlocked)
    .map((u) => u.email.toLowerCase());
  const localBlocked = getBlockedEmails().filter(
    (e) => !LEGACY_SEED_EMAILS.has(e.toLowerCase())
  );
  const mergedBlocked = Array.from(new Set([...cloudBlocked, ...localBlocked]));
  localStorage.setItem(BLOCKED_EMAILS_KEY, JSON.stringify(mergedBlocked));
}

function normalizeCloudUsersRows(rows: any[]): AdminUserRecord[] {
  return rows
    .filter(
      (r: any) =>
        r &&
        r.email &&
        !LEGACY_SEED_EMAILS.has(String(r.email).trim().toLowerCase())
    )
    .map((r: any, i: number) => {
      const email = String(r.email).trim().toLowerCase();
      return {
        id: r.id || `cloud_u_${i}`,
        name: r.name || "Creator",
        email,
        provider:
          email === DEFAULT_ADMIN_EMAIL.toLowerCase()
            ? "admin"
            : r.provider || "supabase",
        createdAt: r.created_at
          ? new Date(r.created_at).getTime()
          : typeof r.createdAt === "number"
            ? r.createdAt
            : Date.now(),
        lastActiveAt: r.last_active_at
          ? new Date(r.last_active_at).getTime()
          : typeof r.lastActiveAt === "number"
            ? r.lastActiveAt
            : Date.now(),
        loginCount: Number(r.login_count ?? r.loginCount) || 1,
        actionCount: Number(r.action_count ?? r.actionCount) || 0,
        isBlocked:
          email === DEFAULT_ADMIN_EMAIL.toLowerCase()
            ? false
            : Boolean(r.is_blocked ?? r.isBlocked),
      };
    });
}

function normalizeCloudEventsRows(rows: any[]): AdminAnalyticsEvent[] {
  return rows
    .filter(
      (r: any) =>
        r &&
        !LEGACY_SEED_EMAILS.has(
          String(r.user_email ?? r.userEmail ?? "").trim().toLowerCase()
        )
    )
    .map((r: any, i: number) => ({
      id: r.id || `cloud_e_${i}`,
      type: r.event_type || r.type || "tool_open",
      tool: r.tool || "home",
      title: r.title || r.action || "Studio Action",
      userEmail: r.user_email || r.userEmail || "guest@public-visitor",
      userName: r.user_name || r.userName || "Visitor",
      timestamp: r.created_at
        ? new Date(r.created_at).getTime()
        : typeof r.timestamp === "number"
          ? r.timestamp
          : Date.now(),
    }));
}

export async function fetchCloudAdminAnalytics(): Promise<{
  users?: AdminUserRecord[];
  events?: AdminAnalyticsEvent[];
}> {
  const { supabaseUrl, supabaseAnonKey, isConfigured } = getSupabaseConfig();
  if (!isConfigured || typeof window === "undefined") return {};

  try {
    const adminJwt = await ensureAdminSupabaseSession();
    if (adminJwt) {
      const apiRes = await fetch("/api/admin/analytics", {
        headers: { Authorization: `Bearer ${adminJwt}` },
        cache: "no-store",
      }).catch(() => null);
      if (apiRes && apiRes.ok) {
        const apiData = await apiRes.json().catch(() => null);
        if (apiData && Array.isArray(apiData.users) && Array.isArray(apiData.events)) {
          const cleanUsers = normalizeCloudUsersRows(apiData.users);
          const cleanEvents = normalizeCloudEventsRows(apiData.events);
          if (cleanUsers.length > 0) {
            cacheAdminUsersList(cleanUsers);
          }
          if (cleanEvents.length > 0) {
            localStorage.setItem(ADMIN_EVENTS_KEY, JSON.stringify(cleanEvents));
          }
          return { users: cleanUsers, events: cleanEvents };
        }
      }
    }

    const authToken = adminJwt || getCurrentUser()?.accessToken || supabaseAnonKey;
    const [usersRes, eventsRes] = await Promise.all([
      fetch(
        `${supabaseUrl}/rest/v1/fahi_user_profiles?select=*&order=last_active_at.desc&limit=500`,
        {
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${authToken}`,
          },
        }
      ),
      fetch(
        `${supabaseUrl}/rest/v1/fahi_analytics_events?select=*&order=created_at.desc&limit=1000`,
        {
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${authToken}`,
          },
        }
      ),
    ]);

    const result: { users?: AdminUserRecord[]; events?: AdminAnalyticsEvent[] } = {};
    if (usersRes.ok) {
      const rows = await usersRes.json();
      if (Array.isArray(rows) && (rows.length > 0 || Boolean(adminJwt))) {
        const cleanUsers = normalizeCloudUsersRows(rows);
        result.users = cleanUsers;
        cacheAdminUsersList(cleanUsers);
      }
    }
    if (eventsRes.ok) {
      const rows = await eventsRes.json();
      if (Array.isArray(rows) && (rows.length > 0 || Boolean(adminJwt))) {
        const cleanEvents = normalizeCloudEventsRows(rows);
        result.events = cleanEvents;
        localStorage.setItem(ADMIN_EVENTS_KEY, JSON.stringify(cleanEvents));
      }
    }
    return result;
  } catch {
    return {};
  }
}

export const DEFAULT_ADMIN_EMAIL = "ceo@auraajenticai.cloud";

export function getCurrentUser(): FahiUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as FahiUser;
      if (parsed && parsed.email) {
        if (isEmailBlocked(parsed.email)) {
          localStorage.removeItem(SESSION_STORAGE_KEY);
          return null;
        }
        return parsed;
      }
    }
    // Restore verified Admin session only when an unexpired Supabase Admin JWT is present
    const cachedToken = localStorage.getItem(ADMIN_SUPABASE_TOKEN_KEY) || "";
    if (
      localStorage.getItem("fahi_admin_logged_in") === "true" &&
      cachedToken &&
      isJwtUnexpired(cachedToken)
    ) {
      const adminUser =
        localStorage.getItem("fahi_admin_username") || DEFAULT_ADMIN_EMAIL;
      return {
        id: "super-admin",
        email: adminUser.includes("@") ? adminUser : DEFAULT_ADMIN_EMAIL,
        name: "CEO — Aura Agentic AI",
        accessToken: cachedToken,
        provider: "admin",
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function signUpWithSupabase(
  name: string,
  email: string,
  password: string
): Promise<{ user?: FahiUser; error?: string; requiresEmailConfirm?: boolean }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim() || cleanEmail.split("@")[0] || "Creator";
  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { error: "সঠিক ইমেইল অ্যাড্রেস দিন (Please enter a valid email)." };
  }
  if (!password || password.length < 6) {
    return { error: "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে (Password must be at least 6 characters)." };
  }
  if (isEmailBlocked(cleanEmail)) {
    return { error: "এই ইমেইল অ্যাড্রেসটি অ্যাডমিন দ্বারা রেস্ট্রিক্ট করা হয়েছে।" };
  }

  const { supabaseUrl, supabaseAnonKey, isConfigured } = getSupabaseConfig();

  if (isConfigured) {
    try {
      const res = await fetch(`${supabaseUrl}/auth/v1/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify({
          email: cleanEmail,
          password,
          data: { full_name: cleanName },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          error:
            data.msg ||
            data.error_description ||
            data.message ||
            "Account creation failed on Supabase.",
        };
      }

      const supaUser = data.user || data;
      const accessToken = data.access_token || "";
      const userObj: FahiUser = {
        id: supaUser.id || `supa_${Date.now()}`,
        email: supaUser.email || cleanEmail,
        name: supaUser.user_metadata?.full_name || cleanName,
        accessToken,
        provider: "supabase",
      };

      if (accessToken || supaUser.id) {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(userObj));
        upsertAdminUserRecord(userObj, true, false);
        window.dispatchEvent(new CustomEvent("fahi-user-auth-change", { detail: { user: userObj } }));
        return { user: userObj };
      }

      return { requiresEmailConfirm: true };
    } catch (err: any) {
      return { error: err?.message || "Could not connect to Supabase Auth." };
    }
  }

  // Fallback local account store when Supabase keys are not yet entered
  try {
    const users = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || "[]") as Array<{
      id: string;
      name: string;
      email: string;
      password: string;
      createdAt?: number;
    }>;
    if (users.some((u) => u.email === cleanEmail)) {
      return { error: "এই ইমেইল দিয়ে ইতিমধ্যে অ্যাকাউন্ট খোলা হয়েছে। অনুগ্রহ করে Sign In করুন।" };
    }
    const newUser = {
      id: `local_${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      password,
      createdAt: Date.now(),
    };
    users.push(newUser);
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));

    const sessionUser: FahiUser = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      provider: "local",
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionUser));
    upsertAdminUserRecord(sessionUser, true, false);
    window.dispatchEvent(new CustomEvent("fahi-user-auth-change", { detail: { user: sessionUser } }));
    return { user: sessionUser };
  } catch {
    return { error: "Failed to save local account." };
  }
}

export async function signInWithSupabase(
  email: string,
  password: string
): Promise<{ user?: FahiUser; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = password.trim();
  if (!cleanEmail || !cleanPass) {
    return { error: "ইমেইল এবং পাসওয়ার্ড উভয়ই দিন (Email and password are required)." };
  }
  if (isEmailBlocked(cleanEmail)) {
    return { error: "আপনার অ্যাকাউন্টটি অ্যাডমিন দ্বারা স্থগিত (Blocked) করা হয়েছে।" };
  }

  const { supabaseUrl, supabaseAnonKey, isConfigured } = getSupabaseConfig();

  if (isConfigured) {
    try {
      const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPass,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          error:
            data.error_description ||
            data.msg ||
            data.message ||
            "ইমেইল বা পাসওয়ার্ড সঠিক নয় (Invalid login credentials).",
        };
      }

      const supaUser = data.user || {};
      const authedEmail = (supaUser.email || cleanEmail).trim().toLowerCase();
      const isMasterAdmin = isAdminEmailAddress(authedEmail);
      const userObj: FahiUser = {
        id: supaUser.id || `supa_${Date.now()}`,
        email: authedEmail,
        name:
          supaUser.user_metadata?.full_name ||
          (isMasterAdmin ? "CEO — Aura Agentic AI" : cleanEmail.split("@")[0] || "Creator"),
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        provider: isMasterAdmin ? "admin" : "supabase",
      };
      localStorage.removeItem("fahi_admin_password");
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(userObj));
      if (isMasterAdmin && data.access_token) {
        localStorage.setItem("fahi_admin_logged_in", "true");
        localStorage.setItem("fahi_admin_username", authedEmail);
        localStorage.setItem(ADMIN_SUPABASE_TOKEN_KEY, data.access_token);
        window.dispatchEvent(
          new CustomEvent("fahi-admin-login-change", { detail: { isLoggedIn: true } })
        );
      }
      upsertAdminUserRecord(userObj, true, false);
      window.dispatchEvent(new CustomEvent("fahi-user-auth-change", { detail: { user: userObj } }));
      return { user: userObj };
    } catch (err: any) {
      return { error: err?.message || "Could not reach Supabase Auth server." };
    }
  }

  // Fallback local account check
  try {
    const users = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || "[]") as Array<{
      id: string;
      name: string;
      email: string;
      password: string;
    }>;
    const matched = users.find((u) => u.email === cleanEmail && u.password === cleanPass);
    if (!matched) {
      return {
        error:
          "অ্যাকাউন্ট পাওয়া যায়নি বা পাসওয়ার্ড ভুল। নতুন হলে আগে Create Account ট্যাবে গিয়ে রেজিস্ট্রেশন করুন।",
      };
    }
    const sessionUser: FahiUser = {
      id: matched.id,
      email: matched.email,
      name: matched.name,
      provider: "local",
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionUser));
    upsertAdminUserRecord(sessionUser, true, false);
    window.dispatchEvent(new CustomEvent("fahi-user-auth-change", { detail: { user: sessionUser } }));
    return { user: sessionUser };
  } catch {
    return { error: "Login failed." };
  }
}

export async function signOutUser(): Promise<void> {
  if (typeof window === "undefined") return;
  const current = getCurrentUser();
  const { supabaseUrl, supabaseAnonKey, isConfigured } = getSupabaseConfig();

  if (isConfigured && current?.accessToken) {
    try {
      await fetch(`${supabaseUrl}/auth/v1/logout`, {
        method: "POST",
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${current.accessToken}`,
        },
      });
    } catch {}
  }

  localStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem("fahi_admin_logged_in");
  localStorage.removeItem("fahi_admin_password");
  localStorage.removeItem(ADMIN_SUPABASE_TOKEN_KEY);
  window.dispatchEvent(new CustomEvent("fahi-user-auth-change", { detail: { user: null } }));
  window.dispatchEvent(new CustomEvent("fahi-admin-login-change", { detail: { isLoggedIn: false } }));
}

interface StoredPkceState {
  verifier: string;
  pendingTab: string | null;
  createdAt: number;
}

function readAndClearStoredPkce(): StoredPkceState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(OAUTH_PKCE_STORAGE_KEY);
    localStorage.removeItem(OAUTH_PKCE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPkceState;
    if (!parsed || Date.now() - Number(parsed.createdAt || 0) > 15 * 60 * 1000) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function signInWithGoogleOAuth(
  pendingTab?: string | null
): Promise<{ error?: string }> {
  if (typeof window === "undefined") {
    return { error: "Google sign-in requires a browser session." };
  }
  const { supabaseUrl, isConfigured } = getSupabaseConfig();
  if (!isConfigured) {
    return {
      error: "Supabase configuration is missing. Please configure Supabase URL and Anon Key first.",
    };
  }

  try {
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const hasSubtleCrypto =
      typeof window.crypto !== "undefined" && Boolean(window.crypto.subtle);

    let codeChallenge: string | undefined;
    let verifier = "";
    if (hasSubtleCrypto) {
      verifier = generateCodeVerifier(48);
      codeChallenge = await createPkceChallenge(verifier);
    }

    const pkceState: StoredPkceState = {
      verifier,
      pendingTab: pendingTab || null,
      createdAt: Date.now(),
    };
    localStorage.setItem(OAUTH_PKCE_STORAGE_KEY, JSON.stringify(pkceState));

    const authUrl = buildSupabaseGoogleAuthorizeUrl({
      supabaseUrl,
      redirectTo,
      codeChallenge,
    });
    window.location.assign(authUrl);
    return {};
  } catch (err: any) {
    return {
      error:
        err?.message ||
        "গুগল লগইন শুরু করা যায়নি (Unable to start Google sign-in).",
    };
  }
}

export async function handleOAuthCallbackOnLoad(): Promise<{
  user?: FahiUser;
  pendingTab?: string | null;
  error?: string;
} | null> {
  if (typeof window === "undefined") return null;

  let parsed;
  try {
    parsed = parseOAuthCallbackUrl(window.location.href);
  } catch {
    return null;
  }
  if (parsed.kind === "none") return null;

  try {
    window.history.replaceState({}, document.title, parsed.cleanUrl);
  } catch {
    // ignore history replace restrictions
  }

  const storedPkce = readAndClearStoredPkce();
  const pendingTab = storedPkce?.pendingTab || null;

  if (parsed.kind === "error") {
    const rawErr = parsed.errorMessage || "Google sign-in was cancelled or denied.";
    const isStaleStateError =
      parsed.errorCode === "bad_oauth_state" ||
      /state not found|expired/i.test(rawErr);
    if (isStaleStateError) {
      const existingUser = getCurrentUser();
      if (existingUser?.email && existingUser?.accessToken) {
        return { user: existingUser, pendingTab };
      }
    }
    return {
      error: formatOAuthErrorMessage(rawErr, parsed.errorCode),
      pendingTab,
    };
  }

  const { supabaseUrl, supabaseAnonKey, isConfigured } = getSupabaseConfig();
  if (!isConfigured) {
    return {
      error: "Supabase configuration missing while completing Google sign-in.",
      pendingTab,
    };
  }

  try {
    let payload: Record<string, any> | null = null;

    if (parsed.kind === "pkce" && parsed.code) {
      if (!storedPkce?.verifier) {
        return {
          error: "গুগল সাইন-ইন সেশন মেয়াদোত্তীর্ণ হয়েছে, অনুগ্রহ করে আবার Continue with Google চাপুন।",
          pendingTab,
        };
      }
      const tokenRes = await fetch(
        `${supabaseUrl}/auth/v1/token?grant_type=pkce`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseAnonKey,
          },
          body: JSON.stringify({
            auth_code: parsed.code,
            code_verifier: storedPkce.verifier,
          }),
        }
      );
      const tokenJson = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok) {
        return {
          error:
            tokenJson?.error_description ||
            tokenJson?.msg ||
            tokenJson?.message ||
            "Google authentication token exchange failed.",
          pendingTab,
        };
      }
      payload = tokenJson;
    } else if (parsed.kind === "implicit" && parsed.accessToken) {
      const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${parsed.accessToken}`,
        },
      });
      const userJson = await userRes.json().catch(() => ({}));
      if (!userRes.ok) {
        return {
          error:
            userJson?.msg ||
            userJson?.message ||
            "Could not verify Google user session with Supabase.",
          pendingTab,
        };
      }
      payload = {
        user: userJson,
        access_token: parsed.accessToken,
        refresh_token: parsed.refreshToken,
      };
    }

    const savedAdminEmail = (
      localStorage.getItem("fahi_admin_username") || DEFAULT_ADMIN_EMAIL
    )
      .trim()
      .toLowerCase();

    const normalized = extractSupabaseOAuthUser(
      payload,
      (em) =>
        em.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase() ||
        em.toLowerCase() === savedAdminEmail
    );

    if (!normalized) {
      return {
        error: "Google account email could not be verified from Supabase.",
        pendingTab,
      };
    }

    if (isEmailBlocked(normalized.email)) {
      if (normalized.accessToken) {
        fetch(`${supabaseUrl}/auth/v1/logout`, {
          method: "POST",
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${normalized.accessToken}`,
          },
        }).catch(() => {});
      }
      return {
        error: "আপনার অ্যাকাউন্টটি অ্যাডমিন দ্বারা স্থগিত (Blocked) করা হয়েছে।",
        pendingTab,
      };
    }

    const sessionUser: FahiUser = {
      id: normalized.id,
      email: normalized.email,
      name: normalized.name,
      accessToken: normalized.accessToken,
      refreshToken: normalized.refreshToken,
      avatarUrl: normalized.avatarUrl,
      authMethod: normalized.authMethod,
      provider: normalized.provider,
    };

    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionUser));
    if (normalized.provider === "admin") {
      localStorage.setItem("fahi_admin_logged_in", "true");
      localStorage.setItem("fahi_admin_username", normalized.email);
      if (normalized.accessToken) {
        localStorage.setItem(ADMIN_SUPABASE_TOKEN_KEY, normalized.accessToken);
      }
      window.dispatchEvent(
        new CustomEvent("fahi-admin-login-change", {
          detail: { isLoggedIn: true },
        })
      );
    }
    upsertAdminUserRecord(sessionUser, true, false);
    window.dispatchEvent(
      new CustomEvent("fahi-user-auth-change", { detail: { user: sessionUser } })
    );
    return { user: sessionUser, pendingTab };
  } catch (err: any) {
    return {
      error:
        err?.message ||
        "গুগল লগইন সম্পন্ন করতে সমস্যা হয়েছে (Google OAuth error).",
      pendingTab,
    };
  }
}

export async function saveProjectToCloud(
  projectData: Record<string, unknown>
): Promise<{ success: boolean; id?: string; error?: string }> {
  const { supabaseUrl, supabaseAnonKey, isConfigured } = getSupabaseConfig();
  const current = getCurrentUser();

  if (!isConfigured) {
    try {
      localStorage.setItem("fahi_cloud_project_draft", JSON.stringify(projectData));
      return { success: true, id: "local_draft" };
    } catch {
      return { success: false, error: "Local storage limit reached." };
    }
  }

  try {
    const authToken = current?.accessToken || supabaseAnonKey;
    const response = await fetch(`${supabaseUrl}/rest/v1/video_projects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${authToken}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        project_data: projectData,
        updated_at: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Supabase Error: ${errText}`);
    }

    const data = await response.json();
    return { success: true, id: data[0]?.id || "cloud_project" };
  } catch (err: any) {
    console.warn("Supabase Cloud Sync Warning:", err.message);
    localStorage.setItem("fahi_cloud_project_draft", JSON.stringify(projectData));
    return { success: true, id: "local_draft_fallback" };
  }
}

export async function loadProjectFromCloud(): Promise<Record<string, unknown> | null> {
  const { supabaseUrl, supabaseAnonKey, isConfigured } = getSupabaseConfig();
  const current = getCurrentUser();

  if (!isConfigured) {
    const localDraft = localStorage.getItem("fahi_cloud_project_draft");
    return localDraft ? JSON.parse(localDraft) : null;
  }

  try {
    const authToken = current?.accessToken || supabaseAnonKey;
    const response = await fetch(
      `${supabaseUrl}/rest/v1/video_projects?select=*&order=updated_at.desc&limit=1`,
      {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    if (!response.ok) throw new Error("Failed to fetch cloud project.");
    const data = await response.json();
    if (data && data.length > 0) {
      return data[0].project_data;
    }
  } catch (err) {
    console.warn("Cloud load failed, falling back to local:", err);
  }

  const localDraft = localStorage.getItem("fahi_cloud_project_draft");
  return localDraft ? JSON.parse(localDraft) : null;
}
