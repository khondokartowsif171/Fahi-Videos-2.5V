// Web Audio API Procedural Sound Engine for Google Flow / Aura Studio
// Provides 4 cinematic real-time soundscapes that accompany video playback without external audio files.

class FlowAudioEngine {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private currentPreset: 'drone' | 'rain' | 'cyberpunk' | 'noir' = 'drone';
  private masterGain: GainNode | null = null;
  private activeNodes: (AudioNode | number)[] = [];

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(val: number) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1, val)), this.ctx.currentTime, 0.05);
    }
  }

  public setPreset(preset: 'drone' | 'rain' | 'cyberpunk' | 'noir') {
    this.currentPreset = preset;
    if (this.isPlaying) {
      this.stop();
      this.play(preset);
    }
  }

  public getPreset() {
    return this.currentPreset;
  }

  public getIsPlaying() {
    return this.isPlaying;
  }

  public play(preset?: 'drone' | 'rain' | 'cyberpunk' | 'noir') {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;
    if (preset) this.currentPreset = preset;

    this.stop();
    this.isPlaying = true;

    const t = this.ctx.currentTime;

    switch (this.currentPreset) {
      case 'drone':
        this.startDeepDrone(t);
        break;
      case 'rain':
        this.startRainAtmos(t);
        break;
      case 'cyberpunk':
        this.startCyberpunkPulse(t);
        break;
      case 'noir':
        this.startFilmNoir(t);
        break;
    }
  }

  public stop() {
    this.activeNodes.forEach(node => {
      try {
        if (typeof node === 'number') {
          window.clearInterval(node);
        } else if ('stop' in node && typeof (node as any).stop === 'function') {
          (node as any).stop();
          (node as any).disconnect();
        } else if ('disconnect' in node) {
          (node as any).disconnect();
        }
      } catch (e) {
        // Safe disconnect
      }
    });
    this.activeNodes = [];
    this.isPlaying = false;
  }

  // 1. Deep Cinematic Sub Drone
  private startDeepDrone(t: number) {
    if (!this.ctx || !this.masterGain) return;

    // Sub-bass sine
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(55, t); // A1 note
    const gain1 = this.ctx.createGain();
    gain1.gain.setValueAtTime(0.4, t);
    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(t);
    this.activeNodes.push(osc1, gain1);

    // Warm fifth harmonic
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(82.4, t); // E2 note
    const filter2 = this.ctx.createBiquadFilter();
    filter2.type = 'lowpass';
    filter2.frequency.setValueAtTime(140, t);
    const gain2 = this.ctx.createGain();
    gain2.gain.setValueAtTime(0.2, t);
    osc2.connect(filter2);
    filter2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(t);
    this.activeNodes.push(osc2, filter2, gain2);
  }

  // 2. Rainy Noir Atmosphere (Pink/Brown noise filter)
  private startRainAtmos(t: number) {
    if (!this.ctx || !this.masterGain) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      output[i] = (b0 + b1 + b2 + white * 0.5362) * 0.11;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(850, t);
    filter.Q.setValueAtTime(0.8, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, t);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    whiteNoise.start(t);
    this.activeNodes.push(whiteNoise, filter, gain);
  }

  // 3. Cyberpunk Pulse
  private startCyberpunkPulse(t: number) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(65.4, t); // C2

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, t);
    filter.Q.setValueAtTime(3.5, t);

    // LFO to modulate filter
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(1.2, t); // 1.2 Hz pulse
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(120, t);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, t);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    lfo.start(t);
    this.activeNodes.push(osc, filter, lfo, lfoGain, gain);
  }

  // 4. Ethereal Film Noir Ambient Chords
  private startFilmNoir(t: number) {
    if (!this.ctx || !this.masterGain) return;

    const freqs = [110, 130.81, 164.81]; // A minor triad
    freqs.forEach(freq => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(350, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.12, t);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      this.activeNodes.push(osc, filter, gain);
    });
  }
}

export const flowAudio = new FlowAudioEngine();
