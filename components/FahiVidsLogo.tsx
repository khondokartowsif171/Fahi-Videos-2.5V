"use client";
import React, { useId } from "react";

export function FahiVidsMarkSvg({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 156 132"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={`fv-top-${uid}`}
          x1="10"
          y1="6"
          x2="124"
          y2="46"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#00F2FE" />
          <stop offset="60%" stopColor="#00C6FF" />
          <stop offset="100%" stopColor="#0072FF" />
        </linearGradient>
        <linearGradient
          id={`fv-mid-${uid}`}
          x1="10"
          y1="42"
          x2="52"
          y2="112"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#0066FF" />
          <stop offset="100%" stopColor="#002670" />
        </linearGradient>
        <linearGradient
          id={`fv-bot-${uid}`}
          x1="12"
          y1="82"
          x2="112"
          y2="120"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#0044FF" />
          <stop offset="55%" stopColor="#0088FF" />
          <stop offset="100%" stopColor="#00D4FF" />
        </linearGradient>
        <linearGradient
          id={`fv-cone-${uid}`}
          x1="104"
          y1="34"
          x2="152"
          y2="98"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#00D2FF" />
          <stop offset="100%" stopColor="#0048C8" />
        </linearGradient>
      </defs>

      {/* Top 3D Cyan Ribbon of "F" */}
      <path
        d="M10 34C10 17.431 23.431 4 40 4H114C119.523 4 123.158 9.756 120.742 14.72L113.6 29.4C109.71 37.396 101.593 42.47 92.696 42.47H46C39.373 42.47 34 47.843 34 54.47V102C34 110.837 26.837 118 18 118C13.582 118 10 114.418 10 110V34Z"
        fill={`url(#fv-top-${uid})`}
      />

      {/* Left Vertical Ribbon Fold */}
      <path
        d="M10 66C10 50 22 42.47 40 42.47H32C19.85 42.47 10 52.32 10 64.47V110C10 114.418 13.582 118 18 118C26.837 118 34 110.837 34 102V74C26 79 16 82 10 86V66Z"
        fill={`url(#fv-mid-${uid})`}
      />

      {/* Bottom Sweeping Ribbon Curve */}
      <path
        d="M10 108C10 99 19 93 31 88L94 61C100.5 58.2 108 62.9 108 70V81C108 87.8 103.9 93.9 97.6 96.6L30 125.2C19.5 129.6 10 121.9 10 110.5V108Z"
        fill={`url(#fv-bot-${uid})`}
      />

      {/* Center Play Triangle */}
      <path
        d="M50 50.5C50 46.75 54.12 44.46 57.31 46.44L86.5 64.56C89.53 66.44 89.53 70.86 86.5 72.74L57.31 90.86C54.12 92.84 50 90.55 50 86.8V50.5Z"
        fill="#00D8FF"
      />

      {/* Right Camera Lens Cone */}
      <path
        d="M106 55.5L140 35.8C145.33 32.71 152 36.56 152 42.72V90.28C152 96.44 145.33 100.29 140 97.2L106 77.5V55.5Z"
        fill={`url(#fv-cone-${uid})`}
      />
    </svg>
  );
}

export default function FahiVidsLogo({
  size = 32,
  showSubtitle = false,
  iconOnly = false,
  className = "",
}: {
  size?: number;
  showSubtitle?: boolean;
  iconOnly?: boolean;
  className?: string;
}) {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <FahiVidsMarkSvg
        size={size}
        className="drop-shadow-[0_0_10px_rgba(0,212,255,0.4)] shrink-0"
      />
      {!iconOnly && (
        <div className="flex flex-col leading-none">
          <div className="flex items-baseline tracking-tight font-black text-lg">
            <span className="text-white">Fahi</span>
            <span className="bg-gradient-to-r from-[#00E5FF] via-[#0099FF] to-[#0055FF] bg-clip-text text-transparent">
              Vids
            </span>
          </div>
          {showSubtitle && (
            <span className="text-[8.5px] font-semibold tracking-[0.22em] text-slate-400 uppercase mt-0.5">
              Professional Video Studio
            </span>
          )}
        </div>
      )}
    </div>
  );
}
