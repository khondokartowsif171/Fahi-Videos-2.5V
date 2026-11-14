import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Film,
  Layers,
  Maximize2,
  Play,
  Plus,
  Sparkles,
  Square,
  Volume2,
  X,
} from 'lucide-react';
import { type SceneItem, type VoicePersona } from '../utils/dubbingLogic';
import {
  type FrameAspectMode,
  type FrameLayoutStyle,
  type SourceDimensions,
  type VideoContainerPreference,
  type VideoExportQuality,
  computeOutputCanvasDimensions,
  detectAspectRatioLabel,
  getRecommendedDefaults,
  renderDynamicVideoFrame,
} from '../utils/dynamicVideoRenderer';
import {
  type ExportedDubVideoResult,
  exportDubbedVideo,
} from '../utils/dynamicVideoExporter';
import CloudExport from '@/components/CloudExport';

interface DynamicVideoRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectTitle: string;
  scenes: SceneItem[];
  activePersona: VoicePersona;
  speechSpeed: number;
  attachedVideoUrl: string | null;
  uiLang?: 'bn' | 'en';
  onEnsureSceneVoice: (sceneId: string) => Promise<{
    audioUrl: string;
    rawBytes: Uint8Array;
    wavBytes: Uint8Array;
    mimeType: string;
    durationSec: number;
  } | null>;
}

