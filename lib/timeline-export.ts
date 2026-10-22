import { AudioLayer, createAudioMixer } from "./editor-audio";

/** Record each trimmed source in timeline order. Supports normal, freeze-frame, and reversed clips. */
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
  if (!window.MediaRecorder || !options.canvas.captureStream)
    throw new Error(
      "This browser does not support video export. Use a recent Safari or Chrome browser.",
    );
  const video = document.createElement("video");
  video.playsInline = true;
  video.preload = "auto";

  // Mount video and canvas in an active, in-viewport, non-occluded DOM host so Chromium
  // never triggers its 10-second background/hidden video track decoder suspension.
  const exportHost = document.createElement("div");
  exportHost.setAttribute("data-fahivids-export-host", "true");
  exportHost.style.cssText =
    "position:fixed;right:12px;bottom:12px;width:160px;height:90px;opacity:0.08;pointer-events:none;z-index:99999;overflow:hidden;border-radius:6px;";
  video.style.cssText =
    "width:160px;height:90px;display:block;object-fit:contain;";
  exportHost.appendChild(video);
  if (!options.canvas.isConnected) {
    options.canvas.style.cssText =
      "position:absolute;left:0;top:0;width:160px;height:90px;display:block;pointer-events:none;";
    exportHost.appendChild(options.canvas);
  }
  document.body.appendChild(exportHost);

  const audioContext = new AudioContext();
  const output = audioContext.createMediaStreamDestination();
  const gain = audioContext.createGain();
  gain.gain.value = options.volume;
  audioContext.createMediaElementSource(video).connect(gain).connect(output);
  const music = options.audioUrl ? new Audio() : undefined;
  if (music) {
    if (
      !options.audioUrl!.startsWith("blob:") &&
      !options.audioUrl!.startsWith("data:")
    ) {
      music.crossOrigin = "anonymous";
    }
    music.src = options.audioUrl!;
    audioContext.createMediaElementSource(music).connect(output);
  }
  let audioFailure: string | undefined;
  const mixer = createAudioMixer(
    audioContext,
    output,
    options.audioLayers || [],
    (message) => {
      audioFailure = message;
    },
  );
  const canvasStream = options.canvas.captureStream(30);
  const canvasVideoTrack = canvasStream.getVideoTracks()[0] as
    | (MediaStreamTrack & { requestFrame?: () => void })
    | undefined;
  const stream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...output.stream.getAudioTracks(),
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
    if (event.data.size) chunks.push(event.data);
  };
  let failed: unknown;
  recorder.onerror = (event) => {
    failed =
      (event as Event & { error?: Error }).error ||
      new Error("Video recording failed");
  };
  const completed = new Promise<Blob>((resolve) => {
    recorder.onstop = () =>
      resolve(new Blob(chunks, { type: recorder.mimeType }));
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
  const end = Math.min(
    options.end,
    options.clips.reduce((sum, clip) => sum + clip.duration, 0),
  );
  try {
    await audioContext.resume();
    await mixer.ready();
    if (music) {
      await waitFor(music, "loadeddata", () => music.load());
    }
    let offset = 0;
    let loadedUrl = "";
    for (const clip of options.clips) {
      const localStart = Math.max(0, options.start - offset);
      const localEnd = Math.min(clip.duration, end - offset);
      if (localEnd <= localStart) {
        offset += clip.duration;
        continue;
      }
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

      const sourceStart = clip.reversed
        ? (clip.startOffset || 0) + (clip.duration - localStart)
        : (clip.startOffset || 0) + (clip.isFreezeFrame ? 0 : localStart);

      if (Math.abs(video.currentTime - sourceStart) > 0.04) {
        video.pause();
        await waitFor(video, "seeked", () => {
          video.currentTime = sourceStart;
        });
      }

      if (!clip.isFreezeFrame && !clip.reversed && video.readyState < 3) {
        await Promise.race([
          waitFor(video, "canplay", () => {}),
          new Promise<void>((r) => setTimeout(r, 400)),
        ]);
      }

      video.playbackRate =
        options.rateAt?.(offset + localStart) || options.speed;
      gain.gain.value =
        clip.isFreezeFrame
          ? 0
          : options.volume * (options.gainAt?.(offset + localStart) ?? 1);
      options.draw(video, offset + localStart);
      canvasVideoTrack?.requestFrame?.();
      mixer.sync(
        options.audioTimeAt?.(offset + localStart) ?? offset + localStart,
        true,
        options.audioRateAt?.(offset + localStart) ?? video.playbackRate,
      );

      if (!clip.isFreezeFrame && !clip.reversed) {
        if (video.paused) {
          await video.play();
        }
      } else {
        video.pause();
      }
      if (music && music.paused) {
        await music.play();
      }
      if (recorder.state === "inactive") recorder.start(250);
      else if (recorder.state === "paused") recorder.resume();

      await new Promise<void>((resolve, reject) => {
        let finished = false;
        const watchdog = setTimeout(
          () => done(new Error("Playback stalled during export")),
          ((localEnd - localStart) /
            (options.rateAt ? 0.25 : options.speed) +
            30) *
            1000,
        );
        let frame = 0;
        const wallStart = performance.now();
        let lastTotalFrames =
          video.getVideoPlaybackQuality?.().totalVideoFrames ?? 0;
        let lastFrameAdvanceAt = wallStart;
        let lastRenderAt = 0;

        const done = (error?: Error) => {
          if (finished) return;
          finished = true;
          clearTimeout(watchdog);
          clearInterval(interval);
          cancelAnimationFrame(frame);
          video.removeEventListener("error", decodeError);
          if (error) {
            video.pause();
            music?.pause();
            mixer.pause();
            reject(error);
          } else {
            resolve();
          }
        };
        const decodeError = () =>
          done(new Error("Video decoding failed during export"));
        video.addEventListener("error", decodeError, { once: true });

        const render = () => {
          if (finished) return;
          if (audioFailure) {
            done(new Error(audioFailure));
            return;
          }
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

          const now = performance.now();
          if (now - lastRenderAt < 12) {
            frame = requestAnimationFrame(render);
            return;
          }
          lastRenderAt = now;

          let localTime: number;
          if (clip.isFreezeFrame || clip.reversed) {
            const elapsedSec =
              ((now - wallStart) / 1000) *
              (options.rateAt?.(offset + localStart) || options.speed);
            localTime = localStart + elapsedSec;
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
            const currentDecoded =
              video.getVideoPlaybackQuality?.().totalVideoFrames ?? 0;
            if (currentDecoded > lastTotalFrames) {
              lastTotalFrames = currentDecoded;
              lastFrameAdvanceAt = now;
            } else if (now - lastFrameAdvanceAt > 200) {
              lastFrameAdvanceAt = now;
              const rate =
                options.rateAt?.(offset + localStart) || options.speed;
              const expectedMediaTime = Math.min(
                (clip.startOffset || 0) + localEnd,
                (clip.startOffset || 0) +
                  localStart +
                  ((now - wallStart) / 1000) * rate,
              );
              if (!video.seeking) {
                video.currentTime =
                  Math.abs(video.currentTime - expectedMediaTime) > 0.12
                    ? expectedMediaTime
                    : video.currentTime + 0.001;
              }
              if (video.paused && !video.ended) {
                void video.play().catch(() => {});
              }
            }
            localTime = Math.max(
              localStart,
              video.currentTime - (clip.startOffset || 0),
            );
          }

          video.playbackRate =
            options.rateAt?.(offset + localTime) || options.speed;
          gain.gain.value =
            clip.isFreezeFrame
              ? 0
              : options.volume * (options.gainAt?.(offset + localTime) ?? 1);
          mixer.sync(
            options.audioTimeAt?.(offset + localTime) ?? offset + localTime,
            true,
            options.audioRateAt?.(offset + localTime) ?? video.playbackRate,
          );
          options.draw(video, offset + localTime);
          canvasVideoTrack?.requestFrame?.();
          options.progress(
            Math.min(
              99,
              (100 * (offset + localTime - options.start)) /
                Math.max(0.01, end - options.start),
            ),
          );
          if (
            localTime >= localEnd - 0.015 ||
            (!clip.isFreezeFrame && !clip.reversed && video.ended)
          ) {
            done();
            return;
          }
          frame = requestAnimationFrame(render);
        };
        const interval = window.setInterval(render, 33);
        render();
      });
      offset += clip.duration;
    }
    video.pause();
    music?.pause();
    mixer.pause();
    if (recorder.state === "inactive")
      throw new Error("No video in the selected export range");
    recorder.stop();
    const blob = await completed;
    if (failed) throw failed;
    if (!blob.size) throw new Error("The browser produced an empty video");
    options.progress(100);
    return blob;
  } finally {
    if (recorder.state !== "inactive") recorder.stop();
    mixer.dispose();
    video.pause();
    music?.pause();
    video.removeAttribute("src");
    video.load();
    exportHost.remove();
    stream.getTracks().forEach((track) => track.stop());
    await audioContext.close();
  }
}
