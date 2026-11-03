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
