"use client";
import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Eye,
  EyeOff,
  Image as ImageIcon,
  Lock,
  Music,
  Scissors,
  Sparkles,
  Type,
  Unlock,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  CutAsset,
  CutClip,
  CutProject,
  CutSound,
  CutTitle,
  clipDuration,
  projectDuration,
  splitClip,
} from "@/lib/cut-model";
import {
  OUTPUT_FPS,
  frameTime,
  timelineClips,
  trimSound,
  trimVideo,
} from "@/lib/cut-timeline";
import { formatCapCutTimecode } from "@/lib/capcut-studio-tools";
import CutFilmstrip from "./CutFilmstrip";

export type TimelineMarkerItem = {
  id: string;
  time: number;
  label: string;
  color: string;
};

const TRACK_LEFT_PAD = 12;
const MIN_SCALE = 2;
const MAX_SCALE = 220;

const Wave = ({ peaks, id }: { peaks: number[]; id: string }) => {
  const n = Math.min(80, peaks.length || 1);
  let top = "M 0 28";
  let bot = "";
  for (let i = 0; i < n; i++) {
    const x = (i / Math.max(1, n - 1)) * 200;
    const p = peaks[Math.floor((i / n) * peaks.length)] || 0.08;
    const h = Math.max(2, p * 23);
    top += ` L ${x.toFixed(1)} ${(28 - h).toFixed(1)}`;
    bot = ` L ${x.toFixed(1)} ${(28 + h * 0.45).toFixed(1)}` + bot;
  }
  return (
    <svg viewBox="0 0 200 36" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#69f5ff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#1293a8" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <path
        d={`${top}${bot} Z`}
        fill={`url(#${id})`}
        stroke="#7ffbff"
        strokeWidth="0.9"
      />
    </svg>
  );
};

