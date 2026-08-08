"use client";

import { useState, useEffect } from "react";
import { X, Moon, Sun, Monitor, Check, Grid, Save, Volume2, Sparkles, Sliders } from "lucide-react";

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onThemeChange?: (theme: "dark" | "light") => void;
}

export default function UserSettingsModal({ isOpen, onClose, onThemeChange }: UserSettingsModalProps) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [autoSave, setAutoSave] = useState<boolean>(true);
  const [muteOnLoad, setMuteOnLoad] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    // Load theme from localStorage
    if (typeof window !== "undefined") {
      const savedTheme = (localStorage.getItem("fahi_editor_theme") as "dark" | "light") || "dark";
      setTheme(savedTheme);
      
      const savedGrid = localStorage.getItem("fahi_show_grid");
      if (savedGrid !== null) setShowGrid(savedGrid === "true");

      const savedAutoSave = localStorage.getItem("fahi_auto_save");
      if (savedAutoSave !== null) setAutoSave(savedAutoSave === "true");

      const savedMute = localStorage.getItem("fahi_mute_onload");
      if (savedMute !== null) setMuteOnLoad(savedMute === "true");
    }
  }, [isOpen]);

  const handleSelectTheme = (selectedTheme: "dark" | "light") => {
    setTheme(selectedTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("fahi_editor_theme", selectedTheme);
      window.dispatchEvent(new CustomEvent("fahi-theme-change", { detail: { theme: selectedTheme } }));
    }
    if (onThemeChange) {
      onThemeChange(selectedTheme);
    }
  };

  const handleSaveSettings = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("fahi_editor_theme", theme);
      localStorage.setItem("fahi_show_grid", String(showGrid));
      localStorage.setItem("fahi_auto_save", String(autoSave));
      localStorage.setItem("fahi_mute_onload", String(muteOnLoad));
      
      window.dispatchEvent(new CustomEvent("fahi-theme-change", { detail: { theme } }));
      window.dispatchEvent(new CustomEvent("fahi-settings-change", { detail: { theme, showGrid, autoSave, muteOnLoad } }));
    }
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className={`relative w-full max-w-lg rounded-2xl border p-6 shadow-2xl transition-all duration-200 ${
        theme === "light" 
          ? "bg-white border-slate-300 text-slate-900" 
          : "bg-[#12141e] border-white/10 text-white"
      }`}>
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center space-x-2.5">
            <div className={`p-2 rounded-xl ${theme === "light" ? "bg-slate-100 text-slate-800" : "bg-cyan-500/20 text-cyan-400"}`}>
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">Editor Workspace Settings</h2>
              <p className={`text-xs ${theme === "light" ? "text-slate-500" : "text-gray-400"}`}>
                Customize themes, workspace contrast, and preferences
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              theme === "light" ? "hover:bg-slate-100 text-slate-600" : "hover:bg-white/10 text-gray-400"
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="py-5 space-y-6">
          
          {/* Workspace Theme Toggle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-cyan-500 flex items-center space-x-1.5">
                <Sun className="w-3.5 h-3.5" />
                <span>Workspace Appearance Theme</span>
              </label>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                theme === "light" ? "bg-amber-100 text-amber-800 font-bold" : "bg-cyan-950 text-cyan-400 font-bold"
              }`}>
                {theme === "light" ? "High-Contrast Light" : "Default Dark Studio"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Option 1: Dark Mode */}
              <div 
                onClick={() => handleSelectTheme("dark")}
                className={`relative p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  theme === "dark" 
                    ? "border-cyan-400 bg-cyan-950/20 shadow-md ring-2 ring-cyan-400/20" 
                    : theme === "light" ? "border-slate-200 bg-slate-50 hover:border-slate-300" : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Moon className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold">Dark Studio</span>
                  </div>
                  {theme === "dark" && <Check className="w-4 h-4 text-cyan-400" />}
                </div>
                <p className={`text-[10px] leading-relaxed ${theme === "light" ? "text-slate-500" : "text-gray-400"}`}>
                  Sleek dark canvas with glowing cyan accents. Ideal for video editing and low light.
                </p>
                <div className="mt-2.5 h-3 w-full rounded bg-[#0f0f0f] border border-white/20 flex items-center px-1">
                  <div className="h-1.5 w-4 bg-cyan-400 rounded-full" />
                </div>
              </div>

              {/* Option 2: High Contrast Light Mode */}
              <div 
                onClick={() => handleSelectTheme("light")}
                className={`relative p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  theme === "light" 
                    ? "border-amber-500 bg-amber-500/10 shadow-md ring-2 ring-amber-500/20 text-slate-900" 
                    : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">High Contrast Light</span>
                  </div>
                  {theme === "light" && <Check className="w-4 h-4 text-amber-600" />}
                </div>
                <p className={`text-[10px] leading-relaxed ${theme === "light" ? "text-slate-600" : "text-gray-400"}`}>
                  Bright white workspace with crisp high-contrast dark borders and maximum daytime legibility.
                </p>
                <div className="mt-2.5 h-3 w-full rounded bg-slate-100 border border-slate-400 flex items-center px-1">
                  <div className="h-1.5 w-4 bg-slate-900 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Toggle Preferences */}
          <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-white/10">
            <label className="text-xs font-bold uppercase tracking-wider text-cyan-500 block">
              Workspace Options
            </label>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-gray-200 dark:border-white/10">
                <div className="flex items-center space-x-2.5">
                  <Grid className="w-4 h-4 text-cyan-400" />
                  <div>
                    <p className="font-bold">Show Alignment Grid</p>
                    <p className={`text-[10px] ${theme === "light" ? "text-slate-500" : "text-gray-400"}`}>Overlay guide lines on video preview canvas</p>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={showGrid} 
                  onChange={(e) => setShowGrid(e.target.checked)}
                  className="w-4 h-4 accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl border border-gray-200 dark:border-white/10">
                <div className="flex items-center space-x-2.5">
                  <Save className="w-4 h-4 text-purple-400" />
                  <div>
                    <p className="font-bold">Auto-Save Project State</p>
                    <p className={`text-[10px] ${theme === "light" ? "text-slate-500" : "text-gray-400"}`}>Preserve edit sequence in local session storage</p>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={autoSave} 
                  onChange={(e) => setAutoSave(e.target.checked)}
                  className="w-4 h-4 accent-purple-400 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl border border-gray-200 dark:border-white/10">
                <div className="flex items-center space-x-2.5">
                  <Volume2 className="w-4 h-4 text-amber-400" />
                  <div>
                    <p className="font-bold">Mute Audio on Load</p>
                    <p className={`text-[10px] ${theme === "light" ? "text-slate-500" : "text-gray-400"}`}>Start new clips silently by default</p>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={muteOnLoad} 
                  onChange={(e) => setMuteOnLoad(e.target.checked)}
                  className="w-4 h-4 accent-amber-400 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-white/10">
          <button
            onClick={() => handleSelectTheme(theme === "dark" ? "light" : "dark")}
            className={`text-xs font-bold px-3 py-2 rounded-xl flex items-center space-x-1.5 transition-colors ${
              theme === "light" 
                ? "bg-slate-100 hover:bg-slate-200 text-slate-800" 
                : "bg-white/5 hover:bg-white/10 text-gray-300"
            }`}
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-cyan-400" />}
            <span>Quick Toggle Theme</span>
          </button>

          <button
            onClick={handleSaveSettings}
            className="bg-cyan-400 hover:bg-cyan-300 text-black px-5 py-2 rounded-xl font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center space-x-1.5"
          >
            {savedSuccess ? <Check className="w-4 h-4 text-green-800" /> : <Sparkles className="w-4 h-4" />}
            <span>{savedSuccess ? "Saved!" : "Apply Preferences"}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
