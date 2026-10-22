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
  draw: (video: HTMLVideoElement | (HTMLCanvasElement & {videoWidth:number;videoHeight:number}), time: number) => void;
  progress: (percent: number) => void;
  signal?: AbortSignal;
}): Promise<Blob> {
  const run=async()=> (await import('./timestamp-export')).renderTimestamped(options);
  if(typeof navigator!=='undefined'&&navigator.locks)return navigator.locks.request('fahi-studio-video-export',{ifAvailable:true},lock=>{if(!lock)throw new Error('Another tab is exporting. Finish or cancel that export first. Your project is preserved.');return run();});
  return run();
}
