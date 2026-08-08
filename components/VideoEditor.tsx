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
  SkipBack, SkipForward, ZoomIn, ChevronLeft
} from "lucide-react";
import { logActivity } from "@/lib/activity";
import { callAi } from "@/lib/ai-client";
import UserSettingsModal from "./UserSettingsModal";
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

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
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

  // Synchronize HTML video element with active clip's objectUrl
  const activeClipId = activeClipInfo?.clip.id;
  useEffect(() => {
    if (!activeClipInfo || !videoRef.current) return;
    const relTime = Math.max(0, currentTime - activeClipInfo.start);
    const targetUrl = activeClipInfo.clip.objectUrl;

    if (videoRef.current.src !== targetUrl) {
      videoRef.current.src = targetUrl;
      videoRef.current.currentTime = relTime;
      if (isPlaying) {
        const p = videoRef.current.play();
        if (p !== undefined) {
          p.catch((e) => {
            if (e.name !== "NotAllowedError" && !e.message?.includes("interrupted")) {
              console.warn("Video play error:", e);
            }
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClipId, isPlaying]);

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
      if (videoRef.current && activeClipInfo && !isExporting) {
          const relTime = videoRef.current.currentTime;
          const newGlobalTime = activeClipInfo.start + relTime;
          setCurrentTime(newGlobalTime);

          // Check if current clip reached its duration boundary
          if (relTime >= activeClipInfo.duration - 0.08) {
              const currentIdx = clipOffsets.findIndex(c => c.clip.id === activeClipInfo.clip.id);
              if (currentIdx < clipOffsets.length - 1) {
                  // Auto-advance to next clip in sequence
                  const nextClipInfo = clipOffsets[currentIdx + 1];
                  setCurrentTime(nextClipInfo.start);
              } else {
                  // Reached end of total timeline sequence
                  videoRef.current.pause();
                  setIsPlaying(false);
              }
          }
      }
  };

  const handleLoadedMetadata = () => {
      if (videoRef.current && activeClipInfo) {
          const realDur = videoRef.current.duration;
          if (realDur && isFinite(realDur) && Math.abs(realDur - activeClipInfo.duration) > 0.5) {
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
              if (videoRef.current.getAttribute("src") !== targetInfo.clip.objectUrl) {
                  videoRef.current.src = targetInfo.clip.objectUrl;
              }
              videoRef.current.currentTime = relTime;
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
          panY: 0,
      }));
      setPlaybackSpeed(1);
      setVolume(1);
      setSelectedFilter("original");
      setSelectedEffect("none");
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

    return `brightness(${b}%) contrast(${c}%) saturate(${s}%) sepia(${sep}%) blur(${bl}px) hue-rotate(${hue}deg) invert(${invert}%)`;
  }, [brightness, contrast, saturation, sepia, blur, selectedFilter, filterIntensity, selectedEffect, effectIntensity]);

  const scaleX = flipH ? -1 : 1;
  const scaleY = flipV ? -1 : 1;
  const transformStyle = `translate(${panX}px, ${panY}px) rotate(${rotate}deg) scaleX(${scaleX * zoom}) scaleY(${scaleY * zoom})`;

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

    // Only split if playhead is at least 0.2s away from boundaries
    if (relTime > 0.2 && relTime < targetOffset.duration - 0.2) {
      const idx = videoClips.findIndex(c => c.id === clipToSplit.id);
      if (idx !== -1) {
        const baseName = clipToSplit.name.replace(/_part\d+$/, '');
        const part1: VideoClipItem = {
          ...clipToSplit,
          id: "clip_" + Date.now() + "_a",
          name: `${baseName}_part1`,
          duration: parseFloat(relTime.toFixed(2))
        };
        const part2: VideoClipItem = {
          ...clipToSplit,
          id: "clip_" + Date.now() + "_b",
          name: `${baseName}_part2`,
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
    <div className="flex flex-col h-[calc(100vh-64px)] font-sans antialiased overflow-hidden bg-[#050810] text-[#F1F5F9] selection:bg-indigo-500/30">
      
      {/* Top Professional Navbar (FlowLab Style) */}
      <div className="flex items-center justify-between px-4 h-12 shrink-0 z-20 border-b" style={{ backgroundColor: 'rgba(5,8,16,0.95)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center space-x-3">
              <button 
                onClick={() => setVideoClips([])} 
                className="text-slate-400 hover:text-slate-200 transition-colors"
                title="Close Project"
              >
                  <X className="w-5 h-5" />
              </button>
              <div className="h-4 w-px bg-white/10" />
              <div className="flex items-center space-x-1">
                <button 
                  onClick={undo} 
                  disabled={!canUndo} 
                  className={`p-1.5 rounded-lg transition-colors ${!canUndo ? "opacity-30 cursor-not-allowed text-slate-500" : "text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 hover:shadow-[0_0_8px_rgba(99,102,241,0.4)]"}`}
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={redo} 
                  disabled={!canRedo} 
                  className={`p-1.5 rounded-lg transition-colors ${!canRedo ? "opacity-30 cursor-not-allowed text-slate-500" : "text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 hover:shadow-[0_0_8px_rgba(99,102,241,0.4)]"}`}
                  title="Redo (Ctrl+Y)"
                >
                  <Redo2 className="w-4 h-4" />
                </button>
              </div>
          </div>

          <div className="flex items-center justify-center flex-1">
             <div className="flex items-center space-x-2 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                 <Film className="w-3.5 h-3.5 text-indigo-400" />
                 <span className="text-xs font-medium text-slate-300">Video Studio</span>
             </div>
          </div>
          
          <div className="flex items-center space-x-3">
              <button 
                onClick={() => setActiveTool("templates")}
                className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border bg-white/5 hover:bg-white/10 text-white border-white/10 transition-colors"
              >
                  <LayoutTemplate className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Templates</span>
              </button>

              <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-bold border bg-indigo-500/10 border-indigo-500/30 text-indigo-300">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  <span>AI UHD</span>
              </div>

              <button 
                onClick={() => setShowExportModal(true)} 
                className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-all"
              >
                  <Download className="w-4 h-4 mr-1.5" />
                  Export
              </button>
          </div>
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
                                  transform: transformStyle
                              }}
                              onTimeUpdate={handleTimeUpdate}
                              onLoadedMetadata={handleLoadedMetadata}
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

                  {/* FLOATING CONTROLS BAR */}
                  {videoFile && (
                    <div className="absolute bottom-2 left-2 right-2 md:bottom-4 md:left-4 md:right-4 z-20 backdrop-blur-xl rounded-xl md:rounded-2xl px-3 py-1.5 md:px-4 md:py-2.5 flex items-center justify-between" style={{ backgroundColor: 'rgba(5,8,16,0.85)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div className="flex items-center space-x-1.5 md:space-x-2 text-slate-300">
                            <button className="p-1 md:p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors"><SkipBack className="w-3.5 h-3.5 md:w-4 md:h-4"/></button>
                            <button onClick={togglePlayPause} className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)] hover:scale-105 transition-transform">
                                {isPlaying ? <Pause className="w-3.5 h-3.5 md:w-4 md:h-4 fill-current" /> : <Play className="w-3.5 h-3.5 md:w-4 md:h-4 fill-current ml-0.5" />}
                            </button>
                            <button className="p-1 md:p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors"><SkipForward className="w-3.5 h-3.5 md:w-4 md:h-4"/></button>
                        </div>
                        
                        <div className="font-mono text-xs md:text-sm tracking-wider">
                            <span className="text-indigo-400">{formatTime(currentTime)}</span>
                            <span className="text-slate-600 mx-1">/</span>
                            <span className="text-slate-400">{formatTime(duration)}</span>
                        </div>

                        <div className="flex items-center space-x-2 md:space-x-3 text-slate-300">
                            <span className="text-[9px] md:text-[10px] font-bold bg-white/5 px-1.5 py-0.5 md:px-2 md:py-1 rounded border border-white/10">{playbackSpeed}x</span>
                            <button onClick={() => setIsMuted(!isMuted)} className="p-1 md:p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                                {isMuted ? <VolumeX className="w-3.5 h-3.5 md:w-4 md:h-4 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                            </button>
                            <div className="w-px h-3 md:h-4 bg-white/10" />
                            <button className="p-1 md:p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors"><Maximize2 className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
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

          {/* RIGHT/BOTTOM: Properties Panel (TAKES REMAINING HEIGHT BELOW TOOLS ON MOBILE) */}
          <div className={`w-full md:w-64 flex-1 md:flex-none flex flex-col min-h-0 overflow-y-auto overflow-x-hidden z-30 order-3 md:order-last transition-all duration-300 ${activeTool ? 'border-t md:border-t-0' : 'border-t md:border-t-0 border-transparent'}`} style={{ backgroundColor: 'rgba(8,10,18,0.95)', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
              
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
              </div>
          </div>
      </div>

      {/* BOTTOM: FlowLab Timeline */}
      <div className="shrink-0 flex flex-col z-20" style={{ height: '180px', backgroundColor: 'rgba(5,8,16,1)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          
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
                 {/* Left labels column (CapCut Style: Cover thumbnail + Track icons) */}
                 <div className="w-20 shrink-0 bg-[#050810] z-20 border-r border-white/5 flex flex-col pt-1 px-1 space-y-1 items-center justify-start">
                    {/* Cover Button */}
                    <button 
                      onClick={() => {
                         const v = videoRef.current;
                         if (!v) return;
                         const c = document.createElement("canvas");
                         c.width = v.videoWidth || 320;
                         c.height = v.videoHeight || 180;
                         const ctx = c.getContext("2d");
                         if (ctx) {
                            ctx.drawImage(v, 0, 0, c.width, c.height);
                            const url = c.toDataURL("image/png");
                            setEditorState((prev: any) => ({ ...prev, coverImage: url }));
                         }
                      }}
                      className="w-full h-9 rounded-lg bg-white/5 border border-white/10 hover:border-indigo-400 flex flex-col items-center justify-center p-0.5 cursor-pointer transition-all group relative overflow-hidden shrink-0"
                      title="Set Cover Frame"
                    >
                       <ImageIcon className="w-3 h-3 text-indigo-400 group-hover:scale-110 transition-transform" />
                       <span className="text-[8px] font-bold text-slate-300">Cover</span>
                    </button>

                    {/* Audio Track Icon / Add Button */}
                    <button 
                      onClick={() => setActiveTool('audio')}
                      className="w-full h-7 rounded-md bg-violet-500/10 border border-violet-500/20 hover:border-violet-400 flex items-center justify-center space-x-1 cursor-pointer transition-colors shrink-0"
                      title="Add Audio"
                    >
                       <Music className="w-3 h-3 text-violet-400" />
                       <span className="text-[8px] font-bold text-violet-300">Audio</span>
                    </button>

                    {/* Text Track Icon / Add Button */}
                    <button 
                      onClick={() => setActiveTool('text')}
                      className="w-full h-6 rounded-md bg-yellow-500/10 border border-yellow-500/20 hover:border-yellow-400 flex items-center justify-center space-x-1 cursor-pointer transition-colors shrink-0"
                      title="Add Text"
                    >
                       <Type className="w-3 h-3 text-yellow-400" />
                       <span className="text-[8px] font-bold text-yellow-300">Text</span>
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
                                  className={`h-full relative rounded-md flex items-center px-1.5 cursor-pointer transition-all group overflow-hidden ${
                                    isSelected 
                                      ? "bg-indigo-500/40 border-2 border-white text-white shadow-[0_0_12px_rgba(255,255,255,0.4)] z-10" 
                                      : "bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10"
                                  }`} 
                                  style={{ minWidth: '95px', width: `${widthPercent}%` }}
                                >
                                   {/* CapCut Drag Handles on selected clip */}
                                   {isSelected && (
                                     <>
                                       <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-white rounded-l flex items-center justify-center">
                                         <div className="w-0.5 h-3 bg-slate-900 rounded-full" />
                                       </div>
                                       <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-white rounded-r flex items-center justify-center">
                                         <div className="w-0.5 h-3 bg-slate-900 rounded-full" />
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

      {/* CapCut-Standard Swipable Bottom Footer Toolbar (Unified 2-Level Nested Architecture) */}
      <div className="shrink-0 h-14 bg-[#050810]/95 backdrop-blur-xl border-t border-white/10 flex items-center px-2 z-40 relative">
         {activeTool ? (
           /* LEVEL 2: Sub-tool Drawer (Tapped into a primary tool like Edit, Audio, Text, Crop) */
           <div className="flex items-center space-x-2 w-full overflow-x-auto scrollbar-none py-1">
              {/* Back Button */}
              <button 
                onClick={() => setActiveTool(null)}
                className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded-xl text-xs font-bold shrink-0 border border-indigo-500/30 transition-colors"
              >
                 <ChevronLeft className="w-4 h-4" />
                 <span>Back</span>
              </button>

              <div className="w-px h-5 bg-white/10 shrink-0" />

              {/* Level 2 Sub-tools depending on activeTool */}
              {activeTool === 'edit' && (
                 <>
                    <button onClick={handleSplitClip} className="flex flex-col items-center px-3 py-1 text-slate-300 hover:text-white shrink-0">
                       <Scissors className="w-4 h-4 text-indigo-400" />
                       <span className="text-[9px] font-medium mt-0.5">Split</span>
                    </button>
                    <button onClick={() => setRotate((rotate + 90) % 360)} className="flex flex-col items-center px-3 py-1 text-slate-300 hover:text-white shrink-0">
                       <RotateCw className="w-4 h-4" />
                       <span className="text-[9px] font-medium mt-0.5">Rotate</span>
                    </button>
                    <button onClick={() => setFlipH(!flipH)} className="flex flex-col items-center px-3 py-1 text-slate-300 hover:text-white shrink-0">
                       <FlipHorizontal className="w-4 h-4" />
                       <span className="text-[9px] font-medium mt-0.5">Flip H</span>
                    </button>
                    <button onClick={() => setPlaybackSpeed(playbackSpeed === 1 ? 1.5 : playbackSpeed === 1.5 ? 2 : 1)} className="flex flex-col items-center px-3 py-1 text-slate-300 hover:text-white shrink-0">
                       <FastForward className="w-4 h-4 text-cyan-400" />
                       <span className="text-[9px] font-medium mt-0.5">{playbackSpeed}x</span>
                    </button>
                    {selectedClipId && (
                       <button onClick={() => handleRemoveClip(selectedClipId)} className="flex flex-col items-center px-3 py-1 text-red-400 hover:text-red-300 shrink-0">
                          <Trash2 className="w-4 h-4" />
                          <span className="text-[9px] font-medium mt-0.5">Delete</span>
                       </button>
                    )}
                 </>
              )}

              {activeTool === 'crop' && (
                 <>
                    {[{ r: '9:16', l: '9:16' }, { r: '16:9', l: '16:9' }, { r: '1:1', l: '1:1' }, { r: '4:3', l: '4:3' }].map(r => (
                       <button key={r.r} onClick={() => setAspectRatio(r.r as any)} className={`px-3 py-1 rounded-lg text-xs font-bold shrink-0 border ${aspectRatio === r.r ? 'bg-indigo-500 text-white border-indigo-400' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                          {r.l}
                       </button>
                    ))}
                    <button onClick={() => { setZoom(1); setPanX(0); setPanY(0); setRotate(0); setAspectRatio('9:16'); setCropBox({ left: 5, top: 5, width: 90, height: 90 }); }} className="flex flex-col items-center px-3 py-1 text-slate-400 hover:text-white shrink-0">
                       <RefreshCw className="w-4 h-4" />
                       <span className="text-[9px] font-medium mt-0.5">Reset</span>
                    </button>
                 </>
              )}

              {activeTool === 'audio' && (
                 <>
                    <button onClick={() => {}} className="flex flex-col items-center px-3 py-1 text-violet-400 shrink-0">
                       <Plus className="w-4 h-4" />
                       <span className="text-[9px] font-medium mt-0.5">Add Track</span>
                    </button>
                    <button onClick={() => setIsMuted(!isMuted)} className="flex flex-col items-center px-3 py-1 text-slate-300 shrink-0">
                       {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                       <span className="text-[9px] font-medium mt-0.5">{isMuted ? 'Muted' : 'Volume'}</span>
                    </button>
                 </>
              )}

              {activeTool === 'text' && (
                 <>
                    <button onClick={handleAddTextOverlay} className="flex flex-col items-center px-3 py-1 text-yellow-400 shrink-0">
                       <Plus className="w-4 h-4" />
                       <span className="text-[9px] font-medium mt-0.5">Add Text</span>
                    </button>
                 </>
              )}
           </div>
         ) : (
           /* LEVEL 1: Primary Swipable Bottom Toolbar (Swipe horizontally to access all 13 tools) */
           <div className="flex items-center space-x-1.5 w-full overflow-x-auto scrollbar-none py-1">
              {TOOLS.map((tool: any) => (
                 <button 
                   key={tool.id} 
                   onClick={() => setActiveTool(tool.id)}
                   className="flex flex-col items-center justify-center min-w-[56px] px-2 py-1 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all shrink-0"
                 >
                    <tool.icon className="w-4 h-4" />
                    <span className="text-[9px] font-medium mt-0.5 tracking-tight whitespace-nowrap">{tool.label}</span>
                 </button>
              ))}
           </div>
         )}
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
    </div>
  );
}
