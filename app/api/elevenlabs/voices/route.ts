import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Curated library of ElevenLabs shared-library voices verified to speak natural Bangla
// via the eleven_v3 model. voiceId works directly against /v1/text-to-speech/{voiceId}
// without needing to be added to the account first (ElevenLabs shared voices are usable
// by voice_id directly).
const BANGLA_VOICE_LIBRARY = [
  {
    voiceId: "70QpbCWFDvTpWo8ZKOUb",
    name: "Niharika",
    gender: "female",
    tone: "Energetic, upbeat — social media / lifestyle ads",
  },
  {
    voiceId: "q4yUdydpWxqfmkQH7gK7",
    name: "Swati",
    gender: "female",
    tone: "Young, sweet — friendly product intros",
  },
  {
    voiceId: "WiaIVvI1gDL4vT4y7qUU",
    name: "Suman",
    gender: "male",
    tone: "Deep, calm — premium / trust-building brands",
  },
  {
    voiceId: "iuABfyf7pRoBzuPqzUCt",
    name: "Binod",
    gender: "male",
    tone: "Energetic — flash sales, social media",
  },
  {
    voiceId: "u3v81nA6jgD2f8PNeClc",
    name: "Khabir Bhai",
    gender: "male",
    tone: "Casual, friendly — relatable everyday brand voice",
  },
  {
    voiceId: "UVvx1ZKtcJQTxfaKdh06",
    name: "Deb",
    gender: "male",
    tone: "Dramatic narrator — storytelling / brand films",
  },
];

export async function GET() {
  return NextResponse.json({ voices: BANGLA_VOICE_LIBRARY });
}