export const DynamicVideoRecorderModal: React.FC<DynamicVideoRecorderModalProps> = ({
  isOpen,
  onClose,
  projectTitle,
  scenes,
  activePersona,
  speechSpeed,
  attachedVideoUrl,
  uiLang = 'bn',
  onEnsureSceneVoice,
}) => {
  const isEn = uiLang === 'en';
  const hasSourceMedia = useMemo(
    () =>
      Boolean(
        attachedVideoUrl || scenes.some((s) => Boolean(s.customFrameDataUrl))
      ),
    [attachedVideoUrl, scenes]
  );

  const [sourceDimensions, setSourceDimensions] =
    useState<SourceDimensions | null>(null);
  const [aspectMode, setAspectMode] = useState<FrameAspectMode>(() =>
    getRecommendedDefaults(hasSourceMedia).aspectMode
  );
  const [layoutStyle, setLayoutStyle] = useState<FrameLayoutStyle>(() =>
    getRecommendedDefaults(hasSourceMedia).layoutStyle
  );
  const [quality, setQuality] = useState<VideoExportQuality>('hd');
  const [containerPref, setContainerPref] =
    useState<VideoContainerPreference>('auto');
  const [originalAudioMix, setOriginalAudioMix] = useState<number>(0);

  const [showCustomOverlay, setShowCustomOverlay] = useState<boolean>(false);
  const [topBadgeText, setTopBadgeText] = useState<string>('');
  const [offerBannerText, setOfferBannerText] = useState<string>('');
  const [burnSubtitles, setBurnSubtitles] = useState<boolean>(true);
  const [recordScope, setRecordScope] = useState<'all' | 'quick3'>('all');
  const [previewSceneIdx, setPreviewSceneIdx] = useState<number>(0);

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportPercent, setExportPercent] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('');
  const [errorText, setErrorText] = useState<string>('');
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [exportResult, setExportResult] =
    useState<ExportedDubVideoResult | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const blurBufferRef = useRef<HTMLCanvasElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const recordedUrlRef = useRef<string | null>(null);

  const personaDisplay = isEn ? activePersona.nameEn : activePersona.nameBn;

  // Smart initialization on open (preserving original frame geometry whenever video/frames exist)
  useEffect(() => {
    if (!isOpen) return;
    const defaults = getRecommendedDefaults(hasSourceMedia);
    setAspectMode(defaults.aspectMode);
    setLayoutStyle(defaults.layoutStyle);
    setRecordScope(scenes.length > 4 ? 'quick3' : 'all');
    setPreviewSceneIdx(0);
    setErrorText('');
    setStatusText('');
  }, [isOpen, hasSourceMedia, scenes.length]);

  // Revoke generated object URL on replacement or unmount
  useEffect(() => {
    recordedUrlRef.current = recordedUrl;
  }, [recordedUrl]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (recordedUrlRef.current) {
        URL.revokeObjectURL(recordedUrlRef.current);
      }
    };
  }, []);

  const safePreviewIndex = Math.max(
    0,
    Math.min(previewSceneIdx, Math.max(0, scenes.length - 1))
  );
  const activePreviewScene = scenes[safePreviewIndex];

  const outputDimensions = useMemo(
    () =>
      computeOutputCanvasDimensions(aspectMode, sourceDimensions, quality),
    [aspectMode, sourceDimensions, quality]
  );

  // Sync source metadata + live canvas frame preview when video/scene/layout changes
  useEffect(() => {
    if (!isOpen || !activePreviewScene || isExporting) return;

    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!blurBufferRef.current) {
      blurBufferRef.current = document.createElement('canvas');
    }

    let cancelled = false;
    let previewImg: HTMLImageElement | null = null;

    const paintNow = (vid: HTMLVideoElement | null, img: HTMLImageElement | null) => {
      if (cancelled) return;
      renderDynamicVideoFrame(
        ctx,
        outputDimensions.width,
        outputDimensions.height,
        {
          scene: activePreviewScene,
          sceneIndex: safePreviewIndex,
          totalScenes: scenes.length,
          progressRatio:
            scenes.length > 1 ? safePreviewIndex / (scenes.length - 1) : 1,
          projectTitle,
          personaDisplay,
          layoutStyle,
          topBadgeText: showCustomOverlay ? topBadgeText : '',
          offerBannerText: showCustomOverlay ? offerBannerText : '',
          burnSubtitles,
          frameImage: img,
          videoSource: vid && vid.readyState >= 2 ? vid : null,
          pulseTick: 2,
          isEn,
        },
        blurBufferRef.current
      );
    };

    const loadPreviewMedia = async () => {
      if (activePreviewScene.customFrameDataUrl) {
        previewImg = await new Promise<HTMLImageElement | null>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = activePreviewScene.customFrameDataUrl || '';
        });
        if (!cancelled && previewImg && !attachedVideoUrl) {
          setSourceDimensions((prev) => {
            if (
              prev &&
              prev.width === previewImg!.naturalWidth &&
              prev.height === previewImg!.naturalHeight
            ) {
              return prev;
            }
            return {
              width: previewImg!.naturalWidth,
              height: previewImg!.naturalHeight,
            };
          });
        }
      }

      const vidEl = previewVideoRef.current;
      if (vidEl && attachedVideoUrl) {
        if (vidEl.videoWidth > 0 && vidEl.videoHeight > 0) {
          setSourceDimensions((prev) => {
            if (
              prev &&
              prev.width === vidEl.videoWidth &&
              prev.height === vidEl.videoHeight
            ) {
              return prev;
            }
            return { width: vidEl.videoWidth, height: vidEl.videoHeight };
          });
        }

        const sampleTime = Math.max(
          0,
          activePreviewScene.startTimeSec +
            Math.max(
              0,
              (activePreviewScene.endTimeSec - activePreviewScene.startTimeSec) *
                0.25
            )
        );
        const clampedTarget =
          Number.isFinite(vidEl.duration) && vidEl.duration > 0.1
            ? Math.min(vidEl.duration - 0.05, sampleTime)
            : sampleTime;

        if (vidEl.readyState >= 2) {
          paintNow(vidEl, previewImg);
        } else {
          paintNow(null, previewImg);
        }

        if (vidEl.readyState >= 1) {
          const onSeeked = () => {
            vidEl.removeEventListener('seeked', onSeeked);
            paintNow(vidEl, previewImg);
          };
          vidEl.addEventListener('seeked', onSeeked, { once: true });
          try {
            if (Math.abs(vidEl.currentTime - clampedTarget) > 0.08) {
              vidEl.currentTime = clampedTarget;
            } else {
              vidEl.removeEventListener('seeked', onSeeked);
              paintNow(vidEl, previewImg);
            }
          } catch {
            paintNow(null, previewImg);
          }
          return;
        }
      }

      paintNow(null, previewImg);
    };

    void loadPreviewMedia();

    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    isExporting,
    activePreviewScene,
    safePreviewIndex,
    scenes.length,
    attachedVideoUrl,
    outputDimensions.width,
    outputDimensions.height,
    projectTitle,
    personaDisplay,
    layoutStyle,
    showCustomOverlay,
    topBadgeText,
    offerBannerText,
    burnSubtitles,
    isEn,
  ]);

  if (!isOpen) return null;

  const targetScenes =
    recordScope === 'quick3' ? scenes.slice(0, 3) : scenes;

  const handleVideoMetadataLoaded = () => {
    const vidEl = previewVideoRef.current;
    if (!vidEl || vidEl.videoWidth <= 0 || vidEl.videoHeight <= 0) return;
    setSourceDimensions({
      width: vidEl.videoWidth,
      height: vidEl.videoHeight,
    });
  };

  const handleCancelExport = () => {
    abortControllerRef.current?.abort();
  };

  const handleStartExport = async () => {
    if (isExporting || targetScenes.length === 0) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
    }
    setExportResult(null);
    setErrorText('');
    setExportPercent(2);
    setIsExporting(true);
    setStatusText(
      isEn
        ? 'Initializing Kotha Studio HD dubbing renderer...'
        : 'কথা স্টুডিও HD ডাবিং রেন্ডারার প্রস্তুত হচ্ছে...'
    );

    try {
      const result = await exportDubbedVideo({
        scenes: targetScenes,
        attachedVideoUrl,
        canvasWidth: outputDimensions.width,
        canvasHeight: outputDimensions.height,
        projectTitle,
        personaDisplay,
        speechSpeed,
        layoutStyle,
        topBadgeText: showCustomOverlay ? topBadgeText : '',
        offerBannerText: showCustomOverlay ? offerBannerText : '',
        burnSubtitles,
        quality,
        containerPreference: containerPref,
        originalAudioMix: attachedVideoUrl ? originalAudioMix : 0,
        isEn,
        previewCanvas: previewCanvasRef.current,
        signal: controller.signal,
        onEnsureSceneVoice,
        onProgress: (update) => {
          setExportPercent(update.percent);
          setStatusText(update.statusText);
        },
      });

      const blobUrl = URL.createObjectURL(result.blob);
      setRecordedUrl(blobUrl);
      setExportResult(result);
      setExportPercent(100);
      setStatusText(
        isEn
          ? `Dubbed ${result.extension.toUpperCase()} ready (${result.width}x${result.height}, ${targetScenes.length} scenes)!`
          : `${targetScenes.length}টি দৃশ্যের ${result.extension.toUpperCase()} (${result.width}x${result.height}) ভিডিও সম্পন্ন হয়েছে!`
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setStatusText(
          isEn ? 'Export cancelled.' : 'এক্সপোর্ট বাতিল করা হয়েছে।'
        );
      } else {
        const message =
          err instanceof Error
            ? err.message
            : isEn
              ? 'Video export failed in this browser.'
              : 'এই ব্রাউজারে ভিডিও এক্সপোর্ট সম্পন্ন করা যায়নি।';
        setErrorText(message);
        setStatusText('');
      }
    } finally {
      setIsExporting(false);
      abortControllerRef.current = null;
    }
  };

  const aspectSlug =
    aspectMode === 'original'
      ? outputDimensions.aspectLabel.replace(':', 'x')
      : aspectMode.replace(':', 'x');

  const downloadFilename = exportResult
    ? `KothaStudio_Bangla_Dub_${aspectSlug}.${exportResult.extension}`
    : 'KothaStudio_Bangla_Dub.webm';

  const handleDownloadExport = () => {
    if (!recordedUrl) return;
    const a = document.createElement('a');
    a.href = recordedUrl;
    a.download = downloadFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const sourceRatioText = sourceDimensions
    ? `${sourceDimensions.width}x${sourceDimensions.height} (${detectAspectRatioLabel(
        sourceDimensions.width,
        sourceDimensions.height
      )})`
    : isEn
      ? 'Auto Detect'
      : 'অটো ডিটেক্ট';

  const sizeKb = exportResult
    ? Math.max(1, Math.round(exportResult.blob.size / 1024))
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Dynamic Bangla Dubbed Video Generator"
    >
      {/* Hidden Source Video for Metadata & Live Preview Seek */}
      {attachedVideoUrl && (
        <video
          ref={previewVideoRef}
          src={attachedVideoUrl}
          crossOrigin="anonymous"
          muted
          playsInline
          preload="auto"
          onLoadedMetadata={handleVideoMetadataLoaded}
          onLoadedData={handleVideoMetadataLoaded}
          className="hidden"
        />
      )}

      <div className="w-full max-w-5xl rounded-2xl bg-[#0B111E] border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-[#0E1626] shrink-0">
          <div className="min-w-0 pr-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-teal-400 font-semibold">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>
                {isEn
                  ? 'Adaptive Native-Frame Dubbing Studio'
                  : 'অ্যাডাপ্টিভ নেটিভ-ফ্রেম বাংলা ডাবিং এক্সপোর্ট স্টুডিও'}
              </span>
              {sourceDimensions && (
                <span className="px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-[10px] font-mono-tabular text-teal-300">
                  Source: {sourceRatioText}
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white font-bangla truncate mt-0.5">
              {isEn
                ? 'Dynamic Bangla Dubbed Video Generator (.MP4 / .WEBM)'
                : 'ডায়নামিক বাংলা ডাবড ভিডিও জেনারেটর (.MP4 / .WEBM)'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              abortControllerRef.current?.abort();
              onClose();
            }}
            aria-label="Close modal"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Two-Column Workspace */}
        <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start overflow-y-auto">
          {/* Left Controls */}
          <div className="lg:col-span-6 space-y-3.5">
            {/* Aspect Ratio Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5 text-teal-400" />
                  <span>
                    {isEn ? 'Frame Aspect Ratio' : 'আউটপুট ফ্রেম অনুপাত'}
                  </span>
                </label>
                <span className="text-[11px] font-mono-tabular text-slate-400">
                  {outputDimensions.width}x{outputDimensions.height} ({outputDimensions.aspectLabel})
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {(
                  [
                    {
                      id: 'original',
                      label: isEn ? 'Original' : 'অরিজিনাল',
                      sub: sourceDimensions
                        ? detectAspectRatioLabel(
                            sourceDimensions.width,
                            sourceDimensions.height
                          )
                        : 'Native',
                    },
                    { id: '16:9', label: '16:9', sub: 'YouTube' },
                    { id: '9:16', label: '9:16', sub: 'Reels' },
                    { id: '4:5', label: '4:5', sub: 'Feed' },
                    { id: '1:1', label: '1:1', sub: 'Square' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isExporting}
                    onClick={() => setAspectMode(item.id)}
                    className={`px-1.5 py-2 rounded-xl border text-center transition-colors cursor-pointer disabled:opacity-50 ${
                      aspectMode === item.id
                        ? 'bg-teal-400 border-teal-300 text-slate-950 font-bold'
                        : 'bg-[#080C14] border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-[11px] leading-tight truncate">
                      {item.label}
                    </div>
                    <div
                      className={`text-[9px] mt-0.5 ${
                        aspectMode === item.id
                          ? 'text-slate-800'
                          : 'text-slate-500'
                      }`}
                    >
                      {item.sub}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Frame Layout / Fitting Style */}
            <div>
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>
                  {isEn ? 'Frame Presentation Style' : 'ফ্রেম প্রদর্শনের ধরন'}
                </span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(
                  [
                    {
                      id: 'clean',
                      title: isEn ? 'Clean Original' : 'ক্লিন অরিজিনাল',
                      hint: isEn ? 'Zero box / crop' : 'হুবহু মূল ফ্রেম',
                    },
                    {
                      id: 'blur-fit',
                      title: isEn ? 'Blur Backdrop' : 'ব্লার ব্যাকড্রপ',
                      hint: isEn ? 'Social convert' : 'ক্রপ ছাড়া সাইড ব্লার',
                    },
                    {
                      id: 'cover',
                      title: isEn ? 'Fill / Crop' : 'ফুল ফিল',
                      hint: isEn ? 'Edge to edge' : 'পুরো স্ক্রিন জুড়ে',
                    },
                    {
                      id: 'studio-card',
                      title: isEn ? 'Studio Card' : 'স্টুডিও কার্ড',
                      hint: isEn ? 'Scene header' : 'সিন হেডারসহ',
                    },
                  ] as const
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    disabled={isExporting}
                    onClick={() => setLayoutStyle(mode.id)}
                    className={`p-2 rounded-xl border text-left transition-colors cursor-pointer disabled:opacity-50 ${
                      layoutStyle === mode.id
                        ? 'bg-cyan-500/15 border-cyan-400/70 text-white'
                        : 'bg-[#080C14] border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-[11px] font-bold leading-tight">
                      {mode.title}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                      {mode.hint}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quality, Container & Scope */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="p-2.5 rounded-xl bg-[#080C14] border border-slate-800">
                <div className="text-[10px] font-semibold text-slate-400 mb-1.5">
                  {isEn ? 'Resolution' : 'রেজোলিউশন'}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {(['hd', 'fullhd'] as const).map((q) => (
                    <button
                      key={q}
                      type="button"
                      disabled={isExporting}
                      onClick={() => setQuality(q)}
                      className={`py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                        quality === q
                          ? 'bg-teal-400 text-slate-950'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {q === 'hd' ? '720p HD' : '1080p'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#080C14] border border-slate-800">
                <div className="text-[10px] font-semibold text-slate-400 mb-1.5">
                  {isEn ? 'Format' : 'ফরম্যাট'}
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {(
                    [
                      { id: 'auto', label: 'Auto' },
                      { id: 'mp4', label: 'MP4' },
                      { id: 'webm', label: 'WEBM' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      disabled={isExporting}
                      onClick={() => setContainerPref(f.id)}
                      className={`py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                        containerPref === f.id
                          ? 'bg-teal-400 text-slate-950'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#080C14] border border-slate-800">
                <div className="text-[10px] font-semibold text-slate-400 mb-1.5">
                  {isEn ? 'Scenes' : 'দৃশ্য সংখ্যা'}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={() => setRecordScope('quick3')}
                    className={`py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                      recordScope === 'quick3'
                        ? 'bg-teal-400 text-slate-950'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {isEn ? 'First 3' : 'প্রথম ৩টি'}
                  </button>
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={() => setRecordScope('all')}
                    className={`py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                      recordScope === 'all'
                        ? 'bg-teal-400 text-slate-950'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {isEn ? `All (${scenes.length})` : `সব (${scenes.length})`}
                  </button>
                </div>
              </div>
            </div>

            {/* Subtitles + Optional Badge + Original Audio Mix */}
            <div className="p-3 rounded-xl bg-[#080C14] border border-slate-800 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer font-bangla">
                  <input
                    type="checkbox"
                    checked={burnSubtitles}
                    onChange={(e) => setBurnSubtitles(e.target.checked)}
                    disabled={isExporting}
                    className="rounded border-slate-700 accent-teal-400"
                  />
                  <span>
                    {isEn
                      ? 'Burn Bangla Subtitles'
                      : 'বাংলা সাবটাইটেল যুক্ত করুন'}
                  </span>
                </label>

                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => setShowCustomOverlay((prev) => !prev)}
                  className="text-[11px] font-medium text-teal-400 hover:text-teal-300 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>
                    {showCustomOverlay
                      ? isEn
                        ? 'Hide Badge / Offer'
                        : 'ব্যাজ লুকান'
                      : isEn
                        ? 'Add Badge / Offer'
                        : 'ব্যাজ / অফার যোগ'}
                  </span>
                </button>
              </div>

              {attachedVideoUrl && (
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                    {isEn ? 'Original Video Audio' : 'মূল ভিডিও সাউন্ড'}
                  </span>
                  <div className="flex items-center gap-1">
                    {[
                      { mix: 0, label: isEn ? 'Muted (Dub Only)' : 'মিউট' },
                      { mix: 0.15, label: '15% BG' },
                      { mix: 0.3, label: '30% BG' },
                    ].map((opt) => (
                      <button
                        key={opt.mix}
                        type="button"
                        disabled={isExporting}
                        onClick={() => setOriginalAudioMix(opt.mix)}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                          Math.abs(originalAudioMix - opt.mix) < 0.02
                            ? 'bg-teal-500/20 border border-teal-400/60 text-teal-300'
                            : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {showCustomOverlay && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">
                      {isEn ? 'Top Badge (Blank = Hidden)' : 'টপ ব্যাজ (খালি = লুকানো)'}
                    </label>
                    <input
                      type="text"
                      value={topBadgeText}
                      onChange={(e) => setTopBadgeText(e.target.value)}
                      placeholder={
                        isEn
                          ? 'Optional brand badge...'
                          : 'যেমন: 100% Authentic'
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#0E1626] border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-400 font-bangla"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">
                      {isEn
                        ? 'Bottom CTA Banner (Blank = Hidden)'
                        : 'বটম ব্যানার (খালি = লুকানো)'}
                    </label>
                    <input
                      type="text"
                      value={offerBannerText}
                      onChange={(e) => setOfferBannerText(e.target.value)}
                      placeholder={
                        isEn ? 'Optional CTA text...' : 'যেমন: অর্ডার করুন এখনই'
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#0E1626] border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-400 font-bangla"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Export Trigger / Cancel + Progress */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleStartExport}
                disabled={isExporting || scenes.length === 0}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-teal-400 to-cyan-400 hover:from-teal-300 hover:to-cyan-300 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>
                  {isExporting
                    ? isEn
                      ? `Rendering (${exportPercent}%)...`
                      : `রেন্ডার হচ্ছে (${exportPercent}%)...`
                    : isEn
                      ? `Render Dubbed Video (${targetScenes.length} Scenes)`
                      : `বাংলা ডাবিং ভিডিও তৈরি করুন (${targetScenes.length} দৃশ্য)`}
                </span>
              </button>
              {isExporting && (
                <button
                  type="button"
                  onClick={handleCancelExport}
                  title={isEn ? 'Cancel export' : 'বাতিল করুন'}
                  className="px-3.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>{isEn ? 'Stop' : 'থামান'}</span>
                </button>
              )}
            </div>

            {(isExporting || exportPercent > 0) && statusText && (
              <div className="space-y-1">
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-teal-400 to-cyan-400 transition-all duration-200"
                    style={{ width: `${Math.max(4, Math.min(100, exportPercent))}%` }}
                  />
                </div>
                <p className="text-[11px] text-teal-300 font-bangla text-center">
                  {statusText}
                </p>
              </div>
            )}

            {errorText && (
              <p
                role="alert"
                className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 text-center"
              >
                {errorText}
              </p>
            )}

            {recordedUrl && exportResult && !isExporting && (
              <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/30 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-teal-300 font-semibold">
                  <span>
                    {isEn
                      ? 'Dubbed Video Ready!'
                      : 'বাংলা ডাবিং ভিডিও প্রস্তুত!'}
                  </span>
                  <span className="font-mono-tabular text-[11px] text-slate-300">
                    {exportResult.width}x{exportResult.height} ·{' '}
                    {exportResult.extension.toUpperCase()} ·{' '}
                    {exportResult.durationSec.toFixed(1)}s · {sizeKb} KB
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadExport}
                  className="w-full py-2.5 px-4 rounded-lg bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {isEn
                      ? `Download Dubbed Video (.${exportResult.extension.toUpperCase()})`
                      : `ডাউনলোড করুন (.${exportResult.extension.toUpperCase()})`}
                  </span>
                </button>
                <div className="flex justify-center">
                  <CloudExport
                    key={recordedUrl}
                    source={recordedUrl}
                    name={downloadFilename}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right: Live Native-Aspect Preview & Adaptive Recorded Player */}
          <div className="lg:col-span-6 space-y-4">
            <div className="rounded-xl bg-[#080C14] border border-slate-800 p-3 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5 font-medium text-slate-200">
                  <Film className="w-3.5 h-3.5 text-teal-400" />
                  <span>
                    {isEn
                      ? `Live Frame Preview (${outputDimensions.aspectLabel})`
                      : `লাইভ ফ্রেম প্রিভিউ (${outputDimensions.aspectLabel})`}
                  </span>
                </div>

                {scenes.length > 0 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={isExporting || safePreviewIndex <= 0}
                      onClick={() =>
                        setPreviewSceneIdx((i) => Math.max(0, i - 1))
                      }
                      aria-label="Previous preview scene"
                      className="p-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <span className="px-1.5 font-mono-tabular text-[10px] text-teal-300">
                      {isEn ? 'Scene' : 'দৃশ্য'} {safePreviewIndex + 1}/
                      {scenes.length}
                    </span>
                    <button
                      type="button"
                      disabled={
                        isExporting || safePreviewIndex >= scenes.length - 1
                      }
                      onClick={() =>
                        setPreviewSceneIdx((i) =>
                          Math.min(scenes.length - 1, i + 1)
                        )
                      }
                      aria-label="Next preview scene"
                      className="p-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Aspect-Exact Responsive Canvas Stage */}
              <div className="w-full flex items-center justify-center rounded-lg bg-[#04070E] border border-slate-800/80 p-2 min-h-[200px]">
                <canvas
                  ref={previewCanvasRef}
                  width={outputDimensions.width}
                  height={outputDimensions.height}
                  style={{
                    aspectRatio: `${outputDimensions.width} / ${outputDimensions.height}`,
                  }}
                  className="max-w-full max-h-[300px] w-auto h-auto rounded-md border border-slate-700/70 shadow-lg"
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono-tabular">
                <span>
                  {isEn ? 'Voice:' : 'ভয়েস:'} {personaDisplay}
                </span>
                <span>
                  {outputDimensions.width}x{outputDimensions.height}px
                </span>
              </div>
            </div>

            {recordedUrl && exportResult && (
              <div className="rounded-xl bg-[#080C14] border border-slate-800 p-3 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-300 font-medium">
                  <span>
                    {isEn ? 'Recorded Output Player' : 'রেকর্ডকৃত আউটপুট প্লেয়ার'}
                  </span>
                  <span className="text-teal-400 font-mono-tabular text-[10px]">
                    {exportResult.width}x{exportResult.height} ·{' '}
                    {exportResult.extension.toUpperCase()}
                  </span>
                </div>
                <div className="w-full flex items-center justify-center rounded-lg bg-black/90 border border-slate-800 p-1.5">
                  <video
                    src={recordedUrl}
                    controls
                    playsInline
                    style={{
                      aspectRatio: `${exportResult.width} / ${exportResult.height}`,
                    }}
                    className="max-w-full max-h-[260px] w-auto h-auto rounded-md"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
