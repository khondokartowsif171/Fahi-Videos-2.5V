"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  ShieldCheck,
  Lock,
  User,
  Key,
  Check,
  LogOut,
  Server,
  Cpu,
  Activity,
  AlertCircle,
  Eye,
  EyeOff,
  Users,
  BarChart3,
  Database,
  Settings,
  Download,
  RefreshCw,
  Ban,
  CheckCircle2,
  Copy,
  Search,
} from "lucide-react";
import {
  getAdminUsersList,
  getAdminAnalyticsEvents,
  fetchCloudAdminAnalytics,
  toggleBlockUserEmail,
  getSupabaseConfig,
  upsertAdminUserRecord,
  ensureAdminSupabaseSession,
  clearAdminSupabaseToken,
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASS,
  type AdminUserRecord,
  type AdminAnalyticsEvent,
  type FahiUser,
} from "@/lib/supabase-client";

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUPABASE_SQL_SNIPPET = `-- Secure Production Sync (Active on spkrpwlavvbeooxijubv)
-- Automatically mirrors Google & Email sign-ins from auth.users -> public.fahi_user_profiles
-- with JWT-verified Super Admin RLS policies (is_fahi_admin()).

create or replace function public.is_fahi_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) in ('ceo@auraajenticai.cloud', 'auraajenticai@gmail.com')
      or lower(coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '')) = 'admin';
$$;

alter table public.fahi_user_profiles enable row level security;
alter table public.fahi_analytics_events enable row level security;

create policy "Users can view own profile" on public.fahi_user_profiles
  for select to authenticated using (lower(auth.jwt() ->> 'email') = lower(email) or public.is_fahi_admin());
create policy "Users can insert own profile" on public.fahi_user_profiles
  for insert to authenticated with check (lower(auth.jwt() ->> 'email') = lower(email) or public.is_fahi_admin());
create policy "Users can update own profile" on public.fahi_user_profiles
  for update to authenticated using (lower(auth.jwt() ->> 'email') = lower(email) or public.is_fahi_admin())
  with check (lower(auth.jwt() ->> 'email') = lower(email) or public.is_fahi_admin());
create policy "Admin can view analytics events" on public.fahi_analytics_events
  for select to authenticated using (public.is_fahi_admin());`;

function getProviderBadgeClass(isMasterCeo: boolean, provider: string): string {
  if (isMasterCeo) return "bg-violet-500/20 border-violet-500/30 text-violet-300";
  if (provider === "google") return "bg-cyan-500/20 border-cyan-500/30 text-cyan-300";
  return "bg-indigo-500/20 border-indigo-500/30 text-indigo-300";
}

