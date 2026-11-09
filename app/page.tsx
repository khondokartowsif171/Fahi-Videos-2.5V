"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { isEmbedded, setupStudioFetch } from "@/lib/studio-client";
import StudioCloud from "@/components/StudioCloud";
import Navbar from "@/components/Navbar";
import Home from "@/components/Home";
import YoutubeDownloader from "@/components/YoutubeDownloader";
import VideoEditor from "@/components/VideoEditor";
import ThumbnailEditor from "@/components/ThumbnailEditor";
import AuraStudio from "@/components/AuraStudio";
import KothaStudio from "@/components/KothaStudio";
import AuthModal from "@/components/AuthModal";
import McpConfigHub from "@/components/McpConfigHub";
import {
  getCurrentUser,
  recordTrafficVisit,
  type FahiUser,
} from "@/lib/supabase-client";

// Tab ID mapping: new nav uses 'downloader'/'editor', legacy used 'youtube'/'video'
const TAB_ALIASES: Record<string, string> = {
  youtube: "downloader",
  video: "editor",
  downloader: "downloader",
  editor: "editor",
  ai: "ai",
  flowlab: "ai",
  kotha: "kotha",
  kothastudio: "kotha",
  mcp: "mcp",
  "mcp-config": "mcp",
  "mcp-setup": "mcp",
};

const TOOL_LABELS: Record<string, string> = {
  downloader: "Universal Media Downloader",
  editor: "CapCut Pro Video Studio",
  thumbnail: "HD Thumbnail Designer",
  ai: "Aura AI Studio",
  kotha: "Kotha Studio (কণ্ঠধ্বনি)",
};

export default function Page() {
  const [activeTab, setActiveTabState] = useState(isEmbedded ? "ai" : "home");
  const [hasMounted, setHasMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<FahiUser | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);

  // Public Home Page + Mandatory Login Gate for Tools (bypassed in embedded mode) + Traffic Analytics
  const handleSelectTab = useCallback((requestedTab: string) => {
    const resolvedTab = TAB_ALIASES[requestedTab] || requestedTab;
    if (resolvedTab === "home" || resolvedTab === "mcp" || isEmbedded) {
      setActiveTabState(resolvedTab);
      recordTrafficVisit(resolvedTab as any);
      return;
    }
    const user = getCurrentUser();
    if (!user) {
      setPendingTab(resolvedTab);
      setAuthModalOpen(true);
      return;
    }
    setCurrentUser(user);
    setActiveTabState(resolvedTab);
    recordTrafficVisit(
      resolvedTab as "downloader" | "editor" | "thumbnail" | "ai" | "kotha"
    );
  }, []);

  useEffect(() => {
    const cleanup = setupStudioFetch();
    setHasMounted(true);
    const user = getCurrentUser();
    setCurrentUser(user);
    recordTrafficVisit(isEmbedded ? "ai" : "home");

    const params = new URLSearchParams(window.location.search);
    if (params.get("studio") === "1") handleSelectTab("editor");
    if (params.get("kotha") === "1") handleSelectTab("kotha");
    if (params.get("aura") === "1") handleSelectTab("ai");
    if (params.get("mcp") === "1") handleSelectTab("mcp");
    return cleanup;
  }, [handleSelectTab]);

  useEffect(() => {
    const handleTabChange = (e: any) => {
      if (e.detail?.tab) {
        handleSelectTab(e.detail.tab);
      }
    };

    const handleAuthChange = () => {
      const updatedUser = getCurrentUser();
      setCurrentUser(updatedUser);
      if (!updatedUser && !isEmbedded) {
        setActiveTabState("home");
      }
    };

    window.addEventListener("change-app-tab" as any, handleTabChange);
    window.addEventListener("fahi-user-auth-change" as any, handleAuthChange);
    window.addEventListener("fahi-admin-login-change" as any, handleAuthChange);

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reasonStr = String(
        event?.reason?.message || event?.reason || ""
      ).toLowerCase();
      if (
        reasonStr.includes("metamask") ||
        reasonStr.includes("ethereum") ||
        reasonStr.includes("solana") ||
        reasonStr.includes("phantom")
      ) {
        event.preventDefault();
      }
    };

    const handleError = (event: ErrorEvent) => {
      const msg = String(
        event?.message || event?.error?.message || ""
      ).toLowerCase();
      if (
        msg.includes("metamask") ||
        msg.includes("ethereum") ||
        msg.includes("solana") ||
        msg.includes("phantom")
      ) {
        event.preventDefault();
      }
    };

    window.addEventListener("unhandledrejection", handleRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("change-app-tab" as any, handleTabChange);
      window.removeEventListener("fahi-user-auth-change" as any, handleAuthChange);
      window.removeEventListener("fahi-admin-login-change" as any, handleAuthChange);
      window.removeEventListener("unhandledrejection", handleRejection);
      window.removeEventListener("error", handleError);
    };
  }, [handleSelectTab]);

  if (!hasMounted) {
    return <div className="min-h-[100dvh] bg-[#050810]" />;
  }

  return (
    <div className="min-h-[100dvh] bg-[var(--fl-bg)] text-slate-100 flex flex-col font-sans selection:bg-indigo-600/30">
      {/* Cap-Style Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleSelectTab}
        currentUser={currentUser}
        onOpenAuthModal={() => {
          setPendingTab(null);
          setAuthModalOpen(true);
        }}
      />

      {/* Supabase / User Login Gate Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        targetToolLabel={pendingTab ? TOOL_LABELS[pendingTab] : undefined}
        onSuccess={(user) => {
          setCurrentUser(user);
          setAuthModalOpen(false);
          if (pendingTab) {
            setActiveTabState(pendingTab);
            recordTrafficVisit(
              pendingTab as "downloader" | "editor" | "thumbnail" | "ai" | "kotha"
            );
            setPendingTab(null);
          }
        }}
      />

      {isEmbedded && (
        <StudioCloud
          kind={
            activeTab === "editor"
              ? "editor"
              : activeTab === "kotha"
              ? "kotha"
              : activeTab === "thumbnail"
              ? "thumbnail"
              : "aura"
          }
        />
      )}

      {/* Main Workspace: Keep-Alive Video Editor (Never unmounts on tab switch, preserving all video edits) */}
      <main
        className={`flex-1 overflow-hidden ${
          activeTab === "editor" ? "block" : "hidden"
        }`}
      >
        <VideoEditor />
      </main>

      {/* Aura remains mounted while navigating, preserving active renders. */}
      <main
        className={`flex-1 w-full ${activeTab === "ai" ? "block" : "hidden"}`}
      >
        <AuraStudio active={activeTab === "ai"} />
      </main>

      {/* Kotha Studio remains mounted while navigating, preserving active scenes, uploaded video, and generated voiceovers. */}
      <main
        className={`flex-1 w-full ${
          activeTab === "kotha" ? "block" : "hidden"
        }`}
      >
        <KothaStudio active={activeTab === "kotha"} />
      </main>

      {/* Other Workspaces */}
      <main
        className={`flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 overflow-x-hidden pb-24 md:pb-8 ${
          activeTab !== "editor" && activeTab !== "ai" && activeTab !== "kotha"
            ? "block"
            : "hidden"
        }`}
      >
        {activeTab === "home" && <Home setActiveTab={handleSelectTab} />}
        {activeTab === "downloader" && <YoutubeDownloader />}
        {activeTab === "thumbnail" && <ThumbnailEditor />}
        {activeTab === "mcp" && <McpConfigHub />}
      </main>
    </div>
  );
}
