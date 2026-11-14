'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Bot,
  Cpu,
  Copy,
  Check,
  ExternalLink,
  Terminal,
  Play,
  RefreshCw,
  Sparkles,
  Download,
  Mic,
  Video,
  Layers,
  Volume2,
  Database,
  Code2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Server,
  Zap,
} from 'lucide-react';
import {
  DIRECT_MCP_URL,
  MCPRUSH_GW_URL,
  MCP_CLIENT_CONFIGS,
  type McpClientId,
  type McpTransportMode,
} from '@/lib/mcp-client-configs';
import { studioBase } from '@/lib/studio-client';
import {
  MCPTRY_LISTING_URL,
  MCPTRY_BADGE_URL,
  MCPRUSH_LISTING_URL,
  MCPRUSH_BADGE_URL,
  type LiveMcpDirectoryStatus,
} from '@/lib/mcp-directory-status';

interface ToolDef {
  name: string;
  category: 'audio' | 'video' | 'media' | 'ai' | 'crm';
  badge: string;
  description: string;
  sampleArgs: Record<string, any>;
  promptExample: string;
}

const MCP_TOOLS_CATALOG: ToolDef[] = [
  {
    name: 'fahi_generate_bangla_tts',
    category: 'audio',
    badge: '100% Free · 4 Voices',
    description: 'Generates natural Bangladeshi Bengali speech (WAV/MP3 base64) with 3-tier fallback (Neural Bangla Stream, 24kHz synthesized WAV, and Gemini TTS).',
    sampleArgs: {
      text: 'আসসালামু আলাইকুম! ফাহি ভিডিও স্টুডিওতে স্বাগতম।',
      voiceName: 'Kore',
      durationSec: 3.5,
    },
    promptExample: 'Generate a lively Bengali voiceover saying "স্বাগতম আমাদের নতুন অফারে!" using the Puck voice persona.',
  },
  {
    name: 'fahi_extract_media_info',
    category: 'media',
    badge: 'YT, FB, Insta, TikTok',
    description: 'Extracts downloadable video and audio streaming formats (1080p, 720p, MP3) with direct CDN URLs from social media links.',
    sampleArgs: {
      url: 'https://www.instagram.com/reel/DfajF1zvsbl/',
    },
    promptExample: 'Extract direct download links and video quality formats for this Instagram Reel URL.',
  },
  {
    name: 'fahi_capcut_editor_blueprint',
    category: 'video',
    badge: 'NLE Studio Engine',
    description: 'Computes precision CapCut timeline blueprints, 30fps SMPTE timecodes, CSS mask clip-paths, and In/Out/Combo animations.',
    sampleArgs: {
      projectTitle: 'Summer Promo Reel',
      aspectRatio: '9:16',
      maskShape: 'rectangle',
      animIn: 'zoom_in',
      animOut: 'fade_out',
      durationSec: 15,
    },
    promptExample: 'Generate a 9:16 CapCut timeline blueprint with zoom-in transitions and rectangle masks.',
  },
  {
    name: 'fahi_build_ugc_storyboard',
    category: 'ai',
    badge: 'E-commerce Automation',
    description: 'Builds a multi-scene e-commerce UGC ad storyboard with scripts, Banglish director cues, and SRT subtitles.',
    sampleArgs: {
      productName: 'Smart LED Watch',
      category: 'gadgets',
      offerPriceBn: '৯৯৯ টাকা',
      tone: 'commercial',
      sceneCount: 5,
    },
    promptExample: 'Create a 5-scene UGC marketing storyboard for a premium gadget with an exclusive discount in Bengali.',
  },
  {
    name: 'fahi_translate_and_adapt_scene',
    category: 'ai',
    badge: 'Cultural Localization',
    description: 'Translates and culturally adapts English video narration into authentic Bangladeshi Bengali marketing copy.',
    sampleArgs: {
      englishSummary: 'Limited time offer! Grab your wireless earbuds today with free delivery.',
      tone: 'commercial',
    },
    promptExample: 'Adapt this English commercial script into catchy Dhaka-style colloquial Bengali.',
  },
  {
    name: 'fahi_generate_srt_subtitles',
    category: 'video',
    badge: 'Timed Subtitles',
    description: 'Generates standard formatted, timed .SRT subtitle blocks and 30fps CapCut timecodes for Bengali or bilingual scenes.',
    sampleArgs: {
      scenes: [
        {
          sceneNumber: 1,
          startTimeSec: 0,
          endTimeSec: 4.2,
          banglaScript: 'ফাহি ভিডিও এডিটর দিয়ে মাত্র কয়েক ক্লিকে প্রফেশনাল ভিডিও তৈরি করুন।',
          titleEn: 'Create pro videos in a few clicks',
        },
      ],
      bilingual: true,
    },
    promptExample: 'Generate timed .SRT subtitle blocks for a 15-second promo script.',
  },
  {
    name: 'fahi_synthesize_studio_sfx',
    category: 'audio',
    badge: 'Pure Studio WAV',
    description: 'Synthesizes playable 22.05kHz PCM WAV sound effects and beat loops (whoosh, riser, bass_drop, ding, lofi_beat) with zero external assets.',
    sampleArgs: {
      sfxId: 'whoosh',
    },
    promptExample: 'Generate a studio whoosh transition sound effect for a video clip split.',
  },
  {
    name: 'fahi_enhance_cinematic_prompt',
    category: 'ai',
    badge: 'Cinematic AI Prompts',
    description: 'Enhances raw user concepts into cinema-grade prompts incorporating camera movement, lens optics, lighting atmosphere, and pacing.',
    sampleArgs: {
      prompt: 'A traditional tea stall in Old Dhaka during monsoon rain',
      camera: 'Dolly Push-in',
      lens: '35mm Cine Prime',
      lighting: 'Neon reflections on wet pavement',
      motionSpeed: 'smooth cinematic momentum',
    },
    promptExample: 'Transform "tea stall in rainy Dhaka" into a cinematic 8K Veo video generation prompt.',
  },
  {
    name: 'fahi_generate_image',
    category: 'ai',
    badge: 'Visual Scene Generator',
    description: 'Generates visual thumbnails and scenes with intelligent free-tier fallbacks.',
    sampleArgs: {
      prompt: 'Vibrant neon gaming thumbnail for video editor',
      aspectRatio: '16:9',
    },
    promptExample: 'Generate an eye-catching YouTube thumbnail for a video editing tutorial.',
  },
  {
    name: 'fahi_crm_leads',
    category: 'crm',
    badge: 'Lead & Order Capture',
    description: 'Lists current CRM leads & pipeline statistics or adds a new customer order inquiry.',
    sampleArgs: {
      action: 'list',
    },
    promptExample: 'Show CRM statistics and recent customer inquiries.',
  },
];

