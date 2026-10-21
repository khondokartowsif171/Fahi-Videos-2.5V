import { kothaFetch as fetch } from './api-client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Square,
  SkipBack,
  SkipForward,
  Download,
  Sparkles,
  FileText,
  FileAudio,
  Film,
  Search,
  Layers,
  ChevronDown,
  ChevronUp,
  Trash2,
  Video,
  Globe,
  Plus,
  Upload,
} from 'lucide-react';
import {
  type SceneItem,
  type VoicePersonaId,
  type VoiceTone,
  VOICE_PERSONAS,
  TONE_PRESETS,
  formatTimestamp,
  estimateBanglaSpeechDuration,
  adaptToneInBangla,
  generateSrtSubtitles,
  createSynthesizedSpeechWav,
  mergeWavBuffers,
  filterScenes,
} from './utils/dubbingLogic';
import { SceneCaptureVisual } from './components/SceneCaptureVisual';
import { SceneCard } from './components/SceneCard';
import { VideoFrameExtractorModal } from './components/VideoFrameExtractorModal';
import { DynamicVideoRecorderModal } from './components/DynamicVideoRecorderModal';

const STORAGE_KEY = 'kothastudio_clean_project_v3';
const LEGACY_STORAGE_KEYS = [
  'kothastudio_saved_project_v2',
  'kothastudio_saved_project_v1',
];
const LANG_STORAGE_KEY = 'kothastudio_ui_lang';

const DEFAULT_TITLE_BN = 'নতুন বাংলা ভয়েস কভার প্রজেক্ট';
const DEFAULT_TITLE_EN = 'New Bangla Voiceover Project';
const DEFAULT_BANNER_BN =
  'আপনার যেকোনো ভিডিও ফাইল আপলোড করে অটো সিন ক্যাপচার করুন অথবা সরাসরি নতুন দৃশ্য যুক্ত করে বাংলা ভয়েস কভার তৈরি করুন।';
