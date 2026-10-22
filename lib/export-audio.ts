import { AudioLayer, audioLength, audioState } from "./editor-audio";

export interface TimeMap {
  toOutput: (timelineTime: number) => number;
  toTimeline: (outputTime: number) => number;
  outputDuration: number;
}

/**
 * Builds a sample-accurate time-mapping between timeline seconds and output recording seconds.
 * Takes speed curves or constant playback speed into account via numerical integration at 10ms intervals.
 */
export function buildTimeMap(
  start: number,
  end: number,
  rateAt?: (time: number) => number,
  defaultSpeed: number = 1,
): TimeMap {
  const duration = Math.max(0, end - start);
  if (duration <= 0.0001) {
    return {
      toOutput: () => 0,
      toTimeline: () => start,
      outputDuration: 0,
    };
  }

  const dt = 0.01; // 10ms steps
  const steps = Math.ceil(duration / dt);
  const timelineTimes = new Float64Array(steps + 1);
  const outputTimes = new Float64Array(steps + 1);

  timelineTimes[0] = start;
  outputTimes[0] = 0;

  for (let i = 0; i < steps; i++) {
    const t = start + i * dt;
    const currentRate = Math.max(0.05, rateAt ? rateAt(t) : defaultSpeed);
    const stepDt = i === steps - 1 ? (start + duration) - t : dt;
    timelineTimes[i + 1] = t + stepDt;
    outputTimes[i + 1] = outputTimes[i] + stepDt / currentRate;
  }

  const totalOutput = outputTimes[steps];

  function toOutput(timelineTime: number): number {
    if (timelineTime <= start) return 0;
    if (timelineTime >= end) return totalOutput;
    const fraction = (timelineTime - start) / dt;
    const idx = Math.min(steps - 1, Math.max(0, Math.floor(fraction)));
    const rem = fraction - idx;
    return outputTimes[idx] + rem * (outputTimes[idx + 1] - outputTimes[idx]);
  }

  function toTimeline(outputTime: number): number {
    if (outputTime <= 0) return start;
    if (outputTime >= totalOutput) return end;
    // Binary search outputTimes
    let low = 0;
    let high = steps;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (outputTimes[mid] < outputTime) low = mid + 1;
      else high = mid;
    }
    const idx = Math.max(0, low - 1);
    const dOut = outputTimes[idx + 1] - outputTimes[idx];
    const frac = dOut > 0 ? (outputTime - outputTimes[idx]) / dOut : 0;
    return timelineTimes[idx] + frac * (timelineTimes[idx + 1] - timelineTimes[idx]);
  }

  return {
    toOutput,
    toTimeline,
    outputDuration: totalOutput,
  };
}

// In-memory cache for decoded audio buffers to prevent re-fetching/re-decoding identical media URLs
const decodedBufferCache = new Map<string, Promise<AudioBuffer | null>>();

export async function fetchAndDecodeAudio(
  url: string,
  context: BaseAudioContext,
): Promise<AudioBuffer | null> {
  if (!url) return null;
  const cached = decodedBufferCache.get(url);
  if (cached) return cached;

  const promise = (async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const arrayBuffer = await res.arrayBuffer();
      // decodeAudioData consumes arrayBuffer
      return await context.decodeAudioData(arrayBuffer);
    } catch {
      return null;
    }
  })();

  decodedBufferCache.set(url, promise);
  return promise;
}

/** Clear decoded audio cache when memory needs to be freed */
export function clearAudioBufferCache() {
  decodedBufferCache.clear();
}

/** Reverse audio buffer channels for reversed video clips */
function reverseAudioBuffer(
  buffer: AudioBuffer,
  context: BaseAudioContext,
): AudioBuffer {
  const reversed = context.createBuffer(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate,
  );
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const src = buffer.getChannelData(ch);
    const dest = reversed.getChannelData(ch);
    for (let i = 0, j = buffer.length - 1; i < buffer.length; i++, j--) {
      dest[i] = src[j];
    }
  }
  return reversed;
}

export interface RenderExportMixOptions {
  clips: {
    objectUrl: string;
    duration: number;
    startOffset?: number;
    reversed?: boolean;
    isFreezeFrame?: boolean;
    freezeFrameUrl?: string;
  }[];
  audioLayers?: AudioLayer[];
  audioUrl?: string;
  volume: number;
  speed: number;
  start: number;
  end: number;
  rateAt?: (time: number) => number;
  gainAt?: (time: number) => number;
  audioRateAt?: (time: number) => number;
  progress?: (percent: number) => void;
}

export interface RenderExportMixResult {
  audioBuffer: AudioBuffer;
  timeMap: TimeMap;
}

/**
 * Pre-renders the full multi-track timeline audio into a single sample-accurate AudioBuffer
 * using an OfflineAudioContext. This eliminates all runtime audio seeking, drifting,
 * and loop repetitions during export recording.
 */
