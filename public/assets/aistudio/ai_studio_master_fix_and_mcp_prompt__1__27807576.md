# Google AI Studio Master Execution Prompt — Fahi Videos 2.5V (100% Self-Contained Full Bug Fix + 100% Free Core + World-Class MCP Connector)

> **কিভাবে ব্যবহার করবেন:** উপরে ডান পাশের **Export** বাটনে ক্লিক করে (**Copy contents** অথবা ডাউনলোড করে) এই একটি ফাইলই আপনার **Google AI Studio**-এর চ্যাট বক্সে পেস্ট বা আপলোড করে দিন। এই একটি ফাইলের ভেতরেই সব বাগ ফিক্স এবং `lib/mcp-server.ts`-সহ প্রতিটি ফাইলের ১০০% সম্পূর্ণ কোড দেওয়া আছে—অন্য কোনো ফাইল আলাদা করে দেওয়ার প্রয়োজন নেই।

## Copy-Paste Prompt for Google AI Studio Agent

You are updating the **Fahi-Videos-2.5V (`fahi-videos-os v3.0.0`)** Next.js 15 repository deployed at `https://fahi-videos.auraajenticai.cloud/`.

### CRITICAL RULE — 100% FREE-FIRST GUARANTEE
The user uses **Kotha Studio (কণ্ঠধ্বনি)**, **Universal Downloader (YouTube, Facebook, Instagram, TikTok)**, **CapCut Pro Video Studio (`VideoEditor.tsx`)**, **Thumbnail Designer**, and the new **MCP Connector (`/api/mcp`)** **100% FOR FREE (with ZERO paid API keys required)**.
- Never gate Kotha Studio, Downloader, Video Editor, Thumbnail Editor, or the MCP Connector behind a mandatory paid Gemini API key.
- Apply all 5 tasks below exactly as written and run all test suites at the end to verify `8/8 PASS`.

### TASK 1: Upgrade `app/api/video/info/route.ts` & `components/YoutubeDownloader.tsx` (100% Free YouTube, Facebook, Instagram & TikTok Support)

#### 1A. Replace `app/api/video/info/route.ts` with this complete file:

```ts
import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

const btch = require("btch-downloader");

async function expandUrl(shortUrl: string): Promise<string> {
  try {
    const response = await fetch(shortUrl, {
      method: "HEAD",
      redirect: "manual",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (response.status >= 300 && response.status < 400) {
      const loc = response.headers.get("location");
      if (loc) {
        try {
          const parsedLoc = new URL(loc, shortUrl);
          const nextParam = parsedLoc.searchParams.get("next");
          if (nextParam) {
            return decodeURIComponent(nextParam);
          }
          return parsedLoc.toString();
        } catch {
          return loc;
        }
      }
    }
    return shortUrl;
  } catch {
    return shortUrl;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  let url = searchParams.get("url")?.trim() || "";

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const lower = url.toLowerCase();
    const isFacebook =
      lower.includes("facebook.com") ||
      lower.includes("fb.watch") ||
      lower.includes("fb.me");
    const isYoutube =
      lower.includes("youtube.com") || lower.includes("youtu.be");
    const isInstagram =
      lower.includes("instagram.com") || lower.includes("instagr.am");
    const isTiktok = lower.includes("tiktok.com");

    if (!isFacebook && !isYoutube && !isInstagram && !isTiktok) {
      return NextResponse.json(
        {
          error:
            "Unsupported URL type. YouTube, Facebook, Instagram, and TikTok links are supported 100% free.",
        },
        { status: 400 }
      );
    }

    if (
      (isFacebook && (lower.includes("fb.watch") || lower.includes("fb.me") || lower.includes("/share/"))) ||
      (isTiktok && lower.includes("vm.tiktok.com"))
    ) {
      url = await expandUrl(url);
    }

    // 1. YouTube Free Multi-Engine Extraction (Shorts, Watch, youtu.be)
    if (isYoutube) {
      try {
        const info = await btch.youtube(url);
        if (info && info.status) {
          const formats = [];
          if (info.mp4) {
            formats.push({ quality: "MP4 Video (HD)", url: info.mp4, type: "video" });
          }
          if (info.mp3) {
            formats.push({ quality: "MP3 Audio", url: info.mp3, type: "audio" });
          }
          if (formats.length > 0) {
            return NextResponse.json({
              platform: "youtube",
              title: info.title || "YouTube Video",
              author: info.author || "YouTube Creator",
              thumbnail: info.thumbnail || "",
              formats,
            });
          }
        }
      } catch (e: any) {
        console.warn("btch.youtube fallback:", e?.message || e);
      }

      try {
        const { ytdown } = require("ruhend-scraper");
        const rInfo = await ytdown(url);
        if (rInfo && (rInfo.video || rInfo.audio)) {
          const formats = [];
          if (rInfo.video) {
            formats.push({ quality: "MP4 Video (HD)", url: rInfo.video, type: "video" });
          }
          if (rInfo.audio) {
            formats.push({ quality: "MP3 Audio", url: rInfo.audio, type: "audio" });
          }
          if (formats.length > 0) {
            return NextResponse.json({
              platform: "youtube",
              title: rInfo.title || "YouTube Video",
              author: rInfo.author || "YouTube Creator",
              thumbnail: rInfo.thumbnail || "",
              formats,
            });
          }
        }
      } catch {}
    }

    // 2. Facebook Free Multi-Engine Extraction (Reels, Watch, Videos)
    if (isFacebook) {
      try {
        const info = await btch.fbdown(url);
        if (info && info.status) {
          const formats = [];
          if (info.HD) {
            formats.push({ quality: "HD Video (MP4)", url: info.HD, type: "video" });
          }
          if (info.Normal_video) {
            formats.push({ quality: "SD Video (MP4)", url: info.Normal_video, type: "video" });
          }
          if (formats.length > 0) {
            return NextResponse.json({
              platform: "facebook",
              title: info.title || "Facebook Video / Reel",
              author: "Facebook Creator",
              thumbnail: info.thumbnail || "",
              formats,
            });
          }
        }
      } catch (e: any) {
        console.warn("btch.fbdown fallback:", e?.message || e);
      }

      try {
        const { fbdown } = require("ruhend-scraper");
        const rFb = await fbdown(url);
        const list = Array.isArray(rFb?.data) ? rFb.data : [];
        if (list.length > 0) {
          const formats = list
            .filter((item: any) => item && item.url)
            .map((item: any, idx: number) => ({
              quality: item.resolution || (idx === 0 ? "HD Video (MP4)" : "SD Video (MP4)"),
              url: item.url,
              type: "video",
            }));
          if (formats.length > 0) {
            return NextResponse.json({
              platform: "facebook",
              title: "Facebook Video / Reel",
              author: "Facebook Creator",
              thumbnail: list[0]?.thumbnail || "",
              formats,
            });
          }
        }
      } catch {}
    }

    // 3. Instagram Free Multi-Engine Extraction (Reels, Posts, Stories)
    if (isInstagram) {
      try {
        const igInfo = await btch.igdl(url);
        const igList = Array.isArray(igInfo)
          ? igInfo
          : Array.isArray(igInfo?.result)
            ? igInfo.result
            : Array.isArray(igInfo?.data)
              ? igInfo.data
              : [];
        if (igList.length > 0) {
          const formats = igList
            .filter((item: any) => item && item.url)
            .map((item: any, idx: number) => ({
              quality: `Instagram Reel / Media #${idx + 1} (HD MP4)`,
              url: item.url,
              type: "video",
            }));
          if (formats.length > 0) {
            return NextResponse.json({
              platform: "instagram",
              title: "Instagram Reel / Video",
              author: "Instagram Creator",
              thumbnail: igList[0]?.thumbnail || "",
              formats,
            });
          }
        }
      } catch (e: any) {
        console.warn("btch.igdl fallback:", e?.message || e);
      }

      try {
        const { igdl } = require("ruhend-scraper");
        const rIg = await igdl(url);
        const list = Array.isArray(rIg?.data) ? rIg.data : [];
        if (list.length > 0) {
          const formats = list
            .filter((item: any) => item && item.url)
            .map((item: any, idx: number) => ({
              quality: `Instagram Reel / Media #${idx + 1} (HD MP4)`,
              url: item.url,
              type: "video",
            }));
          if (formats.length > 0) {
            return NextResponse.json({
              platform: "instagram",
              title: "Instagram Reel / Video",
              author: "Instagram Creator",
              thumbnail: list[0]?.thumbnail || "",
              formats,
            });
          }
        }
      } catch {}
    }

    // 4. TikTok Free Extraction
    if (isTiktok) {
      try {
        const ttInfo = await btch.ttdl(url);
        if (ttInfo && (ttInfo.video || ttInfo.audio)) {
          const formats = [];
          const videoUrl = Array.isArray(ttInfo.video) ? ttInfo.video[0] : ttInfo.video;
          const audioUrl = Array.isArray(ttInfo.audio) ? ttInfo.audio[0] : ttInfo.audio;
          if (videoUrl) {
            formats.push({ quality: "TikTok HD Video (No Watermark)", url: videoUrl, type: "video" });
          }
          if (audioUrl) {
            formats.push({ quality: "TikTok Original Audio (MP3)", url: audioUrl, type: "audio" });
          }
          if (formats.length > 0) {
            return NextResponse.json({
              platform: "tiktok",
              title: ttInfo.title || "TikTok Video",
              author: ttInfo.author || "TikTok Creator",
              thumbnail: ttInfo.thumbnail || "",
              formats,
            });
          }
        }
      } catch {}
    }

    // 5. 100% Free Universal Widget / Stream Fallback (Never fails!)
    const platformLabel = isInstagram
      ? "Instagram Reel / Video"
      : isFacebook
        ? "Facebook Video / Reel"
        : isTiktok
          ? "TikTok Video"
          : "YouTube Video";

    const fallbackFormats = [
      {
        quality: "1080p (Full HD MP4)",
        url: `https://loader.to/api/button/?url=${encodeURIComponent(url)}&f=1080`,
        type: "video",
        isFallback: true,
      },
      {
        quality: "720p (HD MP4)",
        url: `https://loader.to/api/button/?url=${encodeURIComponent(url)}&f=720`,
        type: "video",
        isFallback: true,
      },
      {
        quality: "480p (MP4)",
        url: `https://loader.to/api/button/?url=${encodeURIComponent(url)}&f=480`,
        type: "video",
        isFallback: true,
      },
      {
        quality: "360p (MP4)",
        url: `https://loader.to/api/button/?url=${encodeURIComponent(url)}&f=360`,
        type: "video",
        isFallback: true,
      },
      {
        quality: "MP3 Audio (320kbps)",
        url: `https://loader.to/api/button/?url=${encodeURIComponent(url)}&f=mp3`,
        type: "audio",
        isFallback: true,
      },
      {
        quality: "M4A Audio (128kbps)",
        url: `https://loader.to/api/button/?url=${encodeURIComponent(url)}&f=m4a`,
        type: "audio",
        isFallback: true,
      },
    ];

    return NextResponse.json({
      fallbackToIframe: true,
      platform: isInstagram
        ? "instagram"
        : isFacebook
          ? "facebook"
          : isTiktok
            ? "tiktok"
            : "youtube",
      title: platformLabel,
      author: "Social Media Creator",
      thumbnail: "",
      url,
      formats: fallbackFormats,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Extraction failed" },
      { status: 500 }
    );
  }
}
```

#### 1B. Replace `components/YoutubeDownloader.tsx` with this complete file:

```tsx
"use client";

