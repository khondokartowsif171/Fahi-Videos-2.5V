import { GoogleGenAI, GenerateVideosOperation } from "@google/genai";
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
    const { operationName } = body;

    if (!operationName) {
      return NextResponse.json({ error: "operationName is required" }, { status: 400 });
    }

    // Handle cinematic fallback operation
    if (operationName.startsWith("fallback-op-")) {
      return NextResponse.json({
        done: true,
        response: {
          generatedVideos: [
            {
              video: {
                uri: `https://mock-veo.api/videos/${operationName}`
              }
            }
          ]
        },
        isFallback: true
      });
    }

    const op = new GenerateVideosOperation();
    op.name = operationName;

    const updated = await ai.operations.getVideosOperation({ operation: op });

    return NextResponse.json({ done: updated.done, response: updated.response });
  } catch (error: any) {
    console.error("Veo status check error:", error);
    return NextResponse.json({ error: error.message || "An error occurred checking status" }, { status: 500 });
  }
}
