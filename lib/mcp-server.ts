/**
 * lib/mcp-server.ts
 *
 * World-Class 100% Free-First Model Context Protocol (MCP) Connector Engine for Fahi Videos 2.5V
 * Live Deployment Target: https://fahi-videos.auraajenticai.cloud/mcp (and /api/mcp)
 *
 * Designed so that ALL core tools (Kotha Studio Bangla Dubbing, YT/FB/Insta/TikTok Downloader,
 * CapCut Pro Video Editor, Storyboard/SRT Generator, and Studio SFX) work 100% FOR FREE
 * with ZERO paid API keys required!
 */

import { NextRequest } from 'next/server';
import { GET as extractVideoInfoGet } from '../app/api/video/info/route';
import {
  VOICE_PERSONAS,
  TONE_PRESETS,
  ECOMMERCE_CATEGORIES,
  generateSrtSubtitles,
  estimateBanglaSpeechDuration,
  buildDynamicEcommerceUgcScenes,
  type EcommerceCategory,
  type VoiceTone,
} from './kotha-dubbing-logic';
import {
  handleKothaTtsGenerate,
  handleKothaTranslateScene,
} from './kotha-server';
import { handleAura } from './aura-server';
import {
  formatCapCutTimecode,
  getMaskClipPath,
  computeClipAnimation,
  synthesizeCapCutSfxWav,
  type CapCutSfxId,
  type CapCutMaskShape,
  type CapCutAnimationId,
} from './capcut-studio-tools';

