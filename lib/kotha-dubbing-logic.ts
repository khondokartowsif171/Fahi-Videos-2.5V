export type VoicePersonaId = 'Kore' | 'Puck' | 'Charon' | 'Zephyr';

export type VoiceTone =
  | 'commercial'
  | 'explainer'
  | 'conversational'
  | 'documentary';

export type SceneVisualType = 'dynamic-ugc-stage' | 'custom-frame';

export interface SceneItem {
  id: string;
  sceneNumber: number;
  startTimeSec: number;
  endTimeSec: number;
  timeRangeLabel: string;
  titleEn: string;
  titleBn: string;
  visualCaptureDescription: string;
  onScreenText: string;
  englishSummary: string;
  banglaScript: string;
  phoneticGuide: string;
  visualType: SceneVisualType;
  keyMetrics: string[];
  status: 'pending' | 'generating' | 'ready' | 'error';
  audioUrl?: string;
  audioRawBytes?: Uint8Array;
  audioWavBytes?: Uint8Array;
  audioMimeType?: string;
  audioDurationSec?: number;
  voiceUsed?: VoicePersonaId;
  toneUsed?: VoiceTone;
  sourceEngine?: 'gemini-tts' | 'neural-bangla-stream' | 'synthesized-wav';
  customFrameDataUrl?: string;
}

export interface VoicePersona {
  id: VoicePersonaId;
  nameBn: string;
  nameEn: string;
  gender: 'Female' | 'Male';
  roleBn: string;
  roleEn: string;
  stylePrompt: string;
  basePitchHz: number;
  speechRateDefault: number;
}

export const VOICE_PERSONAS: VoicePersona[] = [
  {
    id: 'Kore',
    nameBn: 'নুসরাত জাহান',
    nameEn: 'Nusrat Jahan (Kore)',
    gender: 'Female',
    roleBn: 'প্রাণবন্ত ব্র্যান্ড নেরেটর · ঢাকা প্রমিত উচ্চারণ',
    roleEn: 'Bright Brand Narrator · Standard Bangladeshi Accent',
    stylePrompt:
      'Clear, warm, natural Bangladeshi Bengali commercial voiceover artist with articulate Dhaka pronunciation and engaging pacing',
    basePitchHz: 215,
    speechRateDefault: 1.0,
  },
  {
    id: 'Puck',
    nameBn: 'তানভীর আহমেদ',
    nameEn: 'Tanvir Ahmed (Puck)',
    gender: 'Male',
    roleBn: 'টেক ও স্টার্টআপ প্রেজেন্টার · আধুনিক প্রমিত বাংলা',
    roleEn: 'Dynamic SaaS & Tech Presenter · Modern Bangladeshi Accent',
    stylePrompt:
      'Energetic, confident Bangladeshi male tech presenter speaking natural fluent Bengali with crisp emphasis on key product benefits',
    basePitchHz: 135,
    speechRateDefault: 1.02,
  },
  {
    id: 'Charon',
    nameBn: 'রাশেদ করিম',
    nameEn: 'Rashed Karim (Charon)',
    gender: 'Male',
    roleBn: 'গম্ভীর প্রামাণ্য ও এন্টারপ্রাইজ ভয়েস',
    roleEn: 'Deep Documentary & Enterprise Narrator',
    stylePrompt:
      'Deep, authoritative, trustworthy Bangladeshi Bengali narrator suitable for enterprise cloud and B2B software commercials',
    basePitchHz: 112,
    speechRateDefault: 0.96,
  },
  {
    id: 'Zephyr',
    nameBn: 'তাসনিম তাবাসসুম',
    nameEn: 'Tasnim Tabassum (Zephyr)',
    gender: 'Female',
    roleBn: 'সাবলীল কথোপকথন ও স্টোরিটেলিং ভয়েস',
    roleEn: 'Conversational Storyteller & Product Guide',
    stylePrompt:
      'Friendly, conversational Bangladeshi female voiceover with natural breathing pauses and warm customer-centric intonation',
    basePitchHz: 232,
    speechRateDefault: 1.0,
  },
];

