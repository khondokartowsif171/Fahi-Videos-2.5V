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

async function withTimeout<T = any>(promise: Promise<T>, ms: number, label = "Operation"): Promise<any> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

async function extractWithYoutubeDl(url: string, platformHint: string) {
  try {
    const youtubedl = require("youtube-dl-exec");
    const output: any = await withTimeout(
      youtubedl(url, {
        dumpSingleJson: true,
        noWarnings: true,
        noCallHome: true,
        preferFreeFormats: true,
        noCheckCertificates: true,
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      }),
      14000,
      "youtube-dl-exec"
    );

    if (!output) return null;

    const title =
      output.title ||
      output.description?.slice(0, 80) ||
      `${platformHint.charAt(0).toUpperCase() + platformHint.slice(1)} Media`;
    const author = output.uploader || output.channel || `${platformHint} Creator`;
    const thumbnail =
      output.thumbnail ||
      (Array.isArray(output.thumbnails) ? output.thumbnails[0]?.url : "") ||
      "";

    const rawFormats = Array.isArray(output.formats) ? output.formats : [];
    const formats: Array<{ quality: string; url: string; type: "video" | "audio" }> = [];

    // Filter valid downloadable video streams (prefer mp4)
    const videoStreams = rawFormats.filter(
      (f: any) => f && f.url && (f.ext === "mp4" || f.vcodec !== "none")
    );

    // Pick top resolutions without duplicates
    const seenQualities = new Set<string>();
    videoStreams.sort((a: any, b: any) => (b.height || 0) - (a.height || 0));

    for (const f of videoStreams) {
      const height = f.height || 0;
      const label =
        height >= 1080
          ? "1080p (Full HD MP4)"
          : height >= 720
            ? "720p (HD MP4)"
            : height >= 480
              ? "480p (SD MP4)"
              : height > 0
                ? `${height}p (MP4)`
                : "Direct HD (MP4)";

      if (!seenQualities.has(label)) {
        seenQualities.add(label);
        formats.push({
          quality: label,
          url: f.url,
          type: "video",
        });
      }
      if (formats.length >= 4) break;
    }

    // If no filtered video formats matched, fallback to direct url
    if (formats.length === 0 && output.url) {
      formats.push({
        quality: "HD Video (MP4)",
        url: output.url,
        type: "video",
      });
    }

    // Audio stream extraction
    const audioStreams = rawFormats.filter(
      (f: any) => f && f.url && (f.vcodec === "none" || f.ext === "m4a" || f.ext === "mp3")
    );
    if (audioStreams.length > 0) {
      const bestAudio = audioStreams[audioStreams.length - 1];
      formats.push({
        quality: "Audio (MP3/M4A)",
        url: bestAudio.url,
        type: "audio",
      });
    }

    if (formats.length > 0) {
      return {
        platform: platformHint,
        title,
        author,
        thumbnail,
        formats,
      };
    }
    return null;
  } catch (err: any) {
    console.warn("youtube-dl-exec extraction error:", err?.message || err);
    return null;
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

    // ==========================================
    // 1. YouTube Multi-Engine Extraction
    // ==========================================
    if (isYoutube) {
      // 1. URL Normalization: Extract 11-char video ID and construct clean canonical URL
      let canonicalUrl = url;
      let videoId: string | null = null;
      try {
        const u = new URL(url);
        if (u.hostname.includes("youtu.be")) {
          const id = u.pathname.replace(/^\/+/, "").split("/")[0];
          if (id && /^[\w-]{11}$/.test(id)) videoId = id;
        } else if (u.hostname.includes("youtube.com")) {
          if (
            u.pathname.startsWith("/shorts/") ||
            u.pathname.startsWith("/embed/") ||
            u.pathname.startsWith("/live/")
          ) {
            const parts = u.pathname.split("/").filter(Boolean);
            const id = parts[1];
            if (id && /^[\w-]{11}$/.test(id)) videoId = id;
          } else {
            const v = u.searchParams.get("v");
            if (v && /^[\w-]{11}$/.test(v)) videoId = v;
          }
        }
      } catch {}
      if (!videoId) {
        const m = url.match(
          /(?:youtu\.be\/|v\/|u\/\w\/|embed\/|shorts\/|live\/|watch\?v=|&v=)([a-zA-Z0-9_-]{11})/
        );
        if (m) videoId = m[1];
      }
      if (videoId) {
        canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
      }

      // Tier 1: Direct VidSnap Edge Parser (Fastest, bypasses broken middleman proxies)
      if (videoId) {
        for (const querySuffix of ["", "&fresh=1"]) {
          try {
            const vsRes = await fetch(
              `https://api.vidsnap.app/parse?id=${encodeURIComponent(videoId)}${querySuffix}`,
              {
                signal: AbortSignal.timeout(12000),
                headers: {
                  "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
                  Accept: "application/json",
                  Origin: "https://vidsnap.app",
                  Referer: "https://vidsnap.app/",
                },
              }
            );
            if (vsRes.ok) {
              const vsData: any = await vsRes.json();
              const rawFormats = Array.isArray(vsData?.formats) ? vsData.formats : [];
              const formats: Array<{
                quality: string;
                url: string;
                audioUrl?: string;
                itag?: string;
                audioItag?: string;
                videoId?: string;
                requiresMerge?: boolean;
                type: "video" | "audio";
              }> = [];

              // Find best Audio stream first (prefer audio/mp4 M4A with highest bitrate for lossless MP4 muxing)
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
              const bestAudioProxyUrl = bestAudio
                ? `https://api.vidsnap.app/proxy?u=${encodeURIComponent(bestAudio.url)}`
                : undefined;

              // 1. High-Definition H.264 MP4 streams (1080p Full HD, 720p HD, 480p SD) merged with AAC audio
              if (bestAudioProxyUrl) {
                const avcVideos = rawFormats.filter(
                  (f: any) =>
                    f &&
                    f.url &&
                    f.kind === "video" &&
                    String(f.mimeType || "").includes("avc1") &&
                    ["1080p", "720p", "480p"].includes(String(f.qualityLabel || ""))
                );
                const seenRes = new Set<string>();
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
                          : `MP4 Video (${qLabel} SD)`,
                    url: `https://api.vidsnap.app/proxy?u=${encodeURIComponent(v.url)}`,
                    audioUrl: bestAudioProxyUrl,
                    itag: String(v.itag || ""),
                    audioItag: String(bestAudio.itag || ""),
                    videoId,
                    requiresMerge: true,
                    type: "video",
                  });
                }
              }

              // 2. Progressive streams (360p video + audio pre-combined in MP4)
              const progressives = rawFormats.filter(
                (f: any) => f && f.url && f.kind === "progressive"
              );
              for (const p of progressives) {
                formats.push({
                  quality: `MP4 Video (${p.qualityLabel || "360p"})`,
                  url: `https://api.vidsnap.app/proxy?u=${encodeURIComponent(p.url)}`,
                  type: "video",
                });
              }

              // 3. Direct Audio stream
              if (bestAudio && bestAudioProxyUrl) {
                formats.push({
                  quality: "MP3 / M4A Audio (High Quality)",
                  url: bestAudioProxyUrl,
                  type: "audio",
                });
              }

              if (formats.length > 0) {
                const thumbs = Array.isArray(vsData?.thumbnails) ? vsData.thumbnails : [];
                const bestThumb =
                  thumbs.length > 0
                    ? thumbs[thumbs.length - 1]?.url
                    : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

                return NextResponse.json({
                  platform: "youtube",
                  title: vsData.title || "YouTube Video",
                  author: vsData.author || "YouTube Creator",
                  thumbnail: bestThumb || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                  formats,
                });
              }
            }
          } catch (e: any) {
            console.warn(`VidSnap direct parse (${querySuffix || "primary"}) error:`, e?.message || e);
          }
        }
      }

      // Tier 2: Fast direct extractor (btch-downloader wrapper, 8s timeout)
      try {
        const info: any = await withTimeout(btch.youtube(canonicalUrl), 8000, "btch.youtube");
        if (info && info.status && (info.mp4 || info.mp3)) {
          const formats: Array<{ quality: string; url: string; type: "video" | "audio" }> = [];
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
              thumbnail: info.thumbnail || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : ""),
              formats,
            });
          }
        }
      } catch (e: any) {
        console.warn("btch.youtube fallback error:", e?.message || e);
      }

      // Tier 3: youtube-dl-exec (fallback with short timeout)
      try {
        const ytExecResult = await extractWithYoutubeDl(canonicalUrl, "youtube");
        if (ytExecResult && ytExecResult.formats?.length > 0) {
          return NextResponse.json(ytExecResult);
        }
      } catch {}

      return NextResponse.json(
        {
          error:
            "Could not extract YouTube media stream at this moment. Please verify the video is public and try again.",
        },
        { status: 422 }
      );
    }

    // ==========================================
    // 2. Facebook Multi-Engine Extraction
    // ==========================================
    if (isFacebook) {
      // Tier 1: snapsave-media-downloader (fastest for FB Reels & Videos)
      try {
        const { snapsave } = require("snapsave-media-downloader");
        const snapRes: any = await withTimeout(snapsave(url), 7000, "snapsave.fb");
        if (snapRes && snapRes.status && Array.isArray(snapRes.data) && snapRes.data.length > 0) {
          const formats = snapRes.data
            .filter((item: any) => item && item.url && String(item.url).startsWith("http"))
            .map((item: any) => ({
              quality: item.resolution ? `${item.resolution} (MP4)` : "Facebook Video (HD MP4)",
              url: item.url,
              type: "video" as const,
            }));
          if (formats.length > 0) {
            const rawDesc = String(snapRes.data[0]?.description || "").trim();
            const cleanTitle =
              rawDesc && rawDesc !== "..." && rawDesc !== ".."
                ? rawDesc
                : "Facebook Video / Reel";
            return NextResponse.json({
              platform: "facebook",
              title: cleanTitle,
              author: "Facebook Creator",
              thumbnail: snapRes.data[0]?.thumbnail || "",
              formats,
            });
          }
        }
      } catch (e: any) {
        console.warn("snapsave.fb fallback:", e?.message || e);
      }

      // Tier 2: btch.fbdown
      try {
        const info: any = await withTimeout(btch.fbdown(url), 7000, "btch.fbdown");
        if (info && info.status) {
          const formats: Array<{ quality: string; url: string; type: "video" | "audio" }> = [];
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

      // Tier 3: ruhend.fbdl
      try {
        const { fbdl } = require("ruhend-scraper");
        if (typeof fbdl === "function") {
          const rFb: any = await withTimeout(fbdl(url), 7000, "ruhend.fbdl");
          const list = Array.isArray(rFb?.data) ? rFb.data : [];
          if (list.length > 0) {
            const formats = list
              .filter((item: any) => item && item.url)
              .map((item: any, idx: number) => ({
                quality: item.resolution || (idx === 0 ? "HD Video (MP4)" : "SD Video (MP4)"),
                url: item.url,
                type: "video" as const,
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
        }
      } catch {}

      // Tier 4: youtube-dl-exec (fallback)
      try {
        const fbExecResult = await extractWithYoutubeDl(url, "facebook");
        if (fbExecResult && fbExecResult.formats?.length > 0) {
          return NextResponse.json(fbExecResult);
        }
      } catch {}

      // Tier 5: Facebook direct cloud mirror fallback (never 422, zero loader.to)
      return NextResponse.json({
        platform: "facebook",
        title: "Facebook Video / Reel",
        author: "Facebook Creator",
        thumbnail: "",
        url,
        formats: [
          {
            quality: "SnapSave Mirror (HD MP4)",
            url: `https://snapsave.app/#url=${encodeURIComponent(url)}`,
            type: "video" as const,
            isFallback: true,
          },
          {
            quality: "FDown Mirror (SD MP4)",
            url: `https://fdown.net/download.php?url=${encodeURIComponent(url)}`,
            type: "video" as const,
            isFallback: true,
          },
        ],
      });
    }

    // ==========================================
    // 3. Instagram Multi-Engine Extraction (Reels, Posts)
    // ==========================================
    if (isInstagram) {
      // Tier 1: btch-downloader with fast timeout
      try {
        const igInfo: any = await withTimeout(btch.igdl(url), 7000, "btch.igdl");
        const igList = Array.isArray(igInfo)
          ? igInfo
          : Array.isArray(igInfo?.result)
            ? igInfo.result
            : Array.isArray(igInfo?.data)
              ? igInfo.data
              : [];
        if (igList.length > 0) {
          const formats = igList
            .filter((item: any) => item && item.url && item.url.trim().length > 0)
            .map((item: any, idx: number) => ({
              quality: `Instagram Reel / Video (HD MP4 #${idx + 1})`,
              url: item.url,
              type: "video" as const,
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

      // Tier 2: ruhend-scraper with fast timeout
      try {
        const { igdl } = require("ruhend-scraper");
        if (typeof igdl === "function") {
          const rIg: any = await withTimeout(igdl(url), 7000, "ruhend.igdl");
          const list = Array.isArray(rIg?.data) ? rIg.data : [];
          if (list.length > 0) {
            const formats = list
              .filter((item: any) => item && item.url && item.url.trim().length > 0)
              .map((item: any, idx: number) => ({
                quality: `Instagram Reel / Video (HD MP4 #${idx + 1})`,
                url: item.url,
                type: "video" as const,
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
        }
      } catch {}

      // Tier 3: snapsave-media-downloader with fast timeout
      try {
        const { snapsave } = require("snapsave-media-downloader");
        const snapRes: any = await withTimeout(snapsave(url), 7000, "snapsave");
        if (snapRes && snapRes.status && Array.isArray(snapRes.data) && snapRes.data.length > 0) {
          const formats = snapRes.data
            .filter((item: any) => item && item.url && item.url.trim().length > 0)
            .map((item: any) => ({
              quality: item.resolution || "Instagram HD Video (MP4)",
              url: item.url,
              type: "video" as const,
            }));
          if (formats.length > 0) {
            return NextResponse.json({
              platform: "instagram",
              title: "Instagram Reel / Video",
              author: "Instagram Creator",
              thumbnail: snapRes.data[0]?.thumbnail || "",
              formats,
            });
          }
        }
      } catch {}

      // Tier 4: youtube-dl-exec (fallback)
      try {
        const igExecResult = await extractWithYoutubeDl(url, "instagram");
        if (igExecResult && igExecResult.formats?.length > 0) {
          return NextResponse.json(igExecResult);
        }
      } catch {}

      // Tier 5: Instagram direct cloud mirror fallback (never 422, zero loader.to)
      return NextResponse.json({
        platform: "instagram",
        title: "Instagram Reel / Video",
        author: "Instagram Creator",
        thumbnail: "",
        url,
        formats: [
          {
            quality: "SnapSave Mirror (HD MP4)",
            url: `https://snapsave.app/#url=${encodeURIComponent(url)}`,
            type: "video" as const,
            isFallback: true,
          },
          {
            quality: "FastDl Mirror (HD MP4)",
            url: `https://fastdl.app/en#url=${encodeURIComponent(url)}`,
            type: "video" as const,
            isFallback: true,
          },
        ],
      });
    }

    // ==========================================
    // 4. TikTok Multi-Engine Extraction
    // ==========================================
    if (isTiktok) {
      const ttExecResult = await extractWithYoutubeDl(url, "tiktok");
      if (ttExecResult) return NextResponse.json(ttExecResult);

      // Tier 1: tikwm.com (100% Free, Zero Key, Ultra-fast No Watermark HD MP4 & MP3)
      try {
        const ttRes = await withTimeout(
          fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
            },
          }),
          6000,
          "tikwm"
        );
        if (ttRes.ok) {
          const ttData = await ttRes.json();
          if (ttData && ttData.code === 0 && ttData.data) {
            const formats: Array<{ quality: string; url: string; type: "video" | "audio" }> = [];
            const hdUrl = ttData.data.hdplay || ttData.data.play;
            const playUrl = ttData.data.play;
            const musicUrl = ttData.data.music;

            if (hdUrl) {
              formats.push({
                quality: "TikTok HD Video (No Watermark MP4)",
                url: hdUrl,
                type: "video",
              });
            }
            if (playUrl && playUrl !== hdUrl) {
              formats.push({
                quality: "TikTok SD Video (Fast MP4)",
                url: playUrl,
                type: "video",
              });
            }
            if (musicUrl) {
              formats.push({
                quality: "TikTok Original Audio (MP3)",
                url: musicUrl,
                type: "audio",
              });
            }
            if (formats.length > 0) {
              return NextResponse.json({
                platform: "tiktok",
                title: ttData.data.title || "TikTok Video",
                author: ttData.data.author?.nickname || ttData.data.author?.unique_id || "TikTok Creator",
                thumbnail: ttData.data.cover || ttData.data.origin_cover || "",
                formats,
              });
            }
          }
        }
      } catch (e: any) {
        console.warn("tikwm engine fallback:", e?.message || e);
      }

      // Tier 2: btch.ttdl
      try {
        const ttInfo: any = await withTimeout(btch.ttdl(url), 5000, "btch.ttdl");
        if (ttInfo && (ttInfo.video || ttInfo.audio)) {
          const formats: Array<{ quality: string; url: string; type: "video" | "audio" }> = [];
          const videoUrl = Array.isArray(ttInfo.video) ? ttInfo.video[0] : ttInfo.video;
          const audioUrl = Array.isArray(ttInfo.audio) ? ttInfo.audio[0] : ttInfo.audio;
          if (videoUrl) {
            formats.push({
              quality: "TikTok HD Video (No Watermark)",
              url: videoUrl,
              type: "video",
            });
          }
          if (audioUrl) {
            formats.push({
              quality: "TikTok Original Audio (MP3)",
              url: audioUrl,
              type: "audio",
            });
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

      // Tier 3: ruhend.ttdl
      try {
        const { ttdl } = require("ruhend-scraper");
        if (typeof ttdl === "function") {
          const rTt: any = await withTimeout(ttdl(url), 5000, "ruhend.ttdl");
          if (rTt && (rTt.video || rTt.audio)) {
            const formats: Array<{ quality: string; url: string; type: "video" | "audio" }> = [];
            if (rTt.video) {
              formats.push({
                quality: "TikTok HD Video (No Watermark)",
                url: rTt.video,
                type: "video",
              });
            }
            if (rTt.audio) {
              formats.push({
                quality: "TikTok Original Audio (MP3)",
                url: rTt.audio,
                type: "audio",
              });
            }
            if (formats.length > 0) {
              return NextResponse.json({
                platform: "tiktok",
                title: rTt.title || "TikTok Video",
                author: rTt.author || "TikTok Creator",
                thumbnail: rTt.thumbnail || "",
                formats,
              });
            }
          }
        }
      } catch {}

      // TikTok universal bypass fallback (never 422)
      return NextResponse.json({
        fallbackToIframe: true,
        platform: "tiktok",
        title: "TikTok Video",
        author: "TikTok Creator",
        thumbnail: "",
        url,
        formats: [
          {
            quality: "TikTok HD Video (MP4)",
            url: `https://loader.to/api/button/?url=${encodeURIComponent(url)}&f=1080`,
            type: "video" as const,
            isFallback: true,
          },
          {
            quality: "TikTok Original Audio (MP3)",
            url: `https://loader.to/api/button/?url=${encodeURIComponent(url)}&f=mp3`,
            type: "audio" as const,
            isFallback: true,
          },
        ],
      });
    }

    return NextResponse.json({ error: "Unsupported media platform" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Extraction failed" },
      { status: 500 }
    );
  }
}