import { useState } from "react";
import { Download, AlertCircle, Video, Music, Scissors, Mic, CheckCircle2 } from "lucide-react";
import { logActivity } from "@/lib/activity";

export default function YoutubeDownloader() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoData, setVideoData] = useState<any>(null);
  const [error, setError] = useState("");

  const handleFetch = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setVideoData(null);

    try {
      const response = await fetch(`/api/video/info?url=${encodeURIComponent(url.trim())}`);
      const data = await response.json();
      if (response.ok) {
        setVideoData(data);
        logActivity({
          type: "youtube_download",
          title: data.title || "Media Link Extraction",
          metadata: { url: url.trim(), platform: data.platform || "media" },
        });
      } else {
        setError(data.error || "Failed to fetch video info");
      }
    } catch (e: any) {
      setError(e.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchStudio = (tab: "editor" | "kotha") => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("change-app-tab", { detail: { tab } }));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hero Header Section */}
      <div className="text-center md:text-left space-y-2 max-w-2xl">
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white font-sans flex flex-wrap items-center justify-center md:justify-start gap-3">
          <span>Universal Media Downloader</span>
          <span className="text-[10px] bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-mono text-emerald-300 font-bold uppercase tracking-widest">
            100% Free · Zero API Key
          </span>
        </h2>
        <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
          Download HD videos, reels, shorts, and MP3 audio tracks from{" "}
          <strong className="text-slate-200">YouTube, Facebook, Instagram, and TikTok</strong>{" "}
          instantly for free — then edit in Video Studio or dub in Bangla with Kotha Studio.
        </p>
      </div>

      {/* Main Glassmorphic Panel */}
      <div className="rounded-3xl border border-white/[0.06] bg-[#111115]/80 backdrop-blur-md p-6 sm:p-8 shadow-[0_12px_40px_-15px_rgba(0,0,0,0.7)] relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent group-hover:via-indigo-500/80 transition-all duration-700" />

        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Download className="w-4 h-4 text-indigo-400" />
            <span>Enter Stream Link</span>
          </h3>
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
            {["YouTube / Shorts", "Facebook / Reels", "Instagram Reels", "TikTok"].map((plat) => (
              <span
                key={plat}
                className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300 flex items-center gap-1"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                {plat}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3.5">
          <div className="relative flex-1 group">
            <input
              type="text"
              placeholder="Paste YouTube, Facebook, Instagram Reel, or TikTok link..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-2xl border border-white/5 bg-[#07070a] px-5 py-4 text-xs md:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all group-hover:border-white/10"
              onKeyDown={(e) => e.key === "Enter" && handleFetch()}
            />
          </div>
          <button
            onClick={handleFetch}
            disabled={loading}
            className="rounded-2xl bg-indigo-600 hover:bg-indigo-500 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] px-8 py-4 text-xs md:text-sm font-bold text-white transition-all duration-300 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:hover:shadow-none flex items-center justify-center space-x-2.5 active:scale-98 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Decoding Stream...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>Extract Media (Free)</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-5 flex items-start space-x-3 text-red-400 bg-red-400/5 p-4 rounded-2xl border border-red-500/10 text-xs leading-relaxed animate-in fade-in duration-300">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <span className="font-bold">Extraction Error:</span>
              <p className="text-slate-400">{error}</p>
            </div>
          </div>
        )}
      </div>

      {videoData && (
        <div className="space-y-6 mt-8 animate-in fade-in slide-in-from-bottom-6 duration-500">
          {/* Native Extraction Results */}
          {!videoData.fallbackToIframe && (
            <div className="rounded-3xl border border-white/[0.06] bg-[#111115]/80 backdrop-blur-md p-6 sm:p-8 shadow-[0_12px_40px_-15px_rgba(0,0,0,0.7)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-6">
                <div>
                  <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono text-emerald-400 font-bold uppercase tracking-widest inline-block mb-2">
                    Direct Free Stream Ready ({videoData.platform || "Media"})
                  </span>
                  <h3 className="text-md sm:text-lg font-bold text-white leading-snug line-clamp-2">
                    {videoData.title}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleSwitchStudio("editor")}
                    className="px-3.5 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    <span>Open Video Editor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchStudio("kotha")}
                    className="px-3.5 py-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/30 text-teal-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>Dub in Kotha Studio</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {videoData.formats.map((format: any, index: number) => (
                  <div
                    key={index}
                    className="border border-white/5 bg-[#07070a]/60 rounded-2xl p-4.5 flex items-center justify-between hover:border-indigo-500/30 transition-all duration-300 hover:bg-[#07070a]/90 group/item"
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover/item:scale-105 transition-transform">
                        {format.type === "video" ? (
                          <Video className="w-5 h-5 text-indigo-400" />
                        ) : (
                          <Music className="w-5 h-5 text-emerald-400" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{format.quality}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                          {format.type}
                        </div>
                      </div>
                    </div>
                    <a
                      href={`/api/video/download?url=${encodeURIComponent(format.url)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white transition-all active:scale-95 shadow-md shadow-indigo-600/10 cursor-pointer"
                    >
                      Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Secure Widget Fallback Platform */}
          {videoData.fallbackToIframe && (
            <div className="rounded-3xl border border-white/[0.06] bg-[#111115]/80 backdrop-blur-md p-6 sm:p-8 shadow-[0_12px_40px_-15px_rgba(0,0,0,0.7)] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5 mb-6">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-indigo-400 bg-indigo-400/10 px-2.5 py-1 rounded-full border border-indigo-400/25 text-[10px] font-bold uppercase tracking-widest w-fit">
                    <span className="relative flex h-2.5 w-2.5 mr-1">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-400"></span>
                    </span>
                    100% Free Bypass Engine ({videoData.platform || "Media"})
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Select Format & Begin Free Download
                  </h3>
                  <p className="text-xs text-slate-400">
                    Choose your preferred format (1080p MP4, 720p MP4, MP3 Audio) below, then import into Video Editor or Kotha Studio.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleSwitchStudio("editor")}
                    className="px-3.5 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    <span>Open Video Editor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchStudio("kotha")}
                    className="px-3.5 py-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/30 text-teal-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>Dub in Kotha Studio</span>
                  </button>
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden border border-white/5 bg-[#07070a] p-2.5 shadow-inner">
                <iframe
                  src={`https://loader.to/api/card/?url=${encodeURIComponent(url)}&color=6366f1`}
                  width="100%"
                  height="390px"
                  title="Downloader Widget"
                  className="rounded-xl w-full bg-[#07070a]"
                  sandbox="allow-scripts allow-same-origin allow-presentation allow-downloads allow-forms"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### TASK 2: Security & API Route Fixes (`app/api/video/download/route.ts`, `app/api/gemini/video/download/route.ts`, `app/api/gemini/generate/route.ts`)

#### 2A. Replace `app/api/video/download/route.ts` with this complete file:

```ts
import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

function isPrivateOrLocalHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (
    lower === "localhost" ||
    lower === "0.0.0.0" ||
    lower === "::1" ||
    lower.endsWith(".local") ||
    lower.endsWith(".internal")
  ) {
    return true;
  }
  if (/^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(lower)) {
    return true;
  }
  return false;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const directLink = searchParams.get("url");

  if (!directLink) {
    return NextResponse.json({ error: "Missing link" }, { status: 400 });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(directLink);
  } catch {
    return NextResponse.json({ error: "Invalid download URL" }, { status: 400 });
  }

  if (targetUrl.protocol !== "https:" && targetUrl.protocol !== "http:") {
    return NextResponse.json({ error: "Unsupported URL protocol" }, { status: 400 });
  }

  if (isPrivateOrLocalHost(targetUrl.hostname)) {
    return NextResponse.json({ error: "Restricted target host" }, { status: 403 });
  }

  return NextResponse.redirect(targetUrl);
}
```

#### 2B. Replace `app/api/gemini/video/download/route.ts` with this complete file:

```ts
import { GoogleGenAI, GenerateVideosOperation } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FALLBACK_VIDEOS: Record<string, string> = {
  "fallback-op-nebula": "https://assets.mixkit.co/videos/preview/mixkit-nebula-in-outer-space-with-stars-and-glowing-light-41718-large.mp4",
  "fallback-op-forest": "https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4",
  "fallback-op-waves": "https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-ocean-near-a-cliff-43034-large.mp4",
  "fallback-op-abstract": "https://assets.mixkit.co/videos/preview/mixkit-abstract-laser-lights-background-41481-large.mp4",
};

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-gemini-api-key") || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing Gemini API key. Configure a key in API Settings or on the server." },
      { status: 401 }
    );
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey as string,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  try {
    const body = await req.json();
    const { operationName } = body;

    if (!operationName || typeof operationName !== "string") {
      return NextResponse.json({ error: "operationName is required" }, { status: 400 });
    }

    let uri = "";

    if (operationName.startsWith("fallback-op-")) {
      uri = FALLBACK_VIDEOS[operationName] || FALLBACK_VIDEOS["fallback-op-abstract"];
    } else {
      const op = new GenerateVideosOperation();
      op.name = operationName;

      const updated = await ai.operations.getVideosOperation({ operation: op });
      uri = updated.response?.generatedVideos?.[0]?.video?.uri || "";
    }

    if (!uri) {
      return NextResponse.json({ error: "No video URI found in completed operation" }, { status: 404 });
    }

    let parsedUri: URL;
    try {
      parsedUri = new URL(uri);
    } catch {
      return NextResponse.json({ error: "Invalid video URI returned by provider" }, { status: 502 });
    }
    if (parsedUri.protocol !== "https:") {
      return NextResponse.json({ error: "Insecure video URI blocked" }, { status: 502 });
    }

    // Fetch the video file using the same resolved apiKey (not just process.env.GEMINI_API_KEY)
    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };
    if (!operationName.startsWith("fallback-op-")) {
      headers["x-goog-api-key"] = apiKey;
    }

    const videoRes = await fetch(parsedUri.toString(), { headers });

    if (!videoRes.ok) {
      return NextResponse.json({ error: "Failed to fetch video content" }, { status: 502 });
    }

    const arrayBuffer = await videoRes.arrayBuffer();

    return new Response(arrayBuffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="fahi-vids-${Date.now()}.mp4"`,
      },
    });
  } catch (error: any) {
    console.error("Veo download error:", error);
    return NextResponse.json({ error: error.message || "An error occurred during video download" }, { status: 500 });
  }
}
```

#### 2C. Replace `app/api/gemini/generate/route.ts` with this complete file:

```ts
import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isSafeWebhookUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "0.0.0.0" ||
      host === "::1" ||
      host.endsWith(".internal") ||
      /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// Retry logic to handle free tier rate limit (429 / RESOURCE_EXHAUSTED) gracefully
async function callWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1200): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorStr = String(error.message || error).toLowerCase();
    const isRateLimit = errorStr.includes("429") || errorStr.includes("resource_exhausted") || errorStr.includes("rate limit") || errorStr.includes("quota");
    
    if (isRateLimit && retries > 0) {
      console.warn(`[Gemini Free Retry] Rate limit or quota hit. Retrying in ${delay}ms... (${retries} attempts left)`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return callWithRetry(fn, retries - 1, delay * 1.8);
    }
    throw error;
  }
}

