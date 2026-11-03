# 🎬 Fahi Videos 2.5V — Professional Free Core Video Studio & World-Class MCP Connector

> **All-in-one browser video creation, Bangladeshi Bengali voiceover dubbing, multi-platform media downloader, and 100% Free-First Model Context Protocol (MCP) server for AI agents.**

Live Web App: **[https://fahi-videos.auraajenticai.cloud](https://fahi-videos.auraajenticai.cloud)**  
Live MCP Endpoint: **`https://fahi-videos.auraajenticai.cloud/api/mcp`**

---

## 🚀 Key Features (100% Free Tier Guaranteed)

- **🎙️ Kotha Studio (কণ্ঠধ্বনি)**: Bangladeshi Bengali voiceover dubbing with 4 prebuilt personas (`Kore`, `Puck`, `Charon`, `Zephyr`), 3-tier speech engine (Free Neural Bangla Stream + 24kHz synthesized WAV fallback + optional Gemini TTS), and 64-entry FIFO bounded cache.
- **📥 Universal Media Downloader**: 100% free multi-engine stream extraction for **YouTube, Facebook, Instagram Reels, and TikTok** with 1080p/720p/MP3 stream fallback.
- **✂️ CapCut Pro Video Studio**: Browser-based NLE video editing with left-aligned `00:00:00:00` timeline, precision clip trimming (`minIn`/`maxOut`), keyframe easing, CSS mask shapes, HSL/Curves color grading, and `.SRT` subtitle rendering.
- **☁️ Cloud Project Sync**: Cross-device project sync and Google / email authentication for creators, with automatic offline draft recovery.

- **🤖 World-Class MCP Connector (`/api/mcp`)**: 10 free-first MCP tools, 4 studio resources, 3 prompts, and a zero-dependency stdio bridge for Claude Desktop, Cursor, Windsurf, Cline, and Antigravity.

---

## 🤖 World-Class Model Context Protocol (MCP) Connector

Fahi Videos 2.5V implements the official [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) specification (protocols `2024-11-05` and `2025-03-26`), enabling AI agents to programmatically control video production, generate Bengali voiceovers, build UGC ads, and extract media streams.

### 🛠️ The 10 MCP Tools

| Tool Name | Description | Key Arguments |
|:---|:---|:---|
| `fahi_generate_bangla_tts` | Generate natural Bengali voiceovers (WAV/MP3 base64) with 3-tier fallback. | `text`, `voiceName`, `durationSec` |
| `fahi_build_ugc_storyboard` | Build multi-scene e-commerce UGC storyboard with scripts, Banglish guides, and SRT. | `productName`, `category`, `offerPriceBn`, `tone` |
| `fahi_translate_and_adapt_scene` | Translate & culturally adapt English video narration into localized Bengali. | `englishText`, `targetTone`, `targetAudience` |
| `fahi_generate_srt_subtitles` | Generate formatted, timed `.SRT` subtitles for Bengali narration. | `text`, `durationSec`, `wordsPerSubtitle` |
| `fahi_extract_media_info` | Free stream extraction for YouTube, Facebook, Instagram, and TikTok links. | `url` |
| `fahi_capcut_editor_blueprint` | Compute CapCut Pro timeline blueprints, splits, keyframes, transitions, and masks. | `projectTitle`, `aspectRatio`, `maskShape`, `animIn` |
| `fahi_synthesize_studio_sfx` | Generate pure studio 16-bit WAV sound effects (whoosh, pop, click, riser). | `sfxId` (`whoosh`, `pop`, `click`, `riser`, etc.) |
| `fahi_enhance_cinematic_prompt` | Transform raw concepts into cinematic Bangladesh-aware video/image prompts. | `prompt`, `mood`, `visualStyle`, `lighting` |
| `fahi_generate_image` | Generate cinematic visual scenes or thumbnails with free fallback. | `prompt`, `aspectRatio` |
| `fahi_crm_leads` | Query, filter, and capture customer orders and CRM leads. | `action` (`list`, `capture`, `stats`), `name`, `phone` |

### 📚 Studio Resources (`resources/list` & `resources/read`)

1. `fahi://studio/capabilities`: Real-time manifest of available engines and limits.
2. `fahi://voices/bangla-personas`: Bengali voice persona descriptions and tonal use cases.
3. `fahi://presets/capcut-blueprints`: CapCut aspect ratios, animations, and CSS mask shapes.
4. `fahi://presets/ecommerce-categories`: UGC marketing structures for fashion, gadgets, food, skincare, etc.

### 💡 Studio Prompts (`prompts/list` & `prompts/get`)

1. `bangla-ecommerce-ugc-campaign`: End-to-end multi-scene e-commerce ad creation.
2. `free-yt-fb-insta-to-bangla-reel`: Convert any social video into a localized Bengali short/reel.
3. `cinematic-bangladesh-veo-director`: Cinematic video direction prompt.

---

## 🔌 AI Client Setup (Claude Desktop, Cursor, Windsurf)

### 1. Claude Desktop Setup

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "fahi-videos": {
      "command": "node",
      "args": ["./mcp-stdio-bridge.mjs"],
      "env": {
        "FAHI_MCP_URL": "https://fahi-videos.auraajenticai.cloud/api/mcp"
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
    "fahi-videos": {
      "url": "https://fahi-videos.auraajenticai.cloud/api/mcp"
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

Proprietary © 2026 Fahi Videos & Aura Agentic AI Cloud. All rights reserved.