export const MCP_SERVER_INFO = {
  name: 'fahi-videos-mcp-connector',
  title: 'Fahi-Videos MCP Connector',
  version: '2.6.0',
  protocolVersion: '2024-11-05',
  supportedProtocolVersions: ['2025-06-18', '2025-03-26', '2024-11-05'],
  vendor: 'Aura Agentic AI Cloud (fahi-videos.auraajenticai.cloud)',
  homepage: 'https://fahi-videos.auraajenticai.cloud/',
  websiteUrl: 'https://fahi-videos.auraajenticai.cloud/',
  license: 'Apache-2.0',
  icons: [
    {
      src: 'https://fahi-videos.auraajenticai.cloud/icon-512.png',
      mimeType: 'image/png',
      sizes: ['512x512'],
    },
    {
      src: 'https://fahi-videos.auraajenticai.cloud/icon-192.png',
      mimeType: 'image/png',
      sizes: ['192x192'],
    },
  ],
  freeTierReady: true,
};

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, any>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export const MCP_TOOLS = [
  {
    name: 'fahi_generate_bangla_tts',
    title: 'Generate Bangla Voiceover (TTS)',
    description:
      '[100% FREE — Zero API Key Needed] Generate natural Bangladeshi Bengali voiceover audio (MP3/24kHz WAV base64) using Kotha Studio 3-tier engine (Free Neural Bangla Stream + Synthesized WAV fallback + optional Gemini TTS).',
    annotations: {
      title: 'Generate Bangla Voiceover (TTS)',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        text: {
          type: 'string',
          minLength: 1,
          description: 'Bengali Unicode narration script to synthesize into speech.',
        },
        voiceName: {
          type: 'string',
          enum: ['Kore', 'Puck', 'Charon', 'Zephyr'],
          default: 'Kore',
          description:
            'Voice persona: Kore (Nusrat - Female Brand), Puck (Tanvir - Male Tech), Charon (Rashed - Deep Documentary), Zephyr (Tasnim - Storyteller).',
        },
        durationSec: {
          type: 'number',
          minimum: 0.5,
          maximum: 300,
          description: 'Optional target duration in seconds.',
        },
      },
      required: ['text'],
    },
    outputSchema: {
      type: 'object',
      additionalProperties: true,
      properties: {
        success: { type: 'boolean', description: 'Whether speech synthesis succeeded.' },
        freeTier: { type: 'boolean', description: 'Confirms execution without paid API keys.' },
        voiceName: { type: 'string', description: 'Selected voice persona name.' },
        engine: { type: 'string', description: 'TTS backend engine used.' },
        mimeType: { type: 'string', description: 'Audio MIME type (e.g. audio/mpeg or audio/wav).' },
        durationSec: { type: 'number', description: 'Estimated or synthesized duration in seconds.' },
        audioBase64Preview: { type: 'string', description: 'Truncated preview of encoded audio bytes.' },
        audioBase64: { type: 'string', description: 'Base64-encoded audio payload.' },
      },
      required: ['success', 'freeTier', 'voiceName', 'audioBase64'],
    },
  },
  {
    name: 'fahi_build_ugc_storyboard',
    title: 'Build Bangla UGC Storyboard',
    description:
      '[100% FREE — Zero API Key Needed] Build a multi-scene Bangladeshi Bengali UGC / Video storyboard (Hook -> Problem -> Showcase -> Social Proof -> CTA) with Bengali narration scripts, Romanized Banglish phonetic guides, on-screen captions, and .SRT subtitles.',
    annotations: {
      title: 'Build Bangla UGC Storyboard',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        productName: {
          type: 'string',
          description: 'Product, brand, or video topic name (leave empty for general video narration).',
        },
        category: {
          type: 'string',
          enum: ['', 'skincare', 'fashion', 'gadgets', 'food', 'saas'],
          default: '',
          description: 'Optional product category preset.',
        },
        offerPriceBn: {
          type: 'string',
          description: 'Optional offer or price in Bengali (e.g. "মাত্র ৯৯০ টাকা").',
        },
        ctaTextBn: {
          type: 'string',
          description: 'Optional call-to-action in Bengali (e.g. "এখনই অর্ডার করুন").',
        },
        deliveryNoteBn: {
          type: 'string',
          description: 'Optional delivery/warranty note in Bengali (e.g. "সারা দেশে ক্যাশ অন ডেলিভারি").',
        },
        tone: {
          type: 'string',
          enum: ['commercial', 'explainer', 'conversational', 'documentary'],
          default: 'commercial',
          description: 'Narration tone preset.',
        },
        sceneCount: {
          type: 'number',
          minimum: 1,
          maximum: 12,
          default: 5,
          description: 'Number of scenes to generate (default: 5, min: 1, max: 12).',
        },
        sceneDurationSec: {
          type: 'number',
          minimum: 2,
          maximum: 30,
          default: 4,
          description: 'Duration per scene in seconds (default: 4, min: 2, max: 30).',
        },
      },
    },
    outputSchema: {
      type: 'object',
      additionalProperties: true,
      properties: {
        freeTier: { type: 'boolean', description: 'Confirms zero-API-key execution.' },
        sceneCount: { type: 'number', description: 'Total number of generated scenes.' },
        totalDurationSec: { type: 'number', description: 'Combined storyboard duration in seconds.' },
        scenes: {
          type: 'array',
          description: 'Ordered storyboard scene objects with scripts and phonetic guides.',
          items: { type: 'object' },
        },
        srtSubtitles: { type: 'string', description: 'Formatted SubRip (.srt) subtitle block.' },
      },
      required: ['freeTier', 'sceneCount', 'totalDurationSec', 'scenes', 'srtSubtitles'],
    },
  },
  {
    name: 'fahi_translate_and_adapt_scene',
    title: 'Translate & Adapt Scene to Bangla',
    description:
      '[100% FREE — Zero API Key Needed] Convert an English scene summary or draft Bengali line into an authentic Dhaka-standard Bangladeshi Bengali voiceover script with a Romanized Banglish phonetic reading guide.',
    annotations: {
      title: 'Translate & Adapt Scene to Bangla',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        englishSummary: {
          type: 'string',
          minLength: 1,
          description: 'English visual description or summary of the video scene.',
        },
        onScreenText: {
          type: 'string',
          description: 'Visible on-screen text or overlay caption.',
        },
        currentBangla: {
          type: 'string',
          description: 'Existing Bengali draft to refine or tone-adapt.',
        },
        tone: {
          type: 'string',
          enum: ['commercial', 'explainer', 'conversational', 'documentary'],
          default: 'commercial',
          description: 'Target voiceover tone.',
        },
      },
      required: ['englishSummary'],
    },
    outputSchema: {
      type: 'object',
      additionalProperties: true,
      properties: {
        banglaScript: { type: 'string', description: 'Adapted Bangladeshi Bengali voiceover script.' },
        phoneticGuide: { type: 'string', description: 'Romanized Banglish phonetic reading guide.' },
        engine: { type: 'string', description: 'Localization engine used.' },
      },
      required: ['banglaScript', 'phoneticGuide'],
    },
  },
  {
    name: 'fahi_generate_srt_subtitles',
    title: 'Generate SRT Subtitles & Timecodes',
    description:
      '[100% FREE — Zero API Key Needed] Generate industry-standard SubRip (.srt) subtitle file content and CapCut HH:MM:SS:FF (30fps) timecodes from a list of scenes.',
    annotations: {
      title: 'Generate SRT Subtitles & Timecodes',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        scenes: {
          type: 'array',
          minItems: 1,
          description: 'Ordered list of scenes with start/end times and scripts.',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              sceneNumber: {
                type: 'number',
                minimum: 1,
                description: '1-based sequential scene number.',
              },
              startTimeSec: {
                type: 'number',
                minimum: 0,
                description: 'Scene start timestamp in seconds.',
              },
              endTimeSec: {
                type: 'number',
                minimum: 0,
                description: 'Scene end timestamp in seconds.',
              },
              banglaScript: {
                type: 'string',
                minLength: 1,
                description: 'Bengali narration text for the subtitle block.',
              },
              titleEn: {
                type: 'string',
                description: 'Optional English scene title shown beneath Bengali text when bilingual=true.',
              },
            },
            required: ['startTimeSec', 'endTimeSec', 'banglaScript'],
          },
        },
        bilingual: {
          type: 'boolean',
          default: false,
          description: 'Include English title/translation line under each Bengali subtitle.',
        },
      },
      required: ['scenes'],
    },
    outputSchema: {
      type: 'object',
      additionalProperties: true,
      properties: {
        freeTier: { type: 'boolean', description: 'Confirms zero-API-key execution.' },
        sceneCount: { type: 'number', description: 'Total subtitle scenes processed.' },
        scenesWithCapCutTimecodes: {
          type: 'array',
          description: 'Normalized scenes enriched with 30fps CapCut SMPTE timecodes.',
          items: { type: 'object' },
        },
        srtContent: { type: 'string', description: 'Complete .srt subtitle file text.' },
      },
      required: ['freeTier', 'sceneCount', 'scenesWithCapCutTimecodes', 'srtContent'],
    },
  },
  {
    name: 'fahi_extract_media_info',
    title: 'Extract Multi-Platform Media Streams',
    description:
      '[100% FREE — Zero API Key Needed] Extract downloadable HD MP4 video and MP3 audio streams for YouTube (Videos/Shorts), Facebook (Videos/Reels/fb.watch), Instagram (Reels/Posts), and TikTok links.',
    annotations: {
      title: 'Extract Multi-Platform Media Streams',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        url: {
          type: 'string',
          format: 'uri',
          minLength: 8,
          description: 'Public YouTube, Facebook, Instagram, or TikTok video/reel URL.',
        },
      },
      required: ['url'],
    },
    outputSchema: {
      type: 'object',
      additionalProperties: true,
      properties: {
        freeTier: { type: 'boolean', description: 'Confirms zero-API-key execution.' },
        platform: {
          type: 'string',
          enum: ['youtube', 'facebook', 'instagram', 'tiktok'],
          description: 'Detected social media platform.',
        },
        title: { type: 'string', description: 'Extracted media title.' },
        author: { type: 'string', description: 'Channel or creator display name.' },
        thumbnail: { type: 'string', description: 'Thumbnail image URL if available.' },
        sourceUrl: { type: 'string', description: 'Submitted source video URL.' },
        apiEndpoint: { type: 'string', description: 'Equivalent web API endpoint path.' },
        streamCount: { type: 'number', description: 'Count of extracted downloadable streams.' },
        streams: {
          type: 'array',
          description: 'Available downloadable video and audio formats.',
          items: { type: 'object' },
        },
      },
      required: ['freeTier', 'platform', 'sourceUrl', 'apiEndpoint', 'streams'],
    },
  },
  {
    name: 'fahi_capcut_editor_blueprint',
    title: 'Generate CapCut NLE Timeline Blueprint',
    description:
      '[100% FREE — Zero API Key Needed] Generate a complete CapCut Pro Video Studio timeline configuration (00:00 left-aligned clips, CSS mask clip-paths, In/Out/Combo animation transforms, HSL color grading, and .SRT captions).',
    annotations: {
      title: 'Generate CapCut NLE Timeline Blueprint',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        projectTitle: {
          type: 'string',
          description: 'Project title for the CapCut Video Editor.',
        },
        aspectRatio: {
          type: 'string',
          enum: ['9:16', '16:9', '1:1', '4:5'],
          default: '9:16',
          description: 'Target video aspect ratio.',
        },
        maskShape: {
          type: 'string',
          enum: ['none', 'linear', 'mirror', 'circle', 'rectangle', 'heart', 'star'],
          default: 'none',
          description: 'CapCut mask shape.',
        },
        animIn: {
          type: 'string',
          enum: ['none', 'fade_in', 'zoom_in', 'slide_left', 'slide_up', 'spin_in'],
          default: 'fade_in',
          description: 'Clip entry animation.',
        },
        animOut: {
          type: 'string',
          enum: ['none', 'fade_out', 'zoom_out', 'slide_left', 'slide_up'],
          default: 'fade_out',
          description: 'Clip exit animation.',
        },
        animCombo: {
          type: 'string',
          enum: ['none', 'shake', 'pendulum', 'pulse'],
          default: 'none',
          description: 'Clip combo animation.',
        },
        durationSec: {
          type: 'number',
          minimum: 2,
          maximum: 600,
          default: 15,
          description: 'Total timeline duration in seconds (default: 15, min: 2, max: 600).',
        },
      },
    },
    outputSchema: {
      type: 'object',
      additionalProperties: true,
      properties: {
        freeTier: { type: 'boolean', description: 'Confirms zero-API-key execution.' },
        projectTitle: { type: 'string', description: 'CapCut Studio project title.' },
        aspectRatio: { type: 'string', description: 'Output canvas aspect ratio.' },
        timelineStartTimecode: { type: 'string', description: 'SMPTE start timecode (00:00:00:00).' },
        timelineEndTimecode: { type: 'string', description: 'SMPTE end timecode at 30fps.' },
        cssMaskClipPath: { type: 'string', description: 'Generated CSS clip-path string or "none".' },
        sampleAnimationAtStart: { type: 'object', description: 'Computed transform state near clip entry.' },
        sampleAnimationAtMidpoint: { type: 'object', description: 'Computed transform state at midpoint.' },
        studioUrl: { type: 'string', description: 'Direct URL to open CapCut Video Studio.' },
      },
      required: ['freeTier', 'projectTitle', 'aspectRatio', 'timelineStartTimecode', 'timelineEndTimecode'],
    },
  },
  {
    name: 'fahi_synthesize_studio_sfx',
    title: 'Synthesize Studio WAV SFX',
    description:
      '[100% FREE — Zero API Key Needed] Synthesize a playable 22.05kHz PCM WAV sound effect or beat loop from CapCut Video Studio.',
    annotations: {
      title: 'Synthesize Studio WAV SFX',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        sfxId: {
          type: 'string',
          enum: ['whoosh', 'riser', 'bass_drop', 'ding', 'lofi_beat'],
          description: 'Built-in procedural sound effect ID.',
        },
      },
      required: ['sfxId'],
    },
    outputSchema: {
      type: 'object',
      additionalProperties: true,
      properties: {
        freeTier: { type: 'boolean', description: 'Confirms zero-API-key execution.' },
        sfxId: { type: 'string', description: 'Synthesized sound effect preset ID.' },
        fileName: { type: 'string', description: 'Generated WAV filename.' },
        mimeType: { type: 'string', description: 'Audio MIME type (audio/wav).' },
        byteLength: { type: 'number', description: 'WAV byte length.' },
        audioBase64Preview: { type: 'string', description: 'Truncated preview of base64 WAV output.' },
        audioBase64: { type: 'string', description: 'Complete base64-encoded PCM WAV payload.' },
      },
      required: ['freeTier', 'sfxId', 'mimeType', 'byteLength', 'audioBase64'],
    },
  },
  {
    name: 'fahi_enhance_cinematic_prompt',
    title: 'Enhance Cinematic Video Prompt',
    description:
      '[100% FREE — Zero API Key Needed] Enhance a raw video idea into a cinema-grade prompt incorporating camera movement, lens optics, lighting atmosphere, and motion pacing.',
    annotations: {
      title: 'Enhance Cinematic Video Prompt',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        prompt: {
          type: 'string',
          minLength: 1,
          description: 'Core scene concept or action.',
        },
        camera: {
          type: 'string',
          description: 'Camera movement (e.g. Dolly Push-in, Orbit 180°, Whip Pan, FPV Drone Dive).',
        },
        lens: {
          type: 'string',
          description: 'Optical lens choice (e.g. 16mm Ultra-Wide, 35mm Cine Prime, 85mm Portrait Bokeh, 2.39:1 Anamorphic).',
        },
        lighting: {
          type: 'string',
          description: 'Lighting atmosphere (e.g. Golden Hour Sunflare, Cyberpunk Neon Noir, Volumetric God Rays).',
        },
        motionSpeed: {
          type: 'string',
          description: 'Pacing description (e.g. smooth cinematic momentum, high-speed dynamic burst).',
        },
      },
      required: ['prompt'],
    },
    outputSchema: {
      type: 'object',
      additionalProperties: true,
      properties: {
        freeTier: { type: 'boolean', description: 'Confirms zero-API-key execution.' },
        engine: { type: 'string', description: 'Prompt enhancement engine used.' },
        enhancedPrompt: { type: 'string', description: 'Cinema-grade expanded production prompt.' },
        rig: { type: 'object', description: 'Applied camera, lens, lighting, and motion configuration.' },
      },
      required: ['freeTier', 'engine', 'enhancedPrompt', 'rig'],
    },
  },
  {
    name: 'fahi_generate_image',
    title: 'Generate HD Thumbnail or Scene Image',
    description:
      '[100% FREE Fallback Included] Generate a 1280x720 HD thumbnail or storyboard image (uses Gemini Image Engine if key is present, or instant 100% free HD visual engine if no key is set).',
    annotations: {
      title: 'Generate HD Thumbnail or Scene Image',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        prompt: {
          type: 'string',
          minLength: 1,
          description: 'Detailed visual prompt for image generation.',
        },
        aspectRatio: {
          type: 'string',
          enum: ['16:9', '9:16', '1:1', '4:3', '3:4'],
          default: '16:9',
          description: 'Output aspect ratio (default: 16:9).',
        },
      },
      required: ['prompt'],
    },
    outputSchema: {
      type: 'object',
      additionalProperties: true,
      properties: {
        freeTier: { type: 'boolean', description: 'Whether the free fallback image engine was used.' },
        isFallback: { type: 'boolean', description: 'True when returned from the no-key free fallback engine.' },
        engine: { type: 'string', description: 'Image generation backend engine identifier.' },
        aspectRatio: { type: 'string', description: 'Requested image aspect ratio.' },
        imageUrl: { type: 'string', description: 'Playable/viewable image URL or data URI.' },
        mimeType: { type: 'string', description: 'Generated image MIME type when returned inline.' },
      },
      required: ['imageUrl'],
    },
  },
  {
    name: 'fahi_crm_leads',
    title: 'Manage Customer CRM Leads',
    description:
      '[100% FREE — Zero API Key Needed] List or add customer leads in the Bangladeshi Customer Care & Order Pipeline.',
    annotations: {
      title: 'Manage Customer CRM Leads',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        action: {
          type: 'string',
          enum: ['list', 'add'],
          description: 'List current leads & call stats or add a new lead.',
        },
        customerName: {
          type: 'string',
          description: 'Customer full name (required when action="add").',
        },
        phone: {
          type: 'string',
          description: 'International phone number in E.164 format, e.g. +8801712345678 (required when action="add").',
        },
        product: {
          type: 'string',
          description: 'Product or campaign name (required when action="add").',
        },
        notes: {
          type: 'string',
          description: 'Optional customer context or order notes.',
        },
      },
      required: ['action'],
    },
    outputSchema: {
      type: 'object',
      additionalProperties: true,
      properties: {
        success: { type: 'boolean', description: 'Success status when adding a lead.' },
        leads: {
          type: 'array',
          description: 'List of customer leads when action="list".',
          items: { type: 'object' },
        },
        stats: { type: 'object', description: 'Pipeline counts when action="list".' },
        lead: { type: 'object', description: 'Newly created lead object when action="add".' },
        total: { type: 'number', description: 'Total lead count after insertion.' },
      },
    },
  },
];

