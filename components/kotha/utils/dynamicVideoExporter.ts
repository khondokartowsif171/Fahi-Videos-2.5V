import { isEmbedded } from '@/lib/studio-client';
import { type SceneItem } from './dubbingLogic';
import {
  type FrameLayoutStyle,
  type ScenePlaybackTiming,
  type VideoContainerPreference,
  type VideoExportQuality,
  computeScenePlaybackTiming,
  mapSceneProgressToVideoTime,
  renderDynamicVideoFrame,
} from './dynamicVideoRenderer';

export interface ExportProgressUpdate {
  phase: 'audio' | 'encoding' | 'recording' | 'finalizing';
  sceneIndex: number;
  totalScenes: number;
  percent: number;
  statusText: string;
}

export interface ExportedDubVideoResult {
  blob: Blob;
  mimeType: string;
  extension: 'mp4' | 'webm';
  width: number;
  height: number;
  durationSec: number;
  engine: 'frame-accurate' | 'live-recorder';
}

export interface ExportDubbedVideoParams {
  scenes: SceneItem[];
  attachedVideoUrl: string | null;
  canvasWidth: number;
  canvasHeight: number;
  projectTitle: string;
  personaDisplay: string;
  speechSpeed: number;
  layoutStyle: FrameLayoutStyle;
  topBadgeText: string;
  offerBannerText: string;
  burnSubtitles: boolean;
  quality: VideoExportQuality;
  containerPreference: VideoContainerPreference;
  originalAudioMix: number;
  isEn: boolean;
  previewCanvas?: HTMLCanvasElement | null;
  signal?: AbortSignal;
  onProgress: (update: ExportProgressUpdate) => void;
  onEnsureSceneVoice: (sceneId: string) => Promise<{
    audioUrl: string;
    rawBytes: Uint8Array;
    wavBytes: Uint8Array;
    mimeType: string;
    durationSec: number;
  } | null>;
}

interface PreparedScene {
  scene: SceneItem;
  decodedBuffer: AudioBuffer | null;
  frameImage: HTMLImageElement | null;
  timing: ScenePlaybackTiming;
  timelineStartSec: number;
}

function loadImageElement(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function loadVideoElement(src: string): Promise<HTMLVideoElement | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    let settled = false;
    const finish = (result: HTMLVideoElement | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(result);
    };
    const timer = window.setTimeout(() => finish(video.readyState >= 1 ? video : null), 4000);
    video.onloadeddata = () => finish(video);
    video.onloadedmetadata = () => {
      if (video.readyState >= 2) finish(video);
    };
    video.onerror = () => finish(null);
    video.src = src;
  });
}

function seekVideoToTime(video: HTMLVideoElement, timeSec: number): Promise<void> {
  return new Promise((resolve) => {
    const maxTime =
      Number.isFinite(video.duration) && video.duration > 0.05
        ? Math.max(0, video.duration - 0.04)
        : timeSec;
    const target = Math.max(0, Math.min(maxTime, timeSec));
    if (Math.abs(video.currentTime - target) < 0.025 && video.readyState >= 2) {
      resolve();
      return;
    }
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      video.removeEventListener('seeked', finish);
      window.clearTimeout(timer);
      resolve();
    };
    const timer = window.setTimeout(finish, 450);
    video.addEventListener('seeked', finish, { once: true });
    try {
      video.currentTime = target;
    } catch {
      finish();
    }
  });
}

async function decodeSceneSpeechBuffer(
  decodeCtx: AudioContext,
  wavBytes: Uint8Array | undefined,
  rawBytes: Uint8Array | undefined,
  audioUrl: string | undefined
): Promise<AudioBuffer | null> {
  const candidates: Uint8Array[] = [];
  if (wavBytes && wavBytes.byteLength > 44) candidates.push(wavBytes);
  if (rawBytes && rawBytes.byteLength > 44) candidates.push(rawBytes);

  for (const bytes of candidates) {
    try {
      const cloned = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      return await decodeCtx.decodeAudioData(cloned as ArrayBuffer);
    } catch {
      // Try next byte payload
    }
  }

  if (audioUrl) {
    try {
      const res = await fetch(audioUrl);
      const buf = await res.arrayBuffer();
      return await decodeCtx.decodeAudioData(buf);
    } catch {
      // Failed remote/blob audio decode
    }
  }

  return null;
}

