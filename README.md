# 🎬 Fahi Videos 2.5V — Professional Free Core Video Studio & World-Class MCP Connector

[![mcptry](https://mcptry.com/badge/io.github.khondokartowsif171/fahi-videos-mcp)](https://mcptry.com/servers/io.github.khondokartowsif171/fahi-videos-mcp)

[![Fahi-Videos MCP server](https://mcprush.com/badge/fahi-videos-mcp/card.svg)](https://mcprush.com/to/fahi-videos-mcp?ref=badge)

> **All-in-one browser video creation, Bangladeshi Bengali voiceover dubbing, multi-platform media downloader, and 100% Free-First Model Context Protocol (MCP) server for AI agents.**

Live Web App: **[https://fahi-videos.auraajenticai.cloud](https://fahi-videos.auraajenticai.cloud)**  
Live MCP Endpoint: **`https://fahi-videos.auraajenticai.cloud/mcp`** (`v2.6.0`)  
Official Directories: **[mcprush](https://mcprush.com/khondokartowsif171/fahi-videos-mcp)** · **[mcptry (100/100)](https://mcptry.com/servers/io.github.khondokartowsif171/fahi-videos-mcp)**

---

## 🚀 Key Features (100% Free Tier Guaranteed)

- **🎙️ Kotha Studio (কণ্ঠধ্বনি)**: Bangladeshi Bengali voiceover dubbing with 4 prebuilt personas (`Kore`, `Puck`, `Charon`, `Zephyr`), 3-tier speech engine (Free Neural Bangla Stream + 24kHz synthesized WAV fallback + optional Gemini TTS), and 64-entry FIFO bounded cache.
- **📥 Universal Media Downloader**: 100% free multi-engine stream extraction for **YouTube, Facebook, Instagram Reels, and TikTok** with 1080p/720p/MP3 stream fallback.
- **✂️ CapCut Pro Video Studio**: Browser-based NLE video editing with left-aligned `00:00:00:00` timeline, precision clip trimming (`minIn`/`maxOut`), keyframe easing, CSS mask shapes, HSL/Curves color grading, and `.SRT` subtitle rendering.
- **☁️ Cloud Project Sync**: Cross-device project sync and Google / email authentication for creators, with automatic offline draft recovery.
- **🤖 World-Class MCP Connector (`/mcp`)**: 10 free-first MCP tools, 4 studio resources, 3 prompts, and a zero-dependency stdio bridge for Claude Desktop, Cursor, Windsurf, Cline, and Antigravity.

---

## 🤖 World-Class Model Context Protocol (MCP) Connector

Fahi Videos 2.5V implements the official [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) specification (`v2.6.0`, protocols `2025-06-18`, `2025-03-26`, and `2024-11-05`), enabling AI agents to programmatically control video production, generate Bengali voiceovers, build UGC ads, and extract media streams.

### 🛠️ The 10 MCP Tools

| Tool Name | Description | Key Arguments |
|:---|:---|:---|
| `fahi_generate_bangla_tts` | Generate natural Bengali voiceovers (WAV/MP3 base64) with 3-tier fallback. | `text`, `voiceName`, `durationSec` |
| `fahi_build_ugc_storyboard` | Build multi-scene e-commerce UGC storyboard with scripts, Banglish guides, and SRT. | `productName`, `category`, `offerPriceBn`, `tone` |
| `fahi_translate_and_adapt_scene` | Translate & culturally adapt an English scene summary into Dhaka-standard Bengali script. | `englishSummary`, `onScreenText`, `currentBangla`, `tone` |
| `fahi_generate_srt_subtitles` | Generate formatted `.SRT` subtitles and 30fps CapCut SMPTE timecodes for scenes. | `scenes`, `bilingual` |
| `fahi_extract_media_info` | Free multi-platform stream extraction for YouTube, Facebook, Instagram, and TikTok links. | `url` |
| `fahi_capcut_editor_blueprint` | Compute CapCut Pro timeline blueprints, 30fps timecodes, transitions, and CSS masks. | `projectTitle`, `aspectRatio`, `maskShape`, `animIn` |
| `fahi_synthesize_studio_sfx` | Synthesize pure studio 22.05kHz PCM WAV sound effects and beat loops. | `sfxId` (`whoosh`, `riser`, `bass_drop`, `ding`, `lofi_beat`) |
| `fahi_enhance_cinematic_prompt` | Transform raw concepts into cinema-grade video prompts with camera/lens/lighting rig. | `prompt`, `camera`, `lens`, `lighting`, `motionSpeed` |
| `fahi_generate_image` | Generate 1280x720 HD thumbnails and scenes with free-tier fallback. | `prompt`, `aspectRatio` |
| `fahi_crm_leads` | List pipeline leads/stats or add new customer orders in the CRM pipeline. | `action` (`list`, `add`), `customerName`, `phone`, `product` |

### 📚 Studio Resources (`resources/list` & `resources/read`)

1. `fahi://studio/capabilities`: Real-time manifest of free core modules (`kotha`, `downloader`, `editor`, `thumbnail`).
2. `fahi://kotha/voices`: Bengali voice persona directory (`Kore`, `Puck`, `Charon`, `Zephyr`), tone presets, and categories.
3. `fahi://aura/cinematography-rig`: Camera moves, prime/anamorphic lenses, lighting atmospheres, and transitions.
4. `fahi://capcut/studio-tools`: Supported CSS masks, blend modes, clip animations, and SFX presets.

### 💡 Studio Prompts (`prompts/list` & `prompts/get`)

1. `bangla-viral-ugc-campaign`: End-to-end 5-scene Bangladeshi Bengali UGC campaign workflow.
2. `free-yt-fb-insta-to-bangla-reel`: Convert any YouTube, Facebook, or Instagram Reel into a localized Bengali reel.
3. `youtube-thumbnail-and-seo-pack`: High-CTR YouTube thumbnail visual and bilingual Bengali/English SEO metadata.

---

## 🔌 AI Client Setup (Claude Desktop, Cursor, Windsurf)

### 1. Claude Desktop Setup

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "fahi-videos-mcp": {
      "command": "node",
      "args": ["./mcp-stdio-bridge.mjs"],
      "env": {
        "FAHI_MCP_URL": "https://fahi-videos.auraajenticai.cloud/mcp"
      }
    }
  }
}
```

### 2. Cursor IDE Setup

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "fahi-videos-mcp": {
      "httpUrl": "https://fahi-videos.auraajenticai.cloud/mcp"
    }
  }
}
```

### 3. Local Stdio Bridge Execution

You can run the bridge locally in any terminal:

```bash
npm run mcp:stdio
```

---

## 🧪 Verification & Automated Test Suites

Fahi Videos 2.5V includes a comprehensive test suite covering all engines:

```bash
# Run all automated test suites
npm run test:aura            # Aura Studio & Veo generation tests
npm run test:kotha           # Kotha Studio voiceover & SRT tests
npm run test:capcut          # CapCut Pro timeline & grading tests
npm run test:editor          # Timeline export & audio mix tests
npm run test:downloader      # Universal media downloader tests
npm run test:mcp             # World-Class MCP Connector test suite
npm run test:managed-worker  # Vertex AI managed queue tests

# Strict TypeScript typecheck
npm run typecheck
```

---

## 🛠️ Development & Deployment

### Prerequisites
- Node.js 18+ (tested on Node.js 20 & 25)
- npm or bun

### Local Setup
```bash
git clone https://github.com/khondokartowsif171/Fahi-Videos-2.5V.git
cd Fahi-Videos-2.5V
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📄 License

Licensed under the [Apache License 2.0](./LICENSE) © 2026 Fahi Videos & Aura Agentic AI Cloud.