export const MCP_RESOURCES = [
  {
    uri: 'fahi://studio/capabilities',
    name: 'Fahi Videos 2.5V Studio Capabilities & 100% Free Mode Status',
    description:
      'Complete manifest of Fahi Videos 2.5V 100% Free modules (Kotha Studio, YT/FB/Insta Downloader, CapCut Video Editor, Thumbnail Studio).',
    mimeType: 'application/json',
  },
  {
    uri: 'fahi://kotha/voices',
    name: 'Bangladeshi Bengali Voice Personas & Tone Presets (100% Free)',
    description:
      'Directory of Kotha Studio Bangladeshi voice personas (Kore, Puck, Charon, Zephyr) and tone presets.',
    mimeType: 'application/json',
  },
  {
    uri: 'fahi://aura/cinematography-rig',
    name: 'Aura Studio Cinematography Rig & Transition Presets',
    description:
      'Camera moves, prime/anamorphic lenses, lighting atmospheres, and seamless transition techniques.',
    mimeType: 'application/json',
  },
  {
    uri: 'fahi://capcut/studio-tools',
    name: 'CapCut Video Studio Masks, Blend Modes, Animations & SFX (100% Free)',
    description:
      'Supported mask shapes, blend modes, clip animations, HSL channels, and procedural sound effects.',
    mimeType: 'application/json',
  },
];