export const TONE_PRESETS: {
  id: VoiceTone;
  labelBn: string;
  labelEn: string;
  description: string;
}[] = [
  {
    id: 'commercial',
    labelBn: 'বিজ্ঞাপনী প্রাণবন্ত (Commercial Promo)',
    labelEn: 'Commercial Promo',
    description: 'High-conversion D2C & SaaS promotional energy',
  },
  {
    id: 'explainer',
    labelBn: 'প্রযুক্তি বিশ্লেষক (Tech Explainer)',
    labelEn: 'Tech Explainer',
    description: 'Clear step-by-step product walkthrough tone',
  },
  {
    id: 'conversational',
    labelBn: 'সাবলীল কথোপকথন (Natural Deshi)',
    labelEn: 'Conversational Bangladeshi',
    description: 'Warm, relatable everyday Dhaka business tone',
  },
  {
    id: 'documentary',
    labelBn: 'প্রামাণ্য ও গম্ভীর (Executive Brief)',
    labelEn: 'Executive Brief',
    description: 'Measured, authoritative enterprise narration',
  },
];

/**
 * Formats seconds (e.g. 65) into MM:SS string ("01:05").
 */
export function formatTimestamp(seconds: number): string {
  const safe = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Parses "MM:SS" or "HH:MM:SS" into total seconds.
 */
export function parseTimestampToSeconds(ts: string): number {
  const cleaned = ts.trim();
  if (!cleaned) return 0;
  const parts = cleaned.split(':').map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n) || n < 0)) return 0;
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

/**
 * Formats seconds into SRT timestamp "HH:MM:SS,mmm".
 */
