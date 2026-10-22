import type { AudioLayer } from './editor-audio';
export async function recordTimeline(options: {
  clips: {
    objectUrl: string;
    duration: number;
    startOffset?: number;
    reversed?: boolean;
    isFreezeFrame?: boolean;
    freezeFrameUrl?: string;
  }[];
  canvas: HTMLCanvasElement;
  format: string;
  quality: string;
  speed: number;
  volume: number;
  rateAt?: (time: number) => number;
  gainAt?: (time: number) => number;
  audioUrl?: string;
  audioLayers?: AudioLayer[];
  audioTimeAt?: (time: number) => number;
  audioRateAt?: (time: number) => number;
  start: number;
  end: number;
  draw: (video: HTMLVideoElement, time: number) => void;
  progress: (percent: number) => void;
  signal?: AbortSignal;
}): Promise<Blob> {
  return (await import('./timestamp-export')).renderTimestamped(options);
}
