import { type SceneItem } from './dubbingLogic';

export type FrameAspectMode = 'original' | '16:9' | '9:16' | '1:1' | '4:5';

export type FrameLayoutStyle = 'clean' | 'blur-fit' | 'cover' | 'studio-card';

export type VideoExportQuality = 'hd' | 'fullhd';

export type VideoContainerPreference = 'auto' | 'mp4' | 'webm';

export interface SourceDimensions {
  width: number;
  height: number;
}

export interface OutputDimensions {
  width: number;
  height: number;
  aspectLabel: string;
}

export interface MediaDrawRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

export interface ScenePlaybackTiming {
  targetDurationMs: number;
  sourceStartSec: number;
  sourceEndSec: number;
  sourceSpanSec: number;
  playbackRate: number;
}

export type CanvasDrawableMedia =
  | HTMLVideoElement
  | HTMLImageElement
  | HTMLCanvasElement
  | OffscreenCanvas;

export interface RenderDynamicFrameOptions {
  scene: SceneItem;
  sceneIndex: number;
  totalScenes: number;
  progressRatio: number;
  projectTitle: string;
  personaDisplay: string;
  layoutStyle: FrameLayoutStyle;
  topBadgeText?: string;
  offerBannerText?: string;
  burnSubtitles?: boolean;
  frameImage?: HTMLImageElement | null;
  videoSource?: CanvasDrawableMedia | null;
  pulseTick?: number;
  isEn?: boolean;
}

/** Round pixel dimensions to an even integer (>= 2) required by H.264/VP9 encoders. */
export function normalizeEvenDimension(value: number): number {
  if (!Number.isFinite(value) || value <= 2) return 2;
  return Math.max(2, Math.round(value / 2) * 2);
}

/** Produce a clean readable aspect ratio label such as "16:9" or "9:16". */
export function detectAspectRatioLabel(width: number, height: number): string {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return '16:9';
  }
  const ratio = width / height;
  const presets: { label: string; ratio: number }[] = [
    { label: '16:9', ratio: 16 / 9 },
    { label: '9:16', ratio: 9 / 16 },
    { label: '1:1', ratio: 1 },
    { label: '4:5', ratio: 4 / 5 },
    { label: '4:3', ratio: 4 / 3 },
    { label: '3:4', ratio: 3 / 4 },
    { label: '21:9', ratio: 21 / 9 },
  ];
  for (const preset of presets) {
    if (Math.abs(ratio - preset.ratio) / preset.ratio <= 0.035) {
      return preset.label;
    }
  }
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const w = Math.round(width);
  const h = Math.round(height);
  const g = gcd(w, h) || 1;
  const rw = Math.round(w / g);
  const rh = Math.round(h / g);
  if (rw <= 32 && rh <= 32) {
    return `${rw}:${rh}`;
  }
  return ratio >= 1 ? `${ratio.toFixed(2)}:1` : `1:${(1 / ratio).toFixed(2)}`;
}

/**
 * Compute even encoder-safe canvas dimensions for keyframe thumbnails while preserving
 * the exact aspect ratio of the source video.
 */
export function computeKeyframeCaptureDimensions(
  videoWidth: number,
  videoHeight: number,
  maxLongEdge = 720
): SourceDimensions {
  if (!Number.isFinite(videoWidth) || !Number.isFinite(videoHeight) || videoWidth <= 0 || videoHeight <= 0) {
    return { width: 640, height: 360 };
  }
  const longEdge = Math.max(videoWidth, videoHeight);
  const scale = longEdge > maxLongEdge ? maxLongEdge / longEdge : 1;
  return {
    width: normalizeEvenDimension(videoWidth * scale),
    height: normalizeEvenDimension(videoHeight * scale),
  };
}

/**
 * Compute output canvas dimensions preserving original video proportions when
 * `aspectMode === 'original'`, or matching exact social aspect presets otherwise.
 */
