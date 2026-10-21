import React, { useState } from 'react';
import {
  Play,
  Square,
  Volume2,
  Download,
  RefreshCw,
  Wand2,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Trash2,
} from 'lucide-react';
import {
  type SceneItem,
  type VoiceTone,
  estimateBanglaSpeechDuration,
} from '../utils/dubbingLogic';

interface SceneCardProps {
  scene: SceneItem;
  isSelected: boolean;
  isCurrentlyPlaying: boolean;
  speechSpeed: number;
  selectedTone: VoiceTone;
  canDelete?: boolean;
  uiLang?: 'bn' | 'en';
  onSelectScene: (sceneId: string) => void;
  onUpdateScript: (
    sceneId: string,
    newBanglaScript: string,
    newEnglishSummary?: string
  ) => void;
  onGenerateVoice: (sceneId: string) => Promise<void>;
  onPlaySceneVoice: (sceneId: string) => void;
  onStopPlayback: () => void;
  onDownloadSceneWav: (sceneId: string) => void;
  onAdaptSceneTone: (sceneId: string) => Promise<void>;
  onDeleteScene?: (sceneId: string) => void;
}

export const SceneCard: React.FC<SceneCardProps> = ({
  scene,
  isSelected,
  isCurrentlyPlaying,
  speechSpeed,
  canDelete = false,
  uiLang = 'bn',
  onSelectScene,
  onUpdateScript,
  onGenerateVoice,
  onPlaySceneVoice,
  onStopPlayback,
  onDownloadSceneWav,
  onAdaptSceneTone,
  onDeleteScene,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [isAdapting, setIsAdapting] = useState(false);
  const isEn = uiLang === 'en';

  const estimatedDuration =
    scene.audioDurationSec ||
    estimateBanglaSpeechDuration(scene.banglaScript, speechSpeed);

  const handleAdaptClick = async () => {
    setIsAdapting(true);
    try {
      await onAdaptSceneTone(scene.id);
    } finally {
      setIsAdapting(false);
    }
  };

  return (
    <article
      id={`scene-card-${scene.sceneNumber}`}
      className={`rounded-xl border transition-colors ${
        isCurrentlyPlaying
          ? 'bg-[#111C2D] border-teal-400'
          : isSelected
            ? 'bg-[#111827] border-teal-500/70'
            : 'bg-[#0F1623] border-slate-800/90 hover:border-slate-700'
      } p-4 sm:p-5 space-y-3.5`}
    >
      {/* Top Row: Scene Number, Timestamp, Status & Preview Selection */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <button
          type="button"
          onClick={() => onSelectScene(scene.id)}
          className="text-left flex flex-wrap items-center gap-2 text-xs font-mono-tabular cursor-pointer group"
        >
          <span className="text-teal-400 font-bold group-hover:underline">
            {isEn ? 'Scene' : 'দৃশ্য'}{' '}
            {String(scene.sceneNumber).padStart(2, '0')}
          </span>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <span className="text-slate-200 font-medium">
            {scene.timeRangeLabel}
          </span>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <span className="text-slate-400">~{estimatedDuration}s</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bangla">
            {scene.status === 'ready' ? (
              <span className="flex items-center gap-1 text-teal-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{isEn ? 'Voice Ready' : 'ভয়েস প্রস্তুত'}</span>
              </span>
            ) : scene.status === 'generating' ? (
              <span className="flex items-center gap-1 text-amber-400 font-medium">
                <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                <span>{isEn ? 'Dubbing...' : 'ডাবিং হচ্ছে...'}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-slate-400">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>{isEn ? 'Pending' : 'অপেক্ষমান'}</span>
              </span>
            )}
          </div>

          {canDelete && onDeleteScene && (
            <button
              type="button"
              onClick={() => onDeleteScene(scene.id)}
              aria-label={`Delete Scene ${scene.sceneNumber}`}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Scene Title (Bangla & English) */}
      <div
        onClick={() => onSelectScene(scene.id)}
        className="cursor-pointer space-y-0.5"
      >
        <h3 className="text-sm sm:text-base font-bold text-white font-bangla leading-snug">
          {isEn ? scene.titleEn : scene.titleBn}
        </h3>
        <p className="text-xs text-slate-400 line-clamp-1 font-bangla">
          {isEn ? scene.titleBn : scene.titleEn}
        </p>
      </div>

      {/* Editable Bangladeshi Bengali Narration Script */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label
            htmlFor={`bangla-script-${scene.sceneNumber}`}
            className="text-xs font-medium text-teal-300 font-bangla"
          >
            {isEn
              ? 'Bangla Voiceover Script (Editable)'
              : 'বাংলা ভয়েস কভার স্ক্রিপ্ট (এডিট করা যাবে)'}
          </label>
          <button
            type="button"
            disabled={isAdapting}
            onClick={handleAdaptClick}
            className="text-xs text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
          >
            <Wand2 className="w-3 h-3" />
            <span>
              {isAdapting
                ? isEn
                  ? 'Rewriting...'
                  : 'রি-রাইট হচ্ছে...'
                : isEn
                  ? 'AI Rewrite Tone'
                  : 'AI টোন পরিবর্তন'}
            </span>
          </button>
        </div>

        <textarea
          id={`bangla-script-${scene.sceneNumber}`}
          rows={3}
          value={scene.banglaScript}
          onChange={(e) => onUpdateScript(scene.id, e.target.value)}
          className="w-full rounded-lg bg-[#090D16] border border-slate-800 focus:border-teal-500 focus:outline-none px-3 py-2 text-sm text-slate-100 font-bangla leading-relaxed resize-y"
          placeholder={
            isEn
              ? 'Write or edit Bangladeshi Bengali voiceover script for this scene...'
              : 'এই দৃশ্যের জন্য বাংলা ভয়েসওভার লিখুন...'
          }
        />
      </div>

      {/* Collapsible English Summary & Phonetics (Keeps Card Clean & Uncluttered) */}
      <div>
        <button
          type="button"
          onClick={() => setShowDetails((prev) => !prev)}
          className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
        >
          {showDetails ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>
                {isEn
                  ? 'Hide English Summary & Phonetics'
                  : 'ইংরেজি সামারি ও উচ্চারণ লুকান'}
              </span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>
                {isEn
                  ? 'View English Summary & On-Screen Text'
                  : 'ইংরেজি সামারি ও অন-স্ক্রিন টেক্সট দেখুন'}
              </span>
            </>
          )}
        </button>

        {showDetails && (
          <div className="mt-2 p-3 rounded-lg bg-[#090D16] border border-slate-800/80 space-y-2 text-xs">
            <div>
              <span className="text-slate-400 font-medium">
                {isEn ? 'English Scene Summary: ' : 'ইংরেজি দৃশ্য সারসংক্ষেপ: '}
              </span>
              <span className="text-slate-200">{scene.englishSummary}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium">
                {isEn ? 'On-Screen Text: ' : 'অন-স্ক্রিন টেক্সট: '}
              </span>
              <span className="text-slate-300 font-mono-tabular">
                {scene.onScreenText}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium">
                {isEn ? 'Banglish Phonetics: ' : 'বাংলিশ উচ্চারণ গাইড: '}
              </span>
              <span className="text-slate-300 font-mono-tabular">
                {scene.phoneticGuide}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Responsive Touch-Friendly Action Bar */}
      <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
        {isCurrentlyPlaying ? (
          <button
            type="button"
            onClick={onStopPlayback}
            className="min-h-[40px] px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Square className="w-3.5 h-3.5 fill-current shrink-0" />
            <span>{isEn ? 'Stop' : 'থামান'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onPlaySceneVoice(scene.id)}
            className="min-h-[40px] px-3.5 py-2 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current shrink-0" />
            <span>
              {isEn
                ? `Play Scene ${scene.sceneNumber}`
                : `শুনুন (দৃশ্য ${scene.sceneNumber})`}
            </span>
          </button>
        )}

        <button
          type="button"
          disabled={scene.status === 'generating'}
          onClick={() => onGenerateVoice(scene.id)}
          className="min-h-[40px] px-3.5 py-2 text-xs font-medium text-slate-100 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
        >
          <Volume2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span>
            {scene.status === 'generating'
              ? isEn
                ? 'Generating...'
                : 'তৈরি হচ্ছে...'
              : scene.status === 'ready'
                ? isEn
                  ? 'Regenerate Voice'
                  : 'পুনরায় ভয়েস তৈরি'
                : isEn
                  ? 'Generate Voice'
                  : 'ভয়েস তৈরি করুন'}
          </span>
        </button>

        {scene.status === 'ready' && (
          <button
            type="button"
            onClick={() => onDownloadSceneWav(scene.id)}
            className="col-span-2 sm:col-span-1 min-h-[40px] px-3 py-2 text-xs font-medium text-slate-200 bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span>
              {isEn ? 'Download' : 'ডাউনলোড'}{' '}
              {scene.audioMimeType === 'audio/mpeg' ? 'MP3' : 'WAV'} (
              {estimatedDuration}s)
            </span>
          </button>
        )}
      </div>
    </article>
  );
};
