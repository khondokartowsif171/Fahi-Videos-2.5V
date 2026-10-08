import { auraFetch as fetch } from '../api-client';
import React, { useState } from 'react';
import {
  Compass,
  Camera,
  Eye,
  Sun,
  Volume2,
  VolumeX,
  Sparkles,
  Wand2,
  Layers,
  Sliders,
  ChevronDown,
  ChevronUp,
  Activity,
  Send,
  SlidersHorizontal
} from 'lucide-react';
import { flowAudio } from './FlowAudioEngine';

interface FlowCreativeSuiteProps {
  currentPrompt: string;
  onApplyPrompt: (enhanced: string) => void;
  mode: 'transition' | 'veo';
  isGenerating: boolean;
  isPlayingVideo: boolean;
}

export const CAMERA_MOVES = [
  { id: 'dolly-in', name: 'Dolly Push-in', desc: 'Continuous forward camera motion with focal compression', tag: 'Dolly In' },
  { id: 'orbit', name: 'Orbit 180°', desc: 'Sweeping circular arc rotation around the central subject', tag: 'Orbit' },
  { id: 'whip-pan', name: 'Whip Pan', desc: 'High-speed horizontal motion blur across the frame', tag: 'Whip Pan' },
  { id: 'crane-up', name: 'Crane Jib Rise', desc: 'Vertical upward elevator sweep revealing the scene below', tag: 'Crane Up' },
  { id: 'tracking', name: 'Steadicam Follow', desc: 'Smooth stabilized tracking movement through the space', tag: 'Tracking' },
  { id: 'dutch', name: 'Dutch Canted Angle', desc: 'Off-axis tilted camera roll adding cinematic tension', tag: 'Dutch Roll' },
  { id: 'drone-dive', name: 'FPV Drone Dive', desc: 'Fast aerodynamic swooping trajectory through geometry', tag: 'FPV Dive' },
  { id: 'dolly-zoom', name: 'Vertigo Dolly Zoom', desc: 'Opposing zoom and push causing spatial distortion', tag: 'Vertigo' }
];

export const LENSES = [
  { id: '16mm', name: '16mm Ultra-Wide', desc: 'Expansive field of view with dynamic edge distortion' },
  { id: '35mm', name: '35mm Cine Prime', desc: 'Classic Hollywood documentary street perspective' },
  { id: '50mm', name: '50mm Natural Lens', desc: 'Human eye perspective with balanced organic depth' },
  { id: '85mm', name: '85mm Portrait Bokeh', desc: 'Creamy shallow depth of field and subject isolation' },
  { id: 'anamorphic', name: '2.39:1 Anamorphic', desc: 'Cinemascope oval bokeh with subtle blue streak flares' }
];

export const LIGHTING_ATMOS = [
  { id: 'golden-hour', name: 'Golden Hour Sunflare', desc: 'Warm 3200K low-angle sunlight with glowing rim highlights' },
  { id: 'neon-noir', name: 'Cyberpunk Neon Noir', desc: 'Vibrant magenta/cyan reflections on wet reflective surfaces' },
  { id: 'volumetric-haze', name: 'Volumetric God Rays', desc: 'Atmospheric light shafts cutting through soft mist particles' },
  { id: 'twilight-blue', name: 'Moonlit Twilight Blue', desc: 'Deep indigo ambient shadow tones with silver moonlight' },
  { id: 'kodak-grain', name: 'Kodak 5247 35mm Grain', desc: 'Textured analog film emulsion with tactile organic warmth' }
];

