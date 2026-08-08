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

    if (!operationName) {
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

    // Fetch the video file (could be standard external assets or Google Cloud storage URI)
    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };
    if (!operationName.startsWith("fallback-op-")) {
      headers["x-goog-api-key"] = process.env.GEMINI_API_KEY || "";
    }

    const videoRes = await fetch(uri, { headers });

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