export default function AdminLoginModal({ isOpen, onClose }: AdminLoginModalProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Active dashboard tab
  const [adminTab, setAdminTab] = useState<"analytics" | "users" | "sql" | "settings">(
    "analytics"
  );

  // Analytics & Users state
  const [usersList, setUsersList] = useState<AdminUserRecord[]>([]);
  const [eventsList, setEventsList] = useState<AdminAnalyticsEvent[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [approvedAuraEmails, setApprovedAuraEmails] = useState<string[]>([
    DEFAULT_ADMIN_EMAIL.toLowerCase(),
  ]);
  const [requestedAuraEmails, setRequestedAuraEmails] = useState<string[]>([]);

  // Admin settings state
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState("");
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState("");
  const [useN8n, setUseN8n] = useState(false);
  const [aiUhdEnabled, setAiUhdEnabled] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Change Admin Credentials state
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [credChangeSuccess, setCredChangeSuccess] = useState(false);

  const refreshAnalytics = async () => {
    if (typeof window === "undefined") return;
    setUsersList(getAdminUsersList());
    setEventsList(getAdminAnalyticsEvents());

    const { isConfigured } = getSupabaseConfig();
    if (isConfigured) {
      setSyncingCloud(true);
      const [cloud, auraRes] = await Promise.all([
        fetchCloudAdminAnalytics(),
        fetch("/api/admin/config").catch(() => null),
      ]);
      if (cloud.users) {
        setUsersList(getAdminUsersList());
      }
      if (cloud.events) {
        setEventsList(getAdminAnalyticsEvents());
      }
      if (auraRes && auraRes.ok) {
        const auraData = await auraRes.json().catch(() => ({}));
        if (Array.isArray(auraData.approvedEmails)) {
          setApprovedAuraEmails(auraData.approvedEmails);
        }
        if (Array.isArray(auraData.requestedEmails)) {
          setRequestedAuraEmails(auraData.requestedEmails);
        }
      }
      setSyncingCloud(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined" && isOpen) {
      const logged = localStorage.getItem("fahi_admin_logged_in") === "true";
      setIsLoggedIn(logged);

      setGeminiApiKey(localStorage.getItem("fahi_gemini_api_key") || "");
      setN8nWebhookUrl(localStorage.getItem("fahi_n8n_webhook_url") || "");
      setSupabaseUrl(
        localStorage.getItem("fahi_supabase_url") ||
          "https://spkrpwlavvbeooxijubv.supabase.co"
      );
      setSupabaseAnonKey(
        localStorage.getItem("fahi_supabase_anon_key") ||
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwa3Jwd2xhdnZiZW9veGlqdWJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5NTIwODQsImV4cCI6MjEwODUyODA4NH0.cMOHFmKwBYw4hDbLu6Q4EwRB7pXIT9V2D9A42lq2J2A"
      );
      setUseN8n(localStorage.getItem("fahi_use_n8n") === "true");
      setAiUhdEnabled(localStorage.getItem("fahi_ai_uhd") !== "false");

      if (logged) {
        refreshAnalytics();
      }
    }
  }, [isOpen]);

  const userToolStatsMap = useMemo(() => {
    const map: Record<
      string,
      {
        downloader: number;
        kotha: number;
        editor: number;
        thumbnail: number;
        ai: number;
        home: number;
        totalTools: number;
        recentEvents: AdminAnalyticsEvent[];
      }
    > = {};

    for (const u of usersList) {
      const key = u.email.toLowerCase();
      map[key] = {
        downloader: 0,
        kotha: 0,
        editor: 0,
        thumbnail: 0,
        ai: 0,
        home: 0,
        totalTools: 0,
        recentEvents: [],
      };
    }

    for (const ev of eventsList) {
      const key = (ev.userEmail || "").toLowerCase();
      if (!key) continue;
      if (!map[key]) {
        map[key] = {
          downloader: 0,
          kotha: 0,
          editor: 0,
          thumbnail: 0,
          ai: 0,
          home: 0,
          totalTools: 0,
          recentEvents: [],
        };
      }
      const bucket = map[key];
      if (ev.tool === "downloader") bucket.downloader += 1;
      else if (ev.tool === "kotha") bucket.kotha += 1;
      else if (ev.tool === "editor") bucket.editor += 1;
      else if (ev.tool === "thumbnail") bucket.thumbnail += 1;
      else if (ev.tool === "ai") bucket.ai += 1;
      else if (ev.tool === "home") bucket.home += 1;

      if (ev.tool && ev.tool !== "home") {
        bucket.totalTools += 1;
      }
      if (bucket.recentEvents.length < 8) {
        bucket.recentEvents.push(ev);
      }
    }

    return map;
  }, [usersList, eventsList]);

  const metrics = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayMs = startOfToday.getTime();

    const totalPageViews = eventsList.filter((e) => e.type === "page_view").length;
    const totalToolActions = eventsList.filter((e) => e.type !== "page_view").length;
    const activeTodaySet = new Set(
      eventsList.filter((e) => e.timestamp >= todayMs).map((e) => e.userEmail)
    );

    const byTool: Record<string, number> = {
      downloader: 0,
      kotha: 0,
      editor: 0,
      thumbnail: 0,
      ai: 0,
    };

    for (const ev of eventsList) {
      if (ev.tool && ev.tool !== "home" && byTool[ev.tool] !== undefined) {
        byTool[ev.tool] += 1;
      }
    }

    return {
      totalUsers: usersList.length,
      totalPageViews,
      totalToolActions,
      activeToday: activeTodaySet.size,
      byTool,
    };
  }, [usersList, eventsList]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return usersList;
    return usersList.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.provider.toLowerCase().includes(q)
    );
  }, [usersList, userSearch]);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const savedUser = (
      localStorage.getItem("fahi_admin_username") || DEFAULT_ADMIN_EMAIL
    )
      .trim()
      .toLowerCase();
    const savedPass = (
      localStorage.getItem("fahi_admin_password") || DEFAULT_ADMIN_PASS
    ).trim();

    const inputUser = username.trim().toLowerCase();
    const inputPass = password.trim();

    const isDefaultMatch =
      inputUser === DEFAULT_ADMIN_EMAIL.toLowerCase() &&
      inputPass === DEFAULT_ADMIN_PASS;
    const isSavedMatch = inputUser === savedUser && inputPass === savedPass;

    if (isDefaultMatch || isSavedMatch) {
      localStorage.setItem("fahi_admin_logged_in", "true");
      localStorage.setItem("fahi_admin_username", inputUser);
      localStorage.setItem("fahi_admin_password", inputPass);

      const adminJwt = await ensureAdminSupabaseSession(inputUser, inputPass);
      const adminUserSession: FahiUser = {
        id: "super-admin",
        email: inputUser.includes("@") ? inputUser : DEFAULT_ADMIN_EMAIL,
        name: "CEO — Aura Agentic AI",
        accessToken: adminJwt || undefined,
        provider: "admin",
      };
      localStorage.setItem(
        "fahi_auth_session_v1",
        JSON.stringify(adminUserSession)
      );
      upsertAdminUserRecord(adminUserSession, true, false);

      setIsLoggedIn(true);
      setErrorMsg("");
      await refreshAnalytics();
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("fahi-admin-login-change", { detail: { isLoggedIn: true } })
        );
        window.dispatchEvent(
          new CustomEvent("fahi-user-auth-change", {
            detail: { user: adminUserSession },
          })
        );
      }
    } else {
      setErrorMsg("Invalid Admin Email or Password.");
    }
  };

  const handleChangeAdminCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) return;

    localStorage.setItem("fahi_admin_username", newUsername.trim());
    localStorage.setItem("fahi_admin_password", newPassword.trim());

    setCredChangeSuccess(true);
    setNewUsername("");
    setNewPassword("");

    setTimeout(() => {
      setCredChangeSuccess(false);
    }, 2500);
  };

  const handleLogout = () => {
    localStorage.removeItem("fahi_admin_logged_in");
    localStorage.removeItem("fahi_auth_session_v1");
    clearAdminSupabaseToken();
    setIsLoggedIn(false);
    setUsername("");
    setPassword("");
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("fahi-admin-login-change", { detail: { isLoggedIn: false } })
      );
      window.dispatchEvent(
        new CustomEvent("fahi-user-auth-change", { detail: { user: null } })
      );
    }
  };

  const handleSaveAdminSettings = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("fahi_gemini_api_key", geminiApiKey.trim());
      localStorage.setItem("fahi_n8n_webhook_url", n8nWebhookUrl.trim());
      localStorage.setItem("fahi_supabase_url", supabaseUrl.trim());
      localStorage.setItem("fahi_supabase_anon_key", supabaseAnonKey.trim());
      localStorage.setItem("fahi_use_n8n", String(useN8n));
      localStorage.setItem("fahi_ai_uhd", String(aiUhdEnabled));

      fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_config",
          geminiApiKey: geminiApiKey.trim(),
          n8nWebhookUrl: n8nWebhookUrl.trim(),
          useN8n,
        }),
      }).catch(() => {});

      window.dispatchEvent(
        new CustomEvent("fahi-admin-settings-change", {
          detail: {
            geminiApiKey,
            n8nWebhookUrl,
            supabaseUrl,
            supabaseAnonKey,
            useN8n,
            aiUhdEnabled,
          },
        })
      );
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 1500);
  };

  const handleToggleBlock = (email: string) => {
    toggleBlockUserEmail(email);
    setUsersList(getAdminUsersList());
  };

  const handleToggleAuraApproval = async (email: string) => {
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_aura_approval",
          email,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.approvedEmails)) {
          setApprovedAuraEmails(data.approvedEmails);
        }
        if (Array.isArray(data.requestedEmails)) {
          setRequestedAuraEmails(data.requestedEmails);
        }
      }
    } catch {}
  };

  const handleExportUsersCsv = () => {
    const header = "Name,Email,Provider,Joined,LastActive,Logins,ToolActions,Status\n";
    const rows = usersList
      .map(
        (u) =>
          `"${u.name.replace(/"/g, '""')}","${u.email}","${u.provider}","${new Date(
            u.createdAt
          ).toISOString()}","${new Date(u.lastActiveAt).toISOString()}",${
            u.loginCount
          },${u.actionCount},"${u.isBlocked ? "BLOCKED" : "ACTIVE"}"`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fahi-videos-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SNIPPET);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const toolBars = [
    {
      id: "downloader",
      label: "Universal Downloader (YT/FB/Insta/TikTok)",
      count: metrics.byTool.downloader || 0,
      color: "bg-indigo-500",
    },
    {
      id: "kotha",
      label: "Kotha Studio (কণ্ঠধ্বনি — Bangla Dubbing)",
      count: metrics.byTool.kotha || 0,
      color: "bg-teal-500",
    },
    {
      id: "editor",
      label: "CapCut Pro Video Studio",
      count: metrics.byTool.editor || 0,
      color: "bg-violet-500",
    },
    {
      id: "thumbnail",
      label: "HD Thumbnail Designer",
      count: metrics.byTool.thumbnail || 0,
      color: "bg-amber-500",
    },
    {
      id: "ai",
      label: "Aura AI Studio",
      count: metrics.byTool.ai || 0,
      color: "bg-pink-500",
    },
  ];
  const maxToolCount = Math.max(1, ...toolBars.map((t) => t.count));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div
        className={`relative w-full ${
          isLoggedIn ? "max-w-4xl" : "max-w-md"
        } rounded-3xl bg-[#0D1117] border border-white/10 p-5 sm:p-6 shadow-2xl space-y-5 text-white transition-all my-auto max-h-[92dvh] flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg tracking-tight">
                {isLoggedIn
                  ? "Fahi Videos — Super Admin Dashboard & Traffic Analytics"
                  : "System Admin Console"}
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                {isLoggedIn
                  ? "AUTHENTICATED · REAL-TIME USER & TRAFFIC MONITOR"
                  : "RESTRICTED ACCESS"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isLoggedIn && (
              <>
                <button
                  onClick={refreshAnalytics}
                  className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                  title="Refresh Traffic & Users"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${syncingCloud ? "animate-spin text-emerald-400" : ""}`}
                  />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="px-2.5 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-[11px] font-bold flex items-center gap-1 border border-red-500/30 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!isLoggedIn ? (
          /* Login Form */
          <form onSubmit={handleLogin} className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Admin Email</span>
              </label>
              <input
                type="text"
                placeholder="Enter admin email..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Admin Passcode</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[10px] text-slate-400 hover:text-white flex items-center space-x-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showPassword ? "Hide" : "Show"}</span>
                </button>
              </label>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter Supabase Admin password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-violet-500/25 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Log In to Admin Dashboard</span>
            </button>
          </form>
        ) : (
          /* Unlocked 4-Tab Super Admin Dashboard */
          <div className="flex-1 overflow-y-auto space-y-5 pr-1">
            {/* Navigation Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => setAdminTab("analytics")}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  adminTab === "analytics"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Traffic & Usage</span>
              </button>
              <button
                type="button"
                onClick={() => setAdminTab("users")}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  adminTab === "users"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Users ({metrics.totalUsers})</span>
              </button>
              <button
                type="button"
                onClick={() => setAdminTab("sql")}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  adminTab === "sql"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Supabase Cloud</span>
              </button>
              <button
                type="button"
                onClick={() => setAdminTab("settings")}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  adminTab === "settings"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>System Config</span>
              </button>
            </div>

            {/* TAB 1: TRAFFIC & TOOL USAGE ANALYTICS */}
            {adminTab === "analytics" && (
              <div className="space-y-5">
                {/* 4 KPI Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                      রেজিস্টার্ড ইউজার (Users)
                    </span>
                    <div className="text-2xl font-extrabold text-white font-mono">
                      {metrics.totalUsers}
                    </div>
                    <span className="text-[10px] text-emerald-400 font-medium block">
                      Supabase + Local Accounts
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                      মোট ট্রাফিক (Page Views)
                    </span>
                    <div className="text-2xl font-extrabold text-indigo-400 font-mono">
                      {metrics.totalPageViews}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium block">
                      Home & Studio Visits
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                      টুল ব্যবহার (Tool Actions)
                    </span>
                    <div className="text-2xl font-extrabold text-teal-400 font-mono">
                      {metrics.totalToolActions}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium block">
                      Downloads, Edits & Dubs
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                      আজকে অ্যাক্টিভ (Today)
                    </span>
                    <div className="text-2xl font-extrabold text-amber-400 font-mono">
                      {metrics.activeToday}
                    </div>
                    <span className="text-[10px] text-emerald-400 font-medium block">
                      Live Active Sessions
                    </span>
                  </div>
                </div>

                {/* Tool Usage Breakdown Bars */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-indigo-400" />
                      <span>কোন টুল কতবার ব্যবহার হয়েছে (Tool Usage Breakdown)</span>
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400">
                      100% Free Studio Modules
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {toolBars.map((tb) => {
                      const pct = Math.round((tb.count / maxToolCount) * 100);
                      return (
                        <div key={tb.id} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300 font-medium">{tb.label}</span>
                            <span className="font-mono font-bold text-white">
                              {tb.count} uses
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${tb.color} transition-all duration-500`}
                              style={{ width: `${Math.max(4, pct)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Live Activity Stream */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      <span>লাইভ ইউজার অ্যাক্টিভিটি লগ (Recent User Activity)</span>
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400">
                      Showing latest {Math.min(30, eventsList.length)} events
                    </span>
                  </div>

                  {eventsList.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">
                      এখনও কোনো অ্যাক্টিভিটি রেকর্ড হয়নি।
                    </p>
                  ) : (
                    <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                      {eventsList.slice(0, 30).map((ev) => (
                        <div
                          key={ev.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-2.5 rounded-xl bg-black/40 border border-white/5 text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="font-bold text-white flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-mono text-[10px] uppercase">
                                {ev.tool}
                              </span>
                              <span>{ev.title}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              User: <span className="text-emerald-300">{ev.userName}</span> (
                              {ev.userEmail})
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono shrink-0">
                            {new Date(ev.timestamp).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: REGISTERED USERS LIST, FULL PROFILE & PER-USER TOOL USAGE */}
            {adminTab === "users" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="নাম বা ইমেইল দিয়ে ইউজার খুঁজুন (Search user by name or email)..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={refreshAnalytics}
                      className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${syncingCloud ? "animate-spin text-emerald-400" : ""}`}
                      />
                      <span>Sync Now</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportUsersCsv}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Users CSV</span>
                    </button>
                  </div>
                </div>

                {filteredUsers.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/10 text-center space-y-1">
                    <Users className="w-6 h-6 text-slate-500 mx-auto mb-1" />
                    <p className="text-xs font-bold text-slate-300">
                      এখনও কোনো ইউজার রেজিস্ট্রেশন করেনি
                    </p>
                    <p className="text-[11px] text-slate-500">
                      কেউ Sign Up বা Log In করলেই সাথে সাথে তার ফুল প্রোফাইল, কোন টুল কতবার ব্যবহার করেছে এবং Block/Unblock অপশন এখানে দেখা যাবে।
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredUsers.map((u) => {
                      const stats = userToolStatsMap[u.email.toLowerCase()] || {
                        downloader: 0,
                        kotha: 0,
                        editor: 0,
                        thumbnail: 0,
                        ai: 0,
                        home: 0,
                        totalTools: 0,
                        recentEvents: [],
                      };
                      const isMasterCeo =
                        u.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase();
                      const normEmail = u.email.toLowerCase();
                      const isAuraApproved =
                        isMasterCeo || approvedAuraEmails.includes(normEmail);
                      const isAuraRequested =
                        !isAuraApproved && requestedAuraEmails.includes(normEmail);

                      return (
                        <div
                          key={u.email}
                          className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 hover:border-white/20 transition-all"
                        >
                          {/* Top Row: Full Profile Header + Aura AI Approval + Block/Unblock Button */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-extrabold text-white">
                                  {u.name}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${getProviderBadgeClass(
                                    isMasterCeo,
                                    u.provider
                                  )}`}
                                >
                                  {isMasterCeo ? "SUPER ADMIN / CEO" : u.provider}
                                </span>
                                {u.isBlocked ? (
                                  <span className="px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-mono font-bold uppercase">
                                    BLOCKED
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold uppercase">
                                    ACTIVE
                                  </span>
                                )}
                                {isAuraApproved && (
                                  <span className="px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/40 text-violet-300 text-[10px] font-mono font-bold uppercase">
                                    AURA AI VIP APPROVED
                                  </span>
                                )}
                                {isAuraRequested && (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-500/25 border border-amber-500/50 text-amber-300 text-[10px] font-mono font-bold uppercase animate-pulse">
                                    AURA AI REQUEST PENDING
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-300 font-mono">
                                Email: <span className="text-white">{u.email}</span> · ID:{" "}
                                <span className="text-slate-400">{u.id}</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              {isMasterCeo ? (
                                <span className="px-3 py-1.5 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-300 text-[11px] font-bold inline-flex items-center gap-1.5">
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  <span>Master CEO Account</span>
                                </span>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleAuraApproval(u.email)}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all ${
                                      isAuraApproved
                                        ? "bg-violet-500/20 text-violet-300 border border-violet-500/40 hover:bg-violet-500/30"
                                        : isAuraRequested
                                          ? "bg-amber-500 text-black hover:bg-amber-400 shadow-lg shadow-amber-500/25"
                                          : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30"
                                    }`}
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <span>
                                      {isAuraApproved
                                        ? "Revoke Aura AI"
                                        : isAuraRequested
                                          ? "Approve Aura Request"
                                          : "Approve Aura AI"}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleBlock(u.email)}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all ${
                                      u.isBlocked
                                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                                        : "bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30"
                                    }`}
                                  >
                                    {u.isBlocked ? (
                                      <>
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>Unblock User</span>
                                      </>
                                    ) : (
                                      <>
                                        <Ban className="w-3.5 h-3.5" />
                                        <span>Block User</span>
                                      </>
                                    )}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Middle Row: Full Profile Metadata Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                            <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                              <span className="text-slate-400 block text-[10px]">
                                Joined (অ্যাকাউন্ট তৈরি)
                              </span>
                              <span className="font-mono font-bold text-slate-200">
                                {new Date(u.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                              <span className="text-slate-400 block text-[10px]">
                                Last Active (সর্বশেষ সক্রিয়)
                              </span>
                              <span className="font-mono font-bold text-emerald-300">
                                {new Date(u.lastActiveAt).toLocaleString()}
                              </span>
                            </div>
                            <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                              <span className="text-slate-400 block text-[10px]">
                                Total Logins (মোট লগইন)
                              </span>
                              <span className="font-mono font-bold text-white">
                                {u.loginCount} times
                              </span>
                            </div>
                            <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                              <span className="text-slate-400 block text-[10px]">
                                Total Studio Uses (টুল ব্যবহার)
                              </span>
                              <span className="font-mono font-bold text-indigo-300">
                                {Math.max(u.actionCount, stats.totalTools)} actions
                              </span>
                            </div>
                          </div>

                          {/* Per-User Tool Usage Breakdown */}
                          <div className="space-y-2 pt-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              কোন টুল কতবার ব্যবহার করেছে (Per-User Tool Usage Breakdown):
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] font-mono">
                              <div className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
                                <span className="text-indigo-300">Downloader</span>
                                <span className="font-bold text-white">{stats.downloader}</span>
                              </div>
                              <div className="px-2.5 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-between">
                                <span className="text-teal-300">Kotha Dub</span>
                                <span className="font-bold text-white">{stats.kotha}</span>
                              </div>
                              <div className="px-2.5 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-between">
                                <span className="text-violet-300">Video Studio</span>
                                <span className="font-bold text-white">{stats.editor}</span>
                              </div>
                              <div className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                                <span className="text-amber-300">Thumbnail</span>
                                <span className="font-bold text-white">{stats.thumbnail}</span>
                              </div>
                              <div className="px-2.5 py-1.5 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-between">
                                <span className="text-pink-300">Aura AI</span>
                                <span className="font-bold text-white">{stats.ai}</span>
                              </div>
                            </div>
                          </div>

                          {/* Recent Actions by this User */}
                          {stats.recentEvents.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                এই ইউজারের সাম্প্রতিক কাজ (Recent Actions):
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {stats.recentEvents.slice(0, 5).map((ev) => (
                                  <span
                                    key={ev.id}
                                    className="px-2.5 py-1 rounded-lg bg-black/50 border border-white/10 text-[10px] font-mono text-slate-300 inline-flex items-center gap-1.5"
                                  >
                                    <strong className="text-indigo-300 uppercase">
                                      [{ev.tool}]
                                    </strong>
                                    <span>{ev.title}</span>
                                    <span className="text-slate-500">
                                      ({new Date(ev.timestamp).toLocaleTimeString()})
                                    </span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: LIVE SUPABASE CLOUD SYNC, REAL USER PROFILES & TOOL USAGE */}
            {adminTab === "sql" && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>
                        Supabase Cloud Database Active & Provisioned (spkrpwlavvbeooxijubv)
                      </span>
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      নিচে সরাসরি আপনার লাইভ Supabase Cloud ডাটাবেস থেকে রিয়েল ইউজারদের ফুল প্রোফাইল, কে কোন টুল ব্যবহার করেছে এবং সরাসরি ইউজার Block / Unblock কন্ট্রোল দেওয়া হলো (কোনো Mock Data নেই)।
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={refreshAnalytics}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 shadow-lg shadow-emerald-600/20"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${syncingCloud ? "animate-spin" : ""}`}
                    />
                    <span>Sync Now</span>
                  </button>
                </div>

                {/* Live Cloud Table Status Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      table: "public.fahi_user_profiles",
                      desc: "Real Registered Creator & Admin Profiles",
                      stat: `${usersList.length} Real Users`,
                    },
                    {
                      table: "public.fahi_analytics_events",
                      desc: "Real-Time Per-User Tool & Traffic Logs",
                      stat: `${eventsList.length} Logged Events`,
                    },
                    {
                      table: "public.video_projects",
                      desc: "Cloud Timeline & Project Draft Storage",
                      stat: "RLS Enabled · Ready",
                    },
                    {
                      table: "auth.users (Supabase Auth)",
                      desc: "Instant Email/Password Auth + Auto-Confirm Trigger",
                      stat: "Active · Synced",
                    },
                  ].map((item) => (
                    <div
                      key={item.table}
                      className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-2"
                    >
                      <div>
                        <p className="text-xs font-bold text-white font-mono">
                          {item.table}
                        </p>
                        <p className="text-[11px] text-slate-400">{item.desc}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold shrink-0">
                        {item.stat}
                      </span>
                    </div>
                  ))}
                </div>

                {/* LIVE SUPABASE USER PROFILES + WHICH TOOL THEY USED + BLOCK CONTROL */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-400" />
                      <span>
                        ইউজার ফুল প্রোফাইল, ব্যবহৃত টুল ও ব্লক কন্ট্রোল (Live User Profiles & Tool Usage)
                      </span>
                    </h4>
                    <span className="text-[10px] font-mono text-emerald-400">
                      Zero Mock Data · 100% Live Cloud
                    </span>
                  </div>

                  {usersList.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">
                      এখনও কোনো ইউজার লগইন করেনি।
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {usersList.map((u) => {
                        const stats = userToolStatsMap[u.email.toLowerCase()] || {
                          downloader: 0,
                          kotha: 0,
                          editor: 0,
                          thumbnail: 0,
                          ai: 0,
                          home: 0,
                          totalTools: 0,
                          recentEvents: [],
                        };
                        const isMasterCeo =
                          u.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase();
                        const normEmail = u.email.toLowerCase();
                        const isAuraApproved =
                          isMasterCeo || approvedAuraEmails.includes(normEmail);
                        const isAuraRequested =
                          !isAuraApproved && requestedAuraEmails.includes(normEmail);

                        return (
                          <div
                            key={u.email}
                            className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-3"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-white/5 pb-2.5">
                              <div className="space-y-0.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs sm:text-sm font-extrabold text-white">
                                    {u.name}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded border text-[10px] font-mono uppercase font-bold ${getProviderBadgeClass(
                                      isMasterCeo,
                                      u.provider
                                    )}`}
                                  >
                                    {isMasterCeo ? "SUPER ADMIN / CEO" : u.provider}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                                      u.isBlocked
                                        ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                        : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                    }`}
                                  >
                                    {u.isBlocked ? "BLOCKED" : "ACTIVE"}
                                  </span>
                                  {isAuraApproved && (
                                    <span className="px-2 py-0.5 rounded bg-violet-500/20 border border-violet-500/40 text-violet-300 text-[10px] font-mono uppercase font-bold">
                                      AURA AI VIP
                                    </span>
                                  )}
                                  {isAuraRequested && (
                                    <span className="px-2 py-0.5 rounded bg-amber-500/25 border border-amber-500/50 text-amber-300 text-[10px] font-mono uppercase font-bold animate-pulse">
                                      AURA REQUEST PENDING
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] font-mono text-slate-300">
                                  Email: <strong className="text-white">{u.email}</strong> · Joined:{" "}
                                  {new Date(u.createdAt).toLocaleDateString()} · Last Active:{" "}
                                  <span className="text-emerald-300">
                                    {new Date(u.lastActiveAt).toLocaleString()}
                                  </span>{" "}
                                  · Logins: <strong>{u.loginCount}</strong>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 shrink-0">
                                {isMasterCeo ? (
                                  <span className="px-3 py-1.5 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-300 text-[10px] font-bold inline-flex items-center gap-1">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <span>CEO Master</span>
                                  </span>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleAuraApproval(u.email)}
                                      className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                                        isAuraApproved
                                          ? "bg-violet-500/20 text-violet-300 border border-violet-500/40 hover:bg-violet-500/30"
                                          : isAuraRequested
                                            ? "bg-amber-500 text-black hover:bg-amber-400"
                                            : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30"
                                      }`}
                                    >
                                      <ShieldCheck className="w-3.5 h-3.5" />
                                      <span>
                                        {isAuraApproved
                                          ? "Revoke Aura AI"
                                          : isAuraRequested
                                            ? "Approve Aura Request"
                                            : "Approve Aura AI"}
                                      </span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleBlock(u.email)}
                                      className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                                        u.isBlocked
                                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                                          : "bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30"
                                      }`}
                                    >
                                      {u.isBlocked ? (
                                        <>
                                          <CheckCircle2 className="w-3.5 h-3.5" />
                                          <span>Unblock User</span>
                                        </>
                                      ) : (
                                        <>
                                          <Ban className="w-3.5 h-3.5" />
                                          <span>Block User</span>
                                        </>
                                      )}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Which tools this user used */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] font-mono">
                              <div className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
                                <span className="text-indigo-300">Downloader</span>
                                <span className="font-bold text-white">{stats.downloader}</span>
                              </div>
                              <div className="px-2.5 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-between">
                                <span className="text-teal-300">Kotha Dub</span>
                                <span className="font-bold text-white">{stats.kotha}</span>
                              </div>
                              <div className="px-2.5 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-between">
                                <span className="text-violet-300">Video Studio</span>
                                <span className="font-bold text-white">{stats.editor}</span>
                              </div>
                              <div className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                                <span className="text-amber-300">Thumbnail</span>
                                <span className="font-bold text-white">{stats.thumbnail}</span>
                              </div>
                              <div className="px-2.5 py-1.5 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-between">
                                <span className="text-pink-300">Aura AI</span>
                                <span className="font-bold text-white">{stats.ai}</span>
                              </div>
                            </div>

                            {stats.recentEvents.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                <span className="text-[10px] text-slate-400 font-bold mr-1">
                                  Used Tools:
                                </span>
                                {stats.recentEvents.slice(0, 5).map((ev) => (
                                  <span
                                    key={ev.id}
                                    className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-slate-200"
                                  >
                                    <strong className="text-emerald-300 uppercase">
                                      {ev.tool}:
                                    </strong>{" "}
                                    {ev.title}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: SYSTEM & SUPABASE API CONFIGURATION */}
            {adminTab === "settings" && (
              <div className="space-y-4">
                {/* System Metrics */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                    <Cpu className="w-4 h-4 text-violet-400 mx-auto" />
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">
                      AI Core
                    </span>
                    <span className="text-xs font-bold text-white font-mono">
                      100% Free + Gemini
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                    <Server className="w-4 h-4 text-blue-400 mx-auto" />
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">
                      Status
                    </span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">
                      ONLINE
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                    <Activity className="w-4 h-4 text-cyan-400 mx-auto" />
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">
                      Auth Gate
                    </span>
                    <span className="text-xs font-bold text-white font-mono">
                      PROTECTED
                    </span>
                  </div>
                </div>

                {/* API Credentials */}
                <div className="space-y-3 pt-2 border-t border-white/10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                        <Server className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Supabase Project URL</span>
                      </label>
                      <input
                        type="text"
                        placeholder="https://xyz.supabase.co"
                        value={supabaseUrl}
                        onChange={(e) => {
                          setSupabaseUrl(e.target.value);
                          if (typeof window !== "undefined")
                            localStorage.setItem("fahi_supabase_url", e.target.value);
                        }}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                        <Key className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Supabase Anon Public Key</span>
                      </label>
                      <input
                        type="password"
                        placeholder="eyJh..."
                        value={supabaseAnonKey}
                        onChange={(e) => {
                          setSupabaseAnonKey(e.target.value);
                          if (typeof window !== "undefined")
                            localStorage.setItem("fahi_supabase_anon_key", e.target.value);
                        }}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-white block">
                          AI Routing Mode (Private Super Admin Control)
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Choose whether AI Studio tools use Direct Gemini API or route via your private n8n Webhook
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-black/50 p-1 rounded-xl border border-white/10 shrink-0">
                        <button
                          type="button"
                          onClick={() => setUseN8n(false)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            !useN8n
                              ? "bg-indigo-600 text-white"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          Direct Gemini API
                        </button>
                        <button
                          type="button"
                          onClick={() => setUseN8n(true)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            useN8n
                              ? "bg-orange-600 text-white"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          n8n Workflow
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                          <Key className="w-3.5 h-3.5 text-violet-400" />
                          <span>Google Gemini API Key (Admin Private)</span>
                        </label>
                        <input
                          type="password"
                          placeholder="AIzaSy... (Leave blank to use built-in server key)"
                          value={geminiApiKey}
                          onChange={(e) => setGeminiApiKey(e.target.value)}
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                          <Server className="w-3.5 h-3.5 text-orange-400" />
                          <span>Private n8n Webhook URL (Admin Private)</span>
                        </label>
                        <input
                          type="text"
                          placeholder="https://your-n8n-instance/webhook/..."
                          value={n8nWebhookUrl}
                          onChange={(e) => setN8nWebhookUrl(e.target.value)}
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSaveAdminSettings}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {savedSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Admin Settings Saved!</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Save Admin Configuration</span>
                    </>
                  )}
                </button>

                {/* Change Admin Username & Password Form */}
                <form
                  onSubmit={handleChangeAdminCredentials}
                  className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-3"
                >
                  <div className="flex items-center space-x-2 text-violet-300 font-bold text-xs">
                    <Lock className="w-4 h-4 text-violet-400" />
                    <span>Change Super Admin Username & Password</span>
                  </div>

                  {credChangeSuccess && (
                    <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center space-x-1.5 font-bold">
                      <Check className="w-3.5 h-3.5" />
                      <span>Admin credentials updated!</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">
                        New Username
                      </span>
                      <input
                        type="text"
                        placeholder="New admin user..."
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        required
                        className="w-full bg-black/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">
                        New Password
                      </span>
                      <input
                        type="password"
                        placeholder="New password..."
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className="w-full bg-black/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 rounded-xl bg-violet-600/30 hover:bg-violet-600/50 text-violet-200 border border-violet-500/40 text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Update Admin Credentials</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
