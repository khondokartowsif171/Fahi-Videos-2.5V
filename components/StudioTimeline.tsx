"use client";
import { useMemo, useState } from "react";
import CutTimeline from "./CutTimeline";
import type { CutAsset, CutProject, CutClip } from "@/lib/cut-model";
import type { VideoClipItem } from "./VideoEditor";
import type { AudioLayer } from "@/lib/editor-audio";
import "./studio-timeline.css";
type Title = {
  id: string;
  text: string;
  start?: number;
  end?: number;
  color: string;
  fontSize: number;
};
type Props = {
  clips: VideoClipItem[];
  audio: AudioLayer[];
  titles: Title[];
  time: number;
  playing: boolean;
  selected: string | null;
  volume: number;
  muted: boolean;
  seek: (time: number) => void;
  pause: () => void;
  select: (id: string, kind: "video" | "audio" | "text") => void;
  change: (
    clips: VideoClipItem[],
    audio: AudioLayer[],
    titles: Title[],
    muted: boolean,
  ) => void;
  preview: (clip: VideoClipItem | null, source?: number) => void;
};
export default function StudioTimeline(props: Props) {
  const assets = useMemo<CutAsset[]>(
    () => [
      ...props.clips.map((c) => ({
        id: c.id,
        name: c.name,
        kind: "video" as const,
        duration: c.sourceDuration ?? (c.startOffset || 0) + c.duration,
        width: 0,
        height: 0,
        hasAudio: true,
        url: c.objectUrl,
        peaks: [],
      })),
      ...props.audio.map((a) => ({
        id: a.id,
        name: a.name,
        kind: "audio" as const,
        duration: a.duration,
        width: 0,
        height: 0,
        hasAudio: true,
        url: a.url,
        peaks: a.peaks,
      })),
    ],
    [props.clips, props.audio],
  );
  const total = props.clips.reduce((sum, c) => sum + c.duration, 0);
  const project = useMemo<CutProject>(
    () => ({
      id: "fahivids-studio",
      name: "Video Studio",
      version: 1,
      updatedAt: 0,
      ratio: "9:16",
      clips: props.clips.map((c) => ({
        id: c.id,
        assetId: c.id,
        in: c.startOffset || 0,
        out: (c.startOffset || 0) + c.duration,
        speed: 1,
        volume: props.muted ? 0 : props.volume,
        rotation: 0,
        brightness: 0,
        saturation: 1,
      })),
      sounds: props.audio.map((a) => ({
        id: a.id,
        assetId: a.id,
        start: a.start,
        in: a.trimStart,
        out: a.trimEnd,
        volume: a.volume,
        fadeIn: a.fadeIn,
        fadeOut: a.fadeOut,
        muted: a.muted,
      })),
      titles: props.titles.map((t) => ({
        id: t.id,
        text: t.text,
        start: t.start ?? 0,
        end: t.end ?? total,
        color: t.color,
        size: t.fontSize,
      })),
    }),
    [props.clips, props.audio, props.titles, props.muted, props.volume, total],
  );
  function change(next: CutProject) {
    const clips = next.clips.map((c) => ({
      ...props.clips.find((old) => old.id === c.assetId)!,
      id: c.id,
      startOffset: c.in,
      duration: c.out - c.in,
    }));
    const audio = next.sounds.map((s) => ({
      ...props.audio.find((a) => a.id === s.assetId)!,
      id: s.id,
      start: s.start,
      trimStart: s.in,
      trimEnd: s.out,
      volume: s.volume,
      fadeIn: s.fadeIn,
      fadeOut: s.fadeOut,
      muted: s.muted,
    }));
    const titles = next.titles.map((t) => ({
      ...props.titles.find((old) => old.id === t.id)!,
      start: t.start,
      end: t.end,
    }));
    props.change(
      clips,
      audio,
      titles,
      next.clips.length > 0 && next.clips.every((c) => c.volume === 0),
    );
  }
  return (
    <div
      className="cut-root studio-precision"
      style={{ minHeight: 0, width: "100%" }}
    >
      <CutTimeline
        project={project}
        assets={assets}
        time={props.time}
        playing={props.playing}
        selected={props.selected}
        seek={props.seek}
        pause={props.pause}
        select={props.select}
        change={change}
        preview={(clip, source) =>
          props.preview(
            clip
              ? props.clips.find((c) => c.id === clip.assetId) || null
              : null,
            source,
          )
        }
      />
    </div>
  );
}
