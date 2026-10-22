export type CapCutMaskShape =
  | "none"
  | "linear"
  | "mirror"
  | "circle"
  | "rectangle"
  | "heart"
  | "star";

export type CapCutBlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "color-dodge"
  | "difference";

export type CapCutAnimationId =
  | "none"
  | "fade_in"
  | "zoom_in"
  | "slide_left"
  | "slide_up"
  | "spin_in"
  | "fade_out"
  | "zoom_out"
  | "shake"
  | "pendulum"
  | "pulse";

export type CapCutSfxId =
  | "whoosh"
  | "riser"
  | "bass_drop"
  | "ding"
  | "lofi_beat";

/** Formats seconds into CapCut's HH:MM:SS:FF (30fps) timecode display (e.g. 00:02:17:21) */
export function formatCapCutTimecode(seconds: number, fps = 30): string {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  const frames = Math.min(fps - 1, Math.floor((safe % 1) * fps));
  return [
    hrs.toString().padStart(2, "0"),
    mins.toString().padStart(2, "0"),
    secs.toString().padStart(2, "0"),
    frames.toString().padStart(2, "0"),
  ].join(":");
}

/** Computes CSS clip-path string for CapCut Mask shapes */
export function getMaskClipPath(
  shape: CapCutMaskShape,
  sizePercent = 70,
  invert = false,
): string | undefined {
  if (shape === "none") return undefined;
  const s = Math.max(15, Math.min(100, sizePercent));
  const half = s / 2;
  const inset = (100 - s) / 2;

  if (invert) {
    // Inverted frame border clip
    return `polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% ${inset}%, ${inset}% ${inset}%, ${inset}% ${100 - inset}%, ${100 - inset}% ${100 - inset}%, ${100 - inset}% ${inset}%, 0% ${inset}%)`;
  }

  switch (shape) {
    case "linear":
      return `inset(0% 0% ${100 - s}% 0%)`;
    case "mirror":
      return `inset(${inset / 2}% 0% ${inset / 2}% 0%)`;
    case "circle":
      return `circle(${half}% at 50% 50%)`;
    case "rectangle":
      return `inset(${inset}% ${inset}% ${inset}% ${inset}% round 12px)`;
    case "heart":
      return `polygon(50% ${92 - inset * 0.4}%, ${15 + inset * 0.3}% ${55}%, ${10 + inset * 0.3}% ${30 + inset * 0.2}%, ${28 + inset * 0.2}% ${14 + inset * 0.2}%, 50% ${28 + inset * 0.2}%, ${72 - inset * 0.2}% ${14 + inset * 0.2}%, ${90 - inset * 0.3}% ${30 + inset * 0.2}%, ${85 - inset * 0.3}% ${55}%)`;
    case "star":
      return `polygon(50% ${8 + inset * 0.3}%, 61% 35%, ${92 - inset * 0.3}% 35%, 68% 57%, 79% ${90 - inset * 0.3}%, 50% 70%, 21% ${90 - inset * 0.3}%, 32% 57%, ${8 + inset * 0.3}% 35%, 39% 35%)`;
    default:
      return undefined;
  }
}

