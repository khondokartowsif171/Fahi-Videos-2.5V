"use client";

import { useState } from "react";
import { Download, AlertCircle, Video, Music, Scissors, Mic, CheckCircle2, ExternalLink, Copy, Check, Smartphone } from "lucide-react";
import { logActivity } from "@/lib/activity";
import { studioBase } from "@/lib/studio-client";

export default function YoutubeDownloader() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoData, setVideoData] = useState<any>(null);
  const [error, setError] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (link: string, idx: number) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(link);
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 2500);
    }
  };

  const extractYoutubeIdClient = (rawUrl: string): string | null => {
    try {
      const u = new URL(rawUrl);
      if (u.hostname.includes("youtu.be")) {
        const id = u.pathname.replace(/^\/+/, "").split("/")[0];
        if (id && /^[\w-]{11}$/.test(id)) return id;
      } else if (u.hostname.includes("youtube.com")) {
        if (
          u.pathname.startsWith("/shorts/") ||
          u.pathname.startsWith("/embed/") ||
          u.pathname.startsWith("/live/")
        ) {
          const parts = u.pathname.split("/").filter(Boolean);
          const id = parts[1];
          if (id && /^[\w-]{11}$/.test(id)) return id;
        } else {
          const v = u.searchParams.get("v");
          if (v && /^[\w-]{11}$/.test(v)) return v;
        }
      }
    } catch {}
    const m = rawUrl.match(
      /(?:youtu\.be\/|v\/|u\/\w\/|embed\/|shorts\/|live\/|watch\?v=|&v=)([a-zA-Z0-9_-]{11})/
    );
    return m ? m[1] : null;
  };

  const fetchYoutubeDirectClient = async (videoId: string) => {
    const res = await fetch(`https://api.vidsnap.app/parse?id=${encodeURIComponent(videoId)}`);
    if (!res.ok) return null;
    const vsData = await res.json();
    const rawFormats = Array.isArray(vsData?.formats) ? vsData.formats : [];
    const formats: Array<{ quality: string; url: string; type: "video" | "audio" }> = [];

    const progressives = rawFormats.filter(
      (f: any) => f && f.url && f.kind === "progressive"
    );
    for (const p of progressives) {
      formats.push({
        quality: `MP4 Video (${p.qualityLabel || "HD"})`,
        url: `https://api.vidsnap.app/proxy?u=${encodeURIComponent(p.url)}`,
        type: "video",
      });
    }

    const audioStreams = rawFormats.filter(
      (f: any) => f && f.url && f.kind === "audio"
    );
    const mp4Audios = audioStreams
      .filter((f: any) => String(f.mimeType || "").includes("mp4"))
      .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
    const otherAudios = audioStreams
      .filter((f: any) => !String(f.mimeType || "").includes("mp4"))
      .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
    const bestAudio = mp4Audios[0] || otherAudios[0];

    if (bestAudio) {
      formats.push({
        quality: "MP3 / M4A Audio (High Quality)",
        url: `https://api.vidsnap.app/proxy?u=${encodeURIComponent(bestAudio.url)}`,
        type: "audio",
      });
    }

    if (formats.length === 0) return null;
    const thumbs = Array.isArray(vsData?.thumbnails) ? vsData.thumbnails : [];
    return {
      platform: "youtube",
      title: vsData.title || "YouTube Video",
      author: vsData.author || "YouTube Creator",
      thumbnail:
        thumbs.length > 0
          ? thumbs[thumbs.length - 1]?.url
          : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      formats,
    };
  };

  const handleFetch = async () => {
    const cleanUrl = url.trim();
    if (!cleanUrl) return;
    setLoading(true);
    setError("");
    setVideoData(null);

    try {
      const response = await fetch(`/api/video/info?url=${encodeURIComponent(cleanUrl)}`);
      const data = await response.json();
      if (response.ok && Array.isArray(data.formats) && data.formats.length > 0) {
        setVideoData(data);
        logActivity({
          type: "youtube_download",
          title: data.title || "Media Link Extraction",
          metadata: { url: cleanUrl, platform: data.platform || "media" },
        });
      } else {
        const ytId = extractYoutubeIdClient(cleanUrl);
        if (ytId) {
          const clientData = await fetchYoutubeDirectClient(ytId).catch(() => null);
          if (clientData) {
            setVideoData(clientData);
            logActivity({
              type: "youtube_download",
              title: clientData.title || "YouTube Direct Extraction",
              metadata: { url: cleanUrl, platform: "youtube" },
            });
            return;
          }
        }
        setError(data.error || "Failed to fetch video info");
      }
    } catch (e: any) {
      const ytId = extractYoutubeIdClient(cleanUrl);
      if (ytId) {
        const clientData = await fetchYoutubeDirectClient(ytId).catch(() => null);
        if (clientData) {
          setVideoData(clientData);
          return;
        }
      }
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
          {/* Main Download Card (Native Streams or Direct Buttons) */}
          <div className="rounded-3xl border border-white/[0.06] bg-[#111115]/80 backdrop-blur-md p-6 sm:p-8 shadow-[0_12px_40px_-15px_rgba(0,0,0,0.7)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-6">
              <div>
                <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono text-emerald-400 font-bold uppercase tracking-widest inline-block mb-2">
                  100% Free Stream Ready ({videoData.platform || "Media"})
                </span>
                <h3 className="text-md sm:text-lg font-bold text-white leading-snug line-clamp-2">
                  {videoData.title || "Social Media Stream Ready"}
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

            {/* Formats Grid */}
            {Array.isArray(videoData.formats) && videoData.formats.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {videoData.formats.map((format: any, index: number) => {
                  const downloadHref = format.isFallback
                    ? format.url
                    : `${studioBase || ""}/api/video/download?url=${encodeURIComponent(format.url)}`;

                  return (
                    <div
                      key={index}
                      className="border border-white/5 bg-[#07070a]/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-indigo-500/30 transition-all duration-300 hover:bg-[#07070a]/90 group/item"
                    >
                      <div className="flex items-center space-x-3.5">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover/item:scale-105 transition-transform flex-shrink-0">
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

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleCopy(format.url, index)}
                          title="Copy direct stream link"
                          className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        >
                          {copiedIndex === index ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {!format.isFallback && (
                          <a
                            href={format.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open/Stream directly in browser"
                            className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Stream</span>
                          </a>
                        )}

                        <a
                          href={downloadHref}
                          {...(!format.isFallback
                            ? { download: "fahi-media" }
                            : { target: "_blank", rel: "noopener noreferrer" })}
                          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white transition-all active:scale-95 shadow-md shadow-indigo-600/10 cursor-pointer flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Mobile Helpful Tip Box */}
            <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs mt-6">
              <Smartphone className="w-4 h-4 flex-shrink-0 text-indigo-400" />
              <span>
                <strong>Mobile Tip:</strong> If the video plays in the browser instead of auto-downloading (common on iPhone/iPad or Android), tap the browser Share icon (⬆️) or 3 dots (⋮) and select <strong>&quot;Save Video / Download&quot;</strong> to save directly to your gallery.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
