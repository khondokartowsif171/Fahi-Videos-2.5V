import React, { useState } from 'react';
import { X, Download, Copy, Check, Sparkles, Image as ImageIcon } from 'lucide-react';
import AuraLogo from './AuraLogo';

interface AuraLogoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuraLogoModal({ isOpen, onClose }: AuraLogoModalProps) {
  const [bgMode, setBgMode] = useState<'dark' | 'light' | 'grid'>('dark');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const svgContent = `<svg viewBox="0 0 200 200" width="200" height="200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="auraGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="12" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="ringGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3.5" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <linearGradient id="stemLeft" x1="50" y1="165" x2="95" y2="35" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="25%" stop-color="#1e3a8a" />
      <stop offset="70%" stop-color="#2563eb" />
      <stop offset="100%" stop-color="#7c3aed" />
    </linearGradient>
    <linearGradient id="stemRight" x1="105" y1="35" x2="155" y2="165" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#9333ea" />
      <stop offset="45%" stop-color="#0284c7" />
      <stop offset="85%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#14b8a6" />
    </linearGradient>
    <linearGradient id="ringGrad" x1="30" y1="135" x2="175" y2="85" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="25%" stop-color="#38bdf8" />
      <stop offset="60%" stop-color="#818cf8" />
      <stop offset="85%" stop-color="#c084fc" />
      <stop offset="100%" stop-color="#f472b6" />
    </linearGradient>
    <radialGradient id="cloudAura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.35" />
      <stop offset="45%" stop-color="#818cf8" stop-opacity="0.2" />
      <stop offset="75%" stop-color="#c084fc" stop-opacity="0.08" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
  </defs>
  <circle cx="100" cy="100" r="78" fill="url(#cloudAura)" filter="url(#auraGlow)" />
  <path d="M 62 108 C 72 82, 125 70, 162 86" stroke="url(#ringGrad)" stroke-width="6" stroke-linecap="round" opacity="0.7" />
  <path d="M 98 38 L 52 158 L 78 158 L 98 102 Z" fill="url(#stemLeft)" />
  <path d="M 98 38 L 98 102 L 118 158 L 146 158 Z" fill="url(#stemRight)" />
  <path d="M 98 38 L 78 158 L 86 158 L 102 70 Z" fill="#ffffff" fill-opacity="0.18" />
  <path d="M 98 68 L 86 98 L 110 98 Z" fill="#050508" />
  <path d="M 38 128 C 42 142, 85 146, 128 130 C 158 118, 174 98, 168 84 C 162 70, 134 76, 105 88 C 65 104, 34 116, 38 128 Z" fill="url(#ringGrad)" filter="url(#ringGlow)" />
  <g transform="translate(162, 64) scale(0.9)">
    <path d="M 0 -8 Q 0 0 8 0 Q 0 0 0 8 Q 0 0 -8 0 Q 0 0 0 -8 Z" fill="#e0e7ff" />
  </g>
</svg>`;

  const handleCopySvg = () => {
    navigator.clipboard.writeText(svgContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSvg = () => {
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aura-studio-logo.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-[#0f0f12] border border-[#242428] rounded-2xl w-full max-w-2xl p-6 shadow-2xl flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#222226]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-[1.5px]">
              <div className="w-full h-full bg-black rounded-[6.5px] flex items-center justify-center">
                <Sparkles size={15} className="text-cyan-300" />
              </div>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Aura Studio Brand Identity
              </h2>
              <p className="text-[10px] text-neutral-400">
                Official Logo Emblem & Vector Assets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Viewport Display Stage */}
        <div className="space-y-2">
          {/* Background selector */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-neutral-400 font-bold tracking-wider">
              Canvas Preview
            </span>
            <div className="flex items-center space-x-1.5 bg-[#16161a] p-1 rounded-md border border-[#26262c]">
              <button
                onClick={() => setBgMode('dark')}
                className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-all ${
                  bgMode === 'dark' ? 'bg-black text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Dark
              </button>
              <button
                onClick={() => setBgMode('light')}
                className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-all ${
                  bgMode === 'light' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Light
              </button>
              <button
                onClick={() => setBgMode('grid')}
                className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-all ${
                  bgMode === 'grid' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Grid
              </button>
            </div>
          </div>

          {/* Canvas Box */}
          <div
            className={`h-56 rounded-xl border border-[#26262a] flex flex-col items-center justify-center relative overflow-hidden transition-colors ${
              bgMode === 'dark'
                ? 'bg-[#060608]'
                : bgMode === 'light'
                ? 'bg-slate-100 text-black'
                : 'bg-[#121215] bg-[radial-gradient(#262626_1px,transparent_1px)] [background-size:16px_16px]'
            }`}
          >
            <div className="flex flex-col items-center gap-3">
              <AuraLogo size={100} showGlow={true} />
              <div className="flex flex-col items-center text-center">
                <span className={`text-xl font-extrabold tracking-wider uppercase ${bgMode === 'light' ? 'text-black' : 'text-white'}`}>
                  <span className="bg-gradient-to-r from-blue-500 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                    AURA
                  </span>{' '}
                  STUDIO
                </span>
                <span className={`text-[10px] tracking-widest uppercase font-semibold mt-0.5 ${bgMode === 'light' ? 'text-neutral-600' : 'text-neutral-400'}`}>
                  Image to Video Atelier
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Variations Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#141418] border border-[#222226] rounded-xl p-3 flex flex-col items-center justify-center gap-2 text-center">
            <AuraLogo size={36} />
            <span className="text-[10px] font-mono text-neutral-400 font-bold uppercase tracking-wider">
              Icon (36px)
            </span>
          </div>

          <div className="bg-[#141418] border border-[#222226] rounded-xl p-3 flex flex-col items-center justify-center gap-2 text-center">
            <AuraLogo size={54} />
            <span className="text-[10px] font-mono text-neutral-400 font-bold uppercase tracking-wider">
              Emblem (54px)
            </span>
          </div>

          <div className="bg-[#141418] border border-[#222226] rounded-xl p-3 flex flex-col items-center justify-center gap-2 text-center">
            <AuraLogo size={32} variant="compact" />
            <span className="text-[10px] font-mono text-neutral-400 font-bold uppercase tracking-wider">
              Header Lockup
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-[#222226]">
          <span className="text-[10px] text-neutral-400 font-mono">
            Vector SVG · Infinite Resolution
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopySvg}
              className="bg-[#1a1a20] hover:bg-[#25252c] text-white border border-[#2e2e38] text-xs px-3.5 py-2 rounded-lg flex items-center space-x-1.5 transition-colors font-medium"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copied ? 'Copied SVG' : 'Copy SVG'}</span>
            </button>

            <button
              onClick={handleDownloadSvg}
              className="bg-white hover:bg-neutral-200 text-black text-xs font-bold px-4 py-2 rounded-lg flex items-center space-x-1.5 uppercase tracking-wider transition-colors"
            >
              <Download size={13} strokeWidth={2.5} />
              <span>Download SVG</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
