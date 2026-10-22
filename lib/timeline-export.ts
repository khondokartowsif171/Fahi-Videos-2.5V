import { AudioLayer } from "./editor-audio";
import { renderExportMix, clearAudioBufferCache } from "./export-audio";

/**
 * Record each trimmed source in timeline order with sample-accurate audio.
 * The audio track is pre-rendered via an OfflineAudioContext into a master AudioBuffer,
 * which serves as the master clock for video playback and canvas recording.
 * This completely eliminates runtime audio desync, repeats, stuttering, and drift.
 */
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
}): Promise<Blob> {
  if (!window.MediaRecorder || !options.canvas.captureStream) {
    throw new Error(
      "This browser does not support video export. Use a recent Safari or Chrome browser.",
    );
  }

  const totalClipsDuration = options.clips.reduce(
    (sum, clip) => sum + clip.duration,
    0,
  );
  const end = Math.min(options.end, totalClipsDuration);
  if (end <= options.start) {
    throw new Error("No video in the selected export range");
  }

  // Mount video and canvas in an active, in-viewport DOM host so Chromium
  // never triggers its background/hidden video track decoder suspension.
  const video = document.createElement("video");
  video.playsInline = true;
  video.preload = "auto";
  video.muted = true; // Audio is routed directly from the master AudioBufferSourceNode

  const exportHost = document.createElement("div");
  exportHost.setAttribute("data-fahivids-export-host", "true");
  exportHost.style.cssText =
    "position:fixed;right:12px;bottom:12px;width:160px;height:90px;opacity:0.08;pointer-events:none;z-index:99999;overflow:hidden;border-radius:6px;";
  video.style.cssText =
    "width:160px;height:90px;display:block;object-fit:contain;";
  exportHost.appendChild(video);
  if (!options.canvas.isConnected) {
    if (options.canvas.style) {
      options.canvas.style.cssText =
        "position:absolute;left:0;top:0;width:160px;height:90px;display:block;pointer-events:none;";
    }
    exportHost.appendChild(options.canvas);
  }
  document.body.appendChild(exportHost);

  // Phase 1: Pre-render full multi-track audio offline (0% - 10% progress)
  const { audioBuffer: masterAudioBuffer, timeMap } = await renderExportMix({
    clips: options.clips,
    audioLayers: options.audioLayers,
    audioUrl: options.audioUrl,
    volume: options.volume,
    speed: options.speed,
    start: options.start,
    end,
    rateAt: options.rateAt,
    gainAt: options.gainAt,
    audioRateAt: options.audioRateAt,
    progress: (p) => options.progress(Math.min(10, p)),
  });

  const outputDuration = timeMap.outputDuration;
  if (outputDuration <= 0.001) {
    exportHost.remove();
    throw new Error("No video in the selected export range");
  }

  // Phase 2: Setup Master Audio Clock & MediaRecorder
  const audioContext = new AudioContext();
  const outputDestination = audioContext.createMediaStreamDestination();
  const masterSource = audioContext.createBufferSource();
  masterSource.buffer = masterAudioBuffer;
  masterSource.connect(outputDestination);

  const canvasStream = options.canvas.captureStream(30);
  const canvasVideoTrack = canvasStream.getVideoTracks()[0] as
    | (MediaStreamTrack & { requestFrame?: () => void })
    | undefined;

  const stream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...outputDestination.stream.getAudioTracks(),
  ]);

  const types =
    options.format === "mp4"
      ? [
          "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
          "video/mp4",
          "video/webm;codecs=vp9,opus",
          "video/webm;codecs=vp8,opus",
          "video/webm",
        ]
      : [
          "video/webm;codecs=vp9,opus",
          "video/webm;codecs=vp8,opus",
          "video/webm",
          "video/mp4",
        ];

  const mimeType = types.find((type) => MediaRecorder.isTypeSupported(type));
  if (!mimeType) {
    stream.getTracks().forEach((t) => t.stop());
    await audioContext.close();
    exportHost.remove();
    throw new Error("No supported recording format in this browser.");
  }

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond:
      options.quality === "low"
        ? 2500000
        : options.quality === "medium"
          ? 5000000
          : 8000000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size) chunks.push(event.data);
  };

  let failed: unknown;
  recorder.onerror = (event) => {
    failed =
      (event as Event & { error?: Error }).error ||
      new Error("Video recording failed");
  };

  const completed = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: recorder.mimeType }));
    };
  });

  const waitFor = (
    element: HTMLMediaElement,
    event: string,
    action: () => void,
  ) =>
    new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => finish(new Error("Media loading timed out")),
        30000,
      );
      const good = () => finish();
      const bad = () =>
        finish(new Error("Could not decode the selected media"));
      const finish = (error?: Error) => {
        clearTimeout(timeout);
        element.removeEventListener(event, good);
        element.removeEventListener("error", bad);
        error ? reject(error) : resolve();
      };
      element.addEventListener(event, good, { once: true });
      element.addEventListener("error", bad, { once: true });
      action();
    });

  // Build clip timeline offset intervals
  let acc = 0;
  const clipEntries = options.clips.map((clip) => {
    const startT = acc;
    const endT = acc + clip.duration;
    acc = endT;
    return { clip, startT, endT };
  });

  try {
    await audioContext.resume();

    // Start video with first clip
    let loadedUrl = "";
    const firstTimelineTime = options.start;
    const firstEntry =
      clipEntries.find(
        (e) => firstTimelineTime >= e.startT && firstTimelineTime < e.endT,
      ) || clipEntries[0];

    if (firstEntry) {
      if (
        firstEntry.clip.objectUrl.startsWith("blob:") ||
        firstEntry.clip.objectUrl.startsWith("data:")
      ) {
        video.removeAttribute("crossorigin");
      } else {
        video.crossOrigin = "anonymous";
      }
      await waitFor(video, "loadeddata", () => {
        video.src = firstEntry.clip.objectUrl;
        video.load();
      });
      loadedUrl = firstEntry.clip.objectUrl;

      const firstLocal = firstTimelineTime - firstEntry.startT;
      const firstSource = firstEntry.clip.reversed
        ? (firstEntry.clip.startOffset || 0) + (firstEntry.clip.duration - firstLocal)
        : (firstEntry.clip.startOffset || 0) + (firstEntry.clip.isFreezeFrame ? 0 : firstLocal);

      if (Math.abs(video.currentTime - firstSource) > 0.05) {
        await waitFor(video, "seeked", () => {
          video.currentTime = firstSource;
        });
      }
      options.draw(video, firstTimelineTime);
      canvasVideoTrack?.requestFrame?.();
    }

    // Start MediaRecorder and start master AudioBufferSourceNode simultaneously
    recorder.start(250);
    const audioMasterStart = audioContext.currentTime;
    masterSource.start(audioMasterStart);

    await new Promise<void>((resolve, reject) => {
      let finished = false;
      let frameId = 0;
      let lastRenderAtAudio = -1;

      const watchdog = setTimeout(
        () => done(new Error("Playback stalled during export")),
        (outputDuration + 30) * 1000,
      );

      const decodeError = () =>
        done(new Error("Video decoding failed during export"));
      video.addEventListener("error", decodeError, { once: true });

      const done = (error?: Error) => {
        if (finished) return;
        finished = true;
        clearTimeout(watchdog);
        clearInterval(intervalId);
        cancelAnimationFrame(frameId);
        video.removeEventListener("error", decodeError);
        if (error) {
          video.pause();
          try {
            masterSource.stop();
          } catch {}
          reject(error);
        } else {
          resolve();
        }
      };

      const render = async () => {
        if (finished) return;
        if (failed) {
          done(
            failed instanceof Error ? failed : new Error("Recording failed"),
          );
          return;
        }
        if (document.hidden) {
          done(
            new Error(
              "Keep this tab open and the screen awake during export.",
            ),
          );
          return;
        }

        const elapsedAudioSec = audioContext.currentTime - audioMasterStart;
        if (elapsedAudioSec >= outputDuration) {
          done();
          return;
        }

        if (lastRenderAtAudio >= 0 && elapsedAudioSec - lastRenderAtAudio < 0.015) {
          frameId = requestAnimationFrame(render);
          return;
        }
        lastRenderAtAudio = elapsedAudioSec;

        const currentTimelineTime = Math.min(
          end,
          Math.max(options.start, timeMap.toTimeline(elapsedAudioSec)),
        );

        // Find active clip corresponding to current timeline time
        const entry =
          clipEntries.find(
            (e) =>
              currentTimelineTime >= e.startT && currentTimelineTime < e.endT,
          ) || clipEntries[clipEntries.length - 1];

        if (entry) {
          const clip = entry.clip;
          const localTime = Math.max(0, currentTimelineTime - entry.startT);
          const targetSourceTime = clip.reversed
            ? (clip.startOffset || 0) + (clip.duration - localTime)
            : (clip.startOffset || 0) + (clip.isFreezeFrame ? 0 : localTime);

          if (loadedUrl !== clip.objectUrl) {
            loadedUrl = clip.objectUrl;
            if (
              clip.objectUrl.startsWith("blob:") ||
              clip.objectUrl.startsWith("data:")
            ) {
              video.removeAttribute("crossorigin");
            } else {
              video.crossOrigin = "anonymous";
            }
            video.src = clip.objectUrl;
            video.load();
          }

          const maxAllowedDrift =
            clip.isFreezeFrame || clip.reversed ? 0.04 : 0.3;
          const drift = Math.abs(video.currentTime - targetSourceTime);
          if (drift > maxAllowedDrift && !video.seeking && video.readyState >= 1) {
            video.currentTime = targetSourceTime;
          }

          const currentRate =
            options.rateAt?.(currentTimelineTime) || options.speed;
          if (!clip.isFreezeFrame && !clip.reversed) {
            if (Math.abs(video.playbackRate - currentRate) > 0.01) {
              video.playbackRate = currentRate;
            }
            if (video.paused && !video.ended && !video.seeking) {
              void video.play().catch(() => {});
            }
          } else {
            if (!video.paused) video.pause();
          }

          options.draw(video, currentTimelineTime);
          canvasVideoTrack?.requestFrame?.();
        }

        options.progress(
          Math.min(
            99,
            10 + 89 * (elapsedAudioSec / Math.max(0.01, outputDuration)),
          ),
        );

        frameId = requestAnimationFrame(render);
      };

      const intervalId = window.setInterval(render, 33);
      render();
    });

    video.pause();
    try {
      masterSource.stop();
    } catch {}

    if (recorder.state === "recording") {
      recorder.stop();
    }
    const blob = await completed;
    if (failed) throw failed;
    if (!blob.size) throw new Error("The browser produced an empty video");
    options.progress(100);
    return blob;
  } finally {
    if (recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {}
    }
    try {
      masterSource.stop();
    } catch {}
    video.pause();
    video.removeAttribute("src");
    video.load();
    exportHost.remove();
    stream.getTracks().forEach((track) => track.stop());
    await audioContext.close();
    clearAudioBufferCache();
  }
}
