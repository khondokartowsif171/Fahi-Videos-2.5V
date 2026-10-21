import { kothaFetch as fetch } from '../api-client';
import React, { useState, useRef } from 'react';
import {
  Upload,
  Film,
  Plus,
  X,
  Sparkles,
  CheckCircle2,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  type SceneItem,
  type VoiceTone,
  type EcommerceCategory,
  ECOMMERCE_CATEGORIES,
  formatTimestamp,
  buildDynamicEcommerceUgcScenes,
} from '../utils/dubbingLogic';

interface VideoFrameExtractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTone: VoiceTone;
  existingSceneCount: number;
  uiLang?: 'bn' | 'en';
  onApplyScenes: (
    newScenes: SceneItem[],
    mode: 'replace' | 'append',
    videoObjectUrl?: string,
    newProjectTitle?: string
  ) => void;
}

export const VideoFrameExtractorModal: React.FC<VideoFrameExtractorModalProps> = ({
  isOpen,
  onClose,
  selectedTone,
  existingSceneCount,
  uiLang = 'bn',
  onApplyScenes,
}) => {
  const isEn = uiLang === 'en';
  const [videoFileUrl, setVideoFileUrl] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [targetSceneCount, setTargetSceneCount] = useState<number>(5);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');

  // Optional Product / Offer Context (OFF and 100% blank by default — never auto-filled!)
  const [showOptionalBrief, setShowOptionalBrief] = useState<boolean>(false);
  const [category, setCategory] = useState<EcommerceCategory>('');
  const [productName, setProductName] = useState<string>('');
  const [offerPriceBn, setOfferPriceBn] = useState<string>('');
  const [deliveryNoteBn, setDeliveryNoteBn] = useState<string>('');
  const [ctaTextBn, setCtaTextBn] = useState<string>('');

  // Manual single scene form (Collapsed by default)
  const [showManualSceneForm, setShowManualSceneForm] =
    useState<boolean>(false);
  const [manualTitleEn, setManualTitleEn] = useState('');
  const [manualSummaryEn, setManualSummaryEn] = useState('');
  const [manualBanglaScript, setManualBanglaScript] = useState('');
  const [manualStartSec, setManualStartSec] = useState('0');
  const [manualEndSec, setManualEndSec] = useState('5');
  const [formError, setFormError] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);

  if (!isOpen) return null;

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setVideoFileUrl(url);
    setVideoFileName(file.name);
    setStatusMessage(
      isEn
        ? 'Video loaded. Click the button below to extract keyframes and generate Bangladeshi Bengali voiceover scripts.'
        : 'ভিডিও লোড হয়েছে। এখন নিচের বাটনে ক্লিক করে দৃশ্য ক্যাপচার ও বাংলা ভয়েস স্ক্রিপ্ট তৈরি করুন।'
    );
  };

  // Extract frames from uploaded video + generate Bangladeshi Bengali scripts
  const handleExtractFramesFromVideo = async () => {
    const videoEl = videoRef.current;
    if (!videoEl || !videoFileUrl) return;

    setIsExtracting(true);
    setStatusMessage(
      isEn
        ? 'Extracting keyframes from video scenes and running visual analysis...'
        : 'ভিডিওর দৃশ্যগুলো থেকে কি-ফ্রেম ক্যাপচার এবং ভিজ্যুয়াল বিশ্লেষণ চলছে...'
    );

    // Only use optional brief values if the user explicitly enabled the section and typed them
    const activeProduct = showOptionalBrief ? productName.trim() : '';
    const activeCategory: EcommerceCategory = showOptionalBrief ? category : '';
    const activeOffer = showOptionalBrief ? offerPriceBn.trim() : '';
    const activeDelivery = showOptionalBrief ? deliveryNoteBn.trim() : '';
    const activeCta = showOptionalBrief ? ctaTextBn.trim() : '';

    try {
      const duration = Math.max(5, Math.floor(videoEl.duration || 15));
      const numClips = Math.min(8, Math.max(3, targetSceneCount));
      const clipSpan = Math.max(1, Math.floor(duration / numClips));

      const capturedFrames: {
        timeRangeLabel: string;
        startTimeSec: number;
        endTimeSec: number;
        imageDataUrl: string;
        hintText: string;
      }[] = [];

      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');

      for (let i = 0; i < numClips; i++) {
        const startSec = i * clipSpan;
        const endSec = i === numClips - 1 ? duration : (i + 1) * clipSpan;
        const sampleTime = Math.min(duration - 0.1, startSec + clipSpan * 0.45);

        await new Promise<void>((resolve) => {
          const onSeeked = () => {
            videoEl.removeEventListener('seeked', onSeeked);
            resolve();
          };
          videoEl.addEventListener('seeked', onSeeked);
          videoEl.currentTime = sampleTime;
        });

        let imageDataUrl = '';
        if (ctx) {
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
          imageDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        }

        const rangeLabel = `${formatTimestamp(startSec)} - ${formatTimestamp(endSec)}`;
        capturedFrames.push({
          timeRangeLabel: rangeLabel,
          startTimeSec: startSec,
          endTimeSec: endSec,
          imageDataUrl,
          hintText: activeProduct
            ? `${activeProduct} (${rangeLabel})`
            : `Scene ${i + 1} (${rangeLabel})`,
        });
      }

      setStatusMessage(
        isEn
          ? 'Generating natural Bangladeshi Bengali voiceover scripts for each scene...'
          : 'ভিডিওর দৃশ্য অনুযায়ী বাংলাদেশি বাংলা ভয়েস স্ক্রিপ্ট তৈরি হচ্ছে...'
      );

      const startNumber = importMode === 'replace' ? 1 : existingSceneCount + 1;

      // Local 100% Free Dynamic Scene Engine baseline (uses only what user explicitly provided)
      const fallbackScenes = buildDynamicEcommerceUgcScenes(
        capturedFrames,
        {
          productName: activeProduct,
          category: activeCategory,
          offerPriceBn: activeOffer,
          ctaTextBn: activeCta,
          deliveryNoteBn: activeDelivery,
          tone: selectedTone,
        },
        startNumber
      );

      const nextTitle = activeProduct
        ? isEn
          ? `${activeProduct} — Bangla Voice Cover Storyboard`
          : `${activeProduct} — বাংলা ভয়েস কভার স্টোরিবোর্ড`
        : isEn
          ? 'Custom Video — Bangla Voice Cover Storyboard'
          : 'কাস্টম ভিডিও — বাংলা ভয়েস কভার স্টোরিবোর্ড';

      try {
        const res = await fetch('/api/analyze-frames', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            frames: capturedFrames,
            tone: selectedTone,
            productName: activeProduct,
            category: activeCategory,
            offerPriceBn: activeOffer,
            ctaTextBn: activeCta,
            deliveryNoteBn: activeDelivery,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const analyzedList = Array.isArray(data.scenes) ? data.scenes : [];

          const builtScenes: SceneItem[] = capturedFrames.map((cf, idx) => {
            const info = analyzedList[idx] || {};
            const baseScene = fallbackScenes[idx];
            const sceneNum = startNumber + idx;
            return {
              ...baseScene,
              id: `custom-scene-${Date.now()}-${idx}`,
              sceneNumber: sceneNum,
              titleEn: info.titleEn || baseScene.titleEn,
              titleBn: info.titleBn || baseScene.titleBn,
              onScreenText: info.onScreenText || baseScene.onScreenText,
              englishSummary: info.englishSummary || baseScene.englishSummary,
              banglaScript: info.banglaScript || baseScene.banglaScript,
              phoneticGuide: info.phoneticGuide || baseScene.phoneticGuide,
              customFrameDataUrl: cf.imageDataUrl,
            };
          });

          onApplyScenes(
            builtScenes,
            importMode,
            videoFileUrl,
            importMode === 'replace' ? nextTitle : undefined
          );
          onClose();
          return;
        }
      } catch {
        // Proceed with 100% Free client-side fallbackScenes
      }

      onApplyScenes(
        fallbackScenes,
        importMode,
        videoFileUrl,
        importMode === 'replace' ? nextTitle : undefined
      );
      onClose();
    } catch {
      setStatusMessage(
        isEn
          ? 'Failed to process video frames. Please try again.'
          : 'ভিডিও ফ্রেম প্রসেস করার সময় সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।'
      );
    } finally {
      setIsExtracting(false);
    }
  };

  // Optional: Generate storyboard from user-entered brief even without a video file
  const handleGenerateFromCustomBrief = () => {
    const activeProduct = productName.trim();
    const activeOffer = offerPriceBn.trim();
    const activeDelivery = deliveryNoteBn.trim();
    const activeCta = ctaTextBn.trim();

    const startNumber = importMode === 'replace' ? 1 : existingSceneCount + 1;
    const builtScenes = buildDynamicEcommerceUgcScenes(
      [],
      {
        productName: activeProduct,
        category,
        offerPriceBn: activeOffer,
        ctaTextBn: activeCta,
        deliveryNoteBn: activeDelivery,
        tone: selectedTone,
      },
      startNumber
    );
    const nextTitle = activeProduct
      ? isEn
        ? `${activeProduct} — Bangla Voice Cover Storyboard`
        : `${activeProduct} — বাংলা ভয়েস কভার স্টোরিবোর্ড`
      : isEn
        ? 'New Bangla Voice Cover Project'
        : 'নতুন বাংলা ভয়েস কভার প্রজেক্ট';
    onApplyScenes(
      builtScenes,
      importMode,
      videoFileUrl || undefined,
      importMode === 'replace' ? nextTitle : undefined
    );
    onClose();
  };

  const handleAddManualScene = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitleEn.trim() || !manualBanglaScript.trim()) {
      setFormError(
        isEn
          ? 'Please enter both the scene title and the Bangla voiceover script.'
          : 'দৃশ্যের শিরোনাম এবং বাংলা ভয়েসওভার স্ক্রিপ্ট উভয়ই লিখুন।'
      );
      return;
    }
    setFormError('');

    const start = Math.max(0, Number(manualStartSec) || 0);
    const end = Math.max(start + 2, Number(manualEndSec) || start + 5);
    const sceneNum = existingSceneCount + 1;
    const rangeLabel = `${formatTimestamp(start)} - ${formatTimestamp(end)}`;

    const newScene: SceneItem = {
      id: `manual-scene-${Date.now()}`,
      sceneNumber: sceneNum,
      startTimeSec: start,
      endTimeSec: end,
      timeRangeLabel: rangeLabel,
      titleEn: manualTitleEn.trim(),
      titleBn: manualTitleEn.trim(),
      visualCaptureDescription: manualSummaryEn.trim() || manualTitleEn.trim(),
      onScreenText: manualTitleEn.trim(),
      englishSummary:
        manualSummaryEn.trim() ||
        `Custom scene added at ${rangeLabel}: ${manualTitleEn.trim()}`,
      banglaScript: manualBanglaScript.trim(),
      phoneticGuide: 'Custom Bangladeshi Bengali narration segment.',
      visualType: 'dynamic-ugc-stage',
      keyMetrics: [rangeLabel, 'Custom Scene'],
      status: 'pending',
    };

    onApplyScenes([newScene], 'append', videoFileUrl || undefined);
    setManualTitleEn('');
    setManualSummaryEn('');
    setManualBanglaScript('');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="video-extractor-modal-title"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-[#0F1623] border border-slate-800 p-4 sm:p-6 space-y-4 shadow-2xl my-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3.5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-teal-400 font-semibold font-bangla">
              <Film className="w-4 h-4 shrink-0" />
              <span>
                {isEn
                  ? 'Video Scene Capture & Auto Bangla Script Generator'
                  : 'ভিডিও সিন ক্যাপচার ও অটো-বাংলা স্ক্রিপ্ট জেনারেটর'}
              </span>
            </div>
            <h2
              id="video-extractor-modal-title"
              className="text-base sm:text-xl font-bold text-white font-bangla"
            >
              {isEn
                ? 'Upload Any Video & Generate Scene-by-Scene Bangla Voice Scripts'
                : 'যেকোনো ভিডিও আপলোড ও দৃশ্য অনুযায়ী বাংলা ভয়েস স্ক্রিপ্ট তৈরি'}
            </h2>
            <p className="text-xs text-slate-400 font-bangla">
              {isEn
                ? 'Upload any video file—keyframes will be captured automatically and turned into natural Bangladeshi Bengali voiceover scripts.'
                : 'আপনার যেকোনো ভিডিও ফাইল আপলোড করুন—ভিডিওর দৃশ্যগুলো স্বয়ংক্রিয়ভাবে ক্যাপচার হয়ে ন্যাচারাল বাংলাদেশি বাংলায় ভয়েস কভার স্ক্রিপ্ট তৈরি হবে।'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Mode & Scene Count Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#090D16] border border-slate-800 rounded-xl p-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setImportMode('replace')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bangla transition-colors cursor-pointer ${
                importMode === 'replace'
                  ? 'bg-teal-400 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white bg-[#0F1623]'
              }`}
            >
              {isEn ? 'Load as New Project' : 'নতুন প্রজেক্ট হিসেবে লোড'}
            </button>
            <button
              type="button"
              onClick={() => setImportMode('append')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bangla transition-colors cursor-pointer ${
                importMode === 'append'
                  ? 'bg-teal-400 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white bg-[#0F1623]'
              }`}
            >
              {isEn ? 'Append to Current Scenes' : 'বর্তমান দৃশ্যে যুক্ত করুন'}
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bangla text-slate-300">
            <span>{isEn ? 'Scenes:' : 'দৃশ্য সংখ্যা:'}</span>
            {[4, 5, 6, 8].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setTargetSceneCount(count)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono-tabular border cursor-pointer ${
                  targetSceneCount === count
                    ? 'bg-teal-400 text-slate-950 font-bold border-teal-400'
                    : 'bg-[#0F1623] text-slate-300 border-slate-800'
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        {/* Primary Section: Upload Video File (Zero hardcoded fields) */}
        <div className="p-4 rounded-xl bg-[#090D16] border border-slate-800 space-y-3">
          <label className="flex flex-col items-center justify-center border border-dashed border-slate-700 hover:border-teal-500/70 rounded-xl p-5 cursor-pointer transition-colors bg-slate-900/40">
            <Upload className="w-6 h-6 text-teal-400 mb-2" />
            <span className="text-xs sm:text-sm font-medium text-slate-200 font-bangla text-center">
              {videoFileName
                ? isEn
                  ? `Selected Video: ${videoFileName}`
                  : `নির্বাচিত ভিডিও: ${videoFileName}`
                : isEn
                  ? 'Select Your Video File (.MP4 / .WebM / .MOV)'
                  : 'আপনার ভিডিও ফাইল নির্বাচন করুন (.MP4 / .WebM / .MOV)'}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 font-bangla text-center">
              {isEn
                ? 'Frames will be captured directly from your video to generate summaries & Bangla voiceover scripts'
                : 'ভিডিওর দৃশ্যগুলো থেকে সরাসরি বাংলা সামারি ও ভয়েসওভার স্ক্রিপ্ট তৈরি হবে'}
            </span>
            <input
              type="file"
              accept="video/*"
              onChange={handleVideoFileChange}
              className="hidden"
            />
          </label>

          {videoFileUrl && (
            <div className="space-y-3 pt-1">
              <video
                ref={videoRef}
                src={videoFileUrl}
                controls
                muted
                className="w-full max-h-48 rounded-lg bg-black object-contain"
              />
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  disabled={isExtracting}
                  onClick={handleExtractFramesFromVideo}
                  className="flex-1 min-h-[42px] px-4 py-2 text-xs font-bold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors flex items-center justify-center gap-1.5 font-bangla cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>
                    {isExtracting
                      ? isEn
                        ? 'Capturing frames & generating Bangla scripts...'
                        : 'ফ্রেম ক্যাপচার ও বাংলা স্ক্রিপ্ট তৈরি হচ্ছে...'
                      : isEn
                        ? `Auto Capture Frames & Generate Bangla Scripts (${targetSceneCount} Scenes)`
                        : `অটো ফ্রেম ক্যাপচার ও বাংলা স্ক্রিপ্ট তৈরি করুন (${targetSceneCount} দৃশ্য)`}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onApplyScenes([], 'append', videoFileUrl);
                    onClose();
                  }}
                  className="min-h-[42px] px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-center gap-1.5 font-bangla cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                  <span>
                    {isEn ? 'Sync to Player Only' : 'শুধু প্লেয়ারে সিঙ্ক করুন'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {statusMessage && (
            <p className="text-xs text-teal-300 font-bangla">{statusMessage}</p>
          )}
        </div>

        {/* Optional Toggle 1: Add Product / Offer Info ONLY IF NEEDED (Never auto-applied) */}
        <div className="rounded-xl bg-[#090D16] border border-slate-800 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowOptionalBrief((prev) => !prev)}
            className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2 font-bangla">
              <SlidersHorizontal className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span>
                {isEn
                  ? 'Add Product, Offer or Custom Context (Optional — Open if needed)'
                  : 'প্রোডাক্ট, অফার বা অতিরিক্ত তথ্য যুক্ত করুন (ঐচ্ছিক — প্রয়োজন হলে ওপেন করুন)'}
              </span>
            </span>
            {showOptionalBrief ? (
              <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            )}
          </button>

          {showOptionalBrief && (
            <div className="p-4 pt-2 border-t border-slate-800/80 space-y-3">
              <p className="text-[11px] text-slate-400 font-bangla">
                {isEn
                  ? 'Fill these fields only if you want to mention a specific product, price, or offer in your voiceover. Leaving them blank adds no extra details.'
                  : 'আপনার ভিডিওতে যদি নির্দিষ্ট কোনো প্রোডাক্ট, দাম বা অফার উল্লেখ করতে চান, তবেই নিচের ঘরগুলো পূরণ করুন। খালি রাখলে কোনো অতিরিক্ত তথ্য অটোমেটিক যুক্ত হবে না।'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="ugc-category-select"
                    className="block text-[11px] text-slate-400 mb-1 font-bangla"
                  >
                    {isEn ? 'Category (Optional)' : 'ক্যাটাগরি (ঐচ্ছিক)'}
                  </label>
                  <select
                    id="ugc-category-select"
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as EcommerceCategory)
                    }
                    className="w-full min-h-[38px] rounded-lg bg-[#0F1623] border border-slate-800 px-3 py-1.5 text-xs text-white font-bangla cursor-pointer"
                  >
                    {ECOMMERCE_CATEGORIES.map((c) => (
                      <option key={c.id || 'none'} value={c.id}>
                        {isEn ? c.labelEn : c.labelBn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="ugc-product-name"
                    className="block text-[11px] text-slate-400 mb-1 font-bangla"
                  >
                    {isEn
                      ? 'Product or Topic Name (Optional)'
                      : 'প্রোডাক্ট বা বিষয়ের নাম (ঐচ্ছিক)'}
                  </label>
                  <input
                    id="ugc-product-name"
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder={
                      isEn
                        ? 'Enter product or brand name...'
                        : 'যেমন: প্রোডাক্ট বা ব্র্যান্ডের নাম লিখুন...'
                    }
                    className="w-full min-h-[38px] rounded-lg bg-[#0F1623] border border-slate-800 px-3 py-1.5 text-xs text-white font-bangla"
                  />
                </div>

                <div>
                  <label
                    htmlFor="ugc-offer-price"
                    className="block text-[11px] text-slate-400 mb-1 font-bangla"
                  >
                    {isEn
                      ? 'Offer or Price (Optional)'
                      : 'অফার বা মূল্য (ঐচ্ছিক)'}
                  </label>
                  <input
                    id="ugc-offer-price"
                    type="text"
                    value={offerPriceBn}
                    onChange={(e) => setOfferPriceBn(e.target.value)}
                    placeholder={
                      isEn
                        ? 'Enter discount or price if needed...'
                        : 'যেমন: বিশেষ ডিসকাউন্ট বা দাম (প্রয়োজন হলে)...'
                    }
                    className="w-full min-h-[38px] rounded-lg bg-[#0F1623] border border-slate-800 px-3 py-1.5 text-xs text-white font-bangla"
                  />
                </div>

                <div>
                  <label
                    htmlFor="ugc-cta-text"
                    className="block text-[11px] text-slate-400 mb-1 font-bangla"
                  >
                    {isEn
                      ? 'Call-To-Action Note (Optional)'
                      : 'কল-টু-অ্যাকশন বা নির্দেশনা (ঐচ্ছিক)'}
                  </label>
                  <input
                    id="ugc-cta-text"
                    type="text"
                    value={ctaTextBn}
                    onChange={(e) => setCtaTextBn(e.target.value)}
                    placeholder={
                      isEn
                        ? 'Enter CTA note if needed...'
                        : 'যেমন: বিস্তারিত জানতে ভিজিট করুন / ইনবক্স করুন...'
                    }
                    className="w-full min-h-[38px] rounded-lg bg-[#0F1623] border border-slate-800 px-3 py-1.5 text-xs text-white font-bangla"
                  />
                </div>
              </div>

              {(productName.trim() || offerPriceBn.trim() || ctaTextBn.trim()) && (
                <div className="flex items-center justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleGenerateFromCustomBrief}
                    className="min-h-[36px] px-3.5 py-1.5 rounded-lg bg-teal-400/15 hover:bg-teal-400/25 text-teal-300 border border-teal-500/40 text-xs font-semibold font-bangla flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {isEn
                        ? 'Generate Storyboard from This Context'
                        : 'এই তথ্যের ভিত্তিতে স্টোরিবোর্ড তৈরি করুন'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Optional Toggle 2: Add Single Manual Scene Segment */}
        <div className="rounded-xl bg-[#090D16] border border-slate-800 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowManualSceneForm((prev) => !prev)}
            className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2 font-bangla">
              <Plus className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span>
                {isEn
                  ? 'Add a Single Manual Scene & Bangla Script (Optional)'
                  : 'ম্যানুয়ালি একটি নতুন দৃশ্য ও বাংলা স্ক্রিপ্ট যুক্ত করুন (ঐচ্ছিক)'}
              </span>
            </span>
            {showManualSceneForm ? (
              <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            )}
          </button>

          {showManualSceneForm && (
            <form
              onSubmit={handleAddManualScene}
              className="p-4 pt-2 border-t border-slate-800/80 space-y-3"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-1 grid grid-cols-2 gap-2">
                  <div>
                    <label
                      htmlFor="manual-start-sec"
                      className="block text-[11px] text-slate-400 mb-1"
                    >
                      Start (sec)
                    </label>
                    <input
                      id="manual-start-sec"
                      type="number"
                      min={0}
                      value={manualStartSec}
                      onChange={(e) => setManualStartSec(e.target.value)}
                      className="w-full rounded-lg bg-[#0F1623] border border-slate-800 px-3 py-1.5 text-xs text-white font-mono-tabular"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="manual-end-sec"
                      className="block text-[11px] text-slate-400 mb-1"
                    >
                      End (sec)
                    </label>
                    <input
                      id="manual-end-sec"
                      type="number"
                      min={1}
                      value={manualEndSec}
                      onChange={(e) => setManualEndSec(e.target.value)}
                      className="w-full rounded-lg bg-[#0F1623] border border-slate-800 px-3 py-1.5 text-xs text-white font-mono-tabular"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="manual-scene-title"
                    className="block text-[11px] text-slate-400 mb-1 font-bangla"
                  >
                    {isEn ? 'Scene Title' : 'দৃশ্যের শিরোনাম (Scene Title)'}
                  </label>
                  <input
                    id="manual-scene-title"
                    type="text"
                    value={manualTitleEn}
                    onChange={(e) => setManualTitleEn(e.target.value)}
                    placeholder={
                      isEn ? 'Enter scene title...' : 'দৃশ্যের শিরোনাম লিখুন...'
                    }
                    className="w-full rounded-lg bg-[#0F1623] border border-slate-800 px-3 py-1.5 text-xs text-white font-bangla"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="manual-scene-summary"
                  className="block text-[11px] text-slate-400 mb-1"
                >
                  {isEn
                    ? 'English Visual Summary (Optional)'
                    : 'ইংরেজি ভিজ্যুয়াল সামারি (ঐচ্ছিক)'}
                </label>
                <input
                  id="manual-scene-summary"
                  type="text"
                  value={manualSummaryEn}
                  onChange={(e) => setManualSummaryEn(e.target.value)}
                  placeholder="Describe what happens on screen during this scene..."
                  className="w-full rounded-lg bg-[#0F1623] border border-slate-800 px-3 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="manual-bangla-script"
                  className="block text-[11px] text-slate-400 mb-1 font-bangla"
                >
                  {isEn
                    ? 'Bangla Voiceover Script (Bangladeshi Narration)'
                    : 'বাংলা ভয়েসওভার স্ক্রিপ্ট (Bangladeshi Narration Script)'}
                </label>
                <textarea
                  id="manual-bangla-script"
                  rows={2}
                  value={manualBanglaScript}
                  onChange={(e) => setManualBanglaScript(e.target.value)}
                  placeholder={
                    isEn
                      ? 'Write Bangladeshi Bengali voiceover script for this scene...'
                      : 'এই দৃশ্যের জন্য বাংলা ভয়েসওভার স্ক্রিপ্ট লিখুন...'
                  }
                  className="w-full rounded-lg bg-[#0F1623] border border-slate-800 px-3 py-2 text-xs text-white font-bangla"
                />
              </div>

              {formError && (
                <p className="text-xs text-rose-400 font-bangla">{formError}</p>
              )}

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors font-bangla cursor-pointer"
                >
                  {isEn ? 'Add Scene' : 'দৃশ্য যুক্ত করুন'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