async function decodeVideoSourceAudio(
  decodeCtx: AudioContext,
  videoUrl: string
): Promise<AudioBuffer | null> {
  try {
    const res = await fetch(videoUrl);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (!buf.byteLength) return null;
    return await decodeCtx.decodeAudioData(buf);
  } catch {
    return null;
  }
}

async function buildMixedOfflineAudio(
  preparedScenes: PreparedScene[],
  totalDurationSec: number,
  speechSpeed: number,
  originalVideoAudio: AudioBuffer | null,
  originalAudioMix: number
): Promise<AudioBuffer> {
  const sampleRate = 48000;
  const totalSamples = Math.max(sampleRate, Math.ceil(totalDurationSec * sampleRate));
  const offline = new OfflineAudioContext(2, totalSamples, sampleRate);

  for (const item of preparedScenes) {
    if (item.decodedBuffer) {
      const voiceSrc = offline.createBufferSource();
      voiceSrc.buffer = item.decodedBuffer;
      voiceSrc.playbackRate.value = Math.max(0.25, Math.min(3, speechSpeed || 1));
      voiceSrc.connect(offline.destination);
      voiceSrc.start(item.timelineStartSec);
    }

    if (
      originalVideoAudio &&
      originalAudioMix > 0.005 &&
      item.timing.sourceStartSec < originalVideoAudio.duration - 0.05
    ) {
      const bgSrc = offline.createBufferSource();
      bgSrc.buffer = originalVideoAudio;
      bgSrc.playbackRate.value = item.timing.playbackRate;
      const bgGain = offline.createGain();
      bgGain.gain.value = Math.max(0, Math.min(0.6, originalAudioMix));
      bgSrc.connect(bgGain);
      bgGain.connect(offline.destination);

      const availableSourceSpan = Math.max(
        0.05,
        Math.min(item.timing.sourceSpanSec, originalVideoAudio.duration - item.timing.sourceStartSec)
      );
      bgSrc.start(
        item.timelineStartSec,
        item.timing.sourceStartSec,
        availableSourceSpan
      );
    }
  }

  return await offline.startRendering();
}

