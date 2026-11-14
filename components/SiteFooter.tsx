"use client";

import React from "react";
import { ExternalLink } from "lucide-react";
import { FahiVidsMarkSvg } from "./FahiVidsLogo";

export const AURA_AGENCY_URL = "https://auraajenticai.cloud";

interface SiteFooterProps {
  hasMobileBottomNav?: boolean;
}

/**
 * Persistent site footer displayed across standard FahiVids studio views
 * (Home, Downloader, Thumbnail, MCP Hub) with clickable parent agency links.
 */
export default function SiteFooter({
  hasMobileBottomNav = true,
}: SiteFooterProps) {
  return (
    <footer
      aria-label="Site Footer"
      className={`w-full border-t border-white/10 bg-[#050810]/90 backdrop-blur-xl ${
        hasMobileBottomNav ? "pb-24 md:pb-6" : "pb-8 md:pb-6"
      } pt-5`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        {/* Brand & Copyright */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-slate-400">
          <FahiVidsMarkSvg size={18} className="shrink-0 opacity-90" />
          <span>
            &copy; 2026{" "}
            <a
              href={AURA_AGENCY_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Aura Tech Solution — Visit auraajenticai.cloud"
              className="font-semibold text-slate-200 hover:text-cyan-300 underline decoration-white/20 underline-offset-4 hover:decoration-cyan-400/60 transition-colors"
            >
              Aura Tech Solution
            </a>
            . All rights reserved.
          </span>
        </div>

        {/* Clickable Powered By Pill */}
        <a
          href={AURA_AGENCY_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Powered by Aura Ajentic AI — Visit auraajenticai.cloud"
          className="group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-indigo-500/15 border border-white/10 hover:border-cyan-400/40 text-xs text-slate-300 hover:text-white transition-all shadow-[0_0_18px_rgba(0,200,255,0.06)] hover:shadow-[0_0_22px_rgba(0,200,255,0.18)] whitespace-nowrap"
        >
          <span
            aria-hidden="true"
            className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.85)]"
          />
          <span>
            Powered by{" "}
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-indigo-300 to-violet-300">
              Aura Ajentic AI
            </span>
          </span>
          <ExternalLink className="w-3.5 h-3.5 text-cyan-400/80 group-hover:text-cyan-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </a>
      </div>
    </footer>
  );
}
