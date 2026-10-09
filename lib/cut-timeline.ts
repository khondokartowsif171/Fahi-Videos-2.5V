import { CutClip, CutSound, CutProject, clipDuration } from "./cut-model";
export const OUTPUT_FPS = 30;
export function frameTime(time: number, fps = OUTPUT_FPS) {
  return Math.round(time * fps) / fps;
}
export function timelineClips(project: CutProject) {
  let start = 0;
  return project.clips.map((clip) => {
    const item = { clip, start, end: start + clipDuration(clip) };
    start = item.end;
    return item;
  });
}
export function trimVideo(
  clip: CutClip,
  edge: "in" | "out",
  deltaSeconds: number,
  duration: number,
  fps = OUTPUT_FPS,
) {
  const source = frameTime(clip[edge] + deltaSeconds * clip.speed, fps),
    minimum = 1 / fps;
  return edge === "in"
    ? { ...clip, in: Math.max(0, Math.min(clip.out - minimum, source)) }
    : { ...clip, out: Math.min(duration, Math.max(clip.in + minimum, source)) };
}
export function trimSound(
  sound: CutSound,
  edge: "in" | "out",
  deltaSeconds: number,
  duration: number,
) {
  const source = frameTime(sound[edge] + deltaSeconds),
    minimum = 1 / OUTPUT_FPS;
  if (edge === "in") {
    const next = Math.max(0, Math.min(sound.out - minimum, source));
    return {
      ...sound,
      in: next,
      start: Math.max(0, sound.start + next - sound.in),
      fadeIn: Math.min(sound.fadeIn, sound.out - next),
      fadeOut: Math.min(sound.fadeOut, sound.out - next),
    };
  }
  const next = Math.min(duration, Math.max(sound.in + minimum, source));
  return {
    ...sound,
    out: next,
    fadeIn: Math.min(sound.fadeIn, next - sound.in),
    fadeOut: Math.min(sound.fadeOut, next - sound.in),
  };
}
export function formatClock(time: number) {
  const milliseconds = Math.round(Math.max(0, time) * 1000);
  return (
    String(Math.floor(milliseconds / 60000)).padStart(2, "0") +
    ":" +
    String(Math.floor(milliseconds / 1000) % 60).padStart(2, "0") +
    "." +
    String(milliseconds % 1000).padStart(3, "0")
  );
}