export default function FlowCreativeSuite({
  currentPrompt,
  onApplyPrompt,
  mode,
  isGenerating,
  isPlayingVideo
}: FlowCreativeSuiteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'camera' | 'lens' | 'lighting' | 'physics' | 'audio'>('camera');

  // Dynamic Selections (Zero hardcoded)
  const [selectedCamera, setSelectedCamera] = useState<string>('dolly-in');
  const [customCameraInput, setCustomCameraInput] = useState<string>('');
  const [selectedLens, setSelectedLens] = useState<string>('35mm');
  const [selectedLighting, setSelectedLighting] = useState<string>('volumetric-haze');
  const [motionPacing, setMotionPacing] = useState<string>('smooth cinematic momentum');

  // Real-time Physics & Optics parameters
  const [shutterAngle, setShutterAngle] = useState<number>(180);
  const [rollAngle, setRollAngle] = useState<number>(0);
  const [motionCurve, setMotionCurve] = useState<'linear' | 'ease-in-out' | 'burst'>('ease-in-out');

  // Enhancer state
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancerMessage, setEnhancerMessage] = useState<string | null>(null);

  // Audio Ambience state
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [audioPreset, setAudioPreset] = useState<'drone' | 'rain' | 'cyberpunk' | 'noir'>('drone');
  const [volume, setVolume] = useState(0.3);

  // Synchronize audio with video playback
  React.useEffect(() => {
    if (isAudioEnabled) {
      if (isPlayingVideo && !flowAudio.getIsPlaying()) {
        flowAudio.play(audioPreset);
      } else if (!isPlayingVideo && flowAudio.getIsPlaying()) {
        flowAudio.stop();
      }
    } else {
      flowAudio.stop();
    }
  }, [isPlayingVideo, isAudioEnabled, audioPreset]);

  const handleToggleAudio = () => {
    const next = !isAudioEnabled;
    setIsAudioEnabled(next);
    if (!next) {
      flowAudio.stop();
    } else if (isPlayingVideo) {
      flowAudio.play(audioPreset);
    }
  };

  const handleAudioPresetChange = (preset: 'drone' | 'rain' | 'cyberpunk' | 'noir') => {
    setAudioPreset(preset);
    flowAudio.setPreset(preset);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    flowAudio.setVolume(val);
  };

  // Google Flow AI Prompt Enhancement with Real-Time Physics
  const handleFlowEnhance = async () => {
    setIsEnhancing(true);
    setEnhancerMessage(null);

    const cameraObj = CAMERA_MOVES.find(c => c.id === selectedCamera);
    const cameraDesc = customCameraInput.trim()
      ? customCameraInput.trim()
      : cameraObj ? `${cameraObj.name} (${cameraObj.desc})` : 'cinematic gimbal motion';

    const lensObj = LENSES.find(l => l.id === selectedLens);
    const lightingObj = LIGHTING_ATMOS.find(li => li.id === selectedLighting);

    const physicsNote = `Shutter angle ${shutterAngle}°, Roll ${rollAngle}°, Curve: ${motionCurve}`;

    try {
      const res = await fetch('/api/flow/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: currentPrompt || 'Cinematic video sequence with natural organic movement and realistic physics',
          mode,
          camera: `${cameraDesc}, ${physicsNote}`,
          lens: lensObj ? `${lensObj.name} (${lensObj.desc})` : undefined,
          lighting: lightingObj ? `${lightingObj.name} (${lightingObj.desc})` : undefined,
          motionSpeed: motionPacing
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to enhance prompt');

      onApplyPrompt(data.enhancedPrompt);
      setEnhancerMessage("Google Flow AI optimized your camera direction!");
      setTimeout(() => setEnhancerMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
      setEnhancerMessage("Enhancement note: " + (err.message || 'Error'));
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto mb-3 bg-[#0d0d10] border border-[#202026] rounded-xl overflow-hidden shadow-lg select-none transition-all">

      {/* Flow Toolbar Header */}
      <div className="px-3 sm:px-4 py-2.5 flex items-center justify-between bg-[#111114] border-b border-[#1f1f24] flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-cyan-500 via-indigo-500 to-violet-500 p-[1px] flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-black rounded-[5px] flex items-center justify-center">
              <Compass size={12} className="text-cyan-300" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] sm:text-xs font-bold text-white uppercase tracking-wider">
                Google Flow Creative Rig
              </span>
              <span className="text-[8px] sm:text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-800/80 px-1.5 py-0.2 rounded font-mono font-semibold">
                REAL-TIME
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          {/* Audio Ambience Toggle */}
          <button
            onClick={handleToggleAudio}
            className={`px-2 py-1 rounded-md text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider flex items-center space-x-1 border transition-all ${
              isAudioEnabled
                ? 'bg-cyan-950/80 border-cyan-700 text-cyan-300'
                : 'bg-[#18181c] border-[#282830] text-neutral-400 hover:text-white'
            }`}
            title="Procedural cinematic soundscape playback with video"
          >
            {isAudioEnabled ? <Volume2 size={11} /> : <VolumeX size={11} />}
            <span className="hidden sm:inline">{isAudioEnabled ? 'Ambience On' : 'Ambience Off'}</span>
          </button>

          {/* 1-Click Flow Magic AI Optimizer */}
          <button
            onClick={handleFlowEnhance}
            disabled={isEnhancing || isGenerating}
            className="bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:opacity-90 text-white font-bold text-[10px] sm:text-[11px] px-2.5 sm:px-3 py-1 rounded-md flex items-center space-x-1.5 shadow-sm transition-all disabled:opacity-40 uppercase tracking-wider"
            title="AI automatically crafts a professional Hollywood cinematography prompt using selected camera and lens parameters"
          >
            {isEnhancing ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Optimizing...</span>
              </>
            ) : (
              <>
                <Wand2 size={11} className="text-amber-200" />
                <span>Flow AI Magic</span>
              </>
            )}
          </button>

          {/* Collapse/Expand Toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 text-neutral-400 hover:text-white rounded-md bg-[#18181c] border border-[#26262e] transition-colors"
            title={isOpen ? "Collapse Creative Tools" : "Expand Creative Tools"}
          >
            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {enhancerMessage && (
        <div className="bg-cyan-950/40 border-b border-cyan-800/60 px-4 py-1.5 text-[10px] text-cyan-200 font-mono flex items-center justify-between">
          <span>{enhancerMessage}</span>
          <span className="text-cyan-400">Direction Note Updated</span>
        </div>
      )}

      {/* Expandable Tools Drawer */}
      {isOpen && (
        <div className="p-3 sm:p-4 space-y-4 bg-[#0a0a0c]">

          {/* Category Tabs (Horizontal Scrollable for Mobile 100%) */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 border-b border-[#1c1c22] pb-2 text-[11px] sm:text-xs overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('camera')}
              className={`px-2.5 py-1 rounded-md flex items-center space-x-1 font-medium shrink-0 transition-colors ${
                activeTab === 'camera'
                  ? 'bg-white text-black font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Camera size={12} />
              <span>Camera Rig</span>
            </button>

            <button
              onClick={() => setActiveTab('lens')}
              className={`px-2.5 py-1 rounded-md flex items-center space-x-1 font-medium shrink-0 transition-colors ${
                activeTab === 'lens'
                  ? 'bg-white text-black font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Eye size={12} />
              <span>Optics</span>
            </button>

            <button
              onClick={() => setActiveTab('lighting')}
              className={`px-2.5 py-1 rounded-md flex items-center space-x-1 font-medium shrink-0 transition-colors ${
                activeTab === 'lighting'
                  ? 'bg-white text-black font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Sun size={12} />
              <span>Lighting</span>
            </button>

            <button
              onClick={() => setActiveTab('physics')}
              className={`px-2.5 py-1 rounded-md flex items-center space-x-1 font-medium shrink-0 transition-colors ${
                activeTab === 'physics'
                  ? 'bg-white text-black font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <SlidersHorizontal size={12} />
              <span>Physics & Shutter</span>
            </button>

            <button
              onClick={() => setActiveTab('audio')}
              className={`px-2.5 py-1 rounded-md flex items-center space-x-1 font-medium shrink-0 transition-colors ${
                activeTab === 'audio'
                  ? 'bg-white text-black font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Volume2 size={12} />
              <span>Ambience</span>
            </button>
          </div>

          {/* TAB 1: Camera Moves & Custom Camera */}
          {activeTab === 'camera' && (
            <div className="space-y-3">
              {/* Presets Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CAMERA_MOVES.map(cam => {
                  const isSel = selectedCamera === cam.id && !customCameraInput.trim();
                  return (
                    <button
                      key={cam.id}
                      onClick={() => {
                        setSelectedCamera(cam.id);
                        setCustomCameraInput('');
                      }}
                      className={`p-2 sm:p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all ${
                        isSel
                          ? 'bg-[#181822] border-cyan-400/80 shadow-sm'
                          : 'bg-[#121215] border-[#222228] hover:border-neutral-500 hover:bg-[#16161a]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] sm:text-[11px] font-bold ${isSel ? 'text-cyan-300' : 'text-white'}`}>
                          {cam.name}
                        </span>
                        <span className="text-[8px] font-mono text-neutral-500 uppercase">{cam.tag}</span>
                      </div>
                      <p className="text-[9px] sm:text-[10px] text-neutral-400 line-clamp-2 mt-1 leading-snug">
                        {cam.desc}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Zero Hardcoded Custom Camera Input */}
              <div className="flex items-center space-x-2 pt-2 border-t border-[#1a1a20]">
                <input
                  type="text"
                  value={customCameraInput}
                  onChange={(e) => setCustomCameraInput(e.target.value)}
                  placeholder="Or define custom camera movement (e.g. 360 spiral roll ascending over subject)..."
                  className="flex-1 bg-[#121216] border border-[#24242e] focus:border-cyan-500 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 outline-none"
                />
                {customCameraInput && (
                  <button
                    onClick={() => setCustomCameraInput('')}
                    className="text-neutral-400 hover:text-white text-xs px-2"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Motion Pacing / Velocity */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[9px] sm:text-[10px] uppercase font-mono text-neutral-400 font-bold">
                  Camera Velocity:
                </span>
                <div className="flex flex-wrap items-center gap-1">
                  {['smooth cinematic momentum', 'slow contemplative drift', 'dynamic rapid acceleration', 'organic handheld micro-drift'].map((speed, i) => (
                    <button
                      key={i}
                      onClick={() => setMotionPacing(speed)}
                      className={`px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-mono capitalize transition-colors ${
                        motionPacing === speed
                          ? 'bg-neutral-200 text-black font-bold'
                          : 'bg-[#141418] text-neutral-400 hover:text-white border border-[#24242c]'
                      }`}
                    >
                      {speed.split(' ')[0]} {speed.split(' ')[1]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Lens & Optics */}
          {activeTab === 'lens' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {LENSES.map(lens => {
                const isSel = selectedLens === lens.id;
                return (
                  <button
                    key={lens.id}
                    onClick={() => setSelectedLens(lens.id)}
                    className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all ${
                      isSel
                        ? 'bg-[#181822] border-cyan-400/80 shadow-sm'
                        : 'bg-[#121215] border-[#222228] hover:border-neutral-500 hover:bg-[#16161a]'
                    }`}
                  >
                    <span className={`text-[11px] font-bold ${isSel ? 'text-cyan-300' : 'text-white'}`}>
                      {lens.name}
                    </span>
                    <p className="text-[10px] text-neutral-400 mt-1 leading-snug">
                      {lens.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {/* TAB 3: Atmospheric Lighting */}
          {activeTab === 'lighting' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {LIGHTING_ATMOS.map(light => {
                const isSel = selectedLighting === light.id;
                return (
                  <button
                    key={light.id}
                    onClick={() => setSelectedLighting(light.id)}
                    className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all ${
                      isSel
                        ? 'bg-[#181822] border-cyan-400/80 shadow-sm'
                        : 'bg-[#121215] border-[#222228] hover:border-neutral-500 hover:bg-[#16161a]'
                    }`}
                  >
                    <span className={`text-[11px] font-bold ${isSel ? 'text-cyan-300' : 'text-white'}`}>
                      {light.name}
                    </span>
                    <p className="text-[10px] text-neutral-400 mt-1 leading-snug">
                      {light.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {/* TAB 4: Real-time Physics & Optics Controls */}
          {activeTab === 'physics' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-[#121216] rounded-xl border border-[#22222a]">
              {/* Shutter Angle Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-neutral-400 uppercase font-bold">Shutter Angle (Motion Blur):</span>
                  <span className="text-cyan-300 font-bold">{shutterAngle}°</span>
                </div>
                <input
                  type="range"
                  min={45}
                  max={360}
                  step={15}
                  value={shutterAngle}
                  onChange={(e) => setShutterAngle(parseInt(e.target.value))}
                  className="w-full accent-cyan-400"
                />
                <div className="flex justify-between text-[8px] font-mono text-neutral-500">
                  <span>45° (Crisp Action)</span>
                  <span>180° (Film Standard)</span>
                  <span>360° (Dreamy Streak)</span>
                </div>
              </div>

              {/* Camera Roll Angle */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-neutral-400 uppercase font-bold">Dutch Canted Roll:</span>
                  <span className="text-cyan-300 font-bold">{rollAngle > 0 ? `+${rollAngle}°` : `${rollAngle}°`}</span>
                </div>
                <input
                  type="range"
                  min={-45}
                  max={45}
                  step={5}
                  value={rollAngle}
                  onChange={(e) => setRollAngle(parseInt(e.target.value))}
                  className="w-full accent-cyan-400"
                />
                <div className="flex justify-between text-[8px] font-mono text-neutral-500">
                  <span>-45° (Left Tilt)</span>
                  <span>0° (Level Horizon)</span>
                  <span>+45° (Right Tilt)</span>
                </div>
              </div>

              {/* Velocity Easing Curve */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-mono text-neutral-400 uppercase font-bold">
                  Acceleration Easing Curve:
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: 'linear', name: 'Linear Constant' },
                    { id: 'ease-in-out', name: 'S-Curve Ramp' },
                    { id: 'burst', name: 'Explosive Burst' }
                  ].map((curve: any) => (
                    <button
                      key={curve.id}
                      onClick={() => setMotionCurve(curve.id)}
                      className={`p-1.5 text-[9px] rounded font-mono border transition-all ${
                        motionCurve === curve.id
                          ? 'bg-cyan-950 border-cyan-500 text-cyan-200 font-bold'
                          : 'bg-[#181820] border-[#282832] text-neutral-400'
                      }`}
                    >
                      {curve.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Cinematic Ambience */}
          {activeTab === 'audio' && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 bg-[#121215] rounded-lg border border-[#222228]">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'drone', name: 'Deep Sub Drone', desc: '55Hz Sub-bass rumble' },
                  { id: 'rain', name: 'Rain & Wind Atmos', desc: 'Organic weather noise' },
                  { id: 'cyberpunk', name: 'Cyberpunk Pulse', desc: 'LFO modulated synth bass' },
                  { id: 'noir', name: 'Film Noir Ambient', desc: 'Warm cinematic minor chords' }
                ].map((item: any) => {
                  const isSel = audioPreset === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleAudioPresetChange(item.id)}
                      className={`px-3 py-1.5 rounded-md text-xs text-left border transition-all ${
                        isSel
                          ? 'bg-cyan-950 border-cyan-600 text-cyan-300 font-bold'
                          : 'bg-[#18181c] border-[#26262e] text-neutral-300 hover:text-white'
                      }`}
                    >
                      <div className="font-semibold">{item.name}</div>
                      <div className="text-[9px] text-neutral-400 font-mono">{item.desc}</div>
                    </button>
                  );
                })}
              </div>

              {/* Volume Slider */}
              <div className="flex items-center space-x-3 shrink-0">
                <span className="text-[10px] font-mono text-neutral-400 uppercase font-bold">
                  Volume:
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-24 accent-cyan-400"
                />
                <span className="text-[10px] font-mono text-white w-8">
                  {Math.round(volume * 100)}%
                </span>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