async function tryMediabunnyExport(
  params: ExportDubbedVideoParams,
  preparedScenes: PreparedScene[],
  totalDurationSec: number,
  mixedAudioBuffer: AudioBuffer,
  fallbackVideoEl: HTMLVideoElement | null,
  workCanvas: HTMLCanvasElement,
  blurBufferCanvas: HTMLCanvasElement
): Promise<ExportedDubVideoResult | null> {
  const {
    attachedVideoUrl,
    canvasWidth,
    canvasHeight,
    projectTitle,
    personaDisplay,
    layoutStyle,
    topBadgeText,
    offerBannerText,
    burnSubtitles,
    quality,
    containerPreference,
    isEn,
    previewCanvas,
    signal,
    onProgress,
  } = params;

  const {
    Output,
    Mp4OutputFormat,
    WebMOutputFormat,
    BufferTarget,
    CanvasSource,
    AudioBufferSource,
    canEncodeVideo,
    canEncodeAudio,
    Input,
    UrlSource,
    ALL_FORMATS,
    CanvasSink,
  } = await import('mediabunny');

  const avcOk = await canEncodeVideo('avc', { width: canvasWidth, height: canvasHeight });
  const aacOk = await canEncodeAudio('aac');
  const vp9Ok = await canEncodeVideo('vp9', { width: canvasWidth, height: canvasHeight });
  const vp8Ok = await canEncodeVideo('vp8', { width: canvasWidth, height: canvasHeight });
  const opusOk = await canEncodeAudio('opus');

  let useMp4 = false;
  if (containerPreference === 'mp4') {
    if (avcOk && aacOk) useMp4 = true;
    else if ((vp9Ok || vp8Ok) && opusOk) useMp4 = false;
    else return null;
  } else if (containerPreference === 'webm') {
    if ((vp9Ok || vp8Ok) && opusOk) useMp4 = false;
    else if (avcOk && aacOk) useMp4 = true;
    else return null;
  } else {
    if (avcOk && aacOk) useMp4 = true;
    else if ((vp9Ok || vp8Ok) && opusOk) useMp4 = false;
    else return null;
  }

  const videoCodec = useMp4 ? 'avc' : vp9Ok ? 'vp9' : 'vp8';
  const target = new BufferTarget();
  const output = new Output({
    format: useMp4 ? new Mp4OutputFormat() : new WebMOutputFormat(),
    target,
  });

  let input: InstanceType<typeof Input> | undefined;
  let videoTrack: Awaited<ReturnType<InstanceType<typeof Input>['getPrimaryVideoTrack']>> | null = null;
  let trackDurationSec = 0;

  if (attachedVideoUrl) {
    try {
      input = new Input({
        source: new UrlSource(attachedVideoUrl),
        formats: ALL_FORMATS,
      });
      const candidateTrack = await input.getPrimaryVideoTrack();
      if (candidateTrack && (await candidateTrack.canDecode())) {
        videoTrack = candidateTrack;
        trackDurationSec = await candidateTrack.computeDuration();
      } else {
        input.dispose();
        input = undefined;
      }
    } catch {
      input?.dispose();
      input = undefined;
      videoTrack = null;
    }
  }

  const fps = 30;
  const bitrate = quality === 'fullhd' ? 8_500_000 : 5_500_000;
  const ctx = workCanvas.getContext('2d');
  if (!ctx) return null;
  const previewCtx = previewCanvas ? previewCanvas.getContext('2d') : null;

  let started = false;
  try {
    const videoSource = new CanvasSource(workCanvas, {
      codec: videoCodec,
      bitrate,
      latencyMode: 'realtime',
      hardwareAcceleration: 'prefer-software',
    });
    const audioSource = new AudioBufferSource({
      codec: useMp4 ? 'aac' : 'opus',
      bitrate: 192_000,
    });

    output.addVideoTrack(videoSource);
    output.addAudioTrack(audioSource);
    await output.start();
    started = true;

    const audioTask = audioSource.add(mixedAudioBuffer);
    audioTask.catch(() => {});

    let globalFrameIndex = 0;
    const totalEstimatedFrames = Math.max(1, Math.ceil(totalDurationSec * fps));

    for (let sIdx = 0; sIdx < preparedScenes.length; sIdx++) {
      if (signal?.aborted) throw new DOMException('Export aborted', 'AbortError');
      const item = preparedScenes[sIdx];
      const sceneDurSec = item.timing.targetDurationMs / 1000;
      const sceneFrameCount = Math.max(1, Math.round(sceneDurSec * fps));

      onProgress({
        phase: 'encoding',
        sceneIndex: sIdx,
        totalScenes: preparedScenes.length,
        percent: Math.min(92, Math.round((globalFrameIndex / totalEstimatedFrames) * 85 + 10)),
        statusText: isEn
          ? `Rendering scene ${sIdx + 1}/${preparedScenes.length} (${useMp4 ? 'MP4 HD' : 'WebM HD'})...`
          : `দৃশ্য ${sIdx + 1}/${preparedScenes.length} (${useMp4 ? 'MP4 HD' : 'WebM HD'}) ফ্রেম রেন্ডার হচ্ছে...`,
      });

      let sceneIterator:
        | AsyncGenerator<{ canvas: HTMLCanvasElement } | null, void, unknown>
        | undefined;

      if (videoTrack) {
        const sink = new CanvasSink(videoTrack, {
          poolSize: 2,
          decoderOptions: { hardwareAcceleration: 'prefer-software' },
        });
        const maxTrackTime =
          Number.isFinite(trackDurationSec) && trackDurationSec > 0.05
            ? trackDurationSec - 1e-4
            : item.timing.sourceEndSec;
        const times = function* () {
          for (let f = 0; f < sceneFrameCount; f++) {
            const p = sceneFrameCount > 1 ? f / (sceneFrameCount - 1) : 0;
            const rawTs = mapSceneProgressToVideoTime(item.timing, p);
            yield Math.max(0, Math.min(maxTrackTime, rawTs));
          }
        };
        sceneIterator = sink.canvasesAtTimestamps(times()) as AsyncGenerator<
          { canvas: HTMLCanvasElement } | null,
          void,
          unknown
        >;
      }

      try {
        for (let f = 0; f < sceneFrameCount; f++) {
          if (signal?.aborted) throw new DOMException('Export aborted', 'AbortError');
          const localProgress = sceneFrameCount > 1 ? f / (sceneFrameCount - 1) : 0;
          const overallProgress =
            (globalFrameIndex + 1) / Math.max(1, totalEstimatedFrames);

          let decodedFrameCanvas: HTMLCanvasElement | null = null;
          if (sceneIterator) {
            try {
              const next = await sceneIterator.next();
              if (!next.done && next.value?.canvas) {
                decodedFrameCanvas = next.value.canvas;
              }
            } catch {
              decodedFrameCanvas = null;
            }
          } else if (fallbackVideoEl && attachedVideoUrl) {
            const targetTs = mapSceneProgressToVideoTime(item.timing, localProgress);
            await seekVideoToTime(fallbackVideoEl, targetTs);
          }

          renderDynamicVideoFrame(
            ctx,
            canvasWidth,
            canvasHeight,
            {
              scene: item.scene,
              sceneIndex: sIdx,
              totalScenes: preparedScenes.length,
              progressRatio: overallProgress,
              projectTitle,
              personaDisplay,
              layoutStyle,
              topBadgeText,
              offerBannerText,
              burnSubtitles,
              frameImage: item.frameImage,
              videoSource:
                decodedFrameCanvas ||
                (fallbackVideoEl && attachedVideoUrl ? fallbackVideoEl : null),
              pulseTick: f + 1,
              isEn,
            },
            blurBufferCanvas
          );

          if (previewCtx && previewCanvas && (f % 6 === 0 || f === sceneFrameCount - 1)) {
            previewCtx.drawImage(
              workCanvas,
              0,
              0,
              previewCanvas.width,
              previewCanvas.height
            );
          }

          const timestamp = globalFrameIndex / fps;
          const frameDur = Math.max(1 / fps, 0.001);
          await videoSource.add(timestamp, frameDur);
          globalFrameIndex++;
        }
      } finally {
        await sceneIterator?.return().catch(() => {});
      }
    }

    onProgress({
      phase: 'finalizing',
      sceneIndex: preparedScenes.length - 1,
      totalScenes: preparedScenes.length,
      percent: 96,
      statusText: isEn
        ? `Finalizing ${useMp4 ? 'MP4' : 'WebM'} audio/video sync...`
        : `${useMp4 ? 'MP4' : 'WebM'} অডিও ও ভিডিও সিঙ্ক সম্পন্ন হচ্ছে...`,
    });

    await audioTask;
    videoSource.close();
    audioSource.close();
    await output.finalize();
    started = false;

    if (!target.buffer || target.buffer.byteLength === 0) {
      return null;
    }

    const mimeType = useMp4 ? 'video/mp4' : 'video/webm';
    return {
      blob: new Blob([target.buffer], { type: mimeType }),
      mimeType,
      extension: useMp4 ? 'mp4' : 'webm',
      width: canvasWidth,
      height: canvasHeight,
      durationSec: totalDurationSec,
      engine: 'frame-accurate',
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    if (started) {
      await output.cancel().catch(() => {});
    }
    return null;
  } finally {
    input?.dispose();
  }
}

async function runLiveMediaRecorderFallback(
  params: ExportDubbedVideoParams,
  preparedScenes: PreparedScene[],
  totalDurationSec: number,
  mixedAudioBuffer: AudioBuffer,
  fallbackVideoEl: HTMLVideoElement | null,
  workCanvas: HTMLCanvasElement,
  blurBufferCanvas: HTMLCanvasElement
): Promise<ExportedDubVideoResult> {
  const {
    attachedVideoUrl,
    canvasWidth,
    canvasHeight,
    projectTitle,
    personaDisplay,
    layoutStyle,
    topBadgeText,
    offerBannerText,
    burnSubtitles,
    quality,
    containerPreference,
    isEn,
    previewCanvas,
    signal,
    onProgress,
  } = params;

  const ctx = workCanvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');
  const previewCtx = previewCanvas ? previewCanvas.getContext('2d') : null;

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const liveCtx = new AudioCtx();
  const dest = liveCtx.createMediaStreamDestination();

  const videoStream = workCanvas.captureStream(30);
  const combinedStream = new MediaStream([
    ...videoStream.getVideoTracks(),
    ...dest.stream.getAudioTracks(),
  ]);

  const mp4Mimes = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4',
  ];
  const webmMimes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  const orderedMimes =
    containerPreference === 'webm'
      ? [...webmMimes, ...mp4Mimes]
      : [...mp4Mimes, ...webmMimes];

  const chosenMime =
    orderedMimes.find(
      (m) =>
        typeof MediaRecorder !== 'undefined' &&
        MediaRecorder.isTypeSupported &&
        MediaRecorder.isTypeSupported(m)
    ) || '';

  const recorderOpts: MediaRecorderOptions = {
    videoBitsPerSecond: quality === 'fullhd' ? 8_500_000 : 5_500_000,
    audioBitsPerSecond: 192_000,
    ...(chosenMime ? { mimeType: chosenMime } : {}),
  };

  const recorder = new MediaRecorder(combinedStream, recorderOpts);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const stopPromise = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      resolve(
        new Blob(chunks, {
          type: chosenMime || 'video/webm',
        })
      );
    };
  });

  try {
    const audioSource = liveCtx.createBufferSource();
    audioSource.buffer = mixedAudioBuffer;
    audioSource.connect(dest);
    audioSource.connect(liveCtx.destination);

    recorder.start(200);
    audioSource.start(0);

    for (let sIdx = 0; sIdx < preparedScenes.length; sIdx++) {
      if (signal?.aborted) throw new DOMException('Export aborted', 'AbortError');
      const item = preparedScenes[sIdx];

      onProgress({
        phase: 'recording',
        sceneIndex: sIdx,
        totalScenes: preparedScenes.length,
        percent: Math.min(94, Math.round((sIdx / preparedScenes.length) * 85 + 10)),
        statusText: isEn
          ? `Recording scene ${sIdx + 1}/${preparedScenes.length} with synced Bangla voiceover...`
          : `দৃশ্য ${sIdx + 1}/${preparedScenes.length} বাংলা ভয়েসওভারসহ রেকর্ড হচ্ছে...`,
      });

      if (fallbackVideoEl && attachedVideoUrl) {
        fallbackVideoEl.muted = true;
        fallbackVideoEl.pause();
        await seekVideoToTime(fallbackVideoEl, item.timing.sourceStartSec);
        fallbackVideoEl.playbackRate = item.timing.playbackRate;
        await fallbackVideoEl.play().catch(() => {});
      }

      const startWall = performance.now();
      let tick = 0;
      await new Promise<void>((resolve) => {
        const step = () => {
          if (signal?.aborted) {
            resolve();
            return;
          }
          const elapsed = performance.now() - startWall;
          if (
            fallbackVideoEl &&
            attachedVideoUrl &&
            fallbackVideoEl.currentTime >= item.timing.sourceEndSec
          ) {
            fallbackVideoEl.pause();
          }

          const overallProgress = Math.min(
            1,
            (sIdx + elapsed / Math.max(1, item.timing.targetDurationMs)) /
              preparedScenes.length
          );

          renderDynamicVideoFrame(
            ctx,
            canvasWidth,
            canvasHeight,
            {
              scene: item.scene,
              sceneIndex: sIdx,
              totalScenes: preparedScenes.length,
              progressRatio: overallProgress,
              projectTitle,
              personaDisplay,
              layoutStyle,
              topBadgeText,
              offerBannerText,
              burnSubtitles,
              frameImage: item.frameImage,
              videoSource: fallbackVideoEl && attachedVideoUrl ? fallbackVideoEl : null,
              pulseTick: ++tick,
              isEn,
            },
            blurBufferCanvas
          );

          if (previewCtx && previewCanvas && (tick % 3 === 0 || elapsed >= item.timing.targetDurationMs)) {
            previewCtx.drawImage(
              workCanvas,
              0,
              0,
              previewCanvas.width,
              previewCanvas.height
            );
          }

          if (elapsed >= item.timing.targetDurationMs) {
            resolve();
          } else {
            window.requestAnimationFrame(step);
          }
        };
        step();
      });

      if (fallbackVideoEl && attachedVideoUrl) {
        fallbackVideoEl.pause();
      }
    }

    if (recorder.state !== 'inactive') {
      recorder.stop();
    }
    const blob = await stopPromise;
    const isMp4 = (chosenMime || '').includes('mp4');
    return {
      blob,
      mimeType: chosenMime || 'video/webm',
      extension: isMp4 ? 'mp4' : 'webm',
      width: canvasWidth,
      height: canvasHeight,
      durationSec: totalDurationSec,
      engine: 'live-recorder',
    };
  } finally {
    if (recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        // ignore cleanup stop
      }
    }
    combinedStream.getTracks().forEach((t) => t.stop());
    await liveCtx.close().catch(() => {});
  }
}

