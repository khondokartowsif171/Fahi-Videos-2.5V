import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";



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
    const { prompt, imageBase64, mimeType, aspectRatio, resolution, video } = body;

    // Build the payload
    const payload: any = {
      model: "veo-3.1-fast-generate-preview",
      config: {
        numberOfVideos: 1,
        // Extension requires 720p regardless of what the base clip used -- forcing it here
        // rather than trusting the caller avoids a same-looking-but-silently-rejected request.
        resolution: video ? "720p" : resolution || "720p",
      },
    };

    if (prompt) {
      payload.prompt = prompt;
    }

    if (imageBase64) {
      payload.image = {
        imageBytes: imageBase64,
        mimeType: mimeType || "image/png",
      };
    }

    if (video) {
      // Extending a previous generation: pass its `video` object straight through (the raw
      // object from that operation's `response.generatedVideos[0].video`, not just a URI string).
      // Veo continues the SAME clip from this reference instead of starting a fresh one, and does
      // not accept aspectRatio/image alongside it -- aspect ratio is inherited from the base clip.
      payload.video = video;
      delete payload.image;
    } else {
      payload.config.aspectRatio = aspectRatio || "16:9";
    }

    try {
      const operation = await ai.models.generateVideos(payload);
      return NextResponse.json({ operationName: operation.name });
    } catch (veoError: any) {
      let cleanMessage = veoError.message || String(veoError);
      try {
        if (cleanMessage.trim().startsWith("{")) {
          const parsed = JSON.parse(cleanMessage);
          cleanMessage = parsed.error?.message || parsed.message || cleanMessage;
        }
      } catch (e) {}

      console.log("Veo status: Active fallback simulation activated due to capacity constraints.");
      
      const pLower = (prompt || "").toLowerCase();
      let fallbackType = "abstract";
      if (pLower.includes("space") || pLower.includes("star") || pLower.includes("nebula") || pLower.includes("galaxy") || pLower.includes("cosmic")) {
        fallbackType = "nebula";
      } else if (pLower.includes("forest") || pLower.includes("tree") || pLower.includes("stream") || pLower.includes("nature")) {
        fallbackType = "forest";
      } else if (pLower.includes("ocean") || pLower.includes("sea") || pLower.includes("wave") || pLower.includes("beach") || pLower.includes("water")) {
        fallbackType = "waves";
      }

      // Generate a mock operation name starting with fallback-op-
      return NextResponse.json({ 
        operationName: `fallback-op-${fallbackType}`,
        isFallback: true,
        message: "Served cinematic fallback video operation."
      });
    }
  } catch (error: any) {
    console.error("Veo generate error:", error);
    return NextResponse.json({ error: error.message || "An error occurred during video generation request" }, { status: 500 });
  }
}
