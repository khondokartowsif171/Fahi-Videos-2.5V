export interface AudioLayer {
  id: string;
  name: string;
  url: string;
  duration: number;
  start: number;
  trimStart: number;
  trimEnd: number;
  volume: number;
  fadeIn: number;
  fadeOut: number;
  muted: boolean;
  peaks: number[];
}
export function audioLength(layer: AudioLayer) {
  return Math.max(0, layer.trimEnd - layer.trimStart);
}
export function audioState(layer: AudioLayer, time: number) {
  const position = time - layer.start,
    length = audioLength(layer);
  const active = position >= 0 && position < length;
  const fade = Math.min(
    1,
    layer.fadeIn > 0 ? Math.max(0, position / layer.fadeIn) : 1,
    layer.fadeOut > 0 ? Math.max(0, (length - position) / layer.fadeOut) : 1,
  );
  return {
    active,
    source: layer.trimStart + Math.max(0, Math.min(length, position)),
    gain: active && !layer.muted ? layer.volume * fade : 0,
  };
}
export function splitAudio(layer: AudioLayer, time: number): AudioLayer[] {
  const position = time - layer.start;
  if (position <= 0.01 || position >= audioLength(layer) - 0.01) return [layer];
  return [
    { ...layer, trimEnd: layer.trimStart + position, fadeOut: 0 },
    {
      ...layer,
      id: crypto.randomUUID(),
      start: time,
      trimStart: layer.trimStart + position,
      fadeIn: 0,
    },
  ];
}
export async function decodeAudio(
  blob: Blob,
  name: string,
  start: number,
): Promise<AudioLayer> {
  const context = new AudioContext();
  try {
    const buffer = await context.decodeAudioData(await blob.arrayBuffer());
    const samples = buffer.getChannelData(0),
      peaks = Array.from({ length: 160 }, (_, i) => {
        let peak = 0;
        const from = Math.floor((i * samples.length) / 160),
          to = Math.floor(((i + 1) * samples.length) / 160);
        for (let j = from; j < to; j++)
          peak = Math.max(peak, Math.abs(samples[j]));
        return peak;
      });
    return {
      id: crypto.randomUUID(),
      name,
      url: URL.createObjectURL(blob),
      duration: buffer.duration,
      start,
      trimStart: 0,
      trimEnd: buffer.duration,
      volume: 1,
      fadeIn: 0,
      fadeOut: 0,
      muted: false,
      peaks,
    };
  } finally {
    await context.close();
  }
}
/** One mixer is shared by preview and recorded export, including seek, rate and fades. */
export function createAudioMixer(
  context: AudioContext,
  destination: AudioNode,
  layers: AudioLayer[],
  onError?: (message: string) => void,
) {
  const entries = layers.map((layer) => {
    const media = new Audio();
    media.preload = "auto";
    media.crossOrigin = "anonymous";
    media.src = layer.url;
    const gain = context.createGain();
    gain.gain.value = 0;
    const analyser = context.createAnalyser?.();
    if (analyser) {
      analyser.fftSize = 256;
      context
        .createMediaElementSource(media)
        .connect(gain)
        .connect(analyser)
        .connect(destination);
    } else
      context
        .createMediaElementSource(media)
        .connect(gain)
        .connect(destination);
    media.onerror = () => onError?.(`Could not play ${layer.name}`);
    return { layer, media, gain, analyser, pending: false };
  });
  return {
    update(layers: AudioLayer[]) {
      for (const entry of entries) {
        const layer = layers.find((layer) => layer.id === entry.layer.id);
        if (layer) entry.layer = layer;
      }
    },
    level() {
      let peak = 0;
      for (const { analyser } of entries) {
        if (analyser) {
          const data = new Float32Array(analyser.fftSize);
          analyser.getFloatTimeDomainData(data);
          for (const sample of data) peak = Math.max(peak, Math.abs(sample));
        }
      }
      return Math.min(1, peak);
    },
    sync(time: number, playing: boolean, rate: number) {
      for (const entry of entries) {
        const { media, gain, layer } = entry,
          state = audioState(layer, time);
        gain.gain.value = state.gain;
        media.playbackRate = rate;
        if (
          media.readyState >= 1 &&
          Math.abs(media.currentTime - state.source) > 0.12
        )
          media.currentTime = state.source;
        if (!playing || !state.active) media.pause();
        else if (media.paused && !entry.pending) {
          entry.pending = true;
          void media
            .play()
            .catch(() =>
              onError?.(
                `Audio playback blocked: tap Play again (${layer.name})`,
              ),
            )
            .finally(() => {
              entry.pending = false;
            });
        }
      }
    },
    async ready() {
      await Promise.all(
        entries.map(({ media, layer }) =>
          media.readyState >= 2
            ? Promise.resolve()
            : new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(
                  () =>
                    finish(new Error(`Audio loading timed out: ${layer.name}`)),
                  30000,
                );
                const good = () => finish(),
                  bad = () =>
                    finish(new Error(`Could not decode ${layer.name}`));
                function finish(error?: Error) {
                  clearTimeout(timeout);
                  media.removeEventListener("loadeddata", good);
                  media.removeEventListener("error", bad);
                  error ? reject(error) : resolve();
                }
                media.addEventListener("loadeddata", good);
                media.addEventListener("error", bad);
                media.load();
              }),
        ),
      );
    },
    pause() {
      entries.forEach(({ media }) => media.pause());
    },
    dispose() {
      entries.forEach(({ media, gain }) => {
        media.pause();
        media.removeAttribute("src");
        media.load();
        gain.disconnect();
      });
    },
  };
}
