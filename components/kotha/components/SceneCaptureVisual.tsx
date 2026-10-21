import React from 'react';
import { Film } from 'lucide-react';
import { type SceneItem } from '../utils/dubbingLogic';

interface SceneCaptureVisualProps {
  scene: SceneItem;
  compact?: boolean;
  isPlaying?: boolean;
  uiLang?: 'bn' | 'en';
}

export const SceneCaptureVisual: React.FC<SceneCaptureVisualProps> = ({
  scene,
  compact = false,
  isPlaying = false,
  uiLang = 'bn',
}) => {
  const isEn = uiLang === 'en';

  if (scene.customFrameDataUrl) {
    return (
      <div className="relative w-full h-full bg-[#090D16] overflow-hidden select-none">
        <img
          src={scene.customFrameDataUrl}
          alt={scene.titleEn}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 text-xs text-slate-200 font-mono-tabular">
          <span className="truncate font-bangla">
            {isEn ? scene.titleEn : scene.titleBn}
          </span>
          <span className="shrink-0">{scene.timeRangeLabel}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full h-full overflow-hidden select-none bg-[#080C14] text-slate-100 flex flex-col justify-between ${
        compact ? 'p-3' : 'p-4 sm:p-6'
      }`}
    >
      {/* Subtle ambient background illumination */}
      <div className="pointer-events-none absolute inset-0 opacity-35 bg-gradient-to-tr from-sky-500/20 via-transparent to-teal-500/25" />

      {/* Top Frame Timecode & Status Bar */}
      <div className="relative z-10 flex items-center justify-between gap-2 text-[11px] sm:text-xs text-slate-400 font-mono-tabular border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-teal-400 font-semibold shrink-0">
            {isEn ? 'SCENE' : 'দৃশ্য'}{' '}
            {String(scene.sceneNumber).padStart(2, '0')}
          </span>
          <span aria-hidden="true">·</span>
          <span className="text-slate-200 shrink-0">{scene.timeRangeLabel}</span>
        </div>
        <span className="text-teal-300 font-bangla shrink-0 text-[11px]">
          {isPlaying
            ? isEn
              ? '▶ Playing Voiceover'
              : '▶ বাংলা ভয়েস চলছে'
            : isEn
              ? 'Scene Frame'
              : 'দৃশ্য ফ্রেম'}
        </span>
      </div>

      {/* Center Dynamic Scene Stage (100% driven by user scene data, zero mock brands) */}
      <div className="relative z-10 my-auto py-2 sm:py-3">
        <div className="rounded-xl bg-slate-900/95 border border-slate-800 p-3.5 sm:p-4 space-y-2">
          <div className="flex items-center justify-between gap-2 text-[11px] font-mono-tabular text-teal-400">
            <span className="flex items-center gap-1.5 truncate">
              <Film className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {scene.keyMetrics
                  .filter((m) => m !== scene.timeRangeLabel)
                  .join(' · ') ||
                  (isEn ? 'STORYBOARD SCENE' : 'স্টোরিবোর্ড দৃশ্য')}
              </span>
            </span>
            <span className="shrink-0">{scene.timeRangeLabel}</span>
          </div>
          <div className="text-sm sm:text-base font-bold text-white font-bangla leading-snug">
            {isEn ? scene.titleEn : scene.titleBn}
          </div>
          {!compact && (
            <p className="text-xs text-slate-300 font-bangla line-clamp-2">
              {scene.onScreenText || scene.englishSummary}
            </p>
          )}
        </div>
      </div>

      {/* Bottom On-Screen Video Caption */}
      <div className="relative z-10 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[11px] text-slate-300">
        <p className="truncate font-medium" title={scene.onScreenText}>
          {scene.onScreenText}
        </p>
        <span className="font-mono-tabular text-slate-400 shrink-0 hidden sm:inline">
          {scene.timeRangeLabel}
        </span>
      </div>
    </div>
  );
};
