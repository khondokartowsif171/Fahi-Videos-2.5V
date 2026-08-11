"use client";

import React, { useState, useEffect } from "react";
import { X, ShieldCheck, Lock, User, Key, Check, LogOut, Server, Cpu, Activity, AlertCircle, Sparkles, Eye, EyeOff, RotateCw } from "lucide-react";

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminLoginModal({ isOpen, onClose }: AdminLoginModalProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  // Admin settings state
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState("");
  const [useN8n, setUseN8n] = useState(false);
  const [aiUhdEnabled, setAiUhdEnabled] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Change Admin Credentials state
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [credChangeSuccess, setCredChangeSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const logged = localStorage.getItem("fahi_admin_logged_in") === "true";
      setIsLoggedIn(logged);

      setGeminiApiKey(localStorage.getItem("fahi_gemini_api_key") || "");
      setN8nWebhookUrl(localStorage.getItem("fahi_n8n_webhook_url") || "");
      setUseN8n(localStorage.getItem("fahi_use_n8n") === "true");
      setAiUhdEnabled(localStorage.getItem("fahi_ai_uhd") !== "false");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const savedUser = (localStorage.getItem("fahi_admin_username") || "admin").trim().toLowerCase();
    const savedPass = (localStorage.getItem("fahi_admin_password") || "admin123").trim();

    const inputUser = username.trim().toLowerCase();
    const inputPass = password.trim();

    if (inputUser === savedUser && inputPass === savedPass) {
      localStorage.setItem("fahi_admin_logged_in", "true");
      setIsLoggedIn(true);
      setErrorMsg("");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("fahi-admin-login-change", { detail: { isLoggedIn: true } }));
      }
    } else {
      setErrorMsg("Invalid Admin Username or Password.");
    }
  };

  const handleResetToDefaultCredentials = () => {
    localStorage.setItem("fahi_admin_username", "admin");
    localStorage.setItem("fahi_admin_password", "admin123");
    setUsername("admin");
    setPassword("admin123");
    setErrorMsg("");
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 2500);
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
    setIsLoggedIn(false);
    setUsername("");
    setPassword("");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("fahi-admin-login-change", { detail: { isLoggedIn: false } }));
    }
  };

  const handleSaveAdminSettings = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("fahi_gemini_api_key", geminiApiKey.trim());
      localStorage.setItem("fahi_n8n_webhook_url", n8nWebhookUrl.trim());
      localStorage.setItem("fahi_use_n8n", String(useN8n));
      localStorage.setItem("fahi_ai_uhd", String(aiUhdEnabled));

      window.dispatchEvent(new CustomEvent("fahi-admin-settings-change", {
        detail: { geminiApiKey, n8nWebhookUrl, useN8n, aiUhdEnabled }
      }));
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md rounded-3xl bg-[#0D1117] border border-white/10 p-6 shadow-2xl space-y-5 text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight">System Admin Console</h3>
              <p className="text-[10px] text-slate-400 font-mono">
                {isLoggedIn ? "AUTHENTICATED - SUPER ADMIN" : "RESTRICTED ACCESS"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
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
                <span>Admin Username</span>
              </label>
              <input
                type="text"
                placeholder="Enter admin username..."
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
                placeholder="Enter passcode..."
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
              <span>Log In to Admin Panel</span>
            </button>
          </form>
        ) : (
          /* Unlocked Admin Control Panel */
          <div className="space-y-5">
            {/* Status Card */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center space-x-2 text-xs text-emerald-300 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Logged in as Super Admin</span>
              </div>
              <button
                onClick={handleLogout}
                className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-[10px] font-bold flex items-center space-x-1 border border-red-500/30 cursor-pointer"
              >
                <LogOut className="w-3 h-3" />
                <span>Log Out</span>
              </button>
            </div>

            {/* System Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <Cpu className="w-4 h-4 text-violet-400 mx-auto" />
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">AI Core</span>
                <span className="text-xs font-bold text-white font-mono">Veo & Gemini</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <Server className="w-4 h-4 text-blue-400 mx-auto" />
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Status</span>
                <span className="text-xs font-bold text-emerald-400 font-mono">ONLINE</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <Activity className="w-4 h-4 text-cyan-400 mx-auto" />
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Mode</span>
                <span className="text-xs font-bold text-white font-mono">4K UHD</span>
              </div>
            </div>

            {/* API Credentials */}
            <div className="space-y-3 pt-2 border-t border-white/10 max-h-[220px] overflow-y-auto pr-1">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                  <Key className="w-3.5 h-3.5 text-violet-400" />
                  <span>Google Gemini API Key</span>
                </label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                  <Server className="w-3.5 h-3.5 text-indigo-400" />
                  <span>n8n Webhook URL (Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="https://n8n.yourserver.com/webhook/..."
                  value={n8nWebhookUrl}
                  onChange={(e) => setN8nWebhookUrl(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              {/* Supabase Database Cloud Sync */}
              <div className="space-y-1.5 pt-2 border-t border-white/10">
                <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                  <Server className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Supabase Database URL</span>
                </label>
                <input
                  type="text"
                  placeholder="https://xyz.supabase.co"
                  value={typeof window !== "undefined" ? (localStorage.getItem("fahi_supabase_url") || "") : ""}
                  onChange={(e) => {
                    if (typeof window !== "undefined") localStorage.setItem("fahi_supabase_url", e.target.value);
                  }}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                  <Key className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Supabase Anon Key</span>
                </label>
                <input
                  type="password"
                  placeholder="eyJh..."
                  value={typeof window !== "undefined" ? (localStorage.getItem("fahi_supabase_anon_key") || "") : ""}
                  onChange={(e) => {
                    if (typeof window !== "undefined") localStorage.setItem("fahi_supabase_anon_key", e.target.value);
                  }}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-medium text-slate-300">Route AI via n8n Webhook</span>
                <button
                  type="button"
                  onClick={() => setUseN8n(!useN8n)}
                  className={`w-10 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                    useN8n ? "bg-violet-600" : "bg-white/10"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      useN8n ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-medium text-slate-300">Enable 4K AI UHD Acceleration</span>
                <button
                  type="button"
                  onClick={() => setAiUhdEnabled(!aiUhdEnabled)}
                  className={`w-10 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                    aiUhdEnabled ? "bg-violet-600" : "bg-white/10"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      aiUhdEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
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
            <form onSubmit={handleChangeAdminCredentials} className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-3 pt-3">
              <div className="flex items-center space-x-2 text-violet-300 font-bold text-xs">
                <Lock className="w-4 h-4 text-violet-400" />
                <span>Change Admin Username & Password</span>
              </div>

              {credChangeSuccess && (
                <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center space-x-1.5 font-bold">
                  <Check className="w-3.5 h-3.5" />
                  <span>Admin credentials updated successfully!</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">New Username</span>
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
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">New Password</span>
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
    </div>
  );
}