export const MCP_PROMPTS = [
  {
    name: 'bangla-viral-ugc-campaign',
    description:
      'Generate a complete 100% Free Bangladeshi viral UGC video ad campaign (5-scene storyboard, Dhaka Bangla voiceover audio, and .SRT subtitles).',
    arguments: [
      {
        name: 'productName',
        description: 'Name of the product or service',
        required: true,
      },
      {
        name: 'offerPriceBn',
        description: 'Offer price in Bengali (e.g. মাত্র ১,২৫০ টাকা)',
        required: false,
      },
      {
        name: 'voicePersona',
        description: 'Voice persona (Kore, Puck, Charon, Zephyr)',
        required: false,
      },
    ],
  },
  {
    name: 'free-yt-fb-insta-to-bangla-reel',
    description:
      '100% Free Workflow: Extract a YouTube, Facebook, or Instagram Reel link, dub it in Bangladeshi Bengali via Kotha Studio, and build a CapCut 9:16 timeline.',
    arguments: [
      {
        name: 'mediaUrl',
        description: 'YouTube, Facebook, or Instagram video URL',
        required: true,
      },
      {
        name: 'topicBn',
        description: 'Optional topic or product name in Bengali',
        required: false,
      },
    ],
  },
  {
    name: 'youtube-thumbnail-and-seo-pack',
    description:
      'Create a high-CTR YouTube thumbnail visual, bold headline, subhead, and bilingual Bengali/English video metadata (100% Free).',
    arguments: [
      {
        name: 'videoTopic',
        description: 'Topic or title of the video',
        required: true,
      },
    ],
  },
];

