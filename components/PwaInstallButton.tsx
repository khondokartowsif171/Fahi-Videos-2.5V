"use client";

import React, { useEffect, useState } from "react";
import {
  Download,
  MonitorSmartphone,
  Check,
  X,
  Share,
  PlusSquare,
  Laptop,
  Smartphone,
  Copy,
  Sparkles,
  AlertTriangle,
} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface Window {
    __fahiDeferredPrompt?: BeforeInstallPromptEvent | null;
  }
}

interface PwaInstallButtonProps {
  compact?: boolean;
}

export default function PwaInstallButton({
  compact = false,
}: PwaInstallButtonProps) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [platformTab, setPlatformTab] = useState<"pc" | "android" | "ios">(
    "pc",
  );
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isSecure, setIsSecure] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsSecure(window.isSecureContext !== false);

    // Register Service Worker if not already active
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {});
    }

    // Detect if already running in standalone installed mode
    const checkStandalone = () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.matchMedia("(display-mode: window-controls-overlay)").matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone ===
          true;
      setIsInstalled(Boolean(standalone));
    };
    checkStandalone();

    // Detect user's platform for default tab
    const ua = window.navigator.userAgent.toLowerCase();
    if (
      /iphone|ipad|ipod/.test(ua) ||
      (ua.includes("mac") && "ontouchend" in document)
    ) {
      setPlatformTab("ios");
    } else if (/android/.test(ua)) {
      setPlatformTab("android");
    } else {
      setPlatformTab("pc");
    }

    // Check if global early listener captured beforeinstallprompt
    if (window.__fahiDeferredPrompt) {
      setDeferredPrompt(window.__fahiDeferredPrompt);
    }

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__fahiDeferredPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    const onPwaReady = () => {
      if (window.__fahiDeferredPrompt) {
        setDeferredPrompt(window.__fahiDeferredPrompt);
      }
    };

    const onAppInstalled = () => {
      window.__fahiDeferredPrompt = null;
      setDeferredPrompt(null);
      setIsInstalled(true);
      setShowGuideModal(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("fahi-pwa-ready", onPwaReady);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("fahi-pwa-ready", onPwaReady);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const triggerNativeWebAppPrompt = async (): Promise<boolean> => {
    const activePrompt =
      deferredPrompt ||
      (typeof window !== "undefined" ? window.__fahiDeferredPrompt : null);
    if (!activePrompt) return false;
    try {
      await activePrompt.prompt();
      const choice = await activePrompt.userChoice;
      if (choice.outcome === "accepted") {
        window.__fahiDeferredPrompt = null;
        setDeferredPrompt(null);
        setShowGuideModal(false);
      }
      return true;
    } catch {
      return false;
    }
  };

  const handleInstallClick = async () => {
    const triggered = await triggerNativeWebAppPrompt();
    if (!triggered) {
      setShowGuideModal(true);
    }
  };

  const handleCopyUrl = async () => {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  if (isInstalled) {
    return (
      <div
        className="flex items-center space-x-1 px-2.5 py-1.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 select-none"
        title="FahiVids WebApp Installed"
      >
        <Check className="w-3.5 h-3.5 text-emerald-400" />
        {!compact && <span>Installed</span>}
      </div>
    );
  }

  const hasNativePrompt = Boolean(
    deferredPrompt ||
      (typeof window !== "undefined" && window.__fahiDeferredPrompt),
  );

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        aria-label="Install FahiVids WebApp"
        title="1-Click Install FahiVids WebApp (PC, Android & iOS)"
        className={
          compact
            ? "px-2.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-500/20 to-indigo-500/25 hover:from-cyan-500/30 hover:to-indigo-500/35 text-cyan-300 border border-cyan-400/35 flex items-center space-x-1 transition-all shadow-[0_0_12px_rgba(0,200,255,0.2)]"
            : "flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-cyan-500/20 to-indigo-500/25 hover:from-cyan-500/30 hover:to-indigo-500/40 text-cyan-200 border border-cyan-400/40 transition-all shadow-[0_0_14px_rgba(0,200,255,0.25)] hover:scale-[1.02]"
        }
      >
        <Download className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span>Install App</span>
      </button>

      {showGuideModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
          onClick={() => setShowGuideModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#0B0F1A] border border-cyan-500/30 shadow-[0_0_40px_rgba(0,200,255,0.2)] overflow-hidden text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Official App Icon */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#111625]">
              <div className="flex items-center space-x-3">
                <img
                  src="/icon-192.png"
                  alt="FahiVids App Icon"
                  className="w-10 h-10 rounded-xl shadow-md border border-white/15"
                />
                <div>
                  <h3 className="text-sm font-extrabold text-white tracking-tight">
                    Install FahiVids WebApp
                  </h3>
                  <p className="text-[11px] text-cyan-300 font-medium">
                    PC (Windows/Mac) • Android • iPhone / iPad
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close install dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Platform Selector Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-3 bg-[#090D16] border-b border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setPlatformTab("pc")}
                className={`flex items-center justify-center space-x-1.5 py-2 rounded-lg font-bold transition-colors ${
                  platformTab === "pc"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40"
                    : "text-slate-400 hover:text-white bg-white/5"
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>PC / Mac</span>
              </button>
              <button
                type="button"
                onClick={() => setPlatformTab("android")}
                className={`flex items-center justify-center space-x-1.5 py-2 rounded-lg font-bold transition-colors ${
                  platformTab === "android"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40"
                    : "text-slate-400 hover:text-white bg-white/5"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Android</span>
              </button>
              <button
                type="button"
                onClick={() => setPlatformTab("ios")}
                className={`flex items-center justify-center space-x-1.5 py-2 rounded-lg font-bold transition-colors ${
                  platformTab === "ios"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40"
                    : "text-slate-400 hover:text-white bg-white/5"
                }`}
              >
                <MonitorSmartphone className="w-3.5 h-3.5" />
                <span>iPhone / iPad</span>
              </button>
            </div>

            {/* Platform Instructions Body */}
            <div className="p-5 space-y-4 text-xs">
              {!isSecure && (
                <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-amber-100">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Secure Context (HTTPS / Localhost) Required</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-200/90">
                    Android Chrome বা ব্রাউজারে সরাসরি 1-ক্লিক WebApp (WebAPK) হিসেবে ইনস্টল হতে HTTPS বা localhost প্রয়োজন। লোকাল Wi-Fi আইপি (HTTP)-তে ব্রাউজার সিকিউরিটি পলিসি ইনস্টলেশন ব্লক রাখে।
                  </p>
                  <p className="text-[11px] text-cyan-300 font-mono bg-black/40 p-2 rounded-lg border border-cyan-500/20">
                    পিসিতে টার্মিনালে <strong>npm run dev:https</strong> চালিয়ে HTTPS লিংক ব্যবহার করুন, অথবা লাইভ HTTPS ডোমেইন থেকে ভিজিট করলে সাথে সাথে WebApp ডাউনলোড হবে!
                  </p>
                </div>
              )}

              {hasNativePrompt && (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-500/15 to-indigo-500/20 border border-cyan-400/35 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                      1-Click Direct WebApp Install
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold">
                      Ready
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void triggerNativeWebAppPrompt()}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#00E5FF] hover:bg-[#33ECFF] text-black font-extrabold text-xs flex items-center justify-center space-x-2 shadow-[0_0_20px_rgba(0,229,255,0.35)] transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install FahiVids App Now</span>
                  </button>
                </div>
              )}

              {platformTab === "pc" && (
                <div className="space-y-3">
                  <p className="text-slate-300 leading-relaxed">
                    পিসি (Windows / Mac)-তে <strong className="text-white">FahiVids WebApp</strong> হিসেবে সরাসরি ইনস্টল করার নিয়ম:
                  </p>
                  <div className="space-y-2.5 bg-white/5 p-3.5 rounded-xl border border-white/10">
                    <div className="flex items-start space-x-2.5">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                        1
                      </span>
                      <span className="text-slate-200 leading-relaxed">
                        Chrome বা Edge ব্রাউজারের উপরে অ্যাড্রেস বারের ডান পাশে <strong className="text-cyan-300">Install FahiVids (কম্পিউটার/ডাউনলোড আইকন)</strong>-এ ক্লিক করে <strong className="text-white">Install</strong> চাপুন।
                      </span>
                    </div>
                    <div className="flex items-start space-x-2.5">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                        2
                      </span>
                      <span className="text-slate-200 leading-relaxed">
                        অথবা ব্রাউজারের ডান কোণায় <strong className="text-cyan-300">⋮ (Three Dots)</strong> মেনুতে ক্লিক করে <strong className="text-cyan-300">Cast, save, and share → Install page as app...</strong> সিলেক্ট করুন।
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {platformTab === "android" && (
                <div className="space-y-3">
                  <p className="text-slate-300 leading-relaxed">
                    Android ফোনে APK ছাড়াই সরাসরি <strong className="text-white">FahiVids WebApp</strong> ইনস্টল করার নিয়ম:
                  </p>
                  <div className="space-y-2.5 bg-white/5 p-3.5 rounded-xl border border-white/10">
                    <div className="flex items-start space-x-2.5">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                        1
                      </span>
                      <span className="text-slate-200 leading-relaxed">
                        Chrome ব্রাউজারের উপরে ডান কোণায় <strong className="text-cyan-300">⋮ (Three Dots)</strong> মেনুতে ট্যাপ করুন।
                      </span>
                    </div>
                    <div className="flex items-start space-x-2.5">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                        2
                      </span>
                      <span className="text-slate-200 leading-relaxed">
                        <strong className="text-cyan-300">&ldquo;Install app&rdquo;</strong> অথবা <strong className="text-cyan-300">&ldquo;Add to Home screen&rdquo;</strong> অপশনে ট্যাপ করে <strong className="text-white">Install</strong> করুন।
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {platformTab === "ios" && (
                <div className="space-y-3">
                  <p className="text-slate-300 leading-relaxed">
                    iPhone বা iPad-এ Safari ব্রাউজার থেকে <strong className="text-white">FahiVids WebApp</strong> ইনস্টল করার নিয়ম:
                  </p>
                  <div className="space-y-2.5 bg-white/5 p-3.5 rounded-xl border border-white/10">
                    <div className="flex items-start space-x-2.5">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                        1
                      </span>
                      <span className="text-slate-200 flex items-center flex-wrap gap-1">
                        <span>Safari-এর নিচে</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 font-semibold">
                          <Share className="w-3 h-3 mr-1" /> Share
                        </span>
                        <span>বাটনে ট্যাপ করুন।</span>
                      </span>
                    </div>
                    <div className="flex items-start space-x-2.5">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                        2
                      </span>
                      <span className="text-slate-200 flex items-center flex-wrap gap-1">
                        <span>নিচে স্ক্রল করে</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 font-semibold">
                          <PlusSquare className="w-3 h-3 mr-1" /> Add to Home Screen
                        </span>
                        <span>সিলেক্ট করুন।</span>
                      </span>
                    </div>
                    <div className="flex items-start space-x-2.5">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                        3
                      </span>
                      <span className="text-slate-200">
                        উপরে ডান কোণায় <strong className="text-cyan-300">Add</strong> বাটনে ট্যাপ করুন।
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-cyan-300" />
                      <span>Copy App Link</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowGuideModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 font-semibold text-xs transition-colors"
                >
                  Got It
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
