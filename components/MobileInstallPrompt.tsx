"use client";

import React, { useState, useEffect } from "react";
import { Download, X, Smartphone, ArrowUpFromLine, Plus, Sparkles } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function MobileInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [platform, setPlatform] = useState<"android" | "ios" | "desktop">("desktop");

  useEffect(() => {
    // Check if dismissed previously
    const isDismissed = localStorage.getItem("pwa_install_dismissed");
    if (isDismissed === "true") return;

    // Detect Platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);

    if (isIos) {
      setPlatform("ios");
      // Check if already in standalone mode
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches || 
                           (window.navigator as any).standalone === true;
      if (!isStandalone) {
        // Show after a brief delay for better UX
        const timer = setTimeout(() => setIsVisible(true), 4000);
        return () => clearTimeout(timer);
      }
    } else if (isMobile) {
      setPlatform("android");
      
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setIsVisible(true);
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("pwa_install_dismissed", "true");
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 animate-in fade-in slide-in-from-bottom-10 duration-500">
      <div className="relative rounded-3xl border border-white/[0.08] bg-[#0d0d12]/95 backdrop-blur-xl p-5 md:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden group">
        {/* Glow accent */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
        
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Dismiss"
          id="btn-dismiss-pwa"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-6 h-6 text-indigo-400 animate-pulse" />
          </div>

          <div className="space-y-1.5 pr-6">
            <h4 className="text-sm font-extrabold text-white flex items-center gap-1.5 font-sans">
              <span>Install Fahi-vids OS</span>
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Install this application on your home screen for quick, fullscreen, and smooth standalone offline access.
            </p>
          </div>
        </div>

        {/* Platform Specific Steps */}
        <div className="mt-4 pt-4 border-t border-white/5">
          {platform === "ios" ? (
            <div className="space-y-3">
              <span className="text-[10px] text-slate-500 font-mono font-bold tracking-wider uppercase block">
                iOS Installation Guide:
              </span>
              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-3 bg-white/[0.02] p-2 rounded-xl border border-white/[0.04]">
                  <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center font-mono text-[10px] font-bold text-indigo-400">
                    1
                  </div>
                  <p className="flex-1 flex items-center gap-1">
                    Tap the Share button <ArrowUpFromLine className="w-3.5 h-3.5 text-indigo-400 inline" /> in Safari.
                  </p>
                </div>
                <div className="flex items-center gap-3 bg-white/[0.02] p-2 rounded-xl border border-white/[0.04]">
                  <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center font-mono text-[10px] font-bold text-indigo-400">
                    2
                  </div>
                  <p className="flex-1 flex items-center gap-1">
                    Scroll down and tap <span className="font-bold text-white flex items-center gap-1">Add to Home Screen <Plus className="w-3.5 h-3.5 text-indigo-400 inline" /></span>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-slate-400 font-mono">Stand-alone app ready</span>
              <button
                onClick={handleInstallClick}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] px-4.5 py-2.5 text-xs font-bold text-white transition-all duration-300 flex items-center gap-1.5 cursor-pointer active:scale-95"
                id="btn-install-pwa"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install Now</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