function buildAuraSubRequest(
  baseReq: Request,
  path: string,
  method: 'GET' | 'POST',
  body?: Record<string, any>
): Request {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  const geminiKey =
    baseReq.headers.get('x-gemini-api-key') ||
    process.env.GEMINI_API_KEY ||
    '';
  if (geminiKey) headers.set('x-gemini-api-key', geminiKey);
  const clientId =
    baseReq.headers.get('x-aura-client-id') ||
    'mcp-connector-session-0001';
  headers.set('x-aura-client-id', clientId);

  return new Request(`http://localhost/api/aura/${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

type McpToolResult = {
  content: Array<{ type: string; text: string }>;
  structuredContent?: Record<string, any>;
  isError?: boolean;
};

/** Wrap a structured JSON tool result with both modern structuredContent and text fallback. */
function mcpJsonResult(payload: Record<string, any>): McpToolResult {
  return {
    structuredContent: payload,
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
  };
}

/** Return an MCP error payload without emitting structuredContent. */
function mcpErrorResult(errorPayload: string | Record<string, any>): McpToolResult {
  const text =
    typeof errorPayload === 'string' ? errorPayload : JSON.stringify(errorPayload);
  return {
    isError: true,
    content: [{ type: 'text', text }],
  };
}

async function executeMcpTool(
  req: Request,
  toolName: string,
  args: Record<string, any> = {}
): Promise<McpToolResult> {
  try {
    switch (toolName) {
      case 'fahi_generate_bangla_tts': {
        const res = await handleKothaTtsGenerate(req, {
          text: args.text,
          voiceName: args.voiceName || 'Kore',
          durationSec: args.durationSec,
        });
        const data = await res.json();
        if (!res.ok) {
          return mcpErrorResult(data);
        }
        return mcpJsonResult({
          success: true,
          freeTier: true,
          voiceName: args.voiceName || 'Kore',
          engine: data.engine,
          mimeType: data.mimeType,
          durationSec: data.durationSec,
          audioBase64Preview:
            typeof data.audioBase64 === 'string'
              ? `${data.audioBase64.slice(0, 64)}... (${data.audioBase64.length} base64 chars)`
              : '',
          audioBase64: data.audioBase64,
        });
      }

      case 'fahi_build_ugc_storyboard': {
        const count = Math.max(1, Math.min(12, Number(args.sceneCount) || 5));
        const dur = Math.max(2, Math.min(30, Number(args.sceneDurationSec) || 4));
        const frames = Array.from({ length: count }, (_, idx) => {
          const start = idx * dur;
          const end = (idx + 1) * dur;
          const fmt = (s: number) =>
            `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
          return {
            timeRangeLabel: `${fmt(start)} - ${fmt(end)}`,
            startTimeSec: start,
            endTimeSec: end,
          };
        });

        const scenes = buildDynamicEcommerceUgcScenes(frames, {
          productName: String(args.productName || ''),
          category: (String(args.category || '') as EcommerceCategory) || '',
          offerPriceBn: String(args.offerPriceBn || ''),
          ctaTextBn: String(args.ctaTextBn || ''),
          deliveryNoteBn: String(args.deliveryNoteBn || ''),
          tone: (args.tone as VoiceTone) || 'commercial',
        });

        const srt = generateSrtSubtitles(scenes, true);
        return mcpJsonResult({
          freeTier: true,
          sceneCount: scenes.length,
          totalDurationSec: count * dur,
          scenes: scenes.map((s) => ({
            sceneNumber: s.sceneNumber,
            timeRangeLabel: s.timeRangeLabel,
            titleEn: s.titleEn,
            titleBn: s.titleBn,
            onScreenText: s.onScreenText,
            banglaScript: s.banglaScript,
            phoneticGuide: s.phoneticGuide,
            estimatedSpeechDurationSec: estimateBanglaSpeechDuration(
              s.banglaScript
            ),
          })),
          srtSubtitles: srt,
        });
      }

      case 'fahi_translate_and_adapt_scene': {
        const res = await handleKothaTranslateScene(req, {
          englishSummary: args.englishSummary || '',
          onScreenText: args.onScreenText || '',
          currentBangla: args.currentBangla || '',
          tone: args.tone || 'commercial',
        });
        const data = await res.json();
        return res.ok ? mcpJsonResult(data) : mcpErrorResult(data);
      }

      case 'fahi_generate_srt_subtitles': {
        const rawScenes = Array.isArray(args.scenes) ? args.scenes : [];
        if (rawScenes.length === 0) {
          return mcpErrorResult('At least one scene item is required.');
        }
        const normalized = rawScenes.map((s: any, idx: number) => ({
          sceneNumber: Number(s.sceneNumber) || idx + 1,
          startTimeSec: Number(s.startTimeSec) || idx * 4,
          endTimeSec: Number(s.endTimeSec) || (idx + 1) * 4,
          banglaScript: String(s.banglaScript || ''),
          titleEn: String(s.titleEn || `Scene ${idx + 1}`),
          capcutStartTimecode: formatCapCutTimecode(Number(s.startTimeSec) || 0),
          capcutEndTimecode: formatCapCutTimecode(Number(s.endTimeSec) || 0),
        }));
        const srtContent = generateSrtSubtitles(
          normalized,
          Boolean(args.bilingual)
        );
        return mcpJsonResult({
          freeTier: true,
          sceneCount: normalized.length,
          scenesWithCapCutTimecodes: normalized,
          srtContent,
        });
      }

      case 'fahi_extract_media_info': {
        const mediaUrl = String(args.url || '').trim();
        if (!mediaUrl) {
          return mcpErrorResult({ error: 'Missing url argument.' });
        }
        const infoReq = new NextRequest(
          `https://fahi-videos.auraajenticai.cloud/api/video/info?url=${encodeURIComponent(mediaUrl)}`
        );
        const infoRes = await extractVideoInfoGet(infoReq);
        const infoData: any = await infoRes.json();
        if (!infoRes.ok) {
          return mcpErrorResult(infoData);
        }
        const streams = (Array.isArray(infoData?.formats) ? infoData.formats : []).map(
          (f: any) => ({
            quality: String(f.quality || 'HD'),
            url: String(f.url || ''),
            type: String(f.type || 'video'),
            ...(f.audioUrl ? { audioUrl: String(f.audioUrl) } : {}),
            ...(f.requiresMerge ? { requiresMerge: true } : {}),
            ...(f.isFallback ? { isFallback: true } : {}),
          })
        );
        return mcpJsonResult({
          freeTier: true,
          platform: String(infoData?.platform || 'youtube'),
          title: String(infoData?.title || ''),
          author: String(infoData?.author || ''),
          thumbnail: String(infoData?.thumbnail || ''),
          sourceUrl: mediaUrl,
          apiEndpoint: `/api/video/info?url=${encodeURIComponent(mediaUrl)}`,
          streamCount: streams.length,
          streams,
        });
      }

      case 'fahi_capcut_editor_blueprint': {
        const dur = Math.max(2, Math.min(600, Number(args.durationSec) || 15));
        const shape = (args.maskShape || 'none') as CapCutMaskShape;
        const animIn = (args.animIn || 'fade_in') as CapCutAnimationId;
        const animOut = (args.animOut || 'fade_out') as CapCutAnimationId;
        const animCombo = (args.animCombo || 'none') as CapCutAnimationId;

        return mcpJsonResult({
          freeTier: true,
          projectTitle: args.projectTitle || 'FahiVids_Free_Studio',
          aspectRatio: args.aspectRatio || '9:16',
          timelineStartTimecode: formatCapCutTimecode(0),
          timelineEndTimecode: formatCapCutTimecode(dur),
          cssMaskClipPath: getMaskClipPath(shape, 75, false) || 'none',
          sampleAnimationAtStart: computeClipAnimation(
            0.2,
            dur,
            animIn,
            animOut,
            animCombo,
            0.8
          ),
          sampleAnimationAtMidpoint: computeClipAnimation(
            dur / 2,
            dur,
            animIn,
            animOut,
            animCombo,
            0.8
          ),
          studioUrl: 'https://fahi-videos.auraajenticai.cloud/?studio=1',
        });
      }

      case 'fahi_synthesize_studio_sfx': {
        const sfxId = (args.sfxId || 'whoosh') as CapCutSfxId;
        const validIds: CapCutSfxId[] = [
          'whoosh',
          'riser',
          'bass_drop',
          'ding',
          'lofi_beat',
        ];
        if (!validIds.includes(sfxId)) {
          return mcpErrorResult(`Invalid sfxId. Choose one of: ${validIds.join(', ')}`);
        }
        const wavFile = synthesizeCapCutSfxWav(sfxId);
        const arrBuf = await wavFile.arrayBuffer();
        const base64Wav = Buffer.from(arrBuf).toString('base64');
        return mcpJsonResult({
          freeTier: true,
          sfxId,
          fileName: wavFile.name,
          mimeType: 'audio/wav',
          byteLength: arrBuf.byteLength,
          audioBase64Preview: `${base64Wav.slice(0, 64)}...`,
          audioBase64: base64Wav,
        });
      }

      case 'fahi_enhance_cinematic_prompt': {
        const prompt = String(args.prompt || '').trim();
        if (!prompt) {
          return mcpErrorResult('prompt is required.');
        }
        const camera = String(args.camera || 'Dolly Push-in');
        const lens = String(args.lens || '35mm Cine Prime');
        const lighting = String(args.lighting || 'Volumetric God Rays');
        const motionSpeed = String(
          args.motionSpeed || 'smooth cinematic momentum'
        );

        const subReq = buildAuraSubRequest(req, 'flow/enhance-prompt', 'POST', {
          prompt,
          camera,
          lens,
          lighting,
          motionSpeed,
        });
        const res = await handleAura(subReq, ['flow', 'enhance-prompt']);
        if (res.ok) {
          const data = await res.json();
          return mcpJsonResult({
            freeTier: true,
            engine: 'aura-gemini-director',
            enhancedPrompt: data.enhancedPrompt,
            rig: { camera, lens, lighting, motionSpeed },
          });
        }
        const deterministicPrompt = `${prompt}. Shot on ${lens} with ${camera} movement (${motionSpeed}), illuminated by ${lighting}, natural physical motion, photorealistic cinema grade.`;
        return mcpJsonResult({
          freeTier: true,
          engine: 'aura-rig-synthesizer',
          enhancedPrompt: deterministicPrompt,
          rig: { camera, lens, lighting, motionSpeed },
        });
      }

      case 'fahi_generate_image': {
        const prompt = String(args.prompt || 'studio thumbnail').trim();
        const aspectRatio = String(args.aspectRatio || '16:9');
        const subReq = buildAuraSubRequest(req, 'image/generate', 'POST', {
          prompt,
          aspectRatio,
        });
        const res = await handleAura(subReq, ['image', 'generate']);
        if (res.ok) {
          const data = await res.json();
          return mcpJsonResult(data);
        }
        // 100% Free Fallback when no Gemini API key is configured
        const seed = encodeURIComponent(
          prompt.split(',')[0].trim().substring(0, 30) || 'fahivids'
        );
        const dims = aspectRatio === '9:16' ? '720/1280' : aspectRatio === '1:1' ? '1024/1024' : '1280/720';
        const fallbackImageUrl = `https://picsum.photos/seed/${seed}/${dims}`;
        return mcpJsonResult({
          freeTier: true,
          isFallback: true,
          engine: 'free-hd-stock-engine',
          aspectRatio,
          imageUrl: fallbackImageUrl,
        });
      }

      case 'fahi_crm_leads': {
        if (args.action === 'add') {
          const subReq = buildAuraSubRequest(req, 'leads/sync', 'POST', {
            customerName: args.customerName,
            phone: args.phone,
            product: args.product,
            notes: args.notes || '',
          });
          const res = await handleAura(subReq, ['leads', 'sync']);
          const data = await res.json();
          return res.ok ? mcpJsonResult(data) : mcpErrorResult(data);
        }
        const subReq = buildAuraSubRequest(req, 'leads', 'GET');
        const res = await handleAura(subReq, ['leads']);
        const data = await res.json();
        return res.ok ? mcpJsonResult(data) : mcpErrorResult(data);
      }

      default:
        return mcpErrorResult(`Unknown MCP tool: ${toolName}`);
    }
  } catch (err: any) {
    return mcpErrorResult(`Tool execution failed: ${err?.message || String(err)}`);
  }
}

