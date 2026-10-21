import React, { useState, useRef, useEffect } from 'react';
import {
  Video,
  Download,
  Square,
  Sparkles,
  CheckCircle2,
  X,
  Smartphone,
  Monitor,
  ShoppingBag,
} from 'lucide-react';
import {
  type SceneItem,
  type VoicePersona,
  estimateBanglaSpeechDuration,
  createSynthesizedSpeechWav,
} from '../utils/dubbingLogic';

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

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const w of words) {
    const testLine = current ? `${current} ${w}` : w;
    if (ctx.measureText(testLine).width <= maxWidth) {
      current = testLine;
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 4);
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
  const [aspectMode, setAspectMode] = useState<'9:16' | '16:9'>('9:16');
  const [showCustomOverlay, setShowCustomOverlay] = useState<boolean>(false);
  const [topBadgeText, setTopBadgeText] = useState<string>('');
  const [offerBannerText, setOfferBannerText] = useState<string>('');
  const [burnSubtitles, setBurnSubtitles] = useState<boolean>(true);
  const [recordScope, setRecordScope] = useState<'all' | 'quick3'>('quick3');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingStatus, setRecordingStatus] = useState<string>('');
  const [currentRecSceneIdx, setCurrentRecSceneIdx] = useState<number>(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordedSizeKb, setRecordedSizeKb] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const abortRef = useRef<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const sourceVideoRef = useRef<HTMLVideoElement | null>(null);

  const canvasWidth = aspectMode === '9:16' ? 540 : 960;
  const canvasHeight = aspectMode === '9:16' ? 960 : 540;
  const personaDisplay = isEn ? activePersona.nameEn : activePersona.nameBn;

  // Draw an initial preview frame when modal opens or settings change
  useEffect(() => {
    if (!isOpen || isRecording) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const previewScene = scenes[0];
    if (!previewScene) return;

    let cancelled = false;
    const renderPreview = () => {
      if (cancelled) return;
      drawDynamicFrame(ctx, canvasWidth, canvasHeight, {
        scene: previewScene,
        sceneIndex: 0,
        totalScenes: scenes.length,
        progressRatio: 0.35,
        projectTitle,
        personaDisplay,
        topBadgeText,
        offerBannerText,
        burnSubtitles,
        frameImage: null,
        videoElement: null,
        pulseTick: 1,
        isEn,
      });
    };

    renderPreview();
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(renderPreview).catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    isRecording,
    aspectMode,
    canvasWidth,
    canvasHeight,
    scenes,
    projectTitle,
    personaDisplay,
    topBadgeText,
    offerBannerText,
    burnSubtitles,
    isEn,
  ]);

  if (!isOpen) return null;

  const stopRecordingEarly = () => {
    abortRef.current = true;
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
  };

  const handleStartDynamicRecording = async () => {
    if (isRecording) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    abortRef.current = false;
    setRecordedVideoUrl(null);
    setIsRecording(true);

    const targetScenes =
      recordScope === 'quick3' ? scenes.slice(0, Math.min(3, scenes.length)) : scenes;

    try {
      // 1. Pre-load custom frame images if present
      const frameImages = new Map<string, HTMLImageElement>();
      for (const s of targetScenes) {
        if (s.customFrameDataUrl) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = s.customFrameDataUrl!;
          });
          frameImages.set(s.id, img);
        }
      }

      // 2. Prepare WebAudio context & MediaRecorder stream
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const audioCtx = new AudioCtx();
      const destNode = audioCtx.createMediaStreamDestination();

      const canvasStream = canvas.captureStream(30);
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...destNode.stream.getAudioTracks(),
      ]);

      const mimeCandidates = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ];
      const chosenMime =
        mimeCandidates.find((m) =>
          typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported
            ? MediaRecorder.isTypeSupported(m)
            : false
        ) || '';

      const chunks: BlobPart[] = [];
      const recorder = chosenMime
        ? new MediaRecorder(combinedStream, { mimeType: chosenMime })
        : new MediaRecorder(combinedStream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunks.push(ev.data);
        }
      };

      const recorderStoppedPromise = new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, {
            type: chosenMime || 'video/webm',
          });
          resolve(blob);
        };
      });

      recorder.start(150);

      // 3. Render each scene sequentially with synchronized Bangladeshi voiceover
      for (let i = 0; i < targetScenes.length; i++) {
        if (abortRef.current) break;
        const scene = targetScenes[i];
        setCurrentRecSceneIdx(i + 1);
        setRecordingStatus(
          isEn
            ? `Preparing & recording Scene ${i + 1}/${targetScenes.length} (${scene.timeRangeLabel})...`
            : `দৃশ্য ${i + 1}/${targetScenes.length} প্রস্তুত ও রেকর্ডিং হচ্ছে (${scene.timeRangeLabel})...`
        );

        let audioBytesToDecode = scene.audioRawBytes || scene.audioWavBytes;
        let durationSec =
          scene.audioDurationSec ||
          estimateBanglaSpeechDuration(scene.banglaScript, speechSpeed);

        if (!audioBytesToDecode) {
          const generated = await onEnsureSceneVoice(scene.id);
          if (generated) {
            audioBytesToDecode = generated.rawBytes || generated.wavBytes;
            durationSec = generated.durationSec;
          } else {
            audioBytesToDecode = createSynthesizedSpeechWav(
              scene.banglaScript,
              durationSec,
              activePersona.basePitchHz
            );
          }
        }

        if (abortRef.current) break;

        // Decode audio into AudioContext and route to recorder stream
        let playDurationMs = Math.max(
          1800,
          Math.min(6000, Math.round((durationSec / speechSpeed) * 1000))
        );

        try {
          const bufferCopy = audioBytesToDecode.buffer.slice(
            audioBytesToDecode.byteOffset,
            audioBytesToDecode.byteOffset + audioBytesToDecode.byteLength
          ) as ArrayBuffer;
          const decodedBuffer = await audioCtx.decodeAudioData(bufferCopy);
          const sourceNode = audioCtx.createBufferSource();
          sourceNode.buffer = decodedBuffer;
          sourceNode.playbackRate.value = speechSpeed;
          sourceNode.connect(destNode);
          sourceNode.connect(audioCtx.destination);
          sourceNode.start(0);
          playDurationMs = Math.max(
            1800,
            Math.min(
              7500,
              Math.round((decodedBuffer.duration / speechSpeed) * 1000)
            )
          );
        } catch {
          // Continue canvas recording even if audio decode is skipped in headless mode
        }

        // Sync uploaded video element if available
        const vidEl = sourceVideoRef.current;
        if (vidEl && attachedVideoUrl) {
          try {
            vidEl.muted = true;
            vidEl.currentTime = scene.startTimeSec;
            vidEl.play().catch(() => {});
          } catch {
            // ignore seek error
          }
        }

        // Render 30fps animation frames for this scene's duration
        const startPerf = performance.now();
        let tick = 0;
        while (performance.now() - startPerf < playDurationMs) {
          if (abortRef.current) break;
          const elapsed = performance.now() - startPerf;
          const progressRatio = Math.min(1, elapsed / playDurationMs);
          tick += 1;

          drawDynamicFrame(ctx, canvasWidth, canvasHeight, {
            scene,
            sceneIndex: i,
            totalScenes: targetScenes.length,
            progressRatio,
            projectTitle,
            personaDisplay,
            topBadgeText,
            offerBannerText,
            burnSubtitles,
            frameImage: frameImages.get(scene.id) || null,
            videoElement: vidEl && attachedVideoUrl ? vidEl : null,
            pulseTick: tick,
            isEn,
          });

          await new Promise<void>((r) => setTimeout(r, 33));
        }

        if (vidEl && attachedVideoUrl) {
          vidEl.pause();
        }
      }

      if (recorder.state !== 'inactive') {
        recorder.stop();
      }

      const finalBlob = await recorderStoppedPromise;
      await audioCtx.close().catch(() => {});

      const url = URL.createObjectURL(finalBlob);
      setRecordedVideoUrl(url);
      setRecordedSizeKb(Math.max(12, Math.round(finalBlob.size / 1024)));
      setRecordingStatus(
        isEn
          ? `Dynamic Bangla voiceover video recording completed (${targetScenes.length} scenes)!`
          : `ডাইনামিক বাংলা ভয়েস কভার ভিডিও রেকর্ডিং সম্পন্ন হয়েছে (${targetScenes.length}টি দৃশ্য)!`
      );
    } catch {
      setRecordingStatus(
        isEn
          ? 'An error occurred while recording the video. Please try again.'
          : 'রেকর্ডিং সম্পন্ন করার সময় সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।'
      );
    } finally {
      setIsRecording(false);
    }
  };

  const handleDownloadRecordedVideo = () => {
    if (!recordedVideoUrl) return;
    const a = document.createElement('a');
    a.href = recordedVideoUrl;
    a.download = `KothaStudio_Dynamic_UGC_Bangla_Dub_${aspectMode === '9:16' ? 'Reels' : 'HD'}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dynamic-recorder-modal-title"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
    >
      <div className="w-full max-w-4xl rounded-2xl bg-[#0F1623] border border-slate-800 p-4 sm:p-6 space-y-5 shadow-2xl my-auto">
        {/* Hidden source video for frame drawing when user uploaded a video */}
        {attachedVideoUrl && (
          <video
            ref={sourceVideoRef}
            src={attachedVideoUrl}
            muted
            playsInline
            className="hidden"
          />
        )}

        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-teal-400 font-semibold font-bangla">
              <Video className="w-4 h-4 shrink-0" />
              <span>
                {isEn
                  ? 'Dynamic E-Commerce & UGC Video Recorder'
                  : 'ডাইনামিক ই-কমার্স ও UGC ভিডিও রেকর্ডার'}
              </span>
            </div>
            <h2
              id="dynamic-recorder-modal-title"
              className="text-base sm:text-xl font-bold text-white font-bangla"
            >
              {isEn
                ? 'Dynamic Bangla Dubbed Video Recording Generator (.WEBM)'
                : 'হুবহু ডাইনামিক বাংলা ডাবিং ভিডিও রেকর্ডিং জেনারেটর (.WEBM)'}
            </h2>
            <p className="text-xs text-slate-400 font-bangla">
              {isEn
                ? 'Combine your uploaded video or storyboard frames with Bangladeshi Bengali voiceovers, subtitles, and optional custom badges into a ready-to-share video.'
                : 'আপনার আপলোড করা যেকোনো ই-কমার্স UGC ভিডিও অথবা স্টোরিবোর্ড দৃশ্যের ওপর বাংলা ভয়েস কভার, সাবটাইটেল ও অফার ব্যাজ বসিয়ে সরাসরি পূর্ণাঙ্গ ভিডিও তৈরি করুন।'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              stopRecordingEarly();
              onClose();
            }}
            aria-label="Close video recorder modal"
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left 6 Cols: Customization & Recording Controls */}
          <div className="lg:col-span-6 space-y-4">
            {/* Format & Scope */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <span className="block text-xs font-medium text-slate-300 font-bangla">
                  {isEn ? 'Video Format' : 'ভিডিওর সাইজ (Video Format)'}
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    disabled={isRecording}
                    onClick={() => setAspectMode('9:16')}
                    className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      aspectMode === '9:16'
                        ? 'bg-teal-400 text-slate-950 font-bold border-teal-400'
                        : 'bg-[#090D16] text-slate-300 border-slate-800'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5 shrink-0" />
                    <span>9:16 (Reels/UGC)</span>
                  </button>
                  <button
                    type="button"
                    disabled={isRecording}
                    onClick={() => setAspectMode('16:9')}
                    className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      aspectMode === '16:9'
                        ? 'bg-teal-400 text-slate-950 font-bold border-teal-400'
                        : 'bg-[#090D16] text-slate-300 border-slate-800'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5 shrink-0" />
                    <span>16:9 (Landscape)</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="block text-xs font-medium text-slate-300 font-bangla">
                  {isEn ? 'Recording Scope' : 'রেকর্ডিং পরিসর (Recording Scope)'}
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    disabled={isRecording}
                    onClick={() => setRecordScope('quick3')}
                    className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-bangla border transition-colors cursor-pointer ${
                      recordScope === 'quick3'
                        ? 'bg-teal-400 text-slate-950 font-bold border-teal-400'
                        : 'bg-[#090D16] text-slate-300 border-slate-800'
                    }`}
                  >
                    {isEn ? 'First 3 Scenes (Fast)' : 'প্রথম ৩ দৃশ্য (দ্রুত)'}
                  </button>
                  <button
                    type="button"
                    disabled={isRecording}
                    onClick={() => setRecordScope('all')}
                    className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-bangla border transition-colors cursor-pointer ${
                      recordScope === 'all'
                        ? 'bg-teal-400 text-slate-950 font-bold border-teal-400'
                        : 'bg-[#090D16] text-slate-300 border-slate-800'
                    }`}
                  >
                    {isEn
                      ? `All Scenes (${scenes.length})`
                      : `সব দৃশ্য (${scenes.length}টি)`}
                  </button>
                </div>
              </div>
            </div>

            {/* Subtitle & Optional Custom Overlay Inputs */}
            <div className="space-y-3 p-3.5 rounded-xl bg-[#090D16] border border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-200 font-bangla cursor-pointer">
                  <input
                    type="checkbox"
                    checked={burnSubtitles}
                    onChange={(e) => setBurnSubtitles(e.target.checked)}
                    className="accent-teal-400"
                  />
                  <span>
                    {isEn
                      ? 'Burn Bangla Subtitles into Video'
                      : 'ভিডিওতে বাংলা সাবটাইটেল যুক্ত করুন'}
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowCustomOverlay((prev) => !prev)}
                  className="text-[11px] font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1 font-bangla cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>
                    {showCustomOverlay
                      ? isEn
                        ? 'Hide Custom Banner'
                        : 'কাস্টম ব্যানার বন্ধ করুন'
                      : isEn
                        ? '+ Add Custom Badge / Offer (Optional)'
                        : '+ কাস্টম ব্যাজ/অফার যুক্ত করুন (ঐচ্ছিক)'}
                  </span>
                </button>
              </div>

              {showCustomOverlay && (
                <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                  <div>
                    <label
                      htmlFor="ugc-top-badge"
                      className="block text-[11px] text-slate-400 mb-1 font-bangla"
                    >
                      {isEn
                        ? 'Top Custom Header/Badge (Optional — leave blank for default)'
                        : 'উপরের কাস্টম হেডার/ব্যাজ (ঐচ্ছিক — খালি রাখলে কিছুই আসবে না)'}
                    </label>
                    <input
                      id="ugc-top-badge"
                      type="text"
                      value={topBadgeText}
                      onChange={(e) => setTopBadgeText(e.target.value)}
                      placeholder={
                        isEn
                          ? 'Enter top badge text if needed...'
                          : 'প্রয়োজন হলে লিখুন...'
                      }
                      className="w-full rounded-lg bg-[#0F1623] border border-slate-800 px-3 py-1.5 text-xs text-white placeholder:text-slate-500 font-bangla"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="ugc-offer-banner"
                      className="block text-[11px] text-slate-400 mb-1 font-bangla"
                    >
                      {isEn
                        ? 'Bottom Offer / CTA Strip (Optional — hidden when blank)'
                        : 'নিচের অফার বা নির্দেশনা বার (ঐচ্ছিক — খালি রাখলে বটম বার দেখাবে না)'}
                    </label>
                    <input
                      id="ugc-offer-banner"
                      type="text"
                      value={offerBannerText}
                      onChange={(e) => setOfferBannerText(e.target.value)}
                      placeholder={
                        isEn
                          ? 'Enter bottom offer or CTA if needed...'
                          : 'প্রয়োজন হলে অফার বা CTA লিখুন...'
                      }
                      className="w-full rounded-lg bg-[#0F1623] border border-slate-800 px-3 py-1.5 text-xs text-white placeholder:text-slate-500 font-bangla"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5">
              {isRecording ? (
                <button
                  type="button"
                  onClick={stopRecordingEarly}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs sm:text-sm font-semibold text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>
                    {isEn
                      ? `Recording (Scene ${currentRecSceneIdx}) — Stop & Save Now`
                      : `রেকর্ডিং চলছে (দৃশ্য ${currentRecSceneIdx}) — এখানেই সেভ করুন`}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartDynamicRecording}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-xs sm:text-sm font-bold text-slate-950 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>
                    {isEn
                      ? 'Start Dynamic Bangla Voice Video Recording'
                      : 'ডাইনামিক বাংলা ভয়েস ভিডিও রেকর্ডিং শুরু করুন'}
                  </span>
                </button>
              )}

              {recordingStatus && (
                <p className="text-xs text-teal-300 font-bangla text-center">
                  {recordingStatus}
                </p>
              )}

              {recordedVideoUrl && (
                <div className="p-3.5 rounded-xl bg-teal-950/40 border border-teal-700/60 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-teal-200 font-bangla">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-teal-400" />
                      <span>
                        {isEn
                          ? `Your Dubbed Video is Ready (${recordedSizeKb} KB)!`
                          : `আপনার ডাবিংকৃত ভিডিও প্রস্তুত (${recordedSizeKb} KB)!`}
                      </span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadRecordedVideo}
                    className="w-full min-h-[40px] px-4 py-2 rounded-lg bg-teal-400 hover:bg-teal-300 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>
                      {isEn
                        ? 'Download Dubbed Video (.WEBM)'
                        : 'ডাবিংকৃত ভিডিও ডাউনলোড করুন (.WEBM)'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right 6 Cols: Live Canvas Recording Stage / Recorded Video Player */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center bg-[#080C14] border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] text-slate-400 mb-2 flex items-center justify-between w-full px-1 font-bangla">
              <span>
                {isEn
                  ? `Live Canvas Preview (${aspectMode})`
                  : `লাইভ ক্যানভাস প্রিভিউ (${aspectMode})`}
              </span>
              <span className="text-teal-400">{personaDisplay}</span>
            </div>

            <canvas
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              className={`rounded-lg border border-slate-800 bg-black shadow-lg ${
                aspectMode === '9:16'
                  ? 'max-h-[360px] w-auto'
                  : 'w-full max-h-[270px] object-contain'
              }`}
            />

            {recordedVideoUrl && !isRecording && (
              <div className="w-full mt-3 pt-3 border-t border-slate-800 space-y-1.5">
                <span className="text-[11px] text-teal-300 font-bangla block">
                  {isEn ? 'Recorded Output Player:' : 'রেকর্ডকৃত আউটপুট প্লেয়ার:'}
                </span>
                <video
                  src={recordedVideoUrl}
                  controls
                  className="w-full max-h-[180px] rounded-lg bg-black"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

function drawDynamicFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  opts: {
    scene: SceneItem;
    sceneIndex: number;
    totalScenes: number;
    progressRatio: number;
    projectTitle: string;
    personaDisplay: string;
    topBadgeText: string;
    offerBannerText: string;
    burnSubtitles: boolean;
    frameImage: HTMLImageElement | null;
    videoElement: HTMLVideoElement | null;
    pulseTick: number;
    isEn: boolean;
  }
) {
  const {
    scene,
    sceneIndex,
    totalScenes,
    progressRatio,
    projectTitle,
    personaDisplay,
    topBadgeText,
    offerBannerText,
    burnSubtitles,
    frameImage,
    videoElement,
    pulseTick,
    isEn,
  } = opts;

  // 1. Background gradient
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#090D16');
  grad.addColorStop(0.5, '#0F1E2E');
  grad.addColorStop(1, '#08121E');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // 2. Draw Video Frame or Captured Image if present
  const mediaBoxY = Math.round(h * 0.14);
  const mediaBoxH = Math.round(h * 0.46);
  const mediaBoxX = Math.round(w * 0.06);
  const mediaBoxW = Math.round(w * 0.88);

  ctx.save();
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 2;
  ctx.fillStyle = '#0B1322';
  ctx.fillRect(mediaBoxX, mediaBoxY, mediaBoxW, mediaBoxH);
  ctx.strokeRect(mediaBoxX, mediaBoxY, mediaBoxW, mediaBoxH);

  if (videoElement && videoElement.readyState >= 2) {
    try {
      ctx.drawImage(videoElement, mediaBoxX, mediaBoxY, mediaBoxW, mediaBoxH);
    } catch {
      // fallback below
    }
  } else if (frameImage && frameImage.complete && frameImage.naturalWidth > 0) {
    try {
      ctx.drawImage(frameImage, mediaBoxX, mediaBoxY, mediaBoxW, mediaBoxH);
    } catch {
      // fallback below
    }
  } else {
    // Rich Dynamic Storyboard Visual Card inside the frame
    const innerGrad = ctx.createLinearGradient(
      mediaBoxX,
      mediaBoxY,
      mediaBoxX + mediaBoxW,
      mediaBoxY + mediaBoxH
    );
    innerGrad.addColorStop(0, '#0D2438');
    innerGrad.addColorStop(1, '#0A1626');
    ctx.fillStyle = innerGrad;
    ctx.fillRect(mediaBoxX, mediaBoxY, mediaBoxW, mediaBoxH);

    // Scene number & timestamp badge
    ctx.fillStyle = '#2DD4BF';
    ctx.font = 'bold 15px "JetBrains Mono", "Plus Jakarta Sans", sans-serif';
    ctx.fillText(
      `SCENE ${String(scene.sceneNumber).padStart(2, '0')} / ${String(
        totalScenes
      ).padStart(2, '0')} · ${scene.timeRangeLabel}`,
      mediaBoxX + 20,
      mediaBoxY + 34
    );

    // Scene Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px "Hind Siliguri", "Plus Jakarta Sans", sans-serif';
    const titleLines = wrapCanvasText(
      ctx,
      isEn ? scene.titleEn : scene.titleBn,
      mediaBoxW - 40
    );
    titleLines.slice(0, 2).forEach((line, idx) => {
      ctx.fillText(line, mediaBoxX + 20, mediaBoxY + 72 + idx * 28);
    });

    // On-screen text highlight pill
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(
      mediaBoxX + 20,
      mediaBoxY + mediaBoxH - 72,
      mediaBoxW - 40,
      46
    );
    ctx.strokeStyle = '#14B8A6';
    ctx.strokeRect(
      mediaBoxX + 20,
      mediaBoxY + mediaBoxH - 72,
      mediaBoxW - 40,
      46
    );
    ctx.fillStyle = '#99F6E4';
    ctx.font = '600 14px "Hind Siliguri", "Plus Jakarta Sans", sans-serif';
    const osLines = wrapCanvasText(ctx, scene.onScreenText, mediaBoxW - 64);
    ctx.fillText(
      osLines[0] || scene.titleEn,
      mediaBoxX + 32,
      mediaBoxY + mediaBoxH - 44
    );
  }
  ctx.restore();

  // 3. Top Header Bar (shows optional custom badge if entered, otherwise clean scene info)
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(mediaBoxX, 18, mediaBoxW, Math.round(h * 0.085));
  ctx.strokeStyle = '#2DD4BF';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(mediaBoxX, 18, mediaBoxW, Math.round(h * 0.085));

  ctx.fillStyle = '#2DD4BF';
  ctx.font = 'bold 13px "Hind Siliguri", "Plus Jakarta Sans", sans-serif';
  const topLineText =
    topBadgeText.trim() ||
    (isEn
      ? `Scene ${scene.sceneNumber}/${totalScenes} (${scene.timeRangeLabel})`
      : `দৃশ্য ${scene.sceneNumber}/${totalScenes} (${scene.timeRangeLabel})`);
  ctx.fillText(
    topLineText.slice(0, 58),
    mediaBoxX + 14,
    18 + Math.round(h * 0.036)
  );

  ctx.fillStyle = '#E2E8F0';
  ctx.font = '12px "Hind Siliguri", "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    `${projectTitle.slice(0, 42)} · ${isEn ? 'Voice' : 'কণ্ঠ'}: ${personaDisplay}`,
    mediaBoxX + 14,
    18 + Math.round(h * 0.068)
  );

  // Animated Audio Waveform Bars in Top-Right
  const barBaseX = mediaBoxX + mediaBoxW - 58;
  const barBaseY = 18 + Math.round(h * 0.065);
  ctx.fillStyle = '#2DD4BF';
  for (let b = 0; b < 5; b++) {
    const waveH =
      8 + Math.abs(Math.sin((pulseTick + b * 4) * 0.25)) * 18;
    ctx.fillRect(barBaseX + b * 9, barBaseY - waveH, 5, waveH);
  }

  // 4. Burned-in Bangladeshi Bengali Subtitles Box
  if (burnSubtitles) {
    const subBoxY = Math.round(h * 0.63);
    const subBoxH = Math.round(h * 0.21);
    ctx.fillStyle = 'rgba(9, 13, 22, 0.92)';
    ctx.fillRect(mediaBoxX, subBoxY, mediaBoxW, subBoxH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(mediaBoxX, subBoxY, mediaBoxW, subBoxH);

    ctx.fillStyle = '#5EEAD4';
    ctx.font = 'bold 16px "Hind Siliguri", "Plus Jakarta Sans", sans-serif';
    const subLines = wrapCanvasText(
      ctx,
      `“${scene.banglaScript}”`,
      mediaBoxW - 32
    );
    subLines.forEach((line, idx) => {
      ctx.fillText(line, mediaBoxX + 16, subBoxY + 32 + idx * 25);
    });
  }

  // 5. Optional Bottom Offer & Call-To-Action Strip (only drawn if user added offerBannerText)
  if (offerBannerText.trim()) {
    const ctaY = Math.round(h * 0.87);
    const ctaH = Math.round(h * 0.075);
    ctx.fillStyle = '#14B8A6';
    ctx.fillRect(mediaBoxX, ctaY, mediaBoxW, ctaH);

    ctx.fillStyle = '#020617';
    ctx.font = 'bold 14px "Hind Siliguri", "Plus Jakarta Sans", sans-serif';
    ctx.fillText(
      offerBannerText.trim().slice(0, 62),
      mediaBoxX + 16,
      ctaY + Math.round(ctaH * 0.62)
    );
  }

  // 6. Scene Progress Bar at very bottom
  const overallProgress =
    (sceneIndex + progressRatio) / Math.max(1, totalScenes);
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(0, h - 8, w, 8);
  ctx.fillStyle = '#2DD4BF';
  ctx.fillRect(0, h - 8, Math.round(w * overallProgress), 8);
}
