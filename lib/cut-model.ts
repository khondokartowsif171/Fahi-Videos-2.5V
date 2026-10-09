export type CutAsset = {
  id: string;
  name: string;
  kind: "video" | "audio";
  duration: number;
  width: number;
  height: number;
  hasAudio: boolean;
  url: string;
  peaks: number[];
  thumbnail?: string;
};
export type CutClip = {
  id: string;
  assetId: string;
  in: number;
  out: number;
  speed: number;
  volume: number;
  rotation: number;
  brightness: number;
  saturation: number;
};
export type CutSound = {
  id: string;
  assetId: string;
  start: number;
  in: number;
  out: number;
  volume: number;
  fadeIn: number;
  fadeOut: number;
  muted: boolean;
};
export type CutTitle = {
  id: string;
  text: string;
  start: number;
  end: number;
  color: string;
  size: number;
};
export type CutProject = {
  id: string;
  name: string;
  version: number;
  updatedAt: number;
  ratio: "9:16" | "16:9" | "1:1";
  clips: CutClip[];
  sounds: CutSound[];
  titles: CutTitle[];
};
export type CutJob = {
  id: string;
  projectId: string;
  status: "queued" | "rendering" | "done" | "failed";
  progress: number;
  error?: string;
  url?: string;
  createdAt: number;
};
export function clipDuration(clip: CutClip) {
  return (clip.out - clip.in) / clip.speed;
}
export function projectDuration(project: CutProject) {
  return project.clips.reduce((s, c) => s + clipDuration(c), 0);
}
export function locateClip(project: CutProject, time: number) {
  let start = 0;
  for (let i = 0; i < project.clips.length; i++) {
    const clip = project.clips[i],
      end = start + clipDuration(clip);
    if (time < end || i === project.clips.length - 1)
      return {
        clip,
        index: i,
        start,
        end,
        source:
          clip.in +
          Math.max(0, Math.min(end - start, time - start)) * clip.speed,
      };
    start = end;
  }
  return null;
}
export function splitClip(clip: CutClip, source: number): CutClip[] {
  if (source <= clip.in + 0.01 || source >= clip.out - 0.01) return [clip];
  return [
    { ...clip, out: source },
    { ...clip, id: crypto.randomUUID(), in: source },
  ];
}