async function readMcpResource(
  req: Request,
  uri: string
): Promise<{ contents: Array<{ uri: string; mimeType: string; text: string }> }> {
  switch (uri) {
    case 'fahi://studio/capabilities':
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                platform: 'Fahi Videos 2.5V — 100% Free Video, Dubbing & Downloader OS',
                productionUrl: 'https://fahi-videos.auraajenticai.cloud/',
                mcpEndpoint: 'https://fahi-videos.auraajenticai.cloud/mcp',
                freeCoreSuites: [
                  {
                    id: 'kotha',
                    name: 'Kotha Studio (কণ্ঠধ্বনি) — 100% Free Bangla Dubbing & Storyboard',
                    freeWithoutApiKey: true,
                    features: [
                      'Scene-by-scene video frame capture & analysis',
                      '100% Free Bangladeshi Bengali Neural Voice Stream + 24kHz WAV synthesizer',
                      'Dynamic E-Commerce & General UGC storyboard builder',
                      'Bilingual .SRT subtitle generator & master WAV merger',
                    ],
                  },
                  {
                    id: 'downloader',
                    name: 'Universal YT / FB / Insta / TikTok Downloader — 100% Free',
                    freeWithoutApiKey: true,
                    features: [
                      'YouTube Videos & Shorts HD MP4/MP3 extraction',
                      'Facebook Videos, Reels & fb.watch extraction',
                      'Instagram Reels & Posts HD MP4 extraction',
                      'TikTok no-watermark video & audio extraction',
                    ],
                  },
                  {
                    id: 'editor',
                    name: 'CapCut Pro Video Studio — 100% Free Browser NLE',
                    freeWithoutApiKey: true,
                    features: [
                      'Left-aligned 00:00 multi-track timeline (Zero AI / Zero API cost)',
                      'OfflineAudioContext 48kHz stereo pre-mix',
                      'Keyframes, speed curves, chroma key, 7 mask shapes',
                      'HSL 8-channel mixer, parametric curves, Lift/Gamma/Gain wheels',
                      '.SRT subtitle import/export & procedural WAV SFX synthesizer',
                    ],
                  },
                  {
                    id: 'thumbnail',
                    name: 'HD Thumbnail Designer — 100% Free',
                    freeWithoutApiKey: true,
                    features: ['1280x720 canvas, typography presets, filters, undo/redo'],
                  },
                ],
                geminiConfigured: Boolean(
                  req.headers.get('x-gemini-api-key') || process.env.GEMINI_API_KEY
                ),
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };

    case 'fahi://kotha/voices':
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                kothaPersonas: VOICE_PERSONAS,
                tonePresets: TONE_PRESETS,
                ecommerceCategories: ECOMMERCE_CATEGORIES,
              },
              null,
              2
            ),
          },
        ],
      };

    case 'fahi://aura/cinematography-rig':
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                cameras: [
                  'Dolly Push-in',
                  'Orbit 180°',
                  'Whip Pan',
                  'Crane Jib Rise',
                  'Steadicam Follow',
                  'Dutch Canted Angle',
                  'FPV Drone Dive',
                  'Vertigo Dolly Zoom',
                ],
                lenses: [
                  '16mm Ultra-Wide',
                  '35mm Cine Prime',
                  '50mm Natural Lens',
                  '85mm Portrait Bokeh',
                  '2.39:1 Anamorphic',
                ],
                lighting: [
                  'Golden Hour Sunflare',
                  'Cyberpunk Neon Noir',
                  'Volumetric God Rays',
                  'Moonlit Twilight Blue',
                  'Kodak 5247 35mm Grain',
                ],
                transitions: ['object-portal', 'whip-pan', 'match-cut-morph'],
              },
              null,
              2
            ),
          },
        ],
      };

    case 'fahi://capcut/studio-tools':
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                masks: [
                  'none',
                  'linear',
                  'mirror',
                  'circle',
                  'rectangle',
                  'heart',
                  'star',
                ],
                blendModes: [
                  'normal',
                  'multiply',
                  'screen',
                  'overlay',
                  'darken',
                  'lighten',
                  'color-dodge',
                  'difference',
                ],
                animations: [
                  'none',
                  'fade_in',
                  'zoom_in',
                  'slide_left',
                  'slide_up',
                  'spin_in',
                  'fade_out',
                  'zoom_out',
                  'shake',
                  'pendulum',
                  'pulse',
                ],
                sfxIds: ['whoosh', 'riser', 'bass_drop', 'ding', 'lofi_beat'],
              },
              null,
              2
            ),
          },
        ],
      };

    default:
      throw new Error(`Resource not found: ${uri}`);
  }
}