const DEFAULT_BANNER_EN =
  'Upload any video file to auto-capture scenes or add a new scene directly to generate Bangladeshi Bengali voiceovers.';

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export default function App() {
  const [uiLang, setUiLang] = useState<'bn' | 'en'>(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (saved === 'en' || saved === 'bn') return saved;
    } catch {
      // ignore storage read error
    }
    return 'bn';
  });
  const isEn = uiLang === 'en';

  // Purge any legacy mock storage keys on mount
  useEffect(() => {
    try {
      for (const k of LEGACY_STORAGE_KEYS) {
        localStorage.removeItem(k);
      }
    } catch {
      // ignore storage error
    }
  }, []);

  const [projectTitle, setProjectTitle] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.projectTitle) return parsed.projectTitle;
      }
    } catch {
      // ignore storage read error
    }
    return uiLang === 'en' ? DEFAULT_TITLE_EN : DEFAULT_TITLE_BN;
  });

  // 100% Mock-Free: Starts empty unless the user previously saved their own scenes
  const [scenes, setScenes] = useState<SceneItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.scenes)) {
          return parsed.scenes.map((s: SceneItem) => ({
            ...s,
            status: 'pending',
            audioUrl: undefined,
            audioRawBytes: undefined,
            audioWavBytes: undefined,
          }));
        }
      }
    } catch {
      // ignore storage read error
    }
    return [];
  });

  const [selectedSceneId, setSelectedSceneId] = useState<string>(
    () => scenes[0]?.id || ''
  );
  const [selectedPersonaId, setSelectedPersonaId] =
    useState<VoicePersonaId>('Kore');
  const [selectedTone, setSelectedTone] = useState<VoiceTone>('commercial');
  const [speechSpeed, setSpeechSpeed] = useState<number>(1.0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ready' | 'pending'>(
    'all'
  );
  const [bilingualSubtitles, setBilingualSubtitles] = useState<boolean>(true);
  const [showSrtPreview, setShowSrtPreview] = useState<boolean>(false);
  const [isBatchGenerating, setIsBatchGenerating] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [playingSceneId, setPlayingSceneId] = useState<string | null>(null);
  const [isContinuousPlay, setIsContinuousPlay] = useState<boolean>(false);
  const [isExtractorModalOpen, setIsExtractorModalOpen] =
    useState<boolean>(false);
  const [isRecorderModalOpen, setIsRecorderModalOpen] =
    useState<boolean>(false);
  const [attachedVideoUrl, setAttachedVideoUrl] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string>(() =>
    uiLang === 'en' ? DEFAULT_BANNER_EN : DEFAULT_BANNER_BN
  );

  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const syncedVideoRef = useRef<HTMLVideoElement | null>(null);
  const continuousPlayFlagRef = useRef<boolean>(false);
  const playbackSessionIdRef = useRef<number>(0);
  const scenesRef = useRef<SceneItem[]>(scenes);
  scenesRef.current = scenes;

  const handleToggleLanguage = () => {
    const nextLang: 'bn' | 'en' = uiLang === 'bn' ? 'en' : 'bn';
    setUiLang(nextLang);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, nextLang);
    } catch {
      // ignore storage error
    }
    setProjectTitle((prev) => {
      if (prev === DEFAULT_TITLE_BN || prev === DEFAULT_TITLE_EN) {
        return nextLang === 'en' ? DEFAULT_TITLE_EN : DEFAULT_TITLE_BN;
      }
      return prev;
    });
    setBannerMessage((prev) => {
      if (prev === DEFAULT_BANNER_BN || prev === DEFAULT_BANNER_EN) {
        return nextLang === 'en' ? DEFAULT_BANNER_EN : DEFAULT_BANNER_BN;
      }
      return prev;
    });
  };

  // Auto-save user's own project metadata & scripts to browser LocalStorage
  useEffect(() => {
    try {
      const serializableScenes = scenes.map(
        ({ audioUrl: _a, audioRawBytes: _r, audioWavBytes: _w, ...rest }) => ({
          ...rest,
          status: 'pending',
        })
      );
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          projectTitle,
          scenes: serializableScenes,
        })
      );
    } catch {
      // ignore quota errors when customFrameDataUrl is large
    }
  }, [projectTitle, scenes]);

  const activeScene: SceneItem | undefined =
    scenes.find((s) => s.id === selectedSceneId) || scenes[0];
  const activePersona =
    VOICE_PERSONAS.find((p) => p.id === selectedPersonaId) || VOICE_PERSONAS[0];
  const activePersonaDisplayName = isEn
    ? activePersona.nameEn
    : activePersona.nameBn;

  const readyScenesCount = scenes.filter((s) => s.status === 'ready').length;
  const totalEstimatedDuration = Number(
    scenes
      .reduce(
        (acc, s) =>
          acc +
          (s.audioDurationSec ||
            estimateBanglaSpeechDuration(s.banglaScript, speechSpeed)),
        0
      )
      .toFixed(1)
  );

  const stopAllPlayback = useCallback(() => {
    playbackSessionIdRef.current += 1;
    continuousPlayFlagRef.current = false;
    setIsContinuousPlay(false);
    setPlayingSceneId(null);

    if (audioElementRef.current) {
      audioElementRef.current.onended = null;
      audioElementRef.current.onerror = null;
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      audioElementRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (syncedVideoRef.current) {
      syncedVideoRef.current.pause();
    }
  }, []);

  useEffect(() => {
    return () => {
      stopAllPlayback();
    };
  }, [stopAllPlayback]);

  // Generate Bangladeshi Bengali voiceover for a single scene via Server-Side TTS + Fallback
  const generateVoiceForScene = useCallback(
    async (
      sceneId: string,
      personaOverride?: VoicePersonaId,
      toneOverride?: VoiceTone
    ): Promise<{
      audioUrl: string;
      rawBytes: Uint8Array;
      wavBytes: Uint8Array;
      mimeType: string;
      durationSec: number;
    } | null> => {
      const targetScene = scenesRef.current.find((s) => s.id === sceneId);
      if (!targetScene || !targetScene.banglaScript.trim()) return null;

      const persona =
        VOICE_PERSONAS.find(
          (p) => p.id === (personaOverride || selectedPersonaId)
        ) || VOICE_PERSONAS[0];
      const tone = toneOverride || selectedTone;
      const estDuration = estimateBanglaSpeechDuration(
        targetScene.banglaScript,
        speechSpeed
      );

      setScenes((prev) =>
        prev.map((s) =>
          s.id === sceneId ? { ...s, status: 'generating' } : s
        )
      );

      try {
        const res = await fetch('/api/tts/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: targetScene.banglaScript,
            voiceName: persona.id,
            stylePrompt: persona.stylePrompt,
            durationSec: estDuration,
            basePitchHz: persona.basePitchHz,
          }),
        });

        let audioBytes: Uint8Array;
        let mimeType = 'audio/wav';
        let engineUsed: SceneItem['sourceEngine'] = 'gemini-tts';
        let finalDuration = estDuration;

        if (res.ok) {
          const data = await res.json();
          audioBytes = base64ToUint8Array(data.audioBase64);
          mimeType = data.mimeType || 'audio/wav';
          engineUsed = data.engine || 'gemini-tts';
          finalDuration = Number(data.durationSec) || estDuration;
        } else {
          audioBytes = createSynthesizedSpeechWav(
            targetScene.banglaScript,
            estDuration,
            persona.basePitchHz
          );
          mimeType = 'audio/wav';
          engineUsed = 'synthesized-wav';
        }

        const blob = new Blob([audioBytes as unknown as BlobPart], {
          type: mimeType,
        });
        const audioUrl = URL.createObjectURL(blob);

        const wavForExport =
          mimeType === 'audio/wav'
            ? audioBytes
            : createSynthesizedSpeechWav(
                targetScene.banglaScript,
                finalDuration,
                persona.basePitchHz
              );

        setScenes((prev) =>
          prev.map((s) =>
            s.id === sceneId
              ? {
                  ...s,
                  status: 'ready',
                  audioUrl,
                  audioRawBytes: audioBytes,
                  audioWavBytes: wavForExport,
                  audioMimeType: mimeType,
                  audioDurationSec: finalDuration,
                  voiceUsed: persona.id,
                  toneUsed: tone,
                  sourceEngine: engineUsed,
                }
              : s
          )
        );

        return {
          audioUrl,
          rawBytes: audioBytes,
          wavBytes: wavForExport,
          mimeType,
          durationSec: finalDuration,
        };
      } catch {
        const wavBytes = createSynthesizedSpeechWav(
          targetScene.banglaScript,
          estDuration,
          persona.basePitchHz
        );
        const blob = new Blob([wavBytes as unknown as BlobPart], {
          type: 'audio/wav',
        });
        const audioUrl = URL.createObjectURL(blob);

        setScenes((prev) =>
          prev.map((s) =>
            s.id === sceneId
              ? {
                  ...s,
                  status: 'ready',
                  audioUrl,
                  audioRawBytes: wavBytes,
                  audioWavBytes: wavBytes,
                  audioMimeType: 'audio/wav',
                  audioDurationSec: estDuration,
                  voiceUsed: persona.id,
                  toneUsed: tone,
                  sourceEngine: 'synthesized-wav',
                }
              : s
          )
        );
        return {
          audioUrl,
          rawBytes: wavBytes,
          wavBytes,
          mimeType: 'audio/wav',
          durationSec: estDuration,
        };
      }
    },
    [selectedPersonaId, selectedTone, speechSpeed]
  );

  const handleGenerateSingleScene = async (sceneId: string) => {
    setSelectedSceneId(sceneId);
    const sceneObj = scenesRef.current.find((s) => s.id === sceneId);
    if (!sceneObj || !sceneObj.banglaScript.trim()) {
      setBannerMessage(
        isEn
          ? 'Please enter a Bangla voiceover script for this scene first.'
          : 'অনুগ্রহ করে প্রথমে এই দৃশ্যের জন্য বাংলা ভয়েসওভার স্ক্রিপ্ট লিখুন।'
      );
      return;
    }
    const result = await generateVoiceForScene(sceneId);
    if (result) {
      const numLabel = String(sceneObj.sceneNumber).padStart(2, '0');
      setBannerMessage(
        isEn
          ? `Bangla voiceover generated for Scene ${numLabel} (${sceneObj.timeRangeLabel}) — ${result.durationSec}s.`
          : `দৃশ্য ${numLabel} (${sceneObj.timeRangeLabel})-এর বাংলা ভয়েস তৈরি সম্পন্ন হয়েছে (${result.durationSec}s)।`
      );
    }
  };

  // Batch generate all scenes one-by-one
  const handleGenerateAllVoices = async () => {
    if (isBatchGenerating || scenesRef.current.length === 0) return;
    const currentList = scenesRef.current;
    const scenesWithScript = currentList.filter(
      (s) => s.banglaScript.trim().length > 0
    );
    if (scenesWithScript.length === 0) {
      setBannerMessage(
        isEn
          ? 'Please enter a Bangla voiceover script in at least one scene before generating voices.'
          : 'ভয়েস তৈরি করার আগে অনুগ্রহ করে অন্তত একটি দৃশ্যে বাংলা স্ক্রিপ্ট লিখুন।'
      );
      return;
    }

    stopAllPlayback();
    setIsBatchGenerating(true);
    setBatchProgress({ current: 0, total: currentList.length });
    setBannerMessage(
      isEn
        ? `Generating Bangladeshi Bengali voiceovers for ${scenesWithScript.length} scenes one by one...`
        : `সবগুলো দৃশ্যের (${scenesWithScript.length}টি) বাংলা ভয়েস এক এক করে তৈরি হচ্ছে...`
    );

    for (let i = 0; i < currentList.length; i++) {
      const item = currentList[i];
      setBatchProgress({ current: i + 1, total: currentList.length });
      if (!item.banglaScript.trim()) continue;
      setSelectedSceneId(item.id);
      await generateVoiceForScene(item.id);
    }

    setIsBatchGenerating(false);
    setBatchProgress(null);
    setBannerMessage(
      isEn
        ? `All ${scenesWithScript.length} scenes are ready (${activePersona.nameEn})! Click "Play All" or "Record Dynamic Video".`
        : `সবগুলো দৃশ্যের (${scenesWithScript.length}টি) বাংলা ভয়েস কভার প্রস্তুত (${activePersona.nameBn})! এখন "সব চালান" অথবা "ডাইনামিক ভিডিও রেকর্ড" বাটনে ক্লিক করুন।`
    );
  };

  // Play a single scene's voice cover (single exclusive audio track)
  const playSceneById = useCallback(
    async (sceneId: string, onEndedCallback?: () => void) => {
      const target = scenesRef.current.find((s) => s.id === sceneId);
      if (!target) return;

      if (!target.banglaScript.trim()) {
        setSelectedSceneId(sceneId);
        if (onEndedCallback) {
          onEndedCallback();
        } else {
          setPlayingSceneId(null);
          setBannerMessage(
            isEn
              ? 'Please enter a Bangla voiceover script for this scene before playing.'
              : 'শোনার আগে অনুগ্রহ করে এই দৃশ্যের জন্য বাংলা ভয়েসওভার স্ক্রিপ্ট লিখুন।'
          );
        }
        return;
      }

      const currentSessionId = playbackSessionIdRef.current + 1;
      playbackSessionIdRef.current = currentSessionId;

      if (audioElementRef.current) {
        audioElementRef.current.onended = null;
        audioElementRef.current.onerror = null;
        audioElementRef.current.pause();
        audioElementRef.current.currentTime = 0;
        audioElementRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }

      setSelectedSceneId(sceneId);
      setPlayingSceneId(sceneId);

      if (syncedVideoRef.current) {
        try {
          syncedVideoRef.current.muted = true;
          syncedVideoRef.current.currentTime = target.startTimeSec;
          syncedVideoRef.current.play().catch(() => {});
        } catch {
          // ignore video seek errors
        }
      }

      let audioUrlToPlay = target.audioUrl;
      if (!audioUrlToPlay || target.voiceUsed !== selectedPersonaId) {
        const generated = await generateVoiceForScene(sceneId);
        if (playbackSessionIdRef.current !== currentSessionId) {
          return;
        }
        audioUrlToPlay = generated?.audioUrl;
      }

      if (playbackSessionIdRef.current !== currentSessionId) {
        return;
      }

      if (audioUrlToPlay) {
        const audio = new Audio(audioUrlToPlay);
        audio.playbackRate = speechSpeed;
        audioElementRef.current = audio;

        audio.onended = () => {
          if (playbackSessionIdRef.current !== currentSessionId) return;
          if (onEndedCallback) {
            onEndedCallback();
          } else {
            setPlayingSceneId(null);
            if (syncedVideoRef.current) {
              syncedVideoRef.current.pause();
            }
          }
        };

        audio.onerror = () => {
          if (playbackSessionIdRef.current !== currentSessionId) return;
          if (onEndedCallback) {
            onEndedCallback();
          } else {
            setPlayingSceneId(null);
          }
        };

        try {
          await audio.play();
        } catch {
          setTimeout(() => {
            if (playbackSessionIdRef.current !== currentSessionId) return;
            if (onEndedCallback) {
              onEndedCallback();
            } else {
              setPlayingSceneId(null);
            }
          }, 1200);
        }
      } else if (onEndedCallback) {
        onEndedCallback();
      } else {
        setPlayingSceneId(null);
      }
    },
    [generateVoiceForScene, speechSpeed, selectedPersonaId, isEn]
  );

  // Play all scenes sequentially one-by-one
  const handleStartContinuousPlay = async () => {
    if (scenesRef.current.length === 0) return;
    stopAllPlayback();
    continuousPlayFlagRef.current = true;
    setIsContinuousPlay(true);

    const list = scenesRef.current;
    const startIndex = Math.max(
      0,
      list.findIndex((s) => s.id === selectedSceneId)
    );

    const playStep = (index: number) => {
      if (!continuousPlayFlagRef.current || index >= list.length) {
        stopAllPlayback();
        setBannerMessage(
          isEn
            ? 'Completed continuous Bangladeshi Bengali voiceover playback.'
            : 'সম্পূর্ণ ভিডিওর ধারাবাহিক বাংলা ভয়েসওভার প্লেব্যাক শেষ হয়েছে।'
        );
        return;
      }
      const sceneToPlay = list[index];
      const numLabel = String(sceneToPlay.sceneNumber).padStart(2, '0');
      setBannerMessage(
        isEn
          ? `Playing Scene ${numLabel}/${list.length} (${sceneToPlay.timeRangeLabel}): ${sceneToPlay.titleEn}`
          : `চলছে দৃশ্য ${numLabel}/${list.length} (${sceneToPlay.timeRangeLabel}): ${sceneToPlay.titleBn}`
      );
      playSceneById(sceneToPlay.id, () => {
        if (continuousPlayFlagRef.current) {
          playStep(index + 1);
        }
      });
    };

    playStep(startIndex);
  };

  const handleUpdateScript = (
    sceneId: string,
    newBanglaScript: string,
    newEnglishSummary?: string
  ) => {
    setScenes((prev) =>
      prev.map((s) =>
        s.id === sceneId
          ? {
              ...s,
              banglaScript: newBanglaScript,
              englishSummary:
                newEnglishSummary !== undefined
                  ? newEnglishSummary
                  : s.englishSummary,
              status: 'pending',
              audioUrl: undefined,
            }
          : s
      )
    );
  };

  const handleDeleteScene = (sceneId: string) => {
    stopAllPlayback();
    setScenes((prev) => {
      const remaining = prev
        .filter((s) => s.id !== sceneId)
        .map((s, idx) => ({ ...s, sceneNumber: idx + 1 }));
      if (selectedSceneId === sceneId) {
        setSelectedSceneId(remaining[0]?.id || '');
      }
      return remaining;
    });
  };

  const handleClearProject = () => {
    stopAllPlayback();
    localStorage.removeItem(STORAGE_KEY);
    setProjectTitle(isEn ? DEFAULT_TITLE_EN : DEFAULT_TITLE_BN);
    setScenes([]);
    setSelectedSceneId('');
    setAttachedVideoUrl(null);
    setSearchQuery('');
    setStatusFilter('all');
    setBannerMessage(isEn ? DEFAULT_BANNER_EN : DEFAULT_BANNER_BN);
  };

  const handleQuickAddBlankScene = () => {
    stopAllPlayback();
    const nextNum = scenes.length + 1;
    const prevEnd = scenes.length > 0 ? scenes[scenes.length - 1].endTimeSec : 0;
    const startSec = prevEnd;
    const endSec = startSec + 5;
    const rangeLabel = `${formatTimestamp(startSec)} - ${formatTimestamp(endSec)}`;

    const newScene: SceneItem = {
      id: `scene-${Date.now()}`,
      sceneNumber: nextNum,
      startTimeSec: startSec,
      endTimeSec: endSec,
      timeRangeLabel: rangeLabel,
      titleEn: `Scene ${nextNum}`,
      titleBn: `দৃশ্য ${nextNum}`,
      visualCaptureDescription: '',
      onScreenText: rangeLabel,
      englishSummary: '',
      banglaScript: '',
      phoneticGuide: '',
      visualType: 'dynamic-ugc-stage',
      keyMetrics: [rangeLabel],
      status: 'pending',
    };

    setScenes((prev) => [...prev, newScene]);
    setSelectedSceneId(newScene.id);
    setBannerMessage(
      isEn
        ? `Added Scene ${nextNum} (${rangeLabel}). Write your Bangla voiceover script below.`
        : `দৃশ্য ${nextNum} (${rangeLabel}) যুক্ত হয়েছে। নিচে আপনার বাংলা ভয়েসওভার স্ক্রিপ্ট লিখুন।`
    );
  };

  const handleAdaptSingleSceneTone = async (sceneId: string) => {
    const target = scenesRef.current.find((s) => s.id === sceneId);
    if (!target || (!target.banglaScript.trim() && !target.englishSummary.trim())) {
      setBannerMessage(
        isEn
          ? 'Please enter a Bangla script or English summary in this scene before rewriting tone.'
          : 'টোন পরিবর্তনের আগে অনুগ্রহ করে এই দৃশ্যে বাংলা স্ক্রিপ্ট বা সামারি লিখুন।'
      );
      return;
    }

    try {
      const res = await fetch('/api/translate-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          englishSummary: target.englishSummary,
          onScreenText: target.onScreenText,
          currentBangla: target.banglaScript,
          tone: selectedTone,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setScenes((prev) =>
          prev.map((s) =>
            s.id === sceneId
              ? {
                  ...s,
                  banglaScript: data.banglaScript || s.banglaScript,
                  phoneticGuide: data.phoneticGuide || s.phoneticGuide,
                  status: 'pending',
                  audioUrl: undefined,
                }
              : s
          )
        );
        const numLabel = String(target.sceneNumber).padStart(2, '0');
        setBannerMessage(
          isEn
            ? `Updated Scene ${numLabel} Bangla script to match the selected narration style.`
            : `দৃশ্য ${numLabel}-এর বাংলা স্ক্রিপ্ট নির্বাচিত টোনে আপডেট হয়েছে।`
        );
        return;
      }
    } catch {
      // Fallback to local adapter
    }

    const adapted = adaptToneInBangla(
      target.englishSummary,
      target.banglaScript,
      selectedTone
    );
    handleUpdateScript(sceneId, adapted);
  };

  const handleApplyToneToAllScenes = () => {
    if (scenes.length === 0) return;
    setScenes((prev) =>
      prev.map((s) => ({
        ...s,
        banglaScript: s.banglaScript.trim()
          ? adaptToneInBangla(s.englishSummary, s.banglaScript, selectedTone)
          : s.banglaScript,
        status: 'pending',
        audioUrl: undefined,
      }))
    );
    const tonePreset = TONE_PRESETS.find((t) => t.id === selectedTone);
    setBannerMessage(
      isEn
        ? `Adapted all scene scripts to "${tonePreset?.labelEn || selectedTone}" style.`
        : `সবগুলো দৃশ্যের স্ক্রিপ্ট "${
            tonePreset?.labelBn || selectedTone
          }" স্টাইলে সাজানো হয়েছে।`
    );
  };

  const handleDownloadSceneWav = (sceneId: string) => {
    const target = scenes.find((s) => s.id === sceneId);
    if (!target) return;

    if (target.audioUrl) {
      const ext = target.audioMimeType === 'audio/mpeg' ? 'mp3' : 'wav';
      const a = document.createElement('a');
      a.href = target.audioUrl;
      a.download = `Scene_${String(target.sceneNumber).padStart(2, '0')}_Bangla_Voice.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    const wavBytes =
      target.audioWavBytes ||
      createSynthesizedSpeechWav(
        target.banglaScript,
        estimateBanglaSpeechDuration(target.banglaScript, speechSpeed),
        activePersona.basePitchHz
      );

    const blob = new Blob([wavBytes as unknown as BlobPart], {
      type: 'audio/wav',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Scene_${String(target.sceneNumber).padStart(2, '0')}_Bangla_Voice.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadMergedMasterWav = () => {
    if (scenes.length === 0) return;
    const buffers = scenes.map(
      (s) =>
        s.audioWavBytes ||
        createSynthesizedSpeechWav(
          s.banglaScript,
          estimateBanglaSpeechDuration(s.banglaScript, speechSpeed),
          activePersona.basePitchHz
        )
    );
    const mergedBytes = mergeWavBuffers(buffers);
    const blob = new Blob([mergedBytes as unknown as BlobPart], {
      type: 'audio/wav',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'KothaStudio_Master_Bangla_Voice_Cover.wav';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setBannerMessage(
      isEn
        ? `Downloaded merged Master WAV audio (${scenes.length} scenes combined).`
        : `সম্পূর্ণ ভিডিওর মাস্টার অডিও ফাইল (${scenes.length}টি দৃশ্য একত্রে) ডাউনলোড হয়েছে।`
    );
  };

  const handleDownloadSrt = (bilingual: boolean) => {
    if (scenes.length === 0) return;
    const srtContent = generateSrtSubtitles(scenes, bilingual);
    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = bilingual
      ? 'KothaStudio_Bilingual_Subtitles.srt'
      : 'KothaStudio_Bangla_Subtitles.srt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setBannerMessage(
      isEn
        ? `Downloaded ${bilingual ? 'Bilingual (Bangla + English)' : 'Bangla'} .SRT subtitle file.`
        : `${bilingual ? 'দ্বিভাষিক (বাংলা + ইংরেজি)' : 'বাংলা'} .SRT সাবটাইটেল ডাউনলোড হয়েছে।`
    );
  };

  const handleDownloadJsonManifest = () => {
    if (scenes.length === 0) return;
    const payload = {
      projectTitle,
      voicePersona: activePersona.nameEn,
      tone: selectedTone,
      totalScenes: scenes.length,
      scenes: scenes.map((s) => ({
        sceneNumber: s.sceneNumber,
        timeRange: s.timeRangeLabel,
        titleEn: s.titleEn,
        titleBn: s.titleBn,
        onScreenText: s.onScreenText,
        englishSummary: s.englishSummary,
        banglaVoiceCoverScript: s.banglaScript,
        phoneticGuide: s.phoneticGuide,
        estimatedDurationSec:
          s.audioDurationSec ||
          estimateBanglaSpeechDuration(s.banglaScript, speechSpeed),
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'KothaStudio_Scene_Summaries_Bangla_Dub.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setBannerMessage(
      isEn
        ? 'Downloaded complete project JSON script manifest.'
        : 'সম্পূর্ণ প্রজেক্টের JSON স্ক্রিপ্ট ফাইল ডাউনলোড হয়েছে।'
    );
  };

  const handleApplyCustomScenes = (
    newScenes: SceneItem[],
    mode: 'replace' | 'append',
    videoObjectUrl?: string,
    newProjectTitle?: string
  ) => {
    stopAllPlayback();
    if (videoObjectUrl) {
      setAttachedVideoUrl(videoObjectUrl);
    }
    if (newProjectTitle) {
      setProjectTitle(newProjectTitle);
    }
    if (newScenes.length > 0) {
      if (mode === 'replace') {
        const numbered = newScenes.map((s, idx) => ({
          ...s,
          sceneNumber: idx + 1,
        }));
        setScenes(numbered);
        setSelectedSceneId(numbered[0].id);
        setBannerMessage(
          isEn
            ? `Created new project with ${numbered.length} scenes! Generate voices or record dynamic video now.`
            : `নতুন প্রজেক্ট তৈরি হয়েছে (${numbered.length}টি দৃশ্য)! এখন ভয়েস তৈরি বা ডাইনামিক ভিডিও রেকর্ড করুন।`
        );
      } else {
        setScenes((prev) => {
          const combined = [...prev, ...newScenes].map((s, idx) => ({
            ...s,
            sceneNumber: idx + 1,
          }));
          return combined;
        });
        setSelectedSceneId(newScenes[0].id);
        setBannerMessage(
          isEn
            ? `Added ${newScenes.length} new scene(s) to the storyboard.`
            : `${newScenes.length}টি নতুন দৃশ্য স্টোরিবোর্ডে যুক্ত করা হয়েছে।`
        );
      }
    } else if (videoObjectUrl) {
      setBannerMessage(
        isEn
          ? 'Synced your uploaded video file with the storyboard player.'
          : 'আপনার ভিডিও ফাইলটি প্লেয়ারের সাথে যুক্ত করা হয়েছে।'
      );
    }
  };

  const filteredSceneList = filterScenes(scenes, searchQuery, statusFilter);
  const activeIndex = activeScene
    ? scenes.findIndex((s) => s.id === activeScene.id)
    : -1;

  return (
    <div className="kotha-studio min-h-screen bg-[#0B0F17] text-[#F1F5F9] flex flex-col">
      {/* Mandatory 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-4 sm:gap-8 px-4 sm:px-6 py-3.5 border-b border-slate-800/90 bg-[#0B0F17]/95 sticky top-14 md:top-16 z-30 backdrop-blur-md">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#storyboard"
          className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          KothaStudio · কণ্ঠধ্বনি
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300 font-bangla"
        >
          <a
            href="#storyboard"
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            {isEn ? 'Storyboard' : 'স্টোরিবোর্ড'}
          </a>
          <a
            href="#voice-studio"
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            {isEn ? 'Voice Studio' : 'ভয়েস স্টুডিও'}
          </a>
          <a
            href="#scene-matrix"
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            {isEn ? 'Scene Matrix' : 'দৃশ্য তালিকা'}
          </a>
          <a
            href="#export-suite"
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            {isEn ? 'Export Suite' : 'ডাউনলোড সুইট'}
          </a>
        </nav>

        {/* Zone 3: Language Switcher (EN / BN) + Primary Action */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleToggleLanguage}
            aria-label={
              isEn ? 'Switch interface to Bengali' : 'Switch interface to English'
            }
            className="min-h-[36px] px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-200 bg-[#0F1623] hover:bg-slate-800 border border-slate-700/90 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span
              className={
                uiLang === 'bn' ? 'text-teal-400 font-bold' : 'text-slate-400'
              }
            >
              বাং
            </span>
            <span className="text-slate-600">/</span>
            <span
              className={
                uiLang === 'en' ? 'text-teal-400 font-bold' : 'text-slate-400'
              }
            >
              EN
            </span>
          </button>

          <button
            type="button"
            disabled={isBatchGenerating || scenes.length === 0}
            onClick={handleGenerateAllVoices}
            className="min-h-[36px] px-3.5 sm:px-4 py-1.5 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 font-bangla cursor-pointer"
          >
            {isBatchGenerating && batchProgress
              ? isEn
                ? `Dubbing ${batchProgress.current}/${batchProgress.total}...`
                : `ডাবিং ${batchProgress.current}/${batchProgress.total}...`
              : isEn
                ? 'Generate All Voices'
                : 'সব ভয়েস তৈরি করুন'}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-[1360px] w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-6">
        {/* Clean, Dynamic Project Header & Voice Studio Control Bar */}
        <section id="storyboard" className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 bg-[#0F1623] border border-slate-800 rounded-xl p-4 sm:p-5">
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-teal-400 font-mono-tabular">
                <span className="font-bangla">
                  {isEn
                    ? 'Bangla Voice Cover & UGC Studio'
                    : 'বাংলা ভয়েস কভার ও UGC স্টুডিও'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-bangla">
                  {isEn
                    ? `Ready: ${readyScenesCount}/${scenes.length} Scenes`
                    : `প্রস্তুত: ${readyScenesCount}/${scenes.length} দৃশ্য`}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-bangla">
                  {isEn
                    ? `Total Duration: ~${totalEstimatedDuration}s`
                    : `মোট সময়: ~${totalEstimatedDuration}s`}
                </span>
              </div>
              <input
                type="text"
                aria-label={
                  isEn ? 'Project Title' : 'প্রজেক্টের নাম (Project Title)'
                }
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                className="w-full bg-transparent text-sm sm:text-xl lg:text-2xl font-bold text-white font-bangla focus:outline-none focus:border-b focus:border-teal-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsExtractorModalOpen(true)}
                className="min-h-[40px] px-3 py-2 text-xs font-medium text-slate-100 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap font-bangla cursor-pointer"
              >
                <Film className="w-4 h-4 text-teal-400 shrink-0" />
                <span>
                  {isEn ? '+ Upload Video / Scene' : '+ ভিডিও আপলোড / দৃশ্য'}
                </span>
              </button>

              <button
                type="button"
                disabled={scenes.length === 0}
                onClick={() => {
                  stopAllPlayback();
                  setIsRecorderModalOpen(true);
                }}
                className="min-h-[40px] px-3 py-2 text-xs font-semibold text-teal-200 bg-teal-950/80 hover:bg-teal-900/80 disabled:opacity-50 border border-teal-500/50 rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap font-bangla cursor-pointer"
              >
                <Video className="w-4 h-4 text-teal-400 shrink-0" />
                <span>
                  {isEn ? 'Record Dynamic Video' : 'ডাইনামিক ভিডিও রেকর্ড'}
                </span>
              </button>

              {isContinuousPlay ? (
                <button
                  type="button"
                  onClick={stopAllPlayback}
                  className="min-h-[40px] px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap font-bangla cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-current shrink-0" />
                  <span>{isEn ? 'Stop Playback' : 'থামান'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={scenes.length === 0}
                  onClick={handleStartContinuousPlay}
                  className="min-h-[40px] px-3.5 py-2 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap font-bangla cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                  <span>
                    {scenes.length > 0
                      ? isEn
                        ? `Play All (1–${scenes.length})`
                        : `সব চালান (1–${scenes.length})`
                      : isEn
                        ? 'Play All'
                        : 'সব চালান'}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Sleek, Organized Voice Studio Toolbar (#voice-studio) */}
          <div
            id="voice-studio"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 bg-[#0F1623] border border-slate-800 rounded-xl p-4 items-end"
          >
            {/* 1. Voice Persona Select */}
            <div className="lg:col-span-4 space-y-1.5">
              <label
                htmlFor="voice-persona-select"
                className="block pl-0.5 text-xs font-medium text-slate-300 font-bangla"
              >
                {isEn
                  ? 'Select Voice Artist (Bangladeshi Accent)'
                  : 'কণ্ঠশিল্পী নির্বাচন করুন (Voice Artist)'}
              </label>
              <select
                id="voice-persona-select"
                value={selectedPersonaId}
                onChange={(e) =>
                  setSelectedPersonaId(e.target.value as VoicePersonaId)
                }
                className="w-full min-h-[40px] rounded-lg bg-[#090D16] border border-slate-800 focus:border-teal-500 focus:outline-none px-3 py-2 text-xs sm:text-sm text-white font-bangla cursor-pointer"
              >
                {VOICE_PERSONAS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {isEn
                      ? `${p.nameEn} (${p.gender}) — ${p.roleEn}`
                      : `${p.nameBn} (${p.gender}) — ${p.roleBn}`}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Narration Style Select */}
            <div className="lg:col-span-4 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="voice-tone-select"
                  className="block pl-0.5 text-xs font-medium text-slate-300 font-bangla"
                >
                  {isEn ? 'Narration Style' : 'বর্ণনার ধরন (Narration Style)'}
                </label>
                {scenes.length > 0 && (
                  <button
                    type="button"
                    onClick={handleApplyToneToAllScenes}
                    className="text-[11px] text-teal-400 hover:text-teal-300 underline underline-offset-2 font-bangla cursor-pointer"
                  >
                    {isEn ? 'Apply to All Scenes' : 'সব দৃশ্যে প্রয়োগ করুন'}
                  </button>
                )}
              </div>
              <select
                id="voice-tone-select"
                value={selectedTone}
                onChange={(e) => setSelectedTone(e.target.value as VoiceTone)}
                className="w-full min-h-[40px] rounded-lg bg-[#090D16] border border-slate-800 focus:border-teal-500 focus:outline-none px-3 py-2 text-xs sm:text-sm text-white font-bangla cursor-pointer"
              >
                {TONE_PRESETS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {isEn ? t.labelEn : t.labelBn}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Narration Speed Selector */}
            <div className="lg:col-span-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bangla pl-0.5">
                <span className="font-medium text-slate-300">
                  {isEn ? 'Voiceover Speed' : 'ভয়েসের গতি (Speed)'}
                </span>
                <span className="font-mono-tabular text-teal-400 font-semibold">
                  {speechSpeed.toFixed(1)}x
                </span>
              </div>
              <div
                role="group"
                aria-label="Narration Speed"
                className="grid grid-cols-4 gap-1.5"
              >
                {[0.9, 1.0, 1.1, 1.2].map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => setSpeechSpeed(speed)}
                    className={`min-h-[40px] rounded-lg text-xs font-mono-tabular border transition-colors cursor-pointer ${
                      speechSpeed === speed
                        ? 'bg-teal-400 text-slate-950 font-bold border-teal-400'
                        : 'bg-[#090D16] text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {speed.toFixed(1)}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live Status Notification Strip */}
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl bg-[#0F1623] border border-slate-800/90 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
          >
            <div className="flex items-center gap-2 text-slate-200 font-bangla">
              <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
              <span>{bannerMessage}</span>
            </div>
            <span className="font-bangla text-slate-400 shrink-0">
              {isEn ? 'Voice Artist: ' : 'কণ্ঠশিল্পী: '}
              <strong className="text-slate-200">
                {activePersonaDisplayName}
              </strong>
            </span>
          </div>
        </section>

        {/* Master 12-Column Responsive Split: Left 5 Cols Sticky Player | Right 7 Cols Scene List */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 5 Columns: Synchronized Storyboard Player (Sticky on Desktop) */}
          <div className="lg:col-span-5 lg:sticky lg:top-20 rounded-xl bg-[#0F1623] border border-slate-800 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-teal-400 font-semibold font-mono-tabular">
                {activeScene
                  ? `${isEn ? 'Active Scene' : 'চলমান দৃশ্য'} ${String(activeScene.sceneNumber).padStart(2, '0')}/${String(scenes.length).padStart(2, '0')} · ${activeScene.timeRangeLabel}`
                  : isEn
                    ? 'Storyboard Player (No Scene Loaded)'
                    : 'স্টোরিবোর্ড প্লেয়ার (কোনো দৃশ্য নেই)'}
              </span>
              {activeScene && (
                <button
                  type="button"
                  onClick={() => setBilingualSubtitles((prev) => !prev)}
                  className="text-slate-400 hover:text-white underline underline-offset-4 transition-colors font-bangla cursor-pointer"
                >
                  {bilingualSubtitles
                    ? isEn
                      ? 'Bangla + English'
                      : 'বাংলা + English'
                    : isEn
                      ? 'Bangla Only'
                      : 'শুধু বাংলা'}
                </button>
              )}
            </div>

            {/* Adaptive Visual Stage */}
            <div className="relative min-h-[215px] sm:aspect-video w-full rounded-xl overflow-hidden border border-slate-800 bg-[#080C14] flex">
              {attachedVideoUrl ? (
                <video
                  ref={syncedVideoRef}
                  src={attachedVideoUrl}
                  muted
                  controls
                  className="w-full h-full object-contain bg-black"
                />
              ) : activeScene ? (
                <SceneCaptureVisual
                  scene={activeScene}
                  compact={false}
                  isPlaying={playingSceneId === activeScene.id}
                  uiLang={uiLang}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <Upload className="w-8 h-8 text-teal-400/80" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white font-bangla">
                      {isEn
                        ? 'No Video or Storyboard Scene Loaded Yet'
                        : 'এখনো কোনো ভিডিও বা দৃশ্য যুক্ত করা হয়নি'}
                    </p>
                    <p className="text-xs text-slate-400 font-bangla max-w-xs">
                      {isEn
                        ? 'Upload your video file to auto-capture scenes or add a new scene manually to start dubbing.'
                        : 'আপনার ভিডিও ফাইল আপলোড করে অটো সিন ক্যাপচার করুন অথবা নতুন দৃশ্য যুক্ত করে ডাবিং শুরু করুন।'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsExtractorModalOpen(true)}
                      className="px-3.5 py-2 rounded-lg bg-teal-400 hover:bg-teal-300 text-slate-950 text-xs font-bold font-bangla flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Film className="w-3.5 h-3.5" />
                      <span>
                        {isEn ? 'Upload Video File' : 'ভিডিও আপলোড করুন'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handleQuickAddBlankScene}
                      className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium font-bangla flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-teal-400" />
                      <span>
                        {isEn ? 'Add Blank Scene' : 'নতুন দৃশ্য যুক্ত করুন'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {activeScene && (
              <>
                {/* Scene Number Quick Switcher */}
                <div
                  role="tablist"
                  aria-label="Scene Timeline Scrubber"
                  className="grid grid-cols-5 sm:grid-cols-10 lg:grid-cols-5 gap-1.5"
                >
                  {scenes.map((s) => {
                    const isCurrent = s.id === activeScene.id;
                    const isPlayingThis = s.id === playingSceneId;
                    return (
                      <button
                        key={s.id}
                        role="tab"
                        aria-selected={isCurrent}
                        type="button"
                        onClick={() => setSelectedSceneId(s.id)}
                        className={`min-h-[34px] py-1 px-1.5 rounded-lg text-xs font-mono-tabular transition-colors cursor-pointer truncate ${
                          isPlayingThis
                            ? 'bg-teal-400 text-slate-950 font-bold'
                            : isCurrent
                              ? 'bg-slate-700 text-white font-semibold border border-teal-500/70'
                              : s.status === 'ready'
                                ? 'bg-teal-950/60 text-teal-300 border border-teal-800/50 hover:bg-teal-900/50'
                                : 'bg-[#090D16] text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                      >
                        S{String(s.sceneNumber).padStart(2, '0')}
                      </button>
                    );
                  })}
                </div>

                {/* Active Scene Subtitle Readout */}
                <div className="rounded-xl bg-[#090D16] border border-slate-800/90 p-3.5 space-y-2">
                  <div className="text-[11px] text-slate-400 font-bangla flex items-center justify-between">
                    <span>
                      {isEn
                        ? `Bangla Voiceover Subtitle (${activePersona.nameEn})`
                        : `বাংলা ভয়েস সাবটাইটেল (${activePersona.nameBn})`}
                    </span>
                    <span className="font-mono-tabular">
                      {activeScene.timeRangeLabel}
                    </span>
                  </div>
                  <p className="text-sm sm:text-[15px] font-medium text-teal-200 font-bangla leading-relaxed">
                    {activeScene.banglaScript.trim()
                      ? `“${activeScene.banglaScript}”`
                      : isEn
                        ? '(Write a Bangla script in the scene card to preview subtitle)'
                        : '(সাবটাইটেল দেখতে দৃশ্য কার্ডে বাংলা স্ক্রিপ্ট লিখুন)'}
                  </p>
                  {bilingualSubtitles && activeScene.englishSummary.trim() && (
                    <p className="text-xs text-slate-400 pt-1.5 border-t border-slate-800/80 leading-relaxed">
                      {activeScene.englishSummary}
                    </p>
                  )}
                </div>

                {/* Responsive Player Controls */}
                <div className="grid grid-cols-4 gap-2 pt-1">
                  <button
                    type="button"
                    disabled={activeIndex <= 0}
                    onClick={() => {
                      if (activeIndex > 0) {
                        setSelectedSceneId(scenes[activeIndex - 1].id);
                      }
                    }}
                    aria-label="Previous Scene"
                    className="min-h-[42px] rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>

                  {playingSceneId === activeScene.id ? (
                    <button
                      type="button"
                      onClick={stopAllPlayback}
                      className="col-span-2 min-h-[42px] px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap font-bangla cursor-pointer"
                    >
                      <Square className="w-3.5 h-3.5 fill-current shrink-0" />
                      <span>{isEn ? 'Stop' : 'থামান'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!activeScene.banglaScript.trim()}
                      onClick={() => playSceneById(activeScene.id)}
                      className="col-span-2 min-h-[42px] px-3 rounded-lg bg-teal-400 hover:bg-teal-300 disabled:opacity-50 text-xs font-semibold text-slate-950 flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap font-bangla cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                      <span>
                        {isEn
                          ? `Play Scene ${activeScene.sceneNumber}`
                          : `এই দৃশ্য শুনুন (দৃশ্য ${activeScene.sceneNumber})`}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={activeIndex >= scenes.length - 1}
                    onClick={() => {
                      if (activeIndex < scenes.length - 1) {
                        setSelectedSceneId(scenes[activeIndex + 1].id);
                      }
                    }}
                    aria-label="Next Scene"
                    className="min-h-[42px] rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Right 7 Columns: Clean One-by-One Scene List (#scene-matrix) */}
          <section id="scene-matrix" className="lg:col-span-7 space-y-4">
            {/* Responsive Filter & Search Header */}
            <div className="rounded-xl bg-[#0F1623] border border-slate-800 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white font-bangla">
                  {isEn
                    ? `Scene-by-Scene Bangla Scripts & Voice List (${filteredSceneList.length} Scenes)`
                    : `দৃশ্য অনুযায়ী বাংলা স্ক্রিপ্ট ও ভয়েস তালিকা (${filteredSceneList.length}টি দৃশ্য)`}
                </h2>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleQuickAddBlankScene}
                    className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1 font-bangla cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>
                      {isEn ? 'Add New Scene' : 'নতুন দৃশ্য যুক্ত করুন'}
                    </span>
                  </button>
                  {scenes.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearProject}
                      className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 font-bangla cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>
                        {isEn ? 'Clear Project' : 'প্রজেক্ট ক্লিয়ার'}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {scenes.length > 0 && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="search"
                      aria-label="Search scenes by keyword or timestamp"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={
                        isEn
                          ? 'Search scenes or timestamps (e.g., 00:04)...'
                          : 'দৃশ্য বা টাইমস্ট্যাম্প খুঁজুন (যেমন: 00:04)...'
                      }
                      className="w-full min-h-[40px] pl-9 pr-3 py-2 rounded-lg bg-[#090D16] border border-slate-800 focus:border-teal-500 focus:outline-none text-xs text-white font-bangla"
                    />
                  </div>

                  <div
                    role="group"
                    aria-label="Filter scenes by dubbing status"
                    className="grid grid-cols-3 gap-1 p-1 bg-[#090D16] border border-slate-800 rounded-lg shrink-0"
                  >
                    {(['all', 'ready', 'pending'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStatusFilter(st)}
                        className={`min-h-[32px] px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap font-bangla cursor-pointer ${
                          statusFilter === st
                            ? 'bg-teal-400 text-slate-950 font-semibold'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        {st === 'all'
                          ? isEn
                            ? `All (${scenes.length})`
                            : `সব (${scenes.length})`
                          : st === 'ready'
                            ? isEn
                              ? `Ready (${readyScenesCount})`
                              : `প্রস্তুত (${readyScenesCount})`
                            : isEn
                              ? `Pending (${scenes.length - readyScenesCount})`
                              : `বাকি (${scenes.length - readyScenesCount})`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Scene Cards Stack */}
            {scenes.length === 0 ? (
              <div className="rounded-xl bg-[#0F1623] border border-slate-800 p-8 text-center space-y-4">
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-white font-bangla">
                    {isEn
                      ? 'Your Storyboard is Clean & Ready (Zero Mock Data)'
                      : 'আপনার স্টোরিবোর্ডটি সম্পূর্ণ খালি ও প্রস্তুত (কোনো মক ডাটা নেই)'}
                  </h3>
                  <p className="text-xs text-slate-400 font-bangla max-w-lg mx-auto leading-relaxed">
                    {isEn
                      ? 'Upload any video file to automatically extract keyframes and generate Bangladeshi Bengali voiceover scripts, or add a blank scene card to write your own script.'
                      : 'আপনার যেকোনো ভিডিও ফাইল আপলোড করে স্বয়ংক্রিয়ভাবে ফ্রেম ক্যাপচার ও বাংলা ভয়েস স্ক্রিপ্ট তৈরি করুন, অথবা সরাসরি নতুন দৃশ্য যুক্ত করে আপনার নিজস্ব স্ক্রিপ্ট লিখুন।'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsExtractorModalOpen(true)}
                    className="min-h-[42px] px-4 py-2 text-xs font-bold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors flex items-center gap-2 font-bangla cursor-pointer"
                  >
                    <Film className="w-4 h-4" />
                    <span>
                      {isEn
                        ? '+ Upload Video & Auto-Capture Scenes'
                        : '+ ভিডিও আপলোড ও অটো সিন ক্যাপচার'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickAddBlankScene}
                    className="min-h-[42px] px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-2 font-bangla cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-teal-400" />
                    <span>
                      {isEn
                        ? '+ Add Scene & Write Script Manually'
                        : '+ ম্যানুয়ালি নতুন দৃশ্য ও স্ক্রিপ্ট লিখুন'}
                    </span>
                  </button>
                </div>
              </div>
            ) : filteredSceneList.length === 0 ? (
              <div className="rounded-xl bg-[#0F1623] border border-slate-800 p-8 text-center space-y-3">
                <p className="text-sm font-semibold text-white font-bangla">
                  {isEn
                    ? 'No scenes matched your search filter'
                    : 'আপনার সার্চের সাথে কোনো দৃশ্য মেলেনি'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors font-bangla cursor-pointer"
                >
                  {isEn ? 'Show All Scenes' : 'সবগুলো দৃশ্য দেখুন'}
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredSceneList.map((scene) => (
                  <SceneCard
                    key={scene.id}
                    scene={scene}
                    isSelected={scene.id === selectedSceneId}
                    isCurrentlyPlaying={scene.id === playingSceneId}
                    speechSpeed={speechSpeed}
                    selectedTone={selectedTone}
                    canDelete={true}
                    uiLang={uiLang}
                    onSelectScene={(id) => setSelectedSceneId(id)}
                    onUpdateScript={handleUpdateScript}
                    onGenerateVoice={handleGenerateSingleScene}
                    onPlaySceneVoice={(id) => playSceneById(id)}
                    onStopPlayback={stopAllPlayback}
                    onDownloadSceneWav={handleDownloadSceneWav}
                    onAdaptSceneTone={handleAdaptSingleSceneTone}
                    onDeleteScene={handleDeleteScene}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Clean, Uncluttered Export Suite (#export-suite) */}
        <section
          id="export-suite"
          className="rounded-xl bg-[#0F1623] border border-slate-800 p-4 sm:p-6 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white font-bangla">
                {isEn
                  ? 'Download Dynamic Video, Master Audio & Subtitles (Export Suite)'
                  : 'ডাইনামিক ভিডিও, অডিও ও সাবটাইটেল ডাউনলোড (Export Suite)'}
              </h2>
              <p className="text-xs text-slate-400 font-bangla">
                {isEn
                  ? 'Download the full dynamic Bangla dubbed video (.WEBM), master voiceover audio (.WAV), or subtitles (.SRT) in one click.'
                  : 'সম্পূর্ণ ভিডিওর ডাইনামিক বাংলা ডাবিং রেকর্ডিং (.WEBM), মাস্টার অডিও (.WAV) অথবা সাবটাইটেল (.SRT) এক ক্লিকে ডাউনলোড করুন।'}
              </p>
            </div>
            {scenes.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setShowSrtPreview((prev) => !prev)}
                  className="text-xs text-slate-300 hover:text-white flex items-center gap-1 font-bangla cursor-pointer"
                >
                  {showSrtPreview ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      <span>
                        {isEn
                          ? 'Hide Subtitle Preview'
                          : 'সাবটাইটেল প্রিভিউ লুকান'}
                      </span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      <span>
                        {isEn
                          ? 'Preview Subtitles (.SRT)'
                          : 'সাবটাইটেল প্রিভিউ (.SRT)'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <button
              type="button"
              disabled={scenes.length === 0}
              onClick={() => {
                stopAllPlayback();
                setIsRecorderModalOpen(true);
              }}
              className="min-h-[44px] px-4 py-3 text-xs font-bold text-slate-950 bg-teal-400 hover:bg-teal-300 disabled:opacity-50 rounded-xl transition-colors flex items-center justify-center gap-2 font-bangla cursor-pointer"
            >
              <Video className="w-4 h-4 shrink-0" />
              <span>
                {isEn
                  ? 'Record Dynamic Video (.WEBM)'
                  : 'ডাইনামিক ভিডিও রেকর্ড (.WEBM)'}
              </span>
            </button>

            <button
              type="button"
              disabled={scenes.length === 0}
              onClick={handleDownloadMergedMasterWav}
              className="min-h-[44px] px-4 py-3 text-xs font-semibold text-teal-200 bg-teal-950/70 hover:bg-teal-900/80 disabled:opacity-50 border border-teal-500/40 rounded-xl transition-colors flex items-center justify-center gap-2 font-bangla cursor-pointer"
            >
              <FileAudio className="w-4 h-4 text-teal-400 shrink-0" />
              <span>
                {isEn ? 'Master Audio (.WAV)' : 'মাস্টার অডিও (.WAV)'}
              </span>
            </button>

            <button
              type="button"
              disabled={scenes.length === 0}
              onClick={() => handleDownloadSrt(false)}
              className="min-h-[44px] px-4 py-3 text-xs font-medium text-slate-100 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-xl transition-colors flex items-center justify-center gap-2 font-bangla cursor-pointer"
            >
              <FileText className="w-4 h-4 text-teal-400 shrink-0" />
              <span>
                {isEn ? 'Bangla Subtitles (.SRT)' : 'বাংলা সাবটাইটেল (.SRT)'}
              </span>
            </button>

            <button
              type="button"
              disabled={scenes.length === 0}
              onClick={() => handleDownloadSrt(true)}
              className="min-h-[44px] px-4 py-3 text-xs font-medium text-slate-100 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-xl transition-colors flex items-center justify-center gap-2 font-bangla cursor-pointer"
            >
              <Download className="w-4 h-4 text-sky-400 shrink-0" />
              <span>
                {isEn ? 'Bangla + English (.SRT)' : 'বাংলা + English (.SRT)'}
              </span>
            </button>

            <button
              type="button"
              disabled={scenes.length === 0}
              onClick={handleDownloadJsonManifest}
              className="min-h-[44px] px-4 py-3 text-xs font-medium text-slate-100 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-xl transition-colors flex items-center justify-center gap-2 font-bangla cursor-pointer"
            >
              <Layers className="w-4 h-4 text-teal-400 shrink-0" />
              <span>
                {isEn ? 'Full Script (.JSON)' : 'সম্পূর্ণ স্ক্রিপ্ট (.JSON)'}
              </span>
            </button>
          </div>

          {showSrtPreview && scenes.length > 0 && (
            <pre className="p-4 rounded-xl text-xs text-slate-300 font-bangla overflow-y-auto max-h-64 whitespace-pre-wrap leading-relaxed bg-[#090D16] border border-slate-800">
              {generateSrtSubtitles(scenes, false)}
            </pre>
          )}
        </section>
      </main>

      {/* Clean Quiet Footer */}
      <footer className="border-t border-slate-800/80 pt-5 pb-20 md:pb-5 px-4 sm:px-6 text-xs text-slate-400 font-bangla">
        <div className="max-w-[1360px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>
            {isEn
              ? 'KothaStudio · কণ্ঠধ্বনি — Bangladeshi Bengali Voice Cover & Dynamic E-Commerce UGC Studio'
              : 'KothaStudio · কণ্ঠধ্বনি — বাংলাদেশি বাংলা ভয়েস কভার ও ডাইনামিক ই-কমার্স UGC স্টুডিও'}
          </span>
          <div className="flex items-center gap-4">
            <a href="#storyboard" className="hover:text-white transition-colors">
              {isEn ? 'Storyboard Player' : 'স্টোরিবোর্ড প্লেয়ার'}
            </a>
            <a href="#scene-matrix" className="hover:text-white transition-colors">
              {isEn ? 'Scene Matrix' : 'দৃশ্য তালিকা'}
            </a>
            <a href="#export-suite" className="hover:text-white transition-colors">
              {isEn ? 'Export Suite' : 'ডাউনলোড'}
            </a>
          </div>
        </div>
      </footer>

      {/* Modal 1: Dynamic E-Commerce UGC Video Uploader & Scene Builder */}
      <VideoFrameExtractorModal
        isOpen={isExtractorModalOpen}
        onClose={() => setIsExtractorModalOpen(false)}
        selectedTone={selectedTone}
        existingSceneCount={scenes.length}
        uiLang={uiLang}
        onApplyScenes={handleApplyCustomScenes}
      />

      {/* Modal 2: Real-Time Dynamic Dubbed Video Recorder (.WEBM Video + Bangla Audio + Burned Subtitles) */}
      <DynamicVideoRecorderModal
        isOpen={isRecorderModalOpen}
        onClose={() => setIsRecorderModalOpen(false)}
        projectTitle={projectTitle}
        scenes={scenes}
        activePersona={activePersona}
        speechSpeed={speechSpeed}
        attachedVideoUrl={attachedVideoUrl}
        uiLang={uiLang}
        onEnsureSceneVoice={generateVoiceForScene}
      />
    </div>
  );
}
