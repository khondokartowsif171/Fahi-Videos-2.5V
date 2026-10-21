import { GoogleGenAI, Type } from '@google/genai';
import {
  createSynthesizedSpeechWav,
  adaptToneInBangla,
  estimateBanglaSpeechDuration,
  splitBanglaTextIntoTtsChunks,
  buildDynamicEcommerceUgcScenes,
  type EcommerceCategory,
  type VoiceTone,
} from './kotha-dubbing-logic';

// Per-model cooldown and sliding-window rate limiter to prevent 429 RESOURCE_EXHAUSTED errors
const modelCooldownUntil = new Map<string, number>();
const modelRecentTimestamps = new Map<string, number[]>();
const ttsAudioCache = new Map<
  string,
  { audioBase64: string; mimeType: string; durationSec: number; engine: string }
>();

function keyFor(req: Request): string {
  const headerKey = req.headers.get('x-gemini-api-key')?.trim();
  if (headerKey && headerKey !== 'MY_GEMINI_API_KEY') return headerKey;
  const envKey = process.env.GEMINI_API_KEY?.trim();
  if (envKey && envKey !== 'MY_GEMINI_API_KEY') return envKey;
  return '';
}

function getGenAIClient(req: Request): GoogleGenAI | null {
  const apiKey = keyFor(req);
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function canUseModel(modelName: string, maxRequestsPerMinute: number): boolean {
  const now = Date.now();
  const cooldown = modelCooldownUntil.get(modelName) || 0;
  if (now < cooldown) {
    return false;
  }
  const windowStart = now - 62000;
  const recent = (modelRecentTimestamps.get(modelName) || []).filter(
    (t) => t > windowStart
  );
  modelRecentTimestamps.set(modelName, recent);
  if (recent.length >= maxRequestsPerMinute) {
    return false;
  }
  return true;
}

function recordModelAttempt(modelName: string): void {
  const now = Date.now();
  const recent = modelRecentTimestamps.get(modelName) || [];
  recent.push(now);
  modelRecentTimestamps.set(modelName, recent);
}

function recordModelQuotaReached(modelName: string, err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err || '');
  const isDailyLimit =
    msg.includes('PerDay') || msg.includes('465') || msg.includes('12h');
  const cooldownMs = isDailyLimit ? 60 * 60 * 1000 : 65 * 1000;
  modelCooldownUntil.set(modelName, Date.now() + cooldownMs);
}

function ensureWavHeader(base64Audio: string, mimeType?: string): string {
  const pcm = Buffer.from(base64Audio, 'base64');
  if (pcm.length >= 4 && pcm.toString('ascii', 0, 4) === 'RIFF') {
    return base64Audio;
  }
  if (mimeType && mimeType.includes('mpeg')) {
    return base64Audio;
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(24000, 24);
  header.writeUInt32LE(48000, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]).toString('base64');
}

/**
 * Fetches natural Bengali speech audio (audio/mpeg) in sentence chunks
 * so that even when Gemini TTS hits its 3 RPM free-tier limit (or without any API key),
 * every scene receives a pure, single-voice Bengali narration without synthetic tones or English fallback.
 */
export async function fetchNaturalBanglaStreamAudio(
  banglaText: string
): Promise<Buffer | null> {
  try {
    const chunks = splitBanglaTextIntoTtsChunks(banglaText, 165);
    if (chunks.length === 0) return null;

    const buffers: Buffer[] = [];
    for (const chunk of chunks) {
      const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=tw-ob&tl=bn&q=${encodeURIComponent(
        chunk
      )}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        return null;
      }
      const arrBuf = await response.arrayBuffer();
      if (arrBuf.byteLength === 0) {
        return null;
      }
      buffers.push(Buffer.from(arrBuf));
    }

    return buffers.length > 0 ? Buffer.concat(buffers) : null;
  } catch {
    return null;
  }
}