function getMcpPrompt(name: string, args: Record<string, any> = {}) {
  switch (name) {
    case 'bangla-viral-ugc-campaign': {
      const product = args.productName || 'প্রিমিয়াম প্রোডাক্ট';
      const price = args.offerPriceBn || 'বিশেষ ডিসকাউন্ট মূল্যে';
      const voice = args.voicePersona || 'Kore';
      return {
        description: `Complete 100% Free Bangladeshi UGC campaign workflow for ${product}`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please create a complete 100% Free Bangladeshi Bengali viral UGC campaign for "${product}" (${price}) using Fahi Videos MCP tools:
1. Call \`fahi_build_ugc_storyboard\` with productName="${product}", offerPriceBn="${price}", tone="commercial", sceneCount=5.
2. Call \`fahi_generate_bangla_tts\` with voiceName="${voice}" for the opening Hook and closing CTA scenes.
3. Call \`fahi_capcut_editor_blueprint\` for a 9:16 vertical reel timeline.
4. Present the complete 5-scene production sheet, phonetic reading guide, and .SRT subtitles.`,
            },
          },
        ],
      };
    }

    case 'free-yt-fb-insta-to-bangla-reel': {
      const mediaUrl = args.mediaUrl || 'https://www.instagram.com/reel/example';
      const topicBn = args.topicBn || '';
      return {
        description: `100% Free YT/FB/Insta download + Kotha Bangla dubbing + CapCut edit workflow`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Run the 100% Free Fahi Videos workflow for "${mediaUrl}":
1. Call \`fahi_extract_media_info\` with url="${mediaUrl}" to get the downloadable MP4/MP3 streams.
2. Call \`fahi_build_ugc_storyboard\` with productName="${topicBn}" to generate Bangladeshi Bengali voiceover scripts and .SRT subtitles.
3. Call \`fahi_generate_bangla_tts\` to synthesize the free Bengali narration audio.
4. Call \`fahi_capcut_editor_blueprint\` to prepare the 9:16 CapCut Video Studio settings.`,
            },
          },
        ],
      };
    }

    case 'youtube-thumbnail-and-seo-pack': {
      const topic = args.videoTopic || 'Tech Review';
      return {
        description: `Thumbnail & bilingual SEO workflow for: ${topic}`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Create a high-CTR YouTube Thumbnail & Bilingual (Bangla + English) SEO package for "${topic}":
1. Provide a bold 3-word thumbnail headline and subhead.
2. Call \`fahi_generate_image\` (16:9) for the thumbnail background visual.
3. Call \`fahi_translate_and_adapt_scene\` to craft a punchy 15-second Bengali intro hook.`,
            },
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
}