export function formatSrtTimestamp(seconds: number): string {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const totalMs = Math.round(safe * 1000);
  const hrs = Math.floor(totalMs / 3600000);
  const remAfterHrs = totalMs % 3600000;
  const mins = Math.floor(remAfterHrs / 60000);
  const remAfterMins = remAfterHrs % 60000;
  const secs = Math.floor(remAfterMins / 1000);
  const ms = remAfterMins % 1000;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

/**
 * Generates standard .srt subtitle file content from scene items.
 */
export function generateSrtSubtitles(
  scenes: Pick<SceneItem, 'sceneNumber' | 'startTimeSec' | 'endTimeSec' | 'banglaScript' | 'titleEn'>[],
  bilingual = false
): string {
  return scenes
    .map((scene, idx) => {
      const index = idx + 1;
      const start = formatSrtTimestamp(scene.startTimeSec);
      const end = formatSrtTimestamp(Math.max(scene.startTimeSec + 1, scene.endTimeSec));
      const text = bilingual
        ? `${scene.banglaScript.trim()}\n[${scene.titleEn.trim()}]`
        : scene.banglaScript.trim();
      return `${index}\n${start} --> ${end}\n${text}`;
    })
    .join('\n\n');
}

/**
 * Estimates natural Bangladeshi Bengali speech duration in seconds based on word count and punctuation.
 */
export function estimateBanglaSpeechDuration(
  banglaText: string,
  speedMultiplier = 1.0
): number {
  const trimmed = banglaText.trim();
  if (!trimmed) return 0;
  const words = trimmed.split(/\s+/).filter(Boolean).length;
  const pauseMatches = trimmed.match(/[।,!?—-]/g);
  const pauseCount = pauseMatches ? pauseMatches.length : 0;
  const safeSpeed = Math.max(0.5, Math.min(2.0, speedMultiplier || 1.0));
  // Average natural Bengali narration rate is ~2.4 words/sec plus punctuation pauses
  const rawSeconds = words / 2.4 + pauseCount * 0.28;
  return Number(Math.max(1.5, rawSeconds / safeSpeed).toFixed(1));
}

/**
 * Splits a Bengali narration paragraph into sentence/clause chunks <= maxChars
 * so TTS endpoints process the full script smoothly without truncation.
 */
export function splitBanglaTextIntoTtsChunks(
  text: string,
  maxChars = 170
): string[] {
  const cleaned = text.trim().replace(/\s+/g, ' ');
  if (!cleaned) return [];
  if (cleaned.length <= maxChars) return [cleaned];

  const rawSentences = cleaned.split(/(?<=[।!?—;])\s*/u).filter(Boolean);
  const chunks: string[] = [];
  let current = '';

  for (const sentence of rawSentences) {
    if ((current + ' ' + sentence).trim().length <= maxChars) {
      current = (current + ' ' + sentence).trim();
    } else {
      if (current) chunks.push(current);
      if (sentence.length <= maxChars) {
        current = sentence;
      } else {
        // Split long sentence by words
        const words = sentence.split(' ');
        let sub = '';
        for (const w of words) {
          if ((sub + ' ' + w).trim().length <= maxChars) {
            sub = (sub + ' ' + w).trim();
          } else {
            if (sub) chunks.push(sub);
            sub = w;
          }
        }
        current = sub;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/**
 * Adapts a scene's Bangladeshi Bengali script according to the selected VoiceTone.
 */
export function adaptToneInBangla(
  englishSummary: string,
  currentBangla: string,
  tone: VoiceTone
): string {
  const base = currentBangla.trim();
  if (!base) {
    return 'এই দৃশ্যে আমাদের আধুনিক এআই প্ল্যাটফর্মের মাধ্যমে স্বয়ংক্রিয় কাস্টমার সার্ভিস ও দ্রুত অর্ডার প্রসেসিং তুলে ধরা হয়েছে।';
  }

  // Strip existing tone prefixes/suffixes if re-applying
  const cleaned = base
    .replace(/^(দেখুন, |চলুন দেখে নিই, |বিশেষভাবে লক্ষ্য করুন— |এক নজরে দেখে নিন, )/u, '')
    .replace(/ (আজই শুরু করুন!|যা আপনার ব্যবসাকে এগিয়ে রাখবে সবসময়।|একদম নিমেষেই!)$/u, '');

  switch (tone) {
    case 'commercial':
      return `${cleaned} আজই শুরু করুন!`;
    case 'explainer':
      return `চলুন দেখে নিই, ${cleaned}`;
    case 'conversational':
      return `দেখুন, ${cleaned} একদম নিমেষেই!`;
    case 'documentary':
      return `বিশেষভাবে লক্ষ্য করুন— ${cleaned} যা আপনার ব্যবসাকে এগিয়ে রাখবে সবসময়।`;
    default:
      return base;
  }
}

/**
 * Filters scenes by search query (matches Bengali script, English title/summary, or timestamp) and status.
 */
export function filterScenes(
  scenes: SceneItem[],
  query: string,
  statusFilter: 'all' | 'ready' | 'pending'
): SceneItem[] {
  const q = query.trim().toLowerCase();
  return scenes.filter((scene) => {
    if (statusFilter === 'ready' && scene.status !== 'ready') return false;
    if (statusFilter === 'pending' && scene.status === 'ready') return false;
    if (!q) return true;
    return (
      scene.titleEn.toLowerCase().includes(q) ||
      scene.titleBn.toLowerCase().includes(q) ||
      scene.banglaScript.toLowerCase().includes(q) ||
      scene.englishSummary.toLowerCase().includes(q) ||
      scene.onScreenText.toLowerCase().includes(q) ||
      scene.timeRangeLabel.toLowerCase().includes(q)
    );
  });
}

/**
 * Creates a valid 24kHz 16-bit mono RIFF WAV buffer with natural syllable-cadence prosody
 * so that audio playback, waveform visualization, and WAV export always work reliably.
 */
export function createSynthesizedSpeechWav(
  text: string,
  durationSec = 4.5,
  baseFreqHz = 185
): Uint8Array {
  const sampleRate = 24000;
  const clampedDuration = Math.max(1.2, Math.min(20, durationSec));
  const numSamples = Math.floor(sampleRate * clampedDuration);
  const dataByteLength = numSamples * 2; // 16-bit mono = 2 bytes per sample
  const buffer = new ArrayBuffer(44 + dataByteLength);
  const view = new DataView(buffer);

  // RIFF identifier
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataByteLength, true);
  writeAscii(view, 8, 'WAVE');
  // fmt chunk
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // AudioFormat = 1 (PCM)
  view.setUint16(22, 1, true); // NumChannels = 1 (Mono)
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample = 16
  // data chunk
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataByteLength, true);

  const words = text.trim().split(/\s+/).filter(Boolean);
  const syllableCount = Math.max(4, words.length * 2);

  let phase1 = 0;
  let phase2 = 0;
  let phase3 = 0;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const progress = t / clampedDuration;

    // Syllable cadence envelope (simulating natural speech bursts and micro-pauses)
    const syllablePos = t * (syllableCount / clampedDuration);
    const syllableIndex = Math.floor(syllablePos);
    const syllableFrac = syllablePos - syllableIndex;
    const charCodeSeed =
      text.charCodeAt(syllableIndex % Math.max(1, text.length)) || 100;

    const isMicroPause = syllableIndex % 6 === 5 && syllableFrac > 0.45;
    const syllableEnv = isMicroPause
      ? 0.02
      : Math.sin(Math.min(1, syllableFrac * 1.15) * Math.PI) ** 0.75;

    // Global fade-in / fade-out
    const globalEnv =
      t < 0.08
        ? t / 0.08
        : t > clampedDuration - 0.15
          ? Math.max(0, (clampedDuration - t) / 0.15)
          : 1.0;

    // Intonation contour (natural declarative fall + slight pitch modulation per syllable)
    const pitchMod =
      1 +
      0.08 * Math.sin(2 * Math.PI * 1.8 * t) +
      ((charCodeSeed % 17) - 8) * 0.008 -
      0.06 * progress;

    const f0 = baseFreqHz * pitchMod;
    const f1 = f0 * 2.0; // First harmonic / formant
    const f2 = f0 * 3.0; // Second harmonic

    phase1 += (2 * Math.PI * f0) / sampleRate;
    phase2 += (2 * Math.PI * f1) / sampleRate;
    phase3 += (2 * Math.PI * f2) / sampleRate;

    const rawSignal =
      0.55 * Math.sin(phase1) +
      0.28 * Math.sin(phase2) +
      0.12 * Math.sin(phase3);

    const sampleValue = Math.max(
      -1,
      Math.min(1, rawSignal * syllableEnv * globalEnv * 0.35)
    );
    view.setInt16(44 + i * 2, Math.round(sampleValue * 32767), true);
  }

  return new Uint8Array(buffer);
}

/**
 * Merges multiple 24kHz 16-bit mono WAV buffers into a single master WAV buffer
 * by stripping the 44-byte RIFF header from subsequent clips and updating the RIFF/data sizes.
 */
export function mergeWavBuffers(wavBuffers: Uint8Array[]): Uint8Array {
  const validBuffers = wavBuffers.filter((b) => b && b.byteLength > 44);
  if (validBuffers.length === 0) {
    return createSynthesizedSpeechWav('অরা এজেন্টিক এআই ক্লাউড', 1.5, 180);
  }
  if (validBuffers.length === 1) {
    return new Uint8Array(validBuffers[0]);
  }

  // Add a 0.25s silence gap (24000 * 0.25 * 2 = 12000 bytes) between scenes
  const silenceBytes = 12000;
  let totalPcmBytes = 0;
  for (let i = 0; i < validBuffers.length; i++) {
    totalPcmBytes += validBuffers[i].byteLength - 44;
    if (i < validBuffers.length - 1) {
      totalPcmBytes += silenceBytes;
    }
  }

  const merged = new Uint8Array(44 + totalPcmBytes);
  // Copy 44-byte header from first WAV clip
  merged.set(validBuffers[0].subarray(0, 44), 0);

  let offset = 44;
  for (let i = 0; i < validBuffers.length; i++) {
    const pcmSlice = validBuffers[i].subarray(44);
    merged.set(pcmSlice, offset);
    offset += pcmSlice.byteLength;
    if (i < validBuffers.length - 1) {
      // Zero-filled gap for natural pause between scenes
      offset += silenceBytes;
    }
  }

  // Update RIFF chunk size (offset 4) and data subchunk size (offset 40)
  const view = new DataView(merged.buffer, merged.byteOffset, merged.byteLength);
  view.setUint32(4, 36 + totalPcmBytes, true);
  view.setUint32(40, totalPcmBytes, true);

  return merged;
}

function writeAscii(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

export type EcommerceCategory =
  | ''
  | 'skincare'
  | 'fashion'
  | 'gadgets'
  | 'food'
  | 'saas';

export type UgcSceneStage =
  | 'hook'
  | 'problem'
  | 'showcase'
  | 'social-proof'
  | 'cta';

export interface EcommerceUgcBrief {
  productName: string;
  category: EcommerceCategory;
  offerPriceBn: string;
  ctaTextBn: string;
  deliveryNoteBn: string;
  tone: VoiceTone;
}

export interface CapturedFrameSample {
  timeRangeLabel: string;
  startTimeSec: number;
  endTimeSec: number;
  imageDataUrl?: string;
  brightnessScore?: number;
  motionDeltaScore?: number;
  dominantColorHex?: string;
}

export const ECOMMERCE_CATEGORIES: {
  id: EcommerceCategory;
  labelBn: string;
  labelEn: string;
}[] = [
  {
    id: '',
    labelBn: 'ক্যাটাগরি নির্বাচন করুন (ঐচ্ছিক / যেকোনো ভিডিও)',
    labelEn: 'General / Any Video (No Preset)',
  },
  {
    id: 'skincare',
    labelBn: 'স্কিনকেয়ার ও বিউটি (Skincare & Beauty)',
    labelEn: 'Skincare & Beauty',
  },
  {
    id: 'fashion',
    labelBn: 'ফ্যাশন ও লাইফস্টাইল (Fashion & Apparel)',
    labelEn: 'Fashion & Apparel',
  },
  {
    id: 'gadgets',
    labelBn: 'গ্যাজেট ও ইলেকট্রনিক্স (Tech & Gadgets)',
    labelEn: 'Tech & Gadgets',
  },
  {
    id: 'food',
    labelBn: 'অর্গানিক ফুড ও গ্রোসারি (Organic Food)',
    labelEn: 'Organic Food & Grocery',
  },
  {
    id: 'saas',
    labelBn: 'বিজনেস, সফটওয়্যার ও সার্ভিস (Business & SaaS)',
    labelEn: 'Business, SaaS & Service',
  },
];

const STAGE_ORDER: UgcSceneStage[] = [
  'hook',
  'problem',
  'showcase',
  'social-proof',
  'cta',
];

/**
 * Maps an index in a N-scene video into a canonical narrative/UGC stage
 * (Hook -> Problem -> Showcase -> Social Proof -> CTA).
 */
export function resolveUgcStageForScene(
  sceneIndex: number,
  totalScenes: number
): UgcSceneStage {
  if (totalScenes <= 1) return 'showcase';
  if (sceneIndex === 0) return 'hook';
  if (sceneIndex === totalScenes - 1) return 'cta';
  const middleRatio = sceneIndex / Math.max(1, totalScenes - 1);
  if (middleRatio < 0.38) return 'problem';
  if (middleRatio < 0.72) return 'showcase';
  return 'social-proof';
}

/**
 * Generates dynamic Bangladeshi Bengali scenes from uploaded video frames.
 * - If the user leaves product/offer fields blank (default), it generates clean, general
 *   scene-by-scene narration without any hardcoded product, price, or offer text.
 * - If the user explicitly provides product/offer/CTA details, it weaves those exact
 *   user-provided details into the narration.
 */
export function buildDynamicEcommerceUgcScenes(
  frames: CapturedFrameSample[],
  brief: EcommerceUgcBrief,
  startingSceneNumber = 1
): SceneItem[] {
  const customProduct = brief.productName.trim();
  const customOffer = brief.offerPriceBn.trim();
  const customDelivery = brief.deliveryNoteBn.trim();
  const customCta = brief.ctaTextBn.trim();
  const hasCustomBrief = Boolean(
    customProduct || customOffer || customDelivery || customCta
  );

  const safeFrames: CapturedFrameSample[] =
    frames.length > 0
      ? frames
      : [
          { timeRangeLabel: '00:00 - 00:04', startTimeSec: 0, endTimeSec: 4 },
          { timeRangeLabel: '00:04 - 00:08', startTimeSec: 4, endTimeSec: 8 },
          { timeRangeLabel: '00:08 - 00:13', startTimeSec: 8, endTimeSec: 13 },
          { timeRangeLabel: '00:13 - 00:17', startTimeSec: 13, endTimeSec: 17 },
          { timeRangeLabel: '00:17 - 00:22', startTimeSec: 17, endTimeSec: 22 },
        ];

  return safeFrames.map((frame, idx) => {
    const stage = resolveUgcStageForScene(idx, safeFrames.length);
    const sceneNumber = startingSceneNumber + idx;

    let titleEn = '';
    let titleBn = '';
    let englishSummary = '';
    let baseBanglaScript = '';
    let phoneticGuide = '';
    let onScreenText = '';

    if (!hasCustomBrief) {
      // Pure Video Frame Narration Mode (Zero hardcoded product, price, or offer)
      switch (stage) {
        case 'hook':
          titleEn = `Scene ${sceneNumber}: Opening Visual & Introduction`;
          titleBn = `দৃশ্য ${sceneNumber}: ভিডিওর সূচনা ও মূল উপস্থাপনা`;
          onScreenText = `Opening Frame · ${frame.timeRangeLabel}`;
          englishSummary = `Opening video segment (${frame.timeRangeLabel}) introducing the presenter and core subject.`;
          baseBanglaScript =
            'আসসালামু আলাইকুম! ভিডিওর এই শুরুতেই আমরা আজকের মূল বিষয়বস্তু এবং আকর্ষণীয় উপস্থাপনাটি এক নজরে দেখে নিচ্ছি।';
          phoneticGuide =
            'Assalamu Alaikum! Videor ei shurutei amra ajker mul bishoybostu dekhe nicchi.';
          break;

        case 'problem':
          titleEn = `Scene ${sceneNumber}: Context & Key Discussion`;
          titleBn = `দৃশ্য ${sceneNumber}: প্রেক্ষাপট ও গুরুত্বপূর্ণ আলোচনা`;
          onScreenText = `Key Context · ${frame.timeRangeLabel}`;
          englishSummary = `Visual segment (${frame.timeRangeLabel}) highlighting the main context and key points being discussed on screen.`;
          baseBanglaScript =
            'এই অংশে অত্যন্ত স্পষ্টভাবে তুলে ধরা হয়েছে কেন এই বিষয়টি গুরুত্বপূর্ণ এবং কীভাবে এটি বাস্তব ক্ষেত্রে কার্যকর সমাধান দেয়।';
          phoneticGuide =
            'Ei ongshe sporshtobhabe tule dhora hoyeche keno ei bishoyti gurotopurno.';
          break;

        case 'showcase':
          titleEn = `Scene ${sceneNumber}: Visual Demonstration & Details`;
          titleBn = `দৃশ্য ${sceneNumber}: সরাসরি প্রদর্শনী ও বিস্তারিত বিশ্লেষণ`;
          onScreenText = `Visual Focus · ${frame.timeRangeLabel}`;
          englishSummary = `Core visual demonstration at ${frame.timeRangeLabel} showing the main action and detailed workflow.`;
          baseBanglaScript =
            'ভিডিওর এই দৃশ্যে সরাসরি মূল কার্যক্রম এবং এর প্রতিটি ধাপ খুব সহজ ও সুন্দরভাবে উপস্থাপন করা হয়েছে।';
          phoneticGuide =
            'Videor ei drishye shorashori mul karjokrom khub shohojbhabe uposthapon kora hoyeche.';
          break;

        case 'social-proof':
          titleEn = `Scene ${sceneNumber}: Key Highlights & Impact`;
          titleBn = `দৃশ্য ${sceneNumber}: মূল বৈশিষ্ট্য ও ইতিবাচক ফলাফল`;
          onScreenText = `Key Highlights · ${frame.timeRangeLabel}`;
          englishSummary = `Segment (${frame.timeRangeLabel}) emphasizing practical results, reliability, and key takeaways.`;
          baseBanglaScript =
            'এখানে আমরা দেখতে পাচ্ছি এর বাস্তব কার্যকারিতা ও চমৎকার ফলাফল, যা পুরো প্রক্রিয়াটিকে আরও নির্ভরযোগ্য করে তোলে।';
          phoneticGuide =
            'Ekhane amra dekhte pacchi er bastob karjokarita o chomotkar folafol.';
          break;

        case 'cta':
        default:
          titleEn = `Scene ${sceneNumber}: Final Summary & Closing`;
          titleBn = `দৃশ্য ${sceneNumber}: চূড়ান্ত বার্তা ও সমাপনী`;
          onScreenText = `Closing Frame · ${frame.timeRangeLabel}`;
          englishSummary = `Closing video segment (${frame.timeRangeLabel}) wrapping up the presentation with a clear final message.`;
          baseBanglaScript =
            'পরিশেষে, সম্পূর্ণ ভিডিওর মূল বার্তাটি এখানেই সুন্দরভাবে শেষ হচ্ছে। আমাদের সাথে থাকার জন্য আপনাকে অসংখ্য ধন্যবাদ!';
          phoneticGuide =
            'Porisheshe, sompurno videor mul bartati ekhanei sundorbhabe shesh hocche. Dhonyobad!';
          break;
      }
    } else {
      // Custom User-Provided Product / Offer Mode (Uses ONLY what the user entered)
      const productLabel = customProduct || 'আমাদের বিশেষ আয়োজন';
      const offerClause = customOffer ? ` এখন পাচ্ছেন ${customOffer}।` : '';
      const deliveryClause = customDelivery
        ? ` সাথে থাকছে ${customDelivery}।`
        : '';
      const ctaClause = customCta ? ` ${customCta}!` : '';

      switch (stage) {
        case 'hook':
          titleEn = `Scene ${sceneNumber}: ${productLabel} — Opening Hook`;
          titleBn = `দৃশ্য ${sceneNumber}: ${productLabel}-এর প্রথম ঝলক`;
          onScreenText = [productLabel, customOffer, frame.timeRangeLabel]
            .filter(Boolean)
            .join(' · ');
          englishSummary = `Opening frame (${frame.timeRangeLabel}) introducing ${productLabel}.`;
          baseBanglaScript = `আসসালামু আলাইকুম! আজকের ভিডিওতে আমরা দেখে নেব ${productLabel}-এর দারুণ সব বৈশিষ্ট্য ও চমকপ্রদ দিকগুলো।`;
          phoneticGuide = `Assalamu Alaikum! Ajker videote amra dekhe nebo ${productLabel}-er darun shob boishishtyo.`;
          break;

        case 'problem':
          titleEn = `Scene ${sceneNumber}: Why ${productLabel} Stands Out`;
          titleBn = `দৃশ্য ${sceneNumber}: কেন ${productLabel} সেরা পছন্দ`;
          onScreenText = [productLabel, frame.timeRangeLabel]
            .filter(Boolean)
            .join(' · ');
          englishSummary = `Segment (${frame.timeRangeLabel}) explaining the value and quality of ${productLabel}.`;
          baseBanglaScript = `${productLabel} আপনাকে দিচ্ছে নির্ভরযোগ্য মান এবং আধুনিক সমাধান, যা আপনার প্রতিদিনের প্রয়োজন মেটাবে খুব সহজেই।`;
          phoneticGuide = `${productLabel} apnake dicche nirbhorjogyo man ebong adhunik shomadhan.`;
          break;

        case 'showcase':
          titleEn = `Scene ${sceneNumber}: ${productLabel} Live Showcase`;
          titleBn = `দৃশ্য ${sceneNumber}: সরাসরি ডেমো ও মূল বৈশিষ্ট্য (${productLabel})`;
          onScreenText = [productLabel, frame.timeRangeLabel]
            .filter(Boolean)
            .join(' · ');
          englishSummary = `Demonstration at ${frame.timeRangeLabel} highlighting ${productLabel} in action.`;
          baseBanglaScript = `ভিডিওতে সরাসরি দেখুন ${productLabel}-এর চমৎকার ফিনিশিং ও কার্যকারিতা, যা প্রথম দেখাতেই নজর কাড়ে।`;
          phoneticGuide = `Videote shorashori dekhun ${productLabel}-er chomotkar finishing o karjokarita.`;
          break;

        case 'social-proof':
          titleEn = `Scene ${sceneNumber}: Quality & Customer Assurance`;
          titleBn = `দৃশ্য ${sceneNumber}: মান যাচাই ও আস্থার নিশ্চয়তা`;
          onScreenText = [customDelivery || productLabel, frame.timeRangeLabel]
            .filter(Boolean)
            .join(' · ');
          englishSummary = `Assurance segment (${frame.timeRangeLabel}) for ${productLabel}.`;
          baseBanglaScript = `${productLabel}-এর গুণগত মান নিয়ে আপনি থাকতে পারেন শতভাগ নিশ্চিন্ত।${deliveryClause}`;
          phoneticGuide = `${productLabel}-er gunogoto man niye apni thakte paren shotobhag nishchinto.`;
          break;

        case 'cta':
        default:
          titleEn = `Scene ${sceneNumber}: Closing & Action (${productLabel})`;
          titleBn = `দৃশ্য ${sceneNumber}: চূড়ান্ত আহ্বান ও সমাপনী`;
          onScreenText = [customOffer, customCta, frame.timeRangeLabel]
            .filter(Boolean)
            .join(' · ');
          englishSummary = `Closing call-to-action scene (${frame.timeRangeLabel}) for ${productLabel}.`;
          baseBanglaScript = `তাই আর দেরি না করে আজই সংগ্রহ করুন ${productLabel}!${offerClause}${ctaClause}`;
          phoneticGuide = `Tai ar deri na kore ajoi songroho korun ${productLabel}!`;
          break;
      }
    }

    const adaptedScript =
      brief.tone === 'commercial'
        ? baseBanglaScript
        : adaptToneInBangla(englishSummary, baseBanglaScript, brief.tone);

    return {
      id: `ugc-scene-${Date.now()}-${idx}`,
      sceneNumber,
      startTimeSec: frame.startTimeSec,
      endTimeSec: frame.endTimeSec,
      timeRangeLabel: frame.timeRangeLabel,
      titleEn,
      titleBn,
      visualCaptureDescription: `Captured video scene ${STAGE_ORDER.includes(stage) ? stage.toUpperCase() : 'SCENE'} at ${frame.timeRangeLabel}`,
      onScreenText,
      englishSummary,
      banglaScript: adaptedScript,
      phoneticGuide,
      visualType: frame.imageDataUrl ? 'custom-frame' : 'dynamic-ugc-stage',
      keyMetrics: [
        frame.timeRangeLabel,
        stage.toUpperCase(),
        ...(brief.category ? [brief.category.toUpperCase()] : []),
      ],
      status: 'pending',
      customFrameDataUrl: frame.imageDataUrl,
    };
  });
}