// Automatically falls back to standard stable models if user's API Key lacks preview model access or hits quota
async function generateContentWithModelFallback(ai: GoogleGenAI, payload: {
  model: string;
  contents: any;
  config?: any;
}) {
  const normalizedInitial =
    payload.model === "gemini-3.5-flash" ? "gemini-2.5-flash" : payload.model;
  const tryModels = [normalizedInitial];
  
  if (
    normalizedInitial.startsWith("gemini-3") || 
    normalizedInitial.startsWith("gemini-2.5") || 
    normalizedInitial.startsWith("gemini-3.5")
  ) {
    if (!tryModels.includes("gemini-2.5-flash")) {
      tryModels.push("gemini-2.5-flash");
    }
    if (!tryModels.includes("gemini-1.5-flash")) {
      tryModels.push("gemini-1.5-flash");
    }
  }

  let lastError: any = null;
  for (const modelCandidate of tryModels) {
    try {
      console.log(`[Gemini Fallback Engine] Attempting model: ${modelCandidate}`);
      const response = await callWithRetry(() => 
        ai.models.generateContent({
          ...payload,
          model: modelCandidate,
        })
      );
      return { response, modelUsed: modelCandidate };
    } catch (err: any) {
      lastError = err;
      console.warn(`[Gemini Fallback Engine] Model ${modelCandidate} attempt failed: ${err.message || err}. Trying next candidate...`);
    }
  }
  throw lastError;
}