export function computeOutputCanvasDimensions(
  aspectMode: FrameAspectMode,
  source: SourceDimensions | null,
  quality: VideoExportQuality = 'hd'
): OutputDimensions {
  const isFullHd = quality === 'fullhd';
  if (aspectMode === 'original') {
    if (source && source.width > 0 && source.height > 0) {
      const longEdge = Math.max(source.width, source.height);
      const shortEdge = Math.min(source.width, source.height);
      const maxEdge = isFullHd ? 1920 : 1280;
      const minShortEdgeForCrispText = isFullHd ? 1080 : 720;
      let scale = 1;
      if (longEdge > maxEdge) {
        scale = maxEdge / longEdge;
      } else if (shortEdge < minShortEdgeForCrispText) {
        scale = Math.min(
          maxEdge / longEdge,
          minShortEdgeForCrispText / shortEdge
        );
      }
      const width = normalizeEvenDimension(source.width * scale);
      const height = normalizeEvenDimension(source.height * scale);
      return {
        width,
        height,
        aspectLabel: detectAspectRatioLabel(width, height),
      };
    }
    return isFullHd
      ? { width: 1920, height: 1080, aspectLabel: '16:9' }
      : { width: 1280, height: 720, aspectLabel: '16:9' };
  }

  switch (aspectMode) {
    case '16:9':
      return isFullHd
        ? { width: 1920, height: 1080, aspectLabel: '16:9' }
        : { width: 1280, height: 720, aspectLabel: '16:9' };
    case '9:16':
      return isFullHd
        ? { width: 1080, height: 1920, aspectLabel: '9:16' }
        : { width: 720, height: 1280, aspectLabel: '9:16' };
    case '1:1':
      return isFullHd
        ? { width: 1080, height: 1080, aspectLabel: '1:1' }
        : { width: 960, height: 960, aspectLabel: '1:1' };
    case '4:5':
      return isFullHd
        ? { width: 1080, height: 1350, aspectLabel: '4:5' }
        : { width: 768, height: 960, aspectLabel: '4:5' };
  }
}

/**
 * Compute distortion-free source crop and destination rect for Canvas 2D drawImage.
 * Always preserves natural aspect ratio without stretching.
 */
export function computeMediaRect(
  targetX: number,
  targetY: number,
  targetW: number,
  targetH: number,
  sourceW: number,
  sourceH: number,
  fit: 'contain' | 'cover'
): MediaDrawRect {
  if (
    targetW <= 0 ||
    targetH <= 0 ||
    sourceW <= 0 ||
    sourceH <= 0
  ) {
    return {
      sx: 0,
      sy: 0,
      sw: Math.max(1, sourceW),
      sh: Math.max(1, sourceH),
      dx: targetX,
      dy: targetY,
      dw: Math.max(1, targetW),
      dh: Math.max(1, targetH),
    };
  }

  const targetAspect = targetW / targetH;
  const sourceAspect = sourceW / sourceH;

  if (fit === 'contain') {
    if (sourceAspect >= targetAspect) {
      const dw = targetW;
      const dh = targetW / sourceAspect;
      return {
        sx: 0,
        sy: 0,
        sw: sourceW,
        sh: sourceH,
        dx: targetX,
        dy: targetY + (targetH - dh) / 2,
        dw,
        dh,
      };
    }
    const dh = targetH;
    const dw = targetH * sourceAspect;
    return {
      sx: 0,
      sy: 0,
      sw: sourceW,
      sh: sourceH,
      dx: targetX + (targetW - dw) / 2,
      dy: targetY,
      dw,
      dh,
    };
  }

  // fit === 'cover': fill entire target area by center-cropping excess source edges
  if (sourceAspect > targetAspect) {
    const sw = sourceH * targetAspect;
    return {
      sx: (sourceW - sw) / 2,
      sy: 0,
      sw,
      sh: sourceH,
      dx: targetX,
      dy: targetY,
      dw: targetW,
      dh: targetH,
    };
  }
  const sh = sourceW / targetAspect;
  return {
    sx: 0,
    sy: (sourceH - sh) / 2,
    sw: sourceW,
    sh,
    dx: targetX,
    dy: targetY,
    dw: targetW,
    dh: targetH,
  };
}

