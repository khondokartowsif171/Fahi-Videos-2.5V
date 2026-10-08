import React from 'react';

interface AuraLogoProps {
  size?: number | string;
  variant?: 'icon' | 'compact' | 'full';
  className?: string;
  showGlow?: boolean;
}

export default function AuraLogo({
  size = 36,
  variant = 'icon',
  className = '',
  showGlow = true,
}: AuraLogoProps) {
  const pixelSize = typeof size === 'number' ? size : parseInt(size) || 36;

  // Standalone vector emblem
  const Emblem = (
    <svg
      viewBox="0 0 200 200"
      width={pixelSize}
      height={pixelSize}
      className={`shrink-0 ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Ambient Back Glow */}
        <filter id="auraGlow" x="-30%" y="-30%" width="160%" height="160%" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="12" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        {/* Outer Ring Glow */}
        <filter id="ringGlow" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        {/* Gradients */}
        <linearGradient id="stemLeft" x1="50" y1="165" x2="95" y2="35" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="25%" stopColor="#1e3a8a" />
          <stop offset="70%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>

        <linearGradient id="stemRight" x1="105" y1="35" x2="155" y2="165" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#9333ea" />
          <stop offset="45%" stopColor="#0284c7" />
          <stop offset="85%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>

        <linearGradient id="bevelHighlight" x1="90" y1="35" x2="140" y2="165" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#e0e7ff" stopOpacity="0.9" />
          <stop offset="30%" stopColor="#a5b4fc" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.1" />
        </linearGradient>

        <linearGradient id="ringGrad" x1="30" y1="135" x2="175" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="25%" stopColor="#38bdf8" />
          <stop offset="60%" stopColor="#818cf8" />
          <stop offset="85%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#f472b6" />
        </linearGradient>

        <radialGradient id="cloudAura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
          <stop offset="45%" stopColor="#818cf8" stopOpacity="0.2" />
          <stop offset="75%" stopColor="#c084fc" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Background Soft Aura Cloud */}
      {showGlow && (
        <circle cx="100" cy="100" r="78" fill="url(#cloudAura)" filter="url(#auraGlow)" />
      )}

      {/* Back Segment of the Orbital Ring (passes behind apex) */}
      <path
        d="M 62 108 C 72 82, 125 70, 162 86"
        stroke="url(#ringGrad)"
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.7"
      />

      {/* Left Leg of "A" */}
      <path
        d="M 98 38 L 52 158 L 78 158 L 98 102 Z"
        fill="url(#stemLeft)"
      />

      {/* Right Leg of "A" */}
      <path
        d="M 98 38 L 98 102 L 118 158 L 146 158 Z"
        fill="url(#stemRight)"
      />

      {/* Bevel 3D facets on Left stem */}
      <path
        d="M 98 38 L 78 158 L 86 158 L 102 70 Z"
        fill="#ffffff"
        fillOpacity="0.18"
      />

      {/* Bevel 3D facet on Right stem */}
      <path
        d="M 98 38 L 102 70 L 126 158 L 118 158 Z"
        fill="url(#bevelHighlight)"
      />

      {/* Inner Triangle of "A" */}
      <path
        d="M 98 68 L 86 98 L 110 98 Z"
        fill="#050508"
      />

      {/* Front Dynamic Orbital Swoosh Ring */}
      <path
        d="M 38 128 C 42 142, 85 146, 128 130 C 158 118, 174 98, 168 84 C 162 70, 134 76, 105 88 C 65 104, 34 116, 38 128 Z"
        fill="url(#ringGrad)"
        filter="url(#ringGlow)"
      />
      <path
        d="M 44 127 C 65 137, 115 136, 155 116 C 168 110, 172 96, 165 88"
        stroke="#ffffff"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.85"
      />

      {/* Sparkling Stars / Sparkles */}
      {/* Top right sparkle */}
      <g transform="translate(162, 64) scale(0.9)">
        <path
          d="M 0 -8 Q 0 0 8 0 Q 0 0 0 8 Q 0 0 -8 0 Q 0 0 0 -8 Z"
          fill="#e0e7ff"
        />
        <circle cx="0" cy="0" r="1.5" fill="#ffffff" />
      </g>
      {/* Mini accent sparkle */}
      <g transform="translate(176, 78) scale(0.55)">
        <path
          d="M 0 -8 Q 0 0 8 0 Q 0 0 0 8 Q 0 0 -8 0 Q 0 0 0 -8 Z"
          fill="#c084fc"
        />
      </g>
    </svg>
  );

  if (variant === 'icon') {
    return Emblem;
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center space-x-2.5 ${className}`}>
        {Emblem}
        <div className="flex flex-col">
          <span className="text-xs font-bold tracking-wider text-white uppercase leading-tight flex items-center gap-1">
            <span className="bg-gradient-to-r from-blue-400 via-violet-300 to-cyan-300 bg-clip-text text-transparent">
              Aura
            </span>
            <span>Studio</span>
          </span>
          <span className="text-[9px] text-neutral-400 font-medium tracking-widest uppercase">
            Image to Video
          </span>
        </div>
      </div>
    );
  }

  // Full Brand Lockup
  return (
    <div className={`flex items-center space-x-3.5 select-none ${className}`}>
      {Emblem}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="text-base font-extrabold tracking-wider bg-gradient-to-r from-sky-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent uppercase">
            Aura
          </span>
          <span className="text-base font-extrabold tracking-wider text-white uppercase">
            Studio
          </span>
        </div>
        <div className="flex items-center space-x-1.5 text-[9px] tracking-widest text-neutral-400 font-semibold uppercase">
          <span>Image to Video</span>
          <span className="text-neutral-600">·</span>
          <span className="text-violet-400">Atelier</span>
        </div>
      </div>
    </div>
  );
}