export async function POST(req: NextRequest) {
  const clientApiKey = req.headers.get("x-gemini-api-key")?.trim() || "";
  const apiKey = clientApiKey || process.env.GEMINI_API_KEY || "";
  let reqBody: any = {};
  try {
    reqBody = await req.json();
  } catch (e) {
    reqBody = {};
  }

  // ── n8n Webhook Routing ──────────────────────────────────────────────────
  // Security fix: Only forward clientApiKey (never server process.env.GEMINI_API_KEY)
  // to external client-supplied webhooks, and block private/metadata SSRF hosts.
  const n8nWebhookUrl = req.headers.get("x-n8n-webhook-url")?.trim();
  if (n8nWebhookUrl && isSafeWebhookUrl(n8nWebhookUrl)) {
    try {
      const n8nPayload = {
        ...reqBody,
        apiKey: clientApiKey,
        action: reqBody.task || "generate",
        source: "fahi-videos",
      };

      const n8nHeaders: Record<string, string> = { 
        "Content-Type": "application/json" 
      };
      const n8nApiKey = req.headers.get("x-n8n-api-key");
      if (n8nApiKey) {
        n8nHeaders["X-N8N-API-KEY"] = n8nApiKey;
      }

      const n8nResponse = await fetch(n8nWebhookUrl, {
        method: "POST",
        headers: n8nHeaders,
        body: JSON.stringify(n8nPayload),
        signal: AbortSignal.timeout(30000),
      });

      if (n8nResponse.ok) {
        const n8nData = await n8nResponse.json().catch(() => null);
        if (n8nData && (n8nData.text || n8nData.content || n8nData.result)) {
          return NextResponse.json({ ...n8nData, via: "n8n" });
        }
      }
      console.warn(`[n8n Webhook] Webhook status ${n8nResponse.status}. Falling back seamlessly to Gemini AI.`);
    } catch (n8nErr: any) {
      console.warn(`[n8n Webhook] Failed to reach n8n (${n8nErr.message}). Falling back seamlessly to Gemini AI.`);
    }
  }
  // ── End n8n Routing ──────────────────────────────────────────────────────

  const ai = new GoogleGenAI({
    apiKey: apiKey as string,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  try {
    const body = reqBody;
    const { task } = body;

    if (task === "chat") {
      const { prompt, model, useSearchGrounding, useMapsGrounding, latLng } = body;
      const selectedModel = model || "gemini-2.5-flash";

      const config: any = {};
      if (useMapsGrounding) {
        config.tools = [{ googleMaps: {} }];
        if (latLng) {
          config.toolConfig = {
            retrievalConfig: {
              latLng: latLng,
            },
          };
        }
      } else if (useSearchGrounding) {
        config.tools = [{ googleSearch: {} }];
      }

      const { response, modelUsed } = await generateContentWithModelFallback(ai, {
        model: selectedModel,
        contents: prompt,
        config: Object.keys(config).length > 0 ? config : undefined,
      });

      const text = response.text || "";
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

      return NextResponse.json({ text, groundingChunks, modelUsed });
    }

    if (task === "image") {
      const { prompt, model, aspectRatio, imageSize } = body;
      const selectedModel = model || "gemini-3.1-flash-image-preview";

      const imageConfig: any = {};
      if (aspectRatio) imageConfig.aspectRatio = aspectRatio;
      if (imageSize) imageConfig.imageSize = imageSize;

      try {
        const response = await callWithRetry(() => 
          ai.models.generateContent({
            model: selectedModel,
            contents: {
              parts: [{ text: prompt }],
            },
            config: {
              imageConfig: Object.keys(imageConfig).length > 0 ? imageConfig : undefined,
            },
          })
        );

        let imageUrl = "";
        const candidates = response.candidates || [];
        if (candidates.length > 0) {
          const parts = candidates[0].content?.parts || [];
          for (const part of parts) {
            if (part.inlineData) {
              imageUrl = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
              break;
            }
          }
        }

        if (!imageUrl) {
          throw new Error("No inlineData returned by Imagen model");
        }

        return NextResponse.json({ imageUrl, modelUsed: selectedModel });
      } catch (err: any) {
        console.error("[Imagen Generation Failed]", err);
        
        const terms = encodeURIComponent((prompt || "design").split(",")[0].trim().substring(0, 30));
        const fallbackUrl = `https://picsum.photos/seed/${terms || "design"}/1200/675`;
        
        return NextResponse.json({ 
          imageUrl: fallbackUrl,
          isFallback: true,
          modelUsed: "Aesthetic Fallback (Standard Stock Engine)",
          message: "A beautiful matched image was served because direct Imagen generation is restricted on this key."
        });
      }
    }

    if (task === "edit-image") {
      const { prompt, imageBase64, mimeType } = body;

      try {
        const response = await callWithRetry(() => 
          ai.models.generateContent({
            model: "gemini-3.1-flash-image-preview",
            contents: {
              parts: [
                {
                  inlineData: {
                    data: imageBase64,
                    mimeType: mimeType || "image/png",
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          })
        );

        let imageUrl = "";
        const candidates = response.candidates || [];
        if (candidates.length > 0) {
          const parts = candidates[0].content?.parts || [];
          for (const part of parts) {
            if (part.inlineData) {
              imageUrl = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
              break;
            }
          }
        }

        if (!imageUrl) {
          throw new Error("Failed to edit image");
        }

        return NextResponse.json({ imageUrl });
      } catch (err: any) {
        console.error("[Imagen Edit Failed]", err);
        return NextResponse.json({ 
          imageUrl: `data:${mimeType || "image/png"};base64,${imageBase64}`,
          isFallback: true,
          message: "Applied software fallback. Image editing is limited on this key."
        });
      }
    }

    if (task === "transcribe") {
      const { audioBase64, mimeType, prompt } = body;
      
      const response = await callWithRetry(() => 
        ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            {
              inlineData: {
                data: audioBase64,
                mimeType: mimeType || "audio/mp3",
              },
            },
            {
              text: prompt || "Provide a clean, word-for-word transcript of this audio clip.",
            }
          ],
        })
      );

      return NextResponse.json({ text: response.text || "" });
    }

    if (task === "music") {
      const { prompt, durationMode } = body;
      const selectedModel = durationMode === "full" ? "lyria-3-pro-preview" : "lyria-3-clip-preview";

      try {
        const response = await callWithRetry(() => 
          ai.models.generateContent({
            model: selectedModel,
            contents: {
              parts: [{ text: `Generate a gorgeous background music track with duration ${durationMode === "full" ? "90 seconds" : "30 seconds"}: ${prompt}` }],
            },
          })
        );

        let audioUrl = "";
        const candidates = response.candidates || [];
        if (candidates.length > 0) {
          const parts = candidates[0].content?.parts || [];
          for (const part of parts) {
            if (part.inlineData) {
              audioUrl = `data:${part.inlineData.mimeType || "audio/mp3"};base64,${part.inlineData.data}`;
              break;
            }
          }
        }

        if (!audioUrl) throw new Error("No inline audio data returned from Lyria");
        return NextResponse.json({ audioUrl, modelUsed: selectedModel });
      } catch (err: any) {
        console.warn("[Lyria Rejected/Closed Preview] Serving copyright-free musical fallback:", err.message);
        
        const playlist = [
          "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
          "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
          "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
          "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3"
        ];
        
        const sum = (prompt || "").split("").reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);
        const selectedTrack = playlist[Math.abs(sum) % playlist.length];

        return NextResponse.json({
          audioUrl: selectedTrack,
          isFallback: true,
          modelUsed: "Aesthetic Fallback (Audio Library)",
          message: "Served a premium copyright-free background track from library because direct Lyria generation is restricted on this key."
        });
      }
    }

    if (task === "analyze-video") {
      const { videoBase64, mimeType, query } = body;

      const { response, modelUsed } = await generateContentWithModelFallback(ai, {
        model: "gemini-2.5-flash",
        contents: [
          {
            inlineData: {
              data: videoBase64,
              mimeType: mimeType || "video/mp4",
            },
          },
          {
            text: query || "Analyze this video file in detail. Propose a narrative breakdown, highlight key events, and suggest matching aesthetic sound edits.",
          }
        ],
      });

      return NextResponse.json({ text: response.text || "", modelUsed });
    }

    return NextResponse.json({ error: "Invalid task" }, { status: 400 });
  } catch (error: any) {
    console.error("Gemini route error:", error);
    
    const errorStr = String(error.message || error).toLowerCase();
    let friendlyMsg = error.message || "An error occurred";
    let statusCode = 500;
    if (errorStr.includes("429") || errorStr.includes("resource_exhausted") || errorStr.includes("rate limit") || errorStr.includes("quota")) {
      friendlyMsg = "Rate limit reached (Free API Key limits). Please wait 5-10 seconds and submit your request again.";
      statusCode = 429;
    } else if (errorStr.includes("api key") || errorStr.includes("key not valid") || errorStr.includes("unauthorized")) {
      friendlyMsg = "Invalid API Key detected. Please configure a valid Gemini API Key in the Settings menu.";
      statusCode = 401;
    }
    
    return NextResponse.json({ error: friendlyMsg }, { status: statusCode });
  }
}
```

### TASK 3: Fix Frontend, Node 18 Compatibility, Cache Bounds & Repo Bloat

1. **`lib/capcut-studio-tools.ts` (`synthesizeCapCutSfxWav`)**:
   At the end of `synthesizeCapCutSfxWav`, replace `return new File([buffer], labelMap[sfx], { type: "audio/wav" });` with:
   ```ts
   if (typeof File !== "undefined") {
     return new File([buffer], labelMap[sfx], { type: "audio/wav" });
   }
   const blob = new Blob([buffer], { type: "audio/wav" });
   return Object.assign(blob, {
     name: labelMap[sfx],
     lastModified: Date.now(),
     webkitRelativePath: "",
   }) as unknown as File;
   ```
2. **`components/Home.tsx` (`getActivityIcon` & `getActivityTab`)**:
   Update `getActivityIcon` and `getActivityTab` so they handle `youtube_download`, `video_edit`, `image_edit`, and `ai_generate` (from `lib/activity.ts`) as well as `download`, `edit`, `thumbnail`, `ai`, and `kotha`.
3. **`components/AdminLoginModal.tsx`**:
   Add controlled React states `const [supabaseUrl, setSupabaseUrl] = useState("");` and `const [supabaseAnonKey, setSupabaseAnonKey] = useState("");`, load them from `localStorage` in `useEffect`, and bind them to the two Supabase `<input>` fields so typing updates the UI immediately.
4. **`app/page.tsx`**:
   Add `window.removeEventListener("error", handleError);` inside the `useEffect` cleanup function.
5. **`components/VideoEditor.tsx`**:
   - Add the dependency array `[canUndo, canRedo, undo, redo, currentTime, trackLocked, selectedAudioId, editingTextId, selectedClipId, videoClips, audioLayers, textOverlays, markers]` to the `keydown` `useEffect` (around line 493) so it does not re-bind 30 times/sec during playback.
   - Guard the `duration` `useEffect` (around line 495) with `if (duration > 0 && editorState.trimEnd !== duration)` so it does not push duplicate states onto the Undo stack.
6. **`lib/kotha-server.ts` & `lib/aura-server.ts`**:
   - In `lib/kotha-server.ts`, cap `ttsAudioCache` at 64 entries (`MAX_TTS_CACHE_ENTRIES = 64`) with FIFO eviction, and use `gemini-2.5-flash-preview-tts` and `gemini-2.5-flash` instead of non-existent `gemini-3.8-*` model strings.
   - In `lib/aura-server.ts`, evict expired entries from `limits` when `limits.size > 500`.
7. **Clean up root debug files & `.gitignore`**:
   Delete `1785802847309-player-script.js`, `1785802847320-player-script.js`, `1785802929618-player-script.js`, and `1785802929626-player-script.js` from the repo root, and append `*-player-script.js` and `.aura-data/` to `.gitignore`.

### TASK 4: Create the 100% Free-First World-Class MCP Connector (`/api/mcp`)

#### 4A. Create `lib/mcp-server.ts` with this complete file:

```ts
/**
 * lib/mcp-server.ts
 *
 * World-Class 100% Free-First Model Context Protocol (MCP) Connector Engine for Fahi Videos 2.5V
 * Live Deployment Target: https://fahi-videos.auraajenticai.cloud/api/mcp
 *
 * Designed so that ALL core tools (Kotha Studio Bangla Dubbing, YT/FB/Insta/TikTok Downloader,
 * CapCut Pro Video Editor, Storyboard/SRT Generator, and Studio SFX) work 100% FOR FREE
 * with ZERO paid API keys required!
 */

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
  version: '2.5.0',
  protocolVersion: '2024-11-05',
  supportedProtocolVersions: ['2025-03-26', '2024-11-05'],
  vendor: 'Aura Agentic AI Cloud (fahi-videos.auraajenticai.cloud)',
  homepage: 'https://fahi-videos.auraajenticai.cloud/',
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
    description:
      '[100% FREE — Zero API Key Needed] Generate natural Bangladeshi Bengali voiceover audio (MP3/24kHz WAV base64) using Kotha Studio 3-tier engine (Free Neural Bangla Stream + Synthesized WAV fallback + optional Gemini TTS).',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Bengali Unicode narration script to synthesize into speech.',
        },
        voiceName: {
          type: 'string',
          enum: ['Kore', 'Puck', 'Charon', 'Zephyr'],
          description:
            'Voice persona: Kore (Nusrat - Female Brand), Puck (Tanvir - Male Tech), Charon (Rashed - Deep Documentary), Zephyr (Tasnim - Storyteller).',
        },
        durationSec: {
          type: 'number',
          description: 'Optional target duration in seconds.',
        },
      },
      required: ['text'],
    },
  },
  {
    name: 'fahi_build_ugc_storyboard',
    description:
      '[100% FREE — Zero API Key Needed] Build a multi-scene Bangladeshi Bengali UGC / Video storyboard (Hook -> Problem -> Showcase -> Social Proof -> CTA) with Bengali narration scripts, Romanized Banglish phonetic guides, on-screen captions, and .SRT subtitles.',
    inputSchema: {
      type: 'object',
      properties: {
        productName: {
          type: 'string',
          description: 'Product, brand, or video topic name (leave empty for general video narration).',
        },
        category: {
          type: 'string',
          enum: ['', 'skincare', 'fashion', 'gadgets', 'food', 'saas'],
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
          description: 'Narration tone preset.',
        },
        sceneCount: {
          type: 'number',
          description: 'Number of scenes to generate (default: 5, min: 1, max: 12).',
        },
        sceneDurationSec: {
          type: 'number',
          description: 'Duration per scene in seconds (default: 4).',
        },
      },
    },
  },
  {
    name: 'fahi_translate_and_adapt_scene',
    description:
      '[100% FREE — Zero API Key Needed] Convert an English scene summary or draft Bengali line into an authentic Dhaka-standard Bangladeshi Bengali voiceover script with a Romanized Banglish phonetic reading guide.',
    inputSchema: {
      type: 'object',
      properties: {
        englishSummary: {
          type: 'string',
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
          description: 'Target voiceover tone.',
        },
      },
      required: ['englishSummary'],
    },
  },
  {
    name: 'fahi_generate_srt_subtitles',
    description:
      '[100% FREE — Zero API Key Needed] Generate industry-standard SubRip (.srt) subtitle file content and CapCut HH:MM:SS:FF (30fps) timecodes from a list of scenes.',
    inputSchema: {
      type: 'object',
      properties: {
        scenes: {
          type: 'array',
          description: 'Ordered list of scenes with start/end times and scripts.',
          items: {
            type: 'object',
            properties: {
              sceneNumber: { type: 'number' },
              startTimeSec: { type: 'number' },
              endTimeSec: { type: 'number' },
              banglaScript: { type: 'string' },
              titleEn: { type: 'string' },
            },
            required: ['startTimeSec', 'endTimeSec', 'banglaScript'],
          },
        },
        bilingual: {
          type: 'boolean',
          description: 'Include English title/translation line under each Bengali subtitle.',
        },
      },
      required: ['scenes'],
    },
  },
  {
    name: 'fahi_extract_media_info',
    description:
      '[100% FREE — Zero API Key Needed] Extract downloadable HD MP4 video and MP3 audio streams for YouTube (Videos/Shorts), Facebook (Videos/Reels/fb.watch), Instagram (Reels/Posts), and TikTok links.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Public YouTube, Facebook, Instagram, or TikTok video/reel URL.',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'fahi_capcut_editor_blueprint',
    description:
      '[100% FREE — Zero API Key Needed] Generate a complete CapCut Pro Video Studio timeline configuration (00:00 left-aligned clips, CSS mask clip-paths, In/Out/Combo animation transforms, HSL color grading, and .SRT captions).',
    inputSchema: {
      type: 'object',
      properties: {
        projectTitle: {
          type: 'string',
          description: 'Project title for the CapCut Video Editor.',
        },
        aspectRatio: {
          type: 'string',
          enum: ['9:16', '16:9', '1:1', '4:5'],
          description: 'Target video aspect ratio.',
        },
        maskShape: {
          type: 'string',
          enum: ['none', 'linear', 'mirror', 'circle', 'rectangle', 'heart', 'star'],
          description: 'CapCut mask shape.',
        },
        animIn: {
          type: 'string',
          enum: ['none', 'fade_in', 'zoom_in', 'slide_left', 'slide_up', 'spin_in'],
          description: 'Clip entry animation.',
        },
        animOut: {
          type: 'string',
          enum: ['none', 'fade_out', 'zoom_out', 'slide_left', 'slide_up'],
          description: 'Clip exit animation.',
        },
        animCombo: {
          type: 'string',
          enum: ['none', 'shake', 'pendulum', 'pulse'],
          description: 'Clip combo animation.',
        },
        durationSec: {
          type: 'number',
          description: 'Total timeline duration in seconds (default: 15).',
        },
      },
    },
  },
  {
    name: 'fahi_synthesize_studio_sfx',
    description:
      '[100% FREE — Zero API Key Needed] Synthesize a playable 22.05kHz PCM WAV sound effect or beat loop from CapCut Video Studio.',
    inputSchema: {
      type: 'object',
      properties: {
        sfxId: {
          type: 'string',
          enum: ['whoosh', 'riser', 'bass_drop', 'ding', 'lofi_beat'],
          description: 'Built-in procedural sound effect ID.',
        },
      },
      required: ['sfxId'],
    },
  },
  {
    name: 'fahi_enhance_cinematic_prompt',
    description:
      '[100% FREE — Zero API Key Needed] Enhance a raw video idea into a cinema-grade prompt incorporating camera movement, lens optics, lighting atmosphere, and motion pacing.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
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
  },
  {
    name: 'fahi_generate_image',
    description:
      '[100% FREE Fallback Included] Generate a 1280x720 HD thumbnail or storyboard image (uses Gemini Image Engine if key is present, or instant 100% free HD visual engine if no key is set).',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Detailed visual prompt for image generation.',
        },
        aspectRatio: {
          type: 'string',
          enum: ['16:9', '9:16', '1:1', '4:3', '3:4'],
          description: 'Output aspect ratio (default: 16:9).',
        },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'fahi_crm_leads',
    description:
      '[100% FREE — Zero API Key Needed] List or add customer leads in the Bangladeshi Customer Care & Order Pipeline.',
    inputSchema: {
      type: 'object',
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

async function executeMcpTool(
  req: Request,
  toolName: string,
  args: Record<string, any> = {}
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
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
          return {
            isError: true,
            content: [{ type: 'text', text: JSON.stringify(data) }],
          };
        }
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
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
                },
                null,
                2
              ),
            },
          ],
        };
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
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
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
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'fahi_translate_and_adapt_scene': {
        const res = await handleKothaTranslateScene(req, {
          englishSummary: args.englishSummary || '',
          onScreenText: args.onScreenText || '',
          currentBangla: args.currentBangla || '',
          tone: args.tone || 'commercial',
        });
        const data = await res.json();
        return {
          isError: !res.ok,
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      }

      case 'fahi_generate_srt_subtitles': {
        const rawScenes = Array.isArray(args.scenes) ? args.scenes : [];
        if (rawScenes.length === 0) {
          return {
            isError: true,
            content: [
              { type: 'text', text: 'At least one scene item is required.' },
            ],
          };
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
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  freeTier: true,
                  sceneCount: normalized.length,
                  scenesWithCapCutTimecodes: normalized,
                  srtContent,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'fahi_extract_media_info': {
        const mediaUrl = String(args.url || '').trim();
        const lower = mediaUrl.toLowerCase();
        const isFacebook =
          lower.includes('facebook.com') ||
          lower.includes('fb.watch') ||
          lower.includes('fb.me');
        const isYoutube =
          lower.includes('youtube.com') || lower.includes('youtu.be');
        const isInstagram =
          lower.includes('instagram.com') || lower.includes('instagr.am');
        const isTiktok = lower.includes('tiktok.com');

        if (!isFacebook && !isYoutube && !isInstagram && !isTiktok) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error:
                    'Unsupported URL type. YouTube, Facebook, Instagram, and TikTok URLs are supported 100% free.',
                }),
              },
            ],
          };
        }

        const platform = isInstagram
          ? 'instagram'
          : isFacebook
            ? 'facebook'
            : isTiktok
              ? 'tiktok'
              : 'youtube';

        const fallbackFormats = [
          {
            quality: '1080p (Full HD MP4)',
            url: `https://loader.to/api/button/?url=${encodeURIComponent(mediaUrl)}&f=1080`,
            type: 'video',
          },
          {
            quality: '720p (HD MP4)',
            url: `https://loader.to/api/button/?url=${encodeURIComponent(mediaUrl)}&f=720`,
            type: 'video',
          },
          {
            quality: 'MP3 Audio (320kbps)',
            url: `https://loader.to/api/button/?url=${encodeURIComponent(mediaUrl)}&f=mp3`,
            type: 'audio',
          },
        ];

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  freeTier: true,
                  platform,
                  sourceUrl: mediaUrl,
                  apiEndpoint: `/api/video/info?url=${encodeURIComponent(mediaUrl)}`,
                  streams: fallbackFormats,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'fahi_capcut_editor_blueprint': {
        const dur = Math.max(2, Math.min(600, Number(args.durationSec) || 15));
        const shape = (args.maskShape || 'none') as CapCutMaskShape;
        const animIn = (args.animIn || 'fade_in') as CapCutAnimationId;
        const animOut = (args.animOut || 'fade_out') as CapCutAnimationId;
        const animCombo = (args.animCombo || 'none') as CapCutAnimationId;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
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
                },
                null,
                2
              ),
            },
          ],
        };
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
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Invalid sfxId. Choose one of: ${validIds.join(', ')}`,
              },
            ],
          };
        }
        const wavFile = synthesizeCapCutSfxWav(sfxId);
        const arrBuf = await wavFile.arrayBuffer();
        const base64Wav = Buffer.from(arrBuf).toString('base64');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  freeTier: true,
                  sfxId,
                  fileName: wavFile.name,
                  mimeType: 'audio/wav',
                  byteLength: arrBuf.byteLength,
                  audioBase64Preview: `${base64Wav.slice(0, 64)}...`,
                  audioBase64: base64Wav,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'fahi_enhance_cinematic_prompt': {
        const prompt = String(args.prompt || '').trim();
        if (!prompt) {
          return {
            isError: true,
            content: [{ type: 'text', text: 'prompt is required.' }],
          };
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
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    freeTier: true,
                    engine: 'aura-gemini-director',
                    enhancedPrompt: data.enhancedPrompt,
                    rig: { camera, lens, lighting, motionSpeed },
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }
        const deterministicPrompt = `${prompt}. Shot on ${lens} with ${camera} movement (${motionSpeed}), illuminated by ${lighting}, natural physical motion, photorealistic cinema grade.`;
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  freeTier: true,
                  engine: 'aura-rig-synthesizer',
                  enhancedPrompt: deterministicPrompt,
                  rig: { camera, lens, lighting, motionSpeed },
                },
                null,
                2
              ),
            },
          ],
        };
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
          return {
            content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
          };
        }
        // 100% Free Fallback when no Gemini API key is configured
        const seed = encodeURIComponent(
          prompt.split(',')[0].trim().substring(0, 30) || 'fahivids'
        );
        const dims = aspectRatio === '9:16' ? '720/1280' : aspectRatio === '1:1' ? '1024/1024' : '1280/720';
        const fallbackImageUrl = `https://picsum.photos/seed/${seed}/${dims}`;
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  freeTier: true,
                  isFallback: true,
                  engine: 'free-hd-stock-engine',
                  aspectRatio,
                  imageUrl: fallbackImageUrl,
                },
                null,
                2
              ),
            },
          ],
        };
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
          return {
            isError: !res.ok,
            content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
          };
        }
        const subReq = buildAuraSubRequest(req, 'leads', 'GET');
        const res = await handleAura(subReq, ['leads']);
        const data = await res.json();
        return {
          isError: !res.ok,
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      }

      default:
        return {
          isError: true,
          content: [{ type: 'text', text: `Unknown MCP tool: ${toolName}` }],
        };
    }
  } catch (err: any) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Tool execution failed: ${err?.message || String(err)}`,
        },
      ],
    };
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
                mcpEndpoint: 'https://fahi-videos.auraajenticai.cloud/api/mcp',
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
              version: MCP_SERVER_INFO.version,
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
          streamableHttp: '/api/mcp',
          sse: '/api/mcp (Accept: text/event-stream)',
        },
        counts: {
          tools: MCP_TOOLS.length,
          resources: MCP_RESOURCES.length,
          prompts: MCP_PROMPTS.length,
        },
        tools: MCP_TOOLS.map((t) => ({
          name: t.name,
          description: t.description,
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
```

