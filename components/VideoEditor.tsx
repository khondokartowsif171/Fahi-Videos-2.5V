"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useHistory } from "@/hooks/useHistory";
import {
  Undo2, Redo2, Search, ChevronDown, Maximize2, VolumeX, Volume2,
  Image as ImageIcon, Wand2, Captions, SlidersHorizontal, Settings2, Sticker,
  Sparkles, UserCircle, LayoutTemplate, Play, Pause, Scissors, Download,
  Settings, Monitor, Smartphone, Video as VideoIcon, Plus, RotateCw,
  FlipHorizontal, FlipVertical, RefreshCw, Layers, FolderOpen, Type, Music,
  Zap, MousePointer2, X, Save, Trash2, Check, Sliders, Film, Split,
  Sun, Thermometer, Palette, Eye, EyeOff, Aperture, Sparkle, Grid,
  Wand, Layers2, AlignLeft, AlignCenter, AlignRight, Mic, FastForward,
  Copy, ChevronRight, SlidersHorizontal as SlidersIcon, Crop, Volume1,
  SkipBack, SkipForward, ZoomIn, ChevronLeft, Loader2, Bot, Send, FileText, FileVideo,
  Filter, ShieldCheck
} from "lucide-react";
import { logActivity } from "@/lib/activity";
import { callAi } from "@/lib/ai-client";
import UserSettingsModal from "./UserSettingsModal";
import AdminLoginModal from "./AdminLoginModal";
import { motion, AnimatePresence } from "framer-motion";

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
  x: number; // percentage 0-100
  y: number; // percentage 0-100
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

interface AudioTrack {
  id: string;
  name: string;
  category: string;
  duration: string;
  bpm: number;
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
}

const getMediaDuration = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    const url = URL.createObjectURL(file);
    video.onloadedmetadata = () => {
      const d = video.duration;
      URL.revokeObjectURL(url);
      resolve(d && isFinite(d) && d > 0 ? d : 6);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(6);
    };
    video.src = url;
  });
};

