# Fahi Videos 2.5V Agent Rules

When using the **fahi-videos** plugin tools, always adhere to the following principles:

## 1. 100% Free Core Tier Guarantee
- All core tools (`fahi_generate_bangla_tts`, `fahi_extract_media_info`, `fahi_capcut_editor_blueprint`, `fahi_synthesize_studio_sfx`, `fahi_build_ugc_storyboard`, `fahi_generate_srt_subtitles`, `fahi_translate_and_adapt_scene`, `fahi_crm_leads`) are 100% free-first and operate without requiring external paid API keys.
- Never ask the user for an API key to perform social media downloads, voiceover generation, or CapCut blueprints.

## 2. Voiceover Dubbing (Kotha Studio)
- When invoking `fahi_generate_bangla_tts`:
  - `voiceName: "Kore"`: Female, clear, warm, engaging (ideal for e-commerce, tutorials, and lifestyle).
  - `voiceName: "Puck"`: Youthful, energetic, upbeat (ideal for reels, hype UGC ads, and gaming).
  - `voiceName: "Charon"`: Deep, authoritative, formal (ideal for documentaries and corporate explainers).
  - `voiceName: "Zephyr"`: Calm, smooth, storytelling (ideal for audiobooks and relaxing narration).
- Always ensure Bengali text provided to `text` uses standard Bengali script with proper spacing.

## 3. Universal Media Downloader
- For `fahi_extract_media_info`:
  - Accepts URLs from **YouTube** (`youtube.com`, `youtu.be`), **Facebook** (`facebook.com`, `fb.watch`), **Instagram Reels** (`instagram.com/reel/`, `instagram.com/p/`), and **TikTok** (`tiktok.com/@.../video/...`).
  - Prioritize the highest available progressive MP4 stream with audio (1080p, 720p).

## 4. CapCut Pro Timeline Blueprints
- When computing video timelines (`fahi_capcut_editor_blueprint`):
  - Always enforce `00:00:00:00` SMPTE standard left-aligned timecodes.
  - Set aspect ratios appropriately: `9:16` for mobile vertical reels/shorts, `16:9` for YouTube landscape, `1:1` for square social feeds.