/** Smartly recommend Clean Original framing when real video/frames exist, or Studio Card for pure storyboards. */
export function getRecommendedDefaults(hasSourceMedia: boolean): {
  aspectMode: FrameAspectMode;
  layoutStyle: FrameLayoutStyle;
} {
  return hasSourceMedia
    ? { aspectMode: 'original', layoutStyle: 'clean' }
    : { aspectMode: '9:16', layoutStyle: 'studio-card' };
}

/** Compute synchronized scene duration, source trim window, and proportional video playback rate. */
export function computeScenePlaybackTiming(params: {
  sceneStartSec: number;
  sceneEndSec: number;
  speechDurationSec: number;
  speechSpeed: number;
  totalVideoDurationSec?: number;
  isEmbedded?: boolean;
  hasDecodedAudio: boolean;
}): ScenePlaybackTiming {
  const safeSpeed = Math.max(0.25, Math.min(3, params.speechSpeed || 1));
  const rawSpan = Math.max(0.5, params.sceneEndSec - params.sceneStartSec);

  const effectiveSpeechSec = params.hasDecodedAudio
    ? Math.max(0.35, params.speechDurationSec / safeSpeed)
    : rawSpan;

  const targetDurationMs =
    params.isEmbedded && params.hasDecodedAudio
      ? Math.ceil(effectiveSpeechSec * 1000)
      : Math.max(800, Math.round(effectiveSpeechSec * 1000) + (params.hasDecodedAudio ? 120 : 0));

  const maxVideo =
    params.totalVideoDurationSec && Number.isFinite(params.totalVideoDurationSec) && params.totalVideoDurationSec > 0.2
      ? params.totalVideoDurationSec
      : undefined;

  let sourceStartSec = Math.max(0, params.sceneStartSec || 0);
  let sourceEndSec = Math.max(sourceStartSec + 0.25, params.sceneEndSec || sourceStartSec + rawSpan);

  if (maxVideo !== undefined) {
    if (sourceStartSec >= maxVideo - 0.1) {
      sourceStartSec = sourceStartSec % maxVideo;
      sourceEndSec = Math.min(maxVideo, sourceStartSec + rawSpan);
    } else {
      sourceEndSec = Math.min(maxVideo, sourceEndSec);
    }
    if (sourceEndSec <= sourceStartSec + 0.05) {
      sourceEndSec = Math.min(maxVideo, sourceStartSec + Math.min(rawSpan, maxVideo));
    }
  }

  const sourceSpanSec = Math.max(0.1, sourceEndSec - sourceStartSec);
  const targetSec = Math.max(0.4, targetDurationMs / 1000);
  const rawRate = sourceSpanSec / targetSec;
  const playbackRate = Math.max(0.4, Math.min(2.5, Number.isFinite(rawRate) ? rawRate : 1));

  return {
    targetDurationMs,
    sourceStartSec,
    sourceEndSec,
    sourceSpanSec,
    playbackRate,
  };
}

/** Map normalized progress [0..1] within a scene into an exact source video timestamp. */
export function mapSceneProgressToVideoTime(
  timing: ScenePlaybackTiming,
  progressRatio: number
): number {
  const clamped = Math.max(0, Math.min(1, progressRatio));
  const t = timing.sourceStartSec + timing.sourceSpanSec * clamped;
  return Math.max(timing.sourceStartSec, Math.min(timing.sourceEndSec, t));
}