/** Formats ruler tick seconds into CapCut MM:SS (e.g. 00:00, 00:15, 01:30) */
function formatRulerTick(sec: number): string {
  const safe = Math.max(0, Math.round(sec));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/** Adaptive major & minor ruler intervals (in seconds) based on zoom scale */
function getRulerIntervals(scale: number): { major: number; minor: number } {
  if (scale < 3.5) return { major: 60, minor: 15 };
  if (scale < 7) return { major: 30, minor: 5 };
  if (scale < 16) return { major: 15, minor: 3 };
  if (scale < 35) return { major: 5, minor: 1 };
  if (scale < 75) return { major: 2, minor: 0.5 };
  return { major: 1, minor: 0.2 };
}

export default function CutTimeline({
  project,
  assets,
  time,
  playing,
  selected,
  seek,
  pause,
  select,
  change,
  preview,
  markers = [],
  onSelectMarker,
  onRemoveMarker,
  previewAxisEnabled = false,
  cursorMode = "select",
  trackLocked = false,
  trackHidden = false,
  onToggleTrackLock,
  onToggleTrackHide,
  onCaptureCover,
  coverImage,
  externalScale,
  onScaleChange,
  onDropAssetId,
}: {
  project: CutProject;
  assets: CutAsset[];
  time: number;
  playing: boolean;
  selected: string | null;
  seek: (time: number) => void;
  pause: () => void;
  select: (id: string, kind: "video" | "audio" | "text") => void;
  change: (project: CutProject) => void;
  preview: (clip: CutClip | null, source?: number) => void;
  markers?: TimelineMarkerItem[];
  onSelectMarker?: (time: number) => void;
  onRemoveMarker?: (id: string) => void;
  previewAxisEnabled?: boolean;
  cursorMode?: "select" | "split";
  trackLocked?: boolean;
  trackHidden?: boolean;
  onToggleTrackLock?: () => void;
  onToggleTrackHide?: () => void;
  onCaptureCover?: () => void;
  coverImage?: string;
  externalScale?: number;
  onScaleChange?: (scale: number) => void;
  onDropAssetId?: (assetId: string) => void;
}) {
  const [internalScale, setInternalScale] = useState(40);
  const scale = externalScale ?? internalScale;
  const setScale = (nextOrFn: number | ((prev: number) => number)) => {
    const resolved =
      typeof nextOrFn === "function" ? nextOrFn(scale) : nextOrFn;
    const clamped = Math.max(MIN_SCALE, Math.min(MAX_SCALE, resolved));
    setInternalScale(clamped);
    onScaleChange?.(clamped);
  };

  const [width, setWidth] = useState(960);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [hoverAxisX, setHoverAxisX] = useState<number | null>(null);
  const [hoverCut, setHoverCut] = useState<{
    clipId: string;
    timelineTime: number;
    sourceTime: number;
  } | null>(null);
  const [trimBadge, setTrimBadge] = useState<{
    x: number;
    label: string;
  } | null>(null);

  const scroller = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const pinch = useRef<{ dist: number; scale: number } | null>(null);

  const clips = useMemo(() => timelineClips(project), [project]);
  const videoDuration = projectDuration(project);
  const duration = Math.max(
    videoDuration,
    ...project.sounds.map((s) => s.start + (s.out - s.in)),
    ...project.titles.map((t) => t.end),
    1,
  );
  const sourceMuted =
    project.clips.length > 0 && project.clips.every((c) => c.volume === 0);

  // Observe scroller viewport width
  useLayoutEffect(() => {
    const node = scroller.current;
    if (!node) return;
    const sync = () => {
      setWidth(node.clientWidth || 960);
      setScrollLeft(node.scrollLeft);
    };
    sync();
    const ro =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(sync);
    ro?.observe(node);
    return () => ro?.disconnect();
  }, []);

  // Auto-keep moving playhead visible during playback without hijacking user scroll when paused
  useEffect(() => {
    const node = scroller.current;
    if (!node || !playing) return;
    const playheadX = TRACK_LEFT_PAD + time * scale;
    const viewLeft = node.scrollLeft;
    const viewRight = viewLeft + node.clientWidth;
    if (playheadX > viewRight - 48) {
      node.scrollLeft = Math.max(0, playheadX - node.clientWidth * 0.25);
    } else if (playheadX < viewLeft) {
      node.scrollLeft = Math.max(0, playheadX - 24);
    }
  }, [time, scale, playing]);

  const onScroll = () => {
    const node = scroller.current;
    if (!node) return;
    setScrollLeft(node.scrollLeft);
  };

  const clientXToTimelineTime = (clientX: number): number => {
    const content = contentRef.current;
    if (!content) return 0;
    const rect = content.getBoundingClientRect();
    const relX = clientX - rect.left - TRACK_LEFT_PAD;
    return Math.max(0, Math.min(duration, frameTime(relX / scale)));
  };

  const startScrub = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    pause();
    const target = e.currentTarget as HTMLElement;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {}
    seek(clientXToTimelineTime(e.clientX));

    const move = (ev: PointerEvent) => {
      seek(clientXToTimelineTime(ev.clientX));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  function startTrim(
    e: React.PointerEvent<HTMLButtonElement>,
    kind: "video" | "audio" | "text" | "move-audio" | "move-text",
    id: string,
    edge: "in" | "out",
  ) {
    if (trackLocked) return;
    e.preventDefault();
    e.stopPropagation();
    pause();
    select(id, kind.includes("audio") ? "audio" : kind.includes("text") ? "text" : "video");
    const button = e.currentTarget;
    const startX = e.clientX;
    const snapshot = project;
    try {
      button.setPointerCapture(e.pointerId);
    } catch {}

    const move = (ev: PointerEvent) => {
      const delta = (ev.clientX - startX) / scale;

      if (kind === "video") {
        let seekTarget = time;
        const nextClips = snapshot.clips.map((c) => {
          if (c.id !== id) return c;
          const asset = assets.find((a) => a.id === c.assetId);
          const next = trimVideo(c, edge, delta, asset?.duration || c.out);
          preview(next, edge === "in" ? next.in : next.out);
          return next;
        });
        let cursor = 0;
        for (const c of nextClips) {
          const len = clipDuration(c);
          if (c.id === id) {
            seekTarget = edge === "in" ? cursor : cursor + len;
            setTrimBadge({
              x: TRACK_LEFT_PAD + seekTarget * scale,
              label: formatCapCutTimecode(len, OUTPUT_FPS),
            });
          }
          cursor += len;
        }
        const nextTotal = Math.max(0.05, cursor);
        change({
          ...snapshot,
          clips: nextClips,
          sounds: snapshot.sounds
            .filter((s) => s.start < nextTotal)
            .map((s) => {
              const out = Math.min(s.out, s.in + (nextTotal - s.start));
              const len = Math.max(0.05, out - s.in);
              return {
                ...s,
                out: s.in + len,
                fadeIn: Math.min(s.fadeIn, len),
                fadeOut: Math.min(s.fadeOut, len),
              };
            }),
          titles: snapshot.titles
            .filter((t) => t.start < nextTotal)
            .map((t) => ({
              ...t,
              end: Math.max(t.start + 0.05, Math.min(t.end, nextTotal)),
            })),
        });
        seek(Math.min(seekTarget, nextTotal));
      } else if (kind === "audio" || kind === "move-audio") {
        change({
          ...snapshot,
          sounds: snapshot.sounds.map((s): CutSound => {
            if (s.id !== id) return s;
            const asset = assets.find((a) => a.id === s.assetId);
            if (kind === "move-audio") {
              return { ...s, start: Math.max(0, frameTime(s.start + delta)) };
            }
            return trimSound(s, edge, delta, asset?.duration || s.out);
          }),
        });
      } else {
        change({
          ...snapshot,
          titles: snapshot.titles.map((t): CutTitle => {
            if (t.id !== id) return t;
            const len = t.end - t.start;
            const min = 1 / OUTPUT_FPS;
            if (kind === "move-text") {
              const start = Math.max(0, frameTime(t.start + delta));
              return { ...t, start, end: frameTime(start + len) };
            }
            return edge === "in"
              ? {
                  ...t,
                  start: Math.max(0, Math.min(t.end - min, frameTime(t.start + delta))),
                }
              : {
                  ...t,
                  end: Math.max(t.start + min, frameTime(t.end + delta)),
                };
          }),
        });
      }
    };

    const up = () => {
      preview(null);
      setTrimBadge(null);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  const rulerIntervals = useMemo(() => getRulerIntervals(scale), [scale]);
  const majorTicks = useMemo(() => {
    const maxSec = Math.ceil(duration + 15);
    const count = Math.min(400, Math.floor(maxSec / rulerIntervals.major) + 1);
    return Array.from({ length: count }, (_, idx) => idx * rulerIntervals.major);
  }, [duration, rulerIntervals.major]);

  const minorTicks = useMemo(() => {
    const maxSec = Math.ceil(duration + 15);
    const count = Math.min(1200, Math.floor(maxSec / rulerIntervals.minor) + 1);
    const out: number[] = [];
    for (let i = 0; i < count; i++) {
      const sec = Number((i * rulerIntervals.minor).toFixed(3));
      if (Math.abs(sec % rulerIntervals.major) > 0.01) {
        out.push(sec);
      }
    }
    return out;
  }, [duration, rulerIntervals]);

  const trackWidth = Math.max(
    width - 12,
    Math.ceil((duration + 8) * scale) + TRACK_LEFT_PAD + 140,
  );
  const playheadLeft = TRACK_LEFT_PAD + time * scale;

  return (
    <section
      aria-label="Precision timeline"
      className="studio-timeline studio-precision cut-precision-timeline"
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(e) => {
        e.preventDefault();
        const assetId = e.dataTransfer.getData("application/x-fahi-asset-id");
        if (assetId && onDropAssetId) {
          onDropAssetId(assetId);
        }
      }}
    >
      <div className="cut-timeline-body">
        {/* CapCut Left Track Sidebar (Cover + Track Mute / Lock / Hide) */}
        <div className="cut-track-sidebar">
          <div className="cut-track-sidebar-ruler-spacer">TRACKS</div>

          {/* Main Video Track Controls */}
          <div className="cut-track-sidebar-lane video-lane">
            <button
              type="button"
              className="cut-cover-btn overflow-hidden relative"
              title="Capture current frame as Project Cover"
              onClick={() => onCaptureCover?.()}
            >
              {coverImage ? (
                <img
                  src={coverImage}
                  alt="Cover"
                  className="absolute inset-0 w-full h-full object-cover opacity-50"
                />
              ) : (
                <ImageIcon size={12} />
              )}
              <span className="relative z-10">Cover</span>
            </button>

            <div className="cut-track-ctrl-icons">
              <button
                type="button"
                aria-label={sourceMuted ? "Unmute clip audio" : "Mute clip audio"}
                title={sourceMuted ? "Unmute track audio" : "Mute track audio"}
                className={`cut-track-icon-btn ${sourceMuted ? "active" : ""}`}
                onClick={() =>
                  change({
                    ...project,
                    clips: project.clips.map((c) => ({
                      ...c,
                      volume: sourceMuted ? 1 : 0,
                    })),
                  })
                }
              >
                {sourceMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
              </button>
              <button
                type="button"
                aria-label={trackLocked ? "Unlock video track" : "Lock video track"}
                title={trackLocked ? "Unlock video track" : "Lock video track"}
                className={`cut-track-icon-btn ${trackLocked ? "active" : ""}`}
                onClick={() => onToggleTrackLock?.()}
              >
                {trackLocked ? <Lock size={12} /> : <Unlock size={12} />}
              </button>
              <button
                type="button"
                aria-label={trackHidden ? "Show video track" : "Hide video track"}
                title={trackHidden ? "Show video track" : "Hide video track"}
                className={`cut-track-icon-btn ${trackHidden ? "active" : ""}`}
                onClick={() => onToggleTrackHide?.()}
              >
                {trackHidden ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </div>
          </div>

          {/* Text Overlay Track Header */}
          <div className="cut-track-sidebar-lane sub-lane">
            <Type size={12} className="text-amber-400/80 ml-1" />
            <span className="text-[10px] text-slate-400 font-medium">Text</span>
          </div>

          {/* Audio Track Header */}
          <div className="cut-track-sidebar-lane sub-lane">
            <Music size={12} className="text-cyan-400/80 ml-1" />
            <span className="text-[10px] text-slate-400 font-medium">Audio</span>
          </div>
        </div>

        {/* Right Scrollable Track Area (Starts at 00:00 on the Left Edge) */}
        <div
          ref={scroller}
          aria-label="Timeline tracks"
          className={`cut-precision-scroll ${cursorMode === "split" ? "cursor-crosshair" : ""}`}
          onScroll={onScroll}
          onMouseMove={(e) => {
            if (!previewAxisEnabled || !scroller.current) {
              if (hoverAxisX !== null) setHoverAxisX(null);
              return;
            }
            const rect = scroller.current.getBoundingClientRect();
            setHoverAxisX(e.clientX - rect.left + scroller.current.scrollLeft);
          }}
          onMouseLeave={() => {
            if (hoverAxisX !== null) setHoverAxisX(null);
          }}
          onWheel={(e) => {
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              const factor = e.deltaY < 0 ? 1.18 : 0.85;
              setScale((s) => Number((s * factor).toFixed(1)));
            }
          }}
          onTouchStart={(e) => {
            if (e.touches.length === 2) {
              const dx = e.touches[0].clientX - e.touches[1].clientX;
              const dy = e.touches[0].clientY - e.touches[1].clientY;
              pinch.current = { dist: Math.hypot(dx, dy) || 1, scale };
            }
          }}
          onTouchMove={(e) => {
            if (e.touches.length === 2 && pinch.current) {
              const dx = e.touches[0].clientX - e.touches[1].clientX;
              const dy = e.touches[0].clientY - e.touches[1].clientY;
              setScale(
                (pinch.current.scale * Math.hypot(dx, dy)) / pinch.current.dist,
              );
            }
          }}
          onTouchEnd={() => {
            pinch.current = null;
          }}
        >
          <div
            ref={contentRef}
            className="cut-precision-content"
            style={{
              width: trackWidth,
              paddingLeft: TRACK_LEFT_PAD,
              paddingRight: 140,
            }}
          >
            {/* Yellow Preview Axis Skimmer Line */}
            {previewAxisEnabled && hoverAxisX !== null && (
              <div
                style={{ left: hoverAxisX }}
                className="pointer-events-none absolute top-0 bottom-0 w-[1.5px] bg-amber-400/80 z-30 shadow-[0_0_6px_rgba(251,191,36,0.8)]"
              />
            )}

            {/* Top Time Ruler (00:00 at left edge, click/drag to scrub) */}
            <div
              className="cut-precision-ruler"
              aria-hidden="true"
              onPointerDown={startScrub}
            >
              {majorTicks.map((s) => (
                <div
                  key={`maj-${s}`}
                  className="cut-ruler-major-tick"
                  style={{ left: TRACK_LEFT_PAD + s * scale }}
                >
                  <span>{formatRulerTick(s)}</span>
                </div>
              ))}
              {minorTicks.map((s) => (
                <div
                  key={`min-${s}`}
                  className="cut-ruler-minor-tick"
                  style={{ left: TRACK_LEFT_PAD + s * scale }}
                />
              ))}

              {/* Timeline Markers (M) */}
              {markers.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  title={`${m.label} (${formatRulerTick(m.time)}) — Right-click to remove`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectMarker?.(m.time);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemoveMarker?.(m.id);
                  }}
                  style={{
                    position: "absolute",
                    left: TRACK_LEFT_PAD + m.time * scale,
                    top: 1,
                    transform: "translateX(-50%)",
                    background: m.color || "#22d3ee",
                    color: "#041016",
                    border: "none",
                    borderRadius: "3px 3px 6px 6px",
                    padding: "1px 5px",
                    fontSize: "9px",
                    fontWeight: 800,
                    zIndex: 12,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Moving White Playhead (Starts at 00:00 on left edge and moves right) */}
            <div
              className="cut-moving-playhead"
              style={{ left: playheadLeft }}
              aria-hidden="true"
            >
              <div
                className="cut-moving-playhead-head"
                title="Drag playhead"
                onPointerDown={startScrub}
              />
            </div>

            {/* Live Trim Timecode Tooltip */}
            {trimBadge && (
              <div
                className="cut-timecode-tooltip"
                style={{ left: trimBadge.x, top: 28 }}
              >
                {trimBadge.label}
              </div>
            )}

            {/* Main Video Track Lane (00:00 flush at left edge) */}
            <div
              className="cut-precision-video"
              style={{
                opacity: trackHidden ? 0.25 : 1,
                pointerEvents: trackLocked ? "none" : "auto",
              }}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  seek(clientXToTimelineTime(e.clientX));
                }
              }}
            >
              {clips.map(({ clip, start, end }) => {
                const asset = assets.find((a) => a.id === clip.assetId);
                const len = end - start;
                const w = Math.max(18, len * scale);
                const left = start * scale;
                const viewLeft = scrollLeft - left - TRACK_LEFT_PAD;
                const first = Math.floor(viewLeft / 60) - 1;
                const last = Math.ceil((viewLeft + width) / 60) + 1;
                const active = selected === clip.id;
                const isHoveringThis =
                  hoverCut && hoverCut.clipId === clip.id;
                const cleanName = (asset?.name || "Clip").replace(
                  /_part[12]/g,
                  "",
                );
                const durationTimecode = formatCapCutTimecode(len, OUTPUT_FPS);

                return (
                  <div
                    key={clip.id}
                    className={`cut-precision-clip group ${active ? "selected" : ""}`}
                    style={{ left, width: w }}
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const relX = Math.max(
                        0,
                        Math.min(rect.width, e.clientX - rect.left),
                      );
                      const offsetTimeline = relX / scale;
                      const timelineTime = frameTime(start + offsetTimeline);
                      const sourceTime = frameTime(
                        clip.in + offsetTimeline * clip.speed,
                      );
                      if (
                        sourceTime > clip.in + 0.08 &&
                        sourceTime < clip.out - 0.08
                      ) {
                        setHoverCut({
                          clipId: clip.id,
                          timelineTime,
                          sourceTime,
                        });
                      } else {
                        setHoverCut(null);
                      }
                    }}
                    onMouseLeave={() => setHoverCut(null)}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        select(clip.id, "video");
                        const clickTimelineTime = clientXToTimelineTime(
                          e.clientX,
                        );
                        const sourceCut = frameTime(
                          clip.in + (clickTimelineTime - start) * clip.speed,
                        );
                        if (
                          cursorMode === "split" &&
                          sourceCut > clip.in + 0.08 &&
                          sourceCut < clip.out - 0.08
                        ) {
                          seek(clickTimelineTime);
                          change({
                            ...project,
                            clips: project.clips.flatMap((c) =>
                              c.id === clip.id ? splitClip(c, sourceCut) : [c],
                            ),
                          });
                          return;
                        }
                        seek(clickTimelineTime);
                      }}
                    >
                      {/* CapCut Teal Header Bar: Filename + HH:MM:SS:FF */}
                      <div className="cut-clip-header-strip">
                        <span className="clip-title">{cleanName}</span>
                        <span className="clip-dur">{durationTimecode}</span>
                      </div>

                      {asset && (
                        <CutFilmstrip
                          clip={clip}
                          asset={asset}
                          scale={scale}
                          first={first}
                          last={last}
                        />
                      )}
                    </button>

                    {/* Hover / Blade Split Line & Badge */}
                    {isHoveringThis && !trackLocked && (
                      <button
                        type="button"
                        aria-label={`Cut ${cleanName} at ${formatCapCutTimecode(hoverCut.timelineTime, OUTPUT_FPS)}`}
                        title={`Split at ${formatCapCutTimecode(hoverCut.timelineTime, OUTPUT_FPS)}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          select(clip.id, "video");
                          seek(hoverCut.timelineTime);
                          change({
                            ...project,
                            clips: project.clips.flatMap((c) =>
                              c.id === clip.id
                                ? splitClip(c, hoverCut.sourceTime)
                                : [c],
                            ),
                          });
                          setHoverCut(null);
                        }}
                        style={{
                          left: Math.max(
                            8,
                            Math.min(
                              w - 8,
                              (hoverCut.timelineTime - start) * scale,
                            ),
                          ),
                        }}
                        className={`
                          absolute top-0 bottom-0 -translate-x-1/2 z-20
                          w-4 flex flex-col items-center justify-start
                          transition-opacity cursor-pointer bg-transparent border-0 p-0
                          ${cursorMode === "split" ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
                        `}
                      >
                        <span className="mt-0.5 px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-bold shadow flex items-center gap-0.5 whitespace-nowrap">
                          <Scissors size={9} />
                          {formatCapCutTimecode(
                            hoverCut.timelineTime,
                            OUTPUT_FPS,
                          )}
                        </span>
                        <span className="flex-1 w-[1.5px] border-l border-dashed border-rose-400 shadow-[0_0_4px_rgba(244,63,94,0.9)]" />
                      </button>
                    )}

                    {/* CapCut White [ ] Trim Handles */}
                    {active && !trackLocked && (
                      <>
                        <button
                          type="button"
                          aria-label={`Trim start of ${cleanName}`}
                          className="cut-trim-handle left"
                          onPointerDown={(e) =>
                            startTrim(e, "video", clip.id, "in")
                          }
                        >
                          <span />
                        </button>
                        <button
                          type="button"
                          aria-label={`Trim end of ${cleanName}`}
                          className="cut-trim-handle right"
                          onPointerDown={(e) =>
                            startTrim(e, "video", clip.id, "out")
                          }
                        >
                          <span />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Text Overlay Track Lane */}
            <div className="cut-precision-row">
              {project.titles.map((t) => {
                const active = selected === t.id;
                return (
                  <div
                    key={t.id}
                    className={`cut-precision-title ${active ? "selected" : ""}`}
                    style={{
                      left: t.start * scale,
                      width: Math.max(24, (t.end - t.start) * scale),
                    }}
                  >
                    <button
                      type="button"
                      data-trim="move"
                      onClick={() => {
                        select(t.id, "text");
                        seek(t.start);
                      }}
                      onPointerDown={(e) =>
                        startTrim(e, "move-text", t.id, "in")
                      }
                    >
                      <Sparkles size={11} /> {t.text}
                    </button>
                    {active && (
                      <>
                        <button
                          type="button"
                          aria-label={`Trim start of text ${t.text}`}
                          className="cut-trim-handle left"
                          onPointerDown={(e) =>
                            startTrim(e, "text", t.id, "in")
                          }
                        >
                          <span />
                        </button>
                        <button
                          type="button"
                          aria-label={`Trim end of text ${t.text}`}
                          className="cut-trim-handle right"
                          onPointerDown={(e) =>
                            startTrim(e, "text", t.id, "out")
                          }
                        >
                          <span />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Audio Track Lane */}
            <div className="cut-precision-row">
              {project.sounds.map((s) => {
                const asset = assets.find((a) => a.id === s.assetId);
                const len = s.out - s.in;
                const active = selected === s.id;
                return (
                  <div
                    key={s.id}
                    className={`cut-precision-sound ${active ? "selected" : ""}`}
                    style={{
                      left: s.start * scale,
                      width: Math.max(24, len * scale),
                    }}
                  >
                    <button
                      type="button"
                      data-trim="move"
                      onClick={() => {
                        select(s.id, "audio");
                        seek(s.start);
                      }}
                      onPointerDown={(e) =>
                        startTrim(e, "move-audio", s.id, "in")
                      }
                    >
                      <span>
                        <Music size={10} /> {asset?.name || "Audio"}
                      </span>
                      <Wave peaks={asset?.peaks || []} id={`w-${s.id}`} />
                    </button>
                    {active && (
                      <>
                        <button
                          type="button"
                          aria-label={`Trim start of audio ${asset?.name || "Audio"}`}
                          className="cut-trim-handle left"
                          onPointerDown={(e) =>
                            startTrim(e, "audio", s.id, "in")
                          }
                        >
                          <span />
                        </button>
                        <button
                          type="button"
                          aria-label={`Trim end of audio ${asset?.name || "Audio"}`}
                          className="cut-trim-handle right"
                          onPointerDown={(e) =>
                            startTrim(e, "audio", s.id, "out")
                          }
                        >
                          <span />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