/**
 * Export Kotha Studio dubbed scenes cleanly in native/selected aspect ratio and framing.
 * Uses fast frame-accurate mediabunny encoding first and falls back to HD MediaRecorder if needed.
 */
export async function exportDubbedVideo(
  params: ExportDubbedVideoParams
): Promise<ExportedDubVideoResult> {
  const {
    scenes,
    attachedVideoUrl,
    canvasWidth,
    canvasHeight,
    speechSpeed,
    originalAudioMix,
    isEn,
    signal,
    onProgress,
    onEnsureSceneVoice,
  } = params;

  if (scenes.length === 0) {
    throw new Error(isEn ? 'No scenes selected to export.' : 'এক্সপোর্ট করার জন্য কোনো দৃশ্য পাওয়া যায়নি।');
  }

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const decodeCtx = new AudioCtx();

  const workCanvas = document.createElement('canvas');
  workCanvas.width = canvasWidth;
  workCanvas.height = canvasHeight;
  const blurBufferCanvas = document.createElement('canvas');

  let fallbackVideoEl: HTMLVideoElement | null = null;

  try {
    if (typeof document !== 'undefined' && 'fonts' in document) {
      await document.fonts.ready.catch(() => {});
    }

    if (attachedVideoUrl) {
      fallbackVideoEl = await loadVideoElement(attachedVideoUrl);
    }

    const totalVideoDurationSec =
      fallbackVideoEl && Number.isFinite(fallbackVideoEl.duration) && fallbackVideoEl.duration > 0.2
        ? fallbackVideoEl.duration
        : undefined;

    const preparedScenes: PreparedScene[] = [];
    let cumulativeStartSec = 0;

    for (let i = 0; i < scenes.length; i++) {
      if (signal?.aborted) throw new DOMException('Export aborted', 'AbortError');
      const scene = scenes[i];

      onProgress({
        phase: 'audio',
        sceneIndex: i,
        totalScenes: scenes.length,
        percent: Math.round((i / scenes.length) * 12),
        statusText: isEn
          ? `Preparing scene ${i + 1}/${scenes.length} Bangla voiceover & frame...`
          : `দৃশ্য ${i + 1}/${scenes.length}-এর বাংলা ভয়েসওভার ও ফ্রেম প্রস্তুত হচ্ছে...`,
      });

      let wavBytes = scene.audioWavBytes;
      let rawBytes = scene.audioRawBytes;
      let audioUrl = scene.audioUrl;

      if (!wavBytes?.byteLength && !rawBytes?.byteLength && !audioUrl) {
        const ensured = await onEnsureSceneVoice(scene.id);
        if (ensured) {
          wavBytes = ensured.wavBytes;
          rawBytes = ensured.rawBytes;
          audioUrl = ensured.audioUrl;
        }
      }

      if (isEmbedded && !wavBytes?.byteLength && !rawBytes?.byteLength && !audioUrl) {
        throw new Error(
          'Spoken audio is unavailable for this scene. Generate its voice before recording.'
        );
      }

      const decodedBuffer = await decodeSceneSpeechBuffer(
        decodeCtx,
        wavBytes,
        rawBytes,
        audioUrl
      );

      if (isEmbedded && !decodedBuffer) {
        throw new Error(
          'Scene speech could not be decoded. Recording stopped to preserve the spoken narration.'
        );
      }

      const frameImage = scene.customFrameDataUrl
        ? await loadImageElement(scene.customFrameDataUrl)
        : null;

      const timing = computeScenePlaybackTiming({
        sceneStartSec: scene.startTimeSec,
        sceneEndSec: scene.endTimeSec,
        speechDurationSec: decodedBuffer?.duration ?? scene.audioDurationSec ?? 0,
        speechSpeed,
        totalVideoDurationSec,
        isEmbedded,
        hasDecodedAudio: Boolean(decodedBuffer),
      });

      preparedScenes.push({
        scene,
        decodedBuffer,
        frameImage,
        timing,
        timelineStartSec: cumulativeStartSec,
      });

      cumulativeStartSec += timing.targetDurationMs / 1000;
    }

    const totalDurationSec = Math.max(0.5, cumulativeStartSec);

    const originalVideoAudio =
      attachedVideoUrl && originalAudioMix > 0.005
        ? await decodeVideoSourceAudio(decodeCtx, attachedVideoUrl)
        : null;

    const mixedAudioBuffer = await buildMixedOfflineAudio(
      preparedScenes,
      totalDurationSec,
      speechSpeed,
      originalVideoAudio,
      originalAudioMix
    );

    const fastResult = await tryMediabunnyExport(
      params,
      preparedScenes,
      totalDurationSec,
      mixedAudioBuffer,
      fallbackVideoEl,
      workCanvas,
      blurBufferCanvas
    );

    if (fastResult) {
      return fastResult;
    }

    return await runLiveMediaRecorderFallback(
      params,
      preparedScenes,
      totalDurationSec,
      mixedAudioBuffer,
      fallbackVideoEl,
      workCanvas,
      blurBufferCanvas
    );
  } finally {
    if (fallbackVideoEl) {
      try {
        fallbackVideoEl.pause();
        fallbackVideoEl.removeAttribute('src');
        fallbackVideoEl.load();
      } catch {
        // ignore cleanup error
      }
    }
    workCanvas.width = 0;
    workCanvas.height = 0;
    blurBufferCanvas.width = 0;
    blurBufferCanvas.height = 0;
    await decodeCtx.close().catch(() => {});
  }
}
