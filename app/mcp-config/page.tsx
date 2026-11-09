import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Video } from 'lucide-react';
import McpConfigHub from '@/components/McpConfigHub';
import FahiVidsLogo from '@/components/FahiVidsLogo';

export const metadata: Metadata = {
  title: 'MCP AI Configuration Hub — Fahi Videos 2.5V',
  description:
    'Official Model Context Protocol (MCP) server configuration hub for Fahi Videos 2.5V. Connect Claude Desktop, Cursor IDE, Windsurf, and AI Agents with 10 free video tools.',
};

export default function McpConfigPage() {
  return (
    <div className="min-h-[100dvh] bg-[#050810] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-[#050810]/85 backdrop-blur-xl border-b border-white/5 h-16">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <FahiVidsLogo size={32} showSubtitle />
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Studio</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <McpConfigHub />
      </main>
    </div>
  );
}
