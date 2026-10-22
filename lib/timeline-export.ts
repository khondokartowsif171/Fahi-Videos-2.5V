import { AudioLayer } from "./editor-audio";
import { renderExportMix, clearAudioBufferCache } from "./export-audio";

/**
 * Record each trimmed source in timeline order with sample-accurate audio and smooth video playback.
 * 
 * Architecture:
 * 1. Audio is pre-rendered offline via an OfflineAudioContext into a continuous 48 kHz stereo AudioBuffer.
 * 2. An AudioBufferSourceNode delivers crystal-clear audio with zero runtime drifting, seeking, or loops.
 * 3. Clips are played sequentially. During scene/clip transitions, the recorder and audio context are cleanly
 *    paused/suspended while the next scene is seeked and pre-buffered, completely eliminating frozen frames.
 * 4. During continuous video playback, drift against the master audio clock is managed via smooth proportional
 *    playbackRate adjustments (1.08x / 0.92x), eliminating mid-playback hardware decoder stalls and stutter.
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

  try {
    let offset = 0;
    let loadedUrl = "";
    let masterAudioStarted = false;
    let maxTimelineTime = options.start;

    for (const clip of options.clips) {
      const localStart = Math.max(0, options.start - offset);
      const localEnd = Math.min(clip.duration, end - offset);
      if (localEnd <= localStart) {
        offset += clip.duration;
        continue;
      }

      // 1. Pause active recording and suspend audio master clock during scene transition
      if (recorder.state === "recording") {
        recorder.pause();
      }
      if (audioContext.state === "running") {
        await audioContext.suspend();
      }

      // 2. Load clip URL if changed
      if (loadedUrl !== clip.objectUrl || video.readyState < 2) {
        if (
          clip.objectUrl.startsWith("blob:") ||
          clip.objectUrl.startsWith("data:")
        ) {
          video.removeAttribute("crossorigin");
        } else {
          video.crossOrigin = "anonymous";
        }
        await waitFor(video, "loadeddata", () => {
          video.src = clip.objectUrl;
          video.load();
        });
        loadedUrl = clip.objectUrl;
      }

      // 3. Seek to clip's exact starting source position
      const sourceStart = clip.reversed
        ? (clip.startOffset || 0) + (clip.duration - localStart)
        : (clip.startOffset || 0) + (clip.isFreezeFrame ? 0 : localStart);

      const seekThreshold = clip.isFreezeFrame || clip.reversed ? 0.04 : 0.08;
      if (Math.abs(video.currentTime - sourceStart) > seekThreshold) {
        video.pause();
        await waitFor(video, "seeked", () => {
          video.currentTime = sourceStart;
        });
      }

      // 4. Ensure clip has decoded the frame and can play
      if (!clip.isFreezeFrame && !clip.reversed && video.readyState < 3) {
        await Promise.race([
          waitFor(video, "canplay", () => {}),
          new Promise<void>((r) => setTimeout(r, 400)),
        ]);
      }

      const initialTimelineTime = Math.max(
        maxTimelineTime,
        offset + localStart,
      );
      maxTimelineTime = initialTimelineTime;
      const initialRate =
        options.rateAt?.(initialTimelineTime) || options.speed;
      if (Math.abs(video.playbackRate - initialRate) > 0.01) {
        video.playbackRate = initialRate;
      }

      // 5. Draw the first frame of this clip to canvas
      options.draw(video, initialTimelineTime);
      canvasVideoTrack?.requestFrame?.();

      // 6. Resume audio master clock and start/resume MediaRecorder
      await audioContext.resume();
      if (!masterAudioStarted) {
        masterSource.start(0);
        masterAudioStarted = true;
      }

      if (recorder.state === "inactive") {
        recorder.start(250);
      } else if (recorder.state === "paused") {
        recorder.resume();
      }

      // 7. Start video playback
      if (!clip.isFreezeFrame && !clip.reversed) {
        if (video.paused) {
          await video.play().catch(() => {});
        }
      } else {
        video.pause();
      }

      // 8. Render loop for this clip with smooth proportional rate synchronization
      await new Promise<void>((resolve, reject) => {
        let finished = false;
        let frameId = 0;
        let lastRenderAtAudio = -1;

        const watchdog = setTimeout(
          () => done(new Error("Playback stalled during export")),
          ((localEnd - localStart) /
            (options.rateAt ? 0.25 : options.speed) +
            30) *
            1000,
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
            reject(error);
          } else {
            resolve();
          }
        };

        const render = () => {
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

          const elapsedAudioSec = audioContext.currentTime;
          if (
            lastRenderAtAudio >= 0 &&
            elapsedAudioSec - lastRenderAtAudio < 0.015
          ) {
            frameId = requestAnimationFrame(render);
            return;
          }
          lastRenderAtAudio = elapsedAudioSec;

          let localTime: number;
          const currentTimelineTime = Math.min(
            end,
            Math.max(options.start, timeMap.toTimeline(elapsedAudioSec)),
          );

          if (clip.isFreezeFrame || clip.reversed) {
            localTime = Math.max(0, currentTimelineTime - offset);
            if (clip.reversed) {
              const targetMediaTime = Math.max(
                clip.startOffset || 0,
                (clip.startOffset || 0) + clip.duration - localTime,
              );
              if (Math.abs(video.currentTime - targetMediaTime) > 0.04) {
                video.currentTime = targetMediaTime;
              }
            }
          } else {
            const expectedLocalTime = Math.max(0, currentTimelineTime - offset);
            const expectedSourceTime =
              (clip.startOffset || 0) + expectedLocalTime;

            // Proportional playback rate adjustment: smooth sync without hardware decoder stalling
            const baseRate =
              options.rateAt?.(currentTimelineTime) || options.speed;
            const drift = video.currentTime - expectedSourceTime;

            if (drift < -0.06) {
              // Video is slightly lagging behind audio clock -> nudge rate up smoothly (zero seek)
              video.playbackRate = Math.min(baseRate * 1.12, 3);
            } else if (drift > 0.06) {
              // Video is slightly ahead of audio clock -> nudge rate down smoothly (zero seek)
              video.playbackRate = Math.max(baseRate * 0.88, 0.25);
            } else {
              if (Math.abs(video.playbackRate - baseRate) > 0.01) {
                video.playbackRate = baseRate;
              }
            }

            if (video.paused && !video.ended && !video.seeking) {
              void video.play().catch(() => {});
            }

            localTime = Math.max(
              localStart,
              video.currentTime - (clip.startOffset || 0),
            );
          }

          const timelineTime = Math.max(maxTimelineTime, offset + localTime);
          maxTimelineTime = timelineTime;

          options.draw(video, timelineTime);
          canvasVideoTrack?.requestFrame?.();

          options.progress(
            Math.min(
              99,
              10 + 89 * (elapsedAudioSec / Math.max(0.01, outputDuration)),
            ),
          );

          if (
            localTime >= localEnd - 0.02 ||
            (!clip.isFreezeFrame && !clip.reversed && video.ended) ||
            elapsedAudioSec >= outputDuration
          ) {
            done();
            return;
          }

          frameId = requestAnimationFrame(render);
        };

        const intervalId = window.setInterval(render, 33);
        render();
      });

      offset += clip.duration;
    }

    video.pause();
    try {
      masterSource.stop();
    } catch {}

    if (recorder.state === "recording" || recorder.state === "paused") {
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