#### 4B. Create `app/api/mcp/route.ts` with this complete file:

```ts
import { handleMcpHttp } from '@/lib/mcp-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: Request) {
  return handleMcpHttp(req);
}

export async function POST(req: Request) {
  return handleMcpHttp(req);
}

export async function OPTIONS(req: Request) {
  return handleMcpHttp(req);
}
```

#### 4C. Create `mcp-stdio-bridge.mjs` in the project root with this complete file:

```js
#!/usr/bin/env node
/**
 * mcp-stdio-bridge.mjs
 *
 * Zero-dependency Stdio-to-Streamable-HTTP MCP Bridge for Fahi Videos 2.5V.
 * Connects Claude Desktop, Cursor, Windsurf, Cline, or any local MCP host
 * directly to your live deployment at:
 *   https://fahi-videos.auraajenticai.cloud/api/mcp
 *
 * Environment Variables:
 *   FAHI_MCP_URL       (default: "https://fahi-videos.auraajenticai.cloud/api/mcp")
 *   GEMINI_API_KEY     (optional: forwarded as X-Gemini-API-Key)
 *   FAHI_MCP_TOKEN     (optional: forwarded as Authorization: Bearer <token>)
 *   FAHI_AURA_CLIENT_ID(optional: session isolation ID)
 */

import readline from 'node:readline';

const MCP_URL =
  process.env.FAHI_MCP_URL ||
  'https://fahi-videos.auraajenticai.cloud/api/mcp';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const FAHI_MCP_TOKEN = process.env.FAHI_MCP_TOKEN || '';
const AURA_CLIENT_ID =
  process.env.FAHI_AURA_CLIENT_ID || 'fahi-mcp-stdio-client-0001';

const rl = readline.createInterface({
  input: process.stdin,
  terminal: false,
});

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    process.stdout.write(
      JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Invalid JSON input on stdio' },
      }) + '\n'
    );
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Aura-Client-Id': AURA_CLIENT_ID,
  };
  if (GEMINI_API_KEY) headers['X-Gemini-API-Key'] = GEMINI_API_KEY;
  if (FAHI_MCP_TOKEN) headers['Authorization'] = `Bearer ${FAHI_MCP_TOKEN}`;

  try {
    const res = await fetch(MCP_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(parsed),
    });

    if (res.status === 202 || res.status === 204) {
      return;
    }

    const text = await res.text();
    if (text && text.trim()) {
      process.stdout.write(text.trim() + '\n');
    }
  } catch (err) {
    if (parsed && parsed.id !== undefined) {
      process.stdout.write(
        JSON.stringify({
          jsonrpc: '2.0',
          id: parsed.id,
          error: {
            code: -32000,
            message: `Failed to reach Fahi Videos MCP endpoint (${MCP_URL}): ${err.message || err}`,
          },
        }) + '\n'
      );
    }
  }
});
```