function getMediaDimensions(media: CanvasDrawableMedia | null | undefined): SourceDimensions | null {
  if (!media) return null;
  if (typeof HTMLVideoElement !== 'undefined' && media instanceof HTMLVideoElement) {
    if (media.readyState >= 2 && media.videoWidth > 0 && media.videoHeight > 0) {
      return { width: media.videoWidth, height: media.videoHeight };
    }
    return null;
  }
  if (typeof HTMLImageElement !== 'undefined' && media instanceof HTMLImageElement) {
    if (media.complete && media.naturalWidth > 0 && media.naturalHeight > 0) {
      return { width: media.naturalWidth, height: media.naturalHeight };
    }
    return null;
  }
  if ('width' in media && 'height' in media && media.width > 0 && media.height > 0) {
    return { width: media.width, height: media.height };
  }
  return null;
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

export function wrapCanvasTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 4
): string[] {
  const cleaned = text.trim();
  if (!cleaned) return [];
  const words = cleaned.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) {
        // Remaining words go into final line if fitting, else trimmed later
      }
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);

  if (lines.length > maxLines) {
    const truncated = lines.slice(0, maxLines);
    let last = truncated[maxLines - 1];
    while (last.length > 3 && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1).trimEnd();
    }
    truncated[maxLines - 1] = `${last}…`;
    return truncated;
  }

  return lines;
}

function drawBlurredBackdrop(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  media: CanvasDrawableMedia,
  dims: SourceDimensions,
  blurBufferCanvas?: HTMLCanvasElement | null
) {
  const coverRect = computeMediaRect(0, 0, w, h, dims.width, dims.height, 'cover');
  // Downsampling onto a small intermediate canvas produces smooth fast Gaussian-like blur across all browsers.
  if (blurBufferCanvas) {
    const bw = 96;
    const bh = Math.max(54, Math.round((96 * h) / w));
    if (blurBufferCanvas.width !== bw || blurBufferCanvas.height !== bh) {
      blurBufferCanvas.width = bw;
      blurBufferCanvas.height = bh;
    }
    const bctx = blurBufferCanvas.getContext('2d');
    if (bctx) {
      const tinyCover = computeMediaRect(0, 0, bw, bh, dims.width, dims.height, 'cover');
      bctx.clearRect(0, 0, bw, bh);
      bctx.imageSmoothingEnabled = true;
      bctx.imageSmoothingQuality = 'medium';
      bctx.drawImage(
        media,
        tinyCover.sx,
        tinyCover.sy,
        tinyCover.sw,
        tinyCover.sh,
        tinyCover.dx,
        tinyCover.dy,
        tinyCover.dw,
        tinyCover.dh
      );
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      // Overscan slightly by 8% so edge clamping never creates sharp borders
      ctx.drawImage(blurBufferCanvas, -w * 0.04, -h * 0.04, w * 1.08, h * 1.08);
      ctx.restore();
    } else {
      ctx.drawImage(
        media,
        coverRect.sx,
        coverRect.sy,
        coverRect.sw,
        coverRect.sh,
        coverRect.dx,
        coverRect.dy,
        coverRect.dw,
        coverRect.dh
      );
    }
  } else {
    ctx.drawImage(
      media,
      coverRect.sx,
      coverRect.sy,
      coverRect.sw,
      coverRect.sh,
      coverRect.dx,
      coverRect.dy,
      coverRect.dw,
      coverRect.dh
    );
  }

  ctx.fillStyle = 'rgba(4, 7, 14, 0.48)';
  ctx.fillRect(0, 0, w, h);
}