export async function renderExportMix(
  options: RenderExportMixOptions,
): Promise<RenderExportMixResult> {
  const timeMap = buildTimeMap(
    options.start,
    options.end,
    options.rateAt,
    options.speed,
  );

  const sampleRate = 48000;
  const totalLength = Math.max(1, Math.ceil(timeMap.outputDuration * sampleRate));

  const OfflineContextClass =
    window.OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext })
      .webkitOfflineAudioContext;

  if (!OfflineContextClass) {
    throw new Error("OfflineAudioContext is not supported in this browser.");
  }

  const offlineCtx = new OfflineContextClass(2, totalLength, sampleRate);

  // Master Gain for timeline master volume and fade curves
  const masterGain = offlineCtx.createGain();
  masterGain.connect(offlineCtx.destination);

  // Automate master gain
  const masterStep = 0.02; // 20ms steps
  const totalSteps = Math.ceil(timeMap.outputDuration / masterStep);
  for (let i = 0; i <= totalSteps; i++) {
    const outT = Math.min(timeMap.outputDuration, i * masterStep);
    const tlT = timeMap.toTimeline(outT);
    const gainFactor = options.gainAt ? options.gainAt(tlT) : 1;
    const vol = Math.max(0, options.volume * gainFactor);
    masterGain.gain.setValueAtTime(vol, outT);
  }

  options.progress?.(2);

  // 1. Process Video Clip Audio Tracks
  let clipOffset = 0;
  for (const clip of options.clips) {
    const clipStart = clipOffset;
    const clipEnd = clipOffset + clip.duration;
    clipOffset += clip.duration;

    if (clip.isFreezeFrame) {
      // Freeze frame clips produce no audio
      continue;
    }

    // Determine overlap with timeline export range
    const overlapStart = Math.max(options.start, clipStart);
    const overlapEnd = Math.min(options.end, clipEnd);
    if (overlapEnd <= overlapStart) continue;

    const clipBuffer = await fetchAndDecodeAudio(clip.objectUrl, offlineCtx);
    if (!clipBuffer || clipBuffer.length === 0) continue;

    const effectiveBuffer = clip.reversed
      ? reverseAudioBuffer(clipBuffer, offlineCtx)
      : clipBuffer;

    const outStart = timeMap.toOutput(overlapStart);
    const outEnd = timeMap.toOutput(overlapEnd);
    const outDur = Math.max(0, outEnd - outStart);
    if (outDur <= 0.0001) continue;

    const localStart = overlapStart - clipStart;
    const sourceOffset = clip.reversed
      ? Math.max(0, (clip.startOffset || 0) + (clip.duration - (overlapEnd - clipStart)))
      : Math.max(0, (clip.startOffset || 0) + localStart);

    if (sourceOffset >= effectiveBuffer.duration) continue;
    const availableSource = Math.min(
      effectiveBuffer.duration - sourceOffset,
      overlapEnd - overlapStart,
    );

    const clipSource = offlineCtx.createBufferSource();
    clipSource.buffer = effectiveBuffer;
    clipSource.connect(masterGain);
    clipSource.start(outStart, sourceOffset, availableSource);
  }

  options.progress?.(5);

  // 2. Process User Audio Layers (Voiceovers, split audio clips, sound effects)
  if (options.audioLayers && options.audioLayers.length > 0) {
    for (const layer of options.audioLayers) {
      if (layer.muted || layer.volume <= 0) continue;
      const len = audioLength(layer);
      if (len <= 0.001) continue;

      const layerStart = layer.start;
      const layerEnd = layer.start + len;

      const overlapStart = Math.max(options.start, layerStart);
      const overlapEnd = Math.min(options.end, layerEnd);
      if (overlapEnd <= overlapStart) continue;

      const layerBuffer = await fetchAndDecodeAudio(layer.url, offlineCtx);
      if (!layerBuffer || layerBuffer.length === 0) continue;

      const outStart = timeMap.toOutput(overlapStart);
      const outEnd = timeMap.toOutput(overlapEnd);
      const outDur = Math.max(0, outEnd - outStart);
      if (outDur <= 0.0001) continue;

      const localOffset = overlapStart - layerStart;
      const sourceOffset = Math.max(0, layer.trimStart + localOffset);
      if (sourceOffset >= layerBuffer.duration) continue;

      const sourceDur = Math.min(
        layerBuffer.duration - sourceOffset,
        overlapEnd - overlapStart,
      );

      const layerGain = offlineCtx.createGain();
      layerGain.connect(masterGain);

      // Automate layer fade-in and fade-out
      const layerStep = 0.02;
      const steps = Math.ceil(outDur / layerStep);
      for (let s = 0; s <= steps; s++) {
        const curOutT = Math.min(outEnd, outStart + s * layerStep);
        const curTlT = timeMap.toTimeline(curOutT);
        const state = audioState(layer, curTlT);
        layerGain.gain.setValueAtTime(state.gain, curOutT);
      }

      const layerSource = offlineCtx.createBufferSource();
      layerSource.buffer = layerBuffer;
      layerSource.connect(layerGain);
      layerSource.start(outStart, sourceOffset, sourceDur);
    }
  }

  // 3. Process Legacy Single Background Audio URL if provided
  if (options.audioUrl) {
    const bgBuffer = await fetchAndDecodeAudio(options.audioUrl, offlineCtx);
    if (bgBuffer && bgBuffer.length > 0) {
      const bgSource = offlineCtx.createBufferSource();
      bgSource.buffer = bgBuffer;
      bgSource.loop = true;
      bgSource.connect(masterGain);
      bgSource.start(0, options.start, timeMap.outputDuration);
    }
  }

  options.progress?.(8);

  const rendered = await offlineCtx.startRendering();
  options.progress?.(10);

  return {
    audioBuffer: rendered,
    timeMap,
  };
}
