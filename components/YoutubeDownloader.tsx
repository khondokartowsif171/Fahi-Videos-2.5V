"use client";

import { useState } from "react";
import { Download, AlertCircle, Video, Music } from "lucide-react";
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

    // TODO: implement API fetching logic
    // we'll add the API routes in the next step
    try {
        const response = await fetch(`/api/video/info?url=${encodeURIComponent(url)}`);
        const data = await response.json();
        if (response.ok) {
            setVideoData(data);
            logActivity({
              type: "youtube_download",
              title: data.title || "Media Link Extraction",
              metadata: { url }
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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Hero Header Section */}
      <div className="text-center md:text-left space-y-2 max-w-2xl">
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white font-sans flex items-center justify-center md:justify-start gap-3">
          <span>Sleek Media Downloader</span>
          <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/25 px-2 py-0.5 rounded-full font-mono text-indigo-400 font-bold uppercase tracking-widest animate-pulse">
            Ultra-Fast Core
          </span>
        </h2>
        <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
          Premium media extraction suite. Download video, reels, and audio tracks from YouTube, Facebook, and Instagram instantly with high-fidelity streams.
        </p>
      </div>

      {/* Main Glassmorphic Panel */}
      <div className="rounded-3xl border border-white/[0.06] bg-[#111115]/80 backdrop-blur-md p-6 sm:p-8 shadow-[0_12px_40px_-15px_rgba(0,0,0,0.7)] relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent group-hover:via-indigo-500/80 transition-all duration-700" />
        
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Download className="w-4 h-4 text-indigo-400" />
          <span>Enter Stream Link</span>
        </h3>
        
        <div className="flex flex-col sm:flex-row gap-3.5">
          <div className="relative flex-1 group">
            <input
              type="text"
              placeholder="Paste YouTube, Facebook, or Instagram link..."
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
                <span>Extract Media</span>
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
              <div className="border-b border-white/5 pb-4 mb-6">
                <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono text-emerald-400 font-bold uppercase tracking-widest inline-block mb-3">
                  Direct Stream Found
                </span>
                <h3 className="text-md sm:text-lg font-bold text-white leading-snug line-clamp-2">{videoData.title}</h3>
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
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">{format.type}</div>
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
                    Bypass Engine
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white">Select Format & Begin Download</h3>
                  <p className="text-xs text-slate-400">Choose your preferred configuration (MP4, MP3, etc.) below to start secure packet extraction.</p>
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
