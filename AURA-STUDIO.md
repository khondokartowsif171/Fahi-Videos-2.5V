# Aura Studio in Fahi Videos

The previous Flow AI Lab tab is replaced by the Aura Studio UI from the supplied image-to-video project. It runs inside Next.js; no separate Vite or Express server is required. Existing downloader, video editor and thumbnail editor remain available.

## Run

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env.local` and configure `GEMINI_API_KEY`, or enter your personal Gemini key in Fahi's API Settings / Aura Studio settings. Veo requires billing enabled and model access.
3. Install FFmpeg and ensure `ffmpeg` is on PATH, or set `FFMPEG_PATH` to the executable. FFmpeg mixes Bengali voiceover into exported MP4 files. A video without additional audio downloads directly.
4. Run `npm run dev`, open the app and choose **Aura Studio**.

## Features

- Animate one image with Veo; generate a transition constrained by first and last image frames.
- Poll persistent render jobs, stream/download generated videos with the same key used for generation.
- Extend Veo-generated video by the provider's supported continuation. The returned full video replaces the previous take to avoid duplicating its original portion.
- Create/edit images, generate storyboard images, optimize cinematography prompts, and consult the text AI Director. Microphone dictation uses browser speech recognition where available.
- Generate Bengali UGC scripts and playable 24 kHz mono WAV voiceovers; preview voiceover with video and include it in MP4 export.
- Save studio key/aspect ratio settings and preserve an active session while switching Fahi tabs.
- Add actual customer leads to a local persistent pipeline. No sample customers or simulated calls are seeded.
- Optional Twilio calling with actual call status and hangup. Configure your own deployed `TWILIO_VOICE_WEBHOOK_URL`; the app does not pretend browser speech is a phone conversation.

## Deployment

Use a Node.js host with persistent writable `AURA_DATA_DIR` and FFmpeg for exports. Ephemeral/serverless filesystem deployments require moving job and lead persistence to a durable database/object store. This studio is designed for the existing personal/local Fahi app; client identifiers isolate records but are not an account authentication system. Restrict access to a hosted server using shared server credentials, particularly telephony and paid AI endpoints.

Model IDs can be overridden through environment variables. Quota, billing, safety-filter and model-access failures are returned as errors. Stock media is not substituted for an unsuccessful Aura generation. Extension duration and generative motion are subject to the provider's capabilities.

API routes are namespaced at `/api/aura/*`. Older `/api/gemini/*` routes remain for the existing video editor and mobile app.

## Verification

`npm run typecheck`, `npm run test:aura`, and `npm run build` validate the integration. Tests mock Gemini responses; they exercise key propagation, ownership boundaries, persistent job polling, input validation, WAV wrapping, and lead storage without spending AI credits or placing calls. Real generation and telephony require configured provider credentials.

References: [Veo generation, frame constraints and extension](https://ai.google.dev/gemini-api/docs/veo), [image generation](https://ai.google.dev/gemini-api/docs/image-generation), [speech generation](https://ai.google.dev/gemini-api/docs/speech-generation).