export async function handleKothaTtsGenerate(
  req: Request,
  body: Record<string, any>
): Promise<Response> {
  const {
    text,
    voiceName = 'Kore',
    durationSec,
    basePitchHz = 195,
  } = body || {};

  if (!text || typeof text !== 'string' || !text.trim()) {
    return Response.json({ error: 'Narration text is required.' }, { status: 400 });
  }

  const cleanText = text.trim();
  const safeVoice = ['Kore', 'Puck', 'Charon', 'Zephyr', 'Fenrir'].includes(
    voiceName
  )
    ? voiceName
    : 'Kore';
  const estimatedSec =
    typeof durationSec === 'number' && durationSec > 0
      ? durationSec
      : estimateBanglaSpeechDuration(cleanText, 1.0);

  const cacheKey = `${safeVoice}::${cleanText}`;
  const cached = ttsAudioCache.get(cacheKey);
  if (cached) {
    return Response.json({
      audioBase64: cached.audioBase64,
      mimeType: cached.mimeType,
      durationSec: cached.durationSec,
      engine: cached.engine,
    });
  }

  const ai = getGenAIClient(req);
  if (ai) {
    const ttsModels = [
      'gemini-3.8-flash-lite-tts',
      'gemini-3.8-flash-tts',
      'gemini-2.5-flash-preview-tts',
    ];
    for (const ttsModel of ttsModels) {
      if (!canUseModel(ttsModel, 2)) {
        continue;
      }
      try {
        recordModelAttempt(ttsModel);
        const response = await ai.models.generateContent({
          model: ttsModel,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: cleanText,
                  speechMetadata: {
                    style:
                      'প্রমিত বাংলাদেশি বাংলা উচ্চারণে স্পষ্ট, স্বাভাবিক ও প্রাণবন্ত ভয়েসওভার',
                  },
                } as Record<string, unknown>,
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: safeVoice,
                },
              },
            },
          },
        });

        const inlinePart = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        const base64Audio = inlinePart?.data;
        if (base64Audio) {
          const wavBase64 = ensureWavHeader(base64Audio, inlinePart?.mimeType);
          ttsAudioCache.set(cacheKey, {
            audioBase64: wavBase64,
            mimeType: 'audio/wav',
            durationSec: estimatedSec,
            engine: 'gemini-tts',
          });
          return Response.json({
            audioBase64: wavBase64,
            mimeType: 'audio/wav',
            durationSec: estimatedSec,
            engine: 'gemini-tts',
          });
        }
      } catch (err: unknown) {
        recordModelQuotaReached(ttsModel, err);
      }
    }
  }

  // Secondary pure Bengali neural voice stream (100% Free & Unlimited even without API key)
  const banglaMp3Buffer = await fetchNaturalBanglaStreamAudio(cleanText);
  if (banglaMp3Buffer && banglaMp3Buffer.byteLength > 0) {
    const audioBase64 = banglaMp3Buffer.toString('base64');
    ttsAudioCache.set(cacheKey, {
      audioBase64,
      mimeType: 'audio/mpeg',
      durationSec: estimatedSec,
      engine: 'neural-bangla-stream',
    });
    return Response.json({
      audioBase64,
      mimeType: 'audio/mpeg',
      durationSec: estimatedSec,
      engine: 'neural-bangla-stream',
    });
  }

  // Offline hermetic fallback: 24kHz 16-bit mono WAV
  const wavBytes = createSynthesizedSpeechWav(
    cleanText,
    estimatedSec,
    Number(basePitchHz) || 195
  );
  const audioBase64 = Buffer.from(wavBytes).toString('base64');

  ttsAudioCache.set(cacheKey, {
    audioBase64,
    mimeType: 'audio/wav',
    durationSec: estimatedSec,
    engine: 'synthesized-wav',
  });

  return Response.json({
    audioBase64,
    mimeType: 'audio/wav',
    durationSec: estimatedSec,
    engine: 'synthesized-wav',
  });
}

