import { NextRequest, NextResponse } from "next/server";
const btch = require("btch-downloader");

async function expandUrl(shortUrl: string) {
    try {
        const response = await fetch(shortUrl, {
            method: 'HEAD',
            redirect: 'manual',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        if (response.status >= 300 && response.status < 400) {
            const loc = response.headers.get('location');
            if (loc) {
                try {
                    const parsedLoc = new URL(loc);
                    const nextParam = parsedLoc.searchParams.get('next');
                    if (nextParam) {
                        return decodeURIComponent(nextParam);
                    }
                } catch(e) {}
                return loc;
            }
        }
        return shortUrl;
    } catch(e) {
        return shortUrl;
    }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    let url = searchParams.get("url");

    if (!url) {
        return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    try {
        let isFacebook = url.includes("facebook.com") || url.includes("fb.watch");
        let isYoutube = url.includes("youtube.com") || url.includes("youtu.be");

        if (!isFacebook && !isYoutube) {
             return NextResponse.json({ error: "Unsupported URL type. Only YouTube and Facebook are supported." }, { status: 400 });
        }

        if (isFacebook && url.includes("fb.watch")) {
            url = await expandUrl(url);
        }

        if (isYoutube) {
            try {
                const info = await btch.youtube(url);
                if (info && info.status) {
                    const formats = [];
                    if (info.mp4) formats.push({ quality: "MP4 Video", url: info.mp4, type: "video" });
                    if (info.mp3) formats.push({ quality: "MP3 Audio", url: info.mp3, type: "audio" });
                    
                    if (formats.length > 0) {
                        return NextResponse.json({
                            title: info.title || "YouTube Video",
                            author: info.author || "YouTube Creator",
                            thumbnail: info.thumbnail || "",
                            formats: formats
                        });
                    }
                }
            } catch (e: any) {
                console.error("btch.youtube error", e);
            }
        }

        if (isFacebook) {
             try {
                const info = await btch.fbdown(url);
                if (info && info.status) {
                    const formats = [];
                    if (info.HD) formats.push({ quality: "HD Video", url: info.HD, type: "video" });
                    if (info.Normal_video) formats.push({ quality: "SD Video", url: info.Normal_video, type: "video" });
                    
                    if (formats.length > 0) {
                        return NextResponse.json({
                            title: "Facebook Video",
                            author: "Facebook User",
                            thumbnail: "",
                            formats: formats
                        });
                    }
                }
             } catch(e: any) {
                 console.error("btch.fbdown error", e);
             }
        }
        
        // Final ultimate fallback if both fail (always for YouTube now as secure widget)
        const fallbackFormats = [
            { quality: "1080p (Full HD MP4)", url: `https://loader.to/api/button/?url=${encodeURIComponent(url)}&f=1080`, type: "video", isFallback: true },
            { quality: "720p (HD MP4)", url: `https://loader.to/api/button/?url=${encodeURIComponent(url)}&f=720`, type: "video", isFallback: true },
            { quality: "480p (MP4)", url: `https://loader.to/api/button/?url=${encodeURIComponent(url)}&f=480`, type: "video", isFallback: true },
            { quality: "360p (MP4)", url: `https://loader.to/api/button/?url=${encodeURIComponent(url)}&f=360`, type: "video", isFallback: true },
            { quality: "MP3 Audio (320kbps)", url: `https://loader.to/api/button/?url=${encodeURIComponent(url)}&f=mp3`, type: "audio", isFallback: true },
            { quality: "M4A Audio (128kbps)", url: `https://loader.to/api/button/?url=${encodeURIComponent(url)}&f=m4a`, type: "audio", isFallback: true }
        ];

        return NextResponse.json({
            fallbackToIframe: true,
            title: isFacebook ? "Facebook Video Player" : "YouTube Video Player",
            author: isFacebook ? "Facebook User" : "Unknown Creator",
            thumbnail: "",
            url: url,
            formats: fallbackFormats,
            error: isFacebook ? "Provide full URL if short URL failed." : "Used native fallback due to downloader error."
        });
        
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Extraction failed" }, { status: 500 });
    }
}
