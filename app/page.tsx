"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Home from "@/components/Home";
import YoutubeDownloader from "@/components/YoutubeDownloader";
import VideoEditor from "@/components/VideoEditor";
import ThumbnailEditor from "@/components/ThumbnailEditor";
import CreatorAi from "@/components/CreatorAi";

// Tab ID mapping: new nav uses 'downloader'/'editor', legacy used 'youtube'/'video'
const TAB_ALIASES: Record<string, string> = {
  youtube: 'downloader',
  video: 'editor',
  downloader: 'downloader',
  editor: 'editor',
};

export default function Page() {
  const [activeTab, setActiveTab] = useState("home");
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    const handleTabChange = (e: any) => {
      if (e.detail?.tab) {
        setActiveTab(TAB_ALIASES[e.detail.tab] || e.detail.tab);
      }
    };
    window.addEventListener("change-app-tab" as any, handleTabChange);

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reasonStr = String(event?.reason?.message || event?.reason || "").toLowerCase();
      if (
        reasonStr.includes("metamask") ||
        reasonStr.includes("ethereum") ||
        reasonStr.includes("user rejected") ||
        reasonStr.includes("failed to connect") ||
        reasonStr.includes("wallet")
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const handleError = (event: ErrorEvent) => {
      const msg = String(event?.message || event?.error?.message || "").toLowerCase();
      if (
        msg.includes("metamask") ||
        msg.includes("ethereum") ||
        msg.includes("user rejected") ||
        msg.includes("failed to connect") ||
        msg.includes("wallet")
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("unhandledrejection", handleRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("change-app-tab" as any, handleTabChange);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  if (!hasMounted) {
    return <div className="min-h-[100dvh] bg-[#050810]" />;
  }

  return (
    <div className="min-h-[100dvh] bg-[var(--fl-bg)] text-slate-100 flex flex-col font-sans selection:bg-indigo-600/30">
      
      {/* Cap-Style Navigation */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Workspace */}
      {activeTab === "editor" ? (
        // Editor gets full height, no padding, no bottom clearance (it manages its own layout)
        <main className="flex-1 overflow-hidden">
          <VideoEditor />
        </main>
      ) : (
        // All other tabs get standard responsive padding + bottom nav clearance on mobile
        <main className={`flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 overflow-x-hidden
          pb-24 md:pb-8`}>
          {activeTab === "home" && <Home setActiveTab={setActiveTab} />}
          {activeTab === "downloader" && <YoutubeDownloader />}
          {activeTab === "thumbnail" && <ThumbnailEditor />}
          {activeTab === "ai" && <CreatorAi />}
        </main>
      )}

    </div>
  );
}
