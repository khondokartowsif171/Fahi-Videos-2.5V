---
name: fahi-videos-mcp
description: >-
  All-in-one browser video production suite for AI agents: generate natural Bangladeshi Bengali voiceovers (WAV/MP3),
  download videos from YouTube, Facebook, Instagram Reels, and TikTok, generate CapCut NLE video timeline blueprints,
  build multi-scene UGC marketing storyboards, and synthesize pure studio audio sound effects.
---

# Fahi Videos 2.5V Skill

This skill teaches agents how to interact with the Fahi Videos MCP server (`fahi-videos-mcp`) hosted at `https://fahi-videos.auraajenticai.cloud/mcp`.

## When to Use This Skill

Activate this skill when the user wants to:
1. **Generate Bengali Speech / Voiceovers**: Dub videos, narrate stories, or generate audio ads in authentic Bangladeshi Bengali using `fahi_generate_bangla_tts`.
2. **Download Social Media Videos**: Extract downloadable MP4/MP3 streams from YouTube, Facebook, Instagram Reels, and TikTok using `fahi_extract_media_info`.
3. **Edit Videos with CapCut Blueprints**: Plan video clip splits, transitions, aspect ratios (`9:16`, `16:9`), animations, and CSS mask shapes with `fahi_capcut_editor_blueprint`.
4. **Build E-Commerce UGC Storyboards**: Create structured marketing video scenes with scripts, Banglish pronunciation guides, and discount hooks using `fahi_build_ugc_storyboard`.
5. **Generate SRT Subtitles**: Produce timed subtitle files for Bengali or multilingual narration with `fahi_generate_srt_subtitles`.
6. **Synthesize Studio SFX**: Generate 16-bit 44.1kHz WAV sound effects (whoosh, pop, click, riser) with `fahi_synthesize_studio_sfx`.
7. **Translate & Adapt Narration**: Translate English marketing scripts into localized Bengali with `fahi_translate_and_adapt_scene`.
8. **CRM Leads & Orders**: Capture, list, or inspect e-commerce customer leads with `fahi_crm_leads`.

---

## The 10 MCP Tools Reference

### 1. `fahi_generate_bangla_tts`
Generates natural Bangladeshi Bengali speech audio.
- `text` (string, required): Bengali text to speak (e.g. `"আসসালামু আলাইকুম! আমাদের অফারটি সীমিত সময়ের জন্য।"`).
- `voiceName` (string, optional): `"Kore"` (female, warm), `"Puck"` (energetic), `"Charon"` (formal), `"Zephyr"` (calm).
- `durationSec` (number, optional): Target duration in seconds.

### 2. `fahi_extract_media_info`
Extracts direct download streams from social video URLs.
- `url` (string, required): Video link (YouTube, Facebook, Instagram Reel, TikTok).
- Returns: Video title, author, thumbnail, and an array of downloadable streams (quality, format, direct URL).

### 3. `fahi_capcut_editor_blueprint`
Generates CapCut Pro timeline blueprints and editing configurations.
- `projectTitle` (string): Title of the video project.
- `aspectRatio` (string): `"9:16"` (Reels/TikTok), `"16:9"` (YouTube), `"1:1"` (Square).
- `maskShape` (string): `"none"`, `"circle"`, `"rounded-rect"`, `"star"`, `"heart"`.
- `animIn` (string): `"fade-in"`, `"zoom-in"`, `"slide-up"`, `"none"`.

### 4. `fahi_build_ugc_storyboard`
Generates multi-scene marketing video storyboard.
- `productName` (string): Name of product.
- `category` (string): `"fashion"`, `"gadget"`, `"food"`, `"skincare"`, `"general"`.
- `offerPriceBn` (string, optional): Price in Bengali (e.g. `"৯৯৯ টাকা"`).
- `tone` (string): `"hype"`, `"friendly"`, `"professional"`, `"humorous"`.

### 5. `fahi_synthesize_studio_sfx`
Synthesizes studio 16-bit WAV sound effects.
- `sfxId` (string, required): `"whoosh"`, `"pop"`, `"click"`, `"riser"`, `"ding"`, `"error"`.

### 6. `fahi_generate_srt_subtitles`
Generates timed .SRT subtitles.
- `text` (string, required): Narration text.
- `durationSec` (number, required): Total duration.
- `wordsPerSubtitle` (number, optional): Words per card (default: 4).

### 7. `fahi_translate_and_adapt_scene`
Culturally adapts English video narration to colloquial Bangladeshi Bengali.
- `englishText` (string, required): English text.
- `targetTone` (string, optional): `"engaging"`, `"formal"`, `"colloquial"`.

### 8. `fahi_enhance_cinematic_prompt`
Enhances user concepts into detailed prompts for video generation models.
- `prompt` (string, required): Base concept.
- `mood` (string): Desired emotional mood.
- `visualStyle` (string): Visual aesthetic (e.g. `"cinematic 35mm"`).

### 9. `fahi_generate_image`
Generates visual scene images or YouTube thumbnails.
- `prompt` (string, required): Image prompt.
- `aspectRatio` (string, optional): `"16:9"`, `"9:16"`, `"1:1"`.

### 10. `fahi_crm_leads`
Queries or captures customer leads in Supabase CRM storage.
- `action` (string, required): `"list"`, `"capture"`, `"stats"`.
- `name` (string, optional): Customer name.
- `phone` (string, optional): Customer phone.