export async function handleMcpJsonRpc(
  req: Request,
  rpc: JsonRpcRequest
): Promise<JsonRpcResponse | null> {
  const id = rpc.id !== undefined ? rpc.id : null;
  const method = rpc.method;
  const params = rpc.params || {};

  if (method === 'notifications/initialized' || method === 'notifications/cancelled') {
    return null;
  }

  try {
    switch (method) {
      case 'initialize': {
        const clientVersion = params.protocolVersion;
        const negotiatedVersion = MCP_SERVER_INFO.supportedProtocolVersions.includes(
          clientVersion
        )
          ? clientVersion
          : MCP_SERVER_INFO.protocolVersion;
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: negotiatedVersion,
            capabilities: {
              tools: { listChanged: false },
              resources: { subscribe: false, listChanged: false },
              prompts: { listChanged: false },
            },
            serverInfo: {
              name: MCP_SERVER_INFO.name,
              title: MCP_SERVER_INFO.title,
              version: MCP_SERVER_INFO.version,
              websiteUrl: MCP_SERVER_INFO.websiteUrl,
              icons: MCP_SERVER_INFO.icons,
            },
            instructions:
              'Fahi Videos 2.5V 100% Free-First MCP Connector. All 10 tools (Kotha Studio Bangla TTS/Storyboards, YT/FB/Insta/TikTok Downloader, CapCut Video Studio Blueprints & SFX, Free Image Fallback, and CRM Leads) work 100% free without requiring a paid API key.',
          },
        };
      }

      case 'ping':
        return {
          jsonrpc: '2.0',
          id,
          result: {},
        };

      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: MCP_TOOLS,
          },
        };

      case 'tools/call': {
        const toolName = String(params.name || '');
        const toolArgs =
          params.arguments && typeof params.arguments === 'object'
            ? params.arguments
            : {};
        if (!toolName) {
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: 'Missing tool name in tools/call' },
          };
        }
        const result = await executeMcpTool(req, toolName, toolArgs);
        return {
          jsonrpc: '2.0',
          id,
          result,
        };
      }

      case 'resources/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            resources: MCP_RESOURCES,
          },
        };

      case 'resources/read': {
        const uri = String(params.uri || '');
        if (!uri) {
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: 'Missing resource uri' },
          };
        }
        const result = await readMcpResource(req, uri);
        return {
          jsonrpc: '2.0',
          id,
          result,
        };
      }

      case 'prompts/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            prompts: MCP_PROMPTS,
          },
        };

      case 'prompts/get': {
        const promptName = String(params.name || '');
        if (!promptName) {
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: 'Missing prompt name' },
          };
        }
        const result = getMcpPrompt(promptName, params.arguments || {});
        return {
          jsonrpc: '2.0',
          id,
          result,
        };
      }

      default:
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Method not found: ${method}`,
          },
        };
    }
  } catch (err: any) {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: err?.message || 'Internal MCP server error',
      },
    };
  }
}

export async function handleMcpHttp(req: Request): Promise<Response> {
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-MCP-API-Key, X-Gemini-API-Key, X-Aura-Client-Id, Accept, MCP-Protocol-Version',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const requiredToken = process.env.MCP_SECRET_TOKEN?.trim();
  if (requiredToken) {
    const authHeader = req.headers.get('authorization') || '';
    const bearer = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : '';
    const customHeader = req.headers.get('x-mcp-api-key')?.trim() || '';
    if (bearer !== requiredToken && customHeader !== requiredToken) {
      return Response.json(
        {
          jsonrpc: '2.0',
          id: null,
          error: { code: -32001, message: 'Unauthorized MCP client. Provide valid Bearer token or X-MCP-API-Key.' },
        },
        { status: 401, headers: corsHeaders }
      );
    }
  }

  if (req.method === 'GET') {
    const accept = req.headers.get('accept') || '';
    if (accept.includes('text/event-stream')) {
      const endpointUrl = new URL(req.url);
      const postEndpoint = `${endpointUrl.pathname}`;
      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(
            encoder.encode(`event: endpoint\ndata: ${postEndpoint}\n\n`)
          );
        },
      });
      return new Response(stream, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
    }

    return Response.json(
      {
        status: 'ok',
        freeTierReady: true,
        mcpServer: MCP_SERVER_INFO,
        endpoints: {
          streamableHttp: '/mcp',
          sse: '/mcp (Accept: text/event-stream)',
        },
        counts: {
          tools: MCP_TOOLS.length,
          resources: MCP_RESOURCES.length,
          prompts: MCP_PROMPTS.length,
        },
        tools: MCP_TOOLS.map((t) => ({
          name: t.name,
          title: t.title,
          description: t.description,
          annotations: t.annotations,
        })),
        resources: MCP_RESOURCES,
        prompts: MCP_PROMPTS,
      },
      { status: 200, headers: corsHeaders }
    );
  }

  if (req.method !== 'POST') {
    return Response.json(
      { error: 'Method not allowed' },
      { status: 405, headers: corsHeaders }
    );
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return Response.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error: Invalid JSON' },
      },
      { status: 400, headers: corsHeaders }
    );
  }

  if (Array.isArray(payload)) {
    const responses = (
      await Promise.all(payload.map((item) => handleMcpJsonRpc(req, item)))
    ).filter((r): r is JsonRpcResponse => r !== null);
    if (responses.length === 0) {
      return new Response(null, { status: 202, headers: corsHeaders });
    }
    return Response.json(responses, { status: 200, headers: corsHeaders });
  }

  const response = await handleMcpJsonRpc(req, payload);
  if (response === null) {
    return new Response(null, { status: 202, headers: corsHeaders });
  }

  const accept = req.headers.get('accept') || '';
  if (accept.includes('text/event-stream') && !accept.includes('application/json')) {
    const sseBody = `event: message\ndata: ${JSON.stringify(response)}\n\n`;
    return new Response(sseBody, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
  }

  return Response.json(response, { status: 200, headers: corsHeaders });
}
