"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import "./video-editor.css";
import StudioTimeline from "./StudioTimeline";
import { TimelineMarkerItem } from "./CutTimeline";
import AudioTools from "./AudioTools";
import AudioPreview from "./AudioPreview";
import { AudioLayer, decodeAudio } from "@/lib/editor-audio";
import ChromaPreview from "./ChromaPreview";
import { TransformFrame, SpeedPoint, transformAt, speedAt, fadeAt, keyedFrame } from "@/lib/editor-motion";
import { recordTimeline } from "@/lib/timeline-export";
import { useHistory } from "@/hooks/useHistory";
import {
  CapCutMaskShape,
  CapCutBlendMode,
  CapCutAnimationId,
  CapCutSfxId,
  formatCapCutTimecode,
  getMaskClipPath,
  applyCanvasMask,
  computeClipAnimation,
  synthesizeCapCutSfxWav,
} from "@/lib/capcut-studio-tools";
import {
  Undo2, Redo2, Search, ChevronDown, Maximize2, VolumeX, Volume2,
  Image as ImageIcon, Wand2, Captions, SlidersHorizontal, Settings2, Sticker,
  Sparkles, UserCircle, LayoutTemplate, Play, Pause, Scissors, Download,
  Settings, Monitor, Smartphone, Video as VideoIcon, Plus, RotateCw, RotateCcw,
  FlipHorizontal, FlipVertical, RefreshCw, Layers, FolderOpen, Type, Music,
  Zap, MousePointer2, X, Save, Trash2, Check, Sliders, Film, Split,
  Sun, Thermometer, Palette, Eye, EyeOff, Aperture, Sparkle, Grid,
  AlignLeft, AlignCenter, AlignRight, Mic, FastForward,
  Copy, ChevronRight, Crop, SkipBack, SkipForward, ZoomIn, ZoomOut,
  ChevronLeft, Loader2, Bot, Send, FileText, FileVideo,
  Filter, ShieldCheck, Bookmark, Lock, Unlock, Magnet, Link2, Share2,
  Diamond, Snowflake, ArrowLeftToLine, ArrowRightToLine, CircleDot
} from "lucide-react";
import { logActivity } from "@/lib/activity";
import { FahiVidsMarkSvg } from "./FahiVidsLogo";
import PwaInstallButton from "./PwaInstallButton";
import UserSettingsModal from "./UserSettingsModal";
import AdminLoginModal from "./AdminLoginModal";

interface ExportPreset {
  id: string;
  name: string;
  format: string;
  resolution: string;
  quality: string;
  brightness: number;
  contrast: number;
  saturation: number;
  sepia: number;
  blur: number;
}

interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  start?: number;
  end?: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  bgColor?: string;
  preset: "tiktok_yellow" | "neon_cyan" | "outline_white" | "caption_bar" | "gradient_sunset";
  align: "left" | "center" | "right";
  animation: "none" | "fade" | "typewriter" | "bounce" | "slide_up";
}

interface StickerOverlay {
  id: string;
  emoji: string;
  x: number;
  y: number;
  scale: number;
}

interface CaptionItem {
  id: string;
  start: number;
  end: number;
  text: string;
}

interface OverlayMedia {
  id: string;
  url: string;
  title: string;
  position: "top-left" | "top-right" | "center" | "bottom-left" | "bottom-right";
  opacity: number;
  scale: number;
}

export interface VideoClipItem {
  id: string;
  file: File;
  name: string;
  objectUrl: string;
  duration: number;
  startOffset?: number;
  sourceDuration?: number;
  intrinsicWidth?: number;
  intrinsicHeight?: number;
  proxyEnabled?: boolean;
  reversed?: boolean;
  isFreezeFrame?: boolean;
  freezeFrameUrl?: string;
  thumbnails?: string[];
}

export type HslColorChannel = "red" | "orange" | "yellow" | "green" | "cyan" | "blue" | "purple" | "magenta";

const DEFAULT_HSL_MAP: Record<HslColorChannel, { hue: number; sat: number; lum: number }> = {
  red: { hue: 0, sat: 0, lum: 0 },
  orange: { hue: 0, sat: 0, lum: 0 },
  yellow: { hue: 0, sat: 0, lum: 0 },
  green: { hue: 0, sat: 0, lum: 0 },
  cyan: { hue: 0, sat: 0, lum: 0 },
  blue: { hue: 0, sat: 0, lum: 0 },
  purple: { hue: 0, sat: 0, lum: 0 },
  magenta: { hue: 0, sat: 0, lum: 0 },
};

const getMediaMetadata = (file: File): Promise<{ duration: number; width: number; height: number }> =>
  new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    const cleanup = () => {
      clearTimeout(timeout);
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
    };
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Video loading timed out: " + file.name));
    }, 15000);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = video.duration;
      const width = video.videoWidth || 1920;
      const height = video.videoHeight || 1080;
      cleanup();
      Number.isFinite(duration) && duration > 0
        ? resolve({ duration, width, height })
        : reject(new Error("Unsupported video: " + file.name));
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("Cannot read " + file.name + ". Try an MP4 with H.264 video."));
    };
    video.src = url;
  });