export default function McpConfigHub() {
  const [activeClientTab, setActiveClientTab] = useState<McpClientId>('cursor');
  const [transportMode, setTransportMode] = useState<McpTransportMode>('direct');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Live Server Health & Directory Verification State
  const [isPinging, setIsPinging] = useState(false);
  const [pingStatus, setPingStatus] = useState<'online' | 'error' | 'checking'>('checking');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [serverMeta, setServerMeta] = useState<{
    name: string;
    version: string;
    protocolVersion: string;
    toolsCount: number;
  }>({
    name: 'fahi-videos-mcp-connector',
    version: '2.6.0',
    protocolVersion: '2025-06-18',
    toolsCount: 10,
  });
  const [directoryStatus, setDirectoryStatus] = useState<LiveMcpDirectoryStatus | null>(null);

  // Playground State
  const [selectedTool, setSelectedTool] = useState<string>('fahi_synthesize_studio_sfx');
  const [toolPayloadInput, setToolPayloadInput] = useState<string>('{\n  "sfxId": "whoosh"\n}');
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testLatency, setTestLatency] = useState<number | null>(null);

  // Filter tool category
  const [filterCat, setFilterCat] = useState<'all' | 'audio' | 'video' | 'media' | 'ai' | 'crm'>('all');

  const liveEndpoint = DIRECT_MCP_URL;

  const fetchDirectoryStatus = async () => {
    try {
      const res = await fetch(`${studioBase}/api/mcp/directory-status`);
      if (res.ok) {
        const json: LiveMcpDirectoryStatus = await res.json();
        setDirectoryStatus(json);
      }
    } catch {
      // Keep directoryStatus null if offline rather than inventing scores
    }
  };

  // Live Ping Checker (checks initialize + tools/list + live directory rank/health)
  const checkLiveHealth = async () => {
    setIsPinging(true);
    const start = performance.now();
    try {
      const [initRes, toolsRes] = await Promise.all([
        fetch(`${studioBase}/mcp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'init-check',
            method: 'initialize',
            params: {
              protocolVersion: '2025-06-18',
              clientInfo: { name: 'fahi-mcp-hub', version: '2.6.0' },
            },
          }),
        }),
        fetch(`${studioBase}/mcp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'ping-check',
            method: 'tools/list',
          }),
        }),
      ]);
      const end = performance.now();
      const elapsed = Math.round(end - start);
      setLatencyMs(elapsed);

      if (toolsRes.ok) {
        const toolsData = await toolsRes.json();
        const initData = initRes.ok ? await initRes.json() : null;
        setPingStatus('online');
        setServerMeta((prev) => ({
          name: initData?.result?.serverInfo?.name || prev.name,
          version: initData?.result?.serverInfo?.version || prev.version,
          protocolVersion: initData?.result?.protocolVersion || prev.protocolVersion,
          toolsCount: toolsData.result?.tools?.length ?? prev.toolsCount,
        }));
      } else {
        setPingStatus('error');
      }
    } catch {
      setPingStatus('error');
      setLatencyMs(null);
    } finally {
      setIsPinging(false);
    }
  };

  useEffect(() => {
    void checkLiveHealth();
    void fetchDirectoryStatus();
  }, []);

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2200);
    } catch {
      // Fallback
    }
  };

  // Change selected tool in playground
  const handleSelectToolForTest = (toolName: string) => {
    setSelectedTool(toolName);
    const found = MCP_TOOLS_CATALOG.find((t) => t.name === toolName);
    if (found) {
      setToolPayloadInput(JSON.stringify(found.sampleArgs, null, 2));
    }
    setTestResult(null);
  };

  // Run Playground Tool Execution
  const handleExecutePlaygroundTool = async () => {
    setIsRunningTest(true);
    setTestResult(null);
    setTestLatency(null);
    const start = performance.now();

    try {
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(toolPayloadInput);
      } catch (e: any) {
        setTestResult({
          error: `Invalid JSON Arguments: ${e.message}`,
        });
        setIsRunningTest(false);
        return;
      }

      const response = await fetch(`${studioBase}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: `playground-${Date.now()}`,
          method: 'tools/call',
          params: {
            name: selectedTool,
            arguments: parsedArgs,
          },
        }),
      });

      const elapsed = Math.round(performance.now() - start);
      setTestLatency(elapsed);

      const json = await response.json();
      setTestResult(json);
    } catch (err: any) {
      setTestResult({ error: err.message || 'Execution error' });
    } finally {
      setIsRunningTest(false);
    }
  };

  // Active client configuration selection (16 official clients)
  const activeClient =
    MCP_CLIENT_CONFIGS.find((client) => client.id === activeClientTab) || MCP_CLIENT_CONFIGS[0];
  const activeVariant = activeClient.variants[transportMode];
  const activeEndpointUrl = transportMode === 'direct' ? DIRECT_MCP_URL : MCPRUSH_GW_URL;

  const filteredTools =
    filterCat === 'all'
      ? MCP_TOOLS_CATALOG
      : MCP_TOOLS_CATALOG.filter((t) => t.category === filterCat);

  return (
    <div className="space-y-8 text-slate-100 max-w-6xl mx-auto py-2">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#0B1120] to-[#050810] border border-cyan-500/25 p-6 sm:p-8 shadow-[0_0_50px_rgba(0,200,255,0.12)]">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/15 border border-cyan-400/30 text-cyan-300">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Official Model Context Protocol (MCP) Hub</span>
              <span className="text-[10px] bg-cyan-400/20 px-1.5 py-0.5 rounded text-cyan-200">v{serverMeta.version}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
              Fahi Videos <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">MCP AI Connector</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
              Connect Claude Desktop, Cursor IDE, Windsurf, and AI Agents to FahiVids. Control Bengali voiceovers, social media video downloads, CapCut timeline editing, and audio SFX with 10 zero-key free tools.
            </p>
          </div>

          {/* Live Server Status Card */}
          <div className="w-full md:w-auto shrink-0 bg-[#080D1A]/90 border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-md min-w-[280px]">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  {pingStatus === 'online' && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-3 w-3 ${
                      pingStatus === 'online'
                        ? 'bg-emerald-500'
                        : pingStatus === 'error'
                        ? 'bg-rose-500'
                        : 'bg-amber-500'
                    }`}
                  />
                </span>
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                  {pingStatus === 'online' ? 'Live & Operational' : pingStatus === 'error' ? 'Server Offline' : 'Checking...'}
                </span>
              </div>
              <button
                onClick={() => {
                  void checkLiveHealth();
                  void fetchDirectoryStatus();
                }}
                disabled={isPinging}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Refresh Health & Directory Status"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 text-xs">
              <div>
                <span className="text-slate-400 text-[11px]">Latency</span>
                <p className="font-mono font-bold text-cyan-300">
                  {latencyMs !== null ? `${latencyMs} ms` : '--'}
                </p>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Active Tools</span>
                <p className="font-mono font-bold text-emerald-400">
                  {serverMeta.toolsCount} Free Tools
                </p>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Protocol</span>
                <p className="font-mono text-[11px] text-slate-200">{serverMeta.protocolVersion}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Registries</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <a
                    href={MCPRUSH_LISTING_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-lime-300 hover:text-lime-200 hover:underline"
                  >
                    <span>
                      {directoryStatus?.mcprush.grade
                        ? `mcprush (${directoryStatus.mcprush.grade})`
                        : 'mcprush'}
                    </span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  <span className="text-slate-600">·</span>
                  <a
                    href={MCPTRY_LISTING_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-indigo-300 hover:text-indigo-200 hover:underline"
                  >
                    <span>
                      {directoryStatus?.mcptry.rankScore !== null &&
                      directoryStatus?.mcptry.rankScore !== undefined
                        ? `mcptry (${directoryStatus.mcptry.rankScore}/${directoryStatus.mcptry.rankMax ?? 100})`
                        : 'mcptry (Live)'}
                    </span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Endpoint Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#090E1A] border border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-semibold">Live Remote MCP Endpoint URL</div>
            <div className="font-mono text-sm sm:text-base font-bold text-cyan-200 break-all select-all">
              {liveEndpoint}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => handleCopy(liveEndpoint, 'endpoint')}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 text-xs font-bold transition-all shrink-0 cursor-pointer shadow-[0_0_12px_rgba(0,200,255,0.15)]"
        >
          {copiedKey === 'endpoint' ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-300">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy Endpoint</span>
            </>
          )}
        </button>
      </div>

      {/* 1-Click Client Setup Configurator (All 16 Official Clients) */}
      <div className="rounded-3xl bg-[#080D1A] border border-white/10 p-6 space-y-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-cyan-400" />
              <span>1-Click AI Client Configuration (16 Clients)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select any AI client, IDE, CLI, or SDK to copy its verified MCP JSON, TOML, YAML, or command setup.
            </p>
          </div>

          {/* Endpoint Mode Switcher */}
          <div className="flex items-center p-1 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold shrink-0">
            <button
              type="button"
              onClick={() => setTransportMode('direct')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                transportMode === 'direct'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Direct Free (Zero Key)
            </button>
            <button
              type="button"
              onClick={() => setTransportMode('mcprush')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                transportMode === 'mcprush'
                  ? 'bg-lime-500/20 text-lime-300 border border-lime-400/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              mcprush Gateway (Key)
            </button>
          </div>
        </div>

        {/* 16-Client Selector Pills */}
        <div className="flex flex-wrap gap-2">
          {MCP_CLIENT_CONFIGS.map((client) => {
            const isSelected = activeClient.id === client.id;
            return (
              <button
                key={client.id}
                type="button"
                onClick={() => setActiveClientTab(client.id)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/50 shadow-[0_0_16px_rgba(34,211,238,0.18)]'
                    : 'bg-white/[0.03] text-slate-300 border-white/10 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                <span
                  className={`font-mono text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                    isSelected
                      ? 'bg-cyan-400/25 text-cyan-200'
                      : 'bg-white/10 text-slate-400'
                  }`}
                >
                  {client.shortCode}
                </span>
                <span>{client.name}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Client Primary Config */}
        <div className="space-y-4">
          <div className="relative">
            <div className="text-[11px] text-slate-400 mb-2 font-mono flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 font-bold text-[10px] shrink-0">
                  {activeVariant.primary.format}
                </span>
                <span className="truncate">{activeVariant.primary.label}</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleCopy(activeVariant.primary.code, `snippet-${activeClient.id}-${transportMode}-primary`)
                }
                className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer shrink-0"
              >
                {copiedKey === `snippet-${activeClient.id}-${transportMode}-primary` ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy {activeVariant.primary.format}</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-4 rounded-2xl bg-black/60 border border-white/10 font-mono text-xs text-cyan-300 overflow-x-auto leading-relaxed shadow-inner">
              <code>{activeVariant.primary.code}</code>
            </pre>
          </div>

          {activeVariant.secondary && (
            <div className="relative">
              <div className="text-[11px] text-slate-400 mb-2 font-mono flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="px-2 py-0.5 rounded bg-indigo-500/15 border border-indigo-400/30 text-indigo-300 font-bold text-[10px] shrink-0">
                    {activeVariant.secondary.format}
                  </span>
                  <span className="truncate">{activeVariant.secondary.label}</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      activeVariant.secondary!.code,
                      `snippet-${activeClient.id}-${transportMode}-secondary`
                    )
                  }
                  className="flex items-center gap-1.5 text-xs text-indigo-300 hover:text-indigo-200 font-bold cursor-pointer shrink-0"
                >
                  {copiedKey === `snippet-${activeClient.id}-${transportMode}-secondary` ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy {activeVariant.secondary.format}</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-4 rounded-2xl bg-black/60 border border-white/10 font-mono text-xs text-indigo-200 overflow-x-auto leading-relaxed shadow-inner">
                <code>{activeVariant.secondary.code}</code>
              </pre>
            </div>
          )}

          {/* Setup Note & Active Endpoint */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-xs text-slate-300">
            <p className="leading-relaxed">{activeVariant.instruction}</p>
            <span className="font-mono text-[11px] text-slate-400 shrink-0 break-all">
              {activeEndpointUrl}
            </span>
          </div>
        </div>
      </div>

      {/* Live Interactive MCP Playground & Tester */}
      <div className="rounded-3xl bg-[#080D1A] border border-cyan-500/20 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Play className="w-5 h-5 text-emerald-400 fill-emerald-400" />
              <span>Interactive MCP Tool Playground (Live Execution)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select any of the 10 tools and trigger a real JSON-RPC call directly against the live server.
            </p>
          </div>

          {testLatency !== null && (
            <div className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              Completed in {testLatency} ms
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Input Controls */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Select MCP Tool to Test
              </label>
              <select
                value={selectedTool}
                onChange={(e) => handleSelectToolForTest(e.target.value)}
                className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                {MCP_TOOLS_CATALOG.map((tool) => (
                  <option key={tool.name} value={tool.name} className="bg-[#0B0F1A] text-slate-200">
                    {tool.name} ({tool.badge})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-300">
                  JSON Tool Arguments (`params.arguments`)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const found = MCP_TOOLS_CATALOG.find((t) => t.name === selectedTool);
                    if (found) setToolPayloadInput(JSON.stringify(found.sampleArgs, null, 2));
                  }}
                  className="text-[11px] text-cyan-400 hover:underline cursor-pointer"
                >
                  Reset Sample
                </button>
              </div>
              <textarea
                value={toolPayloadInput}
                onChange={(e) => setToolPayloadInput(e.target.value)}
                rows={6}
                className="w-full bg-black/60 border border-white/15 rounded-xl p-3 font-mono text-xs text-cyan-200 focus:outline-none focus:border-cyan-400 leading-relaxed"
              />
            </div>

            <button
              type="button"
              onClick={handleExecutePlaygroundTool}
              disabled={isRunningTest}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer disabled:opacity-50"
            >
              {isRunningTest ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Executing Live Tool...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-black" />
                  <span>Execute Live Tool Call (`POST /mcp`)</span>
                </>
              )}
            </button>
          </div>

          {/* Output Display */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Live JSON-RPC Response</span>
              {testResult && (
                <button
                  onClick={() => handleCopy(JSON.stringify(testResult, null, 2), 'playground-res')}
                  className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedKey === 'playground-res' ? 'Copied!' : 'Copy Response'}</span>
                </button>
              )}
            </div>

            <pre className="h-[210px] p-3 rounded-xl bg-black/80 border border-white/10 font-mono text-xs text-slate-300 overflow-y-auto leading-relaxed">
              {testResult ? (
                <code>{JSON.stringify(testResult, null, 2)}</code>
              ) : (
                <span className="text-slate-500 italic">
                  Click &ldquo;Execute Live Tool Call&rdquo; to test real execution and inspect output.
                </span>
              )}
            </pre>
          </div>
        </div>
      </div>

      {/* Visual Catalog of 10 MCP Tools */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Code2 className="w-5 h-5 text-indigo-400" />
              <span>Full MCP Tools Schema & Capabilities (10 Tools)</span>
            </h2>
            <p className="text-xs text-slate-400">
              All tools run on the free core server tier without requiring external API keys.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1">
            {(['all', 'audio', 'video', 'media', 'ai', 'crm'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  filterCat === cat
                    ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-400/40'
                    : 'bg-white/5 text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTools.map((tool) => {
            const isSelected = selectedTool === tool.name;
            return (
              <div
                key={tool.name}
                className={`p-4 rounded-2xl bg-[#090D18] border transition-all ${
                  isSelected
                    ? 'border-cyan-400/50 shadow-[0_0_20px_rgba(0,200,255,0.15)]'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="font-mono font-bold text-sm text-cyan-300 break-all">
                    {tool.name}
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 shrink-0">
                    {tool.badge}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  {tool.description}
                </p>

                <div className="space-y-2 bg-black/40 p-2.5 rounded-xl border border-white/5 text-[11px]">
                  <div>
                    <span className="text-slate-400 font-semibold">Agent Prompt Idea: </span>
                    <span className="text-slate-200 italic">&ldquo;{tool.promptExample}&rdquo;</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectToolForTest(tool.name);
                      window.scrollTo({ top: 350, behavior: 'smooth' });
                    }}
                    className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Test in Playground</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopy(JSON.stringify(tool.sampleArgs, null, 2), `args-${tool.name}`)}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedKey === `args-${tool.name}` ? 'Copied Args!' : 'Copy Args'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Official Registry Badges & Links Footer */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0B0F1A] via-[#090D16] to-[#0B0F1A] border border-white/10 flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="space-y-4 flex-1">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-white">
                  Verified on Global MCP Directories
                </h3>
                {directoryStatus?.mcptry.rankScore !== null &&
                  directoryStatus?.mcptry.rankScore !== undefined && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/15 border border-emerald-400/35 text-emerald-300">
                      mcptry {directoryStatus.mcptry.rankScore}/{directoryStatus.mcptry.rankMax ?? 100}
                    </span>
                  )}
                {directoryStatus?.mcprush.grade && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-lime-500/15 border border-lime-400/35 text-lime-200">
                    mcprush Grade {directoryStatus.mcprush.grade}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Listed &amp; verified on the official GitHub Model Context Protocol Registry,{' '}
                {directoryStatus ? (
                  <>
                    mcprush.com (
                    {[
                      directoryStatus.mcprush.grade
                        ? `Grade ${directoryStatus.mcprush.grade}`
                        : directoryStatus.mcprush.statusLabel || 'Verified',
                      directoryStatus.mcprush.version ? `v${directoryStatus.mcprush.version}` : null,
                      directoryStatus.mcprush.clientsCount
                        ? `Works with ${directoryStatus.mcprush.clientsCount} Clients`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                    ), and{' '}
                    <span className="text-slate-200 font-semibold">
                      mcptry.com (
                      {directoryStatus.mcptry.rankScore !== null
                        ? [
                            directoryStatus.mcptry.status === 'working'
                              ? 'Working'
                              : directoryStatus.mcptry.status,
                            `${directoryStatus.mcptry.rankScore}/${directoryStatus.mcptry.rankMax ?? 100}`,
                            directoryStatus.mcptry.uptime30d
                              ? `${directoryStatus.mcptry.uptime30d} 30d uptime`
                              : null,
                            directoryStatus.mcptry.latencyGermanyMs !== null
                              ? `${directoryStatus.mcptry.latencyGermanyMs}ms EU`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')
                        : 'Live Rank & Uptime Monitor'}
                      )
                    </span>
                    .
                  </>
                ) : (
                  'mcprush.com (16 AI Clients), and mcptry.com (Live Rank & Uptime Monitor).'
                )}
              </p>

              {directoryStatus?.mcptry.breakdown && directoryStatus.mcptry.breakdown.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                  {directoryStatus.mcptry.breakdown.map((item) => (
                    <span
                      key={item.label}
                      className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10 text-[10px] font-mono text-slate-300"
                    >
                      {item.label}: <span className="text-emerald-300 font-bold">{item.score}/{item.max}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <a
              href={MCPRUSH_LISTING_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-lime-500/15 hover:bg-lime-500/25 border border-lime-400/30 text-xs font-bold text-lime-200 transition-colors"
            >
              <span>
                {directoryStatus?.mcprush.grade
                  ? `mcprush Listing (Grade ${directoryStatus.mcprush.grade})`
                  : 'mcprush Listing'}
              </span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href={MCPTRY_LISTING_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-bold text-white transition-colors"
            >
              <span>
                {directoryStatus?.mcptry.rankScore !== null &&
                directoryStatus?.mcptry.rankScore !== undefined
                  ? `mcptry Status & Playground (${directoryStatus.mcptry.rankScore}/${directoryStatus.mcptry.rankMax ?? 100})`
                  : 'mcptry Status & Playground'}
              </span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href="https://github.com/khondokartowsif171/Fahi-Videos-2.5V"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/40 border border-indigo-500/40 text-xs font-bold text-indigo-200 transition-colors"
            >
              <span>GitHub Repository</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div className="shrink-0 flex flex-col items-start lg:items-end gap-3">
          <a
            href={MCPTRY_LISTING_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-emerald-400/40 transition-colors"
            title="Live mcptry Status & Score Badge"
          >
            <img
              width={133}
              height={20}
              src={MCPTRY_BADGE_URL}
              alt="mcptry status and rank score badge"
              loading="lazy"
              className="block h-5 w-auto"
            />
          </a>
          <a
            href={MCPRUSH_LISTING_URL}
            target="_blank"
            rel="noreferrer"
            className="block rounded-2xl overflow-hidden border border-white/10 hover:border-lime-400/40 transition-all shadow-xl"
          >
            <img
              width={380}
              height={200}
              src={MCPRUSH_BADGE_URL}
              alt="Fahi-Videos MCP server"
              loading="lazy"
              className="block max-w-full h-auto"
            />
          </a>
        </div>
      </div>
    </div>
  );
}