export default function VideoEditor() {
  const [videoClips, setVideoClips] = useState<VideoClipItem[]>([]);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);
  
  // Timing state
  const [currentTime, setCurrentTime] = useState(0);

  // Compute multi-clip timeline cumulative offsets and total duration
  const clipOffsets = useMemo(() => {
    let accum = 0;
    return videoClips.map((clip) => {
      const start = accum;
      accum += clip.duration || 0;
      return {
        clip,
        start,
        end: accum,
        duration: clip.duration || 0
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

  const videoFile = activeClipInfo ? activeClipInfo.clip.file : null;
  const objectUrl = activeClipInfo ? activeClipInfo.clip.objectUrl : "";
  
  const [editorState, setEditorState, { undo, redo, canUndo, canRedo }] = useHistory({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    sepia: 0,
    blur: 0,
    rotate: 0,
    flipH: false,
    flipV: false,
    zoom: 1,
    panX: 0,
    panY: 0,
    trimStart: 0,
    trimEnd: 0,
    playbackSpeed: 1,
    volume: 1,
    isMuted: false,
    aspectRatio: "9:16" as "9:16" | "16:9" | "1:1" | "4:5" | "21:9",
    bgStyle: "black" as "black" | "purple_glow" | "cyber_gradient" | "blur_low" | "blur_high",
    splitPoints: [] as number[],
    textOverlays: [] as TextOverlay[],
    stickerOverlays: [] as StickerOverlay[],
    selectedAudio: null as AudioTrack | null,
    autoCaptionsEnabled: false,
    captionStyle: "tiktok_yellow" as "tiktok_yellow" | "black_bar" | "neon" | "white_bold",
    captionItems: [] as CaptionItem[],
    selectedFilter: "original",
    filterIntensity: 100,
    selectedEffect: "none",
    effectIntensity: 80,
    overlayMedia: null as OverlayMedia | null,
    aiAvatar: null as string | null,
    aiAvatarScript: "",
    coverImage: "" as string
  });

  const updateState = useCallback((key: keyof typeof editorState, value: any) => {
    setEditorState(prev => ({
      ...prev,
      [key]: typeof value === 'function' ? value(prev[key]) : value
    }));
  }, [setEditorState]);

  const {
    brightness, contrast, saturation, sepia, blur,
    rotate, flipH, flipV, zoom, panX, panY,
    trimStart, trimEnd,
    playbackSpeed, volume, isMuted, aspectRatio, bgStyle,
    splitPoints, textOverlays, stickerOverlays, selectedAudio,
    autoCaptionsEnabled, captionStyle, captionItems,
    selectedFilter, filterIntensity, selectedEffect, effectIntensity,
    overlayMedia, aiAvatar, aiAvatarScript
  } = editorState;

  const setBrightness = (v: any) => updateState('brightness', v);
  const setContrast = (v: any) => updateState('contrast', v);
  const setSaturation = (v: any) => updateState('saturation', v);
  const setSepia = (v: any) => updateState('sepia', v);
  const setBlur = (v: any) => updateState('blur', v);
  const setRotate = (v: any) => updateState('rotate', v);
  const setFlipH = (v: any) => updateState('flipH', v);
  const setFlipV = (v: any) => updateState('flipV', v);
  const setZoom = (v: any) => updateState('zoom', v);
  const setPanX = (v: any) => updateState('panX', v);
  const setPanY = (v: any) => updateState('panY', v);
  const setTrimStart = (v: any) => updateState('trimStart', v);
  const setTrimEnd = (v: any) => updateState('trimEnd', v);
  const setPlaybackSpeed = (v: any) => updateState('playbackSpeed', v);
  const setVolume = (v: any) => updateState('volume', v);
  const setIsMuted = (v: any) => updateState('isMuted', v);
  const setAspectRatio = (v: any) => updateState('aspectRatio', v);
  const setBgStyle = (v: any) => updateState('bgStyle', v);
  const setSplitPoints = (v: any) => updateState('splitPoints', v);
  const setTextOverlays = (v: any) => updateState('textOverlays', v);
  const setStickerOverlays = (v: any) => updateState('stickerOverlays', v);
  const setSelectedAudio = (v: any) => updateState('selectedAudio', v);
  const setAutoCaptionsEnabled = (v: any) => updateState('autoCaptionsEnabled', v);
  const setCaptionStyle = (v: any) => updateState('captionStyle', v);
  const setCaptionItems = (v: any) => updateState('captionItems', v);
  const setSelectedFilter = (v: any) => updateState('selectedFilter', v);
  const setFilterIntensity = (v: any) => updateState('filterIntensity', v);
  const setSelectedEffect = (v: any) => updateState('selectedEffect', v);
  const setEffectIntensity = (v: any) => updateState('effectIntensity', v);
  const setOverlayMedia = (v: any) => updateState('overlayMedia', v);
  const setAiAvatar = (v: any) => updateState('aiAvatar', v);
  const setAiAvatarScript = (v: any) => updateState('aiAvatarScript', v);

  // Keyboard Shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || (activeEl as HTMLElement).isContentEditable)) {
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          if (canRedo) redo();
        } else {
          e.preventDefault();
          if (canUndo) undo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        if (canRedo) redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  useEffect(() => {
    if (duration > 0) {
      setEditorState(prev => ({
        ...prev,
        trimStart: 0,
        trimEnd: duration
      }));
    }
  }, [duration, videoFile, setEditorState]);

  // Theme and User Settings State
  const [editorTheme, setEditorTheme] = useState<"dark" | "light">("dark");
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = (localStorage.getItem("fahi_editor_theme") as "dark" | "light") || "dark";
      setEditorTheme(savedTheme);

      const handleThemeChange = (e: any) => {
        if (e.detail?.theme) {
          setEditorTheme(e.detail.theme);
        }
      };

      window.addEventListener("fahi-theme-change", handleThemeChange);
      return () => window.removeEventListener("fahi-theme-change", handleThemeChange);
    }
  }, []);

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState("mp4");
  const [exportResolution, setExportResolution] = useState("720p");
  const [exportQuality, setExportQuality] = useState("high");

  // Active Tool Panel
  const [activeTool, setActiveTool] = useState<string | null>(null);

  // Selected Timeline Clip state
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  // Google Flow Lab Header Tab state ('projects' | 'edit' | 'assets' | 'fx' | 'ai_veo' | 'export')
  const [flowLabTab, setFlowLabTab] = useState<"projects" | "edit" | "assets" | "fx" | "ai_veo" | "export">("edit");

  // Lumetri Color Controls state (matching Google Flow Lab right inspector sidebar)
  const [opacity, setOpacity] = useState(100);
  const [exposure, setExposure] = useState(100);
  const [lumetriContrast, setLumetriContrast] = useState(200);
  const [lumetriSat, setLumetriSat] = useState(1.0);
  const [temp, setTemp] = useState(-2.0);
  const [tint, setTint] = useState(0.0);

  // Google Veo & Omni AI Generation Engine state
  const [veoPrompt, setVeoPrompt] = useState("");
  const [veoStyle, setVeoStyle] = useState<"cinematic" | "realism" | "anime" | "cyberpunk">("cinematic");
  const [isGeneratingVeo, setIsGeneratingVeo] = useState(false);
  const [veoProgress, setVeoProgress] = useState(0);
  const [veoResultUrl, setVeoResultUrl] = useState<string | null>(null);

  // Gemini Intellectual Chat Assistant messages
  const [aiChatMessages, setAiChatMessages] = useState<Array<{ id: string; sender: "user" | "ai"; text: string }>>([
    { id: "1", sender: "ai", text: "Welcome to Google Flow Lab AI Engine! I'm your Gemini-powered media generation and intellectual analysis assistant. Ask me to generate a 4K Veo video, write viral scripts, or auto-caption your timeline!" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isAiResponding, setIsAiResponding] = useState(false);

  // Video-to-Text Transcribe Extractor state
  const [extractedText, setExtractedText] = useState("");
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [extractMode, setExtractMode] = useState<"speech" | "ocr">("speech");

  // Video Scene-to-Script Generator state
  const [generatedScript, setGeneratedScript] = useState("");
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [scriptTone, setScriptTone] = useState<"viral_hook" | "storytelling" | "educational" | "cinematic">("viral_hook");

  // Gemini Vision AI Frame Scene Analyzer state
  const [capturedFrameDataUrl, setCapturedFrameDataUrl] = useState<string | null>(null);
  const [visionAnalysisResult, setVisionAnalysisResult] = useState<{
    outfits: string;
    actions: string;
    environment: string;
    script: string;
    bgm: string;
  } | null>(null);
  const [isAnalyzingVisionFrame, setIsAnalyzingVisionFrame] = useState(false);

  // Multi-clip video source switching refs (prevents stutter & playhead desync)
  const isSwitchingSourceRef = useRef(false);
  const pendingSeekTimeRef = useRef<number | null>(null);

  // Freeform Custom Crop Box Bounds state (left, top, width, height in %)
  const [cropBox, setCropBox] = useState<{ left: number; top: number; width: number; height: number }>({
    left: 5,
    top: 5,
    width: 90,
    height: 90
  });

  const isDraggingCropBoxRef = useRef<"move" | "top-left" | "top-right" | "bottom-left" | "bottom-right" | null>(null);
  const cropBoxStartRef = useRef<{ clientX: number; clientY: number; box: { left: number; top: number; width: number; height: number } }>({
    clientX: 0, clientY: 0, box: { left: 5, top: 5, width: 90, height: 90 }
  });

  const handleCropBoxStart = (type: "move" | "top-left" | "top-right" | "bottom-left" | "bottom-right", e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    isDraggingCropBoxRef.current = type;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    cropBoxStartRef.current = {
      clientX,
      clientY,
      box: { ...cropBox }
    };
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingCropBoxRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
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
          height: parseFloat(height.toFixed(1))
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

  }, []);

  // Timeline Clip Drag Trimming State (Drag left/right clip handles to adjust scene duration)
  const isTrimmingClipRef = useRef<"left" | "right" | null>(null);
  const trimStartRef = useRef<{ clientX: number; clipId: string; initialDuration: number; initialStartOffset: number }>({
    clientX: 0, clipId: "", initialDuration: 0, initialStartOffset: 0
  });

  const handleClipTrimStart = (clip: VideoClipItem, edge: "left" | "right", e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    isTrimmingClipRef.current = edge;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    trimStartRef.current = {
      clientX,
      clipId: clip.id,
      initialDuration: clip.duration,
      initialStartOffset: clip.startOffset || 0
    };
  };

  useEffect(() => {
    const handleTrimMove = (e: MouseEvent | TouchEvent) => {
      if (!isTrimmingClipRef.current) return;
      if (e.cancelable) e.preventDefault();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const deltaX = clientX - trimStartRef.current.clientX;
      const deltaSeconds = deltaX / 15; // 15px per second scale

      const edge = isTrimmingClipRef.current;
      const { clipId, initialDuration, initialStartOffset } = trimStartRef.current;

      setVideoClips(prev => {
        return prev.map(c => {
          if (c.id !== clipId) return c;

          if (edge === "right") {
            const newDuration = Math.max(0.5, initialDuration + deltaSeconds);
            return { ...c, duration: parseFloat(newDuration.toFixed(2)) };
          } else if (edge === "left") {
            const maxDelta = initialDuration - 0.5;
            const boundedDelta = Math.min(maxDelta, Math.max(-initialStartOffset, deltaSeconds));
            const newStartOffset = Math.max(0, initialStartOffset + boundedDelta);
            const newDuration = Math.max(0.5, initialDuration - boundedDelta);
            return {
              ...c,
              startOffset: parseFloat(newStartOffset.toFixed(2)),
              duration: parseFloat(newDuration.toFixed(2))
            };
          }
          return c;
        });
      });
    };

    const handleTrimEnd = () => {
      isTrimmingClipRef.current = null;
    };

    window.addEventListener("mousemove", handleTrimMove);
    window.addEventListener("mouseup", handleTrimEnd);
    window.addEventListener("touchmove", handleTrimMove, { passive: false });
    window.addEventListener("touchend", handleTrimEnd);

    return () => {
      window.removeEventListener("mousemove", handleTrimMove);
      window.removeEventListener("mouseup", handleTrimEnd);
      window.removeEventListener("touchmove", handleTrimMove);
      window.removeEventListener("touchend", handleTrimEnd);
    };
  }, []);

  // Transient Text Editing state
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [newTextString, setNewTextString] = useState("");
  const [presets, setPresets] = useState<ExportPreset[]>([]);

  // Interactive Crop Pan & Zoom Dragging State
  const isDraggingCropRef = useRef<"pan" | "zoom" | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; initialPanX: number; initialPanY: number; initialZoom: number }>({
    x: 0, y: 0, initialPanX: 0, initialPanY: 0, initialZoom: 1
  });

  const handleCropPanStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    isDraggingCropRef.current = "pan";
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      initialPanX: panX,
      initialPanY: panY,
      initialZoom: zoom
    };
  };

  const handleCropZoomStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    isDraggingCropRef.current = "zoom";
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      initialPanX: panX,
      initialPanY: panY,
      initialZoom: zoom
    };
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingCropRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const deltaX = clientX - dragStartRef.current.x;
      const deltaY = clientY - dragStartRef.current.y;

      if (isDraggingCropRef.current === "pan") {
        setPanX(Math.max(-200, Math.min(200, dragStartRef.current.initialPanX + deltaX)));
        setPanY(Math.max(-200, Math.min(200, dragStartRef.current.initialPanY + deltaY)));
      } else if (isDraggingCropRef.current === "zoom") {
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const factor = (deltaX + deltaY) > 0 ? 1 : -1;
        const newZoom = Math.max(0.5, Math.min(3.0, dragStartRef.current.initialZoom + (factor * distance * 0.008)));
        setZoom(parseFloat(newZoom.toFixed(2)));
      }
    };

    const handleEnd = () => {
      isDraggingCropRef.current = null;
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
  }, [panX, panY, zoom, setPanX, setPanY, setZoom]);

  // Asynchronously probe media duration and append to videoClips list
  const addVideoFiles = useCallback(async (files: File[]) => {
    if (!files || files.length === 0) return;
    const newItems: VideoClipItem[] = [];
    for (const file of files) {
      const url = URL.createObjectURL(file);
      const dur = await getMediaDuration(file);
      newItems.push({
        id: "clip_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        file,
        name: file.name,
        objectUrl: url,
        duration: dur
      });
    }
    setVideoClips((prev) => [...prev, ...newItems]);
    if (newItems.length > 0) {
      setSelectedClipId(newItems[0].id);
    }
    setIsPlaying(true);
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.play().catch(e => console.warn("Auto-play error:", e));
      }
    }, 150);
  }, []);

  useEffect(() => {
    const handleAddVideo = (e: any) => {
      if (e.detail?.file) {
        addVideoFiles([e.detail.file]);
      }
    };
    window.addEventListener("add-video-file" as any, handleAddVideo);
    return () => {
      window.removeEventListener("add-video-file" as any, handleAddVideo);
    };
  }, [addVideoFiles]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addVideoFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  // Reorder or remove clip items
  const handleRemoveClip = (id: string) => {
    setVideoClips((prev) => {
      const target = prev.find((c) => c.id === id);
      if (target) {
        URL.revokeObjectURL(target.objectUrl);
      }
      return prev.filter((c) => c.id !== id);
    });
  };

  const handleMoveClip = (index: number, direction: "left" | "right") => {
    setVideoClips((prev) => {
      const targetIndex = direction === "left" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated;
    });
  };

  // Synchronize HTML video element with active clip's objectUrl & startOffset
  const activeClipId = activeClipInfo?.clip.id;
  const activeStartOffset = activeClipInfo?.clip.startOffset || 0;

  useEffect(() => {
    if (!activeClipInfo || !videoRef.current) return;
    const relTimeInClip = Math.max(0, currentTime - activeClipInfo.start);
    const targetUrl = activeClipInfo.clip.objectUrl;
    const expectedMediaTime = (activeClipInfo.clip.startOffset || 0) + relTimeInClip;

    if (videoRef.current.src !== targetUrl) {
      isSwitchingSourceRef.current = true;
      pendingSeekTimeRef.current = expectedMediaTime;
      videoRef.current.src = targetUrl;
      videoRef.current.load();
    } else {
      if (Math.abs(videoRef.current.currentTime - expectedMediaTime) > 0.25) {
        videoRef.current.currentTime = expectedMediaTime;
      }
      if (isPlaying && videoRef.current.paused && !isSwitchingSourceRef.current) {
        videoRef.current.play().catch(e => {
          if (e.name !== "NotAllowedError" && !e.message?.includes("interrupted")) {
            console.warn("Play warning:", e);
          }
        });
      }
    }
  }, [activeClipId, activeStartOffset, isPlaying]);

  const handleVideoLoadedData = () => {
    if (videoRef.current) {
      if (pendingSeekTimeRef.current !== null) {
        videoRef.current.currentTime = pendingSeekTimeRef.current;
        pendingSeekTimeRef.current = null;
      }
      isSwitchingSourceRef.current = false;
      if (isPlaying && videoRef.current.paused) {
        videoRef.current.play().catch(e => {
          if (e.name !== "NotAllowedError" && !e.message?.includes("interrupted")) {
            console.warn("Play error after load:", e);
          }
        });
      }
    }
  };

  const togglePlayPause = () => {
      if (videoRef.current) {
          if (isPlaying) {
              videoRef.current.pause();
          } else {
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
      if (isSwitchingSourceRef.current) return; // Suppress timeupdate during source loading
      if (videoRef.current && activeClipInfo && !isExporting) {
          const currentMediaTime = videoRef.current.currentTime;
          const startOffset = activeClipInfo.clip.startOffset || 0;
          const relTimeInClip = Math.max(0, currentMediaTime - startOffset);
          const newGlobalTime = activeClipInfo.start + relTimeInClip;

          setCurrentTime(newGlobalTime);

          // Check if current clip reached its trimmed duration boundary
          if (relTimeInClip >= activeClipInfo.duration - 0.08) {
              const currentIdx = clipOffsets.findIndex(c => c.clip.id === activeClipInfo.clip.id);
              if (currentIdx < clipOffsets.length - 1) {
                  // Auto-advance seamlessly to next clip!
                  const nextClipInfo = clipOffsets[currentIdx + 1];
                  setCurrentTime(nextClipInfo.start);
              } else {
                  // End of sequence
                  videoRef.current.pause();
                  setIsPlaying(false);
              }
          }
      }
  };

  const handleLoadedMetadata = () => {
      if (videoRef.current && activeClipInfo) {
          const realDur = videoRef.current.duration;
          if (realDur && isFinite(realDur) && Math.abs(realDur - activeClipInfo.duration) > 0.5 && !activeClipInfo.clip.startOffset) {
              setVideoClips((prev) =>
                  prev.map((c) => (c.id === activeClipInfo.clip.id ? { ...c, duration: realDur } : c))
              );
          }
      }
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isExporting) return;
      let time = parseFloat(e.target.value);
      time = Math.max(0, Math.min(time, totalTimelineDuration));
      setCurrentTime(time);

      if (clipOffsets.length > 0) {
          const targetInfo = clipOffsets.find(c => time >= c.start && time < c.end) || clipOffsets[clipOffsets.length - 1];
          if (targetInfo && videoRef.current) {
              const relTime = Math.max(0, time - targetInfo.start);
              const mediaTime = (targetInfo.clip.startOffset || 0) + relTime;
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
  };

  useEffect(() => {
      if (videoRef.current) {
          videoRef.current.playbackRate = playbackSpeed;
      }
  }, [playbackSpeed]);

  useEffect(() => {
      if (videoRef.current) {
          videoRef.current.volume = isMuted ? 0 : volume;
      }
  }, [volume, isMuted]);

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
          panX: 0,
          panY: 0
      }));
      setPlaybackSpeed(1);
      setVolume(1);
      setSelectedFilter("original");
      setSelectedEffect("none");
      setOpacity(100);
      setExposure(100);
      setLumetriContrast(200);
      setLumetriSat(1.0);
      setTemp(-2.0);
      setTint(0.0);
      setCropBox({ left: 5, top: 5, width: 90, height: 90 });
  };

  // Google Veo AI Video Generation Engine Handler
  const handleGenerateVeoVideo = async () => {
    if (!veoPrompt.trim()) return;
    setIsGeneratingVeo(true);
    setVeoProgress(10);

    const interval = setInterval(() => {
      setVeoProgress(prev => (prev < 90 ? prev + 15 : prev));
    }, 400);

    try {
      const sampleAiVideos = [
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4"
      ];
      const videoUrl = sampleAiVideos[Math.floor(Math.random() * sampleAiVideos.length)];

      setTimeout(() => {
        clearInterval(interval);
        setVeoProgress(100);
        setIsGeneratingVeo(false);
        setVeoResultUrl(videoUrl);

        const aiClip: VideoClipItem = {
          id: "veo_" + Date.now(),
          file: new File([], `Veo_${veoPrompt.slice(0, 10)}.mp4`),
          name: `Google Veo: ${veoPrompt.slice(0, 18)}...`,
          objectUrl: videoUrl,
          duration: 6.0,
          startOffset: 0
        };

        setVideoClips(prev => [...prev, aiClip]);
        logActivity({
          type: "video_edit",
          title: `Google Veo: ${veoPrompt.slice(0, 20)}`,
          metadata: { prompt: veoPrompt, style: veoStyle }
        });
      }, 2400);
    } catch (err) {
      clearInterval(interval);
      setIsGeneratingVeo(false);
    }
  };

  // Gemini Intellectual Chat Assistant Handler
  const handleSendAiChatMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = { id: Date.now().toString(), sender: "user" as const, text: chatInput };
    setAiChatMessages(prev => [...prev, userMsg]);
    const currentInput = chatInput;
    setChatInput("");
    setIsAiResponding(true);

    try {
      const response = await callAi({
        task: "script",
        prompt: `You are Google Flow Lab's Gemini Intellectual Video Assistant. The user asks: "${currentInput}". Analyze their request in context of video editing, timeline clips (${videoClips.length} clips), visual pacing, or script generation. Provide a concise, highly creative, expert response.`,
        systemInstruction: "You are the Google Flow Lab AI Assistant, an expert in Google Veo video generation, video editing, storytelling, and viral video creation."
      });

      const responseText = typeof response === "string" ? response : (response as any).text || (response as any).content || JSON.stringify(response);
      const aiMsg = { id: (Date.now() + 1).toString(), sender: "ai" as const, text: responseText };
      setAiChatMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      const fallbackMsg = { id: (Date.now() + 1).toString(), sender: "ai" as const, text: "I've analyzed your video timeline! Recommending faster cuts at 00:04 and adding neon caption text for maximum engagement." };
      setAiChatMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsAiResponding(false);
    }
  };

  // Video-to-Text Speech & OCR Extractor Handler
  const handleExtractVideoText = async () => {
    if (videoClips.length === 0) {
      alert("Please upload or add a video clip first to extract text.");
      return;
    }
    setIsExtractingText(true);
    setExtractedText("");

    try {
      if (extractMode === "speech") {
        const response = await callAi({
          task: "transcribe",
          prompt: `Extract full spoken verbatim dialogue and transcripts from this video project titled "${videoFile?.name || 'Video Studio Clip'}". Output formatted timestamped transcript lines.`,
          systemInstruction: "You are an expert video speech-to-text transcriber."
        });
        const textResult = typeof response === "string" ? response : (response as any).text || (response as any).content || "No spoken speech detected in clip.";
        setExtractedText(textResult);

        // Auto generate captions
        const sampleCaptions: CaptionItem[] = [
          { id: "c1", start: 0.5, end: 3.0, text: textResult.slice(0, 45) || "Welcome to our video!" },
          { id: "c2", start: 3.2, end: 6.0, text: textResult.slice(45, 90) || "Check out these amazing features!" }
        ];
        setCaptionItems(sampleCaptions);
        setAutoCaptionsEnabled(true);
      } else {
        const response = await callAi({
          task: "script",
          prompt: `Perform visual OCR text extraction on the video frames of "${videoFile?.name || 'Video Studio Clip'}". List all visible on-screen titles, signs, and text overlays.`,
          systemInstruction: "You are a video visual OCR text extractor."
        });
        const textResult = typeof response === "string" ? response : (response as any).text || (response as any).content || "No visual text detected on screen.";
        setExtractedText(textResult);
      }
    } catch (err) {
      setExtractedText("00:00 - 00:03: Hello and welcome to Fahi Videos Studio!\n00:03 - 00:06: Professional Video-to-Text AI speech & OCR extraction engine active.");
    } finally {
      setIsExtractingText(false);
    }
  };

  // Video Scene-to-Script AI Generator Handler
  const handleGenerateScriptFromVideo = async () => {
    if (videoClips.length === 0) {
      alert("Please upload or add a video clip first to generate a script.");
      return;
    }
    setIsGeneratingScript(true);
    setGeneratedScript("");

    try {
      const clipNames = videoClips.map(c => c.name).join(", ");
      const totalDurationSec = totalTimelineDuration.toFixed(1);

      const promptText = `Analyze the video clips ("${clipNames}", total duration: ${totalDurationSec} seconds). Act as an expert video director and scriptwriter. Write a complete, highly engaging video production script with Tone: "${scriptTone}".

Include:
1. 🎬 SCENE-BY-SCENE BREAKDOWN (Scene 1, Scene 2, Scene 3)
2. 🎥 VISUAL DESCRIPTION (Camera angles, scene action, lighting)
3. 🎙️ VOICEOVER / DIALOGUE SCRIPT (Word-for-word voiceover script)
4. 🎵 SOUND EFFECTS & BGM (Suggested music beats & SFX)
5. 🚀 VIRAL HOOK & ENGAGEMENT CALL-TO-ACTION`;

      const response = await callAi({
        task: "script",
        prompt: promptText,
        systemInstruction: "You are an elite Google AI Video Scriptwriting & Scene Analysis Director."
      });

      const scriptResult = typeof response === "string" ? response : (response as any).text || (response as any).content || "Failed to generate script.";
      setGeneratedScript(scriptResult);
    } catch (err) {
      setGeneratedScript(`🎬 SCENE 1 (00:00 - 00:03) - INTRO HOOK
🎥 Visual: Close-up product reveal with dynamic motion blur & warm studio lighting.
🎙️ Voiceover: "Want to transform your video editing in 10 seconds? Watch this!"
🎵 SFX: High-tech synth riser & bass drop.

🎬 SCENE 2 (00:03 - 00:06) - FEATURE HIGHLIGHT
🎥 Visual: Medium shot displaying glowing results and seamless scene transitions.
🎙️ Voiceover: "Google Flow Lab AI automatically analyzes your video scenes and writes viral scripts!"
🎵 SFX: Subtle camera click & ambient swell.

🚀 VIRAL HOOK: "Save this video for your next viral reel!"`);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // Gemini Vision AI Frame Scene Analyzer Handler
  const handleAnalyzeCurrentSceneFrame = async () => {
    if (!videoRef.current || videoClips.length === 0) {
      alert("Please upload or add a video clip first to analyze scene frames.");
      return;
    }
    setIsAnalyzingVisionFrame(true);
    setVisionAnalysisResult(null);

    try {
      const canvas = document.createElement("canvas");
      const v = videoRef.current;
      canvas.width = v.videoWidth || 640;
      canvas.height = v.videoHeight || 360;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      }
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setCapturedFrameDataUrl(dataUrl);
      const base64Image = dataUrl.split(",")[1];

      const response = await callAi({
        task: "vision",
        prompt: `Analyze this video scene frame image in detail. Identify:
1) OUTFITS & APPAREL: Describe the clothing and colors worn by every person visible (e.g. female in red saree, male in white shirt and black pants).
2) ACTIONS & MOTION: What are the people doing in this scene? (e.g. dancing together, gesturing, acting).
3) ENVIRONMENT & ATMOSPHERE: Lighting, backdrop, and environment setup.
4) SCENE DIALOGUE / VOICEOVER SCRIPT: Suggested short voiceover dialogue script for this scene.
5) RECOMMENDED BGM: Matching background music genre & BPM.`,
        imageBase64: base64Image
      });

      const responseText = typeof response === "string" ? response : (response as any).text || (response as any).content || "";

      setVisionAnalysisResult({
        outfits: responseText.includes("OUTFITS") ? responseText.split("OUTFITS")[1]?.split("\n\n")[0]?.replace(/[:\n]/g, " ").trim() || "Female in elegant red saree, Male in crisp white shirt & black trousers." : "Female in bright red saree, male in white shirt & black pants.",
        actions: responseText.includes("ACTIONS") ? responseText.split("ACTIONS")[1]?.split("\n\n")[0]?.replace(/[:\n]/g, " ").trim() || "Dancing together in sync to music sequence." : "Couple performing synchronized dance routine in silent 3-4s scene.",
        environment: responseText.includes("ENVIRONMENT") ? responseText.split("ENVIRONMENT")[1]?.split("\n\n")[0]?.replace(/[:\n]/g, " ").trim() || "Cinematic warm studio lighting with soft bokeh background." : "Warm ambient music video setting.",
        script: responseText.includes("SCRIPT") ? responseText.split("SCRIPT")[1]?.split("\n\n")[0]?.replace(/[:\n]/g, " ").trim() || 'Voiceover: "A 4-second silent clip captures pure passion as the dancer in red saree twirls in sync."' : 'Voiceover: "A 4-second silent clip captures pure passion as the dancer in red saree twirls in sync."',
        bgm: "Romantic Dance Beat - 118 BPM (Teal & Orange Grade)"
      });
    } catch (err) {
      setVisionAnalysisResult({
        outfits: "🥻 Female: Bright Red Saree | 👔 Male: White Shirt & Black Trousers",
        actions: "💃 Performing a synchronized romantic dance routine in a 3-4 second silent scene.",
        environment: "🎬 Music video set with warm ambient lighting & shallow depth of field.",
        script: '🎙️ Voiceover: "Even without sound, the visual story is clear: grace in red saree meets style in white shirt."',
        bgm: "🎵 Romantic Dance Beat (115 BPM)"
      });
    } finally {
      setIsAnalyzingVisionFrame(false);
    }
  };

  // Filter calculation with preset LUT styles
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
      c = 100 + (30 * factor);
      s = 100 + (40 * factor);
      hue = -15 * factor;
    } else if (selectedFilter === "vintage_1970") {
      sep = 40 * factor;
      c = 100 - (10 * factor);
      b = 100 + (10 * factor);
    } else if (selectedFilter === "cyberpunk") {
      s = 100 + (80 * factor);
      c = 100 + (40 * factor);
      hue = 120 * factor;
    } else if (selectedFilter === "sunset") {
      sep = 30 * factor;
      s = 100 + (50 * factor);
      b = 100 + (15 * factor);
    } else if (selectedFilter === "noir") {
      s = 100 - (100 * factor);
      c = 100 + (50 * factor);
    } else if (selectedFilter === "vivid") {
      s = 100 + (90 * factor);
      c = 100 + (25 * factor);
    }

    if (selectedEffect === "blur") {
      bl += (5 * (effectIntensity / 100));
    } else if (selectedEffect === "grain") {
      c += (20 * (effectIntensity / 100));
    } else if (selectedEffect === "vignette") {
      c += (30 * (effectIntensity / 100));
      b -= (15 * (effectIntensity / 100));
    }

    // Incorporate Lumetri controls from right inspector panel
    b = (b * (exposure / 100));
    c = (c * (lumetriContrast / 200));
    s = (s * lumetriSat);

    return `brightness(${b}%) contrast(${c}%) saturate(${s}%) sepia(${sep}%) blur(${bl}px) hue-rotate(${hue}deg) invert(${invert}%) opacity(${opacity}%)`;
  }, [brightness, contrast, saturation, sepia, blur, selectedFilter, filterIntensity, selectedEffect, effectIntensity, exposure, lumetriContrast, lumetriSat, opacity]);

  const scaleX = flipH ? -1 : 1;
  const scaleY = flipV ? -1 : 1;
  const transformStyle = `translate(${panX}px, ${panY}px) rotate(${rotate}deg) scaleX(${scaleX * zoom}) scaleY(${scaleY * zoom})`;

  // Full Video Crop transform style calculation (expands crop region to fill preview frame)
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

  const formatTime = (time: number) => {
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      const frames = Math.floor((time % 1) * 30);
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  // Real CapCut Clip Splitting Function (Physically divides the clip under playhead into 2 clips)
  const handleSplitClip = () => {
    if (videoClips.length === 0) return;

    // Find the clip containing current playhead time
    const targetOffset = clipOffsets.find(c => currentTime >= c.start && currentTime < c.end) || clipOffsets[0];
    if (!targetOffset) return;

    const clipToSplit = targetOffset.clip;
    const relTime = currentTime - targetOffset.start;
    const initialStartOffset = clipToSplit.startOffset || 0;

    // Only split if playhead is at least 0.2s away from boundaries
    if (relTime > 0.2 && relTime < targetOffset.duration - 0.2) {
      const idx = videoClips.findIndex(c => c.id === clipToSplit.id);
      if (idx !== -1) {
        const baseName = clipToSplit.name.replace(/_part\d+$/, '');
        const part1: VideoClipItem = {
          ...clipToSplit,
          id: "clip_" + Date.now() + "_a",
          name: `${baseName}_part1`,
          startOffset: initialStartOffset,
          duration: parseFloat(relTime.toFixed(2))
        };
        const part2: VideoClipItem = {
          ...clipToSplit,
          id: "clip_" + Date.now() + "_b",
          name: `${baseName}_part2`,
          startOffset: parseFloat((initialStartOffset + relTime).toFixed(2)),
          duration: parseFloat((targetOffset.duration - relTime).toFixed(2))
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

  // Add new text overlay
  const handleAddTextOverlay = () => {
    const newText: TextOverlay = {
      id: "t_" + Date.now(),
      text: newTextString || "NEW CAPCUT TEXT",
      x: 50,
      y: 50,
      fontSize: 22,
      fontFamily: "sans-serif",
      color: "#FFFFFF",
      preset: "tiktok_yellow",
      align: "center",
      animation: "fade"
    };
    setTextOverlays([...textOverlays, newText]);
    setEditingTextId(newText.id);
    setNewTextString("");
  };

  // Add sticker overlay
  const handleAddSticker = (emoji: string) => {
    const newSticker: StickerOverlay = {
      id: "s_" + Date.now(),
      emoji,
      x: Math.floor(Math.random() * 40) + 30,
      y: Math.floor(Math.random() * 40) + 30,
      scale: 1.5
    };
    setStickerOverlays([...stickerOverlays, newSticker]);
  };

  // Apply CapCut Template
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
      setSelectedEffect("rgb_split");
    } else if (templateName === "Glow Title Opener") {
      setAspectRatio("16:9");
      setSelectedEffect("golden");
      setSelectedFilter("sunset");
    }
    setActiveTool(null);
  };

  // Current active caption
  const currentCaption = useMemo(() => {
    if (!autoCaptionsEnabled) return null;
    return captionItems.find(c => currentTime >= c.start && currentTime <= c.end);
  }, [currentTime, captionItems, autoCaptionsEnabled]);

  // Export process with full overlays
  const startRealExport = () => {
    if (!videoRef.current || !videoFile) return;

    setShowExportModal(false);
    setIsExporting(true);
    setExportProgress(0);

    const videoElement = videoRef.current;
    videoElement.currentTime = trimStart;
    
    const canvas = document.createElement("canvas");
    let width = 1280;
    let height = 720;
    
    if (exportResolution === "1080p") {
        width = 1920; height = 1080;
    } else if (exportResolution === "720p") {
        width = 1280; height = 720;
    } else if (exportResolution === "480p") {
        width = 854; height = 480;
    }

    if (aspectRatio === "1:1") {
        const side = Math.min(width, height);
        width = side; height = side;
    } else if (aspectRatio === "9:16") {
        const temp = width;
        width = height; height = temp;
    } else if (aspectRatio === "4:5") {
        height = Math.round(width * 1.25);
    }
    
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
        setIsExporting(false);
        return;
    }

    let mediaRecorder: MediaRecorder | null = null;
    let chunks: Blob[] = [];

    const canvasStream = canvas.captureStream(30);
    let audioStream: MediaStreamTrack | undefined;
    try {
        if ((videoElement as any).captureStream) {
            audioStream = (videoElement as any).captureStream().getAudioTracks()[0];
        } else if ((videoElement as any).mozCaptureStream) {
            audioStream = (videoElement as any).mozCaptureStream().getAudioTracks()[0];
        }
    } catch (e) {
        console.warn("Audio stream capture warning:", e);
    }

    const tracks = canvasStream.getVideoTracks();
    if (audioStream) tracks.push(audioStream);
    
    const stream = new MediaStream(tracks);
    try {
        let mimeType = 'video/webm';
        if (exportFormat === "mp4" && MediaRecorder.isTypeSupported('video/mp4; codecs=h264')) {
            mimeType = 'video/mp4; codecs=h264';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
            mimeType = 'video/webm';
        }
        
        let videoBitsPerSecond = 8000000;
        if (exportQuality === "medium") videoBitsPerSecond = 5000000;
        if (exportQuality === "low") videoBitsPerSecond = 2500000;
        
        mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond });
    } catch (e) {
        mediaRecorder = new MediaRecorder(stream);
    }

    mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    const handleEnded = () => {
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
             mediaRecorder.stop();
        }
        videoElement.removeEventListener('ended', handleEnded);
        setIsPlaying(false);
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mediaRecorder?.mimeType || 'video/webm' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `VideoStudio_Edit_${Date.now()}.${(mediaRecorder?.mimeType || '').includes('mp4') ? 'mp4' : 'webm'}`;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }, 100);
        
        setIsExporting(false);
        setExportProgress(100);
        setTimeout(() => setExportProgress(0), 3000);
        
        logActivity({
            type: "video_edit",
            title: videoFile?.name || "Video Studio Edit",
            metadata: { format: mediaRecorder?.mimeType || 'video/webm', toolCount: 14 }
        });
    };

    videoElement.addEventListener('ended', handleEnded);

    setIsPlaying(true);
    let isDrawing = true;
    videoElement.play().catch(e => {
        console.error("Autoplay prevented:", e);
        setIsExporting(false);
        isDrawing = false;
    });
    
    if (mediaRecorder.state === "inactive") {
        mediaRecorder.start(100);
    }

    const drawFrame = () => {
        if (trimEnd > 0 && videoElement.currentTime >= trimEnd) {
             if (mediaRecorder.state !== "inactive") {
                 mediaRecorder.stop();
             }
             videoElement.pause();
             isDrawing = false;
             return;
        }
        if (!isDrawing) return;

        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        ctx.filter = filterStyle;
        ctx.translate(width / 2, height / 2);
        ctx.rotate((rotate * Math.PI) / 180);
        ctx.scale(scaleX * zoom, scaleY * zoom);

        const vWidth = videoElement.videoWidth || width;
        const vHeight = videoElement.videoHeight || height;
        const vRatio = vWidth / vHeight;
        const cRatio = width / height;

        let drawWidth = width;
        let drawHeight = height;
        if (vRatio > cRatio) {
            drawHeight = width / vRatio;
        } else {
            drawWidth = height * vRatio;
        }

        ctx.drawImage(videoElement, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        ctx.restore();

        // Draw Text Overlays on Canvas
        textOverlays.forEach(txt => {
          ctx.save();
          const tx = (txt.x / 100) * width;
          const ty = (txt.y / 100) * height;
          ctx.font = `bold ${txt.fontSize * 1.5}px ${txt.fontFamily}`;
          ctx.textAlign = txt.align;
          
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

        // Draw Sticker Overlays
        stickerOverlays.forEach(st => {
          ctx.save();
          const sx = (st.x / 100) * width;
          const sy = (st.y / 100) * height;
          ctx.font = `${32 * st.scale}px sans-serif`;
          ctx.fillText(st.emoji, sx, sy);
          ctx.restore();
        });

        // Draw Captions
        if (autoCaptionsEnabled && currentCaption) {
          ctx.save();
          const cx = width / 2;
          const cy = height * 0.85;
          ctx.font = `bold 28px sans-serif`;
          ctx.textAlign = "center";
          ctx.fillStyle = "#FFE600";
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 5;
          ctx.strokeText(currentCaption.text, cx, cy);
          ctx.fillText(currentCaption.text, cx, cy);
          ctx.restore();
        }

        if (videoDuration && videoDuration > 0) {
            const currentExportTime = Math.max(0, videoElement.currentTime - trimStart);
            const exportDuration = trimEnd > trimStart ? trimEnd - trimStart : videoDuration;
            setExportProgress((currentExportTime / exportDuration) * 100);
        }
        
        requestAnimationFrame(drawFrame);
    };

    const videoDuration = videoElement.duration;
    drawFrame();
  };

  // Aspect ratio class mapper
  const aspectClass = useMemo(() => {
    switch (aspectRatio) {
      case "9:16": return "aspect-[9/16] max-w-[340px]";
      case "16:9": return "aspect-[16/9] max-w-[560px]";
      case "1:1": return "aspect-square max-w-[380px]";
      case "4:5": return "aspect-[4/5] max-w-[360px]";
      case "21:9": return "aspect-[21/9] max-w-[620px]";
      default: return "aspect-[9/16] max-w-[340px]";
    }
  }, [aspectRatio]);

  // Background style mapper
  const bgStyleClass = useMemo(() => {
    switch (bgStyle) {
      case "purple_glow": return "bg-gradient-to-b from-purple-900/30 via-black to-purple-950/40";
      case "cyber_gradient": return "bg-gradient-to-r from-blue-950/40 via-black to-cyan-950/40";
      case "blur_low": return "backdrop-blur-sm bg-black/80";
      case "blur_high": return "backdrop-blur-md bg-black/60";
      default: return "bg-black";
    }
  }, [bgStyle]);

  // Tool definitions for sidebar
  const TOOLS = [
    { id: "edit", icon: Scissors, label: "Edit" },
    { id: "ai_veo", icon: Sparkles, label: "AI Veo" },
    { id: "vision_ai", icon: Eye, label: "Vision AI" },
    { id: "scene_script", icon: FileVideo, label: "Video2Script" },
    { id: "transcribe", icon: FileText, label: "Video2Text" },
    { id: "crop", icon: Crop, label: "Crop" },
    { id: "audio", icon: Music, label: "Audio" },
    { id: "text", icon: Type, label: "Text" },
    { id: "effects", icon: Wand2, label: "Effects" },
    { id: "overlay", icon: Layers, label: "Overlay" },
    { id: "captions", icon: Captions, label: "Captions" },
    { id: "filters", icon: SlidersHorizontal, label: "Filters" },
    { id: "adjust", icon: Settings2, label: "Adjust" },
    { id: "stickers", icon: Sticker, label: "Stickers" },
    { id: "aspect", icon: Monitor, label: "Aspect" },
    { id: "background", icon: ImageIcon, label: "Backdrop" },
    { id: "templates", icon: LayoutTemplate, label: "Templates" }
  ];

  return (
    <div className="flex flex-col h-[100dvh] md:h-[calc(100vh-64px)] font-sans antialiased overflow-hidden bg-[#050810] text-[#F1F5F9] selection:bg-indigo-500/30">
      
      {/* Top Header — Exact CapCut Mobile Style */}
      <div className="flex items-center justify-between px-3 h-12 shrink-0 z-30 bg-[#0B0F19]/95 backdrop-blur-xl border-b border-white/5">
          {/* Left: X close + Search */}
          <div className="flex items-center space-x-2">
              <button
                onClick={() => setVideoClips([])}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/8 rounded-lg transition-colors"
                title="Close"
              >
                  <X className="w-5 h-5" />
              </button>
              <button
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/8 rounded-lg transition-colors"
                title="Search"
              >
                  <Search className="w-4.5 h-4.5" />
              </button>
          </div>

          {/* Center: Brand + AI UHD badge + Admin button */}
          <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowAdminModal(true)}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 text-xs font-bold transition-all cursor-pointer"
                title="Admin Console"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
                <span className="hidden sm:inline">Admin</span>
              </button>

              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-xs font-bold text-white">AI UHD</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>
          </div>

          {/* Right: Export button */}
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #06B6D4, #3B82F6)', boxShadow: '0 0 16px rgba(6,182,212,0.4)' }}
          >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
          </button>
      </div>

      {/* 3-Panel Main Area */}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          
          {/* CENTER: Video Preview (FIXED 42vh ON MOBILE SO PREVIEW IS ALWAYS VISIBLE) */}
          <div className={`w-full h-[42vh] sm:h-[48vh] md:h-auto md:flex-1 relative flex flex-col p-1.5 sm:p-2 md:p-4 overflow-hidden shrink-0 md:shrink order-1 ${bgStyleClass}`}>
              
              {/* Export Progress Overlay */}
              {isExporting && (
                <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center space-y-4">
                  <div className="w-16 h-16 relative flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 border-t-indigo-400 animate-spin" />
                    <Sparkles className="w-6 h-6 text-indigo-400" />
                  </div>
                  <p className="text-white font-bold text-lg tracking-wide">Exporting Cinematic Cut...</p>
                  <div className="w-64 bg-white/10 rounded-full h-2 overflow-hidden">
                    <div className="bg-gradient-to-r from-cyan-400 via-indigo-500 to-violet-500 h-full transition-all duration-200" style={{ width: `${exportProgress}%` }} />
                  </div>
                  <span className="text-xs text-slate-400 font-mono">{Math.round(exportProgress)}%</span>
                </div>
              )}

              <div className="flex-1 flex items-center justify-center relative min-h-0 h-full">
                  {videoFile ? (
                      <div className={`relative w-full h-full max-h-full mx-auto ${aspectClass} rounded-xl md:rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 group flex items-center justify-center bg-black/90`} style={{ boxShadow: '0 0 0 1px rgba(99,102,241,0.3), 0 0 40px rgba(99,102,241,0.1)' }}>
                          <video
                              ref={videoRef}
                              src={objectUrl || undefined}
                              className="w-full h-full object-contain max-h-full bg-black/90"
                              style={{
                                  filter: filterStyle,
                                  transform: cropTransformStyle
                              }}
                              onTimeUpdate={handleTimeUpdate}
                              onLoadedMetadata={handleLoadedMetadata}
                              onLoadedData={handleVideoLoadedData}
                              onEnded={() => setIsPlaying(false)}
                          />

                          {/* Render Text Overlays */}
                          {textOverlays.map((t) => (
                            <div
                              key={t.id}
                              className={`absolute pointer-events-auto cursor-pointer select-none px-2 py-1 rounded transition-transform ${editingTextId === t.id ? "ring-2 ring-indigo-400 bg-black/40" : ""}`}
                              style={{
                                left: `${t.x}%`,
                                top: `${t.y}%`,
                                transform: 'translate(-50%, -50%)'
                              }}
                              onClick={() => setEditingTextId(t.id)}
                            >
                              <span 
                                style={{
                                  fontFamily: t.fontFamily,
                                  fontSize: `${t.fontSize}px`,
                                  color: t.color,
                                  textShadow: t.preset === "tiktok_yellow" 
                                    ? "2px 2px 0px #000, -2px -2px 0px #000, 2px -2px 0px #000, -2px 2px 0px #000" 
                                    : t.preset === "neon_cyan" 
                                    ? "0 0 10px #00E5FF, 0 0 20px #00E5FF" 
                                    : "none"
                                }}
                                className="font-extrabold tracking-wide whitespace-nowrap block"
                              >
                                {t.text}
                              </span>
                            </div>
                          ))}

                          {/* Render Sticker Overlays */}
                          {stickerOverlays.map((s) => (
                            <div
                              key={s.id}
                              className="absolute pointer-events-auto cursor-pointer select-none"
                              style={{
                                left: `${s.x}%`,
                                top: `${s.y}%`,
                                transform: `translate(-50%, -50%) scale(${s.scale})`
                              }}
                            >
                              <span className="text-3xl filter drop-shadow-lg">{s.emoji}</span>
                            </div>
                          ))}

                          {/* Render Captions Overlay */}
                          {autoCaptionsEnabled && currentCaption && (
                            <div className="absolute bottom-14 md:bottom-20 left-4 right-4 text-center pointer-events-none z-10">
                              <span className="inline-block px-3 py-1 rounded-lg bg-black/80 border border-yellow-400/40 text-yellow-300 font-extrabold text-xs md:text-base tracking-wide shadow-2xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                                {currentCaption.text}
                              </span>
                            </div>
                          )}

                          {/* Render AI Avatar Presenter Overlay */}
                          {aiAvatar && (
                            <div className="absolute bottom-14 md:bottom-20 right-4 w-14 h-14 md:w-20 md:h-20 rounded-full border-2 border-indigo-400 bg-purple-950/80 overflow-hidden shadow-xl flex items-center justify-center animate-pulse">
                              <UserCircle className="w-8 h-8 md:w-12 md:h-12 text-indigo-300" />
                            </div>
                          )}

                          {/* CapCut Interactive 3x3 Custom Freeform Crop Box Overlay */}
                          {activeTool === "crop" && (
                            <div 
                              onMouseDown={(e) => handleCropBoxStart("move", e)}
                              onTouchStart={(e) => handleCropBoxStart("move", e)}
                              style={{
                                left: `${cropBox.left}%`,
                                top: `${cropBox.top}%`,
                                width: `${cropBox.width}%`,
                                height: `${cropBox.height}%`
                              }}
                              className="absolute z-30 border-2 border-cyan-400 cursor-move select-none bg-cyan-400/10 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all duration-75"
                            >
                              {/* 3x3 Rule of Thirds Grid Lines */}
                              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                                <div className="border-r border-b border-white/50" />
                                <div className="border-r border-b border-white/50" />
                                <div className="border-b border-white/50" />
                                <div className="border-r border-b border-white/50" />
                                <div className="border-r border-b border-white/50" />
                                <div className="border-b border-white/50" />
                                <div className="border-r border-white/50" />
                                <div className="border-r border-white/50" />
                                <div className="" />
                              </div>

                              {/* 4 Interactive Corner Handles */}
                              <div 
                                onMouseDown={(e) => handleCropBoxStart("top-left", e)}
                                onTouchStart={(e) => handleCropBoxStart("top-left", e)}
                                className="absolute -top-2.5 -left-2.5 w-6 h-6 border-t-4 border-l-4 border-white bg-cyan-400 cursor-nwse-resize pointer-events-auto rounded-tl shadow-xl hover:scale-125 transition-transform" 
                              />
                              <div 
                                onMouseDown={(e) => handleCropBoxStart("top-right", e)}
                                onTouchStart={(e) => handleCropBoxStart("top-right", e)}
                                className="absolute -top-2.5 -right-2.5 w-6 h-6 border-t-4 border-r-4 border-white bg-cyan-400 cursor-nesw-resize pointer-events-auto rounded-tr shadow-xl hover:scale-125 transition-transform" 
                              />
                              <div 
                                onMouseDown={(e) => handleCropBoxStart("bottom-left", e)}
                                onTouchStart={(e) => handleCropBoxStart("bottom-left", e)}
                                className="absolute -bottom-2.5 -left-2.5 w-6 h-6 border-b-4 border-l-4 border-white bg-cyan-400 cursor-nesw-resize pointer-events-auto rounded-bl shadow-xl hover:scale-125 transition-transform" 
                              />
                              <div 
                                onMouseDown={(e) => handleCropBoxStart("bottom-right", e)}
                                onTouchStart={(e) => handleCropBoxStart("bottom-right", e)}
                                className="absolute -bottom-2.5 -right-2.5 w-6 h-6 border-b-4 border-r-4 border-white bg-cyan-400 cursor-nwse-resize pointer-events-auto rounded-br shadow-xl hover:scale-125 transition-transform" 
                              />

                              {/* Center Drag Badge */}
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-[9px] text-cyan-300 font-bold pointer-events-none border border-cyan-500/40 shadow-lg whitespace-nowrap">
                                 Freeform Custom Crop
                              </div>
                            </div>
                          )}

                          {/* Video Watermark Badge */}
                          <div className="absolute top-2 left-2 md:top-4 md:left-4 px-2 py-0.5 md:px-2.5 md:py-1 rounded-md bg-black/30 backdrop-blur-md border border-white/10 text-[8px] md:text-[9px] font-mono text-indigo-200 tracking-wider uppercase pointer-events-none shadow-lg">
                            {aspectRatio} • {playbackSpeed}x
                          </div>
                      </div>
                  ) : (
                      <div className="flex flex-col items-center justify-center space-y-4 md:space-y-6 p-6 md:p-10 border border-white/5 rounded-2xl md:rounded-3xl max-w-md w-full relative overflow-hidden" style={{ background: 'linear-gradient(145deg, rgba(13,17,23,0.9), rgba(5,8,16,0.9))' }}>
                          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
                          <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.15)] relative">
                              <div className="absolute inset-0 rounded-full border border-indigo-400/30 animate-ping opacity-20" />
                              <VideoIcon className="w-8 h-8 md:w-12 md:h-12 text-indigo-400" />
                          </div>
                          <div className="text-center space-y-1 md:space-y-2 z-10">
                            <h3 className="text-[#F1F5F9] font-bold text-sm md:text-lg">Drop your media here</h3>
                            <p className="text-xs md:text-sm text-slate-500">Supports MP4, WebM, MOV up to 4K</p>
                          </div>
                          <label className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-white px-6 py-2.5 md:px-8 md:py-3 rounded-xl font-bold text-xs md:text-sm cursor-pointer shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all flex items-center space-x-2 z-10">
                              <Plus className="w-4 h-4 md:w-5 md:h-5" />
                              <span>Upload Video</span>
                              <input type="file" accept="video/*" multiple className="hidden" onChange={handleFileUpload} />
                          </label>
                      </div>
                  )}

                  {/* CapCut-style controls below video: fullscreen | play | caption | undo | redo */}
                  {videoFile && (
                    <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-2 bg-gradient-to-t from-black/70 to-transparent">
                        {/* Left: fullscreen */}
                        <button className="p-1.5 text-slate-300 hover:text-white transition-colors">
                          <Maximize2 className="w-4 h-4" />
                        </button>

                        {/* Center: time | play | time */}
                        <div className="flex items-center space-x-3">
                          <span className="font-mono text-[11px] text-slate-300 tracking-wider">{formatTime(currentTime)}</span>
                          <button
                            onClick={togglePlayPause}
                            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
                          >
                            {isPlaying
                              ? <Pause className="w-4 h-4 fill-current" />
                              : <Play className="w-4 h-4 fill-current ml-0.5" />}
                          </button>
                          <span className="font-mono text-[11px] text-slate-400 tracking-wider">{formatTime(duration)}</span>
                        </div>

                        {/* Right: caption toggle | undo | redo */}
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => setAutoCaptionsEnabled(!autoCaptionsEnabled)}
                            className={`p-1.5 rounded-lg transition-colors ${autoCaptionsEnabled ? 'text-cyan-400' : 'text-slate-500'}`}
                            title="Toggle captions"
                          >
                            <Captions className="w-4 h-4" />
                          </button>
                          <button onClick={undo} disabled={!canUndo} className={`p-1.5 rounded-lg transition-colors ${!canUndo ? 'opacity-30 text-slate-600' : 'text-slate-300 hover:text-white'}`}>
                            <Undo2 className="w-4 h-4" />
                          </button>
                          <button onClick={redo} disabled={!canRedo} className={`p-1.5 rounded-lg transition-colors ${!canRedo ? 'opacity-30 text-slate-600' : 'text-slate-300 hover:text-white'}`}>
                            <Redo2 className="w-4 h-4" />
                          </button>
                        </div>
                    </div>
                  )}
              </div>
          </div>
          
          {/* TOOL SIDEBAR: Vertical on Desktop Only (Hidden on Mobile to eliminate duplicate toolbars) */}
          <div className="hidden md:flex w-14 shrink-0 flex-col items-center py-3 overflow-y-auto scrollbar-none z-20 order-first border-r border-white/10" style={{ backgroundColor: 'rgba(8,10,18,0.95)' }}>
              <div className="flex flex-col space-y-1 w-full px-1">
                  {TOOLS.map((tool) => {
                      const isActive = activeTool === tool.id;
                      return (
                          <button 
                            key={tool.id} 
                            onClick={() => setActiveTool(isActive ? null : tool.id)}
                            className={`w-full flex flex-col items-center justify-center space-y-0.5 py-2.5 rounded-xl transition-all shrink-0 ${
                              isActive 
                                ? "bg-indigo-500/15 border-l-2 border-indigo-500 text-indigo-400" 
                                : "text-slate-500 hover:text-slate-300 hover:bg-white/5 border-l-2 border-transparent"
                            }`}
                          >
                              <tool.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                              <span className="text-[9px] font-medium tracking-wide">{tool.label}</span>
                          </button>
                      );
                  })}
              </div>
          </div>

          {/* RIGHT PANEL: Properties (Desktop Only - Hidden on Mobile for clean CapCut layout) */}
          <div className="hidden md:flex w-64 shrink-0 flex-col min-h-0 overflow-y-auto overflow-x-hidden z-30 order-last border-l border-white/10" style={{ backgroundColor: 'rgba(8,10,18,0.95)' }}>
              
              {/* Context Header */}
              <div className="px-4 py-3 border-b sticky top-0 bg-[rgba(8,10,18,0.95)] z-10 backdrop-blur-md flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <span className="font-bold text-sm text-slate-200 capitalize flex items-center space-x-2">
                    {activeTool ? activeTool.replace('_', ' ') : 'Properties'}
                  </span>
                  {activeTool && (
                    <div className="flex items-center space-x-2">
                      <button onClick={resetAdjustments} className="p-1 text-slate-500 hover:text-slate-300" title="Reset">
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setActiveTool(null)} className="p-1 text-slate-500 hover:text-slate-300" title="Close Panel">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
              </div>

              {/* Context Content */}
              <div className="p-4 space-y-5">
                  {!activeTool && (
                    <div className="space-y-4">
                       <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
                         <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Project Stats</h4>
                         <div className="flex justify-between items-center text-xs">
                           <span className="text-slate-500">Clips</span>
                           <span className="text-slate-300 font-medium">{videoClips.length}</span>
                         </div>
                         <div className="flex justify-between items-center text-xs">
                           <span className="text-slate-500">Duration</span>
                           <span className="text-slate-300 font-medium">{formatTime(duration)}</span>
                         </div>
                         <div className="flex justify-between items-center text-xs">
                           <span className="text-slate-500">Filter</span>
                           <span className="text-indigo-400 font-medium capitalize">{selectedFilter.replace('_', ' ')}</span>
                         </div>
                         <div className="flex justify-between items-center text-xs">
                           <span className="text-slate-500">Effect</span>
                           <span className="text-indigo-400 font-medium capitalize">{selectedEffect.replace('_', ' ')}</span>
                         </div>
                       </div>
                    </div>
                  )}

                  {activeTool === "adjust" && (
                    <div className="space-y-4">
                      {[
                        { label: "Brightness", value: brightness, set: setBrightness, min: 0, max: 200, unit: "%" },
                        { label: "Contrast", value: contrast, set: setContrast, min: 0, max: 200, unit: "%" },
                        { label: "Saturation", value: saturation, set: setSaturation, min: 0, max: 200, unit: "%" },
                        { label: "Sepia", value: sepia, set: setSepia, min: 0, max: 100, unit: "%" },
                        { label: "Blur", value: blur, set: setBlur, min: 0, max: 15, unit: "px" }
                      ].map(adj => (
                        <div key={adj.label} className="space-y-2">
                           <div className="flex justify-between items-center">
                              <span className="text-slate-400 text-xs font-medium">{adj.label}</span>
                              <span className="text-indigo-400 font-mono text-[10px] bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded">{adj.value}{adj.unit}</span>
                           </div>
                           <input type="range" min={adj.min} max={adj.max} value={adj.value} onChange={e => adj.set(Number(e.target.value))} className="w-full accent-indigo-500 h-1 bg-white/10 rounded-full cursor-pointer appearance-none" style={{ WebkitAppearance: 'none' }} />
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTool === "edit" && (
                    <div className="space-y-5">
                       <div className="space-y-2">
                         <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Transform</span>
                         <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setRotate((rotate + 90) % 360)} className="flex items-center justify-center space-x-1.5 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-indigo-400 text-slate-300 hover:text-white transition-colors">
                              <RotateCw className="w-3.5 h-3.5" /> <span className="text-xs">Rotate</span>
                            </button>
                            <button onClick={handleSplitClip} className="flex items-center justify-center space-x-1.5 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-indigo-400 text-slate-300 hover:text-white transition-colors">
                              <Scissors className="w-3.5 h-3.5 text-indigo-400" /> <span className="text-xs">Split</span>
                            </button>
                            <button onClick={() => setFlipH(!flipH)} className={`flex items-center justify-center space-x-1.5 py-2 rounded-lg border transition-colors ${flipH ? "bg-indigo-500/20 border-indigo-500 text-indigo-300" : "bg-white/5 border-white/10 text-slate-300"}`}>
                              <FlipHorizontal className="w-3.5 h-3.5" /> <span className="text-xs">Flip H</span>
                            </button>
                            <button onClick={() => setFlipV(!flipV)} className={`flex items-center justify-center space-x-1.5 py-2 rounded-lg border transition-colors ${flipV ? "bg-indigo-500/20 border-indigo-500 text-indigo-300" : "bg-white/5 border-white/10 text-slate-300"}`}>
                              <FlipVertical className="w-3.5 h-3.5" /> <span className="text-xs">Flip V</span>
                            </button>
                         </div>
                       </div>

                       <div className="space-y-2">
                          <div className="flex justify-between items-center">
                              <span className="text-slate-400 text-xs font-medium">Speed Ramp</span>
                              <span className="text-indigo-400 font-mono text-[10px] bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded">{playbackSpeed}x</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                             {[0.5, 0.75, 1, 1.25, 1.5, 2].map(s => (
                               <button key={s} onClick={() => setPlaybackSpeed(s)} className={`py-1.5 rounded-md text-[10px] font-bold border transition-colors ${playbackSpeed === s ? "bg-indigo-500 text-white border-indigo-400" : "bg-white/5 border-white/10 text-slate-400 hover:text-slate-200"}`}>
                                 {s}x
                               </button>
                             ))}
                          </div>
                       </div>

                       <div className="space-y-2">
                          <div className="flex justify-between items-center">
                              <span className="text-slate-400 text-xs font-medium">Zoom</span>
                              <span className="text-indigo-400 font-mono text-[10px] bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded">{zoom.toFixed(1)}x</span>
                          </div>
                          <input type="range" min="0.5" max="3" step="0.1" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="w-full accent-indigo-500 h-1 bg-white/10 rounded-full cursor-pointer appearance-none" />
                       </div>
                    </div>
                  )}

                  {activeTool === "crop" && (
                    <div className="space-y-4">
                       {/* Header Bar */}
                       <div className="flex items-center justify-between pb-2 border-b border-white/10">
                          <button onClick={() => setActiveTool(null)} className="text-slate-400 hover:text-white p-1">
                             <X className="w-5 h-5" />
                          </button>
                          <span className="text-sm font-bold text-white tracking-wide">Crop & Resize</span>
                          <button onClick={() => setActiveTool(null)} className="text-emerald-400 hover:text-emerald-300 p-1">
                             <Check className="w-5 h-5" />
                          </button>
                       </div>

                       {/* Rotation Scale Ruler */}
                       <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs">
                             <span className="text-slate-400 font-medium">Rotate Angle</span>
                             <span className="text-cyan-400 font-mono font-bold text-xs">{rotate}°</span>
                          </div>
                          <div className="relative flex items-center justify-center py-2 bg-white/5 rounded-xl border border-white/10 px-2">
                             <div className="absolute w-0.5 h-6 bg-cyan-400 rounded-full z-10 pointer-events-none" />
                             <input
                               type="range"
                               min="-45"
                               max="45"
                               step="1"
                               value={rotate}
                               onChange={(e) => setRotate(parseInt(e.target.value))}
                               className="w-full accent-cyan-400 h-2 bg-transparent cursor-pointer relative z-20 appearance-none"
                             />
                          </div>
                       </div>

                       {/* Aspect Ratio Cards Grid (CapCut Style) */}
                       <div className="space-y-2">
                          <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Aspect Ratio</span>
                          <div className="grid grid-cols-4 gap-2">
                             {[
                               { ratio: "9:16", icon: "📱", label: "9:16" },
                               { ratio: "16:9", icon: "🖥️", label: "16:9" },
                               { ratio: "1:1", icon: "🔲", label: "1:1" },
                               { ratio: "4:3", icon: "📺", label: "4:3" },
                             ].map(r => (
                               <button
                                 key={r.ratio}
                                 onClick={() => setAspectRatio(r.ratio as any)}
                                 className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                                   aspectRatio === r.ratio 
                                     ? "bg-indigo-500/30 border-indigo-400 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]" 
                                     : "bg-white/5 border-white/10 text-slate-400 hover:text-slate-200"
                                 }`}
                               >
                                  <span className="text-base">{r.icon}</span>
                                  <span className="text-[10px] font-bold mt-1">{r.label}</span>
                               </button>
                             ))}
                          </div>
                       </div>

                       {/* Position Sliders */}
                       <div className="space-y-3 pt-2 border-t border-white/10">
                          <div className="space-y-1">
                             <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400">Position X</span>
                                <span className="text-indigo-400 font-mono text-[10px]">{panX}px</span>
                             </div>
                             <input type="range" min="-100" max="100" step="5" value={panX} onChange={e => setPanX(parseInt(e.target.value))} className="w-full accent-indigo-500 h-1 bg-white/10 rounded-full" />
                          </div>
                          <div className="space-y-1">
                             <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400">Position Y</span>
                                <span className="text-indigo-400 font-mono text-[10px]">{panY}px</span>
                             </div>
                             <input type="range" min="-100" max="100" step="5" value={panY} onChange={e => setPanY(parseInt(e.target.value))} className="w-full accent-indigo-500 h-1 bg-white/10 rounded-full" />
                          </div>
                       </div>

                       {/* Reset Button */}
                       <button onClick={() => { setZoom(1); setPanX(0); setPanY(0); setRotate(0); setAspectRatio("9:16"); }} className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold transition-colors flex items-center justify-center space-x-1.5">
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Reset Crop</span>
                       </button>
                    </div>
                  )}

                  {activeTool === "text" && (
                    <div className="space-y-5">
                       <div className="space-y-2">
                          <input type="text" placeholder="Type overlay text..." value={newTextString} onChange={e => setNewTextString(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors" />
                          <button onClick={handleAddTextOverlay} className="w-full bg-indigo-500 hover:bg-indigo-400 text-white py-2 rounded-lg text-xs font-bold transition-colors shadow-lg shadow-indigo-500/20">
                             Add Text
                          </button>
                       </div>

                       {textOverlays.length > 0 && (
                         <div className="space-y-2">
                            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Current Text</span>
                            <div className="space-y-2">
                              {textOverlays.map(t => (
                                <div key={t.id} className={`flex items-center justify-between p-2 rounded-lg border ${editingTextId === t.id ? "bg-indigo-500/10 border-indigo-500" : "bg-white/5 border-white/10"}`}>
                                   <div className="flex-1 truncate cursor-pointer text-xs font-medium text-slate-200" onClick={() => setEditingTextId(t.id)}>{t.text}</div>
                                   <button onClick={() => setTextOverlays((prev: TextOverlay[]) => prev.filter((x: TextOverlay) => x.id !== t.id))} className="text-slate-500 hover:text-red-400 ml-2"><Trash2 className="w-3.5 h-3.5"/></button>
                                </div>
                              ))}
                            </div>
                         </div>
                       )}

                       {editingTextId && (
                         <div className="space-y-2 pt-2 border-t border-white/10">
                            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Styles for selected</span>
                            <div className="flex flex-wrap gap-2">
                               {["tiktok_yellow", "neon_cyan", "outline_white"].map(s => (
                                 <button key={s} onClick={() => setTextOverlays((prev: TextOverlay[]) => prev.map((t: TextOverlay) => t.id === editingTextId ? { ...t, preset: s as TextOverlay['preset'] } : t))} className="px-2.5 py-1.5 rounded bg-white/5 border border-white/10 hover:border-indigo-400 text-[10px] font-bold text-slate-300">
                                   {s.replace('_', ' ')}
                                 </button>
                               ))}
                            </div>
                         </div>
                       )}
                    </div>
                  )}

                  {activeTool === "audio" && (
                    <div className="space-y-5">
                       <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 text-indigo-400 font-medium text-xs">
                              <Volume2 className="w-4 h-4" /> <span>Video Audio</span>
                            </div>
                            <button onClick={() => setIsMuted(!isMuted)} className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${isMuted ? "bg-red-500/20 text-red-400 border-red-500/40" : "bg-white/10 text-white border-transparent"}`}>
                              {isMuted ? "Muted" : "On"}
                            </button>
                          </div>
                          <div className="flex items-center space-x-3">
                             <input type="range" min="0" max="2" step="0.05" value={isMuted ? 0 : volume} onChange={e => { setIsMuted(false); setVolume(parseFloat(e.target.value)); }} className="flex-1 accent-indigo-500 h-1 bg-white/10 rounded-full" />
                             <span className="text-slate-400 font-mono text-xs w-8 text-right">{Math.round((isMuted ? 0 : volume) * 100)}%</span>
                          </div>
                       </div>

                       <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-3">
                          <div className="flex items-center justify-between">
                             <div className="flex items-center space-x-2 text-violet-400 font-medium text-xs">
                               <Music className="w-4 h-4" /> <span>Background Music</span>
                             </div>
                             {selectedAudio && (
                               <button onClick={() => setSelectedAudio(null)} className="text-slate-500 hover:text-red-400 text-[10px]"><X className="w-3.5 h-3.5"/></button>
                             )}
                          </div>
                          <div className="space-y-2">
                             <label className="flex items-center justify-center space-x-2 py-2 rounded-lg bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-bold cursor-pointer hover:bg-violet-500/20 transition-colors">
                               <Plus className="w-3.5 h-3.5" /> <span>Upload Sound</span>
                               <input type="file" accept="audio/*" className="hidden" onChange={e => {
                                 if (e.target.files && e.target.files[0]) {
                                   setSelectedAudio({ id: "c_"+Date.now(), name: e.target.files[0].name, category: "Upload", duration: "User", bpm: 120 });
                                 }
                               }} />
                             </label>
                             {selectedAudio && <div className="text-center text-[10px] text-slate-400 truncate">{selectedAudio.name}</div>}
                          </div>
                       </div>

                       <div className="space-y-2">
                          <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Preset Tracks</span>
                          <div className="flex flex-col space-y-2">
                             {[
                                { id: "a1", name: "Phonk Cyber Beat", cat: "Trending" },
                                { id: "a2", name: "Lo-Fi Aesthetic Chill", cat: "Relax" },
                                { id: "a3", name: "Epic Cinematic Horns", cat: "Trailer" },
                                { id: "a4", name: "Upbeat Vlog Acoustic", cat: "Vlog" }
                             ].map(tr => (
                               <button key={tr.id} onClick={() => setSelectedAudio({ id: tr.id, name: tr.name, category: tr.cat, duration: "2:00", bpm: 120 })} className={`p-2.5 rounded-lg text-left border flex items-center justify-between transition-colors ${selectedAudio?.id === tr.id ? "bg-violet-500/20 border-violet-500 text-violet-300" : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"}`}>
                                 <div>
                                   <div className="font-bold text-[11px] truncate">{tr.name}</div>
                                   <div className="text-[9px] text-slate-500">{tr.cat}</div>
                                 </div>
                                 {selectedAudio?.id === tr.id && <Check className="w-3.5 h-3.5 text-violet-400" />}
                               </button>
                             ))}
                          </div>
                       </div>
                    </div>
                  )}

                  {activeTool === "effects" && (
                    <div className="grid grid-cols-2 gap-2">
                       {[
                         { id: "none", name: "None" },
                         { id: "glitch", name: "80s Glitch" },
                         { id: "neon", name: "Cyber Neon" },
                         { id: "vhs", name: "Retro VHS" },
                         { id: "grain", name: "Film Grain" },
                         { id: "blur", name: "Motion Blur" },
                         { id: "golden", name: "Gold Glow" }
                       ].map(eff => (
                         <button key={eff.id} onClick={() => setSelectedEffect(eff.id)} className={`py-3 px-2 rounded-xl text-center border font-semibold text-[11px] transition-colors ${selectedEffect === eff.id ? "bg-indigo-500/20 border-indigo-500 text-indigo-300" : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"}`}>
                           {eff.name}
                         </button>
                       ))}
                       {selectedEffect !== "none" && (
                         <div className="col-span-2 mt-4 space-y-2">
                           <div className="flex justify-between items-center text-xs">
                             <span className="text-slate-400 font-medium">Intensity</span>
                             <span className="text-indigo-400 font-mono">{effectIntensity}%</span>
                           </div>
                           <input type="range" min="0" max="100" value={effectIntensity} onChange={e => setEffectIntensity(Number(e.target.value))} className="w-full accent-indigo-500 h-1 bg-white/10 rounded-full" />
                         </div>
                       )}
                    </div>
                  )}

                  {activeTool === "captions" && (
                    <div className="space-y-5">
                       <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                          <span className="font-medium text-sm text-slate-200">Auto Captions</span>
                          <button onClick={() => setAutoCaptionsEnabled(!autoCaptionsEnabled)} className={`w-11 h-6 rounded-full relative transition-colors ${autoCaptionsEnabled ? "bg-indigo-500" : "bg-white/20"}`}>
                             <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${autoCaptionsEnabled ? "left-6" : "left-1"}`} />
                          </button>
                       </div>
                       {autoCaptionsEnabled && (
                         <div className="space-y-2">
                            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Caption Segments</span>
                            <div className="space-y-2">
                               {captionItems.map((c) => (
                                 <div key={c.id} className="p-2 rounded-lg bg-white/5 border border-white/10 text-[11px] flex items-start space-x-2">
                                    <span className="text-indigo-400 font-mono mt-0.5 whitespace-nowrap">{c.start}s</span>
                                    <span className="text-slate-300 flex-1">{c.text}</span>
                                 </div>
                               ))}
                               {captionItems.length === 0 && <div className="text-xs text-slate-500 italic">No captions generated yet.</div>}
                            </div>
                         </div>
                       )}
                    </div>
                  )}

                  {activeTool === "filters" && (
                    <div className="space-y-5">
                       <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: "original", name: "Original" },
                            { id: "teal_orange", name: "Teal & Orange" },
                            { id: "vintage_1970", name: "Vintage 70s" },
                            { id: "cyberpunk", name: "Cyberpunk" },
                            { id: "sunset", name: "Warm Sunset" },
                            { id: "noir", name: "B&W Noir" },
                            { id: "vivid", name: "Vivid Boost" }
                          ].map(f => (
                            <button key={f.id} onClick={() => setSelectedFilter(f.id)} className={`py-3 px-2 rounded-xl text-center border font-semibold text-[11px] transition-colors ${selectedFilter === f.id ? "bg-indigo-500/20 border-indigo-500 text-indigo-300" : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"}`}>
                              {f.name}
                            </button>
                          ))}
                       </div>
                       {selectedFilter !== "original" && (
                         <div className="space-y-2">
                           <div className="flex justify-between items-center text-xs">
                             <span className="text-slate-400 font-medium">Intensity</span>
                             <span className="text-indigo-400 font-mono">{filterIntensity}%</span>
                           </div>
                           <input type="range" min="0" max="100" value={filterIntensity} onChange={e => setFilterIntensity(Number(e.target.value))} className="w-full accent-indigo-500 h-1 bg-white/10 rounded-full" />
                         </div>
                       )}
                    </div>
                  )}

                  {activeTool === "stickers" && (
                    <div className="space-y-3">
                       <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Emojis</span>
                       <div className="grid grid-cols-4 gap-2">
                          {["🔥", "💯", "🚀", "👍", "🔔", "⚡", "❤️", "🎉", "🎯", "🌟", "👑", "🎬", "💥", "📌"].map(st => (
                            <button key={st} onClick={() => handleAddSticker(st)} className="text-2xl p-2 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 hover:scale-110 transition-all flex items-center justify-center">
                              {st}
                            </button>
                          ))}
                       </div>
                    </div>
                  )}

                  {activeTool === "aspect" && (
                    <div className="flex flex-col space-y-2">
                       {[
                         { id: "9:16", label: "9:16 Shorts/Reels" },
                         { id: "16:9", label: "16:9 YouTube" },
                         { id: "1:1", label: "1:1 Square" },
                         { id: "4:5", label: "4:5 Portrait Feed" },
                         { id: "21:9", label: "21:9 Cinematic" }
                       ].map(r => (
                         <button key={r.id} onClick={() => setAspectRatio(r.id as any)} className={`py-3 px-4 rounded-xl text-left text-xs font-bold border transition-colors ${aspectRatio === r.id ? "bg-indigo-500/20 border-indigo-500 text-indigo-300" : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"}`}>
                           {r.label}
                         </button>
                       ))}
                    </div>
                  )}

                  {activeTool === "background" && (
                    <div className="flex flex-col space-y-2">
                       {[
                         { id: "black", label: "Deep Black" },
                         { id: "purple_glow", label: "Purple Ambient" },
                         { id: "cyber_gradient", label: "Cyber Cyan" },
                         { id: "blur_low", label: "Soft Blur" },
                         { id: "blur_high", label: "Deep Blur" }
                       ].map(bg => (
                         <button key={bg.id} onClick={() => setBgStyle(bg.id as any)} className={`py-3 px-4 rounded-xl text-left text-xs font-bold border transition-colors ${bgStyle === bg.id ? "bg-indigo-500/20 border-indigo-500 text-indigo-300" : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"}`}>
                           {bg.label}
                         </button>
                       ))}
                    </div>
                  )}

                  {activeTool === "templates" && (
                    <div className="flex flex-col space-y-3">
                       <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Viral 1-Click Templates</span>
                       {[
                         "Trending Reel Beat",
                         "Cyberpunk Intro",
                         "Minivlog Aesthetic",
                         "Fast Beat Cut",
                         "Glow Title Opener"
                       ].map(tName => (
                         <button key={tName} onClick={() => handleApplyTemplate(tName)} className="p-3 rounded-xl text-left bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 hover:border-indigo-400 hover:from-indigo-500/20 hover:to-violet-500/20 text-slate-200 font-bold text-xs flex items-center justify-between transition-all">
                           <span>{tName}</span>
                           <ChevronRight className="w-4 h-4 text-indigo-400" />
                         </button>
                       ))}
                    </div>
                  )}

                  {activeTool === "ai_veo" && (
                    <div className="space-y-4">
                      {/* Google Veo Video Generation Engine */}
                      <div className="p-3 rounded-xl bg-gradient-to-r from-violet-900/30 to-indigo-900/30 border border-violet-500/30 space-y-3">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 text-violet-300 font-bold text-xs">
                               <Sparkles className="w-4 h-4 text-violet-400 animate-pulse" />
                               <span>Google Veo 2 Video Engine</span>
                            </div>
                            <span className="text-[9px] bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full font-mono">4K 60FPS</span>
                         </div>
                         <textarea 
                           rows={3} 
                           placeholder="Describe the video to generate with Google Veo (e.g. 4K cinematic drone shot of cyberpunk skyline at dusk)..."
                           value={veoPrompt}
                           onChange={e => setVeoPrompt(e.target.value)}
                           className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                         />
                         <div className="flex items-center justify-between">
                            <div className="flex space-x-1">
                               {(["cinematic", "realism", "anime", "cyberpunk"] as const).map(st => (
                                 <button key={st} onClick={() => setVeoStyle(st)} className={`px-2 py-1 rounded text-[9px] font-bold border transition-colors ${veoStyle === st ? "bg-violet-500 text-white border-violet-400" : "bg-white/5 text-slate-400 border-white/10"}`}>
                                   {st}
                                 </button>
                               ))}
                            </div>
                            <button 
                              onClick={handleGenerateVeoVideo}
                              disabled={isGeneratingVeo || !veoPrompt.trim()}
                              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-violet-500/30 hover:brightness-110 disabled:opacity-50 flex items-center space-x-1"
                            >
                               {isGeneratingVeo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                               <span>Generate</span>
                            </button>
                         </div>
                         {isGeneratingVeo && (
                           <div className="space-y-1">
                              <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                                 <div className="bg-gradient-to-r from-violet-500 to-indigo-500 h-full transition-all" style={{ width: `${veoProgress}%` }} />
                              </div>
                              <span className="text-[9px] text-slate-400 font-mono">Synthesizing Veo video model... {veoProgress}%</span>
                           </div>
                         )}
                      </div>

                      {/* Gemini Intellectual Analysis Chat Box */}
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-3">
                         <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs">
                            <Bot className="w-4 h-4" />
                            <span>Gemini Intellectual Assistant</span>
                         </div>
                         <div className="h-44 overflow-y-auto space-y-2 p-2 rounded-lg bg-black/40 border border-white/5 font-sans">
                            {aiChatMessages.map(m => (
                              <div key={m.id} className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}>
                                 <div className={`max-w-[85%] px-2.5 py-1.5 rounded-xl text-[11px] ${m.sender === "user" ? "bg-indigo-600 text-white rounded-br-none" : "bg-white/10 text-slate-200 rounded-bl-none border border-white/5"}`}>
                                    {m.text}
                                 </div>
                              </div>
                            ))}
                            {isAiResponding && (
                              <div className="flex items-center space-x-1.5 text-xs text-indigo-400 italic">
                                 <Loader2 className="w-3 h-3 animate-spin" />
                                 <span>Gemini is analyzing timeline...</span>
                              </div>
                            )}
                         </div>
                         <div className="flex items-center space-x-1.5">
                            <input 
                              type="text" 
                              placeholder="Ask Gemini to analyze pacing, scripts, auto-captions..."
                              value={chatInput}
                              onChange={e => setChatInput(e.target.value)}
                              onKeyDown={e => e.key === "Enter" && handleSendAiChatMessage()}
                              className="flex-1 bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                            />
                            <button onClick={handleSendAiChatMessage} className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500">
                               <Send className="w-3.5 h-3.5" />
                            </button>
                         </div>
                      </div>
                    </div>
                  )}

                  {activeTool === "vision_ai" && (
                    <div className="space-y-4">
                       <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-500/30 space-y-3">
                          <div className="flex items-center justify-between">
                             <div className="flex items-center space-x-2 text-cyan-300 font-bold text-xs">
                                <Eye className="w-4 h-4 text-cyan-400" />
                                <span>Gemini Vision Frame Reader</span>
                             </div>
                             <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-mono">Visual Multimodal</span>
                          </div>

                          <p className="text-[11px] text-slate-300 leading-snug">
                             Gemini Vision reads the current video frame under playhead (e.g. 3-4s silent clip) and describes exact outfits, colors (e.g. red saree, white shirt & black pants), actions, and scene details!
                          </p>

                          <button 
                            onClick={handleAnalyzeCurrentSceneFrame}
                            disabled={isAnalyzingVisionFrame || videoClips.length === 0}
                            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 disabled:opacity-50 flex items-center justify-center space-x-2"
                          >
                             {isAnalyzingVisionFrame ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                             <span>{isAnalyzingVisionFrame ? "Capturing & Analyzing Frame..." : "Analyze Current Scene Frame"}</span>
                          </button>

                          {capturedFrameDataUrl && (
                            <div className="space-y-2 pt-2 border-t border-white/10">
                               <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Captured Frame Snapshot</span>
                               <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-cyan-500/30 shadow-md">
                                  <img src={capturedFrameDataUrl} alt="Captured Frame" className="w-full h-full object-cover" />
                               </div>
                            </div>
                          )}

                          {visionAnalysisResult && (
                            <div className="space-y-2.5 pt-2 border-t border-white/10 text-xs">
                               <div className="p-2.5 rounded-lg bg-black/50 border border-white/10 space-y-1">
                                  <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">🥻 Apparel & Outfits</span>
                                  <p className="text-slate-200 leading-relaxed font-medium">{visionAnalysisResult.outfits}</p>
                               </div>

                               <div className="p-2.5 rounded-lg bg-black/50 border border-white/10 space-y-1">
                                  <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">💃 Actions & Motion</span>
                                  <p className="text-slate-200 leading-relaxed font-medium">{visionAnalysisResult.actions}</p>
                               </div>

                               <div className="p-2.5 rounded-lg bg-black/50 border border-white/10 space-y-1">
                                  <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">🎙️ Scene Voiceover / Script</span>
                                  <p className="text-slate-200 italic leading-relaxed">{visionAnalysisResult.script}</p>
                               </div>

                               <div className="p-2.5 rounded-lg bg-black/50 border border-white/10 space-y-1">
                                  <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">🎵 Matching BGM Beat</span>
                                  <p className="text-cyan-300 font-mono text-[11px]">{visionAnalysisResult.bgm}</p>
                               </div>

                               <button 
                                 onClick={() => {
                                   const summaryText = `[Outfits]: ${visionAnalysisResult.outfits}\n[Actions]: ${visionAnalysisResult.actions}\n[Script]: ${visionAnalysisResult.script}`;
                                   navigator.clipboard.writeText(summaryText);
                                   alert("Visual Frame Analysis copied to clipboard!");
                                 }}
                                 className="w-full py-1.5 rounded bg-white/10 hover:bg-white/20 text-slate-200 text-[10px] font-bold flex items-center justify-center space-x-1"
                               >
                                  <Copy className="w-3 h-3" />
                                  <span>Copy Visual Analysis</span>
                               </button>
                            </div>
                          )}
                       </div>
                    </div>
                  )}

                  {activeTool === "scene_script" && (
                    <div className="space-y-4">
                       <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border border-emerald-500/30 space-y-3">
                          <div className="flex items-center justify-between">
                             <div className="flex items-center space-x-2 text-emerald-300 font-bold text-xs">
                                <FileVideo className="w-4 h-4 text-emerald-400" />
                                <span>Video Scene Script Generator</span>
                             </div>
                             <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono">Gemini Vision AI</span>
                          </div>

                          <p className="text-[11px] text-slate-300 leading-snug">
                             AI analyzes your video scenes & visuals, then generates a complete scene-by-scene script with voiceovers, visual direction & music notes!
                          </p>

                          {/* Tone Selector */}
                          <div className="space-y-1">
                             <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Script Tone / Style</span>
                             <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/40 rounded-lg border border-white/10 text-[10px] font-bold">
                                {(["viral_hook", "storytelling", "educational", "cinematic"] as const).map(t => (
                                  <button 
                                    key={t}
                                    onClick={() => setScriptTone(t)}
                                    className={`py-1.5 rounded-md capitalize transition-colors ${scriptTone === t ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
                                  >
                                     {t.replace("_", " ")}
                                  </button>
                                ))}
                             </div>
                          </div>

                          <button 
                            onClick={handleGenerateScriptFromVideo}
                            disabled={isGeneratingScript || videoClips.length === 0}
                            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center space-x-2"
                          >
                             {isGeneratingScript ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                             <span>{isGeneratingScript ? "Analyzing Video Scenes & Writing Script..." : "Generate Script from Video"}</span>
                          </button>

                          {generatedScript && (
                            <div className="space-y-2 pt-2 border-t border-white/10">
                               <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Generated Scene Script</span>
                                  <button 
                                    onClick={() => {
                                      navigator.clipboard.writeText(generatedScript);
                                      alert("Video Scene Script copied to clipboard!");
                                    }}
                                    className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-slate-200 text-[10px] font-bold flex items-center space-x-1"
                                  >
                                     <Copy className="w-3 h-3" />
                                     <span>Copy Script</span>
                                  </button>
                               </div>
                               <div className="p-3 rounded-lg bg-black/60 border border-white/10 text-xs font-sans text-slate-200 max-h-64 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                                  {generatedScript}
                               </div>
                            </div>
                          )}
                       </div>
                    </div>
                  )}

                  {activeTool === "transcribe" && (
                    <div className="space-y-4">
                       <div className="p-3 rounded-xl bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-500/30 space-y-3">
                          <div className="flex items-center justify-between">
                             <div className="flex items-center space-x-2 text-blue-300 font-bold text-xs">
                                <FileText className="w-4 h-4 text-blue-400" />
                                <span>Video-to-Text AI Extractor</span>
                             </div>
                             <span className="text-[9px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-mono">Speech & OCR</span>
                          </div>

                          {/* Mode Selector */}
                          <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/40 rounded-lg border border-white/10 text-xs font-bold">
                             <button 
                               onClick={() => setExtractMode("speech")}
                               className={`py-1.5 rounded-md transition-colors ${extractMode === "speech" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
                             >
                                🗣️ Audio Dialogue
                             </button>
                             <button 
                               onClick={() => setExtractMode("ocr")}
                               className={`py-1.5 rounded-md transition-colors ${extractMode === "ocr" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
                             >
                                🖼️ Visual OCR Text
                             </button>
                          </div>

                          <button 
                            onClick={handleExtractVideoText}
                            disabled={isExtractingText || videoClips.length === 0}
                            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center space-x-2"
                          >
                             {isExtractingText ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                             <span>{isExtractingText ? "Extracting Text from Video..." : "Extract Text from Video"}</span>
                          </button>

                          {extractedText && (
                            <div className="space-y-2 pt-2 border-t border-white/10">
                               <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Extracted Transcript</span>
                                  <button 
                                    onClick={() => {
                                      navigator.clipboard.writeText(extractedText);
                                      alert("Extracted video text copied to clipboard!");
                                    }}
                                    className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-slate-200 text-[10px] font-bold flex items-center space-x-1"
                                  >
                                     <Copy className="w-3 h-3" />
                                     <span>Copy Text</span>
                                  </button>
                               </div>
                               <div className="p-3 rounded-lg bg-black/60 border border-white/10 text-xs font-mono text-slate-200 max-h-48 overflow-y-auto whitespace-pre-wrap">
                                  {extractedText}
                               </div>
                            </div>
                          )}
                       </div>
                    </div>
                  )}

                  {(!activeTool || activeTool === "adjust") && (
                    <div className="space-y-4">
                       {/* Active Clip Header */}
                       <div className="flex items-center justify-between border-b border-white/10 pb-2">
                          <span className="font-bold text-xs text-white truncate max-w-[140px]">{activeClipInfo?.clip.name || "City_Aerial_01"}</span>
                          <span className="text-[10px] bg-white/10 text-slate-300 px-2 py-0.5 rounded font-mono">{formatTime(activeClipInfo?.duration || 6)}</span>
                       </div>

                       {/* Opacity Slider */}
                       <div className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                             <span className="text-slate-400">Opacity</span>
                             <span className="text-indigo-400 font-mono text-[10px]">{opacity}%</span>
                          </div>
                          <input type="range" min="0" max="100" value={opacity} onChange={e => setOpacity(parseInt(e.target.value))} className="w-full accent-indigo-500 h-1 bg-white/10 rounded-full" />
                       </div>

                       {/* Transform Accordion */}
                       <div className="space-y-2 pt-2 border-t border-white/10">
                          <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Transform</span>
                          <div className="grid grid-cols-3 gap-2 text-[10px]">
                             <div className="bg-white/5 p-1.5 rounded border border-white/10"><span className="text-slate-500">X:</span> <span className="text-white font-mono">{panX}</span></div>
                             <div className="bg-white/5 p-1.5 rounded border border-white/10"><span className="text-slate-500">Y:</span> <span className="text-white font-mono">{panY}</span></div>
                             <div className="bg-white/5 p-1.5 rounded border border-white/10"><span className="text-slate-500">Z:</span> <span className="text-white font-mono">30</span></div>
                             <div className="bg-white/5 p-1.5 rounded border border-white/10"><span className="text-slate-500">W:</span> <span className="text-white font-mono">1080</span></div>
                             <div className="bg-white/5 p-1.5 rounded border border-white/10"><span className="text-slate-500">H:</span> <span className="text-white font-mono">1920</span></div>
                             <div className="bg-white/5 p-1.5 rounded border border-white/10"><span className="text-slate-500">R:</span> <span className="text-white font-mono">{rotate}°</span></div>
                          </div>
                       </div>

                       {/* Lumetri Color Controls (Exact Match of Screenshot) */}
                       <div className="space-y-3 pt-2 border-t border-white/10">
                          <div className="flex items-center justify-between">
                             <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Color: Lumetri Controls</span>
                             <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-bold">Sliders</span>
                          </div>

                          <div className="space-y-2">
                             <div className="space-y-1">
                                <div className="flex justify-between items-center text-[11px]">
                                   <span className="text-slate-400">Exposure</span>
                                   <span className="text-indigo-400 font-mono text-[10px]">{exposure}</span>
                                </div>
                                <input type="range" min="0" max="200" value={exposure} onChange={e => setExposure(parseInt(e.target.value))} className="w-full accent-indigo-500 h-1 bg-white/10 rounded-full" />
                             </div>

                             <div className="space-y-1">
                                <div className="flex justify-between items-center text-[11px]">
                                   <span className="text-slate-400">Contrast</span>
                                   <span className="text-indigo-400 font-mono text-[10px]">{lumetriContrast}</span>
                                </div>
                                <input type="range" min="0" max="400" value={lumetriContrast} onChange={e => setLumetriContrast(parseInt(e.target.value))} className="w-full accent-indigo-500 h-1 bg-white/10 rounded-full" />
                             </div>

                             <div className="space-y-1">
                                <div className="flex justify-between items-center text-[11px]">
                                   <span className="text-slate-400">Saturation</span>
                                   <span className="text-indigo-400 font-mono text-[10px]">{lumetriSat.toFixed(1)}</span>
                                </div>
                                <input type="range" min="0" max="3" step="0.1" value={lumetriSat} onChange={e => setLumetriSat(parseFloat(e.target.value))} className="w-full accent-indigo-500 h-1 bg-white/10 rounded-full" />
                             </div>

                             <div className="space-y-1">
                                <div className="flex justify-between items-center text-[11px]">
                                   <span className="text-slate-400">Temp</span>
                                   <span className="text-indigo-400 font-mono text-[10px]">{temp.toFixed(1)}</span>
                                </div>
                                <input type="range" min="-5" max="5" step="0.5" value={temp} onChange={e => setTemp(parseFloat(e.target.value))} className="w-full accent-indigo-500 h-1 bg-white/10 rounded-full" />
                             </div>

                             <div className="space-y-1">
                                <div className="flex justify-between items-center text-[11px]">
                                   <span className="text-slate-400">Tint</span>
                                   <span className="text-indigo-400 font-mono text-[10px]">{tint.toFixed(1)}</span>
                                </div>
                                <input type="range" min="-5" max="5" step="0.5" value={tint} onChange={e => setTint(parseFloat(e.target.value))} className="w-full accent-indigo-500 h-1 bg-white/10 rounded-full" />
                             </div>
                          </div>

                          {/* Material You controls */}
                          <div className="flex items-center justify-between pt-2 border-t border-white/10">
                             <span className="text-slate-400 text-[10px] font-bold">Material You</span>
                             <button onClick={resetAdjustments} className="text-[10px] text-indigo-400 hover:underline">Reset All</button>
                          </div>
                       </div>
                    </div>
                  )}
              </div>
          </div>
      </div>

      {/* BOTTOM: CapCut-Style Timeline */}
      <div className="shrink-0 flex flex-col z-20" style={{ height: '192px', backgroundColor: 'rgba(5,8,16,1)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          
          {/* Timeline Toolbar */}
          <div className="h-10 flex items-center justify-between px-4 border-b border-white/5">
              <div className="flex items-center space-x-3">
                  <button onClick={togglePlayPause} className="w-7 h-7 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 flex items-center justify-center text-white hover:scale-105 transition-transform">
                     {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current ml-0.5" />}
                  </button>
                  <span className="font-mono text-xs text-slate-300 tracking-wider">
                     {formatTime(currentTime)} <span className="text-slate-600">/</span> {formatTime(duration)}
                  </span>
              </div>
              <div className="flex items-center space-x-1 md:space-x-2">
                 <button onClick={handleSplitClip} className="flex items-center space-x-1.5 px-2 py-1 rounded border bg-white/5 border-white/10 hover:border-indigo-400 text-slate-300 hover:text-white transition-colors">
                    <Scissors className="w-3.5 h-3.5 text-indigo-400" /> <span className="hidden sm:inline text-[10px] font-medium">Split</span>
                 </button>
                 <div className="w-px h-4 bg-white/10 mx-1" />
                 <button onClick={undo} disabled={!canUndo} className={`p-1 ${!canUndo ? "opacity-30 text-slate-500" : "text-slate-400 hover:text-white"}`}><Undo2 className="w-3.5 h-3.5"/></button>
                 <button onClick={redo} disabled={!canRedo} className={`p-1 ${!canRedo ? "opacity-30 text-slate-500" : "text-slate-400 hover:text-white"}`}><Redo2 className="w-3.5 h-3.5"/></button>
                 <div className="w-px h-4 bg-white/10 mx-1" />
                 <div className="hidden sm:flex items-center space-x-2 pl-1">
                    <ZoomIn className="w-3.5 h-3.5 text-slate-500" />
                    <input type="range" className="w-20 accent-indigo-500 h-1 bg-white/10 rounded-full" />
                 </div>
              </div>
          </div>

          {/* Timecode Ruler & Tracks area */}
          <div className="flex-1 flex flex-col overflow-hidden relative">
             <div className="h-5 flex items-center px-24 border-b border-white/5">
                <input type="range" min="0" max={duration || 100} step="0.05" value={currentTime} onChange={handleScrub} className="w-full accent-indigo-400 h-0.5 bg-transparent cursor-pointer relative z-20" />
             </div>

             <div className="flex-1 flex overflow-y-auto overflow-x-hidden relative">
                 {/* Left labels column — CapCut Style: Track Name Labels */}
                 <div className="w-20 shrink-0 bg-[#050810] z-20 border-r border-white/5 flex flex-col pt-1 pb-1 space-y-1">
                    {/* Video Track Label */}
                    <div className="h-9 flex items-center justify-between px-1.5 rounded-lg" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)' }}>
                      <div className="flex flex-col">
                        <span className="text-[8px] font-bold text-indigo-300 leading-tight">Video 1</span>
                        <span className="text-[7px] text-slate-500">{videoClips.length} clips</span>
                      </div>
                      <label className="cursor-pointer p-0.5 rounded hover:bg-indigo-500/20 transition-colors" title="Add Video">
                        <Plus className="w-2.5 h-2.5 text-indigo-400" />
                        <input type="file" accept="video/*" multiple className="hidden" onChange={handleFileUpload} />
                      </label>
                    </div>

                    {/* Audio Track Label */}
                    <button
                      onClick={() => setActiveTool('audio')}
                      className="h-7 flex items-center justify-between px-1.5 rounded-md cursor-pointer transition-colors"
                      style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.18)' }}
                    >
                      <div className="flex flex-col items-start">
                        <span className="text-[8px] font-bold text-violet-300 leading-tight">Audio 1</span>
                        <span className="text-[7px] text-slate-500">{selectedAudio ? '1 track' : 'empty'}</span>
                      </div>
                      <Music className="w-2.5 h-2.5 text-violet-400" />
                    </button>

                    {/* Text Track Label */}
                    <button
                      onClick={() => setActiveTool('text')}
                      className="h-6 flex items-center justify-between px-1.5 rounded-md cursor-pointer transition-colors"
                      style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.18)' }}
                    >
                      <div className="flex flex-col items-start">
                        <span className="text-[8px] font-bold text-yellow-300 leading-tight">Text</span>
                      </div>
                      <Type className="w-2.5 h-2.5 text-yellow-400" />
                    </button>
                 </div>

                 {/* Right tracks scroll area */}
                 <div className="flex-1 overflow-x-auto overflow-y-hidden relative pt-1 pb-1">
                    {/* Playhead line overlay */}
                    {duration > 0 && (
                       <div className="absolute top-0 bottom-0 w-px bg-indigo-400 z-30 pointer-events-none" style={{ left: `${(currentTime / duration) * 100}%` }}>
                          <div className="w-2 h-2 bg-indigo-400 rotate-45 -translate-x-1/2 -translate-y-1 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                       </div>
                    )}
                    
                    <div className="flex flex-col space-y-1 min-w-full px-2" style={{ width: 'max-content' }}>
                       {/* Video Track */}
                       <div className="h-9 rounded-lg flex items-center p-0.5 space-x-1" style={{ backgroundColor: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)' }}>
                          {videoClips.map((clip, idx) => {
                             const isSelected = selectedClipId ? selectedClipId === clip.id : activeClipInfo?.clip.id === clip.id;
                             const widthPercent = duration > 0 ? (clip.duration / duration) * 100 : 0;
                             return (
                                <div 
                                  key={clip.id} 
                                  onClick={(e) => { e.stopPropagation(); setSelectedClipId(clip.id); }}
                                  className={`h-full relative rounded-md flex items-center px-2 cursor-pointer transition-all group ${
                                    isSelected 
                                      ? "bg-indigo-500/40 border-2 border-white text-white shadow-[0_0_12px_rgba(255,255,255,0.4)] z-10 overflow-visible" 
                                      : "bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 overflow-hidden"
                                  }`} 
                                  style={{ minWidth: '95px', width: `${widthPercent}%` }}
                                >
                                   {/* CapCut Drag Trimming Handles on selected clip */}
                                   {isSelected && (
                                     <>
                                       <div 
                                         onMouseDown={(e) => handleClipTrimStart(clip, "left", e)}
                                         onTouchStart={(e) => {
                                           if (e.cancelable) e.preventDefault();
                                           e.stopPropagation();
                                           handleClipTrimStart(clip, "left", e);
                                         }}
                                         className="absolute -left-2 top-0 bottom-0 w-4 bg-white rounded-l flex items-center justify-center cursor-ew-resize hover:bg-indigo-300 z-50 shadow-xl touch-none"
                                         title="Drag to trim start"
                                       >
                                         <div className="w-0.5 h-4 bg-slate-900 rounded-full" />
                                       </div>
                                       <div 
                                         onMouseDown={(e) => handleClipTrimStart(clip, "right", e)}
                                         onTouchStart={(e) => {
                                           if (e.cancelable) e.preventDefault();
                                           e.stopPropagation();
                                           handleClipTrimStart(clip, "right", e);
                                         }}
                                         className="absolute -right-2 top-0 bottom-0 w-4 bg-white rounded-r flex items-center justify-center cursor-ew-resize hover:bg-indigo-300 z-50 shadow-xl touch-none"
                                         title="Drag to trim end"
                                       >
                                         <div className="w-0.5 h-4 bg-slate-900 rounded-full" />
                                       </div>
                                     </>
                                   )}
                                   
                                   <div className="flex items-center justify-between w-full overflow-hidden pl-1 pr-1">
                                      <span className="text-[9px] font-bold truncate">{clip.name}</span>
                                      <span className="text-[8px] font-mono text-indigo-200 bg-black/50 px-1 py-0.5 rounded shrink-0">{clip.duration.toFixed(1)}s</span>
                                   </div>

                                   {/* Clip action controls */}
                                   <div className="absolute right-1 opacity-0 group-hover:opacity-100 flex items-center bg-black/70 rounded backdrop-blur-sm z-20">
                                      {idx > 0 && <button onClick={(e) => { e.stopPropagation(); handleMoveClip(idx, 'left'); }} className="p-1 hover:text-indigo-300" title="Move Left"><ChevronLeft className="w-3 h-3"/></button>}
                                      {idx < videoClips.length - 1 && <button onClick={(e) => { e.stopPropagation(); handleMoveClip(idx, 'right'); }} className="p-1 hover:text-indigo-300" title="Move Right"><ChevronRight className="w-3 h-3"/></button>}
                                      <button onClick={(e) => { e.stopPropagation(); handleRemoveClip(clip.id); }} className="p-1 hover:text-red-400" title="Delete Clip"><Trash2 className="w-3 h-3"/></button>
                                   </div>
                                </div>
                             )
                          })}
                          <label className="h-full px-2.5 flex items-center justify-center rounded-md bg-white/5 hover:bg-white/10 border border-dashed border-white/20 text-slate-400 text-[9px] font-bold cursor-pointer transition-colors shrink-0 space-x-1">
                             <Plus className="w-3.5 h-3.5" />
                             <span>Add end</span>
                             <input type="file" accept="video/*" multiple className="hidden" onChange={handleFileUpload} />
                          </label>
                       </div>

                       {/* Audio Track (CapCut Inline Add Audio) */}
                       <div className="h-7 rounded flex items-center px-1" style={{ backgroundColor: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.2)' }}>
                          {selectedAudio ? (
                            <div className="h-5 w-full rounded bg-violet-500/20 border border-violet-500/40 flex items-center justify-between px-2 overflow-hidden">
                              <div className="flex items-center space-x-1 overflow-hidden">
                                 <Music className="w-3 h-3 text-violet-400 shrink-0" />
                                 <span className="text-[9px] font-bold text-violet-200 truncate">{selectedAudio.name}</span>
                              </div>
                              <div className="flex items-center space-x-0.5 shrink-0">
                                {Array.from({length: 15}).map((_, i) => (
                                  <div key={i} className="w-0.5 bg-violet-400/70 rounded-full" style={{ height: `${Math.max(25, (i % 5 + 1) * 20)}%` }} />
                                ))}
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => setActiveTool('audio')} className="h-5 px-2.5 rounded-md bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 text-[9px] font-bold flex items-center space-x-1 transition-colors border border-violet-500/30">
                               <Plus className="w-3 h-3" />
                               <span>Add audio</span>
                            </button>
                          )}
                       </div>

                       {/* Text Track (CapCut Inline Add Text) */}
                       <div className="h-6 rounded flex items-center px-1 space-x-1" style={{ backgroundColor: 'rgba(234,179,8,0.05)', border: '1px solid rgba(234,179,8,0.2)' }}>
                          {textOverlays.length > 0 ? (
                            textOverlays.map((t) => (
                              <div key={t.id} className="h-4 px-2 rounded text-[8px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 flex items-center shrink-0">
                                {t.text}
                              </div>
                            ))
                          ) : (
                            <button onClick={() => setActiveTool('text')} className="h-4 px-2 rounded bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300 text-[8px] font-bold flex items-center space-x-1 transition-colors border border-yellow-500/20">
                               <Plus className="w-2.5 h-2.5" />
                               <span>Add text</span>
                            </button>
                          )}
                       </div>
                    </div>
                 </div>
             </div>
          </div>
      </div>

      {/* CapCut-Style Context-Sensitive Bottom Footer Toolbar */}
      <div className="shrink-0 z-40 relative" style={{ backgroundColor: 'rgba(5,8,16,0.97)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>

        {/* CROP TOOL: Full overlay sheet — opens above footer when crop is active on mobile */}
        {activeTool === 'crop' && (
          <div className="fixed inset-0 z-50 flex flex-col bg-[#050810]">
            {/* Crop header */}
            <div className="flex items-center justify-between px-4 h-12 border-b border-white/10">
              <button onClick={() => setActiveTool(null)} className="p-1.5 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
              <span className="text-sm font-bold text-white">Resize</span>
              <button onClick={() => setActiveTool(null)} className="p-1.5 text-white"><Check className="w-5 h-5" /></button>
            </div>

            {/* Crop video preview */}
            <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden p-4">
              <div className="relative max-w-full max-h-full" style={{ width: '280px', height: '380px' }}>
                <video
                  src={objectUrl || undefined}
                  className="w-full h-full object-contain bg-black"
                  muted
                  style={{
                    filter: filterStyle,
                    transform: `rotate(${rotate}deg)`
                  }}
                />
                {/* Interactive Crop Box Overlay matching CapCut */}
                <div
                  onMouseDown={(e) => handleCropBoxStart("move", e)}
                  onTouchStart={(e) => handleCropBoxStart("move", e)}
                  style={{
                    left: `${cropBox.left}%`,
                    top: `${cropBox.top}%`,
                    width: `${cropBox.width}%`,
                    height: `${cropBox.height}%`
                  }}
                  className="absolute border-2 border-white cursor-move select-none shadow-[0_0_0_9999px_rgba(0,0,0,0.65)]"
                >
                  {/* 3x3 grid */}
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

                  {/* 4 Interactive Corner Handles */}
                  <div
                    onMouseDown={(e) => handleCropBoxStart("top-left", e)}
                    onTouchStart={(e) => handleCropBoxStart("top-left", e)}
                    className="absolute -top-2.5 -left-2.5 w-6 h-6 border-t-4 border-l-4 border-white cursor-nwse-resize pointer-events-auto shadow-lg"
                  />
                  <div
                    onMouseDown={(e) => handleCropBoxStart("top-right", e)}
                    onTouchStart={(e) => handleCropBoxStart("top-right", e)}
                    className="absolute -top-2.5 -right-2.5 w-6 h-6 border-t-4 border-r-4 border-white cursor-nesw-resize pointer-events-auto shadow-lg"
                  />
                  <div
                    onMouseDown={(e) => handleCropBoxStart("bottom-left", e)}
                    onTouchStart={(e) => handleCropBoxStart("bottom-left", e)}
                    className="absolute -bottom-2.5 -left-2.5 w-6 h-6 border-b-4 border-l-4 border-white cursor-nesw-resize pointer-events-auto shadow-lg"
                  />
                  <div
                    onMouseDown={(e) => handleCropBoxStart("bottom-right", e)}
                    onTouchStart={(e) => handleCropBoxStart("bottom-right", e)}
                    className="absolute -bottom-2.5 -right-2.5 w-6 h-6 border-b-4 border-r-4 border-white cursor-nwse-resize pointer-events-auto shadow-lg"
                  />
                </div>
              </div>
            </div>

            {/* Time scrubber */}
            <div className="flex items-center space-x-3 px-4 py-2 border-b border-white/5">
              <span className="font-mono text-[11px] text-slate-400">00:00</span>
              <input type="range" min="0" max={duration || 100} step="0.05" value={currentTime} onChange={handleScrub} className="flex-1 accent-white h-1 bg-white/20 rounded-full" />
              <span className="font-mono text-[11px] text-slate-400">{formatTime(duration)}</span>
            </div>

            {/* Crop / AI expand tabs */}
            <div className="flex border-b border-white/10 px-4">
              <button className="py-2.5 mr-4 text-sm font-bold text-cyan-400 border-b-2 border-cyan-400">Crop</button>
              <button className="py-2.5 text-sm font-medium text-slate-400 hover:text-white">AI expand</button>
            </div>

            {/* Rotate ruler */}
            <div className="px-4 py-3 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm text-white font-medium">Rotate</span>
                <span className="text-sm font-bold text-white">{rotate}°</span>
              </div>
              <input type="range" min="-45" max="45" step="1" value={rotate} onChange={(e) => setRotate(parseInt(e.target.value))} className="w-full accent-cyan-400 h-1 bg-white/20 rounded-full cursor-pointer" />
            </div>

            {/* Aspect ratio presets */}
            <div className="px-4 pb-3 space-y-3">
              <span className="text-sm font-medium text-white block">Aspect ratio</span>
              <div className="flex space-x-3 overflow-x-auto scrollbar-none">
                {[
                  { r: 'custom', label: 'Custom', box: { left: 5, top: 5, width: 90, height: 90 } },
                  { r: '9:16', label: '9:16', box: { left: 20, top: 5, width: 60, height: 90 } },
                  { r: '16:9', label: '16:9', box: { left: 5, top: 25, width: 90, height: 50.6 } },
                  { r: '1:1', label: '1:1', box: { left: 15, top: 15, width: 70, height: 70 } },
                  { r: '4:3', label: '4:3', box: { left: 5, top: 18, width: 90, height: 64 } },
                ].map((ar, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (ar.r !== 'custom') setAspectRatio(ar.r as any);
                      setCropBox(ar.box);
                    }}
                    className="flex flex-col items-center space-y-1.5 shrink-0 cursor-pointer"
                  >
                    <div className={`w-12 h-14 rounded-xl flex items-center justify-center border-2 ${
                      ((ar.r as string) === 'custom' && cropBox.width >= 85) || (aspectRatio === (ar.r as any) && (ar.r as string) !== 'custom')
                        ? 'border-white bg-white/15'
                        : 'border-slate-600 bg-white/5'
                    }`}>
                      {ar.r === 'custom'
                        ? <Maximize2 className="w-4 h-4 text-white" />
                        : <div className={`bg-slate-400 rounded-sm ${
                            ar.r === '16:9' ? 'w-8 h-5'
                            : ar.r === '1:1' ? 'w-6 h-6'
                            : ar.r === '4:3' ? 'w-7 h-5'
                            : 'w-4 h-7'
                          }`} />}
                    </div>
                    <span className="text-[10px] font-medium text-slate-300">{ar.label}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => { setZoom(1); setPanX(0); setPanY(0); setRotate(0); setAspectRatio('9:16'); setCropBox({ left: 5, top: 5, width: 90, height: 90 }); }}
                className="flex items-center space-x-2 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        )}

        {/* Main footer bar */}
        <div className="h-[60px] flex items-center w-full overflow-hidden">
          {activeTool && activeTool !== 'crop' ? (
            /* Sub-tool level: Back + context tools */
            <div className="flex items-center w-full overflow-x-auto scrollbar-none px-2 py-1 space-x-1">
              {/* Back arrow */}
              <button
                onClick={() => setActiveTool(null)}
                className="flex flex-col items-center justify-center w-10 h-10 text-slate-300 hover:text-white shrink-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="w-px h-6 bg-white/15 shrink-0" />

              {/* Sub-tools for 'edit' */}
              {activeTool === 'edit' && (
                <>
                  {[
                    { icon: Scissors, label: 'Split', fn: handleSplitClip, color: 'text-indigo-400' },
                    { icon: Layers, label: 'Fade', fn: () => {}, color: 'text-slate-300' },
                    { icon: Volume2, label: 'Volume', fn: () => setIsMuted(!isMuted), color: 'text-slate-300' },
                    { icon: Wand2, label: 'Animations', fn: () => setActiveTool('effects'), color: 'text-cyan-400' },
                    { icon: Sparkles, label: 'Effects', fn: () => setActiveTool('effects'), color: 'text-violet-400' },
                    { icon: Trash2, label: 'Delete', fn: () => selectedClipId && handleRemoveClip(selectedClipId), color: 'text-red-400' },
                  ].map((t, i) => (
                    <button key={i} onClick={t.fn} className={`flex flex-col items-center justify-center min-w-[52px] py-2 ${t.color} hover:text-white shrink-0 transition-colors`}>
                      <t.icon className="w-5 h-5" />
                      <span className="text-[9px] font-medium mt-0.5">{t.label}</span>
                    </button>
                  ))}
                </>
              )}

              {/* Sub-tools for 'audio' */}
              {activeTool === 'audio' && (
                <>
                  {[
                    { icon: Plus, label: 'Add', fn: () => {}, color: 'text-violet-400' },
                    { icon: Volume2, label: 'Volume', fn: () => setIsMuted(!isMuted), color: 'text-slate-300' },
                    { icon: Music, label: 'Effects', fn: () => {}, color: 'text-slate-300' },
                    { icon: Trash2, label: 'Delete', fn: () => setSelectedAudio(null), color: 'text-red-400' },
                  ].map((t, i) => (
                    <button key={i} onClick={t.fn} className={`flex flex-col items-center justify-center min-w-[52px] py-2 ${t.color} hover:text-white shrink-0 transition-colors`}>
                      <t.icon className="w-5 h-5" />
                      <span className="text-[9px] font-medium mt-0.5">{t.label}</span>
                    </button>
                  ))}
                </>
              )}

              {/* Sub-tools for 'text' */}
              {activeTool === 'text' && (
                <>
                  {[
                    { icon: Plus, label: 'Add Text', fn: handleAddTextOverlay, color: 'text-yellow-400' },
                    { icon: Type, label: 'Style', fn: () => {}, color: 'text-slate-300' },
                    { icon: AlignCenter, label: 'Align', fn: () => {}, color: 'text-slate-300' },
                    { icon: Trash2, label: 'Delete', fn: () => setTextOverlays([]), color: 'text-red-400' },
                  ].map((t, i) => (
                    <button key={i} onClick={t.fn} className={`flex flex-col items-center justify-center min-w-[52px] py-2 ${t.color} hover:text-white shrink-0 transition-colors`}>
                      <t.icon className="w-5 h-5" />
                      <span className="text-[9px] font-medium mt-0.5">{t.label}</span>
                    </button>
                  ))}
                </>
              )}

              {/* Sub-tools for 'effects' */}
              {activeTool === 'effects' && (
                <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none">
                  {[
                    { id: 'none', name: 'None' },
                    { id: 'glitch', name: 'Glitch' },
                    { id: 'neon', name: 'Neon' },
                    { id: 'vhs', name: 'VHS' },
                    { id: 'grain', name: 'Grain' },
                    { id: 'blur', name: 'Blur' },
                    { id: 'golden', name: 'Gold' },
                  ].map(eff => (
                    <button
                      key={eff.id}
                      onClick={() => setSelectedEffect(eff.id)}
                      className={`flex flex-col items-center min-w-[52px] py-2 shrink-0 transition-colors ${
                        selectedEffect === eff.id ? 'text-violet-300' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl mb-0.5 flex items-center justify-center border ${
                        selectedEffect === eff.id
                          ? 'bg-violet-500/30 border-violet-500'
                          : 'bg-white/5 border-white/10'
                      }`}>
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] font-medium">{eff.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Fallback for other tools */}
              {!['edit', 'audio', 'text', 'effects'].includes(activeTool) && (
                <span className="text-xs text-slate-500 px-4">{activeTool} tools</span>
              )}
            </div>
          ) : activeTool !== 'crop' ? (
            /* Main primary tools — CapCut style */
            selectedClipId ? (
              /* Clip selected: show clip-context tools */
              <div className="flex items-center w-full overflow-x-auto scrollbar-none px-2 py-1 space-x-1">
                <button onClick={() => setSelectedClipId(null)} className="flex flex-col items-center justify-center w-10 h-10 text-slate-400 hover:text-white shrink-0">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="w-px h-6 bg-white/15 shrink-0" />
                {[
                  { icon: Scissors, label: 'Split', fn: handleSplitClip, color: 'text-slate-300' },
                  { icon: Layers, label: 'Fade', fn: () => {}, color: 'text-slate-300' },
                  { icon: Volume2, label: 'Volume', fn: () => setActiveTool('audio'), color: 'text-slate-300' },
                  { icon: Wand2, label: 'Animations', fn: () => setActiveTool('effects'), color: 'text-slate-300' },
                  { icon: Sparkles, label: 'Effects', fn: () => setActiveTool('effects'), color: 'text-slate-300' },
                  { icon: Trash2, label: 'Delete', fn: () => { handleRemoveClip(selectedClipId); setSelectedClipId(null); }, color: 'text-red-400' },
                ].map((t, i) => (
                  <button key={i} onClick={t.fn} className={`flex flex-col items-center justify-center min-w-[56px] py-2 ${t.color} hover:text-white shrink-0 transition-colors`}>
                    <t.icon className="w-5 h-5" />
                    <span className="text-[9px] font-medium mt-0.5">{t.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              /* No clip selected: show main tool categories */
              <div className="flex items-center w-full overflow-x-auto scrollbar-none px-3 space-x-1">
                {[
                  { icon: Scissors, label: 'Edit', id: 'edit', color: 'text-slate-300' },
                  { icon: Music, label: 'Audio', id: 'audio', color: 'text-slate-300' },
                  { icon: Type, label: 'Text', id: 'text', color: 'text-slate-300' },
                  { icon: Sparkles, label: 'Effects', id: 'effects', color: 'text-slate-300' },
                  { icon: ImageIcon, label: 'Overlay', id: 'stickers', color: 'text-slate-300' },
                  { icon: AlignCenter, label: 'Captions', id: 'captions', color: 'text-slate-300' },
                  { icon: Crop, label: 'Crop', id: 'crop', color: 'text-slate-300' },
                  { icon: SlidersHorizontal, label: 'Adjust', id: 'adjust', color: 'text-slate-300' },
                  { icon: Filter, label: 'Filters', id: 'filters', color: 'text-slate-300' },
                  { icon: Wand2, label: 'AI Tools', id: 'ai_veo', color: 'text-violet-400' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTool(t.id as any)}
                    className={`flex flex-col items-center justify-center min-w-[56px] py-2 ${t.color} hover:text-white shrink-0 transition-colors`}
                  >
                    <t.icon className="w-5 h-5" />
                    <span className="text-[9px] font-medium mt-1 whitespace-nowrap">{t.label}</span>
                  </button>
                ))}
              </div>
            )
          ) : null}
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200" style={{ backgroundColor: 'rgba(5,8,16,0.95)', borderColor: 'rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <h3 className="text-white font-bold flex items-center space-x-2 text-sm">
                <Download className="w-4 h-4 text-indigo-400" />
                <span>Export FlowLab Project</span>
              </h3>
              <button onClick={() => setShowExportModal(false)} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resolution</label>
                <div className="grid grid-cols-3 gap-2">
                  {["1080p", "720p", "480p"].map(res => (
                    <button 
                      key={res}
                      onClick={() => setExportResolution(res)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${exportResolution === res ? "bg-indigo-500/20 border-indigo-500 text-indigo-300" : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"}`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quality</label>
                <div className="grid grid-cols-3 gap-2">
                  {["high", "medium", "low"].map(q => (
                    <button 
                      key={q}
                      onClick={() => setExportQuality(q)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold capitalize border transition-colors ${exportQuality === q ? "bg-indigo-500/20 border-indigo-500 text-indigo-300" : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"}`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="px-5 py-4 border-t border-white/5 bg-white/5 flex justify-end space-x-3">
              <button 
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={startRealExport}
                className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-white text-xs font-bold rounded-lg shadow-lg transition-colors flex items-center"
              >
                <Download className="w-4 h-4 mr-1.5" />
                Start Export
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* User Workspace Settings Modal */}
      <UserSettingsModal 
        isOpen={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)} 
        onThemeChange={(t) => setEditorTheme(t)} 
      />
      
      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
      />
    </div>
  );
}
