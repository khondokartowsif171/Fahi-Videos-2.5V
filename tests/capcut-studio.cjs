const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");

const root = path.resolve(__dirname, "..");
const ts = require(path.join(root, "node_modules/typescript"));

function loadTsModule(relPath) {
  const filename = path.join(root, relPath);
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    },
  }).outputText;
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  mod._compile(compiled, filename);
  return mod.exports;
}

const {
  formatCapCutTimecode,
  getMaskClipPath,
  applyCanvasMask,
  computeClipAnimation,
  synthesizeCapCutSfxWav,
} = loadTsModule("lib/capcut-studio-tools.ts");

// 1. Test CapCut Timecode Formatting (HH:MM:SS:FF at 30fps)
assert.equal(formatCapCutTimecode(0), "00:00:00:00");
assert.equal(formatCapCutTimecode(137.71), "00:02:17:21");
assert.equal(formatCapCutTimecode(187.71), "00:03:07:21");

// 2. Test CapCut Mask Clip-Path Generation
assert.equal(getMaskClipPath("none", 75, false), undefined);
assert.match(getMaskClipPath("circle", 70, false), /^circle\(35% at 50% 50%\)$/);
assert.match(getMaskClipPath("linear", 70, false), /^inset\(/);
assert.match(getMaskClipPath("mirror", 70, false), /^inset\(/);
assert.match(getMaskClipPath("rectangle", 70, false), /^inset\(/);
assert.match(getMaskClipPath("heart", 70, false), /^polygon\(/);
assert.match(getMaskClipPath("star", 70, false), /^polygon\(/);
assert.match(getMaskClipPath("circle", 70, true), /^polygon\(/);

// 3. Test Canvas 2D Mask Clipping for Video Export
const canvasOps = [];
const mockCtx = {
  beginPath() {
    canvasOps.push("beginPath");
  },
  arc() {
    canvasOps.push("arc");
  },
  rect() {
    canvasOps.push("rect");
  },
  moveTo() {
    canvasOps.push("moveTo");
  },
  lineTo() {
    canvasOps.push("lineTo");
  },
  closePath() {
    canvasOps.push("closePath");
  },
  clip() {
    canvasOps.push("clip");
  },
};
applyCanvasMask(mockCtx, 1280, 720, "circle", 80);
assert(canvasOps.includes("arc") && canvasOps.includes("clip"));

// 4. Test CapCut In / Out / Combo Clip Animation Math
const animStart = computeClipAnimation(0.2, 4.0, "fade_in", "zoom_out", "none", 0.8);
assert(animStart.opacity > 0 && animStart.opacity < 1);
const animMid = computeClipAnimation(2.0, 4.0, "fade_in", "zoom_out", "pulse", 0.8);
assert.equal(animMid.opacity, 1);
assert(animMid.scale !== 1);
const animEnd = computeClipAnimation(3.8, 4.0, "fade_in", "fade_out", "none", 0.8);
assert(animEnd.opacity > 0 && animEnd.opacity < 1);

// 5. Test Real Web Audio WAV SFX Synthesizer
for (const sfxId of ["whoosh", "riser", "bass_drop", "ding", "lofi_beat"]) {
  const file = synthesizeCapCutSfxWav(sfxId);
  assert(file.size > 2000, `Expected synthesized WAV for ${sfxId} to have non-empty PCM data`);
  assert.equal(file.type, "audio/wav");
}

// 6. Verify VideoEditor.tsx & CSS contain pure CapCut Desktop + Mobile Responsive Controls (Zero AI)
const editorSrc = fs.readFileSync(path.join(root, "components/VideoEditor.tsx"), "utf8");
const cutTimelineSrc = fs.readFileSync(path.join(root, "components/CutTimeline.tsx"), "utf8");
const studioTimelineCss = fs.readFileSync(path.join(root, "components/studio-timeline.css"), "utf8");
const cssSrc = fs.readFileSync(path.join(root, "components/video-editor.css"), "utf8");

for (const token of [
  "Auto saved:",
  "Player-Timeline 01",
  "Uniform scale",
  "Stabilize",
  "Enhance quality",
  "Reduce image noise",
  "Optical flow",
  "Remove BG",
  "Retouch",
  "Details",
  "HSL 8-Channel Mixer",
  "Parametric Tone Curve",
  "Color Wheels (Lift / Gamma / Gain)",
  "Import .SRT",
  "Export .SRT",
  "FahiVidsMarkSvg",
  "handleDeleteLeftOfPlayhead",
  "handleDeleteRightOfPlayhead",
  "handleFreezeFrame",
  "handleExtractAudioFromClip",
  "handleAddMarker",
  "fahi-left-asset-panel",
  "fahi-tool-panel",
  "fahi-editor-footer",
]) {
  assert(editorSrc.includes(token), `Expected VideoEditor.tsx to include "${token}"`);
}

// Verify Zero AI / Gemini dependencies in VideoEditor.tsx
for (const forbidden of [
  "callAi(",
  "AI remove",
  "AI expand",
  "AI stylize",
  "generate_ai",
  "dreamina",
  "Gemini Vision Frame Reader",
]) {
  assert(!editorSrc.includes(forbidden), `Expected VideoEditor.tsx NOT to include AI token "${forbidden}"`);
}

// Verify Left-Aligned 00:00 Timeline Architecture (No 50% Center Offset)
assert(cutTimelineSrc.includes("const TRACK_LEFT_PAD = 12"), "Expected CutTimeline.tsx to use left-aligned TRACK_LEFT_PAD = 12");
assert(cutTimelineSrc.includes("cut-moving-playhead"), "Expected CutTimeline.tsx to render moving playhead");
assert(cutTimelineSrc.includes("cut-clip-header-strip"), "Expected CutTimeline.tsx to render CapCut clip header strip");
assert(!studioTimelineCss.includes("left: 50%"), "Expected studio-timeline.css NOT to pin playhead at left: 50%");

// Verify Official FahiVids App Icon, Vector SVG Logo & 1-Click PWA Install files exist
for (const assetRel of [
  "public/app-icon.png",
  "public/icon-512.png",
  "public/icon-192.png",
  "public/apple-touch-icon.png",
  "public/favicon.ico",
  "public/icon.svg",
  "public/logo.svg",
  "public/sw.js",
  "components/FahiVidsLogo.tsx",
  "components/PwaInstallButton.tsx",
]) {
  const fullPath = path.join(root, assetRel);
  assert(fs.existsSync(fullPath), `Expected branding/PWA asset ${assetRel} to exist`);
  assert(fs.statSync(fullPath).size > 100, `Expected branding/PWA asset ${assetRel} to be non-empty`);
}

const navbarSrc = fs.readFileSync(path.join(root, "components/Navbar.tsx"), "utf8");
assert(navbarSrc.includes("PwaInstallButton"), "Expected Navbar.tsx to render PwaInstallButton next to Admin");

assert(cssSrc.includes("@media (max-width:767px)"), "Expected mobile responsive media query in video-editor.css");

console.log(
  "PASS: CapCut Pro left-aligned 00:00 timeline, pure zero-AI Video Studio, HSL/Curves/Wheel grading, .SRT subtitles, official App Icon & SVG Logo, and mobile responsive drawers verified"
);