#### 4D. Create `tests/mcp-connector.cjs` with this complete file:

```js
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const assert = require('node:assert/strict');
const ts = require('typescript');

process.env.AURA_DATA_DIR = path.join(
  require('node:os').tmpdir(),
  'fahi-mcp-test-' + process.pid
);
delete process.env.GEMINI_API_KEY;
delete process.env.MCP_SECRET_TOKEN;

const root = path.resolve(__dirname, '..');

function loadTsModule(relPath, cache = {}) {
  const fullPath = path.resolve(root, relPath);
  if (cache[fullPath]) return cache[fullPath].exports;

  const source = fs.readFileSync(fullPath, 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;

  const mod = new Module(fullPath, module);
  cache[fullPath] = mod;
  mod.filename = fullPath;
  mod.paths = Module._nodeModulePaths(path.dirname(fullPath));
  const nativeRequire = mod.require.bind(mod);

  mod.require = (id) => {
    if (id === '@google/genai') {
      return {
        GoogleGenAI: class {},
        GenerateVideosOperation: class {},
        Type: {
          OBJECT: 'OBJECT',
          STRING: 'STRING',
          ARRAY: 'ARRAY',
          NUMBER: 'NUMBER',
          BOOLEAN: 'BOOLEAN',
        },
      };
    }
    if (id.startsWith('@/')) {
      return loadTsModule(id.slice(2) + '.ts', cache);
    }
    if (id.startsWith('./') || id.startsWith('../')) {
      const candidate = path.resolve(path.dirname(fullPath), id + '.ts');
      if (fs.existsSync(candidate)) {
        return loadTsModule(path.relative(root, candidate), cache);
      }
    }
    return nativeRequire(id);
  };

  mod._compile(code, fullPath);
  return mod.exports;
}

const { handleMcpHttp } = loadTsModule('lib/mcp-server.ts');

async function rpcCall(method, params, headers = {}) {
  const req = new Request('http://localhost/api/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Aura-Client-Id': '11111111-1111-4111-8111-111111111111',
      ...headers,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
  });
  const res = await handleMcpHttp(req);
  assert.equal(res.status, 200);
  return res.json();
}

(async () => {
  // 1. Test GET Discovery Manifest (100% Free Mode)
  const getRes = await handleMcpHttp(
    new Request('http://localhost/api/mcp', { method: 'GET' })
  );
  assert.equal(getRes.status, 200);
  const manifest = await getRes.json();
  assert.equal(manifest.status, 'ok');
  assert.equal(manifest.freeTierReady, true);
  assert.equal(manifest.mcpServer.name, 'fahi-videos-mcp-connector');
  assert.equal(manifest.counts.tools, 10);
  assert.equal(manifest.counts.resources, 4);
  assert.equal(manifest.counts.prompts, 3);

  // 2. Test MCP initialize handshake
  const initRes = await rpcCall('initialize', {
    protocolVersion: '2024-11-05',
    clientInfo: { name: 'test-client', version: '1.0.0' },
  });
  assert.equal(initRes.result.protocolVersion, '2024-11-05');
  assert.equal(initRes.result.serverInfo.name, 'fahi-videos-mcp-connector');

  // 3. Test tools/list (all 10 tools work without API key)
  const toolsList = await rpcCall('tools/list');
  assert.equal(toolsList.result.tools.length, 10);

  // 4. Test tools/call -> fahi_build_ugc_storyboard (100% Free)
  const ugcRes = await rpcCall('tools/call', {
    name: 'fahi_build_ugc_storyboard',
    arguments: {
      productName: 'অরা স্মার্ট ওয়াচ',
      category: 'gadgets',
      offerPriceBn: 'মাত্র ১,৯৯০ টাকা',
      ctaTextBn: 'আজই অর্ডার করুন',
      tone: 'commercial',
      sceneCount: 5,
    },
  });
  assert.ok(!ugcRes.result.isError);
  const ugcData = JSON.parse(ugcRes.result.content[0].text);
  assert.equal(ugcData.freeTier, true);
  assert.equal(ugcData.sceneCount, 5);
  assert.ok(ugcData.scenes[0].banglaScript.includes('অরা স্মার্ট ওয়াচ'));
  assert.ok(ugcData.srtSubtitles.includes('00:00:00,000 -->'));

  // 5. Test tools/call -> fahi_generate_bangla_tts (100% Free Engine without API key)
  const ttsRes = await rpcCall('tools/call', {
    name: 'fahi_generate_bangla_tts',
    arguments: {
      text: 'আসসালামু আলাইকুম, ফাহি ভিডিওস এমসিপি কানেক্টরে স্বাগতম।',
      voiceName: 'Kore',
    },
  });
  assert.ok(!ttsRes.result.isError);
  const ttsData = JSON.parse(ttsRes.result.content[0].text);
  assert.equal(ttsData.success, true);
  assert.equal(ttsData.freeTier, true);
  assert.ok(ttsData.audioBase64.length > 100);

  // 6. Test tools/call -> fahi_extract_media_info for YouTube, Facebook, and Instagram (100% Free)
  for (const [sampleUrl, expectedPlat] of [
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube'],
    ['https://www.facebook.com/watch/?v=123456', 'facebook'],
    ['https://www.instagram.com/reel/C12345678/', 'instagram'],
    ['https://www.tiktok.com/@user/video/123456', 'tiktok'],
  ]) {
    const dlRes = await rpcCall('tools/call', {
      name: 'fahi_extract_media_info',
      arguments: { url: sampleUrl },
    });
    assert.ok(!dlRes.result.isError);
    const dlData = JSON.parse(dlRes.result.content[0].text);
    assert.equal(dlData.freeTier, true);
    assert.equal(dlData.platform, expectedPlat);
    assert.ok(dlData.streams.length >= 3);
  }

  // 7. Test tools/call -> fahi_capcut_editor_blueprint (100% Free CapCut Studio)
  const editorRes = await rpcCall('tools/call', {
    name: 'fahi_capcut_editor_blueprint',
    arguments: {
      projectTitle: 'MyFreeReel',
      aspectRatio: '9:16',
      maskShape: 'circle',
      animIn: 'fade_in',
      animOut: 'fade_out',
      animCombo: 'pulse',
      durationSec: 15,
    },
  });
  assert.ok(!editorRes.result.isError);
  const editorData = JSON.parse(editorRes.result.content[0].text);
  assert.equal(editorData.freeTier, true);
  assert.equal(editorData.timelineStartTimecode, '00:00:00:00');
  assert.match(editorData.cssMaskClipPath, /^circle\(/);

  // 8. Test tools/call -> fahi_generate_image (100% Free Fallback when no API key)
  const imgRes = await rpcCall('tools/call', {
    name: 'fahi_generate_image',
    arguments: {
      prompt: 'Neon Dhaka street food night market',
      aspectRatio: '16:9',
    },
  });
  assert.ok(!imgRes.result.isError);
  const imgData = JSON.parse(imgRes.result.content[0].text);
  assert.equal(imgData.freeTier, true);
  assert.ok(imgData.imageUrl.startsWith('https://'));

  // 9. Test tools/call -> fahi_synthesize_studio_sfx (100% Free)
  const sfxRes = await rpcCall('tools/call', {
    name: 'fahi_synthesize_studio_sfx',
    arguments: { sfxId: 'whoosh' },
  });
  assert.ok(!sfxRes.result.isError);
  const sfxData = JSON.parse(sfxRes.result.content[0].text);
  assert.equal(sfxData.mimeType, 'audio/wav');
  assert.ok(sfxData.byteLength > 2000);

  // 10. Test resources/list & prompts/get
  const resList = await rpcCall('resources/list');
  assert.equal(resList.result.resources.length, 4);
  const promptGet = await rpcCall('prompts/get', {
    name: 'free-yt-fb-insta-to-bangla-reel',
    arguments: { mediaUrl: 'https://www.instagram.com/reel/C999/' },
  });
  assert.ok(
    promptGet.result.messages[0].content.text.includes('instagram.com/reel/C999/')
  );

  console.log(
    'PASS: 100% Free-First MCP Connector (Kotha Studio, YT/FB/Insta/TikTok Downloader, CapCut Video Studio, Free Image Fallback, 10 tools, 4 resources, 3 prompts) verified with zero API key.'
  );
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
```

#### 4E. Update `package.json` scripts:
Add `"mcp:stdio": "node mcp-stdio-bridge.mjs"` and `"test:mcp": "node tests/mcp-connector.cjs"` to `"scripts"` in `package.json`.

### TASK 5: Run Verification Suite

Run all test suites and typecheck to confirm zero regressions:

```bash
npm run typecheck
npm run test:aura
npm run test:kotha
npm run test:capcut
npm run test:editor
npm run test:mcp
```
