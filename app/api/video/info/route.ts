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
      const ytExecResult = await extractWithYoutubeDl(url, "youtube");
      if (ytExecResult) return NextResponse.json(ytExecResult);

      try {
        const info: any = await withTimeout(btch.youtube(url), 5000, "btch.youtube");
        if (info && info.status) {
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
        const rInfo: any = await withTimeout(ytdown(url), 5000, "ruhend.ytdown");
        if (rInfo && (rInfo.video || rInfo.audio)) {
          const formats: Array<{ quality: string; url: string; type: "video" | "audio" }> = [];
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

      // YouTube universal widget fallback
      const fallbackFormats = [
        {
          quality: "1080p (Full HD MP4)",
          url: `https://loader.to/api/button/?url=${encodeURIComponent(url)}&f=1080`,
          type: "video" as const,
          isFallback: true,
        },
        {
          quality: "720p (HD MP4)",
          url: `https://loader.to/api/button/?url=${encodeURIComponent(url)}&f=720`,
          type: "video" as const,
          isFallback: true,
        },
        {
          quality: "480p (MP4)",
          url: `https://loader.to/api/button/?url=${encodeURIComponent(url)}&f=480`,
          type: "video" as const,
          isFallback: true,
        },
        {
          quality: "MP3 Audio (320kbps)",
          url: `https://loader.to/api/button/?url=${encodeURIComponent(url)}&f=mp3`,
          type: "audio" as const,
          isFallback: true,
        },
      ];

      return NextResponse.json({
        fallbackToIframe: true,
        platform: "youtube",
        title: "YouTube Video",
        author: "YouTube Creator",
        thumbnail: "",
        url,
        formats: fallbackFormats,
      });
    }

    // ==========================================
    // 2. Facebook Multi-Engine Extraction
    // ==========================================
    if (isFacebook) {
      const fbExecResult = await extractWithYoutubeDl(url, "facebook");
      if (fbExecResult) return NextResponse.json(fbExecResult);

      try {
        const info: any = await withTimeout(btch.fbdown(url), 5000, "btch.fbdown");
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

      try {
        const { fbdown } = require("ruhend-scraper");
        const rFb: any = await withTimeout(fbdown(url), 5000, "ruhend.fbdown");
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
      } catch {}

      return NextResponse.json(
        {
          error:
            "Could not extract Facebook media. The video may be private, group-restricted, or expired.",
        },
        { status: 422 }
      );
    }

    // ==========================================
    // 3. Instagram Multi-Engine Extraction (Reels, Posts)
    // ==========================================
    if (isInstagram) {
      // Tier 1: youtube-dl-exec (Native yt-dlp)
      const igExecResult = await extractWithYoutubeDl(url, "instagram");
      if (igExecResult) return NextResponse.json(igExecResult);

      // Tier 2: btch-downloader with fast timeout
      try {
        const igInfo: any = await withTimeout(btch.igdl(url), 5000, "btch.igdl");
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

      // Tier 3: ruhend-scraper with fast timeout
      try {
        const { igdl } = require("ruhend-scraper");
        const rIg: any = await withTimeout(igdl(url), 5000, "ruhend.igdl");
        const list = Array.isArray(rIg?.data) ? rIg.data : [];
        if (list.length > 0) {
          const formats = list
            .filter((item: any) => item && item.url)
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
      } catch {}

      // Tier 4: snapsave-media-downloader with fast timeout
      try {
        const { snapsave } = require("snapsave-media-downloader");
        const snapRes: any = await withTimeout(snapsave(url), 5000, "snapsave");
        if (snapRes && snapRes.status && Array.isArray(snapRes.data) && snapRes.data.length > 0) {
          const formats = snapRes.data
            .filter((item: any) => item && item.url)
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

      return NextResponse.json(
        {
          error:
            "Could not extract Instagram Reel. Please ensure the account or Reel is public and not removed.",
        },
        { status: 422 }
      );
    }

    // ==========================================
    // 4. TikTok Multi-Engine Extraction
    // ==========================================
    if (isTiktok) {
      const ttExecResult = await extractWithYoutubeDl(url, "tiktok");
      if (ttExecResult) return NextResponse.json(ttExecResult);

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

      try {
        const { ttdl } = require("ruhend-scraper");
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
      } catch {}

      return NextResponse.json(
        {
          error:
            "Could not extract TikTok video. Please ensure the link is public and active.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ error: "Unsupported media platform" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Extraction failed" },
      { status: 500 }
    );
  }
}
