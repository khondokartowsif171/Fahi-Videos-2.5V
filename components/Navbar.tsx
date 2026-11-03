'use client';

import { isEmbedded } from '@/lib/studio-client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  House,
  Download,
  Video,
  ImageIcon,
  Sparkles,
  Mic,
  Settings,
  Key,
  ShieldCheck,
  LogIn,
  LogOut,
  UserCheck,
} from 'lucide-react';
import FahiVidsLogo from './FahiVidsLogo';
import PwaInstallButton from './PwaInstallButton';
import GeminiApiBox from './GeminiApiBox';
import UserSettingsModal from './UserSettingsModal';
import AdminLoginModal from './AdminLoginModal';
import { signOutUser, type FahiUser } from '@/lib/supabase-client';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser?: FahiUser | null;
  onOpenAuthModal?: () => void;
}

const tabs = [
  { id: 'home', label: 'Home', icon: House, public: true },
  { id: 'downloader', label: 'Downloader', icon: Download, public: false },
  { id: 'editor', label: 'Video Studio', icon: Video, public: false },
  { id: 'thumbnail', label: 'Thumbnail', icon: ImageIcon, public: false },
  { id: 'ai', label: 'Aura Studio', icon: Sparkles, public: false },
  { id: 'kotha', label: 'Kotha Studio', icon: Mic, public: false },
];

export default function Navbar({
  activeTab,
  setActiveTab,
  currentUser,
  onOpenAuthModal,
}: NavbarProps) {
  const [apiBoxOpen, setApiBoxOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);

  return (
    <>
      {/* Desktop Navbar */}
      <header className="sticky top-0 z-50 hidden md:block bg-[#050810]/85 backdrop-blur-xl border-b border-white/5 h-16">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          {/* Official FahiVids SVG Logo & Wordmark */}
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setActiveTab('home')}
          >
            <FahiVidsLogo size={32} showSubtitle />
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
                  className={`relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-colors cursor-pointer ${
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
          <div className="flex items-center gap-2">
            {!isEmbedded && <PwaInstallButton />}

            {!isEmbedded && (
              <>
                {currentUser ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          currentUser.provider === 'admin' ||
                          currentUser.email.toLowerCase() === 'ceo@auraajenticai.cloud'
                        ) {
                          setAdminModalOpen(true);
                        }
                      }}
                      className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 cursor-pointer"
                      title={currentUser.email}
                    >
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="max-w-[120px] truncate">{currentUser.name}</span>
                    </button>
                    <button
                      onClick={() => void signOutUser()}
                      className="p-2 text-slate-400 hover:text-red-300 hover:bg-red-500/10 rounded-full transition-colors cursor-pointer"
                      title="Sign Out"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onOpenAuthModal?.()}
                    className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
                    title="Sign In / Create Free Account"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Login</span>
                  </button>
                )}
              </>
            )}

            <button
              style={isEmbedded ? { display: 'none' } : undefined}
              onClick={() => setAdminModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 transition-all shadow-sm"
              title="Admin Login Console"
            >
              <ShieldCheck className="w-4 h-4 text-violet-400" />
              <span>Admin</span>
            </button>
            <button
              style={isEmbedded ? { display: 'none' } : undefined}
              onClick={() => setApiBoxOpen(true)}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              title="API Settings"
            >
              <Key className="w-5 h-5" />
            </button>
            <button
              style={isEmbedded ? { display: 'none' } : undefined}
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
      {(isEmbedded || activeTab !== 'editor') && (
        <header className="sticky top-0 z-50 md:hidden bg-[#050810]/95 backdrop-blur-xl border-b border-white/5 h-14 flex items-center justify-between px-4">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setActiveTab('home')}
          >
            <FahiVidsLogo size={26} />
          </div>
          <div className="flex items-center gap-1.5">
            {isEmbedded && (
              <select
                aria-label="Studio tool"
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className="max-w-44 rounded-lg border border-white/20 bg-slate-900 px-2 py-2 text-xs text-white"
              >
                {tabs.map((tab) => (
                  <option key={tab.id} value={tab.id}>
                    {tab.label}
                  </option>
                ))}
              </select>
            )}
            {!isEmbedded && <PwaInstallButton compact />}
            {!isEmbedded && currentUser ? (
              <button
                onClick={() => void signOutUser()}
                className="p-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1"
                title="Sign Out"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <LogOut className="w-3.5 h-3.5 text-red-300" />
              </button>
            ) : !isEmbedded ? (
              <button
                onClick={() => onOpenAuthModal?.()}
                className="px-2.5 py-1.5 bg-cyan-500 text-black rounded-lg text-xs font-extrabold flex items-center gap-1"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login</span>
              </button>
            ) : null}
            <button
              style={isEmbedded ? { display: 'none' } : undefined}
              onClick={() => setAdminModalOpen(true)}
              className="p-1.5 bg-violet-600/20 border border-violet-500/30 text-violet-300 rounded-lg text-xs font-bold flex items-center space-x-1"
            >
              <ShieldCheck className="w-4 h-4 text-violet-400" />
              <span>Admin</span>
            </button>
            <button
              style={isEmbedded ? { display: 'none' } : undefined}
              onClick={() => setApiBoxOpen(true)}
              className="p-2 text-slate-400 hover:text-white rounded-full"
            >
              <Key className="w-5 h-5" />
            </button>
            <button
              style={isEmbedded ? { display: 'none' } : undefined}
              onClick={() => setSettingsOpen(true)}
              className="p-2 text-slate-400 hover:text-white rounded-full"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>
      )}

      {/* Modals */}
      <GeminiApiBox isOpen={apiBoxOpen} onClose={() => setApiBoxOpen(false)} />
      <UserSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <AdminLoginModal isOpen={adminModalOpen} onClose={() => setAdminModalOpen(false)} />

      {/* Mobile Bottom Navigation (Hidden in Editor mode to allow full timeline interactions) */}
      {!isEmbedded && activeTab !== 'editor' && activeTab !== 'ai' && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#050810]/95 backdrop-blur-xl border-t border-white/5 pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-around h-16 px-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex flex-col items-center justify-center w-full h-full relative"
                >
                  {isActive && (
                    <motion.div
                      layoutId="mobile-nav-pill"
                      className="absolute top-1 w-1 h-1 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)]"
                    />
                  )}
                  <div
                    className={`p-1.5 rounded-full ${isActive ? 'bg-white/5' : ''}`}
                  >
                    <Icon
                      className={`w-5 h-5 ${
                        isActive ? 'text-indigo-400' : 'text-slate-500'
                      }`}
                    />
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
    </>
  );
}