/** Applies a 2D Canvas clipping path for real video export when a CapCut Mask is active */
export function applyCanvasMask(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  shape: CapCutMaskShape,
  sizePercent = 70,
): void {
  if (shape === "none") return;
  const s = Math.max(15, Math.min(100, sizePercent)) / 100;
  const cx = width / 2;
  const cy = height / 2;
  ctx.beginPath();
  if (shape === "circle") {
    ctx.arc(cx, cy, (Math.min(width, height) / 2) * s, 0, Math.PI * 2);
  } else if (shape === "linear") {
    ctx.rect(0, 0, width, height * s);
  } else if (shape === "mirror") {
    const h = height * s;
    ctx.rect(0, (height - h) / 2, width, h);
  } else if (shape === "rectangle") {
    const rw = width * s;
    const rh = height * s;
    ctx.rect((width - rw) / 2, (height - rh) / 2, rw, rh);
  } else if (shape === "star" || shape === "heart") {
    const r = (Math.min(width, height) / 2) * s;
    const spikes = shape === "star" ? 5 : 8;
    for (let i = 0; i < spikes * 2; i++) {
      const rad = i % 2 === 0 ? r : r * 0.48;
      const angle = (i * Math.PI) / spikes - Math.PI / 2;
      const px = cx + Math.cos(angle) * rad;
      const py = cy + Math.sin(angle) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }
  ctx.clip();
}

/** Computes real-time animation offset (x, y, scale, rotate, opacity) for CapCut In/Out/Combo clip animations */
export function computeClipAnimation(
  localTime: number,
  clipDuration: number,
  animIn: CapCutAnimationId,
  animOut: CapCutAnimationId,
  animCombo: CapCutAnimationId,
  animDuration = 0.8,
): { x: number; y: number; scale: number; rotate: number; opacity: number } {
  let x = 0;
  let y = 0;
  let scale = 1;
  let rotate = 0;
  let opacity = 1;

  const dur = Math.max(0.15, Math.min(animDuration, clipDuration / 2));

  // In Animation
  if (animIn !== "none" && localTime < dur) {
    const p = Math.max(0, Math.min(1, localTime / dur)); // 0 -> 1
    const inv = 1 - p;
    if (animIn === "fade_in") opacity *= p;
    else if (animIn === "zoom_in") scale *= 0.5 + 0.5 * p;
    else if (animIn === "slide_left") x -= inv * 120;
    else if (animIn === "slide_up") y += inv * 120;
    else if (animIn === "spin_in") {
      rotate -= inv * 180;
      scale *= 0.6 + 0.4 * p;
    }
  }

  // Out Animation
  if (animOut !== "none" && clipDuration - localTime < dur) {
    const rem = Math.max(0, clipDuration - localTime);
    const p = Math.max(0, Math.min(1, rem / dur)); // 1 -> 0
    const inv = 1 - p;
    if (animOut === "fade_out") opacity *= p;
    else if (animOut === "zoom_out") scale *= 1 - 0.45 * inv;
    else if (animOut === "slide_left") x += inv * 120;
    else if (animOut === "slide_up") y -= inv * 120;
  }

  // Combo Animation
  if (animCombo !== "none") {
    if (animCombo === "shake") {
      x += Math.sin(localTime * 28) * 6;
      y += Math.cos(localTime * 34) * 4;
    } else if (animCombo === "pendulum") {
      rotate += Math.sin(localTime * 4) * 8;
    } else if (animCombo === "pulse") {
      scale *= 1 + Math.sin(localTime * 6) * 0.06;
    }
  }

  return { x, y, scale, rotate, opacity };
}

/** Generates a real playable WAV File in memory for built-in CapCut Sound Effects & Beats */
export function synthesizeCapCutSfxWav(sfx: CapCutSfxId): File {
  const sampleRate = 22050;
  const durationSeconds = sfx === "lofi_beat" ? 4.0 : sfx === "riser" ? 2.0 : 1.2;
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const progress = i / numSamples;
    let sample = 0;

    if (sfx === "whoosh") {
      const env = Math.sin(progress * Math.PI);
      const freq = 180 + 620 * Math.sin(progress * Math.PI);
      sample = (Math.sin(2 * Math.PI * freq * t) * 0.6 + (Math.random() * 2 - 1) * 0.35) * env;
    } else if (sfx === "riser") {
      const env = Math.pow(progress, 1.5);
      const freq = 140 + 880 * progress * progress;
      sample = Math.sin(2 * Math.PI * freq * t) * env * 0.75;
    } else if (sfx === "bass_drop") {
      const env = Math.exp(-t * 3.2);
      const freq = Math.max(38, 160 * Math.exp(-t * 2.4));
      sample = Math.sin(2 * Math.PI * freq * t) * env * 0.9;
    } else if (sfx === "ding") {
      const env = Math.exp(-t * 4.5);
      sample =
        (Math.sin(2 * Math.PI * 1046.5 * t) * 0.65 +
          Math.sin(2 * Math.PI * 2093 * t) * 0.35) *
        env;
    } else if (sfx === "lofi_beat") {
      const beatPos = (t * 2) % 1; // 120 BPM
      const kick = beatPos < 0.18 ? Math.sin(2 * Math.PI * (110 - beatPos * 350) * beatPos) * (1 - beatPos * 5) : 0;
      const chord =
        (Math.sin(2 * Math.PI * 261.63 * t) +
          Math.sin(2 * Math.PI * 329.63 * t) +
          Math.sin(2 * Math.PI * 392.0 * t)) *
        0.15;
      sample = Math.max(-1, Math.min(1, kick * 0.7 + chord));
    }

    const pcm = Math.max(-32768, Math.min(32767, Math.round(sample * 28000)));
    view.setInt16(44 + i * 2, pcm, true);
  }

  const labelMap: Record<CapCutSfxId, string> = {
    whoosh: "Saphir_Whoosh_SFX.wav",
    riser: "Cinematic_Riser.wav",
    bass_drop: "Sub_Bass_Drop.wav",
    ding: "Bright_Bell_Ding.wav",
    lofi_beat: "Saphir_Beat_Loop.wav",
  };

  return new File([buffer], labelMap[sfx], { type: "audio/wav" });
}
