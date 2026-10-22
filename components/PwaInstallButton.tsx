"use client";

import React, { useEffect, useState } from "react";
import { Download, MonitorSmartphone, Check, X, Share, PlusSquare, Laptop, Smartphone } from "lucide-react";

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

export default function PwaInstallButton({ compact = false }: PwaInstallButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [platformTab, setPlatformTab] = useState<"pc" | "android" | "ios">("pc");

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Register Service Worker if not already active
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    }

    // Detect if already running in standalone installed mode
    const checkStandalone = () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.matchMedia("(display-mode: window-controls-overlay)").matches ||
        (window.navigator as any).standalone === true;
      setIsInstalled(Boolean(standalone));
    };
    checkStandalone();

    // Detect user's platform for default tab
    const ua = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua) || (ua.includes("mac") && "ontouchend" in document)) {
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

  const handleInstallClick = async () => {
    const activePrompt = deferredPrompt || (typeof window !== "undefined" ? window.__fahiDeferredPrompt : null);
    if (activePrompt) {
      try {
        await activePrompt.prompt();
        const choice = await activePrompt.userChoice;
        if (choice.outcome === "accepted") {
          window.__fahiDeferredPrompt = null;
          setDeferredPrompt(null);
        }
        return;
      } catch {
        // Fallback to guide modal if prompt was already used
      }
    }
    setShowGuideModal(true);
  };

  if (isInstalled) {
    return (
      <div
        className="flex items-center space-x-1 px-2.5 py-1.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 select-none"
        title="FahiVids App Installed"
      >
        <Check className="w-3.5 h-3.5 text-emerald-400" />
        {!compact && <span>Installed</span>}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        aria-label="Install FahiVids App"
        title="1-Click Install FahiVids App (PC, Android & iOS)"
        className={
          compact
            ? "px-2.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-500/20 to-indigo-500/25 hover:from-cyan-500/30 hover:to-indigo-500/35 text-cyan-300 border border-cyan-400/35 flex items-center space-x-1 transition-all shadow-[0_0_12px_rgba(0,200,255,0.2)]"
            : "flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-cyan-500/20 to-indigo-500/25 hover:from-cyan-500/30 hover:to-indigo-500/40 text-cyan-200 border border-cyan-400/40 transition-all shadow-[0_0_14px_rgba(0,200,255,0.25)] hover:scale-[1.02]"
        }
      >
        <Download className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span>Install</span>
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
                  src="/app-icon.png"
                  alt="FahiVids App Icon"
                  className="w-10 h-10 rounded-xl shadow-md border border-white/15"
                />
                <div>
                  <h3 className="text-sm font-extrabold text-white tracking-tight">
                    Install FahiVids App
                  </h3>
                  <p className="text-[11px] text-cyan-300 font-medium">
                    PC (Windows/Mac) • Android • Apple iOS
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
                <span>Apple iOS</span>
              </button>
            </div>

            {/* Platform Instructions Body */}
            <div className="p-5 space-y-4 text-xs">
              {platformTab === "pc" && (
                <div className="space-y-3">
                  <p className="text-slate-300 leading-relaxed">
                    Install <strong className="text-white">FahiVids Studio</strong> as a standalone desktop app on Windows, macOS, or Linux:
                  </p>
                  <div className="space-y-2.5 bg-white/5 p-3.5 rounded-xl border border-white/10">
                    <div className="flex items-start space-x-2.5">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                        1
                      </span>
                      <span className="text-slate-200">
                        Look at the right side of your browser address bar (URL bar) in <strong>Chrome, Edge, or Brave</strong>.
                      </span>
                    </div>
                    <div className="flex items-start space-x-2.5">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                        2
                      </span>
                      <span className="text-slate-200">
                        Click the <strong className="text-cyan-300">Install FahiVids (⊕ / Monitor icon)</strong> button and confirm <strong>Install</strong>.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {platformTab === "android" && (
                <div className="space-y-3">
                  <p className="text-slate-300 leading-relaxed">
                    Install <strong className="text-white">FahiVids</strong> on your Android phone or tablet in 1 click:
                  </p>
                  <div className="space-y-2.5 bg-white/5 p-3.5 rounded-xl border border-white/10">
                    <div className="flex items-start space-x-2.5">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                        1
                      </span>
                      <span className="text-slate-200">
                        Tap the browser menu <strong className="text-cyan-300">⋮ (Three Dots)</strong> in the top-right corner of Chrome.
                      </span>
                    </div>
                    <div className="flex items-start space-x-2.5">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                        2
                      </span>
                      <span className="text-slate-200">
                        Select <strong className="text-cyan-300">&ldquo;Install app&rdquo;</strong> or <strong className="text-cyan-300">&ldquo;Add to Home screen&rdquo;</strong> and tap <strong>Install</strong>.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {platformTab === "ios" && (
                <div className="space-y-3">
                  <p className="text-slate-300 leading-relaxed">
                    Install <strong className="text-white">FahiVids</strong> on your iPhone or iPad from Safari:
                  </p>
                  <div className="space-y-2.5 bg-white/5 p-3.5 rounded-xl border border-white/10">
                    <div className="flex items-start space-x-2.5">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                        1
                      </span>
                      <span className="text-slate-200 flex items-center flex-wrap gap-1">
                        <span>Tap the</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 font-semibold">
                          <Share className="w-3 h-3 mr-1" /> Share
                        </span>
                        <span>button at the bottom of Safari.</span>
                      </span>
                    </div>
                    <div className="flex items-start space-x-2.5">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                        2
                      </span>
                      <span className="text-slate-200 flex items-center flex-wrap gap-1">
                        <span>Scroll down and tap</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 font-semibold">
                          <PlusSquare className="w-3 h-3 mr-1" /> Add to Home Screen
                        </span>
                      </span>
                    </div>
                    <div className="flex items-start space-x-2.5">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                        3
                      </span>
                      <span className="text-slate-200">
                        Tap <strong className="text-cyan-300">Add</strong> in the top-right corner to launch FahiVids full-screen from your Home Screen.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                {deferredPrompt && (
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="px-4 py-2 rounded-xl bg-[#00E5FF] hover:bg-[#33ECFF] text-black font-bold text-xs shadow-lg transition-all"
                  >
                    Install Now (1-Click)
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowGuideModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 font-semibold text-xs transition-colors"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
