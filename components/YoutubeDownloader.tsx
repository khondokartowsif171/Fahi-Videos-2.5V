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
  const [mergingIndex, setMergingIndex] = useState<number | null>(null);
  const [mergeProgressLabel, setMergeProgressLabel] = useState<string>("");

  const handleCopy = (link: string, idx: number) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(link);
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 2500);
    }
  };

  const ensureWasmMuxerReady = async (): Promise<{
    createFFmpegCore: any;
    wasmBinary: Uint8Array;
  }> => {
    if (typeof window === "undefined") throw new Error("Browser environment required");
    const win = window as any;

    if (typeof win.createFFmpegCore !== "function") {
      const scriptUrls = [
        `${studioBase || ""}/ffmpeg-core.js`,
        "https://fastly.jsdelivr.net/npm/@ffmpeg/core-st@0.11.0/dist/ffmpeg-core.js",
        "https://cdn.jsdelivr.net/npm/@ffmpeg/core-st@0.11.0/dist/ffmpeg-core.js",
        "https://unpkg.com/@ffmpeg/core-st@0.11.0/dist/ffmpeg-core.js",
      ];
      let loaded = false;
      for (const src of scriptUrls) {
        try {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = src;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load ${src}`));
            document.head.appendChild(script);
          });
          if (typeof win.createFFmpegCore === "function") {
            loaded = true;
            break;
          }
        } catch {}
      }
      if (!loaded || typeof win.createFFmpegCore !== "function") {
        throw new Error("Could not load MP4 muxer script");
      }
    }

    if (!win.__fahiWasmBinary) {
      const wasmUrls = [
        "https://fastly.jsdelivr.net/npm/@ffmpeg/core-st@0.11.0/dist/ffmpeg-core.wasm",
        "https://cdn.jsdelivr.net/npm/@ffmpeg/core-st@0.11.0/dist/ffmpeg-core.wasm",
        "https://unpkg.com/@ffmpeg/core-st@0.11.0/dist/ffmpeg-core.wasm",
      ];
      for (const wasmUrl of wasmUrls) {
        try {
          const res = await fetch(wasmUrl);
          if (res.ok) {
            const ab = await res.arrayBuffer();
            if (ab.byteLength > 1000000) {
              win.__fahiWasmBinary = new Uint8Array(ab);
              break;
            }
          }
        } catch {}
      }
    }

    if (!win.__fahiWasmBinary) {
      throw new Error("Could not download MP4 muxer WebAssembly core");
    }

    return {
      createFFmpegCore: win.createFFmpegCore,
      wasmBinary: win.__fahiWasmBinary,
    };
  };

  const muxVideoAndAudioWasm = async (
    videoBytes: Uint8Array,
    audioBytes: Uint8Array
  ): Promise<Uint8Array> => {
    const { createFFmpegCore, wasmBinary } = await ensureWasmMuxerReady();
    const Core = await createFFmpegCore({
      wasmBinary,
      print: () => {},
      printErr: () => {},
    });

    Core.FS.writeFile("video.mp4", videoBytes);
    Core.FS.writeFile("audio.m4a", audioBytes);

    const main = Core.cwrap("main", "number", ["number", "number"]);
    const args = [
      "./ffmpeg",
      "-nostdin",
      "-y",
      "-i",
      "video.mp4",
      "-i",
      "audio.m4a",
      "-c",
      "copy",
      "-movflags",
      "faststart",
      "output.mp4",
    ];
    const argvPtr = Core._malloc(args.length * 4);
    const strPtrs: number[] = [];
    args.forEach((arg, i) => {
      const len = Core.lengthBytesUTF8(arg) + 1;
      const sPtr = Core._malloc(len);
      strPtrs.push(sPtr);
      Core.stringToUTF8(arg, sPtr, len);
      Core.setValue(argvPtr + i * 4, sPtr, "i32");
    });

    try {
      main(args.length, argvPtr);
    } catch (e: any) {
      if (e && typeof e.status === "number" && e.status !== 0) {
        throw new Error(`Muxer exited with status ${e.status}`);
      }
    }

    const merged: Uint8Array = Core.FS.readFile("output.mp4");
    const copy = new Uint8Array(merged.byteLength);
    copy.set(merged);
    try {
      Core.FS.unlink("video.mp4");
      Core.FS.unlink("audio.m4a");
      Core.FS.unlink("output.mp4");
    } catch {}
    return copy;
  };

  const fetchStreamBuffer = async (
    streamUrl: string,
    onProgress: (ratio: number) => void
  ): Promise<Uint8Array> => {
    const res = await fetch(streamUrl);
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
    const total = Number(res.headers.get("content-length")) || 0;
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.byteLength;
        if (total > 0) onProgress(Math.min(1, received / total));
      }
    }
    const combined = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return combined;
  };

  const downloadRangedStream = async (
    rawGoogleUrl: string | undefined,
    fallbackProxyUrl: string,
    knownSize: number,
    onProgress: (ratio: number) => void
  ): Promise<Uint8Array> => {
    let totalSize = Number(knownSize) || 0;
    if (!totalSize && rawGoogleUrl) {
      try {
        totalSize = Number(new URL(rawGoogleUrl).searchParams.get("clen")) || 0;
      } catch {}
    }

    if (rawGoogleUrl && totalSize > 0) {
      const CHUNK_SIZE = 6 * 1024 * 1024;
      const out = new Uint8Array(totalSize);
      let offset = 0;
      while (offset < totalSize) {
        const end = Math.min(offset + CHUNK_SIZE - 1, totalSize - 1);
        const sep = rawGoogleUrl.includes("?") ? "&" : "?";
        const rangedUrl = `${rawGoogleUrl}${sep}range=${offset}-${end}`;
        const proxyUrl = `https://api.vidsnap.app/proxy?u=${encodeURIComponent(rangedUrl)}`;
        const res = await fetch(proxyUrl);
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
        const reader = res.body.getReader();
        let chunkReceived = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            if (offset + chunkReceived + value.byteLength <= out.byteLength) {
              out.set(value, offset + chunkReceived);
            }
            chunkReceived += value.byteLength;
            onProgress(Math.min(1, (offset + chunkReceived) / totalSize));
          }
        }
        if (chunkReceived === 0) break;
        offset += chunkReceived;
      }
      return offset === totalSize ? out : out.slice(0, offset);
    }

    return await fetchStreamBuffer(fallbackProxyUrl, onProgress);
  };

  const handleMergeDownload = async (format: any, idx: number) => {
    if (mergingIndex !== null) return;
    setMergingIndex(idx);
    setMergeProgressLabel("Initializing...");
    setError("");

    try {
      await ensureWasmMuxerReady();

      const fetchWithRetry = async (
        proxyUrl: string,
        rawUrl: string | undefined,
        knownSize: number,
        itag: string,
        kind: "video" | "audio",
        onProgress: (r: number) => void
      ) => {
        try {
          return await downloadRangedStream(rawUrl, proxyUrl, knownSize, onProgress);
        } catch (err) {
          if (format.videoId) {
            const freshRes = await fetch(
              `https://api.vidsnap.app/parse?id=${encodeURIComponent(format.videoId)}&fresh=1`
            );
            if (freshRes.ok) {
              const freshData = await freshRes.json();
              const freshFmt = (freshData.formats || []).find(
                (x: any) => String(x.itag) === String(itag) && x.kind === kind
              );
              if (freshFmt?.url) {
                const refreshedProxy = `https://api.vidsnap.app/proxy?u=${encodeURIComponent(freshFmt.url)}`;
                return await downloadRangedStream(
                  freshFmt.url,
                  refreshedProxy,
                  Number(freshFmt.size) || knownSize,
                  onProgress
                );
              }
            }
          }
          throw err;
        }
      };

      setMergeProgressLabel("Video 0%");
      const vBuf = await fetchWithRetry(
        format.url,
        format.rawUrl,
        Number(format.size) || 0,
        format.itag,
        "video",
        (r) => {
          setMergeProgressLabel(`DL ${Math.round(r * 50)}%`);
        }
      );

      setMergeProgressLabel("Audio 50%");
      const aBuf = await fetchWithRetry(
        format.audioUrl,
        format.rawAudioUrl,
        Number(format.audioSize) || 0,
        format.audioItag,
        "audio",
        (r) => {
          setMergeProgressLabel(`DL ${Math.round(50 + r * 42)}%`);
        }
      );

      setMergeProgressLabel("Merging 95%");
      const mergedData = await muxVideoAndAudioWasm(vBuf, aBuf);

      const safeTitle = String(videoData?.title || "video")
        .replace(/[\\/:*?"<>|]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 60);
      const blob = new Blob([mergedData as unknown as BlobPart], { type: "video/mp4" });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `Fahi-vids - ${safeTitle} - ${format.quality}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
      setMergeProgressLabel("Saved!");
      setTimeout(() => {
        setMergingIndex(null);
        setMergeProgressLabel("");
      }, 1500);
    } catch (e: any) {
      setError(`HD Merge Error: ${e?.message || "Could not merge stream. Please try again."}`);
      setMergingIndex(null);
      setMergeProgressLabel("");
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

  const getClenSize = (f: any): number => {
    const s = Number(f?.size) || 0;
    if (s > 0) return s;
    if (f?.url) {
      try {
        const clen = Number(new URL(f.url).searchParams.get("clen"));
        if (clen > 0) return clen;
      } catch {}
    }
    return 0;
  };

  const fetchYoutubeDirectClient = async (videoId: string) => {
    const res = await fetch(`https://api.vidsnap.app/parse?id=${encodeURIComponent(videoId)}`);
    if (!res.ok) return null;
    const vsData = await res.json();
    const rawFormats = Array.isArray(vsData?.formats) ? vsData.formats : [];
    const formats: Array<any> = [];

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
    const bestAudioSize = getClenSize(bestAudio);
    const bestAudioProxyUrl = bestAudio
      ? `https://api.vidsnap.app/proxy?u=${encodeURIComponent(bestAudio.url)}`
      : undefined;

    const progressives = rawFormats.filter(
      (f: any) => f && f.url && f.kind === "progressive"
    );
    const validProgressives = progressives.filter((p: any) => {
      const br = Number(p.bitrate) || 0;
      const sz = getClenSize(p);
      if (br > 0 && br < 64000) return false;
      if (sz > 0 && sz < 500000) return false;
      if (sz > 0 && bestAudioSize > 0 && sz <= bestAudioSize) return false;
      return true;
    });
    const validProg360 = validProgressives.find(
      (p: any) => String(p.qualityLabel || "360p") === "360p"
    );

    const seenRes = new Set<string>();
    if (bestAudioProxyUrl) {
      const avcVideos = rawFormats.filter(
        (f: any) =>
          f &&
          f.url &&
          f.kind === "video" &&
          String(f.mimeType || "").includes("avc1") &&
          ["1080p", "720p", "480p", "360p"].includes(String(f.qualityLabel || ""))
      );
      for (const v of avcVideos) {
        const qLabel = String(v.qualityLabel);
        if (seenRes.has(qLabel)) continue;
        seenRes.add(qLabel);
        formats.push({
          quality:
            qLabel === "1080p"
              ? "MP4 Video (1080p Full HD)"
              : qLabel === "720p"
                ? "MP4 Video (720p HD)"
                : qLabel === "480p"
                  ? "MP4 Video (480p SD)"
                  : `MP4 Video (${qLabel})`,
          url: `https://api.vidsnap.app/proxy?u=${encodeURIComponent(v.url)}`,
          rawUrl: v.url,
          size: getClenSize(v),
          audioUrl: bestAudioProxyUrl,
          rawAudioUrl: bestAudio.url,
          audioSize: bestAudioSize,
          streamUrl:
            qLabel === "360p" && validProg360
              ? `https://api.vidsnap.app/proxy?u=${encodeURIComponent(validProg360.url)}`
              : undefined,
          itag: String(v.itag || ""),
          audioItag: String(bestAudio.itag || ""),
          videoId,
          requiresMerge: true,
          type: "video",
        });
      }
    }

    for (const p of validProgressives) {
      const qLabel = String(p.qualityLabel || "360p");
      if (seenRes.has(qLabel)) continue;
      seenRes.add(qLabel);
      const pProxy = `https://api.vidsnap.app/proxy?u=${encodeURIComponent(p.url)}`;
      formats.push({
        quality: `MP4 Video (${qLabel})`,
        url: pProxy,
        rawUrl: p.url,
        size: getClenSize(p),
        streamUrl: pProxy,
        itag: String(p.itag || "18"),
        videoId,
        type: "video",
      });
    }

    if (bestAudio && bestAudioProxyUrl) {
      formats.push({
        quality: "MP3 / M4A Audio (High Quality)",
        url: bestAudioProxyUrl,
        rawUrl: bestAudio.url,
        size: bestAudioSize,
        streamUrl: bestAudioProxyUrl,
        itag: String(bestAudio.itag || "140"),
        videoId,
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

  const handleDirectYoutubeSave = async (format: any, idx: number) => {
    if (mergingIndex !== null) return;
    setMergingIndex(idx);
    setMergeProgressLabel("Starting 0%");
    setError("");

    try {
      const kind = format.type === "audio" ? "audio" : "progressive";
      let buf: Uint8Array;
      try {
        buf = await downloadRangedStream(
          format.rawUrl,
          format.url,
          Number(format.size) || 0,
          (r) => {
            setMergeProgressLabel(`Saving ${Math.round(r * 100)}%`);
          }
        );
      } catch {
        if (!format.videoId) throw new Error("Stream expired");
        const freshRes = await fetch(
          `https://api.vidsnap.app/parse?id=${encodeURIComponent(format.videoId)}&fresh=1`
        );
        if (!freshRes.ok) throw new Error("Could not refresh stream");
        const freshData = await freshRes.json();
        const freshFmt =
          (freshData.formats || []).find(
            (x: any) => String(x.itag) === String(format.itag) && x.kind === kind
          ) || (freshData.formats || []).find((x: any) => x.kind === kind);
        if (!freshFmt?.url) throw new Error("Refreshed format unavailable");
        const refreshedProxy = `https://api.vidsnap.app/proxy?u=${encodeURIComponent(freshFmt.url)}`;
        buf = await downloadRangedStream(
          freshFmt.url,
          refreshedProxy,
          getClenSize(freshFmt) || Number(format.size) || 0,
          (r) => {
            setMergeProgressLabel(`Saving ${Math.round(r * 100)}%`);
          }
        );
      }

      const safeTitle = String(videoData?.title || "video")
        .replace(/[\\/:*?"<>|]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 60);
      const isAudio = format.type === "audio";
      const ext = isAudio ? "m4a" : "mp4";
      const mime = isAudio ? "audio/mp4" : "video/mp4";
      const blob = new Blob([buf as unknown as BlobPart], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `Fahi-vids - ${safeTitle} - ${format.quality}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
      setMergeProgressLabel("Saved!");
      setTimeout(() => {
        setMergingIndex(null);
        setMergeProgressLabel("");
      }, 1500);
    } catch (e: any) {
      setError(`Download Error: ${e?.message || "Could not download stream. Please try again."}`);
      setMergingIndex(null);
      setMergeProgressLabel("");
    }
  };

  const handleFetch = async () => {
    const cleanUrl = url.trim();
    if (!cleanUrl) return;
    setLoading(true);
    setError("");
    setVideoData(null);

    try {
      // For YouTube, prefer direct browser-edge parsing first so Cloudflare Edge IP matches browser downloads 100%
      const ytId = extractYoutubeIdClient(cleanUrl);
      if (ytId) {
        const clientData = await fetchYoutubeDirectClient(ytId).catch(() => null);
        if (clientData && Array.isArray(clientData.formats) && clientData.formats.length > 0) {
          setVideoData(clientData);
          logActivity({
            type: "youtube_download",
            title: clientData.title || "YouTube Direct Extraction",
            metadata: { url: cleanUrl, platform: "youtube" },
          });
          return;
        }
      }

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
                    : `${studioBase || ""}/api/video/download?url=${encodeURIComponent(format.url)}&name=${encodeURIComponent(videoData.title || "video")}`;

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

                        {(format.streamUrl || (!format.isFallback && !format.requiresMerge)) && (
                          <a
                            href={format.streamUrl || format.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open/Stream directly in browser"
                            className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Stream</span>
                          </a>
                        )}

                        {format.requiresMerge || format.videoId ? (
                          <button
                            type="button"
                            onClick={() =>
                              format.requiresMerge
                                ? handleMergeDownload(format, index)
                                : handleDirectYoutubeSave(format, index)
                            }
                            disabled={mergingIndex !== null}
                            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/60 rounded-xl text-xs font-bold text-white transition-all active:scale-95 shadow-md shadow-indigo-600/10 cursor-pointer flex items-center gap-1.5"
                          >
                            {mergingIndex === index ? (
                              <>
                                <span className="h-3.5 w-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                <span>{mergeProgressLabel || "Processing..."}</span>
                              </>
                            ) : (
                              <>
                                <Download className="w-3.5 h-3.5" />
                                <span>Download</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <a
                            href={downloadHref}
                            download="Fahi-vids"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white transition-all active:scale-95 shadow-md shadow-indigo-600/10 cursor-pointer flex items-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </a>
                        )}
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