function drawOptionalBadgesAndSubtitles(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  opts: RenderDynamicFrameOptions
) {
  const minEdge = Math.min(w, h);
  const padX = Math.round(w * 0.045);
  const badgeText = opts.topBadgeText?.trim() || '';
  const bannerText = opts.offerBannerText?.trim() || '';
  const subText = opts.burnSubtitles ? opts.scene.banglaScript.trim() : '';

  // Optional floating top badge
  if (badgeText) {
    const fontSize = Math.max(15, Math.round(minEdge * 0.025));
    ctx.save();
    ctx.font = `700 ${fontSize}px "Hind Siliguri", "Plus Jakarta Sans", system-ui, sans-serif`;
    const measuredW = ctx.measureText(badgeText).width;
    const pillW = Math.min(w - padX * 2, measuredW + fontSize * 2.2);
    const pillH = Math.round(fontSize * 2.05);
    const pillX = padX;
    const pillY = Math.round(h * 0.04);

    ctx.fillStyle = 'rgba(6, 10, 18, 0.76)';
    drawRoundedRectPath(ctx, pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(45, 212, 191, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#2DD4BF';
    ctx.beginPath();
    ctx.arc(pillX + fontSize * 0.85, pillY + pillH / 2, Math.max(3, fontSize * 0.2), 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#F8FAFC';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(badgeText, pillX + fontSize * 1.45, pillY + pillH / 2 + 1, pillW - fontSize * 2.1);
    ctx.restore();
  }

  // Optional bottom CTA banner
  let bannerReserveH = 0;
  if (bannerText) {
    const fontSize = Math.max(16, Math.round(minEdge * 0.028));
    const bannerH = Math.round(fontSize * 2.35);
    const bannerW = Math.round(w * 0.88);
    const bannerX = Math.round((w - bannerW) / 2);
    const bannerY = h - Math.round(h * 0.038) - bannerH;
    bannerReserveH = bannerH + Math.round(h * 0.028);

    ctx.save();
    const grad = ctx.createLinearGradient(bannerX, bannerY, bannerX + bannerW, bannerY);
    grad.addColorStop(0, 'rgba(13, 148, 136, 0.92)');
    grad.addColorStop(1, 'rgba(2, 132, 199, 0.92)');
    ctx.fillStyle = grad;
    drawRoundedRectPath(ctx, bannerX, bannerY, bannerW, bannerH, Math.round(bannerH * 0.28));
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1.25;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 ${fontSize}px "Hind Siliguri", "Plus Jakarta Sans", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(bannerText, w / 2, bannerY + bannerH / 2 + 1, bannerW - 28);
    ctx.restore();
  }

  // Floating lower-third cinema subtitle pill
  if (subText) {
    const fontSize = Math.max(18, Math.round(minEdge * 0.034));
    const lineHeight = Math.round(fontSize * 1.38);
    const maxPillW = Math.round(w * 0.88);
    const innerPadX = Math.round(fontSize * 1.05);
    const innerPadY = Math.round(fontSize * 0.55);

    ctx.save();
    ctx.font = `600 ${fontSize}px "Hind Siliguri", "Noto Sans Bengali", system-ui, sans-serif`;
    const lines = wrapCanvasTextLines(ctx, subText, maxPillW - innerPadX * 2, 3);
    if (lines.length > 0) {
      const longestLine = lines.reduce(
        (maxW, line) => Math.max(maxW, ctx.measureText(line).width),
        0
      );
      const pillW = Math.min(maxPillW, Math.max(220, longestLine + innerPadX * 2));
      const pillH = lines.length * lineHeight + innerPadY * 2;
      const pillX = Math.round((w - pillW) / 2);
      const pillY = h - Math.round(h * 0.045) - bannerReserveH - pillH;

      ctx.fillStyle = 'rgba(6, 10, 18, 0.8)';
      drawRoundedRectPath(ctx, pillX, pillY, pillW, pillH, Math.round(fontSize * 0.55));
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = '#F8FAFC';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 4;
      lines.forEach((line, idx) => {
        ctx.fillText(
          line,
          w / 2,
          pillY + innerPadY + idx * lineHeight
        );
      });
    }
    ctx.restore();
  }
}

function drawStoryboardFallbackCard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  opts: RenderDynamicFrameOptions
) {
  ctx.fillStyle = '#0B1322';
  drawRoundedRectPath(ctx, boxX, boxY, boxW, boxH, 16);
  ctx.fill();
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const title = opts.isEn ? opts.scene.titleEn : opts.scene.titleBn;
  const titleFont = Math.max(18, Math.round(Math.min(w, h) * 0.036));
  ctx.fillStyle = '#2DD4BF';
  ctx.font = `700 ${Math.max(13, Math.round(titleFont * 0.65))}px "Plus Jakarta Sans", system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(
    `${opts.scene.timeRangeLabel} · ${opts.projectTitle || 'Kotha Studio'}`,
    boxX + 24,
    boxY + 24,
    boxW - 48
  );

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `700 ${titleFont}px "Hind Siliguri", "Plus Jakarta Sans", system-ui, sans-serif`;
  const titleLines = wrapCanvasTextLines(ctx, title, boxW - 48, 3);
  titleLines.forEach((line, i) => {
    ctx.fillText(line, boxX + 24, boxY + 58 + i * Math.round(titleFont * 1.3));
  });

  if (opts.scene.visualCaptureDescription) {
    const descFont = Math.max(14, Math.round(titleFont * 0.72));
    ctx.fillStyle = '#94A3B8';
    ctx.font = `500 ${descFont}px "Plus Jakarta Sans", system-ui, sans-serif`;
    const descLines = wrapCanvasTextLines(
      ctx,
      opts.scene.visualCaptureDescription,
      boxW - 48,
      4
    );
    const startY = boxY + 72 + titleLines.length * Math.round(titleFont * 1.3);
    descLines.forEach((line, i) => {
      ctx.fillText(line, boxX + 24, startY + i * Math.round(descFont * 1.38));
    });
  }
}

function drawStudioCardLayout(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  opts: RenderDynamicFrameOptions,
  activeMedia: CanvasDrawableMedia | null,
  mediaDims: SourceDimensions | null
) {
  const padX = Math.round(w * 0.05);
  const contentW = w - padX * 2;
  const headerY = Math.round(h * 0.032);
  const headerH = Math.max(54, Math.round(h * 0.088));

  // Header Scene + Waveform Card
  ctx.fillStyle = 'rgba(13, 21, 36, 0.92)';
  drawRoundedRectPath(ctx, padX, headerY, contentW, headerH, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(45, 212, 191, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const headerTitleSize = Math.max(15, Math.round(Math.min(w, h) * 0.025));
  const headerSubSize = Math.max(12, Math.round(headerTitleSize * 0.78));
  ctx.fillStyle = '#2DD4BF';
  ctx.font = `700 ${headerTitleSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(
    `Scene ${opts.sceneIndex + 1}/${opts.totalScenes} (${opts.scene.timeRangeLabel})`,
    padX + 18,
    headerY + Math.round(headerH * 0.16)
  );

  ctx.fillStyle = '#E2E8F0';
  ctx.font = `500 ${headerSubSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
  ctx.fillText(
    `${opts.projectTitle || 'Kotha Studio'} · ${opts.personaDisplay}`,
    padX + 18,
    headerY + Math.round(headerH * 0.56),
    contentW - 110
  );

  // Subtle animated waveform bars
  const barBaseX = padX + contentW - 72;
  const barBaseY = headerY + headerH - 14;
  for (let b = 0; b < 5; b++) {
    const wave =
      Math.abs(Math.sin((opts.pulseTick || 0) * 0.45 + b * 0.9)) *
        Math.round(headerH * 0.45) +
      8;
    ctx.fillStyle = '#2DD4BF';
    drawRoundedRectPath(ctx, barBaseX + b * 11, barBaseY - wave, 6, wave, 3);
    ctx.fill();
  }

  // Main Visual Box (uses proportional 'contain' — zero stretching!)
  const hasBottomSub = Boolean(opts.burnSubtitles && opts.scene.banglaScript.trim());
  const hasBanner = Boolean(opts.offerBannerText?.trim());
  const bottomReserve = (hasBottomSub ? h * 0.18 : 0) + (hasBanner ? h * 0.095 : 0) + h * 0.03;
  const mediaTop = headerY + headerH + Math.round(h * 0.022);
  const mediaH = Math.max(140, h - mediaTop - Math.round(bottomReserve));

  if (activeMedia && mediaDims) {
    const rect = computeMediaRect(
      padX,
      mediaTop,
      contentW,
      mediaH,
      mediaDims.width,
      mediaDims.height,
      'contain'
    );
    ctx.save();
    drawRoundedRectPath(ctx, rect.dx, rect.dy, rect.dw, rect.dh, 14);
    ctx.clip();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      activeMedia,
      rect.sx,
      rect.sy,
      rect.sw,
      rect.sh,
      rect.dx,
      rect.dy,
      rect.dw,
      rect.dh
    );
    ctx.restore();

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.lineWidth = 1.5;
    drawRoundedRectPath(ctx, rect.dx, rect.dy, rect.dw, rect.dh, 14);
    ctx.stroke();
  } else {
    drawStoryboardFallbackCard(ctx, w, h, padX, mediaTop, contentW, mediaH, opts);
  }

  // Optional badge (shifted inside media box if both header & badge exist) + subtitles + offer banner
  drawOptionalBadgesAndSubtitles(ctx, w, h, {
    ...opts,
    topBadgeText: undefined,
  });

  // Subtle progress bar along bottom edge in studio-card mode
  ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
  ctx.fillRect(0, h - 6, w, 6);
  ctx.fillStyle = '#2DD4BF';
  ctx.fillRect(0, h - 6, Math.round(w * Math.max(0, Math.min(1, opts.progressRatio))), 6);
}

/**
 * Render one complete frame of Kotha Studio's Dynamic Dubbed Video canvas.
 * Preserves aspect ratio across Clean Original, Blur Backdrop, Cover Fill, and Studio Card modes.
 */
export function renderDynamicVideoFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  opts: RenderDynamicFrameOptions,
  blurBufferCanvas?: HTMLCanvasElement | null
): void {
  // Base studio background
  ctx.fillStyle = '#04070E';
  ctx.fillRect(0, 0, w, h);

  const videoDims = getMediaDimensions(opts.videoSource);
  const imageDims = getMediaDimensions(opts.frameImage);
  const activeMedia: CanvasDrawableMedia | null = videoDims
    ? opts.videoSource || null
    : imageDims
      ? opts.frameImage || null
      : null;
  const mediaDims = videoDims || imageDims;

  if (opts.layoutStyle === 'studio-card') {
    drawStudioCardLayout(ctx, w, h, opts, activeMedia, mediaDims);
    return;
  }

  // Full-frame video/image modes ('clean', 'blur-fit', 'cover')
  if (activeMedia && mediaDims) {
    if (opts.layoutStyle === 'blur-fit') {
      drawBlurredBackdrop(ctx, w, h, activeMedia, mediaDims, blurBufferCanvas);
    }

    const fitMode = opts.layoutStyle === 'cover' ? 'cover' : 'contain';
    const rect = computeMediaRect(0, 0, w, h, mediaDims.width, mediaDims.height, fitMode);
    const isLetterboxed =
      fitMode === 'contain' &&
      (Math.abs(rect.dw - w) > 6 || Math.abs(rect.dh - h) > 6);

    ctx.save();
    if (opts.layoutStyle === 'blur-fit' && isLetterboxed) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
      ctx.shadowBlur = 26;
      ctx.shadowOffsetY = 8;
      ctx.fillStyle = '#000000';
      drawRoundedRectPath(ctx, rect.dx, rect.dy, rect.dw, rect.dh, 14);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      drawRoundedRectPath(ctx, rect.dx, rect.dy, rect.dw, rect.dh, 14);
      ctx.clip();
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      activeMedia,
      rect.sx,
      rect.sy,
      rect.sw,
      rect.sh,
      rect.dx,
      rect.dy,
      rect.dw,
      rect.dh
    );
    ctx.restore();
  } else {
    // Pure storyboard slide (no attached video or captured frame)
    const padX = Math.round(w * 0.06);
    const padY = Math.round(h * 0.08);
    drawStoryboardFallbackCard(
      ctx,
      w,
      h,
      padX,
      padY,
      w - padX * 2,
      h - padY * 2,
      opts
    );
  }

  drawOptionalBadgesAndSubtitles(ctx, w, h, opts);
}