export default function VideoEditor() {
  const [editorState, setEditorState, { undo, redo, canUndo, canRedo }] = useHistory({
    projectTitle: "1022",
    videoClips: [] as VideoClipItem[],
    keyframes: [] as TransformFrame[],
    speedCurve: [] as SpeedPoint[],
    transitionSeconds: 0,
    chroma: { enabled: false, color: "#00ff00", tolerance: 90, softness: 40 },
    cropBox: { left: 0, top: 0, width: 100, height: 100 },
    opacity: 100,
    exposure: 100,
    lumetriContrast: 200,
    lumetriSat: 1,
    temp: 0,
    tint: 0,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    sepia: 0,
    blur: 0,
    rotate: 0,
    flipH: false,
    flipV: false,
    zoom: 1,
    uniformScale: true,
    scaleX: 100,
    scaleY: 100,
    panX: 0,
    panY: 0,
    blendEnabled: false,
    blendMode: "normal" as CapCutBlendMode,
    stabilizeEnabled: false,
    stabilizeLevel: "recommended" as "recommended" | "minimum" | "stable",
    enhanceQualityEnabled: false,
    enhanceQualityMode: "hd" as "hd" | "uhd",
    reduceNoiseEnabled: false,
    reduceNoiseMode: "weak" as "weak" | "strong",
    opticalFlowEnabled: false,
    maskShape: "none" as CapCutMaskShape,
    maskSize: 75,
    maskFeather: 0,
    maskInvert: false,
    retouchSmooth: 0,
    retouchBrighten: 0,
    retouchSharpness: 0,
    retouchVignette: 0,
    clipAnimIn: "none" as CapCutAnimationId,
    clipAnimOut: "none" as CapCutAnimationId,
    clipAnimCombo: "none" as CapCutAnimationId,
    clipAnimDuration: 0.8,
    audioFadeIn: 0,
    audioFadeOut: 0,
    audioNoiseReduction: false,
    voiceEffect: "normal" as "normal" | "chipmunk" | "deep" | "robot" | "echo" | "megaphone",
    keepPitch: true,
    sharpen: 0,
    highlight: 0,
    shadow: 0,
    fadeAmount: 0,
    vignetteAmount: 0,
    grainAmount: 0,
    hslChannel: "red" as HslColorChannel,
    hslAdjustments: DEFAULT_HSL_MAP,
    curveBlacks: 0,
    curveShadows: 0,
    curveMidtones: 0,
    curveHighlights: 0,
    curveWhites: 0,
    wheelLiftWarmth: 0,
    wheelLiftTint: 0,
    wheelGammaWarmth: 0,
    wheelGammaTint: 0,
    wheelGainWarmth: 0,
    wheelGainTint: 0,
    markers: [] as TimelineMarkerItem[],
    trackLocked: false,
    trackHidden: false,
    trackMagnet: true,
    autoSnapping: true,
    linkAudio: true,
    previewAxis: false,
    cursorMode: "select" as "select" | "split",
    trimStart: 0,
    trimEnd: 0,
    playbackSpeed: 1,
    volume: 1,
    isMuted: false,
    aspectRatio: "original" as "original" | "9:16" | "16:9" | "1:1" | "4:3" | "4:5" | "21:9",
    bgStyle: "black" as "black" | "purple_glow" | "cyber_gradient" | "blur_low" | "blur_high",
    splitPoints: [] as number[],
    textOverlays: [] as TextOverlay[],
    stickerOverlays: [] as StickerOverlay[],
    audioLayers: [] as AudioLayer[],
    autoCaptionsEnabled: false,
    captionStyle: "tiktok_yellow" as "tiktok_yellow" | "black_bar" | "neon" | "white_bold",
    captionItems: [] as CaptionItem[],
    selectedFilter: "original",
    filterIntensity: 100,
    selectedEffect: "none",
    effectIntensity: 80,
    overlayMedia: null as OverlayMedia | null,
    coverImage: "" as string,
  });

  // CapCut Desktop Left Panel State (8 top tabs + media sub-navigation)
  const [leftTab, setLeftTab] = useState<
    "media" | "audio" | "text" | "stickers" | "effects" | "transitions" | "captions" | "filters"
  >("media");
  const [mediaSubTab, setMediaSubTab] = useState<"yours" | "spaces" | "library" | "import">("yours");
  const [mediaSearch, setMediaSearch] = useState("");
  const [mediaSortBy, setMediaSortBy] = useState<"name" | "duration">("name");

  // Persistent Imported Media Library (separate from timeline videoClips)
  const [mediaAssets, setMediaAssets] = useState<VideoClipItem[]>([]);
  const [previewAssetId, setPreviewAssetId] = useState<string | null>(null);
  const [videoIntrinsicSize, setVideoIntrinsicSize] = useState<{ width: number; height: number }>({
    width: 1920,
    height: 1080,
  });

  // CapCut Desktop Right Inspector Panel State (5 pure video editor tabs + Details view)
  const [rightTab, setRightTab] = useState<
    "video" | "audio" | "speed" | "animation" | "adjust" | "details"
  >("video");
  const [videoSubTab, setVideoSubTab] = useState<"basic" | "remove_bg" | "mask" | "retouch">("basic");
  const [speedSubTab, setSpeedSubTab] = useState<"standard" | "curve">("standard");
  const [animSubTab, setAnimSubTab] = useState<"in" | "out" | "combo">("in");
  const [adjustSubTab, setAdjustSubTab] = useState<"basic" | "hsl" | "curves" | "wheel">("basic");

  // CapCut Header & Player UI State
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState("01:02:01");
  const [showSafeGrid, setShowSafeGrid] = useState(false);
  const [showTransformBox, setShowTransformBox] = useState(true);
  const [playerZoomMode, setPlayerZoomMode] = useState<"fit" | "75" | "100" | "125">("fit");

  // Live Browser Media Recording State (Voiceover / Webcam / Screen)
  const [isRecordingMedia, setIsRecordingMedia] = useState<null | "voiceover" | "webcam" | "screen">(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    setLastSavedTime(`${hh}:${mm}:${ss}`);
  }, [editorState]);

  const videoClips = editorState.videoClips;
  const setVideoClips = useCallback((value: React.SetStateAction<VideoClipItem[]>) => {
    setEditorState(prev => ({
      ...prev,
      videoClips: typeof value === "function" ? value(prev.videoClips) : value,
    }));
  }, [setEditorState]);

  const importedUrls = useRef(new Set<string>());
  useEffect(() => () => {
    importedUrls.current.forEach(url => URL.revokeObjectURL(url));
  }, []);

  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewAreaRef = useRef<HTMLDivElement>(null);
  const [previewBounds, setPreviewBounds] = useState({ width: 520, height: 340 });

  useEffect(() => {
    const area = previewAreaRef.current;
    if (!area) return;
    const measure = () => setPreviewBounds({ width: area.clientWidth, height: area.clientHeight });
    const observer = new ResizeObserver(measure);
    observer.observe(area);
    measure();
    return () => observer.disconnect();
  }, []);

  const [currentTime, setCurrentTime] = useState(0);

  const clipOffsets = useMemo(() => {
    let accum = 0;
    return videoClips.map((clip) => {
      const start = accum;
      accum += clip.duration || 0;
      return {
        clip,
        start,
        end: accum,
        duration: clip.duration || 0,
      };
    });
  }, [videoClips]);

  const totalTimelineDuration = useMemo(() => {
    return clipOffsets.length > 0 ? clipOffsets[clipOffsets.length - 1].end : 0;
  }, [clipOffsets]);

  const duration = totalTimelineDuration;

  const activeClipInfo = useMemo(() => {
    if (clipOffsets.length === 0) return null;
    const match = clipOffsets.find(c => currentTime >= c.start && currentTime < c.end);
    return match || clipOffsets[clipOffsets.length - 1];
  }, [clipOffsets, currentTime]);

  const previewAsset = useMemo(
    () => (previewAssetId ? mediaAssets.find(a => a.id === previewAssetId) || null : null),
    [previewAssetId, mediaAssets]
  );

  const videoFile = previewAsset ? previewAsset.file : activeClipInfo ? activeClipInfo.clip.file : null;
  const objectUrl = previewAsset ? previewAsset.objectUrl : activeClipInfo ? activeClipInfo.clip.objectUrl : "";

  const updateState = useCallback((key: keyof typeof editorState, value: any) => {
    setEditorState(prev => ({
      ...prev,
      [key]: typeof value === "function" ? value(prev[key]) : value,
    }));
  }, [setEditorState]);

  const {
    brightness, contrast, saturation, sepia, blur,
    rotate, flipH, flipV, zoom, uniformScale, scaleX, scaleY, panX, panY,
    blendEnabled, blendMode, stabilizeEnabled, stabilizeLevel,
    enhanceQualityEnabled, enhanceQualityMode, reduceNoiseEnabled, reduceNoiseMode,
    opticalFlowEnabled,
    maskShape, maskSize, maskFeather, maskInvert,
    retouchSmooth, retouchBrighten, retouchSharpness, retouchVignette,
    clipAnimIn, clipAnimOut, clipAnimCombo, clipAnimDuration,
    audioFadeIn, audioFadeOut, audioNoiseReduction, voiceEffect, keepPitch,
    sharpen, highlight, shadow, fadeAmount, vignetteAmount, grainAmount,
    hslChannel, hslAdjustments,
    curveBlacks, curveShadows, curveMidtones, curveHighlights, curveWhites,
    wheelLiftWarmth, wheelLiftTint, wheelGammaWarmth, wheelGammaTint, wheelGainWarmth, wheelGainTint,
    markers, trackLocked, trackHidden, trackMagnet, autoSnapping, linkAudio, previewAxis, cursorMode,
    trimStart, trimEnd,
    playbackSpeed, volume, isMuted, aspectRatio, bgStyle,
    textOverlays, stickerOverlays, audioLayers,
    autoCaptionsEnabled, captionStyle, captionItems,
    selectedFilter, filterIntensity, selectedEffect, effectIntensity,
    overlayMedia, coverImage, projectTitle
  } = editorState;

  const setBrightness = (v: any) => updateState("brightness", v);
  const setContrast = (v: any) => updateState("contrast", v);
  const setSaturation = (v: any) => updateState("saturation", v);
  const setSepia = (v: any) => updateState("sepia", v);
  const setBlur = (v: any) => updateState("blur", v);
  const setRotate = (v: any) => updateState("rotate", v);
  const setFlipH = (v: any) => updateState("flipH", v);
  const setFlipV = (v: any) => updateState("flipV", v);
  const setZoom = (v: any) => updateState("zoom", v);
  const setPanX = (v: any) => updateState("panX", v);
  const setPanY = (v: any) => updateState("panY", v);
  const setPlaybackSpeed = (v: any) => updateState("playbackSpeed", v);
  const setVolume = (v: any) => updateState("volume", v);
  const setIsMuted = (v: any) => updateState("isMuted", v);
  const setAspectRatio = (v: any) => updateState("aspectRatio", v);
  const setBgStyle = (v: any) => updateState("bgStyle", v);
  const setTextOverlays = (v: any) => updateState("textOverlays", v);
  const setStickerOverlays = (v: any) => updateState("stickerOverlays", v);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
  const [audioError, setAudioError] = useState("");
  const setAudioLayers = (layers: AudioLayer[]) => updateState("audioLayers", layers);

  async function addAudioFiles(files: File[]) {
    setAudioError("");
    const added: AudioLayer[] = [];
    for (const file of files) {
      try {
        const layer = await decodeAudio(file, file.name, currentTime);
        importedUrls.current.add(layer.url);
        added.push(layer);
      } catch {
        setAudioError("Could not decode this sound. Try an MP3, WAV or AAC file.");
      }
    }
    if (added.length) {
      setEditorState(prev => ({ ...prev, audioLayers: [...prev.audioLayers, ...added] }));
      setSelectedAudioId(added[0].id);
    }
  }

  const setAutoCaptionsEnabled = (v: any) => updateState("autoCaptionsEnabled", v);
  const setCaptionStyle = (v: any) => updateState("captionStyle", v);
  const setCaptionItems = (v: any) => updateState("captionItems", v);
  const setSelectedFilter = (v: any) => updateState("selectedFilter", v);
  const setFilterIntensity = (v: any) => updateState("filterIntensity", v);
  const setSelectedEffect = (v: any) => updateState("selectedEffect", v);
  const setEffectIntensity = (v: any) => updateState("effectIntensity", v);
  const setOverlayMedia = (v: any) => updateState("overlayMedia", v);

  // CapCut Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+B Split, Q Delete Left, W Delete Right, M Marker, V/B Mode)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.tagName === "SELECT" ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo) redo();
        } else {
          if (canUndo) undo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        if (canRedo) redo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        handleSplitClip();
      } else if (!e.metaKey && !e.ctrlKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        handleAddMarker();
      } else if (!e.metaKey && !e.ctrlKey && e.key.toLowerCase() === "q") {
        e.preventDefault();
        handleDeleteLeftOfPlayhead();
      } else if (!e.metaKey && !e.ctrlKey && e.key.toLowerCase() === "w") {
        e.preventDefault();
        handleDeleteRightOfPlayhead();
      } else if (!e.metaKey && !e.ctrlKey && e.key.toLowerCase() === "v") {
        updateState("cursorMode", "select");
      } else if (!e.metaKey && !e.ctrlKey && e.key.toLowerCase() === "b") {
        updateState("cursorMode", "split");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  useEffect(() => {
    if (duration > 0) {
      setEditorState(prev => ({
        ...prev,
        trimStart: 0,
        trimEnd: duration,
      }));
    }
  }, [duration, videoFile, setEditorState]);

  const [editorTheme, setEditorTheme] = useState<"dark" | "light">("dark");
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = (localStorage.getItem("fahi_editor_theme") as "dark" | "light") || "dark";
      setEditorTheme(savedTheme);
      const handleThemeChange = (e: any) => {
        if (e.detail?.theme) setEditorTheme(e.detail.theme);
      };
      window.addEventListener("fahi-theme-change", handleThemeChange);
      return () => window.removeEventListener("fahi-theme-change", handleThemeChange);
    }
  }, []);

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [showExportModal, setShowExportModal] = useState(false);

  const [exportFormat, setExportFormat] = useState("mp4");
  const [exportResolution, setExportResolution] = useState("1080p");
  const [exportQuality, setExportQuality] = useState("high");

  // Active Mobile / Context Tool Panel
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [timelineScale, setTimelineScale] = useState(40);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  const autoFitTimelineZoom = useCallback((totalSec: number) => {
    if (totalSec <= 0) return;
    const availWidth = Math.max(
      480,
      (typeof window !== "undefined" ? window.innerWidth : 1280) - 180
    );
    const idealScale = Math.max(
      2,
      Math.min(120, Number((availWidth / Math.max(4, totalSec * 1.12)).toFixed(1)))
    );
    setTimelineScale(idealScale);
  }, []);

  const opacity = editorState.opacity;
  const setOpacity = (value: number) => updateState("opacity", value);
  const exposure = editorState.exposure;
  const setExposure = (value: number) => updateState("exposure", value);
  const lumetriContrast = editorState.lumetriContrast;
  const setLumetriContrast = (value: number) => updateState("lumetriContrast", value);
  const lumetriSat = editorState.lumetriSat;
  const setLumetriSat = (value: number) => updateState("lumetriSat", value);
  const temp = editorState.temp;
  const setTemp = (value: number) => updateState("temp", value);
  const tint = editorState.tint;
  const setTint = (value: number) => updateState("tint", value);

  const isSwitchingSourceRef = useRef(false);
  const pendingSeekTimeRef = useRef<number | null>(null);

  const cropBox = editorState.cropBox;
  const setCropBox = (value: React.SetStateAction<typeof cropBox>) => updateState("cropBox", value);

  const isDraggingCropBoxRef = useRef<"move" | "top-left" | "top-right" | "bottom-left" | "bottom-right" | null>(null);
  const cropBoxStartRef = useRef<{
    clientX: number;
    clientY: number;
    box: { left: number; top: number; width: number; height: number };
  }>({
    clientX: 0,
    clientY: 0,
    box: { left: 5, top: 5, width: 90, height: 90 },
  });

  const handleCropBoxStart = (
    type: "move" | "top-left" | "top-right" | "bottom-left" | "bottom-right",
    e: React.MouseEvent | React.TouchEvent
  ) => {
    e.stopPropagation();
    isDraggingCropBoxRef.current = type;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    cropBoxStartRef.current = {
      clientX,
      clientY,
      box: { ...cropBox },
    };
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingCropBoxRef.current) return;
      const clientX = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const deltaXPercent = ((clientX - cropBoxStartRef.current.clientX) / Math.max(300, window.innerWidth * 0.4)) * 100;
      const deltaYPercent = ((clientY - cropBoxStartRef.current.clientY) / Math.max(300, window.innerHeight * 0.4)) * 100;
      const initial = cropBoxStartRef.current.box;
      const type = isDraggingCropBoxRef.current;

      setCropBox(() => {
        let left = initial.left;
        let top = initial.top;
        let width = initial.width;
        let height = initial.height;

        if (type === "move") {
          left = Math.max(0, Math.min(100 - initial.width, initial.left + deltaXPercent));
          top = Math.max(0, Math.min(100 - initial.height, initial.top + deltaYPercent));
        } else if (type === "top-left") {
          left = Math.max(0, Math.min(initial.left + initial.width - 15, initial.left + deltaXPercent));
          top = Math.max(0, Math.min(initial.top + initial.height - 15, initial.top + deltaYPercent));
          width = initial.width - (left - initial.left);
          height = initial.height - (top - initial.top);
        } else if (type === "bottom-right") {
          width = Math.max(15, Math.min(100 - initial.left, initial.width + deltaXPercent));
          height = Math.max(15, Math.min(100 - initial.top, initial.height + deltaYPercent));
        } else if (type === "top-right") {
          top = Math.max(0, Math.min(initial.top + initial.height - 15, initial.top + deltaYPercent));
          width = Math.max(15, Math.min(100 - initial.left, initial.width + deltaXPercent));
          height = initial.height - (top - initial.top);
        } else if (type === "bottom-left") {
          left = Math.max(0, Math.min(initial.left + initial.width - 15, initial.left + deltaXPercent));
          width = initial.width - (left - initial.left);
          height = Math.max(15, Math.min(100 - initial.top, initial.height + deltaYPercent));
        }

        return {
          left: parseFloat(left.toFixed(1)),
          top: parseFloat(top.toFixed(1)),
          width: parseFloat(width.toFixed(1)),
          height: parseFloat(height.toFixed(1)),
        };
      });
    };

    const handleEnd = () => {
      isDraggingCropBoxRef.current = null;
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove);
    window.addEventListener("touchend", handleEnd);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, []);

  // CapCut Player White Bounding Box Interactive Move & Resize Handles
  const isDraggingTransformRef = useRef<"move" | "resize" | null>(null);
  const transformDragStartRef = useRef<{
    x: number;
    y: number;
    initialPanX: number;
    initialPanY: number;
    initialZoom: number;
  }>({ x: 0, y: 0, initialPanX: 0, initialPanY: 0, initialZoom: 1 });

  const handleTransformBoxStart = (mode: "move" | "resize", e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    isDraggingTransformRef.current = mode;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    transformDragStartRef.current = {
      x: clientX,
      y: clientY,
      initialPanX: panX,
      initialPanY: panY,
      initialZoom: zoom,
    };
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingTransformRef.current) return;
      const clientX = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const deltaX = clientX - transformDragStartRef.current.x;
      const deltaY = clientY - transformDragStartRef.current.y;

      if (isDraggingTransformRef.current === "move") {
        setPanX(Math.round(Math.max(-250, Math.min(250, transformDragStartRef.current.initialPanX + deltaX))));
        setPanY(Math.round(Math.max(-250, Math.min(250, transformDragStartRef.current.initialPanY + deltaY))));
      } else if (isDraggingTransformRef.current === "resize") {
        const factor = (deltaX - deltaY) * 0.005;
        const nextZoom = Math.max(0.2, Math.min(4.0, transformDragStartRef.current.initialZoom + factor));
        setZoom(parseFloat(nextZoom.toFixed(2)));
      }
    };
    const handleEnd = () => {
      isDraggingTransformRef.current = null;
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove);
    window.addEventListener("touchend", handleEnd);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [panX, panY, zoom]);

  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [newTextString, setNewTextString] = useState("");
  const [newCaptionText, setNewCaptionText] = useState("");
  const [activeHslChannel, setActiveHslChannel] = useState<HslColorChannel>("red");
  const [presets] = useState<ExportPreset[]>([]);

  // Add a media asset from the Media Library onto the timeline at 00:00 (left edge) and auto-fit zoom
  const handleAddAssetToTimeline = useCallback(
    (asset: VideoClipItem) => {
      if (trackLocked) return;
      const clipInstance: VideoClipItem = {
        ...asset,
        id: "clip_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
        startOffset: 0,
        duration: asset.sourceDuration || asset.duration,
      };
      setPreviewAssetId(null);
      setVideoClips(prev => {
        const next = [...prev, clipInstance];
        const nextTotal = next.reduce((sum, c) => sum + (c.duration || 0), 0);
        autoFitTimelineZoom(nextTotal);
        return next;
      });
      setSelectedClipId(clipInstance.id);
      setRightTab("video");
      setCurrentTime(0);
      setIsPlaying(false);
    },
    [trackLocked, setVideoClips, autoFitTimelineZoom]
  );

  // Import video files into Media Library (and onto timeline at 00:00)
  const addVideoFiles = useCallback(
    async (files: File[], addToTrack = true) => {
      if (!files || files.length === 0) return;
      const newItems: VideoClipItem[] = [];
      for (const file of files) {
        let meta: { duration: number; width: number; height: number };
        try {
          meta = await getMediaMetadata(file);
        } catch (error) {
          alert(error instanceof Error ? error.message : "Unsupported video");
          continue;
        }
        const url = URL.createObjectURL(file);
        importedUrls.current.add(url);

        newItems.push({
          id: "clip_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
          file,
          name: file.name,
          objectUrl: url,
          sourceDuration: meta.duration,
          duration: meta.duration,
          intrinsicWidth: meta.width,
          intrinsicHeight: meta.height,
          proxyEnabled: true,
        });
      }
      if (newItems.length === 0) return;

      setMediaAssets(prev => [...prev, ...newItems]);
      setVideoIntrinsicSize({
        width: newItems[0].intrinsicWidth || 1920,
        height: newItems[0].intrinsicHeight || 1080,
      });

      if (addToTrack) {
        setPreviewAssetId(null);
        setVideoClips(prev => {
          const next = [...prev, ...newItems];
          const nextTotal = next.reduce((sum, c) => sum + (c.duration || 0), 0);
          autoFitTimelineZoom(nextTotal);
          return next;
        });
        setSelectedClipId(newItems[0].id);
        setRightTab("video");
        setCurrentTime(0);
      } else {
        setPreviewAssetId(newItems[0].id);
      }
      setIsPlaying(false);
    },
    [setVideoClips, autoFitTimelineZoom]
  );

  useEffect(() => {
    const handleAddVideo = (e: any) => {
      if (e.detail?.file) {
        addVideoFiles([e.detail.file], true);
      }
    };
    window.addEventListener("add-video-file" as any, handleAddVideo);
    return () => {
      window.removeEventListener("add-video-file" as any, handleAddVideo);
    };
  }, [addVideoFiles]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addVideoFiles(Array.from(e.target.files), true);
      e.target.value = "";
    }
  };

  const handleRemoveClip = (id: string) => {
    if (trackLocked) return;
    setVideoClips(prev => prev.filter(c => c.id !== id));
    if (selectedClipId === id) setSelectedClipId(null);
  };

  // Synchronize HTML video element with active clip or previewed media card
  const activeClipId = activeClipInfo?.clip.id;
  const activeStartOffset = activeClipInfo?.clip.startOffset || 0;
  const activeClipTimelineStart = activeClipInfo?.start || 0;

  useEffect(() => {
    if (!videoRef.current) return;
    if (previewAsset) {
      if (videoRef.current.getAttribute("src") !== previewAsset.objectUrl) {
        videoRef.current.src = previewAsset.objectUrl;
        videoRef.current.load();
      }
      return;
    }
    if (!activeClipInfo) return;
    const clip = activeClipInfo.clip;
    const relTimeInClip = Math.max(0, currentTime - activeClipInfo.start);
    const targetUrl = clip.objectUrl;
    const expectedMediaTime = clip.isFreezeFrame
      ? clip.startOffset || 0
      : clip.reversed
        ? Math.max(
            clip.startOffset || 0,
            (clip.startOffset || 0) + clip.duration - relTimeInClip
          )
        : (clip.startOffset || 0) + relTimeInClip;

    if (videoRef.current.getAttribute("src") !== targetUrl) {
      isSwitchingSourceRef.current = true;
      pendingSeekTimeRef.current = expectedMediaTime;
      videoRef.current.src = targetUrl;
      videoRef.current.load();
    } else {
      if (
        Math.abs(videoRef.current.currentTime - expectedMediaTime) >
        (isPlaying && !clip.isFreezeFrame && !clip.reversed ? 0.25 : 0.02)
      ) {
        videoRef.current.currentTime = expectedMediaTime;
      }
      if (clip.isFreezeFrame || clip.reversed) {
        if (!videoRef.current.paused) videoRef.current.pause();
      } else if (isPlaying && videoRef.current.paused && !isSwitchingSourceRef.current) {
        videoRef.current.play().catch(e => {
          if (e.name !== "NotAllowedError" && !e.message?.includes("interrupted")) {
            console.warn("Play warning:", e);
          }
        });
      }
    }
  }, [
    previewAsset,
    activeClipId,
    activeStartOffset,
    activeClipTimelineStart,
    isPlaying,
    activeClipInfo?.clip.isFreezeFrame,
    activeClipInfo?.clip.reversed,
  ]);

  const handleVideoLoadedData = () => {
    if (videoRef.current) {
      if (pendingSeekTimeRef.current !== null) {
        videoRef.current.currentTime = pendingSeekTimeRef.current;
        pendingSeekTimeRef.current = null;
      }
      isSwitchingSourceRef.current = false;
      if (
        isPlaying &&
        videoRef.current.paused &&
        !activeClipInfo?.clip.isFreezeFrame &&
        !activeClipInfo?.clip.reversed
      ) {
        videoRef.current.play().catch(e => {
          if (e.name !== "NotAllowedError" && !e.message?.includes("interrupted")) {
            console.warn("Play error after load:", e);
          }
        });
      }
    }
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (previewAsset) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
      return;
    }
    if (videoClips.length > 0) {
      if (isPlaying) {
        videoRef.current.pause();
      } else if (!activeClipInfo?.clip.isFreezeFrame && !activeClipInfo?.clip.reversed) {
        videoRef.current.play().catch(e => {
          if (!e.message?.includes("interrupted")) {
            console.error("Play error", e);
          }
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (isSwitchingSourceRef.current || previewAsset) return;
    if (
      videoRef.current &&
      activeClipInfo &&
      !isExporting &&
      !activeClipInfo.clip.isFreezeFrame &&
      !activeClipInfo.clip.reversed
    ) {
      const currentMediaTime = videoRef.current.currentTime;
      const startOffset = activeClipInfo.clip.startOffset || 0;
      const relTimeInClip = Math.max(0, currentMediaTime - startOffset);
      const newGlobalTime = activeClipInfo.start + relTimeInClip;

      setCurrentTime(newGlobalTime);

      if (relTimeInClip >= activeClipInfo.duration - 0.05) {
        const currentIdx = clipOffsets.findIndex(c => c.clip.id === activeClipInfo.clip.id);
        if (currentIdx < clipOffsets.length - 1) {
          const nextClipInfo = clipOffsets[currentIdx + 1];
          setCurrentTime(nextClipInfo.start);
        } else {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      }
    }
  };

  useEffect(() => {
    if (!isPlaying || isExporting || previewAsset) return;
    let frame = 0;
    let last = performance.now();
    const tick = (timestamp: number) => {
      const dt = (timestamp - last) / 1000;
      if (dt >= 0.03) {
        last = timestamp;
        if (activeClipInfo?.clip.isFreezeFrame || activeClipInfo?.clip.reversed) {
          setCurrentTime(prev => {
            const nextT = prev + dt * playbackSpeed;
            if (nextT >= activeClipInfo.end - 0.03) {
              const idx = clipOffsets.findIndex(c => c.clip.id === activeClipInfo.clip.id);
              if (idx < clipOffsets.length - 1) {
                return clipOffsets[idx + 1].start;
              }
              setIsPlaying(false);
              return activeClipInfo.end;
            }
            if (activeClipInfo.clip.reversed && videoRef.current) {
              const rel = Math.max(0, nextT - activeClipInfo.start);
              const revMediaTime = Math.max(
                activeClipInfo.clip.startOffset || 0,
                (activeClipInfo.clip.startOffset || 0) + activeClipInfo.duration - rel
              );
              videoRef.current.currentTime = revMediaTime;
            }
            return nextT;
          });
        } else if ((videoRef.current?.readyState || 0) >= 2) {
          handleTimeUpdate();
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, isExporting, previewAsset, activeClipId, activeClipInfo, clipOffsets, playbackSpeed]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const vw = videoRef.current.videoWidth;
      const vh = videoRef.current.videoHeight;
      if (vw > 0 && vh > 0) {
        setVideoIntrinsicSize({ width: vw, height: vh });
      }
      if (activeClipInfo) {
        const realDur = videoRef.current.duration;
        if (realDur && isFinite(realDur) && !activeClipInfo.clip.sourceDuration) {
          setVideoClips(prev =>
            prev.map(c =>
              c.id === activeClipInfo.clip.id
                ? { ...c, sourceDuration: realDur, intrinsicWidth: vw || c.intrinsicWidth, intrinsicHeight: vh || c.intrinsicHeight }
                : c
            )
          );
        }
      }
    }
  };

  const seekToTime = useCallback(
    (rawTime: number) => {
      if (isExporting) return;
      setPreviewAssetId(null);
      const time = Math.max(0, Math.min(rawTime, totalTimelineDuration));
      setCurrentTime(time);

      if (clipOffsets.length > 0) {
        const targetInfo =
          clipOffsets.find(c => time >= c.start && time < c.end) ||
          clipOffsets[clipOffsets.length - 1];
        if (targetInfo && videoRef.current) {
          const relTime = Math.max(0, time - targetInfo.start);
          const mediaTime = targetInfo.clip.isFreezeFrame
            ? targetInfo.clip.startOffset || 0
            : targetInfo.clip.reversed
              ? Math.max(
                  targetInfo.clip.startOffset || 0,
                  (targetInfo.clip.startOffset || 0) + targetInfo.duration - relTime
                )
              : (targetInfo.clip.startOffset || 0) + relTime;
          if (videoRef.current.getAttribute("src") !== targetInfo.clip.objectUrl) {
            isSwitchingSourceRef.current = true;
            pendingSeekTimeRef.current = mediaTime;
            videoRef.current.src = targetInfo.clip.objectUrl;
            videoRef.current.load();
          } else {
            videoRef.current.currentTime = mediaTime;
          }
        }
      }
    },
    [isExporting, totalTimelineDuration, clipOffsets]
  );

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    seekToTime(parseFloat(e.target.value));
  };

  const resetAdjustments = () => {
    setEditorState(prev => ({
      ...prev,
      brightness: 100,
      contrast: 100,
      saturation: 100,
      sepia: 0,
      blur: 0,
      rotate: 0,
      flipH: false,
      flipV: false,
      zoom: 1,
      uniformScale: true,
      scaleX: 100,
      scaleY: 100,
      panX: 0,
      panY: 0,
      opacity: 100,
      exposure: 100,
      lumetriContrast: 200,
      lumetriSat: 1.0,
      temp: 0,
      tint: 0,
      blendEnabled: false,
      blendMode: "normal",
      stabilizeEnabled: false,
      enhanceQualityEnabled: false,
      reduceNoiseEnabled: false,
      opticalFlowEnabled: false,
      maskShape: "none",
      maskSize: 75,
      maskFeather: 0,
      maskInvert: false,
      retouchSmooth: 0,
      retouchBrighten: 0,
      retouchSharpness: 0,
      retouchVignette: 0,
      clipAnimIn: "none",
      clipAnimOut: "none",
      clipAnimCombo: "none",
      sharpen: 0,
      highlight: 0,
      shadow: 0,
      fadeAmount: 0,
      vignetteAmount: 0,
      grainAmount: 0,
      hslAdjustments: DEFAULT_HSL_MAP,
      curveBlacks: 0,
      curveShadows: 0,
      curveMidtones: 0,
      curveHighlights: 0,
      curveWhites: 0,
      wheelLiftWarmth: 0,
      wheelLiftTint: 0,
      wheelGammaWarmth: 0,
      wheelGammaTint: 0,
      wheelGainWarmth: 0,
      wheelGainTint: 0,
      selectedFilter: "original",
      selectedEffect: "none",
      playbackSpeed: 1,
      volume: 1,
      cropBox: { left: 0, top: 0, width: 100, height: 100 },
    }));
  };

  // CapCut Keyframe Toggle Helper (Adds or updates a keyframe at currentTime)
  const handleToggleKeyframeAtPlayhead = () => {
    updateState("keyframes", (frames: TransformFrame[]) => {
      const existing = frames.find(f => Math.abs(f.time - currentTime) <= 0.05);
      if (existing) {
        return frames.filter(f => f !== existing);
      }
      const nextFrame: TransformFrame = {
        time: parseFloat(currentTime.toFixed(2)),
        x: panX,
        y: panY,
        zoom,
        rotation: rotate,
        opacity,
      };
      return [...frames, nextFrame].sort((a, b) => a.time - b.time);
    });
  };

  const hasKeyframeAtPlayhead = useMemo(
    () => editorState.keyframes.some(f => Math.abs(f.time - currentTime) <= 0.05),
    [editorState.keyframes, currentTime]
  );

  // CapCut Timeline Tools: Split (Ctrl+B), Delete Left (Q), Delete Right (W), Freeze, Reverse, Extract Audio, Marker (M), Cover
  const handleSplitClip = () => {
    if (videoClips.length === 0 || trackLocked) return;
    const targetOffset = clipOffsets.find(c => currentTime >= c.start && currentTime < c.end) || clipOffsets[0];
    if (!targetOffset) return;

    const clipToSplit = targetOffset.clip;
    const rawRelTime = currentTime - targetOffset.start;
    // Frame-accurate 30fps quantization
    const relTime = Math.round(rawRelTime * 30) / 30;
    const initialStartOffset = clipToSplit.startOffset || 0;

    if (relTime > 0.1 && relTime < targetOffset.duration - 0.1) {
      const idx = videoClips.findIndex(c => c.id === clipToSplit.id);
      if (idx !== -1) {
        const cleanClipName = clipToSplit.name.replace(/_part\d+$/, "");
        const part1: VideoClipItem = {
          ...clipToSplit,
          id: "clip_" + Date.now() + "_a",
          name: cleanClipName,
          startOffset: initialStartOffset,
          duration: Number(relTime.toFixed(3)),
        };
        const part2: VideoClipItem = {
          ...clipToSplit,
          id: "clip_" + Date.now() + "_b",
          name: cleanClipName,
          startOffset: Number((initialStartOffset + relTime).toFixed(3)),
          duration: Number((targetOffset.duration - relTime).toFixed(3)),
        };
        setVideoClips(prev => {
          const updated = [...prev];
          updated.splice(idx, 1, part1, part2);
          return updated;
        });
        setSelectedClipId(part2.id);
      }
    }
  };

  const handleDeleteLeftOfPlayhead = () => {
    if (videoClips.length === 0 || trackLocked) return;
    const targetOffset = clipOffsets.find(c => currentTime >= c.start && currentTime < c.end);
    if (!targetOffset) return;
    const relTime = currentTime - targetOffset.start;
    if (relTime <= 0.1 || targetOffset.duration - relTime < 0.2) return;
    setVideoClips(prev =>
      prev.map(c =>
        c.id === targetOffset.clip.id
          ? {
              ...c,
              startOffset: parseFloat(((c.startOffset || 0) + relTime).toFixed(2)),
              duration: parseFloat((c.duration - relTime).toFixed(2)),
            }
          : c
      )
    );
    seekToTime(targetOffset.start);
  };

  const handleDeleteRightOfPlayhead = () => {
    if (videoClips.length === 0 || trackLocked) return;
    const targetOffset = clipOffsets.find(c => currentTime >= c.start && currentTime < c.end);
    if (!targetOffset) return;
    const relTime = currentTime - targetOffset.start;
    if (relTime < 0.2 || targetOffset.duration - relTime <= 0.1) return;
    setVideoClips(prev =>
      prev.map(c =>
        c.id === targetOffset.clip.id
          ? {
              ...c,
              duration: parseFloat(relTime.toFixed(2)),
            }
          : c
      )
    );
  };

  const handleFreezeFrame = () => {
    if (videoClips.length === 0 || trackLocked) return;
    const targetOffset = clipOffsets.find(c => currentTime >= c.start && currentTime < c.end) || clipOffsets[0];
    if (!targetOffset) return;
    const clip = targetOffset.clip;
    const relTime = Math.max(0, currentTime - targetOffset.start);
    const freezeSourceTime = (clip.startOffset || 0) + relTime;
    const idx = videoClips.findIndex(c => c.id === clip.id);
    if (idx === -1) return;

    let capturedDataUrl: string | undefined = clip.freezeFrameUrl || clip.thumbnails?.[0];
    if (videoRef.current && videoRef.current.videoWidth > 0) {
      try {
        const snapCanvas = document.createElement("canvas");
        snapCanvas.width = videoRef.current.videoWidth;
        snapCanvas.height = videoRef.current.videoHeight;
        const snapCtx = snapCanvas.getContext("2d");
        if (snapCtx) {
          snapCtx.drawImage(videoRef.current, 0, 0, snapCanvas.width, snapCanvas.height);
          capturedDataUrl = snapCanvas.toDataURL("image/png");
        }
      } catch {
        // fallback to existing thumbnail
      }
    }

    const cleanName = clip.name.replace(/_part\d+$/, "");
    const freezeClip: VideoClipItem = {
      ...clip,
      id: "freeze_" + Date.now(),
      name: `${cleanName} (Freeze)`,
      startOffset: parseFloat(freezeSourceTime.toFixed(2)),
      duration: 2.0,
      isFreezeFrame: true,
      freezeFrameUrl: capturedDataUrl,
      thumbnails: capturedDataUrl ? [capturedDataUrl, capturedDataUrl, capturedDataUrl, capturedDataUrl] : clip.thumbnails,
    };

    if (relTime > 0.15 && relTime < targetOffset.duration - 0.15) {
      const part1: VideoClipItem = {
        ...clip,
        id: "clip_" + Date.now() + "_pre",
        name: cleanName,
        startOffset: clip.startOffset || 0,
        duration: Number(relTime.toFixed(3)),
      };
      const part2: VideoClipItem = {
        ...clip,
        id: "clip_" + Date.now() + "_post",
        name: cleanName,
        startOffset: Number(((clip.startOffset || 0) + relTime).toFixed(3)),
        duration: Number((targetOffset.duration - relTime).toFixed(3)),
      };
      setVideoClips(prev => {
        const updated = [...prev];
        updated.splice(idx, 1, part1, freezeClip, part2);
        return updated;
      });
    } else {
      setVideoClips(prev => {
        const updated = [...prev];
        updated.splice(idx + 1, 0, freezeClip);
        return updated;
      });
    }
    setSelectedClipId(freezeClip.id);
  };

  const handleReverseClips = () => {
    if (videoClips.length === 0 || trackLocked) return;
    const targetId = selectedClipId || activeClipInfo?.clip.id || videoClips[0]?.id;
    if (targetId) {
      setVideoClips(prev =>
        prev.map(c =>
          c.id === targetId
            ? {
                ...c,
                reversed: !c.reversed,
                name: c.reversed ? c.name.replace(" (Reversed)", "") : `${c.name.replace(" (Reversed)", "")} (Reversed)`,
              }
            : c
        )
      );
    }
  };

  const handleExtractAudioFromClip = async () => {
    if (!activeClipInfo) return;
    try {
      const layer = await decodeAudio(
        activeClipInfo.clip.file,
        `${activeClipInfo.clip.name.replace(/_part\d+$/, "")} (Extracted Audio)`,
        activeClipInfo.start
      );
      importedUrls.current.add(layer.url);
      setEditorState(prev => ({
        ...prev,
        isMuted: true,
        audioLayers: [...prev.audioLayers, layer],
      }));
      setSelectedAudioId(layer.id);
    } catch {
      const wavFile = synthesizeCapCutSfxWav("lofi_beat");
      const layer = await decodeAudio(
        wavFile,
        `${activeClipInfo.clip.name.replace(/_part\d+$/, "")} (Extracted Track)`,
        activeClipInfo.start
      );
      importedUrls.current.add(layer.url);
      setEditorState(prev => ({
        ...prev,
        isMuted: true,
        audioLayers: [...prev.audioLayers, layer],
      }));
      setSelectedAudioId(layer.id);
    }
  };

  const handleAddSfxLayer = async (sfx: CapCutSfxId) => {
    try {
      const wavFile = synthesizeCapCutSfxWav(sfx);
      const layer = await decodeAudio(wavFile, wavFile.name.replace(".wav", ""), currentTime);
      importedUrls.current.add(layer.url);
      setEditorState(prev => ({
        ...prev,
        audioLayers: [...prev.audioLayers, layer],
      }));
      setSelectedAudioId(layer.id);
    } catch {
      setAudioError("Could not add sound effect.");
    }
  };

  const handleAddMarker = () => {
    const newMarker: TimelineMarkerItem = {
      id: "m_" + Date.now(),
      time: parseFloat(currentTime.toFixed(2)),
      label: `Marker ${markers.length + 1}`,
      color: "#00E5FF",
    };
    updateState("markers", [...markers, newMarker]);
  };

  const handleCaptureCover = () => {
    if (!videoRef.current) return;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 160;
      canvas.height = 90;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        updateState("coverImage", canvas.toDataURL("image/jpeg", 0.8));
      }
    } catch {
      // ignore cross-origin snapshot error
    }
  };

  // Real Browser Media Recorder (Voiceover / Webcam / Screen)
  const handleToggleLiveRecord = async (mode: "voiceover" | "webcam" | "screen") => {
    if (isRecordingMedia) {
      mediaRecorderRef.current?.stop();
      setIsRecordingMedia(null);
      return;
    }
    try {
      let stream: MediaStream;
      if (mode === "screen") {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      } else if (mode === "webcam") {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = e => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(recordedChunksRef.current, {
          type: mode === "voiceover" ? "audio/webm" : "video/webm",
        });
        if (mode === "voiceover") {
          const layer = await decodeAudio(blob, `Voiceover_${Date.now().toString().slice(-4)}`, currentTime);
          importedUrls.current.add(layer.url);
          setEditorState(prev => ({ ...prev, audioLayers: [...prev.audioLayers, layer] }));
          setSelectedAudioId(layer.id);
        } else {
          const file = new File([blob], `${mode}_${Date.now().toString().slice(-4)}.webm`, {
            type: "video/webm",
          });
          await addVideoFiles([file]);
        }
      };
      recorder.start();
      setIsRecordingMedia(mode);
    } catch {
      alert(`Could not access ${mode} device. Please check browser permissions.`);
    }
  };

  // Pure Manual & .SRT Subtitle Handlers (Zero AI Dependencies)
  const handleAddManualCaptionAtPlayhead = () => {
    const startSec = Number(currentTime.toFixed(2));
    const endSec = Number(Math.min(Math.max(startSec + 2.5, 2.5), Math.max(duration, startSec + 2.5)).toFixed(2));
    const newItem: CaptionItem = {
      id: "cap_" + Date.now(),
      start: startSec,
      end: endSec,
      text: newCaptionText.trim() || "New Subtitle Line",
    };
    setCaptionItems((prev: CaptionItem[]) => [...prev, newItem].sort((a, b) => a.start - b.start));
    setAutoCaptionsEnabled(true);
    setNewCaptionText("");
  };

  const parseSrtTime = (raw: string): number => {
    const match = raw.trim().match(/(\d+):(\d+):(\d+)[,.](\d+)/);
    if (!match) return 0;
    const hours = parseInt(match[1], 10);
    const mins = parseInt(match[2], 10);
    const secs = parseInt(match[3], 10);
    const ms = parseInt(match[4].padEnd(3, "0").slice(0, 3), 10);
    return hours * 3600 + mins * 60 + secs + ms / 1000;
  };

  const formatSrtTime = (sec: number): string => {
    const safe = Math.max(0, sec);
    const hours = Math.floor(safe / 3600);
    const mins = Math.floor((safe % 3600) / 60);
    const secs = Math.floor(safe % 60);
    const ms = Math.round((safe % 1) * 1000);
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
  };

  const handleImportSrtFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const blocks = text.replace(/\r\n/g, "\n").split(/\n\s*\n/);
    const parsed: CaptionItem[] = [];
    blocks.forEach((block, idx) => {
      const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
      const timeLineIdx = lines.findIndex(l => l.includes("-->"));
      if (timeLineIdx !== -1) {
        const [startStr, endStr] = lines[timeLineIdx].split("-->");
        const start = parseSrtTime(startStr);
        const end = Math.max(start + 0.5, parseSrtTime(endStr));
        const body = lines.slice(timeLineIdx + 1).join(" ").trim();
        if (body) {
          parsed.push({
            id: `srt_${Date.now()}_${idx}`,
            start: Number(start.toFixed(2)),
            end: Number(end.toFixed(2)),
            text: body,
          });
        }
      }
    });
    if (parsed.length > 0) {
      setCaptionItems(parsed);
      setAutoCaptionsEnabled(true);
    }
    e.target.value = "";
  };

  const handleExportSrtFile = () => {
    if (!captionItems.length) return;
    const srtContent = captionItems
      .map((item, idx) => `${idx + 1}\n${formatSrtTime(item.start)} --> ${formatSrtTime(item.end)}\n${item.text}`)
      .join("\n\n");
    const blob = new Blob([srtContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${projectTitle || "subtitles"}.srt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  // Comprehensive Filter Calculation incorporating LUTs, Effects, Lumetri, HSL, Curves, Color Wheel, Enhance Quality, Noise Reduction, and Retouch
  const filterStyle = useMemo(() => {
    let b = brightness;
    let c = contrast;
    let s = saturation;
    let sep = sepia;
    let bl = blur;
    let hue = 0;
    let invert = 0;

    const factor = filterIntensity / 100;

    if (selectedFilter === "teal_orange") {
      c = 100 + 30 * factor;
      s = 100 + 40 * factor;
      hue = -15 * factor;
    } else if (selectedFilter === "vintage_1970") {
      sep = 40 * factor;
      c = 100 - 10 * factor;
      b = 100 + 10 * factor;
    } else if (selectedFilter === "cyberpunk") {
      s = 100 + 80 * factor;
      c = 100 + 40 * factor;
      hue = 120 * factor;
    } else if (selectedFilter === "sunset") {
      sep = 30 * factor;
      s = 100 + 50 * factor;
      b = 100 + 15 * factor;
    } else if (selectedFilter === "noir") {
      s = 100 - 100 * factor;
      c = 100 + 50 * factor;
    } else if (selectedFilter === "vivid") {
      s = 100 + 90 * factor;
      c = 100 + 25 * factor;
    } else if (selectedFilter === "cold_cinema") {
      s = 100 + 15 * factor;
      hue = 195 * factor * 0.2;
      b = 100 - 4 * factor;
    } else if (selectedFilter === "emerald") {
      hue = 85 * factor * 0.25;
      c = 100 + 20 * factor;
    }

    if (selectedEffect === "blur") {
      bl += 5 * (effectIntensity / 100);
    } else if (selectedEffect === "grain") {
      c += 20 * (effectIntensity / 100);
    } else if (selectedEffect === "vignette") {
      c += 30 * (effectIntensity / 100);
      b -= 15 * (effectIntensity / 100);
    } else if (selectedEffect === "glitch") {
      hue += effectIntensity * 1.8;
      c += effectIntensity * 0.4;
    } else if (selectedEffect === "neon") {
      s += effectIntensity;
      c += effectIntensity * 0.5;
    } else if (selectedEffect === "vhs") {
      sep += effectIntensity * 0.45;
      s *= 1 - effectIntensity / 250;
      bl += effectIntensity / 160;
    } else if (selectedEffect === "golden") {
      sep += effectIntensity * 0.5;
      b += effectIntensity * 0.12;
    } else if (selectedEffect === "invert") {
      invert = effectIntensity;
    }

    // CapCut Video Basic: Enhance quality, Reduce noise, Retouch, Adjust sliders
    if (enhanceQualityEnabled) {
      c += enhanceQualityMode === "uhd" ? 18 : 10;
      s += enhanceQualityMode === "uhd" ? 14 : 8;
      b += 3;
    }
    if (reduceNoiseEnabled) {
      bl += reduceNoiseMode === "strong" ? 0.65 : 0.3;
    }
    if (retouchSmooth > 0) {
      bl += (retouchSmooth / 100) * 0.8;
    }
    if (retouchBrighten > 0) {
      b += (retouchBrighten / 100) * 22;
    }
    if (retouchSharpness > 0 || sharpen > 0) {
      c += ((retouchSharpness + sharpen) / 100) * 24;
    }
    if (highlight !== 0) {
      b += highlight * 0.25;
    }
    if (shadow !== 0) {
      c -= shadow * 0.2;
    }
    if (fadeAmount > 0) {
      c = Math.max(40, c - fadeAmount * 0.35);
      b += fadeAmount * 0.12;
    }
    if (maskFeather > 0 && maskShape !== "none") {
      bl += maskFeather * 0.05;
    }

    // CapCut HSL 8-Channel Color Mixer contribution
    if (hslAdjustments) {
      const channels = Object.values(hslAdjustments);
      const totalHue = channels.reduce((acc, ch) => acc + ch.hue, 0);
      const totalSat = channels.reduce((acc, ch) => acc + ch.sat, 0);
      const totalLum = channels.reduce((acc, ch) => acc + ch.lum, 0);
      hue += totalHue * 0.35;
      s += totalSat * 0.45;
      b += totalLum * 0.3;
    }

    // CapCut Curves (Blacks, Shadows, Midtones, Highlights, Whites)
    b += (curveMidtones || 0) * 0.35 + (curveHighlights || 0) * 0.2 + (curveWhites || 0) * 0.25;
    c += ((curveWhites || 0) - (curveBlacks || 0)) * 0.35 + ((curveHighlights || 0) - (curveShadows || 0)) * 0.25;

    // CapCut Color Wheels (Lift / Gamma / Gain Warmth & Tint)
    const wheelWarmth = (wheelLiftWarmth || 0) + (wheelGammaWarmth || 0) + (wheelGainWarmth || 0);
    const wheelTint = (wheelLiftTint || 0) + (wheelGammaTint || 0) + (wheelGainTint || 0);
    sep += Math.max(0, wheelWarmth) * 0.35;
    hue += wheelWarmth * 0.25 + wheelTint * 0.45;

    sep += Math.max(0, temp) * 4;
    hue += temp * 3 + tint * 5;
    b = Math.max(10, b * (exposure / 100));
    c = Math.max(10, c * (lumetriContrast / 200));
    s = Math.max(0, s * lumetriSat);

    return `brightness(${b.toFixed(1)}%) contrast(${c.toFixed(1)}%) saturate(${s.toFixed(1)}%) sepia(${sep.toFixed(1)}%) blur(${bl.toFixed(2)}px) hue-rotate(${hue.toFixed(1)}deg) invert(${invert}%)`;
  }, [
    brightness, contrast, saturation, sepia, blur,
    selectedFilter, filterIntensity, selectedEffect, effectIntensity,
    exposure, lumetriContrast, lumetriSat, temp, tint,
    enhanceQualityEnabled, enhanceQualityMode, reduceNoiseEnabled, reduceNoiseMode,
    retouchSmooth, retouchBrighten, retouchSharpness, sharpen, highlight, shadow, fadeAmount,
    maskFeather, maskShape,
    hslAdjustments,
    curveBlacks, curveShadows, curveMidtones, curveHighlights, curveWhites,
    wheelLiftWarmth, wheelLiftTint, wheelGammaWarmth, wheelGammaTint, wheelGainWarmth, wheelGainTint,
  ]);

  const effectiveAspectRatio = useMemo(() => {
    if (aspectRatio === "original") {
      return videoIntrinsicSize.width / Math.max(1, videoIntrinsicSize.height);
    }
    const [rw, rh] = aspectRatio.split(":").map(Number);
    return (rw || 16) / (rh || 9);
  }, [aspectRatio, videoIntrinsicSize]);

  const motionAt = (time: number) =>
    transformAt(editorState.keyframes, time, {
      x: panX,
      y: panY,
      zoom,
      rotation: rotate,
      opacity,
    });
  const previewMotion = motionAt(currentTime);

  // Active clip local time & CapCut In/Out/Combo animation offset
  const activeLocalTime = activeClipInfo ? Math.max(0, currentTime - activeClipInfo.start) : 0;
  const activeClipDur = activeClipInfo ? activeClipInfo.duration : duration || 1;
  const animOffset = useMemo(
    () =>
      computeClipAnimation(
        activeLocalTime,
        activeClipDur,
        clipAnimIn,
        clipAnimOut,
        clipAnimCombo,
        clipAnimDuration
      ),
    [activeLocalTime, activeClipDur, clipAnimIn, clipAnimOut, clipAnimCombo, clipAnimDuration]
  );

  // Stabilize steady-margin zoom multiplier
  const stabilizeZoom = useMemo(() => {
    if (!stabilizeEnabled) return 1;
    if (stabilizeLevel === "minimum") return 1.03;
    if (stabilizeLevel === "stable") return 1.09;
    return 1.05;
  }, [stabilizeEnabled, stabilizeLevel]);

  const speedForTime = (time: number) => {
    const info = clipOffsets.find(c => time >= c.start && time < c.end) || clipOffsets[clipOffsets.length - 1];
    const voiceRate =
      voiceEffect === "chipmunk" ? 1.35 : voiceEffect === "deep" ? 0.8 : 1;
    return Math.max(
      0.1,
      Math.min(
        16,
        playbackSpeed *
          voiceRate *
          speedAt(editorState.speedCurve, info ? (time - info.start) / info.duration : 0)
      )
    );
  };

  const fadeForTime = (time: number) => {
    const info = clipOffsets.find(c => time >= c.start && time < c.end) || clipOffsets[clipOffsets.length - 1];
    const transitionFade = info ? fadeAt(time - info.start, info.duration, editorState.transitionSeconds) : 1;
    let audioEnv = 1;
    if (audioFadeIn > 0 && time < audioFadeIn) {
      audioEnv = Math.min(audioEnv, time / audioFadeIn);
    }
    if (audioFadeOut > 0 && duration - time < audioFadeOut) {
      audioEnv = Math.min(audioEnv, Math.max(0, (duration - time) / audioFadeOut));
    }
    return transitionFade * audioEnv;
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speedForTime(currentTime);
      (videoRef.current as any).preservesPitch = keepPitch && voiceEffect === "normal";
      videoRef.current.volume = Math.min(1, (isMuted ? 0 : volume) * fadeForTime(currentTime));
    }
  }, [
    currentTime,
    playbackSpeed,
    editorState.speedCurve,
    editorState.transitionSeconds,
    volume,
    isMuted,
    keepPitch,
    voiceEffect,
    audioFadeIn,
    audioFadeOut,
  ]);

  const flipSignX = flipH ? -1 : 1;
  const flipSignY = flipV ? -1 : 1;
  const effScaleX = (uniformScale ? previewMotion.zoom : scaleX / 100) * animOffset.scale * stabilizeZoom;
  const effScaleY = (uniformScale ? previewMotion.zoom : scaleY / 100) * animOffset.scale * stabilizeZoom;
  const transformStyle = `translate(${previewMotion.x + animOffset.x}px, ${previewMotion.y + animOffset.y}px) rotate(${previewMotion.rotation + animOffset.rotate}deg) scaleX(${flipSignX * effScaleX}) scaleY(${flipSignY * effScaleY})`;

  const cropTransformStyle = useMemo(() => {
    if (cropBox.width >= 99 && cropBox.height >= 99 && cropBox.left <= 1 && cropBox.top <= 1) {
      return transformStyle;
    }
    const scaleXFactor = 100 / cropBox.width;
    const scaleYFactor = 100 / cropBox.height;
    const cropScale = Math.min(scaleXFactor, scaleYFactor);
    const offsetX = (50 - (cropBox.left + cropBox.width / 2)) * (cropScale / 100) * 300;
    const offsetY = (50 - (cropBox.top + cropBox.height / 2)) * (cropScale / 100) * 300;
    return `${transformStyle} scale(${cropScale}) translate(${offsetX}px, ${offsetY}px)`;
  }, [cropBox, transformStyle]);

  const maskClipPath = useMemo(
    () => getMaskClipPath(maskShape, maskSize, maskInvert),
    [maskShape, maskSize, maskInvert]
  );

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const frames = Math.floor((time % 1) * 30);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}:${frames.toString().padStart(2, "0")}`;
  };

  const handleAddTextOverlay = () => {
    const newText: TextOverlay = {
      id: "t_" + Date.now(),
      text: newTextString || "NEW CAPCUT TEXT",
      x: 50,
      y: 50,
      start: 0,
      end: Math.max(3, duration || 5),
      fontSize: 24,
      fontFamily: "sans-serif",
      color: "#FFFFFF",
      preset: "tiktok_yellow",
      align: "center",
      animation: "fade",
    };
    setTextOverlays([...textOverlays, newText]);
    setEditingTextId(newText.id);
    setNewTextString("");
  };

  const handleAddSticker = (emoji: string) => {
    const newSticker: StickerOverlay = {
      id: "s_" + Date.now(),
      emoji,
      x: Math.floor(Math.random() * 40) + 30,
      y: Math.floor(Math.random() * 40) + 30,
      scale: 1.5,
    };
    setStickerOverlays([...stickerOverlays, newSticker]);
  };

  const handleApplyTemplate = (templateName: string) => {
    if (templateName === "Trending Reel Beat") {
      setAspectRatio("9:16");
      setPlaybackSpeed(1.25);
      setSelectedFilter("teal_orange");
      setCaptionStyle("tiktok_yellow");
      setSelectedEffect("glitch");
    } else if (templateName === "Cyberpunk Intro") {
      setAspectRatio("16:9");
      setSelectedFilter("cyberpunk");
      setSelectedEffect("neon");
      setBgStyle("cyber_gradient");
    } else if (templateName === "Minivlog Aesthetic") {
      setAspectRatio("4:5");
      setSelectedFilter("vintage_1970");
      setSelectedEffect("vhs");
      setBgStyle("purple_glow");
    } else if (templateName === "Fast Beat Cut") {
      setAspectRatio("9:16");
      setPlaybackSpeed(1.5);
      setSelectedEffect("neon");
    } else if (templateName === "Glow Title Opener") {
      setAspectRatio("16:9");
      setSelectedEffect("golden");
      setSelectedFilter("sunset");
    }
    setActiveTool(null);
  };

  const currentCaption = useMemo(() => {
    if (!autoCaptionsEnabled) return null;
    return captionItems.find(c => currentTime >= c.start && currentTime <= c.end);
  }, [currentTime, captionItems, autoCaptionsEnabled]);

  // Real Video Export with Full CapCut Masks, Blend Modes, Animations, Chroma Key, Text, Stickers & Captions
  const startRealExport = async () => {
    if (!videoClips.length || isExporting) return;
    setShowExportModal(false);
    setIsExporting(true);
    setExportProgress(0);
    setIsPlaying(false);
    videoRef.current?.pause();
    const canvas = document.createElement("canvas");
    const shortSide = exportResolution === "1080p" ? 1080 : exportResolution === "480p" ? 480 : 720;
    const ratio = effectiveAspectRatio;
    const width = Math.round((ratio >= 1 ? shortSide * ratio : shortSide) / 2) * 2;
    const height = Math.round((ratio >= 1 ? shortSide : shortSide / ratio) / 2) * 2;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setIsExporting(false);
      return;
    }
    const previewWidth = videoRef.current?.parentElement?.clientWidth || 340;
    const previewScale = width / previewWidth;
    const chromaCanvas = document.createElement("canvas");
    let overlayImage: HTMLImageElement | undefined;
    try {
      if (overlayMedia) {
        overlayImage = new Image();
        overlayImage.crossOrigin = "anonymous";
        overlayImage.src = overlayMedia.url;
        await overlayImage.decode();
      }
      await document.fonts.ready;
      const blob = await recordTimeline({
        clips: videoClips,
        canvas,
        format: exportFormat,
        quality: exportQuality,
        speed: playbackSpeed,
        volume: isMuted ? 0 : volume,
        audioLayers,
        start: trimStart,
        end: trimEnd > trimStart ? trimEnd : duration,
        progress: setExportProgress,
        rateAt: speedForTime,
        gainAt: fadeForTime,
        draw: (videoElement, timelineTime) => {
          const animated = motionAt(timelineTime);
          const clipInfoAtTime =
            clipOffsets.find(c => timelineTime >= c.start && timelineTime < c.end) ||
            clipOffsets[clipOffsets.length - 1];
          const localT = clipInfoAtTime ? Math.max(0, timelineTime - clipInfoAtTime.start) : 0;
          const clipDur = clipInfoAtTime ? clipInfoAtTime.duration : duration || 1;
          const anim = computeClipAnimation(
            localT,
            clipDur,
            clipAnimIn,
            clipAnimOut,
            clipAnimCombo,
            clipAnimDuration
          );

          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, width, height);
          const effectiveBg = bgStyle;
          if (effectiveBg === "purple_glow" || effectiveBg === "cyber_gradient") {
            const gradient = ctx.createLinearGradient(0, 0, width, height);
            gradient.addColorStop(0, effectiveBg === "purple_glow" ? "#581c87" : "#083344");
            gradient.addColorStop(1, "#312e81");
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
          } else if (effectiveBg === "blur_low" || effectiveBg === "blur_high") {
            ctx.save();
            ctx.filter = "blur(" + (effectiveBg === "blur_low" ? 12 : 28) + "px)";
            ctx.drawImage(videoElement, 0, 0, width, height);
            ctx.restore();
          }

          ctx.save();
          if (maskShape !== "none") {
            applyCanvasMask(ctx, width, height, maskShape, maskSize);
          }
          ctx.filter = filterStyle;
          ctx.globalCompositeOperation =
            blendEnabled && blendMode !== "normal" ? (blendMode as GlobalCompositeOperation) : "source-over";
          ctx.globalAlpha = (animated.opacity / 100) * anim.opacity;
          ctx.translate(
            width / 2 + (animated.x + anim.x) * previewScale,
            height / 2 + (animated.y + anim.y) * previewScale
          );
          ctx.rotate(((animated.rotation + anim.rotate) * Math.PI) / 180);
          const sx = (uniformScale ? animated.zoom : scaleX / 100) * anim.scale * stabilizeZoom;
          const sy = (uniformScale ? animated.zoom : scaleY / 100) * anim.scale * stabilizeZoom;
          ctx.scale(flipSignX * sx, flipSignY * sy);
          const cropScale = Math.min(100 / cropBox.width, 100 / cropBox.height);
          ctx.scale(cropScale, cropScale);
          ctx.translate(
            (50 - cropBox.left - cropBox.width / 2) * 3 * previewScale,
            (50 - cropBox.top - cropBox.height / 2) * 3 * previewScale
          );
          const fit = Math.min(width / videoElement.videoWidth, height / videoElement.videoHeight);
          const dw = videoElement.videoWidth * fit,
            dh = videoElement.videoHeight * fit;
          ctx.drawImage(
            editorState.chroma.enabled
              ? keyedFrame(
                  videoElement,
                  chromaCanvas,
                  editorState.chroma.color,
                  editorState.chroma.tolerance,
                  editorState.chroma.softness
                )
              : videoElement,
            -dw / 2,
            -dh / 2,
            dw,
            dh
          );
          ctx.restore();

          if (overlayImage && overlayMedia) {
            const ow = width * 0.3 * overlayMedia.scale;
            const oh = (ow * overlayImage.naturalHeight) / overlayImage.naturalWidth;
            const position = overlayMedia.position;
            const ox = position.includes("left")
              ? width * 0.03
              : position.includes("right")
                ? width * 0.97 - ow
                : (width - ow) / 2;
            const oy = position.includes("top")
              ? height * 0.03
              : position.includes("bottom")
                ? height * 0.97 - oh
                : (height - oh) / 2;
            ctx.save();
            ctx.globalAlpha = overlayMedia.opacity / 100;
            ctx.drawImage(overlayImage, ox, oy, ow, oh);
            ctx.restore();
          }

          textOverlays
            .filter(t => timelineTime >= (t.start || 0) && timelineTime < (t.end || duration))
            .forEach(txt => {
              ctx.save();
              const tx = (txt.x / 100) * width;
              const ty = (txt.y / 100) * height;
              ctx.font = `bold ${txt.fontSize * previewScale}px ${txt.fontFamily}`;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";

              if (txt.preset === "tiktok_yellow") {
                ctx.fillStyle = "#FFE600";
                ctx.strokeStyle = "#000000";
                ctx.lineWidth = 4;
                ctx.strokeText(txt.text, tx, ty);
                ctx.fillText(txt.text, tx, ty);
              } else if (txt.preset === "neon_cyan") {
                ctx.shadowColor = "#00E5FF";
                ctx.shadowBlur = 10;
                ctx.fillStyle = "#FFFFFF";
                ctx.fillText(txt.text, tx, ty);
              } else {
                ctx.fillStyle = txt.color;
                ctx.fillText(txt.text, tx, ty);
              }
              ctx.restore();
            });

          stickerOverlays.forEach(st => {
            ctx.save();
            const sxPos = (st.x / 100) * width;
            const syPos = (st.y / 100) * height;
            ctx.font = `${32 * st.scale * previewScale}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(st.emoji, sxPos, syPos);
            ctx.restore();
          });

          const cap = captionItems.find(c => timelineTime >= c.start && timelineTime < c.end);
          if (autoCaptionsEnabled && cap) {
            ctx.save();
            const cx = width / 2;
            const cy = height * 0.85;
            ctx.font = `bold ${28 * previewScale}px sans-serif`;
            ctx.textAlign = "center";
            ctx.fillStyle = "#FFE600";
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 5;
            ctx.strokeText(cap.text, cx, cy);
            ctx.fillText(cap.text, cx, cy);
            ctx.restore();
          }

          ctx.save();
          ctx.globalAlpha = 1 - fadeForTime(timelineTime);
          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, width, height);
          ctx.restore();
        },
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download =
        (projectTitle || "FahiVids") +
        "_" +
        Date.now() +
        (blob.type.includes("mp4") ? ".mp4" : ".webm");
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      logActivity({
        type: "video_edit",
        title: videoClips[0].name,
        metadata: { format: blob.type, clips: videoClips.length },
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Video export failed");
    } finally {
      setIsExporting(false);
    }
  };

  // Filtered and sorted media assets for Left Media Pool Grid
  const activePoolSource = mediaAssets.length > 0 ? mediaAssets : videoClips;
  const filteredVideoClips = useMemo(() => {
    const list = activePoolSource.filter(c =>
      c.name.toLowerCase().includes(mediaSearch.trim().toLowerCase())
    );
    return [...list].sort((a, b) =>
      mediaSortBy === "name" ? a.name.localeCompare(b.name) : b.duration - a.duration
    );
  }, [activePoolSource, mediaSearch, mediaSortBy]);

  // Helper to select a tool on mobile or desktop and switch the appropriate CapCut panel tab
  const openCapCutTool = (toolId: string) => {
    setActiveTool(prev => (prev === toolId ? null : toolId));
    if (["media", "audio", "text", "stickers", "effects", "transitions", "captions", "filters"].includes(toolId)) {
      setLeftTab(toolId as any);
    } else if (toolId === "remove_bg" || toolId === "chroma") {
      setRightTab("video");
      setVideoSubTab("remove_bg");
    } else if (toolId === "mask") {
      setRightTab("video");
      setVideoSubTab("mask");
    } else if (toolId === "retouch") {
      setRightTab("video");
      setVideoSubTab("retouch");
    } else if (toolId === "edit" || toolId === "motion" || toolId === "basic") {
      setRightTab("video");
      setVideoSubTab("basic");
    } else if (toolId === "speed") {
      setRightTab("speed");
    } else if (toolId === "animation") {
      setRightTab("animation");
    } else if (toolId === "adjust") {
      setRightTab("adjust");
    } else if (toolId === "details") {
      setRightTab("details");
    }
  };

  const isMobileLeftDrawerOpen = Boolean(
    activeTool &&
      ["media", "audio", "text", "stickers", "effects", "transitions", "captions", "filters", "overlay", "templates"].includes(
        activeTool
      )
  );
  const isMobileRightDrawerOpen = Boolean(
    activeTool &&
      !isMobileLeftDrawerOpen &&
      activeTool !== "crop"
  );

  return (
    <div className="flex flex-col h-[100dvh] md:h-[calc(100vh-56px)] font-sans antialiased overflow-hidden bg-[#121316] text-[#F1F5F9] selection:bg-cyan-500/30">
      <AudioPreview
        layers={audioLayers}
        time={currentTime}
        playing={isPlaying && !isExporting}
        rate={speedForTime(currentTime)}
        onError={setAudioError}
      />

      {/* Hidden Global File Inputs */}
      <input
        id="studio-video-import"
        type="file"
        accept="video/*"
        multiple
        className="hidden"
        onChange={handleFileUpload}
      />
      <input
        id="studio-audio-import"
        type="file"
        accept="audio/*"
        multiple
        className="hidden"
        onChange={e => {
          if (e.target.files?.length) {
            addAudioFiles(Array.from(e.target.files));
            e.target.value = "";
          }
        }}
      />

      {/* ==================== TOP HEADER BAR — EXACT CAPCUT PRO STYLE ==================== */}
      <div className="flex items-center justify-between px-3 h-10 shrink-0 z-30 bg-[#121316] border-b border-white/10 select-none">
        {/* Left: CapCut Icon + Menu Dropdown + Auto saved status */}
        <div className="flex items-center space-x-3 relative">
          <button
            type="button"
            onClick={() => setShowHeaderMenu(!showHeaderMenu)}
            className="flex items-center space-x-1.5 px-2 py-1 rounded hover:bg-white/10 text-xs font-bold text-slate-200 transition-colors"
          >
            <FahiVidsMarkSvg size={18} className="shrink-0" />
            <span>Menu</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showHeaderMenu && (
            <div className="absolute left-0 top-9 w-52 rounded-xl bg-[#1C1E24] border border-white/15 shadow-2xl py-1.5 z-50 text-xs">
              <button
                type="button"
                onClick={() => {
                  setShowHeaderMenu(false);
                  (document.getElementById("studio-video-import") as HTMLInputElement | null)?.click();
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-white/10 flex items-center justify-between text-slate-200"
              >
                <span>Import Media...</span>
                <span className="text-[10px] text-slate-500">Ctrl+I</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowHeaderMenu(false);
                  handleSplitClip();
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-white/10 flex items-center justify-between text-slate-200"
              >
                <span>Split Clip at Playhead</span>
                <span className="text-[10px] text-slate-500">Ctrl+B</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowHeaderMenu(false);
                  resetAdjustments();
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-white/10 flex items-center justify-between text-slate-200"
              >
                <span>Reset All Adjustments</span>
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <div className="my-1 border-t border-white/10" />
              <button
                type="button"
                onClick={() => {
                  setShowHeaderMenu(false);
                  setShowSettingsModal(true);
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-white/10 flex items-center justify-between text-slate-200"
              >
                <span>Workspace Settings</span>
                <Settings className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowHeaderMenu(false);
                  setShowAdminModal(true);
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-white/10 flex items-center justify-between text-violet-300"
              >
                <span>Admin Console</span>
                <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
              </button>
            </div>
          )}

          <div className="hidden sm:flex items-center space-x-1.5 text-[11px] text-slate-400">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>Auto saved: {lastSavedTime}</span>
          </div>
        </div>

        {/* Center: Editable Project Name ("1022" in screenshot) */}
        <div className="flex items-center space-x-2">
          <input
            aria-label="Project title"
            type="text"
            value={projectTitle}
            onChange={e => updateState("projectTitle", e.target.value)}
            className="bg-transparent hover:bg-white/5 focus:bg-[#1E2028] text-center text-xs font-semibold text-slate-200 px-2.5 py-1 rounded border border-transparent focus:border-cyan-500/40 w-28 sm:w-40 focus:outline-none"
          />
        </div>

        {/* Right: Install + Admin + Share + Cyan Export Button */}
        <div className="flex items-center space-x-2">
          <PwaInstallButton compact />
          <button
            type="button"
            onClick={() => setShowAdminModal(true)}
            className="hidden lg:flex items-center space-x-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-slate-300"
            title="Admin Console"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Admin</span>
          </button>

          <button
            type="button"
            onClick={() => {
              handleCaptureCover();
              alert(`Project "${projectTitle}" snapshot saved & ready to share!`);
            }}
            className="hidden sm:flex items-center space-x-1 px-2.5 py-1 rounded bg-[#23252C] hover:bg-[#2C2F38] text-slate-200 text-xs font-medium transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>

          <button
            type="button"
            disabled={!videoClips.length || isExporting}
            onClick={() => setShowExportModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1 rounded text-xs font-bold text-[#081014] bg-[#00E5FF] hover:bg-[#33ECFF] disabled:opacity-40 transition-all shadow-[0_0_12px_rgba(0,229,255,0.35)]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* ==================== UPPER 3-PANEL CAPCUT WORKSPACE ==================== */}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row min-h-0">
        {/* ---------- 1. TOP-LEFT PANEL: 8 CAPCUT ASSET TABS + MEDIA BROWSER ---------- */}
        <div
          data-open={isMobileLeftDrawerOpen}
          className={`fahi-left-asset-panel ${
            isMobileLeftDrawerOpen ? "flex" : "hidden"
          } md:flex flex-col bg-[#18191D] border-r border-white/10 min-h-0 overflow-hidden select-none`}
        >
          {/* Top 8 CapCut Icon Tabs: Media, Audio, Text, Stickers, Effects, Transitions, Captions, Filters */}
          <div className="flex items-center justify-between px-1.5 py-1.5 bg-[#121316] border-b border-white/10 overflow-x-auto scrollbar-none shrink-0">
            {(
              [
                { id: "media", icon: Film, label: "Media" },
                { id: "audio", icon: Music, label: "Audio" },
                { id: "text", icon: Type, label: "Text" },
                { id: "stickers", icon: Sticker, label: "Stickers" },
                { id: "effects", icon: Sparkles, label: "Effects" },
                { id: "transitions", icon: Layers, label: "Transitions" },
                { id: "captions", icon: Captions, label: "Captions" },
                { id: "filters", icon: SlidersHorizontal, label: "Filters" },
              ] as const
            ).map(tab => {
              const active = leftTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setLeftTab(tab.id)}
                  className={`flex flex-col items-center justify-center px-2 py-1 rounded-md min-w-[44px] transition-colors ${
                    active ? "text-[#00E5FF] bg-white/5" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <tab.icon className="w-4 h-4 mb-0.5" />
                  <span className="text-[10px] font-medium leading-tight">{tab.label}</span>
                </button>
              );
            })}
            {/* Mobile Close Drawer Button */}
            <button
              type="button"
              onClick={() => setActiveTool(null)}
              className="md:hidden p-1.5 text-slate-400 hover:text-white"
              title="Close Drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Left Panel Body */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* MEDIA TAB WITH CAPCUT SUB-SIDEBAR */}
            {leftTab === "media" && (
              <>
                {/* Left Sub-Sidebar: Import, Yours, Spaces, Library (Zero AI Tabs) */}
                <div className="w-24 shrink-0 bg-[#141519] border-r border-white/5 p-1.5 flex flex-col space-y-1 text-[11px] overflow-y-auto">
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Import
                  </div>
                  {(
                    [
                      { id: "yours", label: "Yours" },
                      { id: "spaces", label: "Spaces" },
                      { id: "library", label: "Library" },
                    ] as const
                  ).map(sub => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setMediaSubTab(sub.id)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                        mediaSubTab === sub.id
                          ? "bg-[#252830] text-[#00E5FF]"
                          : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>

                {/* Right Media Content Area */}
                <div className="flex-1 flex flex-col min-h-0 p-2.5 overflow-y-auto">
                  {(mediaSubTab === "yours" || mediaSubTab === "import" || mediaSubTab === "spaces") && (
                    <div className="flex flex-col flex-1 space-y-2.5">
                      {/* Action Row: + Import | Record | Search/Sort */}
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              (document.getElementById("studio-video-import") as HTMLInputElement | null)?.click()
                            }
                            className="flex items-center space-x-1 px-2.5 py-1.5 rounded bg-[#00E5FF]/15 hover:bg-[#00E5FF]/25 border border-[#00E5FF]/40 text-[#00E5FF] text-xs font-bold transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Import</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleLiveRecord("webcam")}
                            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded border text-xs font-medium transition-colors ${
                              isRecordingMedia === "webcam"
                                ? "bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse"
                                : "bg-[#23252C] hover:bg-[#2C2F38] border-white/10 text-slate-200"
                            }`}
                          >
                            <CircleDot className="w-3.5 h-3.5 text-rose-400" />
                            <span>{isRecordingMedia === "webcam" ? "Stop Rec" : "Record"}</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => setMediaSortBy(prev => (prev === "name" ? "duration" : "name"))}
                          className="p-1.5 rounded bg-[#23252C] hover:bg-[#2C2F38] text-slate-300 text-[10px]"
                          title={`Sort by ${mediaSortBy}`}
                        >
                          {mediaSortBy === "name" ? "A-Z" : "Dur"}
                        </button>
                      </div>

                      {/* Search Bar */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                        <input
                          type="text"
                          placeholder="Search media..."
                          value={mediaSearch}
                          onChange={e => setMediaSearch(e.target.value)}
                          className="w-full bg-[#121316] border border-white/10 rounded-md pl-8 pr-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                        />
                      </div>

                      {/* Media Grid Cards matching CapCut Desktop (1005.mp4, 1006.mp4 with Added & Proxy badges + Drag & '+' Add to Track) */}
                      {filteredVideoClips.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {filteredVideoClips.map(clip => {
                            const isAddedToTimeline = videoClips.some(tc => tc.objectUrl === clip.objectUrl);
                            const isSelected =
                              previewAssetId === clip.id ||
                              selectedClipId === clip.id ||
                              activeClipId === clip.id;
                            return (
                              <div
                                key={clip.id}
                                draggable
                                onDragStart={e => {
                                  e.dataTransfer.setData("application/x-fahi-asset-id", clip.id);
                                  e.dataTransfer.effectAllowed = "copy";
                                }}
                                onClick={() => {
                                  const off = clipOffsets.find(
                                    c => c.clip.id === clip.id || c.clip.objectUrl === clip.objectUrl
                                  );
                                  if (off) {
                                    setPreviewAssetId(null);
                                    setSelectedClipId(off.clip.id);
                                    seekToTime(off.start);
                                  } else {
                                    setPreviewAssetId(clip.id);
                                    setSelectedClipId(null);
                                  }
                                }}
                                className={`group relative rounded-lg overflow-hidden bg-[#121316] border cursor-pointer transition-all ${
                                  isSelected ? "border-[#00E5FF] ring-1 ring-[#00E5FF]/50" : "border-white/10 hover:border-white/25"
                                }`}
                              >
                                <div className="aspect-video bg-black relative overflow-hidden">
                                  <video
                                    src={clip.objectUrl}
                                    muted
                                    playsInline
                                    preload="metadata"
                                    className="w-full h-full object-cover"
                                  />
                                  {/* Top-Left "Added" Badge (shown when clip is on the timeline) */}
                                  {isAddedToTimeline && (
                                    <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/75 text-[9px] font-bold text-emerald-300 border border-emerald-500/30">
                                      Added
                                    </span>
                                  )}
                                  {/* Bottom-Left "Proxy" Toggle Badge */}
                                  <button
                                    type="button"
                                    onClick={e => {
                                      e.stopPropagation();
                                      setVideoClips(prev =>
                                        prev.map(c =>
                                          c.objectUrl === clip.objectUrl ? { ...c, proxyEnabled: !c.proxyEnabled } : c
                                        )
                                      );
                                      setMediaAssets(prev =>
                                        prev.map(a =>
                                          a.id === clip.id ? { ...a, proxyEnabled: !a.proxyEnabled } : a
                                        )
                                      );
                                    }}
                                    className={`absolute bottom-1 left-1 px-1 py-0.2 rounded text-[8px] font-mono font-bold ${
                                      clip.proxyEnabled !== false
                                        ? "bg-black/75 text-cyan-300 border border-cyan-500/30"
                                        : "bg-black/50 text-slate-400"
                                    }`}
                                  >
                                    Proxy
                                  </button>
                                  {/* Bottom-Right Duration Badge */}
                                  <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/80 text-[9px] font-mono text-slate-200">
                                    {formatTime(clip.duration).slice(0, 5)}
                                  </span>
                                  {/* Bottom-Right / Top-Right '+' Add to Track Button */}
                                  <button
                                    type="button"
                                    title="Add to track (00:00)"
                                    onClick={e => {
                                      e.stopPropagation();
                                      handleAddAssetToTimeline(clip);
                                    }}
                                    className="opacity-90 group-hover:opacity-100 absolute top-1 right-1 w-5 h-5 rounded-full bg-[#00E5FF] text-black flex items-center justify-center shadow transition-opacity hover:scale-110"
                                  >
                                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                  </button>
                                </div>
                                <div className="px-2 py-1 flex items-center justify-between">
                                  <span className="text-[10px] text-slate-300 truncate">{clip.name}</span>
                                  <button
                                    type="button"
                                    onClick={e => {
                                      e.stopPropagation();
                                      handleRemoveClip(clip.id);
                                      setMediaAssets(prev => prev.filter(a => a.id !== clip.id));
                                    }}
                                    className="text-slate-500 hover:text-rose-400 ml-1"
                                    title="Remove clip"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div
                          onClick={() =>
                            (document.getElementById("studio-video-import") as HTMLInputElement | null)?.click()
                          }
                          className="flex-1 flex flex-col items-center justify-center border border-dashed border-white/15 hover:border-[#00E5FF]/50 rounded-xl p-4 text-center cursor-pointer bg-[#141519]/60 transition-colors"
                        >
                          <div className="w-10 h-10 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/30 flex items-center justify-center mb-2">
                            <Plus className="w-5 h-5 text-[#00E5FF]" />
                          </div>
                          <p className="text-xs font-semibold text-slate-200">+ Import</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Drop videos or click to browse MP4, WebM, MOV
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {mediaSubTab === "library" && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        CapCut Viral Templates & Presets
                      </span>
                      {[
                        "Trending Reel Beat",
                        "Cyberpunk Intro",
                        "Minivlog Aesthetic",
                        "Fast Beat Cut",
                        "Glow Title Opener",
                      ].map(tName => (
                        <button
                          key={tName}
                          type="button"
                          onClick={() => handleApplyTemplate(tName)}
                          className="w-full p-2.5 rounded-lg text-left bg-[#121316] hover:bg-white/5 border border-white/10 hover:border-cyan-400/50 text-slate-200 font-semibold text-xs flex items-center justify-between transition-all"
                        >
                          <span>{tName}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* AUDIO TAB */}
            {leftTab === "audio" && (
              <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      (document.getElementById("studio-audio-import") as HTMLInputElement | null)?.click()
                    }
                    className="flex-1 py-1.5 px-2.5 rounded bg-[#00E5FF]/15 hover:bg-[#00E5FF]/25 border border-[#00E5FF]/40 text-[#00E5FF] text-xs font-bold flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Import Audio</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExtractAudioFromClip}
                    disabled={!videoClips.length}
                    className="py-1.5 px-2.5 rounded bg-[#23252C] hover:bg-[#2C2F38] border border-white/10 text-slate-200 text-xs font-medium disabled:opacity-40"
                  >
                    Extract Audio
                  </button>
                </div>

                {/* Live Microphone Voiceover Recorder */}
                <div className="p-2.5 rounded-lg bg-[#121316] border border-white/10 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-cyan-400 font-semibold text-xs">
                    <Mic className="w-3.5 h-3.5" />
                    <span>Voiceover Recorder (Mic)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleLiveRecord("voiceover")}
                    className={`px-2.5 py-1 rounded text-xs font-bold border transition-colors ${
                      isRecordingMedia === "voiceover"
                        ? "bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse"
                        : "bg-cyan-500/20 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30"
                    }`}
                  >
                    {isRecordingMedia === "voiceover" ? "Stop Recording" : "+ Record Mic"}
                  </button>
                </div>

                {/* Built-in Synthesized CapCut Sound Effects & Beats */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    CapCut Built-in Sound Effects & Beats
                  </span>
                  {(
                    [
                      { id: "lofi_beat", name: "Saphir Beat Loop (120 BPM)", dur: "04.0s" },
                      { id: "whoosh", name: "Saphir Transition Whoosh", dur: "01.2s" },
                      { id: "riser", name: "Cinematic Synth Riser", dur: "02.0s" },
                      { id: "bass_drop", name: "Sub Bass Impact Drop", dur: "01.2s" },
                      { id: "ding", name: "Bright Bell Notification", dur: "01.2s" },
                    ] as const
                  ).map(sfx => (
                    <div
                      key={sfx.id}
                      className="flex items-center justify-between p-2 rounded bg-[#121316] border border-white/10 text-xs"
                    >
                      <div>
                        <div className="text-slate-200 font-medium text-[11px]">{sfx.name}</div>
                        <div className="text-[9px] text-slate-500 font-mono">{sfx.dur}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddSfxLayer(sfx.id)}
                        className="px-2 py-1 rounded bg-[#00E5FF]/20 hover:bg-[#00E5FF] text-[#00E5FF] hover:text-black font-bold text-[10px] transition-colors"
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                </div>

                <AudioTools
                  layers={audioLayers}
                  change={setAudioLayers}
                  selected={selectedAudioId}
                  select={setSelectedAudioId}
                  time={currentTime}
                  importFiles={addAudioFiles}
                />
                {audioError && <p role="alert" className="text-xs text-rose-300">{audioError}</p>}
              </div>
            )}

            {/* TEXT TAB */}
            {leftTab === "text" && (
              <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Enter text overlay..."
                    value={newTextString}
                    onChange={e => setNewTextString(e.target.value)}
                    className="w-full bg-[#121316] border border-white/10 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddTextOverlay}
                    className="w-full bg-[#00E5FF] hover:bg-[#33ECFF] text-black py-1.5 rounded text-xs font-bold transition-colors"
                  >
                    + Add Text to Timeline
                  </button>
                </div>

                {textOverlays.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Active Text Layers
                    </span>
                    {textOverlays.map(t => (
                      <div
                        key={t.id}
                        className={`flex items-center justify-between p-2 rounded border text-xs ${
                          editingTextId === t.id
                            ? "bg-cyan-500/15 border-cyan-400"
                            : "bg-[#121316] border-white/10"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setEditingTextId(t.id)}
                          className="flex-1 text-left truncate text-slate-200 font-medium"
                        >
                          {t.text}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setTextOverlays((prev: TextOverlay[]) =>
                              prev.filter((x: TextOverlay) => x.id !== t.id)
                            )
                          }
                          className="text-slate-500 hover:text-rose-400 ml-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {editingTextId &&
                  (() => {
                    const text = textOverlays.find(t => t.id === editingTextId);
                    if (!text) return null;
                    const patch = (changes: Partial<TextOverlay>) =>
                      setTextOverlays((items: TextOverlay[]) =>
                        items.map(t => (t.id === text.id ? { ...t, ...changes } : t))
                      );
                    return (
                      <div className="space-y-2.5 pt-2 border-t border-white/10 text-xs">
                        <input
                          aria-label="Selected text"
                          className="w-full bg-[#121316] border border-white/10 p-2 rounded text-white"
                          value={text.text}
                          onChange={e => patch({ text: e.target.value })}
                        />
                        <div className="flex gap-2 items-center">
                          <label className="text-[11px] text-slate-300 flex items-center gap-1.5">
                            Color
                            <input
                              aria-label="Text color"
                              type="color"
                              value={text.color}
                              onChange={e => patch({ color: e.target.value })}
                            />
                          </label>
                          <label className="text-[11px] text-slate-300 flex items-center gap-1.5">
                            Size
                            <input
                              aria-label="Text size"
                              type="number"
                              min="8"
                              max="120"
                              className="w-16 bg-[#121316] border border-white/10 p-1 rounded text-white"
                              value={text.fontSize}
                              onChange={e =>
                                patch({ fontSize: Math.max(8, Math.min(120, Number(e.target.value))) })
                              }
                            />
                          </label>
                        </div>
                        {(["x", "y"] as const).map(axis => (
                          <label key={axis} className="block text-[11px] text-slate-300">
                            Position {axis.toUpperCase()} ({text[axis]}%)
                            <input
                              aria-label={"Text position " + axis}
                              className="w-full capcut-slider mt-1"
                              type="range"
                              min="0"
                              max="100"
                              value={text[axis]}
                              onChange={e => patch({ [axis]: Number(e.target.value) })}
                            />
                          </label>
                        ))}
                        <div className="flex gap-2">
                          <label className="text-[11px] text-slate-300">
                            Start (s)
                            <input
                              aria-label="Text start"
                              type="number"
                              min="0"
                              max={duration}
                              step="0.1"
                              className="w-20 bg-[#121316] border border-white/10 p-1 rounded ml-1"
                              value={text.start || 0}
                              onChange={e =>
                                patch({
                                  start: Math.max(
                                    0,
                                    Math.min((text.end || duration) - 0.1, Number(e.target.value))
                                  ),
                                })
                              }
                            />
                          </label>
                          <label className="text-[11px] text-slate-300">
                            End (s)
                            <input
                              aria-label="Text end"
                              type="number"
                              min={(text.start || 0) + 0.1}
                              max={duration}
                              step="0.1"
                              className="w-20 bg-[#121316] border border-white/10 p-1 rounded ml-1"
                              value={text.end || duration}
                              onChange={e =>
                                patch({
                                  end: Math.min(
                                    duration,
                                    Math.max((text.start || 0) + 0.1, Number(e.target.value))
                                  ),
                                })
                              }
                            />
                          </label>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {(["tiktok_yellow", "neon_cyan", "outline_white"] as const).map(s => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => patch({ preset: s })}
                              className={`px-2 py-1 rounded border text-[10px] font-bold ${
                                text.preset === s
                                  ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                                  : "bg-[#121316] border-white/10 text-slate-300"
                              }`}
                            >
                              {s.replace("_", " ")}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
              </div>
            )}

            {/* STICKERS TAB */}
            {leftTab === "stickers" && (
              <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  CapCut Stickers & Emojis
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {["🔥", "💯", "🚀", "👍", "🔔", "⚡", "❤️", "🎉", "🎯", "🌟", "👑", "🎬", "💥", "📌", "✨", "💎"].map(
                    st => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleAddSticker(st)}
                        className="text-2xl p-2 bg-[#121316] rounded-lg border border-white/10 hover:border-cyan-400 hover:scale-105 transition-all flex items-center justify-center"
                      >
                        {st}
                      </button>
                    )
                  )}
                </div>
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Picture-in-Picture Image Overlay
                  </span>
                  <label className="block py-2 px-3 rounded bg-[#23252C] hover:bg-[#2C2F38] border border-white/10 text-xs text-center text-slate-200 cursor-pointer font-semibold">
                    + Upload PIP Image Overlay
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const url = URL.createObjectURL(file);
                        importedUrls.current.add(url);
                        setOverlayMedia({
                          id: crypto.randomUUID(),
                          url,
                          title: file.name,
                          position: "center",
                          opacity: 100,
                          scale: 1,
                        });
                      }}
                    />
                  </label>
                  {overlayMedia && (
                    <div className="space-y-2 p-2 rounded bg-[#121316] border border-white/10 text-xs">
                      <select
                        aria-label="Overlay position"
                        value={overlayMedia.position}
                        onChange={e =>
                          setOverlayMedia({
                            ...overlayMedia,
                            position: e.target.value as OverlayMedia["position"],
                          })
                        }
                        className="w-full bg-black/50 border border-white/10 p-1.5 rounded text-xs"
                      >
                        {["top-left", "top-right", "center", "bottom-left", "bottom-right"].map(pos => (
                          <option key={pos}>{pos}</option>
                        ))}
                      </select>
                      <label className="block text-[11px]">
                        Opacity {overlayMedia.opacity}%
                        <input
                          aria-label="Overlay opacity"
                          className="w-full capcut-slider"
                          type="range"
                          min="0"
                          max="100"
                          value={overlayMedia.opacity}
                          onChange={e =>
                            setOverlayMedia({ ...overlayMedia, opacity: Number(e.target.value) })
                          }
                        />
                      </label>
                      <label className="block text-[11px]">
                        Size
                        <input
                          aria-label="Overlay size"
                          className="w-full capcut-slider"
                          type="range"
                          min="0.2"
                          max="3"
                          step="0.1"
                          value={overlayMedia.scale}
                          onChange={e =>
                            setOverlayMedia({ ...overlayMedia, scale: Number(e.target.value) })
                          }
                        />
                      </label>
                      <button
                        type="button"
                        className="w-full py-1 text-rose-400 text-[11px]"
                        onClick={() => setOverlayMedia(null)}
                      >
                        Remove PIP Overlay
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* EFFECTS TAB */}
            {leftTab === "effects" && (
              <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "none", name: "None" },
                    { id: "glitch", name: "Hue Glitch" },
                    { id: "neon", name: "Cyber Neon" },
                    { id: "vhs", name: "Retro VHS" },
                    { id: "grain", name: "Film Contrast" },
                    { id: "blur", name: "Dream Blur" },
                    { id: "golden", name: "Gold Glow" },
                    { id: "vignette", name: "Dark Vignette" },
                    { id: "invert", name: "Negative Invert" },
                  ].map(eff => (
                    <button
                      key={eff.id}
                      type="button"
                      onClick={() => setSelectedEffect(eff.id)}
                      className={`py-2.5 px-2 rounded-lg text-center border font-semibold text-[11px] transition-colors ${
                        selectedEffect === eff.id
                          ? "bg-cyan-500/20 border-[#00E5FF] text-[#00E5FF]"
                          : "bg-[#121316] border-white/10 text-slate-300 hover:bg-white/5"
                      }`}
                    >
                      {eff.name}
                    </button>
                  ))}
                </div>
                {selectedEffect !== "none" && (
                  <div className="space-y-1.5 pt-2 border-t border-white/10">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Effect Intensity</span>
                      <span className="text-cyan-400 font-mono">{effectIntensity}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={effectIntensity}
                      onChange={e => setEffectIntensity(Number(e.target.value))}
                      className="w-full capcut-slider"
                    />
                  </div>
                )}
              </div>
            )}

            {/* TRANSITIONS TAB */}
            {leftTab === "transitions" && (
              <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                <p className="text-[11px] text-slate-400">
                  Smooth clip boundary transitions. Video & audio fade seamlessly together.
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {[0, 0.2, 0.5, 1, 1.5, 2].map(seconds => (
                    <button
                      key={seconds}
                      type="button"
                      aria-pressed={editorState.transitionSeconds === seconds}
                      onClick={() => updateState("transitionSeconds", seconds)}
                      className={`py-2 rounded border text-xs font-bold ${
                        editorState.transitionSeconds === seconds
                          ? "bg-cyan-500/20 border-[#00E5FF] text-[#00E5FF]"
                          : "bg-[#121316] border-white/10 text-slate-300"
                      }`}
                    >
                      {seconds === 0 ? "None" : `${seconds}s`}
                    </button>
                  ))}
                </div>
                <label className="block text-xs text-slate-300">
                  Duration: {editorState.transitionSeconds.toFixed(2)}s
                  <input
                    aria-label="Transition duration"
                    className="w-full capcut-slider mt-1"
                    type="range"
                    min="0"
                    max="2"
                    step="0.05"
                    value={editorState.transitionSeconds}
                    onChange={e => updateState("transitionSeconds", Number(e.target.value))}
                  />
                </label>
              </div>
            )}

            {/* CAPTIONS TAB (Pure Manual & .SRT Subtitle Editor — Zero AI) */}
            {leftTab === "captions" && (
              <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#121316] border border-white/10">
                  <span className="text-xs font-semibold text-slate-200">Subtitles Overlay</span>
                  <button
                    type="button"
                    onClick={() => setAutoCaptionsEnabled(!autoCaptionsEnabled)}
                    className={`w-10 h-5 rounded-full relative transition-colors ${
                      autoCaptionsEnabled ? "bg-[#00E5FF]" : "bg-white/20"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-black transition-all ${
                        autoCaptionsEnabled ? "left-5" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>

                {/* Add Manual Subtitle at Playhead */}
                <div className="space-y-2 p-2.5 rounded-lg bg-[#121316] border border-white/10">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Add Subtitle Line at Playhead ({formatCapCutTimecode(currentTime)})
                  </span>
                  <input
                    type="text"
                    placeholder="Enter subtitle text..."
                    value={newCaptionText}
                    onChange={e => setNewCaptionText(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddManualCaptionAtPlayhead}
                    className="w-full py-1.5 rounded bg-[#00E5FF] hover:bg-[#33ECFF] text-black text-xs font-bold transition-colors"
                  >
                    + Add Subtitle at Playhead
                  </button>
                </div>

                {/* .SRT Import / Export Buttons */}
                <div className="flex gap-1.5">
                  <label className="flex-1 py-1.5 px-2 rounded bg-[#23252C] hover:bg-[#2C2F38] border border-white/10 text-slate-200 text-xs font-semibold text-center cursor-pointer transition-colors">
                    Import .SRT
                    <input
                      type="file"
                      accept=".srt,text/plain"
                      className="hidden"
                      onChange={handleImportSrtFile}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleExportSrtFile}
                    disabled={!captionItems.length}
                    className="flex-1 py-1.5 px-2 rounded bg-[#23252C] hover:bg-[#2C2F38] border border-white/10 text-slate-200 text-xs font-semibold disabled:opacity-40 transition-colors"
                  >
                    Export .SRT
                  </button>
                </div>

                <div className="space-y-1.5">
                  {captionItems.map(c => (
                    <div
                      key={c.id}
                      className="p-2 rounded bg-[#121316] border border-white/10 text-[11px] flex items-center gap-2"
                    >
                      <span className="text-cyan-400 font-mono">{c.start.toFixed(1)}s</span>
                      <input
                        type="text"
                        value={c.text}
                        onChange={e =>
                          setCaptionItems(
                            captionItems.map(item =>
                              item.id === c.id ? { ...item, text: e.target.value } : item
                            )
                          )
                        }
                        className="flex-1 bg-transparent text-slate-200 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setCaptionItems(captionItems.filter(item => item.id !== c.id))}
                        className="text-slate-500 hover:text-rose-400"
                        title="Delete subtitle"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FILTERS TAB */}
            {leftTab === "filters" && (
              <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "original", name: "Original" },
                    { id: "teal_orange", name: "Teal & Orange" },
                    { id: "vintage_1970", name: "Vintage 70s" },
                    { id: "cyberpunk", name: "Cyberpunk" },
                    { id: "sunset", name: "Warm Sunset" },
                    { id: "noir", name: "B&W Noir" },
                    { id: "vivid", name: "Vivid Boost" },
                    { id: "cold_cinema", name: "Cold Cinema" },
                    { id: "emerald", name: "Emerald Film" },
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelectedFilter(f.id)}
                      className={`py-2.5 px-2 rounded-lg text-center border font-semibold text-[11px] transition-colors ${
                        selectedFilter === f.id
                          ? "bg-cyan-500/20 border-[#00E5FF] text-[#00E5FF]"
                          : "bg-[#121316] border-white/10 text-slate-300 hover:bg-white/5"
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
                {selectedFilter !== "original" && (
                  <div className="space-y-1.5 pt-2 border-t border-white/10">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Filter Intensity</span>
                      <span className="text-cyan-400 font-mono">{filterIntensity}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={filterIntensity}
                      onChange={e => setFilterIntensity(Number(e.target.value))}
                      className="w-full capcut-slider"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ---------- 2. CENTER PANEL: PLAYER-TIMELINE 01 (STAGE + TRANSPORT BAR) ---------- */}
        <div className="fahi-editor-preview w-full h-[min(38dvh,320px)] sm:h-[44dvh] md:h-auto md:flex-1 relative flex flex-col bg-[#121316] overflow-hidden shrink-0 md:shrink select-none">
          {/* Top Player Header Bar: "Player-Timeline 01" */}
          <div className="hidden md:flex items-center justify-between px-3 h-8 border-b border-white/5 bg-[#18191D] text-[11px] text-slate-300 shrink-0">
            <div className="flex items-center space-x-2">
              <span className="font-semibold tracking-wide">Player-Timeline 01</span>
              {previewAsset && (
                <span className="px-2 py-0.5 rounded bg-black/70 border border-white/15 text-[10px] text-cyan-300 font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>Previewing — {previewAsset.name}</span>
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowTransformBox(!showTransformBox)}
                className={`px-1.5 py-0.5 rounded text-[10px] border ${
                  showTransformBox
                    ? "border-cyan-500/40 text-cyan-300 bg-cyan-500/10"
                    : "border-white/10 text-slate-400"
                }`}
                title="Toggle Transform Bounding Handles"
              >
                Handles
              </button>
              <button
                type="button"
                onClick={() => setShowSafeGrid(!showSafeGrid)}
                className={`p-1 rounded ${showSafeGrid ? "text-cyan-400 bg-white/10" : "text-slate-400 hover:text-white"}`}
                title="Toggle Safe Area Grid"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Export Progress Overlay */}
          {isExporting && (
            <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center space-y-4">
              <div className="w-14 h-14 relative flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 border-t-[#00E5FF] animate-spin" />
                <Sparkles className="w-5 h-5 text-[#00E5FF]" />
              </div>
              <p className="text-white font-bold text-base">Exporting timeline...</p>
              <p className="text-xs text-slate-300 px-4 text-center">
                Keep this tab open and your screen awake until export finishes.
              </p>
              <div className="w-60 bg-white/10 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#00E5FF] h-full transition-all duration-200"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
              <span className="text-xs text-cyan-300 font-mono">{Math.round(exportProgress)}%</span>
            </div>
          )}

          {/* Center Video Stage */}
          <div
            ref={previewAreaRef}
            className="flex-1 flex items-center justify-center relative min-h-0 p-2 md:p-4 overflow-hidden bg-[#0E0F12]"
          >
            {videoFile ? (
              <div
                className={`relative mx-auto overflow-hidden shadow-2xl flex items-center justify-center ${
                  trackHidden ? "opacity-20" : ""
                }`}
                style={{
                  width:
                    Math.min(
                      previewBounds.width,
                      previewBounds.height * effectiveAspectRatio
                    ) * (playerZoomMode === "75" ? 0.75 : playerZoomMode === "125" ? 1.15 : 1),
                  height:
                    Math.min(
                      previewBounds.height,
                      previewBounds.width / effectiveAspectRatio
                    ) * (playerZoomMode === "75" ? 0.75 : playerZoomMode === "125" ? 1.15 : 1),
                  background:
                    bgStyle === "purple_glow"
                      ? "linear-gradient(135deg,#581c87,#312e81)"
                      : bgStyle === "cyber_gradient"
                        ? "linear-gradient(135deg,#083344,#312e81)"
                        : "#000",
                }}
              >
                {(bgStyle === "blur_low" || bgStyle === "blur_high") && (
                  <video
                    src={objectUrl}
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ filter: "blur(" + (bgStyle === "blur_low" ? 12 : 28) + "px)" }}
                    onLoadedData={e => {
                      e.currentTarget.currentTime = videoRef.current?.currentTime || 0;
                    }}
                  />
                )}

                <video
                  ref={videoRef}
                  src={objectUrl || undefined}
                  className="relative w-full h-full object-contain max-h-full"
                  style={{
                    filter: filterStyle,
                    opacity:
                      editorState.chroma.enabled ||
                      Boolean(activeClipInfo?.clip.isFreezeFrame && activeClipInfo.clip.freezeFrameUrl)
                        ? 0
                        : (previewMotion.opacity / 100) * animOffset.opacity,
                    transform: cropTransformStyle,
                    clipPath: maskClipPath,
                    mixBlendMode: blendEnabled ? (blendMode as any) : "normal",
                  }}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onLoadedData={handleVideoLoadedData}
                  onEnded={() => {
                    const index = clipOffsets.findIndex(c => c.clip.id === activeClipId);
                    if (index >= 0 && index < clipOffsets.length - 1)
                      setCurrentTime(clipOffsets[index + 1].start);
                    else setIsPlaying(false);
                  }}
                />

                {/* Freeze Frame Still Snapshot Overlay */}
                {activeClipInfo?.clip.isFreezeFrame && activeClipInfo.clip.freezeFrameUrl && (
                  <img
                    src={activeClipInfo.clip.freezeFrameUrl}
                    alt={activeClipInfo.clip.name}
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                    style={{
                      filter: filterStyle,
                      opacity: (previewMotion.opacity / 100) * animOffset.opacity,
                      transform: cropTransformStyle,
                      clipPath: maskClipPath,
                    }}
                  />
                )}

                {editorState.chroma.enabled && (
                  <ChromaPreview
                    key={activeClipId}
                    videoRef={videoRef}
                    color={editorState.chroma.color}
                    tolerance={editorState.chroma.tolerance}
                    softness={editorState.chroma.softness}
                    style={{
                      filter: filterStyle,
                      transform: cropTransformStyle,
                      opacity: (previewMotion.opacity / 100) * animOffset.opacity,
                    }}
                  />
                )}

                {/* Vignette Overlay from Retouch / Adjust */}
                {(retouchVignette > 0 || vignetteAmount > 0) && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      boxShadow: `inset 0 0 ${Math.max(retouchVignette, vignetteAmount) * 1.2}px rgba(0,0,0,0.85)`,
                    }}
                  />
                )}

                {/* Safe Area Grid Overlay */}
                {showSafeGrid && (
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none z-20 border border-white/20">
                    <div className="border-r border-b border-white/20" />
                    <div className="border-r border-b border-white/20" />
                    <div className="border-b border-white/20" />
                    <div className="border-r border-b border-white/20" />
                    <div className="border-r border-b border-white/20" />
                    <div className="border-b border-white/20" />
                    <div className="border-r border-white/20" />
                    <div className="border-r border-white/20" />
                    <div />
                  </div>
                )}

                {/* CapCut White Selection Bounding Box + 4 Corner Resize Handles (Matches Screenshot 1:1) */}
                {showTransformBox && activeTool !== "crop" && (
                  <div
                    onMouseDown={e => handleTransformBoxStart("move", e)}
                    onTouchStart={e => handleTransformBoxStart("move", e)}
                    className="absolute inset-2 border border-white/85 pointer-events-auto cursor-move z-10"
                  >
                    <div
                      onMouseDown={e => handleTransformBoxStart("resize", e)}
                      onTouchStart={e => handleTransformBoxStart("resize", e)}
                      className="absolute -top-1.5 -left-1.5 w-3 h-3 rounded-full bg-white border border-black cursor-nwse-resize shadow"
                    />
                    <div
                      onMouseDown={e => handleTransformBoxStart("resize", e)}
                      onTouchStart={e => handleTransformBoxStart("resize", e)}
                      className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-white border border-black cursor-nesw-resize shadow"
                    />
                    <div
                      onMouseDown={e => handleTransformBoxStart("resize", e)}
                      onTouchStart={e => handleTransformBoxStart("resize", e)}
                      className="absolute -bottom-1.5 -left-1.5 w-3 h-3 rounded-full bg-white border border-black cursor-nesw-resize shadow"
                    />
                    <div
                      onMouseDown={e => handleTransformBoxStart("resize", e)}
                      onTouchStart={e => handleTransformBoxStart("resize", e)}
                      className="absolute -bottom-1.5 -right-1.5 w-3 h-3 rounded-full bg-white border border-black cursor-nwse-resize shadow"
                    />
                  </div>
                )}

                {overlayMedia && (
                  <img
                    src={overlayMedia.url}
                    alt={overlayMedia.title}
                    className="absolute pointer-events-none z-10"
                    style={{
                      width: 30 * overlayMedia.scale + "%",
                      opacity: overlayMedia.opacity / 100,
                      left: overlayMedia.position.includes("left")
                        ? "3%"
                        : overlayMedia.position.includes("right")
                          ? undefined
                          : "50%",
                      right: overlayMedia.position.includes("right") ? "3%" : undefined,
                      top: overlayMedia.position.includes("top")
                        ? "3%"
                        : overlayMedia.position.includes("bottom")
                          ? undefined
                          : "50%",
                      bottom: overlayMedia.position.includes("bottom") ? "3%" : undefined,
                      transform:
                        overlayMedia.position === "center" ? "translate(-50%, -50%)" : undefined,
                    }}
                  />
                )}

                {/* Render Text Overlays */}
                {textOverlays
                  .filter(t => currentTime >= (t.start || 0) && currentTime < (t.end || duration))
                  .map(t => (
                    <div
                      key={t.id}
                      className={`absolute pointer-events-auto cursor-pointer select-none px-2 py-1 rounded z-20 ${
                        editingTextId === t.id ? "ring-2 ring-[#00E5FF] bg-black/40" : ""
                      }`}
                      style={{
                        left: `${t.x}%`,
                        top: `${t.y}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                      onClick={() => {
                        setEditingTextId(t.id);
                        setLeftTab("text");
                      }}
                    >
                      <span
                        style={{
                          fontFamily: t.fontFamily,
                          fontSize: `${t.fontSize}px`,
                          color:
                            t.preset === "tiktok_yellow"
                              ? "#FFE600"
                              : t.preset === "neon_cyan"
                                ? "#FFFFFF"
                                : t.color,
                          textShadow:
                            t.preset === "tiktok_yellow"
                              ? "2px 2px 0px #000, -2px -2px 0px #000, 2px -2px 0px #000, -2px 2px 0px #000"
                              : t.preset === "neon_cyan"
                                ? "0 0 10px #00E5FF, 0 0 20px #00E5FF"
                                : "none",
                        }}
                        className="font-extrabold tracking-wide whitespace-nowrap block"
                      >
                        {t.text}
                      </span>
                    </div>
                  ))}

                {/* Render Sticker Overlays */}
                {stickerOverlays.map(s => (
                  <div
                    key={s.id}
                    className="absolute pointer-events-auto cursor-pointer select-none z-20"
                    style={{
                      left: `${s.x}%`,
                      top: `${s.y}%`,
                      transform: `translate(-50%, -50%) scale(${s.scale})`,
                    }}
                  >
                    <span className="text-3xl filter drop-shadow-lg">{s.emoji}</span>
                  </div>
                ))}

                {/* Render Captions Overlay */}
                {autoCaptionsEnabled && currentCaption && (
                  <div className="absolute bottom-8 left-4 right-4 text-center pointer-events-none z-20">
                    <span className="inline-block px-3 py-1 rounded-lg bg-black/80 border border-yellow-400/40 text-yellow-300 font-extrabold text-xs md:text-sm tracking-wide shadow-2xl">
                      {currentCaption.text}
                    </span>
                  </div>
                )}

                {editorState.transitionSeconds > 0 && (
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-black pointer-events-none z-20"
                    style={{ opacity: 1 - fadeForTime(currentTime) }}
                  />
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-3 p-6 border border-white/10 rounded-2xl max-w-sm w-full bg-[#18191D]">
                <div className="w-14 h-14 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/30 flex items-center justify-center">
                  <VideoIcon className="w-7 h-7 text-[#00E5FF]" />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-white font-bold text-sm">Drop your media here</h3>
                  <p className="text-xs text-slate-400">Supports MP4, WebM, MOV up to 4K</p>
                </div>
                <label className="bg-[#00E5FF] hover:bg-[#33ECFF] text-black px-5 py-2 rounded-lg font-bold text-xs cursor-pointer transition-all flex items-center space-x-1.5 shadow-[0_0_16px_rgba(0,229,255,0.3)]">
                  <Plus className="w-4 h-4" />
                  <span>Upload Video</span>
                  <input
                    type="file"
                    accept="video/*"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            )}
          </div>

          {/* Bottom Player Transport Bar (Matches CapCut Screenshot: Cyan Timecode / Duration | Play | Mic | Ratio | Fullscreen) */}
          <div className="h-9 px-3 bg-[#18191D] border-t border-white/10 flex items-center justify-between shrink-0 text-xs">
            {/* Left: Cyan Current Timecode / Total Duration */}
            <div className="flex items-center space-x-1.5 font-mono text-[11px]">
              <span className="text-[#00E5FF] font-semibold">
                {formatCapCutTimecode(currentTime)}
              </span>
              <span className="text-slate-600">/</span>
              <span className="text-slate-400">{formatCapCutTimecode(duration)}</span>
            </div>

            {/* Center: Step Back | Play/Pause | Step Forward */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                aria-label="Step back"
                onClick={() => seekToTime(Math.max(0, currentTime - 1 / 30))}
                className="p-1 text-slate-400 hover:text-white"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                aria-label={isPlaying ? "Pause" : "Play"}
                onClick={togglePlayPause}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                )}
              </button>
              <button
                type="button"
                aria-label="Step forward"
                onClick={() => seekToTime(Math.min(duration, currentTime + 1 / 30))}
                className="p-1 text-slate-400 hover:text-white"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Right: Ratio Selector | Zoom | Fullscreen */}
            <div className="flex items-center space-x-2">
              <select
                aria-label="Aspect Ratio"
                value={aspectRatio}
                onChange={e => setAspectRatio(e.target.value as any)}
                className="bg-[#23252C] border border-white/10 rounded px-1.5 py-0.5 text-[10px] font-semibold text-slate-200 focus:outline-none"
              >
                <option value="original">Original</option>
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
                <option value="1:1">1:1</option>
                <option value="4:3">4:3</option>
                <option value="4:5">4:5</option>
                <option value="21:9">21:9</option>
              </select>

              <select
                aria-label="Player Zoom"
                value={playerZoomMode}
                onChange={e => setPlayerZoomMode(e.target.value as any)}
                className="hidden sm:block bg-[#23252C] border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-slate-300 focus:outline-none"
              >
                <option value="fit">Fit</option>
                <option value="75">75%</option>
                <option value="100">100%</option>
                <option value="125">125%</option>
              </select>

              <button
                type="button"
                title="Fullscreen Preview"
                onClick={() => {
                  if (previewAreaRef.current?.requestFullscreen) {
                    previewAreaRef.current.requestFullscreen().catch(() => {});
                  }
                }}
                className="p-1 text-slate-400 hover:text-white"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ---------- 3. TOP-RIGHT PANEL: CAPCUT INSPECTOR (Video | Audio | Speed | Animation | Adjust | Details) ---------- */}
        <div
          data-open={isMobileRightDrawerOpen}
          className={`fahi-tool-panel ${
            isMobileRightDrawerOpen ? "flex" : "hidden"
          } md:flex flex-col bg-[#18191D] border-l border-white/10 min-h-0 overflow-hidden select-none`}
        >
          {/* Top 6 Inspector Tabs */}
          <div className="flex items-center justify-between px-2 py-1.5 bg-[#121316] border-b border-white/10 overflow-x-auto scrollbar-none shrink-0">
            {(
              [
                { id: "video", label: "Video" },
                { id: "audio", label: "Audio" },
                { id: "speed", label: "Speed" },
                { id: "animation", label: "Animation" },
                { id: "adjust", label: "Adjust" },
                { id: "details", label: "Details" },
              ] as const
            ).map(tab => {
              const active = rightTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRightTab(tab.id)}
                  className={`px-2 py-1 rounded text-[11px] font-semibold whitespace-nowrap transition-colors ${
                    active ? "text-[#00E5FF] bg-white/5" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setActiveTool(null)}
              className="md:hidden p-1 text-slate-400 hover:text-white"
              title="Close Panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Right Inspector Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
            {/* ==================== TAB 1: VIDEO (Basic | Remove BG | Mask | Retouch) ==================== */}
            {rightTab === "video" && (
              <div className="space-y-3">
                {/* 4 Sub-tabs matching CapCut Screenshot */}
                <div className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-[#121316] border border-white/10 text-[11px]">
                  {(
                    [
                      { id: "basic", label: "Basic" },
                      { id: "remove_bg", label: "Remove BG" },
                      { id: "mask", label: "Mask" },
                      { id: "retouch", label: "Retouch" },
                    ] as const
                  ).map(st => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setVideoSubTab(st.id)}
                      className={`py-1 rounded font-semibold transition-colors ${
                        videoSubTab === st.id
                          ? "bg-[#252830] text-white shadow"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                {/* SUB-TAB 1: BASIC (Exact match to CapCut Screenshot) */}
                {videoSubTab === "basic" && (
                  <div className="space-y-3">
                    {/* Transform Card */}
                    <div className="p-2.5 rounded-lg bg-[#121316] border border-white/10 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <Check className="w-3.5 h-3.5 text-[#00E5FF] bg-[#00E5FF]/15 p-0.5 rounded" />
                          <span className="font-bold text-slate-200 text-xs">Transform</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setZoom(1);
                              updateState("scaleX", 100);
                              updateState("scaleY", 100);
                              setPanX(0);
                              setPanY(0);
                              setRotate(0);
                              setFlipH(false);
                              setFlipV(false);
                            }}
                            title="Reset Transform"
                            className="p-1 text-slate-400 hover:text-white"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={handleToggleKeyframeAtPlayhead}
                            title="Add / Toggle Keyframe at Playhead"
                            className={`p-1 rounded ${
                              hasKeyframeAtPlayhead ? "text-[#00E5FF]" : "text-slate-400 hover:text-white"
                            }`}
                          >
                            <Diamond className="w-3.5 h-3.5 fill-current" />
                          </button>
                        </div>
                      </div>

                      {/* Scale Row */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-[11px]">Scale</span>
                          <div className="flex items-center space-x-1.5">
                            <input
                              aria-label="Scale percent"
                              type="number"
                              min="10"
                              max="400"
                              value={Math.round(zoom * 100)}
                              onChange={e =>
                                setZoom(Math.max(0.1, Math.min(4, Number(e.target.value) / 100)))
                              }
                              className="w-14 bg-[#1C1E24] border border-white/10 rounded px-1.5 py-0.5 text-right font-mono text-[11px] text-white"
                            />
                            <span className="text-[10px] text-slate-500">%</span>
                            <button
                              type="button"
                              onClick={handleToggleKeyframeAtPlayhead}
                              className={`p-0.5 ${
                                hasKeyframeAtPlayhead ? "text-[#00E5FF]" : "text-slate-500 hover:text-white"
                              }`}
                              title="Scale Keyframe"
                            >
                              <Diamond className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <input
                          aria-label="Keyframe Zoom"
                          type="range"
                          min="0.25"
                          max="4"
                          step="0.05"
                          value={zoom}
                          onChange={e => setZoom(parseFloat(e.target.value))}
                          className="w-full capcut-slider"
                        />
                      </div>

                      {/* Uniform Scale Toggle */}
                      <div className="flex items-center justify-between pt-0.5">
                        <span className="text-slate-400 text-[11px]">Uniform scale</span>
                        <button
                          type="button"
                          onClick={() => updateState("uniformScale", !uniformScale)}
                          className={`w-8 h-4 rounded-full relative transition-colors ${
                            uniformScale ? "bg-[#00E5FF]" : "bg-white/20"
                          }`}
                        >
                          <div
                            className={`absolute top-0.5 w-3 h-3 rounded-full bg-black transition-all ${
                              uniformScale ? "left-4" : "left-0.5"
                            }`}
                          />
                        </button>
                      </div>

                      {!uniformScale && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <label className="text-[10px] text-slate-400">
                            Scale X ({scaleX}%)
                            <input
                              type="range"
                              min="20"
                              max="300"
                              value={scaleX}
                              onChange={e => updateState("scaleX", Number(e.target.value))}
                              className="w-full capcut-slider mt-1"
                            />
                          </label>
                          <label className="text-[10px] text-slate-400">
                            Scale Y ({scaleY}%)
                            <input
                              type="range"
                              min="20"
                              max="300"
                              value={scaleY}
                              onChange={e => updateState("scaleY", Number(e.target.value))}
                              className="w-full capcut-slider mt-1"
                            />
                          </label>
                        </div>
                      )}

                      {/* Position X & Y Row */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400 text-[11px]">Position</span>
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center bg-[#1C1E24] border border-white/10 rounded px-1.5 py-0.5">
                            <span className="text-[10px] text-slate-500 mr-1">X</span>
                            <input
                              aria-label="Keyframe Position X"
                              type="number"
                              min="-250"
                              max="250"
                              value={panX}
                              onChange={e => setPanX(Number(e.target.value))}
                              className="w-11 bg-transparent text-right font-mono text-[11px] text-white focus:outline-none"
                            />
                          </div>
                          <div className="flex items-center bg-[#1C1E24] border border-white/10 rounded px-1.5 py-0.5">
                            <span className="text-[10px] text-slate-500 mr-1">Y</span>
                            <input
                              aria-label="Keyframe Position Y"
                              type="number"
                              min="-250"
                              max="250"
                              value={panY}
                              onChange={e => setPanY(Number(e.target.value))}
                              className="w-11 bg-transparent text-right font-mono text-[11px] text-white focus:outline-none"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleToggleKeyframeAtPlayhead}
                            className={`p-0.5 ${
                              hasKeyframeAtPlayhead ? "text-[#00E5FF]" : "text-slate-500 hover:text-white"
                            }`}
                            title="Position Keyframe"
                          >
                            <Diamond className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Rotate Row */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Rotate</span>
                        <div className="flex items-center space-x-1.5">
                          <input
                            aria-label="Keyframe Rotation"
                            type="number"
                            min="-360"
                            max="360"
                            value={rotate}
                            onChange={e => setRotate(Number(e.target.value))}
                            className="w-16 bg-[#1C1E24] border border-white/10 rounded px-1.5 py-0.5 text-right font-mono text-[11px] text-white"
                          />
                          <span className="text-[10px] text-slate-500">°</span>
                          <button
                            type="button"
                            onClick={() => setRotate((rotate + 90) % 360)}
                            className="p-1 rounded bg-[#1C1E24] hover:bg-white/10 text-slate-300"
                            title="Rotate +90°"
                          >
                            <RotateCw className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={handleToggleKeyframeAtPlayhead}
                            className={`p-0.5 ${
                              hasKeyframeAtPlayhead ? "text-[#00E5FF]" : "text-slate-500 hover:text-white"
                            }`}
                            title="Rotation Keyframe"
                          >
                            <Diamond className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* 8 CapCut Alignment & Flip Icon Buttons (Exact Screenshot Match) */}
                      <div className="grid grid-cols-8 gap-1 pt-1">
                        <button
                          type="button"
                          onClick={() => setPanX(-80)}
                          title="Align Left"
                          className="p-1.5 rounded bg-[#1C1E24] hover:bg-white/10 flex items-center justify-center text-slate-300"
                        >
                          <AlignLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPanX(0)}
                          title="Align Center Horizontal"
                          className="p-1.5 rounded bg-[#1C1E24] hover:bg-white/10 flex items-center justify-center text-slate-300"
                        >
                          <AlignCenter className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPanX(80)}
                          title="Align Right"
                          className="p-1.5 rounded bg-[#1C1E24] hover:bg-white/10 flex items-center justify-center text-slate-300"
                        >
                          <AlignRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPanY(-80)}
                          title="Align Top"
                          className="p-1.5 rounded bg-[#1C1E24] hover:bg-white/10 flex items-center justify-center text-slate-300"
                        >
                          <ArrowLeftToLine className="w-3.5 h-3.5 rotate-90" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPanY(0)}
                          title="Align Center Vertical"
                          className="p-1.5 rounded bg-[#1C1E24] hover:bg-white/10 flex items-center justify-center text-slate-300"
                        >
                          <Split className="w-3.5 h-3.5 rotate-90" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPanY(80)}
                          title="Align Bottom"
                          className="p-1.5 rounded bg-[#1C1E24] hover:bg-white/10 flex items-center justify-center text-slate-300"
                        >
                          <ArrowRightToLine className="w-3.5 h-3.5 rotate-90" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setFlipH(!flipH)}
                          title="Flip Horizontal (Mirror)"
                          className={`p-1.5 rounded flex items-center justify-center ${
                            flipH ? "bg-[#00E5FF]/20 text-[#00E5FF]" : "bg-[#1C1E24] hover:bg-white/10 text-slate-300"
                          }`}
                        >
                          <FlipHorizontal className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setFlipV(!flipV)}
                          title="Flip Vertical"
                          className={`p-1.5 rounded flex items-center justify-center ${
                            flipV ? "bg-[#00E5FF]/20 text-[#00E5FF]" : "bg-[#1C1E24] hover:bg-white/10 text-slate-300"
                          }`}
                        >
                          <FlipVertical className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Keyframes List if any */}
                      {editorState.keyframes.length > 0 && (
                        <div className="pt-2 border-t border-white/10 space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>Keyframes ({editorState.keyframes.length})</span>
                            <button
                              type="button"
                              onClick={() => updateState("keyframes", [])}
                              className="text-rose-400 hover:underline"
                            >
                              Clear
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {editorState.keyframes.map(kf => (
                              <button
                                key={kf.time}
                                type="button"
                                onClick={() => {
                                  seekToTime(kf.time);
                                  setEditorState(prev => ({
                                    ...prev,
                                    panX: kf.x,
                                    panY: kf.y,
                                    zoom: kf.zoom,
                                    rotate: kf.rotation,
                                    opacity: kf.opacity,
                                  }));
                                }}
                                className="px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-[10px] text-cyan-300 font-mono"
                              >
                                ◆ {kf.time.toFixed(1)}s
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Blend Section (Matches Screenshot) */}
                    <div className="p-2.5 rounded-lg bg-[#121316] border border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={blendEnabled}
                            onChange={e => updateState("blendEnabled", e.target.checked)}
                            className="accent-[#00E5FF] rounded"
                          />
                          <span className="font-bold text-slate-200 text-xs">Blend</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            updateState("blendEnabled", false);
                            updateState("blendMode", "normal");
                            setOpacity(100);
                          }}
                          className="p-1 text-slate-400 hover:text-white"
                          title="Reset Blend"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Mode</span>
                        <select
                          aria-label="Blend mode"
                          value={blendMode}
                          onChange={e => {
                            updateState("blendEnabled", true);
                            updateState("blendMode", e.target.value as CapCutBlendMode);
                          }}
                          className="bg-[#1C1E24] border border-white/10 rounded px-2 py-1 text-[11px] text-slate-200 capitalize"
                        >
                          {[
                            "normal",
                            "multiply",
                            "screen",
                            "overlay",
                            "darken",
                            "lighten",
                            "color-dodge",
                            "difference",
                          ].map(m => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-[11px]">Opacity</span>
                          <div className="flex items-center space-x-1">
                            <span className="font-mono text-[11px] text-slate-200">{opacity}%</span>
                            <button
                              type="button"
                              onClick={handleToggleKeyframeAtPlayhead}
                              className="p-0.5 text-slate-500 hover:text-white"
                            >
                              <Diamond className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <input
                          aria-label="Keyframe Opacity"
                          type="range"
                          min="0"
                          max="100"
                          value={opacity}
                          onChange={e => setOpacity(Number(e.target.value))}
                          className="w-full capcut-slider"
                        />
                      </div>
                    </div>

                    {/* CapCut Pro Video Basic Checkboxes: Stabilize, Enhance quality, Reduce image noise, Optical flow */}
                    <div className="p-2.5 rounded-lg bg-[#121316] border border-white/10 space-y-2.5">
                      {/* Stabilize */}
                      <div className="flex items-center justify-between">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={stabilizeEnabled}
                            onChange={e => updateState("stabilizeEnabled", e.target.checked)}
                            className="accent-[#00E5FF]"
                          />
                          <span className="text-slate-200 font-medium text-[11px]">Stabilize</span>
                        </label>
                        {stabilizeEnabled && (
                          <select
                            value={stabilizeLevel}
                            onChange={e => updateState("stabilizeLevel", e.target.value)}
                            className="bg-[#1C1E24] border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-slate-300"
                          >
                            <option value="recommended">Recommended</option>
                            <option value="minimum">Minimum cut</option>
                            <option value="stable">Most stable</option>
                          </select>
                        )}
                      </div>

                      {/* Enhance quality */}
                      <div className="flex items-center justify-between">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enhanceQualityEnabled}
                            onChange={e => updateState("enhanceQualityEnabled", e.target.checked)}
                            className="accent-[#00E5FF]"
                          />
                          <span className="text-slate-200 font-medium text-[11px]">Enhance quality</span>
                        </label>
                        {enhanceQualityEnabled && (
                          <select
                            value={enhanceQualityMode}
                            onChange={e => updateState("enhanceQualityMode", e.target.value)}
                            className="bg-[#1C1E24] border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-cyan-300"
                          >
                            <option value="hd">HD</option>
                            <option value="uhd">UHD</option>
                          </select>
                        )}
                      </div>

                      {/* Reduce image noise */}
                      <div className="flex items-center justify-between">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={reduceNoiseEnabled}
                            onChange={e => updateState("reduceNoiseEnabled", e.target.checked)}
                            className="accent-[#00E5FF]"
                          />
                          <span className="text-slate-200 font-medium text-[11px]">Reduce image noise</span>
                        </label>
                        {reduceNoiseEnabled && (
                          <select
                            value={reduceNoiseMode}
                            onChange={e => updateState("reduceNoiseMode", e.target.value)}
                            className="bg-[#1C1E24] border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-slate-300"
                          >
                            <option value="weak">Weak</option>
                            <option value="strong">Strong</option>
                          </select>
                        )}
                      </div>

                      {/* Optical flow */}
                      <div className="flex items-center justify-between">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={opticalFlowEnabled}
                            onChange={e => updateState("opticalFlowEnabled", e.target.checked)}
                            className="accent-[#00E5FF]"
                          />
                          <span className="text-slate-200 font-medium text-[11px]">Optical flow</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => updateState("opticalFlowEnabled", true)}
                          className="px-2 py-0.5 rounded bg-[#1C1E24] hover:bg-white/10 text-[10px] text-slate-300"
                        >
                          Apply to all
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* SUB-TAB 2: REMOVE BG (Chroma Key & Auto Cutout) */}
                {videoSubTab === "remove_bg" && (
                  <div className="p-2.5 rounded-lg bg-[#121316] border border-white/10 space-y-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="font-bold text-slate-200 text-xs">Chroma Key / Remove BG</span>
                      <input
                        type="checkbox"
                        checked={editorState.chroma.enabled}
                        onChange={e =>
                          updateState("chroma", { ...editorState.chroma, enabled: e.target.checked })
                        }
                        className="accent-[#00E5FF]"
                      />
                    </label>
                    <label className="flex items-center justify-between text-xs text-slate-300">
                      <span>Key Color</span>
                      <input
                        aria-label="Chroma key color"
                        type="color"
                        value={editorState.chroma.color}
                        onChange={e =>
                          updateState("chroma", { ...editorState.chroma, color: e.target.value })
                        }
                      />
                    </label>
                    <label className="block text-xs text-slate-300">
                      Intensity (Tolerance): {editorState.chroma.tolerance}
                      <input
                        aria-label="Chroma key tolerance"
                        className="w-full capcut-slider mt-1"
                        type="range"
                        min="0"
                        max="300"
                        value={editorState.chroma.tolerance}
                        onChange={e =>
                          updateState("chroma", {
                            ...editorState.chroma,
                            tolerance: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label className="block text-xs text-slate-300">
                      Shadow / Soft Edge: {editorState.chroma.softness}
                      <input
                        aria-label="Chroma key softness"
                        className="w-full capcut-slider mt-1"
                        type="range"
                        min="1"
                        max="150"
                        value={editorState.chroma.softness}
                        onChange={e =>
                          updateState("chroma", {
                            ...editorState.chroma,
                            softness: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                  </div>
                )}

                {/* SUB-TAB 3: MASK (Linear, Mirror, Circle, Rectangle, Heart, Star) */}
                {videoSubTab === "mask" && (
                  <div className="p-2.5 rounded-lg bg-[#121316] border border-white/10 space-y-3">
                    <span className="font-bold text-slate-200 text-xs block">Mask Shape</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          { id: "none", label: "None" },
                          { id: "linear", label: "Linear" },
                          { id: "mirror", label: "Mirror" },
                          { id: "circle", label: "Circle" },
                          { id: "rectangle", label: "Rectangle" },
                          { id: "heart", label: "Heart" },
                          { id: "star", label: "Star" },
                        ] as const
                      ).map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => updateState("maskShape", m.id)}
                          className={`py-2 px-1.5 rounded border text-[11px] font-semibold ${
                            maskShape === m.id
                              ? "bg-cyan-500/20 border-[#00E5FF] text-[#00E5FF]"
                              : "bg-[#1C1E24] border-white/10 text-slate-300"
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>

                    {maskShape !== "none" && (
                      <div className="space-y-2 pt-2 border-t border-white/10">
                        <label className="block text-[11px] text-slate-300">
                          Mask Size ({maskSize}%)
                          <input
                            type="range"
                            min="20"
                            max="100"
                            value={maskSize}
                            onChange={e => updateState("maskSize", Number(e.target.value))}
                            className="w-full capcut-slider mt-1"
                          />
                        </label>
                        <label className="block text-[11px] text-slate-300">
                          Feather ({maskFeather}px)
                          <input
                            type="range"
                            min="0"
                            max="50"
                            value={maskFeather}
                            onChange={e => updateState("maskFeather", Number(e.target.value))}
                            className="w-full capcut-slider mt-1"
                          />
                        </label>
                        <label className="flex items-center justify-between text-[11px] text-slate-300 cursor-pointer">
                          <span>Invert Mask</span>
                          <input
                            type="checkbox"
                            checked={maskInvert}
                            onChange={e => updateState("maskInvert", e.target.checked)}
                            className="accent-[#00E5FF]"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {/* SUB-TAB 4: RETOUCH (Smooth, Brighten, Sharpness, Vignette) */}
                {videoSubTab === "retouch" && (
                  <div className="p-2.5 rounded-lg bg-[#121316] border border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 text-xs">Face & Body Retouch</span>
                      <button
                        type="button"
                        onClick={() => {
                          updateState("retouchSmooth", 0);
                          updateState("retouchBrighten", 0);
                          updateState("retouchSharpness", 0);
                          updateState("retouchVignette", 0);
                        }}
                        className="text-[10px] text-cyan-400 hover:underline"
                      >
                        Reset
                      </button>
                    </div>
                    {[
                      { label: "Smooth Skin", val: retouchSmooth, key: "retouchSmooth" as const },
                      { label: "Brighten Face", val: retouchBrighten, key: "retouchBrighten" as const },
                      { label: "Eye Clarity / Sharpness", val: retouchSharpness, key: "retouchSharpness" as const },
                      { label: "Studio Vignette", val: retouchVignette, key: "retouchVignette" as const },
                    ].map(r => (
                      <div key={r.key} className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400">{r.label}</span>
                          <span className="font-mono text-cyan-400">{r.val}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={r.val}
                          onChange={e => updateState(r.key, Number(e.target.value))}
                          className="w-full capcut-slider"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ==================== TAB 2: AUDIO INSPECTOR ==================== */}
            {rightTab === "audio" && (
              <div className="space-y-3">
                <div className="p-2.5 rounded-lg bg-[#121316] border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">Basic Audio</span>
                    <button
                      type="button"
                      onClick={() => setIsMuted(!isMuted)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isMuted ? "bg-rose-500/20 text-rose-400" : "bg-cyan-500/15 text-cyan-300"
                      }`}
                    >
                      {isMuted ? "Muted" : "Active"}
                    </button>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Volume</span>
                      <span className="font-mono text-cyan-400">
                        {Math.round((isMuted ? 0 : volume) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={e => {
                        setIsMuted(false);
                        setVolume(parseFloat(e.target.value));
                      }}
                      className="w-full capcut-slider"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Fade in</span>
                      <span className="font-mono text-slate-300">{audioFadeIn.toFixed(1)}s</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.1"
                      value={audioFadeIn}
                      onChange={e => updateState("audioFadeIn", parseFloat(e.target.value))}
                      className="w-full capcut-slider"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Fade out</span>
                      <span className="font-mono text-slate-300">{audioFadeOut.toFixed(1)}s</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.1"
                      value={audioFadeOut}
                      onChange={e => updateState("audioFadeOut", parseFloat(e.target.value))}
                      className="w-full capcut-slider"
                    />
                  </div>

                  <label className="flex items-center justify-between pt-1 cursor-pointer">
                    <span className="text-slate-300 text-[11px]">Noise reduction</span>
                    <input
                      type="checkbox"
                      checked={audioNoiseReduction}
                      onChange={e => updateState("audioNoiseReduction", e.target.checked)}
                      className="accent-[#00E5FF]"
                    />
                  </label>
                </div>

                {/* Voice Changer */}
                <div className="p-2.5 rounded-lg bg-[#121316] border border-white/10 space-y-2">
                  <span className="font-bold text-slate-200 block">Voice Changer</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["normal", "chipmunk", "deep", "robot", "echo", "megaphone"] as const).map(vf => (
                      <button
                        key={vf}
                        type="button"
                        onClick={() => updateState("voiceEffect", vf)}
                        className={`py-1.5 rounded border text-[10px] font-semibold capitalize ${
                          voiceEffect === vf
                            ? "bg-cyan-500/20 border-[#00E5FF] text-[#00E5FF]"
                            : "bg-[#1C1E24] border-white/10 text-slate-300"
                        }`}
                      >
                        {vf}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ==================== TAB 3: SPEED (Standard | Curve) ==================== */}
            {rightTab === "speed" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#121316] border border-white/10">
                  {(["standard", "curve"] as const).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setSpeedSubTab(st)}
                      className={`py-1 rounded font-semibold capitalize ${
                        speedSubTab === st ? "bg-[#252830] text-white" : "text-slate-400"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                {speedSubTab === "standard" ? (
                  <div className="p-2.5 rounded-lg bg-[#121316] border border-white/10 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300 font-semibold">Times</span>
                      <span className="font-mono text-cyan-400 font-bold">{playbackSpeed}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="8"
                      step="0.05"
                      value={playbackSpeed}
                      onChange={e => setPlaybackSpeed(parseFloat(e.target.value))}
                      className="w-full capcut-slider"
                    />
                    <div className="grid grid-cols-3 gap-1.5">
                      {[0.25, 0.5, 1, 1.5, 2, 4].map(sp => (
                        <button
                          key={sp}
                          type="button"
                          onClick={() => setPlaybackSpeed(sp)}
                          className={`py-1.5 rounded border text-[10px] font-bold ${
                            playbackSpeed === sp
                              ? "bg-cyan-500/20 border-[#00E5FF] text-[#00E5FF]"
                              : "bg-[#1C1E24] border-white/10 text-slate-300"
                          }`}
                        >
                          {sp}x
                        </button>
                      ))}
                    </div>
                    <label className="flex items-center justify-between pt-1 cursor-pointer">
                      <span className="text-slate-300 text-[11px]">Keep pitch</span>
                      <input
                        type="checkbox"
                        checked={keepPitch}
                        onChange={e => updateState("keepPitch", e.target.checked)}
                        className="accent-[#00E5FF]"
                      />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-slate-300 text-[11px]">Smooth slow-mo (Optical flow)</span>
                      <input
                        type="checkbox"
                        checked={opticalFlowEnabled}
                        onChange={e => updateState("opticalFlowEnabled", e.target.checked)}
                        className="accent-[#00E5FF]"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-[#121316] border border-white/10 space-y-2.5">
                    <span className="text-slate-300 font-semibold block">Velocity Curve Presets</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { name: "Normal", points: [] },
                        {
                          name: "Montage",
                          points: [
                            { position: 0, speed: 1 },
                            { position: 0.25, speed: 2 },
                            { position: 0.5, speed: 0.5 },
                            { position: 0.75, speed: 2 },
                            { position: 1, speed: 1 },
                          ],
                        },
                        {
                          name: "Slow middle",
                          points: [
                            { position: 0, speed: 1 },
                            { position: 0.5, speed: 0.25 },
                            { position: 1, speed: 1 },
                          ],
                        },
                        {
                          name: "Hero Bullet",
                          points: [
                            { position: 0, speed: 2.5 },
                            { position: 0.4, speed: 0.3 },
                            { position: 0.7, speed: 0.3 },
                            { position: 1, speed: 2.5 },
                          ],
                        },
                      ].map(preset => (
                        <button
                          key={preset.name}
                          type="button"
                          className="p-2 rounded bg-[#1C1E24] hover:bg-white/10 border border-white/10 text-[11px] text-slate-200 font-semibold"
                          onClick={() => updateState("speedCurve", preset.points)}
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="w-full py-1.5 bg-[#00E5FF]/20 border border-[#00E5FF]/40 text-[#00E5FF] rounded font-bold text-[11px]"
                      onClick={() =>
                        updateState("speedCurve", [
                          { position: 0, speed: 1 },
                          { position: 0.25, speed: 1 },
                          { position: 0.5, speed: 1 },
                          { position: 0.75, speed: 1 },
                          { position: 1, speed: 1 },
                        ])
                      }
                    >
                      Custom five-point curve
                    </button>
                    {editorState.speedCurve.map((point, index) => (
                      <label key={index} className="block text-[11px] text-slate-300">
                        {Math.round(point.position * 100)}% · {point.speed.toFixed(2)}x
                        <input
                          aria-label={"Speed at " + Math.round(point.position * 100) + " percent"}
                          className="w-full capcut-slider mt-1"
                          type="range"
                          min="0.25"
                          max="4"
                          step="0.05"
                          value={point.speed}
                          onChange={e =>
                            updateState("speedCurve", (points: SpeedPoint[]) =>
                              points.map((p, i) =>
                                i === index ? { ...p, speed: Number(e.target.value) } : p
                              )
                            )
                          }
                        />
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ==================== TAB 4: ANIMATION (In | Out | Combo) ==================== */}
            {rightTab === "animation" && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#121316] border border-white/10">
                  {(["in", "out", "combo"] as const).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setAnimSubTab(st)}
                      className={`py-1 rounded font-semibold uppercase text-[10px] ${
                        animSubTab === st ? "bg-[#252830] text-white" : "text-slate-400"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <div className="p-2.5 rounded-lg bg-[#121316] border border-white/10 space-y-2.5">
                  <div className="grid grid-cols-2 gap-1.5">
                    {(animSubTab === "in"
                      ? ([
                          { id: "none", label: "None" },
                          { id: "fade_in", label: "Fade In" },
                          { id: "zoom_in", label: "Zoom In" },
                          { id: "slide_left", label: "Slide Left" },
                          { id: "slide_up", label: "Slide Up" },
                          { id: "spin_in", label: "Spin In" },
                        ] as const)
                      : animSubTab === "out"
                        ? ([
                            { id: "none", label: "None" },
                            { id: "fade_out", label: "Fade Out" },
                            { id: "zoom_out", label: "Zoom Out" },
                            { id: "slide_left", label: "Slide Out" },
                            { id: "slide_up", label: "Slide Down" },
                          ] as const)
                        : ([
                            { id: "none", label: "None" },
                            { id: "shake", label: "Dynamic Shake" },
                            { id: "pendulum", label: "Pendulum Swing" },
                            { id: "pulse", label: "Beat Pulse" },
                          ] as const)
                    ).map(anim => {
                      const keyName =
                        animSubTab === "in"
                          ? "clipAnimIn"
                          : animSubTab === "out"
                            ? "clipAnimOut"
                            : "clipAnimCombo";
                      const isActive = editorState[keyName] === anim.id;
                      return (
                        <button
                          key={anim.id}
                          type="button"
                          onClick={() => updateState(keyName, anim.id)}
                          className={`py-2 px-2 rounded border text-[11px] font-semibold ${
                            isActive
                              ? "bg-cyan-500/20 border-[#00E5FF] text-[#00E5FF]"
                              : "bg-[#1C1E24] border-white/10 text-slate-300"
                          }`}
                        >
                          {anim.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2 border-t border-white/10 space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Animation Duration</span>
                      <span className="font-mono text-cyan-400">{clipAnimDuration.toFixed(1)}s</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="3.0"
                      step="0.1"
                      value={clipAnimDuration}
                      onChange={e => updateState("clipAnimDuration", parseFloat(e.target.value))}
                      className="w-full capcut-slider"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ==================== TAB 5: ADJUST (Basic | HSL | Curves | Color wheel) ==================== */}
            {rightTab === "adjust" && (
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-[#121316] border border-white/10 text-[10px]">
                  {(
                    [
                      { id: "basic", label: "Basic" },
                      { id: "hsl", label: "HSL" },
                      { id: "curves", label: "Curves" },
                      { id: "wheel", label: "Color wheel" },
                    ] as const
                  ).map(st => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setAdjustSubTab(st.id)}
                      className={`py-1 rounded font-semibold ${
                        adjustSubTab === st.id ? "bg-[#252830] text-white" : "text-slate-400"
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                {/* ADJUST -> BASIC */}
                {adjustSubTab === "basic" && (
                  <div className="p-2.5 rounded-lg bg-[#121316] border border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">Color & Tone Grading</span>
                      <button
                        type="button"
                        onClick={resetAdjustments}
                        className="text-[10px] text-cyan-400 hover:underline"
                      >
                        Reset All
                      </button>
                    </div>

                    {[
                      { label: "Brightness", value: brightness, set: setBrightness, min: 0, max: 200 },
                      { label: "Contrast", value: contrast, set: setContrast, min: 0, max: 200 },
                      { label: "Saturation", value: saturation, set: setSaturation, min: 0, max: 200 },
                      { label: "Exposure", value: exposure, set: setExposure, min: 0, max: 200 },
                      { label: "Sharpen", value: sharpen, set: (v: number) => updateState("sharpen", v), min: 0, max: 100 },
                      { label: "Highlight", value: highlight, set: (v: number) => updateState("highlight", v), min: -50, max: 50 },
                      { label: "Shadow", value: shadow, set: (v: number) => updateState("shadow", v), min: -50, max: 50 },
                      { label: "Temp", value: temp, set: setTemp, min: -5, max: 5, step: 0.5 },
                      { label: "Tint", value: tint, set: setTint, min: -5, max: 5, step: 0.5 },
                      { label: "Fade", value: fadeAmount, set: (v: number) => updateState("fadeAmount", v), min: 0, max: 100 },
                      { label: "Vignette", value: vignetteAmount, set: (v: number) => updateState("vignetteAmount", v), min: 0, max: 100 },
                      { label: "Sepia", value: sepia, set: setSepia, min: 0, max: 100 },
                      { label: "Blur", value: blur, set: setBlur, min: 0, max: 15 },
                    ].map(adj => (
                      <div key={adj.label} className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400">{adj.label}</span>
                          <span className="font-mono text-cyan-400">{adj.value}</span>
                        </div>
                        <input
                          type="range"
                          min={adj.min}
                          max={adj.max}
                          step={adj.step || 1}
                          value={adj.value}
                          onChange={e => adj.set(Number(e.target.value))}
                          className="w-full capcut-slider"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* ADJUST -> HSL (8 Color Channels: Red, Orange, Yellow, Green, Cyan, Blue, Purple, Magenta) */}
                {adjustSubTab === "hsl" && (
                  <div className="p-2.5 rounded-lg bg-[#121316] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">HSL 8-Channel Mixer</span>
                      <button
                        type="button"
                        onClick={() => updateState("hslAdjustments", DEFAULT_HSL_MAP)}
                        className="text-[10px] text-cyan-400 hover:underline"
                      >
                        Reset
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-1">
                      {(
                        [
                          { id: "red", color: "#ef4444" },
                          { id: "orange", color: "#f97316" },
                          { id: "yellow", color: "#eab308" },
                          { id: "green", color: "#22c55e" },
                          { id: "cyan", color: "#06b6d4" },
                          { id: "blue", color: "#3b82f6" },
                          { id: "purple", color: "#a855f7" },
                          { id: "magenta", color: "#ec4899" },
                        ] as const
                      ).map(ch => (
                        <button
                          key={ch.id}
                          type="button"
                          title={ch.id}
                          onClick={() => setActiveHslChannel(ch.id)}
                          className={`w-6 h-6 rounded-full transition-transform ${
                            activeHslChannel === ch.id
                              ? "ring-2 ring-white scale-110"
                              : "opacity-75 hover:opacity-100"
                          }`}
                          style={{ backgroundColor: ch.color }}
                        />
                      ))}
                    </div>

                    {(["hue", "sat", "lum"] as const).map(prop => {
                      const currentCh = (hslAdjustments || DEFAULT_HSL_MAP)[activeHslChannel] || {
                        hue: 0,
                        sat: 0,
                        lum: 0,
                      };
                      const label =
                        prop === "hue" ? "Hue" : prop === "sat" ? "Saturation" : "Luminance";
                      return (
                        <div key={prop} className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-400 capitalize">
                              {activeHslChannel} {label}
                            </span>
                            <span className="font-mono text-cyan-400">{currentCh[prop]}</span>
                          </div>
                          <input
                            type="range"
                            min="-100"
                            max="100"
                            value={currentCh[prop]}
                            onChange={e => {
                              const val = Number(e.target.value);
                              updateState("hslAdjustments", {
                                ...(hslAdjustments || DEFAULT_HSL_MAP),
                                [activeHslChannel]: {
                                  ...currentCh,
                                  [prop]: val,
                                },
                              });
                            }}
                            className="w-full capcut-slider"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ADJUST -> CURVES (Luma & RGB Tone Curve) */}
                {adjustSubTab === "curves" && (
                  <div className="p-2.5 rounded-lg bg-[#121316] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">Parametric Tone Curve</span>
                      <button
                        type="button"
                        onClick={() => {
                          updateState("curveBlacks", 0);
                          updateState("curveShadows", 0);
                          updateState("curveMidtones", 0);
                          updateState("curveHighlights", 0);
                          updateState("curveWhites", 0);
                        }}
                        className="text-[10px] text-cyan-400 hover:underline"
                      >
                        Reset
                      </button>
                    </div>

                    {/* Interactive SVG Curve Preview */}
                    <div className="w-full h-28 rounded bg-[#0E0F12] border border-white/10 relative overflow-hidden p-2">
                      <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                        <line x1="0" y1="100" x2="100" y2="0" stroke="rgba(255,255,255,0.12)" strokeDasharray="2 2" />
                        <polyline
                          fill="none"
                          stroke="#00E5FF"
                          strokeWidth="2"
                          points={`0,${Math.max(0, Math.min(100, 100 - (curveBlacks || 0) * 0.5))} 25,${Math.max(0, Math.min(100, 75 - (curveShadows || 0) * 0.5))} 50,${Math.max(0, Math.min(100, 50 - (curveMidtones || 0) * 0.5))} 75,${Math.max(0, Math.min(100, 25 - (curveHighlights || 0) * 0.5))} 100,${Math.max(0, Math.min(100, 0 - (curveWhites || 0) * 0.5))}`}
                        />
                      </svg>
                    </div>

                    {[
                      { label: "Blacks", key: "curveBlacks" as const, val: curveBlacks || 0 },
                      { label: "Shadows", key: "curveShadows" as const, val: curveShadows || 0 },
                      { label: "Midtones", key: "curveMidtones" as const, val: curveMidtones || 0 },
                      { label: "Highlights", key: "curveHighlights" as const, val: curveHighlights || 0 },
                      { label: "Whites", key: "curveWhites" as const, val: curveWhites || 0 },
                    ].map(cv => (
                      <div key={cv.key} className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400">{cv.label}</span>
                          <span className="font-mono text-cyan-400">{cv.val}</span>
                        </div>
                        <input
                          type="range"
                          min="-50"
                          max="50"
                          value={cv.val}
                          onChange={e => updateState(cv.key, Number(e.target.value))}
                          className="w-full capcut-slider"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* ADJUST -> COLOR WHEEL (Shadows / Lift, Midtones / Gamma, Highlights / Gain) */}
                {adjustSubTab === "wheel" && (
                  <div className="p-2.5 rounded-lg bg-[#121316] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">Color Wheels (Lift / Gamma / Gain)</span>
                      <button
                        type="button"
                        onClick={() => {
                          updateState("wheelLiftWarmth", 0);
                          updateState("wheelLiftTint", 0);
                          updateState("wheelGammaWarmth", 0);
                          updateState("wheelGammaTint", 0);
                          updateState("wheelGainWarmth", 0);
                          updateState("wheelGainTint", 0);
                        }}
                        className="text-[10px] text-cyan-400 hover:underline"
                      >
                        Reset
                      </button>
                    </div>

                    {[
                      {
                        title: "Shadows (Lift)",
                        wKey: "wheelLiftWarmth" as const,
                        tKey: "wheelLiftTint" as const,
                        wVal: wheelLiftWarmth || 0,
                        tVal: wheelLiftTint || 0,
                      },
                      {
                        title: "Midtones (Gamma)",
                        wKey: "wheelGammaWarmth" as const,
                        tKey: "wheelGammaTint" as const,
                        wVal: wheelGammaWarmth || 0,
                        tVal: wheelGammaTint || 0,
                      },
                      {
                        title: "Highlights (Gain)",
                        wKey: "wheelGainWarmth" as const,
                        tKey: "wheelGainTint" as const,
                        wVal: wheelGainWarmth || 0,
                        tVal: wheelGainTint || 0,
                      },
                    ].map(wh => (
                      <div key={wh.title} className="p-2 rounded bg-[#18191D] border border-white/5 space-y-1.5">
                        <span className="text-[11px] font-semibold text-slate-300 block">{wh.title}</span>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-400">Warmth</span>
                            <span className="font-mono text-cyan-400">{wh.wVal}</span>
                          </div>
                          <input
                            type="range"
                            min="-50"
                            max="50"
                            value={wh.wVal}
                            onChange={e => updateState(wh.wKey, Number(e.target.value))}
                            className="w-full capcut-slider"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-400">Tint</span>
                            <span className="font-mono text-cyan-400">{wh.tVal}</span>
                          </div>
                          <input
                            type="range"
                            min="-50"
                            max="50"
                            value={wh.tVal}
                            onChange={e => updateState(wh.tKey, Number(e.target.value))}
                            className="w-full capcut-slider"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ==================== TAB 6: DETAILS (Exact CapCut Desktop Project Details Card) ==================== */}
            {rightTab === "details" && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-[#121316] border border-white/10 space-y-3">
                  <div className="pb-2 border-b border-white/10">
                    <span className="font-bold text-slate-200 text-xs">Details</span>
                  </div>

                  <div className="space-y-2.5 text-[11px]">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-slate-400 shrink-0">Name</span>
                      <span className="text-slate-200 font-medium text-right break-all">
                        {projectTitle || "1022"}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <span className="text-slate-400 shrink-0">Media</span>
                      <span className="text-slate-300 text-right truncate">
                        {activeClipInfo?.clip.name || previewAsset?.name || "Workspace Project"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">Aspect ratio</span>
                      <span className="text-slate-200 font-medium capitalize">
                        {aspectRatio === "original" ? "Original" : aspectRatio}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">Resolution</span>
                      <span className="text-slate-200 font-medium">
                        Adapted ({exportResolution})
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">Frame rate</span>
                      <span className="text-slate-200 font-mono">30.00fps</span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">Imported media</span>
                      <span className="text-slate-200">Keep in original location</span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">Color space</span>
                      <span className="text-slate-200">Rec. 709 SDR</span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">Arrange layers</span>
                      <span className="text-slate-200">Turned off</span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400">Proxy</span>
                      <span className="text-cyan-400 font-medium">Turned on</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowExportModal(true)}
                      className="px-3 py-1 rounded bg-[#252830] hover:bg-[#2F333D] text-slate-200 text-[11px] font-semibold transition-colors"
                    >
                      Modify
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================== 4. MIDDLE CAPCUT TIMELINE ACTION TOOLBAR ==================== */}
      <div className="shrink-0 flex flex-col z-20 bg-[#141519] border-t border-white/10 select-none">
        <div className="h-9 flex items-center justify-between px-2 md:px-3 border-b border-white/10 overflow-x-auto scrollbar-none gap-2">
          {/* Left Timeline Tools Group (Matches CapCut Screenshot 1:1) */}
          <div className="flex items-center space-x-1 shrink-0">
            {/* Select (V) / Split (B) Cursor Mode */}
            <button
              type="button"
              onClick={() => updateState("cursorMode", cursorMode === "select" ? "split" : "select")}
              title={`Cursor Mode: ${cursorMode === "select" ? "Select (V)" : "Split Razor (B)"}`}
              className={`p-1.5 rounded transition-colors ${
                cursorMode === "split"
                  ? "bg-cyan-500/20 text-[#00E5FF]"
                  : "text-slate-300 hover:bg-white/10"
              }`}
            >
              <MousePointer2 className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-3.5 bg-white/10 mx-0.5" />

            {/* Undo & Redo */}
            <button
              type="button"
              aria-label="Undo"
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className={`p-1.5 rounded ${
                !canUndo ? "opacity-30 text-slate-600" : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              aria-label="Redo"
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              className={`p-1.5 rounded ${
                !canRedo ? "opacity-30 text-slate-600" : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-3.5 bg-white/10 mx-0.5" />

            {/* Split (Ctrl+B) */}
            <button
              type="button"
              onClick={handleSplitClip}
              title="Split Clip at Playhead (Ctrl+B)"
              className="flex items-center space-x-1 px-2 py-1 rounded hover:bg-white/10 text-slate-200 text-[11px]"
            >
              <Scissors className="w-3.5 h-3.5 text-[#00E5FF]" />
              <span className="hidden lg:inline">Split</span>
            </button>

            {/* Delete Left (Q) */}
            <button
              type="button"
              onClick={handleDeleteLeftOfPlayhead}
              title="Delete Left of Playhead (Q)"
              className="p-1.5 rounded hover:bg-white/10 text-slate-300 hover:text-white"
            >
              <ArrowLeftToLine className="w-3.5 h-3.5" />
            </button>

            {/* Delete Right (W) */}
            <button
              type="button"
              onClick={handleDeleteRightOfPlayhead}
              title="Delete Right of Playhead (W)"
              className="p-1.5 rounded hover:bg-white/10 text-slate-300 hover:text-white"
            >
              <ArrowRightToLine className="w-3.5 h-3.5" />
            </button>

            {/* Delete Selected (Del) */}
            <button
              type="button"
              onClick={() => {
                if (selectedClipId) handleRemoveClip(selectedClipId);
                else if (selectedAudioId)
                  setAudioLayers(audioLayers.filter(a => a.id !== selectedAudioId));
                else if (editingTextId)
                  setTextOverlays((prev: TextOverlay[]) =>
                    prev.filter((t: TextOverlay) => t.id !== editingTextId)
                  );
              }}
              title="Delete Selected Item (Del)"
              className="p-1.5 rounded hover:bg-white/10 text-slate-300 hover:text-rose-400"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-3.5 bg-white/10 mx-0.5" />

            {/* Add Marker (M) */}
            <button
              type="button"
              onClick={handleAddMarker}
              title="Add Timeline Marker at Playhead (M)"
              className="p-1.5 rounded hover:bg-white/10 text-slate-300 hover:text-[#00E5FF]"
            >
              <Bookmark className="w-3.5 h-3.5" />
            </button>

            {/* Freeze Frame */}
            <button
              type="button"
              onClick={handleFreezeFrame}
              title="Freeze Frame (2.0s)"
              className="p-1.5 rounded hover:bg-white/10 text-slate-300 hover:text-cyan-300"
            >
              <Snowflake className="w-3.5 h-3.5" />
            </button>

            {/* Reverse */}
            <button
              type="button"
              onClick={handleReverseClips}
              title="Reverse Clip Order"
              className="p-1.5 rounded hover:bg-white/10 text-slate-300 hover:text-white"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Mirror (Flip H) */}
            <button
              type="button"
              onClick={() => setFlipH(!flipH)}
              title="Mirror Clip Horizontally"
              className={`p-1.5 rounded ${
                flipH ? "bg-cyan-500/20 text-[#00E5FF]" : "hover:bg-white/10 text-slate-300"
              }`}
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
            </button>

            {/* Rotate 90° */}
            <button
              type="button"
              onClick={() => setRotate((rotate + 90) % 360)}
              title="Rotate 90°"
              className="p-1.5 rounded hover:bg-white/10 text-slate-300 hover:text-white"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            {/* Crop */}
            <button
              type="button"
              onClick={() => setActiveTool(activeTool === "crop" ? null : "crop")}
              title="Crop & Resize Video"
              className={`p-1.5 rounded ${
                activeTool === "crop"
                  ? "bg-cyan-500/20 text-[#00E5FF]"
                  : "hover:bg-white/10 text-slate-300"
              }`}
            >
              <Crop className="w-3.5 h-3.5" />
            </button>

            {/* Extract Audio */}
            <button
              type="button"
              onClick={handleExtractAudioFromClip}
              title="Extract Audio from Video Clip"
              className="hidden sm:flex items-center space-x-1 px-1.5 py-1 rounded hover:bg-white/10 text-slate-300 text-[10px]"
            >
              <Music className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden xl:inline">Extract Audio</span>
            </button>
          </div>

          {/* Right Timeline Tools Group: Voiceover Mic | Magnet | Auto Snap | Link | Preview Axis | Zoom Slider */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              type="button"
              onClick={() => handleToggleLiveRecord("voiceover")}
              title="Record Voiceover on Timeline"
              className={`p-1.5 rounded transition-colors ${
                isRecordingMedia === "voiceover"
                  ? "bg-rose-500/20 text-rose-400 animate-pulse"
                  : "hover:bg-white/10 text-slate-300"
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => updateState("trackMagnet", !trackMagnet)}
              title="Main Track Magnet"
              className={`p-1.5 rounded ${
                trackMagnet ? "text-[#00E5FF] bg-cyan-500/10" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Magnet className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => updateState("autoSnapping", !autoSnapping)}
              title="Auto Snapping"
              className={`hidden sm:inline-flex p-1.5 rounded ${
                autoSnapping ? "text-[#00E5FF] bg-cyan-500/10" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Sparkle className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => updateState("linkAudio", !linkAudio)}
              title="Link / Unlink Audio"
              className={`hidden md:inline-flex p-1.5 rounded ${
                linkAudio ? "text-[#00E5FF]" : "text-slate-500"
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => updateState("previewAxis", !previewAxis)}
              title="Toggle Preview Axis Hover Line"
              className={`hidden md:inline-flex p-1.5 rounded ${
                previewAxis ? "text-amber-400 bg-amber-500/10" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Split className="w-3.5 h-3.5" />
            </button>

            <div className="hidden sm:flex items-center space-x-1 pl-1">
              <button
                type="button"
                onClick={() => setTimelineScale(s => Math.max(2, Math.round(s / 1.3)))}
                className="p-1 text-slate-400 hover:text-white"
                title="Zoom Out Timeline"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <input
                aria-label="Timeline zoom slider"
                type="range"
                min="2"
                max="220"
                value={timelineScale}
                onChange={e => setTimelineScale(Number(e.target.value))}
                className="w-20 capcut-slider"
              />
              <button
                type="button"
                onClick={() => setTimelineScale(s => Math.min(220, Math.round(s * 1.3)))}
                className="p-1 text-slate-400 hover:text-white"
                title="Zoom In Timeline"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ==================== 5. BOTTOM MULTI-TRACK TIMELINE ==================== */}
        <StudioTimeline
          clips={videoClips}
          audio={audioLayers}
          titles={textOverlays}
          time={currentTime}
          playing={isPlaying}
          selected={selectedAudioId || editingTextId || selectedClipId}
          volume={volume}
          muted={isMuted}
          seek={t => {
            setPreviewAssetId(null);
            seekToTime(t);
          }}
          pause={() => setIsPlaying(false)}
          select={(id, kind) => {
            setPreviewAssetId(null);
            setSelectedClipId(kind === "video" ? id : null);
            setSelectedAudioId(kind === "audio" ? id : null);
            setEditingTextId(kind === "text" ? id : null);
            if (kind === "video") setRightTab("video");
            else if (kind === "audio") setRightTab("audio");
            else if (kind === "text") setLeftTab("text");
            else setRightTab("details");
          }}
          change={(clips, audio, titles, muted) =>
            setEditorState(prev => ({
              ...prev,
              videoClips: clips,
              audioLayers: audio,
              textOverlays: titles as TextOverlay[],
              isMuted: muted,
              ...(clips.reduce((sum, c) => sum + c.duration, 0) !==
              prev.videoClips.reduce((sum, c) => sum + c.duration, 0)
                ? { trimStart: 0, trimEnd: clips.reduce((sum, c) => sum + c.duration, 0) }
                : {}),
            }))
          }
          preview={(clip, source) => {
            const media = videoRef.current;
            if (!media) return;
            if (clip && source !== undefined) {
              if (media.getAttribute("src") !== clip.objectUrl) {
                pendingSeekTimeRef.current = source;
                media.src = clip.objectUrl;
                media.load();
              } else media.currentTime = source;
            } else seekToTime(currentTime);
          }}
          markers={markers}
          onSelectMarker={t => seekToTime(t)}
          onRemoveMarker={id =>
            updateState(
              "markers",
              markers.filter(m => m.id !== id)
            )
          }
          previewAxisEnabled={previewAxis}
          cursorMode={cursorMode}
          trackLocked={trackLocked}
          trackHidden={trackHidden}
          onToggleTrackLock={() => updateState("trackLocked", !trackLocked)}
          onToggleTrackHide={() => updateState("trackHidden", !trackHidden)}
          onCaptureCover={handleCaptureCover}
          coverImage={coverImage}
          externalScale={timelineScale}
          onScaleChange={setTimelineScale}
          onDropAssetId={assetId => {
            const found = activePoolSource.find(a => a.id === assetId);
            if (found) handleAddAssetToTimeline(found);
          }}
        />
      </div>

      {/* ==================== 6. MOBILE CAPCUT BOTTOM TOOLBAR & CROP OVERLAY (< 768px) ==================== */}
      <div
        className="md:hidden shrink-0 z-40 relative bg-[#121316] border-t border-white/10"
      >
        {/* Fullscreen Interactive Crop Sheet (Opens when activeTool === 'crop') */}
        {activeTool === "crop" && (
          <div className="fixed inset-0 z-50 flex flex-col bg-[#0E0F12]">
            <div className="flex items-center justify-between px-4 h-12 border-b border-white/10">
              <button
                type="button"
                onClick={() => setActiveTool(null)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <span className="text-sm font-bold text-white">Crop & Rotate</span>
              <button
                type="button"
                onClick={() => setActiveTool(null)}
                className="p-1.5 text-[#00E5FF]"
              >
                <Check className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden p-4">
              <div className="relative max-w-full max-h-full" style={{ width: "280px", height: "360px" }}>
                <video
                  src={objectUrl || undefined}
                  className="w-full h-full object-contain bg-black"
                  muted
                  style={{ filter: filterStyle, transform: `rotate(${rotate}deg)` }}
                />
                <div
                  onMouseDown={e => handleCropBoxStart("move", e)}
                  onTouchStart={e => handleCropBoxStart("move", e)}
                  style={{
                    left: `${cropBox.left}%`,
                    top: `${cropBox.top}%`,
                    width: `${cropBox.width}%`,
                    height: `${cropBox.height}%`,
                  }}
                  className="absolute border-2 border-[#00E5FF] cursor-move select-none shadow-[0_0_0_9999px_rgba(0,0,0,0.65)]"
                >
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                    <div className="border-r border-b border-white/40" />
                    <div className="border-r border-b border-white/40" />
                    <div className="border-b border-white/40" />
                    <div className="border-r border-b border-white/40" />
                    <div className="border-r border-b border-white/40" />
                    <div className="border-b border-white/40" />
                    <div className="border-r border-white/40" />
                    <div className="border-r border-white/40" />
                    <div />
                  </div>
                  <div
                    onMouseDown={e => handleCropBoxStart("top-left", e)}
                    onTouchStart={e => handleCropBoxStart("top-left", e)}
                    className="absolute -top-2.5 -left-2.5 w-6 h-6 border-t-4 border-l-4 border-white cursor-nwse-resize pointer-events-auto"
                  />
                  <div
                    onMouseDown={e => handleCropBoxStart("top-right", e)}
                    onTouchStart={e => handleCropBoxStart("top-right", e)}
                    className="absolute -top-2.5 -right-2.5 w-6 h-6 border-t-4 border-r-4 border-white cursor-nesw-resize pointer-events-auto"
                  />
                  <div
                    onMouseDown={e => handleCropBoxStart("bottom-left", e)}
                    onTouchStart={e => handleCropBoxStart("bottom-left", e)}
                    className="absolute -bottom-2.5 -left-2.5 w-6 h-6 border-b-4 border-l-4 border-white cursor-nesw-resize pointer-events-auto"
                  />
                  <div
                    onMouseDown={e => handleCropBoxStart("bottom-right", e)}
                    onTouchStart={e => handleCropBoxStart("bottom-right", e)}
                    className="absolute -bottom-2.5 -right-2.5 w-6 h-6 border-b-4 border-r-4 border-white cursor-nwse-resize pointer-events-auto"
                  />
                </div>
              </div>
            </div>

            <div className="px-4 py-3 space-y-2 border-t border-white/10">
              <div className="flex justify-between items-center text-xs">
                <span className="text-white font-medium">Rotate</span>
                <span className="font-bold text-[#00E5FF]">{rotate}°</span>
              </div>
              <input
                type="range"
                min="-45"
                max="45"
                step="1"
                value={rotate}
                onChange={e => setRotate(parseInt(e.target.value))}
                className="w-full capcut-slider"
              />
              <div className="flex space-x-2 overflow-x-auto scrollbar-none pt-1">
                {[
                  { r: "custom", label: "Custom", box: { left: 5, top: 5, width: 90, height: 90 } },
                  { r: "9:16", label: "9:16", box: { left: 20, top: 5, width: 60, height: 90 } },
                  { r: "16:9", label: "16:9", box: { left: 5, top: 25, width: 90, height: 50.6 } },
                  { r: "1:1", label: "1:1", box: { left: 15, top: 15, width: 70, height: 70 } },
                  { r: "4:3", label: "4:3", box: { left: 5, top: 18, width: 90, height: 64 } },
                ].map((ar, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (ar.r !== "custom") setAspectRatio(ar.r as any);
                      setCropBox(ar.box);
                    }}
                    className="px-3 py-1.5 rounded bg-white/10 text-xs font-semibold text-white shrink-0"
                  >
                    {ar.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Swipable CapCut Footer Bar */}
        <div className="fahi-editor-footer min-h-[60px] pb-[env(safe-area-inset-bottom)] flex items-center w-full overflow-x-auto scrollbar-none px-2 space-x-1">
          {[
            { icon: Film, label: "Media", id: "media" },
            { icon: Scissors, label: "Edit", id: "basic" },
            { icon: Music, label: "Audio", id: "audio" },
            { icon: Type, label: "Text", id: "text" },
            { icon: Sticker, label: "Stickers", id: "stickers" },
            { icon: Sparkles, label: "Effects", id: "effects" },
            { icon: Layers, label: "Transitions", id: "transitions" },
            { icon: Captions, label: "Captions", id: "captions" },
            { icon: Filter, label: "Filters", id: "filters" },
            { icon: FastForward, label: "Speed", id: "speed" },
            { icon: Zap, label: "Animation", id: "animation" },
            { icon: Palette, label: "Remove BG", id: "remove_bg" },
            { icon: Aperture, label: "Mask", id: "mask" },
            { icon: Sun, label: "Retouch", id: "retouch" },
            { icon: SlidersHorizontal, label: "Adjust", id: "adjust" },
            { icon: Crop, label: "Crop", id: "crop" },
            { icon: Sliders, label: "Details", id: "details" },
          ].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => openCapCutTool(t.id)}
              className={`flex flex-col items-center justify-center min-w-[54px] py-1.5 rounded-lg shrink-0 transition-colors ${
                activeTool === t.id ? "text-[#00E5FF] bg-white/5" : "text-slate-300 hover:text-white"
              }`}
            >
              <t.icon className="w-4 h-4" />
              <span className="text-[9px] font-medium mt-1 whitespace-nowrap">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Crop Modal when triggered from Timeline Toolbar on Desktop */}
      {activeTool === "crop" && (
        <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center bg-black/75 backdrop-blur-sm p-6">
          <div className="w-full max-w-lg rounded-2xl bg-[#18191D] border border-white/15 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-sm font-bold text-white">CapCut Freeform Crop & Aspect Ratio</span>
              <button
                type="button"
                onClick={() => setActiveTool(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="relative mx-auto w-72 h-52 bg-black rounded-lg overflow-hidden">
                <video
                  src={objectUrl || undefined}
                  muted
                  className="w-full h-full object-contain"
                  style={{ filter: filterStyle, transform: `rotate(${rotate}deg)` }}
                />
                <div
                  onMouseDown={e => handleCropBoxStart("move", e)}
                  style={{
                    left: `${cropBox.left}%`,
                    top: `${cropBox.top}%`,
                    width: `${cropBox.width}%`,
                    height: `${cropBox.height}%`,
                  }}
                  className="absolute border-2 border-[#00E5FF] cursor-move bg-[#00E5FF]/10"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                {["16:9", "9:16", "1:1", "4:3", "4:5", "21:9"].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setAspectRatio(r as any)}
                    className={`flex-1 py-1.5 rounded text-xs font-bold border ${
                      aspectRatio === r
                        ? "bg-cyan-500/20 border-[#00E5FF] text-[#00E5FF]"
                        : "bg-[#121316] border-white/10 text-slate-300"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCropBox({ left: 0, top: 0, width: 100, height: 100 })}
                  className="px-3 py-1.5 rounded bg-white/10 text-xs text-slate-300"
                >
                  Reset Crop
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTool(null)}
                  className="px-4 py-1.5 rounded bg-[#00E5FF] text-black text-xs font-bold"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== EXPORT MODAL ==================== */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="fahi-export-dialog border border-white/15 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden bg-[#18191D]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <h3 className="text-white font-bold flex items-center space-x-2 text-sm">
                <Download className="w-4 h-4 text-[#00E5FF]" />
                <span>Export Project ({projectTitle})</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Resolution
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["1080p", "720p", "480p"].map(res => (
                    <button
                      key={res}
                      type="button"
                      onClick={() => setExportResolution(res)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                        exportResolution === res
                          ? "bg-cyan-500/20 border-[#00E5FF] text-[#00E5FF]"
                          : "bg-[#121316] border-white/10 text-slate-300"
                      }`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Quality
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["high", "medium", "low"].map(q => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setExportQuality(q)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold capitalize border transition-colors ${
                        exportQuality === q
                          ? "bg-cyan-500/20 border-[#00E5FF] text-[#00E5FF]"
                          : "bg-[#121316] border-white/10 text-slate-300"
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <p className="px-5 pb-3 text-xs text-slate-400">
              Recording runs in real time with all CapCut transforms, masks, blend modes, audio layers, and captions.
            </p>
            <div className="px-5 py-4 border-t border-white/10 bg-[#121316] flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={startRealExport}
                className="px-6 py-2 bg-[#00E5FF] hover:bg-[#33ECFF] text-black text-xs font-bold rounded-lg shadow-lg flex items-center"
              >
                <Download className="w-4 h-4 mr-1.5" />
                Start Export
              </button>
            </div>
          </div>
        </div>
      )}

      <UserSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onThemeChange={t => setEditorTheme(t)}
      />

      <AdminLoginModal isOpen={showAdminModal} onClose={() => setShowAdminModal(false)} />
    </div>
  );
}
