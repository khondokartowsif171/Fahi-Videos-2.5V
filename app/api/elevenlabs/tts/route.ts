import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ElevenLabs is not configured on the server" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { text, voiceId } = body;

    if (!text || !voiceId) {
      return NextResponse.json({ error: "text and voiceId are required" }, { status: 400 });
    }
    if (text.length > 5000) {
      return NextResponse.json({ error: "text is too long (max 5000 characters)" }, { status: 400 });
    }

    const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_v3",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    if (!elevenRes.ok) {
      const errText = await elevenRes.text().catch(() => "");
      console.error("ElevenLabs TTS error:", elevenRes.status, errText);
      return NextResponse.json({ error: "Voice generation failed" }, { status: 502 });
    }

    const arrayBuffer = await elevenRes.arrayBuffer();

    return new Response(arrayBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="fahi-voiceover-${Date.now()}.mp3"`,
      },
    });
  } catch (error: any) {
    console.error("TTS route error:", error);
    return NextResponse.json({ error: error.message || "An error occurred during voice generation" }, { status: 500 });
  }
}
