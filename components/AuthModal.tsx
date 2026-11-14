"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Mail,
  User,
  LogIn,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";
import { FahiVidsMarkSvg } from "./FahiVidsLogo";
import {
  signInWithGoogleOAuth,
  signInWithSupabase,
  signUpWithSupabase,
  type FahiUser,
} from "@/lib/supabase-client";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetToolLabel?: string;
  pendingTab?: string | null;
  initialError?: string;
  onSuccess?: (user: FahiUser) => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  targetToolLabel,
  pendingTab,
  initialError,
  onSuccess,
}: AuthModalProps) {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(initialError || "");
      setInfoMsg("");
      setGoogleLoading(false);
    }
  }, [isOpen, initialError]);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setErrorMsg("");
    setInfoMsg("");
    setGoogleLoading(true);
    try {
      const res = await signInWithGoogleOAuth(pendingTab);
      if (res.error) {
        setErrorMsg(res.error);
        setGoogleLoading(false);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to start Google sign-in.");
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setInfoMsg("");
    setLoading(true);

    try {
      if (tab === "signin") {
        const res = await signInWithSupabase(email, password);
        if (res.error) {
          setErrorMsg(res.error);
        } else if (res.user) {
          onSuccess?.(res.user);
        }
      } else {
        const res = await signUpWithSupabase(name, email, password);
        if (res.error) {
          setErrorMsg(res.error);
        } else if (res.user) {
          onSuccess?.(res.user);
        } else if (res.requiresEmailConfirm) {
          setInfoMsg(
            "Account created successfully! Please sign in with your email and password."
          );
          setTab("signin");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md rounded-3xl bg-[#0D1117] border border-white/10 p-6 sm:p-7 shadow-2xl space-y-5 text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center space-x-3">
            <FahiVidsMarkSvg size={36} className="shrink-0" />
            <div>
              <h3 className="font-extrabold text-base tracking-tight text-white">
                {tab === "signin"
                  ? "Sign In to FahiVids Studio"
                  : "Create Your Free Studio Account"}
              </h3>
              <p className="text-[11px] text-slate-400">
                {targetToolLabel
                  ? `Continue to ${targetToolLabel}`
                  : "Cloud-synced projects & full creative suite access"}
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

        {targetToolLabel && (
          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              Sign in or create a free account to open{" "}
              <strong className="text-white">{targetToolLabel}</strong>.
            </span>
          </div>
        )}

        {/* 1-Click Google OAuth */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading || googleLoading}
          className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.3 0 6.08-1.09 8.105-2.96l-3.88-3.05c-1.1.74-2.51 1.18-4.225 1.18-3.24 0-5.98-2.18-6.96-5.12H1.03v3.14C3.05 21.19 7.23 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.04 14.05c-.25-.74-.39-1.53-.39-2.35s.14-1.61.39-2.35V6.21H1.03A11.96 11.96 0 0 0 0 11.7c0 1.93.46 3.75 1.03 5.49l4.01-3.14z"
            />
            <path
              fill="#EA4335"
              d="M12 4.65c1.8 0 3.41.62 4.68 1.83l3.51-3.51C18.07 1.1 15.3 0 12 0 7.23 0 3.05 2.81 1.03 6.21l4.01 3.14C6.02 6.83 8.76 4.65 12 4.65z"
            />
          </svg>
          <span>
            {googleLoading
              ? "Redirecting to Google..."
              : "Continue with Google"}
          </span>
        </button>

        <div className="relative flex items-center py-0.5">
          <div className="flex-grow border-t border-white/10" />
          <span className="shrink-0 mx-3 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            or continue with email
          </span>
          <div className="flex-grow border-t border-white/10" />
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-black/50 border border-white/10">
          <button
            type="button"
            onClick={() => {
              setTab("signin");
              setErrorMsg("");
            }}
            className={`py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              tab === "signin"
                ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("signup");
              setErrorMsg("");
            }}
            className={`py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              tab === "signup"
                ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Account</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {infoMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{infoMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === "signup" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                <span>Full Name</span>
              </label>
              <input
                type="text"
                required
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-indigo-400" />
              <span>Email Address</span>
            </label>
            <input
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                <span>Password</span>
              </span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-3 h-3" />
                ) : (
                  <Eye className="w-3 h-3" />
                )}
                <span>{showPassword ? "Hide" : "Show"}</span>
              </button>
            </label>
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {tab === "signin" ? (
              <LogIn className="w-4 h-4" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            <span>
              {loading
                ? "Authenticating..."
                : tab === "signin"
                ? "Sign In"
                : "Create Account"}
            </span>
          </button>
        </form>

        <div className="pt-3 border-t border-white/10 text-center text-xs text-slate-400">
          {tab === "signin" ? (
            <span>
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setTab("signup");
                  setErrorMsg("");
                }}
                className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
              >
                Create a free account
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setTab("signin");
                  setErrorMsg("");
                }}
                className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
              >
                Sign in
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