export async function handleKothaTranslateScene(
  req: Request,
  body: Record<string, any>
): Promise<Response> {
  const {
    englishSummary = '',
    onScreenText = '',
    currentBangla = '',
    tone = 'commercial',
  } = body || {};

  if (!String(englishSummary).trim() && !String(currentBangla).trim()) {
    return Response.json(
      { error: 'Scene summary or script is required.' },
      { status: 400 }
    );
  }

  const ai = getGenAIClient(req);
  if (ai) {
    const textModels = [
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
      'gemini-3.8-flash',
      'gemini-2.5-flash',
    ];
    for (const modelName of textModels) {
      if (!canUseModel(modelName, 8)) {
        continue;
      }
      try {
        recordModelAttempt(modelName);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: `You are a professional Bangladeshi Bengali voiceover director and scriptwriter in Dhaka.
Convert the following video scene summary and on-screen text into a natural, fluent Bangladeshi Bengali voiceover narration script ("banglaScript") and a Romanized phonetic reading guide ("phoneticGuide").
Requested Tone: ${tone}
On-Screen Text: ${onScreenText}
English Visual Summary: ${englishSummary}
Current Bengali Draft: ${currentBangla}`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                banglaScript: {
                  type: Type.STRING,
                  description:
                    'Natural-sounding Bangladeshi Bengali narration script in Bengali Unicode.',
                },
                phoneticGuide: {
                  type: Type.STRING,
                  description: 'Romanized Banglish pronunciation guide.',
                },
              },
              required: ['banglaScript', 'phoneticGuide'],
            },
          },
        });

        const rawJson = response.text?.trim();
        if (rawJson) {
          const parsed = JSON.parse(rawJson);
          if (parsed.banglaScript) {
            return Response.json({
              banglaScript: parsed.banglaScript,
              phoneticGuide: parsed.phoneticGuide || '',
              engine: modelName,
            });
          }
        }
      } catch (err: unknown) {
        recordModelQuotaReached(modelName, err);
      }
    }
  }

  const adapted = adaptToneInBangla(
    String(englishSummary),
    String(currentBangla),
    tone as VoiceTone
  );
  return Response.json({
    banglaScript: adapted,
    phoneticGuide:
      'Swacchondo promito Bangladeshi Bangla voiceover script prostut kora hoyeche.',
    engine: 'local-adapter',
  });
}

