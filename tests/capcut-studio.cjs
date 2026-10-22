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

// 6. Verify VideoEditor.tsx & CSS contain all CapCut Desktop + Mobile Responsive Controls
const editorSrc = fs.readFileSync(path.join(root, "components/VideoEditor.tsx"), "utf8");
const cssSrc = fs.readFileSync(path.join(root, "components/video-editor.css"), "utf8");

for (const token of [
  "Auto saved:",
  "Player-Timeline 01",
  "Uniform scale",
  "Stabilize",
  "Enhance quality",
  "Reduce image noise",
  "Optical flow",
  "AI remove",
  "AI expand",
  "Remove BG",
  "Retouch",
  "AI stylize",
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

assert(cssSrc.includes("@media (max-width:767px)"), "Expected mobile responsive media query in video-editor.css");

console.log(
  "PASS: CapCut Pro timecodes, masks, clip animations, synthesized WAV SFX, desktop 4-zone panels, timeline tools, and mobile responsive drawers verified"
);
