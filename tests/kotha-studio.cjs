const fs = require('fs');
const path = require('path');
const Module = require('module');
const assert = require('node:assert/strict');
const ts = require('typescript');

delete process.env.GEMINI_API_KEY;

function loadTsModule(filePath, customMocks = {}) {
  const source = fs.readFileSync(filePath, 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;

  const mod = new Module(filePath, module);
  mod.filename = filePath;
  mod.paths = module.paths;
  const nativeRequire = mod.require.bind(mod);
  mod.require = (id) => {
    if (id in customMocks) return customMocks[id];
    if (id === './kotha-dubbing-logic') {
      return loadTsModule(path.join(__dirname, '../lib/kotha-dubbing-logic.ts'));
    }
    return nativeRequire(id);
  };
  mod._compile(code, mod.filename);
  return mod.exports;
}

const dubbing = loadTsModule(path.join(__dirname, '../lib/kotha-dubbing-logic.ts'));
const {
  formatTimestamp,
  parseTimestampToSeconds,
  formatSrtTimestamp,
  generateSrtSubtitles,
  estimateBanglaSpeechDuration,
  adaptToneInBangla,
  createSynthesizedSpeechWav,
  mergeWavBuffers,
  filterScenes,
  resolveUgcStageForScene,
  buildDynamicEcommerceUgcScenes,
} = dubbing;

// 1. Unit tests from dubbingLogic.test.ts
assert.equal(formatTimestamp(0), '00:00');
assert.equal(formatTimestamp(6), '00:06');
assert.equal(formatTimestamp(69), '01:09');
assert.equal(parseTimestampToSeconds('00:06'), 6);
assert.equal(parseTimestampToSeconds('01:09'), 69);
assert.equal(parseTimestampToSeconds('01:02:03'), 3723);

assert.equal(formatSrtTimestamp(0), '00:00:00,000');
assert.equal(formatSrtTimestamp(6.5), '00:00:06,500');
assert.equal(formatSrtTimestamp(69), '00:01:09,000');

const sampleScenes = [
  {
    sceneNumber: 1,
    startTimeSec: 0,
    endTimeSec: 3,
    banglaScript: 'প্রথম দৃশ্যের বাংলা ভয়েসওভার স্ক্রিপ্ট।',
    titleEn: 'Scene 1 Intro',
  },
  {
    sceneNumber: 2,
    startTimeSec: 4,
    endTimeSec: 5,
    banglaScript: 'দ্বিতীয় দৃশ্যের বিস্তারিত উপস্থাপনা।',
    titleEn: 'Scene 2 Overview',
  },
];
const srt = generateSrtSubtitles(sampleScenes, false);
assert.ok(srt.includes('1\n00:00:00,000 --> 00:00:03,000\nপ্রথম দৃশ্যের বাংলা ভয়েসওভার স্ক্রিপ্ট।'));
assert.ok(srt.includes('2\n00:00:04,000 --> 00:00:05,000\nদ্বিতীয় দৃশ্যের বিস্তারিত উপস্থাপনা।'));

const dShort = estimateBanglaSpeechDuration('জি, স্টকে আছে।', 1.0);
const dLong = estimateBanglaSpeechDuration(
  'দেখুন কিভাবে আমাদের এআই বাংলায় কাস্টমারদের সাথে একদম মানুষের মতো চ্যাট করে এবং সাথে সাথে ইনভেন্টরি চেক করে নেয়।',
  1.0
);
const dFast = estimateBanglaSpeechDuration(
  'দেখুন কিভাবে আমাদের এআই বাংলায় কাস্টমারদের সাথে একদম মানুষের মতো চ্যাট করে এবং সাথে সাথে ইনভেন্টরি চেক করে নেয়।',
  1.25
);
assert.ok(dLong > dShort);
assert.ok(dFast < dLong);

const original = 'আমাদের এআই কাস্টমারদের মেসেজের উত্তর দেয়।';
const commercial = adaptToneInBangla('AI replies to customers', original, 'commercial');
assert.ok(commercial.endsWith('আজই শুরু করুন!'));
const explainer = adaptToneInBangla('AI replies to customers', commercial, 'explainer');
assert.ok(explainer.startsWith('চলুন দেখে নিই, '));
assert.ok(!explainer.endsWith('আজই শুরু করুন!'));

const clip1 = createSynthesizedSpeechWav('প্রথম দৃশ্য', 1.5, 200);
const clip2 = createSynthesizedSpeechWav('দ্বিতীয় দৃশ্য', 1.5, 140);
assert.ok(clip1.byteLength > 44);
assert.equal(String.fromCharCode(clip1[0], clip1[1], clip1[2], clip1[3]), 'RIFF');
assert.equal(String.fromCharCode(clip1[8], clip1[9], clip1[10], clip1[11]), 'WAVE');

const merged = mergeWavBuffers([clip1, clip2]);
const expectedPcmBytes = (clip1.byteLength - 44) + (clip2.byteLength - 44) + 12000;
assert.equal(merged.byteLength, 44 + expectedPcmBytes);
const view = new DataView(merged.buffer, merged.byteOffset, merged.byteLength);
assert.equal(view.getUint32(40, true), expectedPcmBytes);

const filterTestScenes = [
  {
    id: 's1',
    sceneNumber: 1,
    startTimeSec: 0,
    endTimeSec: 3,
    timeRangeLabel: '00:00 - 00:03',
    titleEn: 'Opening Scene',
    titleBn: 'প্রথম দৃশ্য',
    visualCaptureDescription: '',
    onScreenText: 'Opening Frame',
    englishSummary: 'Opening presentation',
    banglaScript: 'প্রথম দৃশ্যের বাংলা স্ক্রিপ্ট',
    phoneticGuide: '',
    visualType: 'dynamic-ugc-stage',
    keyMetrics: [],
    status: 'ready',
  },
  {
    id: 's2',
    sceneNumber: 2,
    startTimeSec: 6,
    endTimeSec: 11,
    timeRangeLabel: '00:06 - 00:11',
    titleEn: 'Product Demo',
    titleBn: 'দ্বিতীয় দৃশ্য',
    visualCaptureDescription: '',
    onScreenText: 'Live Demo',
    englishSummary: 'Detailed walkthrough',
    banglaScript: 'দ্বিতীয় দৃশ্যের বিস্তারিত আলোচনা',
    phoneticGuide: '',
    visualType: 'dynamic-ugc-stage',
    keyMetrics: [],
    status: 'pending',
  },
];
assert.equal(filterScenes(filterTestScenes, 'Demo', 'all').length, 1);
assert.equal(filterScenes(filterTestScenes, 'দ্বিতীয়', 'all').length, 1);
assert.equal(filterScenes(filterTestScenes, '', 'ready').length, 1);
assert.equal(filterScenes(filterTestScenes, '', 'pending').length, 1);

assert.equal(resolveUgcStageForScene(0, 5), 'hook');
assert.equal(resolveUgcStageForScene(1, 5), 'problem');
assert.equal(resolveUgcStageForScene(2, 5), 'showcase');
assert.equal(resolveUgcStageForScene(3, 5), 'social-proof');
assert.equal(resolveUgcStageForScene(4, 5), 'cta');

const ugcScenes = buildDynamicEcommerceUgcScenes([], {
  productName: 'Test Item',
  category: 'gadgets',
  offerPriceBn: '৫০০ টাকা',
  ctaTextBn: 'অর্ডার করুন',
  deliveryNoteBn: 'হোম ডেলিভারি',
  tone: 'commercial',
});
assert.equal(ugcScenes.length, 5);
assert.ok(ugcScenes[0].banglaScript.includes('Test Item'));
assert.ok(ugcScenes[4].banglaScript.includes('৫০০ টাকা'));

const pureVideoScenes = buildDynamicEcommerceUgcScenes(
  [
    { timeRangeLabel: '00:00 - 00:04', startTimeSec: 0, endTimeSec: 4 },
    { timeRangeLabel: '00:04 - 00:08', startTimeSec: 4, endTimeSec: 8 },
  ],
  {
    productName: '',
    category: '',
    offerPriceBn: '',
    ctaTextBn: '',
    deliveryNoteBn: '',
    tone: 'explainer',
  }
);
assert.equal(pureVideoScenes.length, 2);
assert.ok(!pureVideoScenes[0].banglaScript.includes('১,৪৫০'));
assert.ok(!pureVideoScenes[1].banglaScript.includes('ক্যাশ অন ডেলিভারি'));

// 2. Test 100% Free Server Endpoints (Zero API Key Required)
const { handleKotha } = loadTsModule(path.join(__dirname, '../lib/kotha-server.ts'));

(async () => {
  const healthRes = await handleKotha(
    new Request('http://localhost/api/kotha/health', { method: 'GET' }),
    ['health']
  );
  assert.equal(healthRes.status, 200);
  const healthData = await healthRes.json();
  assert.equal(healthData.status, 'ok');
  assert.equal(healthData.freeEngineReady, true);

  // Test 100% free TTS generation without any API key
  const ttsRes = await handleKotha(
    new Request('http://localhost/api/kotha/tts/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'আসসালামু আলাইকুম, এটি সম্পূর্ণ ফ্রি বাংলা ভয়েস কভার টেস্ট।',
        voiceName: 'Kore',
      }),
    }),
    ['tts', 'generate']
  );
  assert.equal(ttsRes.status, 200);
  const ttsData = await ttsRes.json();
  assert.ok(ttsData.audioBase64 && ttsData.audioBase64.length > 50);
  assert.ok(['neural-bangla-stream', 'synthesized-wav'].includes(ttsData.engine));

  // Test 100% free scene tone adaptation without any API key
  const transRes = await handleKotha(
    new Request('http://localhost/api/kotha/translate-scene', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        englishSummary: 'Opening presentation',
        currentBangla: 'আমাদের নতুন ভিডিও স্টুডিওতে স্বাগতম।',
        tone: 'commercial',
      }),
    }),
    ['translate-scene']
  );
  assert.equal(transRes.status, 200);
  const transData = await transRes.json();
  assert.ok(transData.banglaScript.includes('আজই শুরু করুন!'));

  // Test 100% free video frame analysis without any API key
  const framesRes = await handleKotha(
    new Request('http://localhost/api/kotha/analyze-frames', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        frames: [
          { timeRangeLabel: '00:00 - 00:05', startTimeSec: 0, endTimeSec: 5 },
          { timeRangeLabel: '00:05 - 00:10', startTimeSec: 5, endTimeSec: 10 },
        ],
        tone: 'commercial',
      }),
    }),
    ['analyze-frames']
  );
  assert.equal(framesRes.status, 200);
  const framesData = await framesRes.json();
  assert.equal(framesData.scenes.length, 2);
  assert.ok(framesData.scenes[0].banglaScript.length > 10);

  console.log('PASS: Kotha Studio dubbing logic, SRT subtitles, WAV synthesis, and 100% free server endpoints verified.');
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