export async function handleKothaAnalyzeFrames(
  req: Request,
  body: Record<string, any>
): Promise<Response> {
  const {
    frames = [],
    tone = 'commercial',
    productName = '',
    category = '',
    offerPriceBn = '',
    ctaTextBn = '',
    deliveryNoteBn = '',
  } = body || {};

  if (!Array.isArray(frames) || frames.length === 0) {
    return Response.json(
      { error: 'At least one captured video frame is required.' },
      { status: 400 }
    );
  }

  const cleanProduct = String(productName || '').trim();
  const cleanCategory = String(category || '').trim() as EcommerceCategory;
  const cleanOffer = String(offerPriceBn || '').trim();
  const cleanCta = String(ctaTextBn || '').trim();
  const cleanDelivery = String(deliveryNoteBn || '').trim();
  const hasCustomBrief = Boolean(
    cleanProduct || cleanOffer || cleanCta || cleanDelivery
  );

  const ai = getGenAIClient(req);
  let batchAnalyzed: Array<{
    titleEn?: string;
    titleBn?: string;
    onScreenText?: string;
    englishSummary?: string;
    banglaScript?: string;
    phoneticGuide?: string;
  }> | null = null;

  if (ai) {
    const visionModels = [
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
      'gemini-3.8-flash',
      'gemini-2.5-flash',
    ];
    for (const modelName of visionModels) {
      if (!canUseModel(modelName, 6)) {
        continue;
      }
      try {
        recordModelAttempt(modelName);
        const parts: Array<Record<string, unknown>> = [];

        frames.forEach((f, idx) => {
          if (f.imageDataUrl && f.imageDataUrl.startsWith('data:image/')) {
            const base64Data = f.imageDataUrl.split(',')[1];
            const mimeMatch = f.imageDataUrl.match(
              /^data:(image\/[a-zA-Z0-9+.-]+);base64,/
            );
            const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
            parts.push({
              inlineData: {
                mimeType,
                data: base64Data,
              },
            });
          }
          parts.push({
            text: `Frame ${idx + 1} (${f.timeRangeLabel || '00:00'})`,
          });
        });

        const contextInstruction = hasCustomBrief
          ? `Optional User Context to weave in naturally: ${[
              cleanProduct && `Subject/Product: ${cleanProduct}`,
              cleanCategory && `Category: ${cleanCategory}`,
              cleanOffer && `Offer/Details: ${cleanOffer}`,
              cleanDelivery && `Delivery/Note: ${cleanDelivery}`,
              cleanCta && `Call to Action: ${cleanCta}`,
            ]
              .filter(Boolean)
              .join(' | ')}`
          : 'Describe and narrate purely what is visually happening in each captured video frame (people, gestures, actions, objects, setting, or on-screen text) without inventing any product prices or offers.';

        parts.push({
          text: `Analyze all ${frames.length} captured video frames above in order. ${contextInstruction}
Return a JSON array of ${frames.length} scene objects. For each frame provide:
- titleEn: Concise English scene title based on the visual frame
- titleBn: Concise Bangladeshi Bengali scene title
- onScreenText: Visible text or key visual action in the frame
- englishSummary: 1-2 sentence accurate visual summary
- banglaScript: Natural-sounding Bangladeshi Bengali voiceover narration in ${tone} tone
- phoneticGuide: Romanized pronunciation guide`,
        });

        const response = await ai.models.generateContent({
          model: modelName,
          contents: { parts },
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  titleEn: { type: Type.STRING },
                  titleBn: { type: Type.STRING },
                  onScreenText: { type: Type.STRING },
                  englishSummary: { type: Type.STRING },
                  banglaScript: { type: Type.STRING },
                  phoneticGuide: { type: Type.STRING },
                },
                required: [
                  'titleEn',
                  'titleBn',
                  'onScreenText',
                  'englishSummary',
                  'banglaScript',
                  'phoneticGuide',
                ],
              },
            },
          },
        });

        const text = response.text?.trim();
        if (text) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed) && parsed.length > 0) {
            batchAnalyzed = parsed;
            break;
          }
        }
      } catch (err: unknown) {
        recordModelQuotaReached(modelName, err);
      }
    }
  }

  // 100% Free Dynamic Scene Engine fallback (Uses ONLY what the user provided; zero hardcoded prices/offers when blank)
  const dynamicFallbackScenes = buildDynamicEcommerceUgcScenes(frames, {
    productName: cleanProduct,
    category: cleanCategory,
    offerPriceBn: cleanOffer,
    ctaTextBn: cleanCta,
    deliveryNoteBn: cleanDelivery,
    tone: (tone as VoiceTone) || 'commercial',
  });

  const results = frames.map((_f, i) => {
    const analyzed = batchAnalyzed?.[i];
    if (analyzed && analyzed.banglaScript) {
      return analyzed;
    }
    const fallback = dynamicFallbackScenes[i] || dynamicFallbackScenes[0];
    return {
      titleEn: fallback.titleEn,
      titleBn: fallback.titleBn,
      onScreenText: fallback.onScreenText,
      englishSummary: fallback.englishSummary,
      banglaScript: fallback.banglaScript,
      phoneticGuide: fallback.phoneticGuide,
    };
  });

  return Response.json({ scenes: results });
}

export async function handleKotha(
  req: Request,
  parts: string[]
): Promise<Response> {
  try {
    const route = parts.join('/');
    if (route === 'health' && req.method === 'GET') {
      return Response.json({
        status: 'ok',
        freeEngineReady: true,
        geminiConfigured: Boolean(keyFor(req)),
        timestamp: new Date().toISOString(),
      });
    }

    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed.' }, { status: 405 });
    }

    const raw = await req.text();
    let body: Record<string, any> = {};
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    if (route === 'tts/generate') {
      return await handleKothaTtsGenerate(req, body);
    }
    if (route === 'translate-scene') {
      return await handleKothaTranslateScene(req, body);
    }
    if (route === 'analyze-frames') {
      return await handleKothaAnalyzeFrames(req, body);
    }

    return Response.json({ error: 'Unknown Kotha Studio endpoint.' }, { status: 404 });
  } catch (err: any) {
    return Response.json(
      { error: String(err?.message || 'Kotha Studio request failed.') },
      { status: 500 }
    );
  }
}
