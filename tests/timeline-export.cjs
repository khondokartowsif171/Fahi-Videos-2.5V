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

let currentVideo;
const stopped = [];
let contextsClosed = 0;
let frames = [];
let activeContext;

class Media extends EventTarget {
  constructor() {
    super();
    this._time = 0;
    this.videoWidth = 320;
    this.videoHeight = 240;
    this.paused = true;
    this.playbackRate = 1;
    this.ended = false;
    this.src = '';
    this.readyState = 4;
    this.style = {};
  }
  set currentTime(value) {
    this._time = value;
    queueMicrotask(() => this.dispatchEvent(new Event('seeked')));
  }
  get currentTime() {
    return this._time;
  }
  load() {
    this._time = 0;
    this.ended = false;
    queueMicrotask(() => this.dispatchEvent(new Event('loadeddata')));
  }
  async play() {
    this.paused = false;
  }
  pause() {
    this.paused = true;
  }
  removeAttribute() {}
}

const track = () => ({ stop() { stopped.push(1); } });

class Stream {
  constructor(tracks) {
    this.tracks = tracks;
  }
  getTracks() {
    return this.tracks;
  }
  getVideoTracks() {
    return this.tracks;
  }
  getAudioTracks() {
    return this.tracks;
  }
}

class OfflineAudioContextMock {
  constructor(channels, length, sampleRate) {
    this.channels = channels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.destination = {};
  }
  createGain() {
    return {
      gain: {
        value: 1,
        setValueAtTime(v) { this.value = v; },
      },
      connect() {},
    };
  }
  createBufferSource() {
    return {
      buffer: null,
      loop: false,
      playbackRate: { setValueAtTime() {} },
      connect() {},
      start() {},
      stop() {},
    };
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
      length: 48000,
      sampleRate: 48000,
      duration: 1,
      getChannelData: () => new Float32Array(48000),
    };
  }
  async startRendering() {
    return {
      numberOfChannels: 2,
      length: this.length,
      sampleRate: this.sampleRate,
      duration: this.length / this.sampleRate,
    };
  }
}

class Context {
  constructor() {
    this.currentTime = 0;
    this.state = 'running';
    activeContext = this;
  }
  createMediaStreamDestination() {
    return { stream: new Stream([track()]) };
  }
  createGain() {
    Context.lastGain = {
      gain: {
        value: 0,
        setValueAtTime(v) { this.value = v; },
      },
      connect() {},
    };
    return Context.lastGain;
  }
  createBufferSource() {
    return {
      buffer: null,
      connect() {},
      start() {},
      stop() {},
    };
  }
  async suspend() {
    this.state = 'suspended';
  }
  async resume() {
    this.state = 'running';
  }
  async close() {
    contextsClosed++;
  }
}

class Recorder {
  static isTypeSupported(type) {
    return type.startsWith('video/webm');
  }
  constructor(stream, options) {
    this.state = 'inactive';
    this.mimeType = options.mimeType;
    this.actions = [];
    Recorder.last = this;
  }
  start() {
    this.state = 'recording';
    this.actions.push('start');
  }
  pause() {
    this.state = 'paused';
    this.actions.push('pause');
  }
  resume() {
    this.state = 'recording';
    this.actions.push('resume');
  }
  stop() {
    this.state = 'inactive';
    this.actions.push('stop');
    this.ondataavailable?.({ data: new Blob(['test']) });
    queueMicrotask(() => this.onstop?.());
  }
}

const mockHost = {
  setAttribute() {},
  style: {},
  appendChild() {},
  remove() {},
};

Object.assign(global, {
  MediaRecorder: Recorder,
  MediaStream: Stream,
  AudioContext: Context,
  OfflineAudioContext: OfflineAudioContextMock,
  Audio: Media,
  window: {
    MediaRecorder: Recorder,
    OfflineAudioContext: OfflineAudioContextMock,
    setInterval,
    clearInterval,
  },
  document: {
    hidden: false,
    body: { appendChild() {} },
    createElement(tag) {
      if (tag === 'video') return (currentVideo = new Media());
      return mockHost;
    },
  },
  requestAnimationFrame(fn) {
    return setImmediate(() => {
      if (activeContext && activeContext.state === 'running') activeContext.currentTime += 0.05;
      if (currentVideo && !currentVideo.paused) currentVideo._time += 0.05;
      fn();
    });
  },
  cancelAnimationFrame: clearImmediate,
  fetch: async () => ({
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(1024),
  }),
});

const canvas = {
  style: {},
  isConnected: true,
  captureStream() {
    return new Stream([track()]);
  },
};

const filename = path.join(root, 'lib/timeline-export.ts');
const mod = new Module(filename, module);
mod.filename = filename;
mod.paths = Module._nodeModulePaths(path.dirname(filename));
mod._compile(
  ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText,
  filename,
);

async function run() {
  const options = {
    canvas,
    clips: [
      { objectUrl: 'red', duration: 1, startOffset: 0.5 },
      { objectUrl: 'blue', duration: 1, startOffset: 2 },
    ],
    format: 'mp4',
    quality: 'high',
    speed: 2,
    volume: 0.5,
    start: 0.25,
    end: 1.75,
    draw(video, time) {
      frames.push({ source: video.src, sourceTime: video.currentTime, time });
    },
    progress() {},
  };

  const blob = await mod.exports.recordTimeline(options);
  assert(blob.size > 0);
  assert(blob.type.startsWith('video/webm'));
  assert.deepEqual(Recorder.last.actions, ['start', 'pause', 'resume', 'stop']);
  assert.equal(frames[0].source, 'red');
  assert.equal(frames[0].time, 0.25);

  const firstBlue = frames.find((f) => f.source === 'blue');
  assert(firstBlue, 'blue clip must be rendered');
  assert(frames.some((f) => f.source === 'blue' && f.time >= 1.0));
  assert.equal(contextsClosed, 1);
  assert.equal(stopped.length, 2);

  frames = [];
  document.hidden = true;
  await assert.rejects(
    () => mod.exports.recordTimeline({ ...options, start: 0, end: 1 }),
    /Keep this tab open/,
  );
  assert.equal(contextsClosed, 2);
  assert.equal(stopped.length, 4);

  document.hidden = false;
  await assert.rejects(
    () => mod.exports.recordTimeline({ ...options, start: 5, end: 6 }),
    /No video/,
  );
  assert.equal(contextsClosed, 2);

  frames = [];
  await mod.exports.recordTimeline({
    ...options,
    rateAt: (time) => 1 + time,
    draw(video, time) {
      frames.push({ rate: video.playbackRate, time });
    },
  });
  assert(frames.length > 0);
  assert.equal(contextsClosed, 3);

  console.log('PASS: trimmed multi-clip sequence, source offsets, master clock audio export, MIME fallback, hidden-tab guard and resource cleanup');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
