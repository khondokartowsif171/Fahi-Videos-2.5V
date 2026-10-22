const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const root = path.resolve(__dirname, '..');
const ts = require(path.join(root, 'node_modules/typescript'));

require.extensions['.ts'] = (loaded, file) =>
  loaded._compile(
    ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
    }).outputText,
    file,
  );

// Mock browser Web Audio API for Node.js
class OfflineAudioContextMock {
  constructor(channels, length, sampleRate) {
    this.channels = channels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.destination = {};
    this.scheduledSources = [];
  }
  createGain() {
    return {
      gain: {
        value: 1,
        setValueAtTime(v, t) {
          this.value = v;
        },
      },
      connect() {},
    };
  }
  createBufferSource() {
    const src = {
      buffer: null,
      loop: false,
      playbackRate: { setValueAtTime() {} },
      connect() {},
      start: (when, offset, duration) => {
        src.when = when;
        src.offset = offset;
        src.duration = duration;
      },
      stop() {},
    };
    this.scheduledSources.push(src);
    return src;
  }
  createBuffer(ch, len, sr) {
    return {
      numberOfChannels: ch,
      length: len,
      sampleRate: sr,
      duration: len / sr,
      getChannelData: () => new Float32Array(len),
    };
  }
  async decodeAudioData() {
    return {
      numberOfChannels: 2,
      length: 48000 * 5,
      sampleRate: 48000,
      duration: 5,
      getChannelData: () => new Float32Array(48000 * 5),
    };
  }
  async startRendering() {
    return {
      numberOfChannels: this.channels,
      length: this.length,
      sampleRate: this.sampleRate,
      duration: this.length / this.sampleRate,
    };
  }
}

Object.assign(global, {
  OfflineAudioContext: OfflineAudioContextMock,
  window: { OfflineAudioContext: OfflineAudioContextMock },
  fetch: async () => ({
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(1024),
  }),
});

const filename = path.join(root, 'lib/export-audio.ts');
const mod = new Module(filename, module);
mod.filename = filename;
mod.paths = Module._nodeModulePaths(path.dirname(filename));
mod._compile(
  ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText,
  filename,
);

const { buildTimeMap, renderExportMix, clearAudioBufferCache } = mod.exports;

async function run() {
  console.log('Testing buildTimeMap...');

  // 1. Constant speed 1x
  {
    const map = buildTimeMap(0, 10, undefined, 1);
    assert(Math.abs(map.outputDuration - 10) < 0.001, '1x speed output duration should be 10s');
    assert(Math.abs(map.toOutput(5) - 5) < 0.01, '1x toOutput(5) should be 5s');
    assert(Math.abs(map.toTimeline(5) - 5) < 0.01, '1x toTimeline(5) should be 5s');
    assert.equal(map.toOutput(0), 0);
    assert.equal(map.toOutput(10), map.outputDuration);
  }

  // 2. Constant speed 2x
  {
    const map = buildTimeMap(0, 10, undefined, 2);
    assert(Math.abs(map.outputDuration - 5) < 0.001, '2x speed output duration should be 5s');
    assert(Math.abs(map.toOutput(4) - 2) < 0.01, '2x toOutput(4) should be 2s');
    assert(Math.abs(map.toTimeline(2) - 4) < 0.01, '2x toTimeline(2) should be 4s');
  }

  // 3. Variable speed curve round-trip
  {
    const map = buildTimeMap(1, 6, (t) => 1 + 0.5 * t);
    assert(map.outputDuration > 0, 'outputDuration should be positive');
    for (let t = 1; t <= 6; t += 0.5) {
      const out = map.toOutput(t);
      const back = map.toTimeline(out);
      assert(Math.abs(back - t) < 0.02, `Round trip failed for t=${t}: got ${back}`);
    }
  }

  console.log('Testing renderExportMix with audio layers & splits...');

  // 4. Offline mix rendering with split audio layers
  {
    clearAudioBufferCache();
    const progressCalls = [];
    const layer1 = {
      id: 'layer-1',
      name: 'voiceover-part-1',
      url: 'blob:mock-voice-1',
      duration: 10,
      start: 0,
      trimStart: 0,
      trimEnd: 5, // 5s segment
      volume: 1,
      fadeIn: 0.1,
      fadeOut: 0.1,
      muted: false,
      peaks: [],
    };

    // User split audio, cut out 2 seconds, and continued with layer2
    const layer2 = {
      id: 'layer-2',
      name: 'voiceover-part-2',
      url: 'blob:mock-voice-1', // same source url, different trim
      duration: 10,
      start: 7, // starts at 7s on timeline (2s gap)
      trimStart: 5,
      trimEnd: 10, // 5s segment
      volume: 0.8,
      fadeIn: 0,
      fadeOut: 0.2,
      muted: false,
      peaks: [],
    };

    const res = await renderExportMix({
      clips: [{ objectUrl: 'blob:video-1', duration: 15 }],
      audioLayers: [layer1, layer2],
      volume: 1,
      speed: 1,
      start: 0,
      end: 15,
      progress: (p) => progressCalls.push(p),
    });

    assert(res.audioBuffer, 'Rendered audio buffer must exist');
    assert.equal(res.audioBuffer.sampleRate, 48000, 'Sample rate must be 48000');
    assert.equal(res.audioBuffer.numberOfChannels, 2, 'Must be stereo (2 channels)');
    assert(progressCalls.length > 0, 'Progress must be reported');
    assert.equal(progressCalls[progressCalls.length - 1], 10, 'Final audio pre-mix progress must be 10');
  }

  console.log('PASS: buildTimeMap speed integration, round-trips, split audio layer offsets and OfflineAudioContext mix');
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
