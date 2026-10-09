"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Scissors,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Music,
  Type,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  CutProject,
  CutAsset,
  CutClip,
  CutSound,
  projectDuration,
  locateClip,
  splitClip,
} from "@/lib/cut-model";
import {
  OUTPUT_FPS,
  frameTime,
  timelineClips,
  trimVideo,
  trimSound,
  formatClock,
} from "@/lib/cut-timeline";
import CutFilmstrip from "./CutFilmstrip";
import { Waveform } from "./AudioTools";
type Props = {
  project: CutProject;
  assets: CutAsset[];
  time: number;
  playing: boolean;
  selected: string | null;
  seek: (time: number) => void;
  select: (id: string, kind: "video" | "audio" | "text") => void;
  change: (project: CutProject) => void;
  pause: () => void;
  preview: (clip: CutClip | null, source?: number) => void;
};
type EditDrag = {
  id: string;
  kind: "video" | "audio" | "text";
  edge: "in" | "out" | "move";
  x: number;
  clip?: CutClip;
  sound?: CutSound;
};
export default function CutTimeline(props: Props) {
  const sourceVolumes = useRef<Record<string, number>>({});
  const { project, assets, time, playing, selected } = props;
  const [scale, setScale] = useState(90),
    [width, setWidth] = useState(390),
    [view, setView] = useState(0),
    [draft, setDraft] = useState<CutProject | null>(null);
  const scroll = useRef<HTMLDivElement>(null),
    drag = useRef<{
      x: number;
      left: number;
      mouse: boolean;
      moved: boolean;
    } | null>(null),
    editDrag = useRef<EditDrag | null>(null),
    lastMoved = useRef(false),
    latest = useRef(props),
    draftRef = useRef<CutProject | null>(null),
    frame = useRef(0),
    programmatic = useRef<number | null>(null),
    lastUserScroll = useRef(0);
  latest.current = props;
  draftRef.current = draft;
  const active = draft || project,
    clips = useMemo(() => timelineClips(active), [active]),
    duration = projectDuration(active);
  const mediaEnd = Math.max(
    duration,
    ...active.sounds.map((s) => s.start + s.out - s.in),
    ...active.titles.map((t) => t.end),
    1,
  );
  useEffect(() => {
    const node = scroll.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame.current);
    };
  }, []);
  useLayoutEffect(() => {
    const node = scroll.current;
    if (!node) return;
    if (
      drag.current ||
      editDrag.current ||
      (!playing && Date.now() - lastUserScroll.current < 120)
    )
      return;
    programmatic.current = time * scale;
    node.scrollLeft = time * scale;
    setView(node.scrollLeft);
  }, [time, scale, width, playing]);
  function onScroll() {
    const node = scroll.current;
    if (!node) return;
    setView(node.scrollLeft);
    if (
      programmatic.current !== null &&
      Math.abs(node.scrollLeft - programmatic.current) < 1
    ) {
      programmatic.current = null;
      return;
    }
    lastUserScroll.current = Date.now();
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      latest.current.pause();
      latest.current.seek(
        Math.max(
          0,
          Math.min(
            projectDuration(latest.current.project),
            node.scrollLeft / scale,
          ),
        ),
      );
    });
  }
  function beginEdit(
    event: React.PointerEvent,
    kind: "video" | "audio" | "text",
    id: string,
    edge: "in" | "out" | "move",
  ) {
    event.stopPropagation();
    event.preventDefault();
    props.pause();
    props.select(id, kind);
    lastMoved.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    editDrag.current = {
      id,
      kind,
      edge,
      x: event.clientX,
      clip: project.clips.find((c) => c.id === id),
      sound: project.sounds.find((s) => s.id === id),
    };
    setDraft(project);
  }
  function moveEdit(event: React.PointerEvent) {
    const edit = editDrag.current;
    if (!edit) return;
    event.stopPropagation();
    const delta = (event.clientX - edit.x) / scale;
    if (edit.kind === "video" && edit.clip) {
      const asset = assets.find((a) => a.id === edit.clip!.assetId)!;
      const next = trimVideo(
        edit.clip,
        edit.edge as "in" | "out",
        delta,
        asset.duration,
      );
      const value = {
        ...project,
        clips: project.clips.map((c) => (c.id === edit.id ? next : c)),
      };
      draftRef.current = value;
      setDraft(value);
      props.preview(
        edit.clip,
        next[edit.edge as "in" | "out"] -
          (edit.edge === "out" ? 1 / OUTPUT_FPS : 0),
      );
    } else if (edit.kind === "text") {
      const title = project.titles.find((t) => t.id === edit.id)!;
      const next =
        edit.edge === "move"
          ? {
              ...title,
              start: Math.max(0, frameTime(title.start + delta)),
              end:
                Math.max(0, frameTime(title.start + delta)) +
                title.end -
                title.start,
            }
          : edit.edge === "in"
            ? {
                ...title,
                start: Math.max(
                  0,
                  Math.min(
                    title.end - 1 / OUTPUT_FPS,
                    frameTime(title.start + delta),
                  ),
                ),
              }
            : {
                ...title,
                end: Math.max(
                  title.start + 1 / OUTPUT_FPS,
                  frameTime(title.end + delta),
                ),
              };
      const value = {
        ...project,
        titles: project.titles.map((t) => (t.id === edit.id ? next : t)),
      };
      draftRef.current = value;
      setDraft(value);
    } else if (edit.sound) {
      const asset = assets.find((a) => a.id === edit.sound!.assetId)!;
      const next =
        edit.edge === "move"
          ? {
              ...edit.sound,
              start: Math.max(0, frameTime(edit.sound.start + delta)),
            }
          : trimSound(edit.sound, edit.edge, delta, asset.duration);
      const value = {
        ...project,
        sounds: project.sounds.map((s) => (s.id === edit.id ? next : s)),
      };
      draftRef.current = value;
      setDraft(value);
    }
  }
  function finishEdit(event: React.PointerEvent) {
    if (!editDrag.current) return;
    event.stopPropagation();
    if (draftRef.current) props.change(draftRef.current);
    editDrag.current = null;
    setDraft(null);
    props.preview(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function moveScroll(event: React.PointerEvent) {
    const action = drag.current;
    if (!action || !action.mouse || editDrag.current) return;
    const delta = event.clientX - action.x;
    if (Math.abs(delta) > 3) {
      action.moved = true;
      lastMoved.current = true;
      if (!event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (scroll.current) scroll.current.scrollLeft = action.left - delta;
  }
  function trimKey(
    kind: "video" | "audio" | "text",
    id: string,
    edge: "in" | "out",
    direction: number,
  ) {
    props.pause();
    if (kind === "video") {
      const c = project.clips.find((c) => c.id === id)!,
        a = assets.find((a) => a.id === c.assetId)!;
      props.change({
        ...project,
        clips: project.clips.map((x) =>
          x.id === id
            ? trimVideo(c, edge, direction / OUTPUT_FPS / c.speed, a.duration)
            : x,
        ),
      });
    } else if (kind === "text") {
      const title = project.titles.find((t) => t.id === id)!;
      const next =
        edge === "in"
          ? {
              ...title,
              start: Math.max(
                0,
                Math.min(
                  title.end - 1 / OUTPUT_FPS,
                  frameTime(title.start + direction / OUTPUT_FPS),
                ),
              ),
            }
          : {
              ...title,
              end: Math.max(
                title.start + 1 / OUTPUT_FPS,
                frameTime(title.end + direction / OUTPUT_FPS),
              ),
            };
      props.change({
        ...project,
        titles: project.titles.map((t) => (t.id === id ? next : t)),
      });
    } else {
      const s = project.sounds.find((s) => s.id === id)!,
        a = assets.find((a) => a.id === s.assetId)!;
      props.change({
        ...project,
        sounds: project.sounds.map((x) =>
          x.id === id
            ? trimSound(s, edge, direction / OUTPUT_FPS, a.duration)
            : x,
        ),
      });
    }
  }
  const handle = (
    kind: "video" | "audio" | "text",
    id: string,
    edge: "in" | "out",
    value: number,
  ) => (
    <button
      data-trim="true"
      className={"cut-trim-handle " + (edge === "in" ? "left" : "right")}
      aria-label={kind + " " + edge + " trim handle"}
      role="slider"
      aria-valuenow={value}
      aria-valuemin={0}
      onPointerDown={(e) => beginEdit(e, kind, id, edge)}
      onPointerMove={moveEdit}
      onPointerUp={finishEdit}
      onPointerCancel={finishEdit}
      onKeyDown={(e) => {
        if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
          e.preventDefault();
          trimKey(
            kind,
            id,
            edge,
            (e.key === "ArrowRight" ? 1 : -1) * (e.shiftKey ? 10 : 1),
          );
        }
      }}
    >
      <span />
    </button>
  );
  const visibleStart = (view - width / 2) / scale,
    visibleEnd = (view + width / 2) / scale;
  return (
    <div className="cut-timeline cut-precision-timeline">
      <div className="cut-timeline-controls">
        <span>
          {formatClock(time)} <small>30 FPS</small>
        </span>
        <button
          aria-label="Previous frame"
          onClick={() => {
            lastUserScroll.current = 0;
            props.pause();
            props.seek(Math.max(0, frameTime(time - 1 / OUTPUT_FPS)));
          }}
        >
          <ChevronLeft size={17} />
        </button>
        <button
          aria-label="Next frame"
          onClick={() => {
            lastUserScroll.current = 0;
            props.pause();
            props.seek(Math.min(duration, frameTime(time + 1 / OUTPUT_FPS)));
          }}
        >
          <ChevronRight size={17} />
        </button>
        <button
          aria-label="Split at playhead"
          onClick={() => {
            const at = locateClip(project, time);
            if (at) {
              const source = frameTime(at.source);
              props.change({
                ...project,
                clips: project.clips.flatMap((c) =>
                  c.id === at.clip.id ? splitClip(c, source) : [c],
                ),
              });
            }
          }}
        >
          <Scissors size={15} />
          <span>Split</span>
        </button>
        <button
          aria-label="Zoom timeline out"
          onClick={() => setScale((s) => Math.max(30, s / 1.6))}
        >
          <ZoomOut size={16} />
        </button>
        <button
          aria-label="Zoom timeline in"
          onClick={() => setScale((s) => Math.min(1800, s * 1.6))}
        >
          <ZoomIn size={16} />
        </button>
      </div>
      <button
        className="cut-source-mute"
        aria-label={
          project.clips.every((c) => c.volume === 0)
            ? "Unmute original video sound"
            : "Mute original video sound"
        }
        onClick={() => {
          const muted = project.clips.every((c) => c.volume === 0);
          if (!muted)
            project.clips.forEach((c) => {
              sourceVolumes.current[c.id] = c.volume;
            });
          props.change({
            ...project,
            clips: project.clips.map((c) => ({
              ...c,
              volume: muted ? (sourceVolumes.current[c.id] ?? 1) : 0,
            })),
          });
        }}
      >
        {project.clips.every((c) => c.volume === 0) ? (
          <VolumeX size={18} />
        ) : (
          <Volume2 size={18} />
        )}
      </button>
      <div
        ref={scroll}
        className="cut-precision-scroll"
        onScroll={onScroll}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("[data-trim]")) return;
          props.pause();
          lastMoved.current = false;
          drag.current = {
            x: e.clientX,
            left: e.currentTarget.scrollLeft,
            mouse: e.pointerType === "mouse",
            moved: false,
          };
        }}
        onPointerMove={moveScroll}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          lastMoved.current = true;
          drag.current = null;
        }}
      >
        <div
          className="cut-precision-content"
          style={{
            width: mediaEnd * scale + width,
            paddingLeft: width / 2,
            paddingRight: width / 2,
          }}
        >
          <div
            className="cut-precision-ruler"
            style={{ width: mediaEnd * scale }}
          >
            {Array.from(
              {
                length: Math.max(
                  0,
                  Math.ceil(
                    (Math.min(mediaEnd, visibleEnd + 2) -
                      Math.max(0, visibleStart - 2)) *
                      (scale >= 450 ? OUTPUT_FPS : scale >= 180 ? 4 : 1),
                  ) + 1,
                ),
              },
              (_, i) => {
                const step =
                    scale >= 450 ? 1 / OUTPUT_FPS : scale >= 180 ? 0.25 : 1,
                  start = Math.max(
                    0,
                    Math.floor((visibleStart - 2) / step) * step,
                  ),
                  t = start + i * step;
                return (
                  <span key={t} style={{ left: t * scale }}>
                    {scale >= 450
                      ? Math.round(t * OUTPUT_FPS) % OUTPUT_FPS === 0
                        ? formatClock(t)
                        : "·"
                      : formatClock(t)}
                  </span>
                );
              },
            )}
          </div>
          <div
            className="cut-precision-video"
            style={{ width: mediaEnd * scale }}
          >
            {clips.map(({ clip, start, end }) => {
              const a = assets.find((a) => a.id === clip.assetId)!;
              if (!a) return null;
              return (
                <div
                  key={clip.id}
                  className={
                    "cut-precision-clip " +
                    (selected === clip.id ? "selected" : "")
                  }
                  style={{
                    left: start * scale,
                    width: Math.max(3, (end - start) * scale),
                  }}
                >
                  <button
                    aria-label={"Select video clip " + a.name}
                    onClick={() => {
                      if (!lastMoved.current) props.select(clip.id, "video");
                    }}
                  >
                    <CutFilmstrip
                      clip={clip}
                      asset={a}
                      scale={scale}
                      first={Math.max(
                        0,
                        Math.floor(((visibleStart - start) * scale) / 60) - 1,
                      )}
                      last={Math.max(
                        0,
                        Math.ceil(((visibleEnd - start) * scale) / 60) + 1,
                      )}
                    />
                    <span>{a.name}</span>
                    <small>{(end - start).toFixed(3)}s</small>
                  </button>
                  {selected === clip.id && (
                    <>
                      {handle("video", clip.id, "in", clip.in)}
                      {handle("video", clip.id, "out", clip.out)}
                    </>
                  )}
                </div>
              );
            })}
          </div>
          {active.sounds.map((sound) => {
            const a = assets.find((a) => a.id === sound.assetId);
            if (!a) return null;
            const layer = {
              id: sound.id,
              name: a.name,
              url: a.url,
              duration: a.duration,
              start: sound.start,
              trimStart: sound.in,
              trimEnd: sound.out,
              volume: sound.volume,
              fadeIn: sound.fadeIn,
              fadeOut: sound.fadeOut,
              muted: sound.muted,
              peaks: a.peaks,
            };
            return (
              <div
                key={sound.id}
                className="cut-precision-row"
                style={{ width: mediaEnd * scale }}
              >
                <div
                  className={
                    "cut-precision-sound " +
                    (selected === sound.id ? "selected" : "")
                  }
                  style={{
                    left: sound.start * scale,
                    width: Math.max(3, (sound.out - sound.in) * scale),
                  }}
                >
                  <button
                    data-trim={selected === sound.id ? "true" : undefined}
                    aria-label={"Select audio clip " + a.name}
                    onClick={() => {
                      if (!lastMoved.current) props.select(sound.id, "audio");
                    }}
                    onPointerDown={(e) => {
                      if (selected === sound.id)
                        beginEdit(e, "audio", sound.id, "move");
                    }}
                    onPointerMove={moveEdit}
                    onPointerUp={finishEdit}
                    onPointerCancel={finishEdit}
                  >
                    <span>
                      <Music size={10} /> {a.name}
                    </span>
                    <Waveform layer={layer} />
                  </button>
                  {selected === sound.id && (
                    <>
                      {handle("audio", sound.id, "in", sound.in)}
                      {handle("audio", sound.id, "out", sound.out)}
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {active.titles.map((title) => (
            <div
              key={title.id}
              className="cut-precision-row title"
              style={{ width: mediaEnd * scale }}
            >
              <div
                className={
                  "cut-precision-title " +
                  (selected === title.id ? "selected" : "")
                }
                style={{
                  left: title.start * scale,
                  width: Math.max(3, (title.end - title.start) * scale),
                }}
              >
                <button
                  data-trim={selected === title.id ? "true" : undefined}
                  aria-label={"Select text clip " + title.text}
                  onClick={() => {
                    if (!lastMoved.current) props.select(title.id, "text");
                  }}
                  onPointerDown={(e) => {
                    if (selected === title.id)
                      beginEdit(e, "text", title.id, "move");
                  }}
                  onPointerMove={moveEdit}
                  onPointerUp={finishEdit}
                  onPointerCancel={finishEdit}
                >
                  <Type size={11} />
                  {title.text}
                </button>
                {selected === title.id && (
                  <>
                    {handle("text", title.id, "in", title.start)}
                    {handle("text", title.id, "out", title.end)}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="cut-center-playhead" />
      <div className="cut-timeline-hint">
        Drag scenes to scrub · select a clip and drag its edges · zoom for frame
        detail
      </div>
    </div>
  );
}
