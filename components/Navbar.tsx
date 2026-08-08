'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { House, Download, Video, ImageIcon, Sparkles, Zap, Settings, Key } from 'lucide-react';
import GeminiApiBox from './GeminiApiBox';
import UserSettingsModal from './UserSettingsModal';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const tabs = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'downloader', label: 'Downloader', icon: Download },
  { id: 'editor', label: 'Editor', icon: Video },
  { id: 'thumbnail', label: 'Thumbnail', icon: ImageIcon },
  { id: 'ai', label: 'AI', icon: Sparkles },
];

export default function Navbar({ activeTab, setActiveTab }: NavbarProps) {
  const [apiBoxOpen, setApiBoxOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      {/* Desktop Navbar */}
      <header className="sticky top-0 z-50 hidden md:block bg-[#050810]/85 backdrop-blur-xl border-b border-white/5 h-16">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('home')}>
            <Zap className="w-6 h-6 text-violet-400 drop-shadow-[0_0_8px_rgba(124,58,237,0.5)]" />
            <span className="font-bold text-lg bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
              FahiVids
            </span>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center p-1 bg-white/5 border border-white/10 rounded-full">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-full shadow-[0_0_16px_rgba(99,102,241,0.5)] -z-10"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon className="w-4 h-4 z-10 relative" />
                  <span className="z-10 relative">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setApiBoxOpen(true)}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              title="API Settings"
            >
              <Key className="w-5 h-5" />
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              title="User Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Top Bar (Hidden in Editor mode for full screen studio) */}
      {activeTab !== 'editor' && (
        <header className="sticky top-0 z-50 md:hidden bg-[#050810]/95 backdrop-blur-xl border-b border-white/5 h-14 flex items-center justify-between px-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('home')}>
            <Zap className="w-5 h-5 text-violet-400 drop-shadow-[0_0_8px_rgba(124,58,237,0.5)]" />
            <span className="font-bold text-base bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
              FahiVids
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setApiBoxOpen(true)}
              className="p-2 text-slate-400 hover:text-white rounded-full"
            >
              <Key className="w-5 h-5" />
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 text-slate-400 hover:text-white rounded-full"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>
      )}

      {/* Mobile Bottom Navigation (Hidden in Editor mode to allow full timeline interactions) */}
      {activeTab !== 'editor' && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#050810]/95 backdrop-blur-xl border-t border-white/5 pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-around h-16 px-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-1 flex flex-col items-center justify-center gap-1 relative h-full"
                >
                  {isActive && (
                    <motion.div
                      layoutId="mobile-nav-dot"
                      className="absolute top-1 w-1 h-1 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)]"
                    />
                  )}
                  <div className={`p-1.5 rounded-full ${isActive ? 'bg-white/5' : ''}`}>
                    <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                  </div>
                  {isActive && (
                    <span className="text-[10px] font-medium text-indigo-400">
                      {tab.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {apiBoxOpen && <GeminiApiBox isOpen={apiBoxOpen} onClose={() => setApiBoxOpen(false)} />}
      {settingsOpen && <UserSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />}
    </>
  );
}
