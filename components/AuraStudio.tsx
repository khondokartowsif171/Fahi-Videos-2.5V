"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  ShieldCheck,
  Key,
  Send,
  CheckCircle2,
  Clock,
  X,
} from "lucide-react";
import {
  getCurrentUser,
  recordAdminAnalyticsEvent,
  DEFAULT_ADMIN_EMAIL,
} from "@/lib/supabase-client";
import { isEmbedded } from "@/lib/studio-client";
import ManagedVideo from "./ManagedVideo";
import "./aura/aura.css";

const Studio = dynamic(() => import("./aura/App"), {
  ssr: false,
  loading: () => (
    <div className="p-8 text-slate-400">Loading Aura Studio…</div>
  ),
});

export default function AuraStudio({ active }: { active: boolean }) {
  const [opened, setOpened] = useState(active);
  const [creative, setCreative] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  const [accessStatus, setAccessStatus] = useState<
    "approved" | "requested" | "none"
  >("none");
  const [personalKey, setPersonalKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyInputVal, setKeyInputVal] = useState("");
  const [requestLoading, setRequestLoading] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const checkAccess = async () => {
    if (typeof window === "undefined" || isEmbedded) return;
    const savedKey = localStorage.getItem("fahi_gemini_api_key") || "";
    setPersonalKey(savedKey);
    setKeyInputVal(savedKey);

    const user = getCurrentUser();
    const email = (user?.email || "").trim().toLowerCase();
    setUserEmail(email);

    if (
      email === DEFAULT_ADMIN_EMAIL.toLowerCase() ||
      localStorage.getItem("fahi_admin_logged_in") === "true"
    ) {
      setAccessStatus("approved");
      return;
    }

    if (!email) {
      setAccessStatus("none");
      return;
    }

    try {
      const res = await fetch(
        `/api/admin/config?email=${encodeURIComponent(email)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.status === "approved" || data.status === "requested") {
          setAccessStatus(data.status);
        } else {
          setAccessStatus("none");
        }
      }
    } catch {}
  };

  useEffect(() => {
    if (active) {
      setOpened(true);
      void checkAccess();
    } else {
      container.current
        ?.querySelectorAll("video,audio")
        .forEach((el) => (el as HTMLMediaElement).pause());
    }
  }, [active]);

  const handleRequestAdminAccess = async () => {
    const user = getCurrentUser();
    const email = (user?.email || userEmail || "").trim().toLowerCase();
    if (!email) return;

    setRequestLoading(true);
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request_aura_access",
          email,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAccessStatus(data.status || "requested");
        recordAdminAnalyticsEvent({
          type: "ai_generate",
          tool: "ai",
          title: "Requested Admin VIP Access for Aura Studio",
        });
      }
    } catch {}
    setRequestLoading(false);
  };

  const handleSavePersonalKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window === "undefined") return;
    const trimmed = keyInputVal.trim();

    if (!trimmed) {
      localStorage.removeItem("fahi_gemini_api_key");
      setPersonalKey("");
    } else {
      localStorage.setItem("fahi_gemini_api_key", trimmed);
      setPersonalKey(trimmed);
    }
    setShowKeyInput(false);
    void checkAccess();
  };

  const isReady = accessStatus === "approved" || Boolean(personalKey);

  return (
    <div ref={container} data-aura-active={active} className="w-full flex flex-col">
      {/* Embedded Studio Mode: Managed Omni Queue vs Creative Tools Switch */}
      {isEmbedded && (
        <>
          <nav className="flex gap-4 p-3 border-b border-slate-800">
            <button
              onClick={() => setCreative(false)}
              aria-pressed={!creative}
              className={`px-3 py-1 rounded text-xs font-bold ${!creative ? "bg-indigo-600 text-white" : "bg-white/5 text-slate-300"}`}
            >
              Aura Studio · Omni
            </button>
            <button
              onClick={() => setCreative(true)}
              aria-pressed={creative}
              className={`px-3 py-1 rounded text-xs font-bold ${creative ? "bg-indigo-600 text-white" : "bg-white/5 text-slate-300"}`}
            >
              Creative tools
            </button>
          </nav>
          <div hidden={creative}>
            <ManagedVideo />
          </div>
          {creative && (
            <p className="p-3 text-amber-200 text-sm">
              Image, Director and UGC actions use their separately configured provider access. Use the Omni tab for managed video.
            </p>
          )}
        </>
      )}

      {/* Standalone Mode: Admin VIP Access & Personal Key (BYOK) Status Banner */}
      {!isEmbedded && (
        <>
          <div className="bg-[#0b0e17] border-b border-white/10 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              {accessStatus === "approved" ? (
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Aura AI Studio Active (Admin Cloud Connected)</span>
                </span>
              ) : personalKey ? (
                <span className="px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-bold inline-flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Personal Gemini API Key Connected (BYOK)</span>
                </span>
              ) : accessStatus === "requested" ? (
                <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    অ্যাডমিনের কাছে অ্যাক্সেস রিকোয়েস্ট পাঠানো হয়েছে (Pending Admin Approval)
                  </span>
                </span>
              ) : (
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                  <span>
                    Aura Veo 3.1 ভিডিও জেনারেট করতে <strong>অ্যাডমিনের অনুমোদন নিন</strong> অথবা{" "}
                    <strong>নিজস্ব Gemini API Key</strong> ব্যবহার করুন:
                  </span>
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!isReady && accessStatus !== "requested" && (
                <button
                  type="button"
                  onClick={handleRequestAdminAccess}
                  disabled={requestLoading}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold inline-flex items-center gap-1.5 shadow-md shadow-violet-600/20 cursor-pointer transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {requestLoading
                      ? "Sending Request..."
                      : "Request Admin Access (অ্যাডমিন অনুমোদন চান)"}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowKeyInput(!showKeyInput)}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Key className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  {personalKey
                    ? "Edit Personal API Key"
                    : "Use Own API Key (নিজস্ব Key দিন)"}
                </span>
              </button>
            </div>
          </div>

          {/* Collapsible Personal BYOK Input */}
          {showKeyInput && (
            <form
              onSubmit={handleSavePersonalKey}
              className="bg-[#111522] border-b border-indigo-500/30 px-4 py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 text-xs"
            >
              <div className="flex items-center gap-2 text-slate-300">
                <Key className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>
                  আপনার ব্যক্তিগত <strong>Google Gemini API Key</strong> দিন (শুধুমাত্র আপনার ব্রাউজারে সেভ থাকবে):
                </span>
              </div>
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={keyInputVal}
                  onChange={(e) => setKeyInputVal(e.target.value)}
                  className="flex-1 bg-black/60 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold inline-flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save Key</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowKeyInput(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </>
      )}

      {opened && (!isEmbedded || creative) && <Studio />}
    </div>
  );
}
