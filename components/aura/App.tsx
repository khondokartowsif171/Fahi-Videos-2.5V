import { auraFetch as fetch } from './api-client';
import React, { useState, useRef, useEffect } from 'react';
import { TOOLS, ToolModule, default as AuraStudioToolLibrary } from './components/AuraStudioToolLibrary';
import {
  Upload,
  Film,
  Play,
  Pause,
  X,
  Clock,
  ArrowRight,
  Download,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronFirst,
  ChevronLast,
  RotateCcw,
  Sparkles,
  Wand2,
  Mic,
  MicOff,
  Video,
  Send,
  Check,
  Compass,
  HelpCircle,
  Smartphone,
  Menu,
  Headset,
  Database,
  Settings,
  SlidersHorizontal,
  Box,
  MoreVertical
} from 'lucide-react';
import AuraLogo from './components/AuraLogo';
import AuraLogoModal from './components/AuraLogoModal';
import BanglaCustomerCare from './components/BanglaCustomerCare';
import AutomationDashboard from './components/AutomationDashboard';
import GoogleFlowSettings from './components/GoogleFlowSettings';
import FlowCreativeSuite from './components/FlowCreativeSuite';
import FlowStoryboardModal from './components/FlowStoryboardModal';
import ShortcutsModal from './components/ShortcutsModal';
import UgcVoiceoverSuite from './components/UgcVoiceoverSuite';

interface MediaState {
  url: string;
  data: string;
  mimeType: string;
}

interface Segment {
  url: string;
  data: string;
  mimeType: string;
  kind: 'transition' | 'extension' | 'veo';
  duration?: number;
  isRerendered?: boolean;
}

interface HistoryItem {
  id: string;
  segments: Segment[];
  prompt: string;
  timestamp: Date;
  mode?: 'transition' | 'veo';
}

interface ImageModalState {
  target: 1 | 2;
  mode: 'create' | 'edit';
}

const TRANSITIONS = [
  {
    id: 'object-portal',
    name: 'Object Portal',
    hint: 'Enter a real opening in scene one and emerge naturally into scene two',
    block: `TECHNIQUE — OBJECT PORTAL:
Use a visible object or opening in the FIRST scene as a physical gateway into the LAST scene: door, window, mirror, tunnel, circular opening, or similar form.

START: Move the camera continuously toward the chosen opening until its interior dominates the frame.
BRIDGE: Pass physically THROUGH the opening. At the midpoint, the opening or its dark/interior surface must fill 100% of the frame, completely hiding the surrounding scene.
TRANSITION: While the frame is fully occupied by the portal interior, transform that interior space into the corresponding entry point of the LAST scene. NO VFX / Motion Graphics for the transition.
END: Continue the same camera movement out of the portal into the LAST scene and settle naturally into the target composition.

Maintain one uninterrupted camera move. No visible cut, dissolve, teleport, or abrupt perspective change. Make sure the scenes are matched and transition seamlessly. The portal itself must motivate and conceal the scene change.`
  },

  {
    id: 'whip-pan',
    name: 'Whip Pan',
    hint: 'A rapid pan creates full-frame motion blur that hides the scene change',
    block: `TECHNIQUE — WHIP PAN:
Transition between scenes using one continuous, high-speed horizontal camera pan.

START: Begin in the FIRST scene, then rapidly accelerate the camera left or right.
BRIDGE: The pan becomes fast enough to create strong directional motion blur across the ENTIRE frame. No recognizable environment should remain visible at peak speed.
TRANSITION: Change from the FIRST environment to the LAST environment only while the image is completely obscured by motion blur.
END: Continue the pan in the SAME direction and with consistent momentum, then smoothly decelerate until the camera lands precisely on the LAST frame's composition.

The transition must feel like one physical camera movement. Match pan direction, camera height, lens perspective, and apparent velocity across the hidden midpoint. No flash, dissolve, jump cut, or reversal of direction.`
  },

  {
    id: 'match-cut-morph',
    name: 'Match Morph',
    hint: 'A shared shape stays aligned while its material and world transform around it',
    block: `TECHNIQUE — MATCH MORPH:
Find the strongest visual geometry shared by the FIRST and LAST frames: a circle, face, silhouette, doorway, horizon, vehicle, building edge, centered object, or other matching form.

START: Reframe or move the camera so the shared shape in the FIRST scene aligns with the position, scale, angle, and silhouette of its counterpart in the LAST scene.
BRIDGE: Lock that geometry in place as the visual anchor. Its outer contour should remain stable while its texture, material, lighting, and identity gradually transform.
TRANSITION: Morph the surrounding environment at the same time, radiating naturally outward from the matched shape until the FIRST scene has fully become the LAST scene.
END: Finish with the matching geometry now belonging entirely to the LAST scene, aligned exactly with the target frame.

Prioritize silhouette continuity and spatial alignment. Avoid melting, random deformation, double exposure, or independent object movement that breaks the matched geometry. The transformation should read as one object/world evolving into another, not a crossfade.`
  },

  {
    id: 'sky-drop',
    name: 'Sky Drop',
    hint: 'Leave one world through an overhead surface and descend from it into the next',
    block: `TECHNIQUE — SKY DROP:
Use an overhead visual field as the seamless bridge between the FIRST and LAST scenes: open sky, clouds, ceiling, canopy, lights, fog, tree cover, water surface, or similar texture.

START: From the FIRST scene, tilt, crane, rise, or fly the camera upward until the overhead surface completely fills the frame and the original ground environment disappears.
BRIDGE: Continue moving through the full-frame sky/ceiling texture. During this visually ambiguous overhead moment, gradually transform its color, lighting, weather, structure, or texture into the overhead environment of the LAST scene.
TRANSITION: Preserve camera momentum and orientation while the overhead field becomes unmistakably part of the new world.
END: Reverse the framing movement by tilting or descending out of the new overhead surface, revealing the LAST scene below and settling into its target composition.

The overhead texture must fully conceal the environment change. No hard cut or arbitrary dissolve. The motion should feel like the camera traveled continuously through one vertical passage between worlds.`
  },

  {
    id: 'through-the-crowd',
    name: 'Foreground Wipe',
    hint: 'A close foreground object fully covers the lens and reveals the next scene behind it',
    block: `TECHNIQUE — FOREGROUND WIPE:
Use a believable foreground subject to physically wipe across the camera and hide the transition: person, coat, vehicle, wall, pillar, door, tree trunk, sign, fabric, or another large object passing very close to the lens.

START: Begin in the FIRST scene while the wiping element approaches or crosses the camera's view.
BRIDGE: The foreground element passes so close to the lens that it covers 100% of the frame for a brief moment.
TRANSITION: Change the environment only while the lens is completely occluded.
END: As the SAME or visually compatible foreground element clears the lens, reveal the LAST scene behind it and continue the existing camera or subject motion naturally.

Match the wipe's direction, speed, scale, color, and depth on both sides of the transition. The foreground object should plausibly exist in both scenes. Do not reveal the new environment until the frame has been fully covered. No dissolve or visible cut.`
  },

  {
    id: 'time-machine',
    name: 'Time Machine',
    hint: 'The viewpoint stays fixed while the same location transforms through time',
    block: `TECHNIQUE — TIME MACHINE:
Interpret the FIRST and LAST frames as the SAME physical location viewed at different moments, seasons, years, or historical eras.

START: Establish the FIRST scene and lock the camera to a stable viewpoint. A very slow push-in is acceptable, but the spatial perspective must remain consistent.
BRIDGE: Accelerate the passage of time around the camera. Show continuous temporal change through moving sunlight and shadows, weather, seasons, construction, decay, vegetation growth, traffic, crowds, aging materials, changing signage, or evolving architecture.
TRANSITION: Preserve permanent landmarks, major geometry, horizon position, and spatial layout so the viewer always understands this is the same place changing through time.
END: Gradually slow the temporal motion until the world settles completely into the LAST frame's era, lighting, environment, and exact composition.

The CAMERA does not travel through space; TIME travels around the camera. Avoid teleporting objects, unrelated morphing, or changing the location's fundamental geometry unless the change is motivated by visible construction, destruction, growth, or decay.`
  }
] as const;

export default function App() {
  const [activeTool, setActiveTool] = useState<ToolModule | null>(null);

  const toggleTool = (tool: ToolModule) => {
    setActiveTool(prev => prev === tool ? null : tool);
  };

  // Modes: 'transition' (Dual-frame Omni) or 'veo' (Single image animate with Veo 3.1)
  const [studioMode, setStudioMode] = useState<'transition' | 'veo'>('veo');
  const [veoAspectRatio, setVeoAspectRatio] = useState<'16:9' | '9:16'>(() => JSON.parse(localStorage.getItem('fahi_aura_settings') || '{}').aspectRatio || '16:9');

  const [prompt, setPrompt] = useState("");
  const [technique, setTechnique] = useState<string | null>(null);
  const [extendPrompt, setExtendPrompt] = useState("");
  const [image1, setImage1] = useState<MediaState | null>(null);
  const [image2, setImage2] = useState<MediaState | null>(null);
  const [references, setReferences] = useState<MediaState[]>([]);
  const [isGenerating, setGenerating] = useState(false);
  const [generatingLabel, setGeneratingLabel] = useState("Rendering...");
  const [error, setError] = useState<string | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState<number>(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('fahi_aura_settings') || '{}');
    if (saved.aspectRatio) setVeoAspectRatio(saved.aspectRatio);
    const changed = (e: Event) => setVeoAspectRatio((e as CustomEvent).detail.aspectRatio);
    window.addEventListener('aura-settings-change', changed);
    return () => window.removeEventListener('aura-settings-change', changed);
  }, []);

  // Scrubber & playback
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);

  // Image Studio Modal state (Create & Edit with gemini-3.1-flash-image-preview)
  const [imageModal, setImageModal] = useState<ImageModalState | null>(null);
  const [imageModalPrompt, setImageModalPrompt] = useState("");
  const [isImageProcessing, setIsImageProcessing] = useState(false);
  const [imageModalError, setImageModalError] = useState<string | null>(null);

  // AI Director Panel state (Gemini AI Director / Director chat)
  const [isDirectorOpen, setIsDirectorOpen] = useState(false);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [isStoryboardOpen, setIsStoryboardOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isUgcModalOpen, setIsUgcModalOpen] = useState(false);
  const [isAutomationDashboardOpen, setIsAutomationDashboardOpen] = useState(false);
  const [isBanglaCareOpen, setIsBanglaCareOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'studio' | 'media' | 'rig' | 'tools' | 'archive'>('studio');
  const [isMobileToolsSheetOpen, setIsMobileToolsSheetOpen] = useState(false);
  const [isMobileArchiveOpen, setIsMobileArchiveOpen] = useState(false);
  const [isMobileRigSheetOpen, setIsMobileRigSheetOpen] = useState(false);
  const [ugcAudioUrl, setUgcAudioUrl] = useState<string | null>(null);
  const ugcAudioRef = useRef<HTMLAudioElement | null>(null);
  const [directorMessages, setDirectorMessages] = useState<Array<{ role: 'user' | 'model', text: string }>>([
    {
      role: 'model',
      text: "Greetings. I am your Aura AI Director. Ask me about shot choreography, transition physics, or camera movements for Veo and Omni generations."
    }
  ]);
  const [directorInput, setDirectorInput] = useState("");
  const [isDirectorLoading, setIsDirectorLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInput1Ref = useRef<HTMLInputElement>(null);
  const fileInput2Ref = useRef<HTMLInputElement>(null);
  const fileInputRefRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Sync UGC Bengali Voiceover with video playback
  useEffect(() => {
    if (ugcAudioUrl && ugcAudioRef.current) {
      if (isPlaying) {
        ugcAudioRef.current.currentTime = currentTime;
        ugcAudioRef.current.play().catch(() => {});
      } else {
        ugcAudioRef.current.pause();
      }
    }
  }, [isPlaying, ugcAudioUrl]);

  useEffect(() => {
    if (ugcAudioUrl && ugcAudioRef.current && isScrubbing) {
      ugcAudioRef.current.currentTime = currentTime;
    }
  }, [currentTime, isScrubbing, ugcAudioUrl]);

  const fps = 30;

  const formatTimecode = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00.00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const hundredths = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${hundredths.toString().padStart(2, '0')}`;
  };

  const handleScrubStart = () => {
    setIsScrubbing(true);
    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
    }
  };

  const handleScrubChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const handleScrubEnd = () => {
    setIsScrubbing(false);
  };

  const stepFrame = (frames: number) => {
    if (!videoRef.current) return;
    const frameDuration = 1 / fps;
    const targetDuration = duration || videoRef.current.duration || 10;
    const newTime = Math.min(Math.max(0, videoRef.current.currentTime + frames * frameDuration), targetDuration);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    if (!videoRef.current.paused) {
      videoRef.current.pause();
    }
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  };

  useEffect(() => {
    setCurrentTime(0);
    setIsPlaying(false);
    setIsScrubbing(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  }, [selectedSegmentIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!document.querySelector('[data-aura-active="true"]')) return;
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsOpen(prev => !prev);
        return;
      }
      if (e.key === 'Escape') {
        setIsShortcutsOpen(false);
        setIsLogoModalOpen(false);
        setIsStoryboardOpen(false);
        return;
      }

      if (segments.length === 0 || !videoRef.current) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        stepFrame(e.shiftKey ? -5 : -1);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        stepFrame(e.shiftKey ? 5 : 1);
      } else if (e.code === 'Home') {
        e.preventDefault();
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          setCurrentTime(0);
        }
      } else if (e.code === 'End') {
        e.preventDefault();
        if (videoRef.current) {
          videoRef.current.currentTime = duration;
          setCurrentTime(duration);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [segments, duration]);

  // Handle Speech Recognition for AI Director voice conversation
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser. You can type to the AI Director directly.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          handleSendDirectorMessage(transcript);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Speech recognition error:', err);
      setIsListening(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setMedia: React.Dispatch<React.SetStateAction<MediaState | null>>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        setError("File size exceeds 50MB limit.");
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError("Please select an image file (PNG, JPG, WEBP).");
        return;
      }
      setError(null);
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        const base64Data = result.split(',')[1];
        setMedia({ url: result, data: base64Data, mimeType: file.type });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRefFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && references.length < 3) {
      if (file.size > 100 * 1024 * 1024) {
        setError("File size exceeds 100MB limit.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        const base64Data = result.split(',')[1];
        setReferences(prev => [...prev, { url: result, data: base64Data, mimeType: file.type }]);
      };
      reader.readAsDataURL(file);
    }
  };

  const pollOmniJob = async (jobId: string): Promise<{url: string, data: string, mimeType: string}> => {
    const started = Date.now();
    while (Date.now() - started < 15 * 60 * 1000) {
      await new Promise(r => setTimeout(r, 4000));
      const elapsed = Math.round((Date.now() - started) / 1000);
      setGeneratingLabel(prev => prev.replace(/( \· \d+s)?$/, ` · ${elapsed}s`));
      const statusRes = await fetch(`/api/job/${jobId}`);
      if (!statusRes.ok) throw new Error('Lost connection to the render job.');
      const status = await statusRes.json();
      if (status.status === 'error') throw new Error(status.error || 'Render processing failed.');
      if (status.status === 'done') {
        const resultRes = await fetch(`/api/job/${jobId}/result`);
        if (!resultRes.ok) throw new Error('Failed to retrieve finished render.');
        const blob = await resultRes.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ url: URL.createObjectURL(blob), data: (reader.result as string).split(',')[1], mimeType: blob.type || 'video/mp4' });
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
    }
    throw new Error("Rendering timed out. Please try again.");
  };

  // -------------------------------------------------------------
  // VEO 3.1 IMAGE ANIMATION (Veo 3.1)
  // -------------------------------------------------------------
  const handleVeoGenerate = async () => {
    if (!image1) {
      setError("Please upload or create a photo in the Head Frame slot to animate with Veo.");
      return;
    }

    setError(null);
    setGenerating(true);
    setGeneratingLabel(`Animating with Veo 3.1 (${veoAspectRatio})...`);

    try {
      const res = await fetch('/api/veo/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt || 'Cinematic video animation of this image with natural physics, lifelike movement, and depth.',
          image: image1.data,
          mimeType: image1.mimeType,
          aspectRatio: veoAspectRatio
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to start Veo video generation');
      }

      const { operationName } = data;
      const started = Date.now();

      while (Date.now() - started < 15 * 60 * 1000) {
        await new Promise(r => setTimeout(r, 4000));
        const elapsed = Math.round((Date.now() - started) / 1000);
        setGeneratingLabel(`Rendering Veo Video (${veoAspectRatio}) · ${elapsed}s`);

        const statusRes = await fetch('/api/veo/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operationName })
        });
        const statusData = await statusRes.json();
        if (statusData.error) {
          throw new Error(statusData.error.message || statusData.error || 'Veo generation failed');
        }

        if (statusData.done) {
          setGeneratingLabel("Downloading Video...");
          const dlRes = await fetch('/api/veo/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operationName })
          });
          if (!dlRes.ok) throw new Error('Failed to retrieve rendered Veo video');
          const blob = await dlRes.blob();
          const videoUrl = URL.createObjectURL(blob);
          const reader = new FileReader();
          const base64Data: string = await new Promise((resolve) => {
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(blob);
          });

          const newSegment: Segment = {
            url: videoUrl,
            data: base64Data,
            mimeType: blob.type || 'video/mp4',
            kind: 'veo'
          };

          setSegments([newSegment]);
          setSelectedSegmentIndex(0);
          setCurrentTime(0);

          const newHistoryItem: HistoryItem = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            segments: [newSegment],
            prompt: `[Veo 3.1 ${veoAspectRatio}] ${prompt || 'Image animation'}`,
            timestamp: new Date(),
            mode: 'veo'
          };
          setHistory(prev => [newHistoryItem, ...prev]);
          setActiveHistoryId(newHistoryItem.id);
          return;
        }
      }
      throw new Error("Rendering timed out. Please try again.");
    } catch (err: any) {
      console.error('Veo generation failed:', err);
      setError(err.message || 'Veo video generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  // -------------------------------------------------------------
  // DUAL-FRAME TRANSITION (Veo 3.1)
  // -------------------------------------------------------------
  const handleGenerate = async () => {
    if (studioMode === 'veo') {
      return handleVeoGenerate();
    }

    if ((!prompt.trim() && !technique) || !image1 || !image2) {
      setError("Please select a transition technique or provide scene direction, and supply both keyframe images.");
      return;
    }

    setError(null);
    setGenerating(true);
    setGeneratingLabel("Rendering Transition...");

    try {
      const mediaParts = [
        { data: image1.data, mimeType: image1.mimeType },
        { data: image2.data, mimeType: image2.mimeType }
      ];
      const selected = TRANSITIONS.find(t => t.id === technique);
      const fullPrompt = `Task: Create one continuous, uncut cinematic transition from the First frame to the Last frame.
${selected ? selected.block : 'TECHNIQUE — DIRECTOR\'S CHOICE: Choose the single most visually striking transition technique that suits these two frames (object portal, whip pan, match morph, sky drop, foreground wipe, or time-lapse transformation). Commit to it fully.'}
Additional user instructions: ${prompt || 'None.'}
CRITICAL RULES:
1. Single continuous camera move; begin exactly on the First frame and end exactly on the Last frame.
2. Execute the named technique boldly — this is a showcase transition, not a subtle dissolve.
3. No hard cuts, no crossfades, no new characters.`;

      const res = await fetch('/api/omni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: fullPrompt,
          format: 'video',
          media: mediaParts, aspectRatio: veoAspectRatio,
          references: references.map(r => ({ data: r.data, mimeType: r.mimeType }))
        })
      });

      const { jobId, error: jobError } = await res.json();
      if (jobError || !jobId) throw new Error(jobError || 'Failed to initiate render queue.');

      const output = await pollOmniJob(jobId);
      const newSegment: Segment = { ...output, kind: 'transition' };
      setSegments([newSegment]);
      setSelectedSegmentIndex(0);
      setCurrentTime(0);

      const historyItem: HistoryItem = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        segments: [newSegment],
        prompt: prompt || (selected ? selected.name : 'Director\'s Choice'),
        timestamp: new Date(),
        mode: 'transition'
      };
      setHistory(prev => [historyItem, ...prev]);
      setActiveHistoryId(historyItem.id);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Rendering failed. Please retry.");
    } finally {
      setGenerating(false);
    }
  };

  const handleExtend = async () => {
    if (segments.length === 0) return;
    const lastSeg = segments[segments.length - 1];

    setError(null);
    setGenerating(true);
    setGeneratingLabel("Extending Scene +7s...");

    try {
      const sourceMedia: any[] = [];
      if (image1) sourceMedia.push({ data: image1.data, mimeType: image1.mimeType });
      if (image2) sourceMedia.push({ data: image2.data, mimeType: image2.mimeType });

      const res = await fetch('/api/omni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'extend',
          video: lastSeg.data,
          mimeType: lastSeg.mimeType,
          prompt: extendPrompt,
          sourceMedia: sourceMedia.length > 0 ? sourceMedia : undefined
        })
      });

      const { jobId, error: jobError } = await res.json();
      if (jobError || !jobId) throw new Error(jobError || 'Failed to initiate scene extension.');

      const output = await pollOmniJob(jobId);
      const newSegment: Segment = { ...output, kind: 'extension', duration: undefined };
      const updatedSegments = [newSegment];
      setSegments(updatedSegments);
      setSelectedSegmentIndex(updatedSegments.length - 1);
      setCurrentTime(0);

      if (activeHistoryId) {
        setHistory(prev => prev.map(item => {
          if (item.id === activeHistoryId) {
            return { ...item, segments: updatedSegments };
          }
          return item;
        }));
      }

      setExtendPrompt("");
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to extend the scene.");
    } finally {
      setGenerating(false);
    }
  };

  // -------------------------------------------------------------
  // CREATE & EDIT IMAGES (gemini-3.1-flash-image-preview)
  // -------------------------------------------------------------
  const handleExecuteImageAction = async () => {
    if (!imageModal || !imageModalPrompt.trim()) return;
    setIsImageProcessing(true);
    setImageModalError(null);

    const { target, mode } = imageModal;
    const currentImg = target === 1 ? image1 : image2;

    try {
      if (mode === 'create') {
        const res = await fetch('/api/image/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: imageModalPrompt,
            aspectRatio: veoAspectRatio === '9:16' ? '9:16' : '16:9'
          })
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Failed to generate image.');

        const media: MediaState = {
          url: data.url,
          data: data.data,
          mimeType: data.mimeType || 'image/png'
        };

        if (target === 1) setImage1(media);
        else setImage2(media);
      } else {
        if (!currentImg) throw new Error("No image found to edit.");
        const res = await fetch('/api/image/edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: imageModalPrompt,
            image: currentImg.data,
            mimeType: currentImg.mimeType
          })
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Failed to edit image.');

        const media: MediaState = {
          url: data.url,
          data: data.data,
          mimeType: data.mimeType || 'image/png'
        };

        if (target === 1) setImage1(media);
        else setImage2(media);
      }

      setImageModal(null);
      setImageModalPrompt("");
    } catch (err: any) {
      console.error('Image action error:', err);
      setImageModalError(err.message || 'Operation failed.');
    } finally {
      setIsImageProcessing(false);
    }
  };

  // -------------------------------------------------------------
  // AI DIRECTOR CONVERSATION (Gemini AI Director)
  // -------------------------------------------------------------
  const handleSendDirectorMessage = async (msgText: string) => {
    if (!msgText.trim()) return;
    const userMsg = { role: 'user' as const, text: msgText };
    setDirectorMessages(prev => [...prev, userMsg]);
    setDirectorInput('');
    setIsDirectorLoading(true);

    try {
      const res = await fetch('/api/director/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msgText,
          history: directorMessages
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to get Director response.');
      setDirectorMessages(prev => [...prev, { role: 'model' as const, text: data.reply }]);
    } catch (err: any) {
      setDirectorMessages(prev => [...prev, { role: 'model' as const, text: `Director note: ${err.message || 'Connection failed'}` }]);
    } finally {
      setIsDirectorLoading(false);
    }
  };

  const handleStartOver = () => {
    setImage1(null);
    setImage2(null);
    setReferences([]);
    setPrompt("");
    setTechnique(null);
    setSegments([]);
    setSelectedSegmentIndex(0);
    setActiveHistoryId(null);
    setError(null);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setIsScrubbing(false);
    if (fileInput1Ref.current) fileInput1Ref.current.value = '';
    if (fileInput2Ref.current) fileInput2Ref.current.value = '';
    if (fileInputRefRef.current) fileInputRefRef.current.value = '';
  };

  const handleExport = async () => {
    if (!segments.length) return;
    try {
      // Each extension replaces the previous complete video, so export the latest take.
      const segment = segments[segments.length - 1];
      let blob: Blob;
      if (ugcAudioUrl) {
        const audio = await window.fetch(ugcAudioUrl).then(r => r.blob());
        const audioData = await new Promise<string>((resolve,reject) => {
          const reader = new FileReader(); reader.onload=()=>resolve(String(reader.result).split(',')[1]); reader.onerror=reject; reader.readAsDataURL(audio);
        });
        const result = await fetch('/api/export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({video:segment.data,audio:audioData})});
        if (!result.ok) throw new Error((await result.json()).error || 'Video export failed.');
        blob = await result.blob();
      } else blob = await window.fetch(segment.url).then(r=>r.blob());
      const url = URL.createObjectURL(blob), a=document.createElement('a');
      a.href=url; a.download='aura-studio.mp4'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),30000);
    } catch(err:any) { setError(err.message || 'Export failed.'); }
  };

  return (
    <div className="aura-studio flex h-[calc(100dvh-4rem)] w-full bg-black text-white overflow-hidden select-none font-normal relative">
      <AuraStudioToolLibrary activeTool={activeTool} onToggleTool={toggleTool} />

      {/* Reel Archive Panel (Desktop sidebar) */}
      <aside
        className={`hidden lg:flex bg-black border-r border-[#1a1a1a] flex-col z-20 transition-all duration-300 ease-in-out shrink-0 ${
          isArchiveOpen ? 'w-72 xl:w-80' : 'w-12'
        }`}
      >
        <div className="h-14 border-b border-[#1a1a1a] flex items-center justify-between px-3 bg-black shrink-0">
          {isArchiveOpen ? (
            <>
              <div className="flex items-center space-x-2.5 pl-2 overflow-hidden">
                <Clock size={16} strokeWidth={2} className="text-white shrink-0" />
                <h2 className="text-xs uppercase tracking-widest text-white font-bold truncate">
                  Reel Archive
                </h2>
                <span className="text-[10px] text-neutral-400 font-mono font-medium px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 shrink-0">
                  {history.length}
                </span>
              </div>
              <button
                onClick={() => setIsArchiveOpen(false)}
                className="w-7 h-7 rounded flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
                title="Collapse Reel Archive"
                aria-label="Collapse Reel Archive"
              >
                <ChevronLeft size={16} strokeWidth={2} />
              </button>
            </>
          ) : (
            <div className="w-full flex flex-col items-center justify-center py-2">
              <button
                onClick={() => setIsArchiveOpen(true)}
                className="w-7 h-7 rounded flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
                title="Expand Reel Archive"
                aria-label="Expand Reel Archive"
              >
                <ChevronRight size={16} strokeWidth={2} />
              </button>
            </div>
          )}
        </div>

        {!isArchiveOpen ? (
          <div className="flex-1 flex flex-col items-center py-6 space-y-6">
            <button
              onClick={() => setIsArchiveOpen(true)}
              className="flex flex-col items-center group text-neutral-400 hover:text-white"
              title={`Expand Reel Archive (${history.length} ${history.length === 1 ? 'take' : 'takes'})`}
            >
              <div className="w-8 h-8 rounded bg-[#111111] border border-neutral-800 flex items-center justify-center group-hover:border-neutral-600 transition-colors">
                <Clock size={14} strokeWidth={2} className="text-neutral-300 group-hover:text-white" />
              </div>
              {history.length > 0 && (
                <span className="mt-2 text-[10px] font-mono text-neutral-400 font-bold bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">
                  {history.length}
                </span>
              )}
            </button>
            <div
              onClick={() => setIsArchiveOpen(true)}
              className="[writing-mode:vertical-rl] text-[10px] uppercase tracking-widest text-neutral-500 font-bold cursor-pointer hover:text-neutral-300 transition-colors pt-2 select-none"
            >
              Reel Archive
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {history.length === 0 ? (
              <div className="text-center text-neutral-500 text-xs mt-16 px-4 leading-relaxed">
                Rendered takes will be preserved here in the session archive.
              </div>
            ) : (
              history.map(item => {
                const isSelected = activeHistoryId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSegments(item.segments);
                      setPrompt(item.prompt);
                      setActiveHistoryId(item.id);
                      setSelectedSegmentIndex(0);
                    }}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? 'border-white bg-[#141414]'
                        : 'border-[#222222] bg-[#0a0a0a] hover:border-neutral-600 hover:bg-[#111111]'
                    }`}
                  >
                    <div className="aspect-video bg-black rounded-lg overflow-hidden mb-2 relative group border border-[#1f1f1f]">
                      {item.segments[0] && (
                        <video src={item.segments[0].url} className="w-full h-full object-cover" />
                      )}
                      {item.segments.length > 1 && (
                        <div className="absolute bottom-1.5 right-1.5 bg-black/90 border border-neutral-700 px-1.5 py-0.5 rounded text-[9px] text-white font-bold">
                          {item.segments.length} seg
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play size={16} className="text-white fill-white" />
                      </div>
                    </div>
                    <p className="text-xs text-neutral-200 line-clamp-2 leading-relaxed font-medium">
                      {item.prompt}
                    </p>
                    <div className="text-[10px] text-neutral-400 mt-1.5 flex items-center justify-between font-mono">
                      <span>{item.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      <span className="text-white font-bold tracking-wider uppercase text-[9px]">Recall Take</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar - Keyframes & Reference Materials (Responsive Drawer on Mobile) */}
      <aside className={`
        ${isMobileSidebarOpen ? 'fixed inset-y-0 left-0 z-50 w-[88vw] max-w-sm shadow-2xl flex pt-safe pb-safe' : 'hidden'}
        lg:flex lg:static w-72 xl:w-80 bg-black border-r border-[#1a1a1a] flex-col shrink-0 h-full
      `}>

        {/* Studio Branding Header */}
        <div className="p-3.5 lg:p-4 border-b border-[#1a1a1a] shrink-0">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsLogoModalOpen(true)}
              className="flex items-center space-x-2.5 text-left group transition-all"
              title="Aura Studio Logo — Click to preview and export brand assets"
            >
              <div className="relative group-hover:scale-105 transition-transform">
                <AuraLogo size={32} showGlow={true} />
              </div>
              <div>
                <h1 className="text-xs font-bold tracking-wider text-white uppercase flex items-center gap-1.5 group-hover:text-cyan-200 transition-colors">
                  Aura Studio
                </h1>
                <p className="text-[10px] text-neutral-400 font-normal tracking-wide">
                  Keyframes & Media
                </p>
              </div>
            </button>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setIsBanglaCareOpen(true)}
                className="text-indigo-400 hover:text-white p-2 rounded-lg bg-[#14141c] border border-[#22222a] min-w-[38px] min-h-[38px] flex items-center justify-center"
                title="Open Bangla Customer Care Service"
              >
                <Headset size={16} />
              </button>

              <button
                onClick={() => setIsSettingsOpen(true)}
                className="text-neutral-400 hover:text-white p-2 rounded-lg min-w-[38px] min-h-[38px] flex items-center justify-center"
                title="Open Agent Settings"
              >
                <Settings size={16} />
              </button>

              {isMobileSidebarOpen && (
                <button
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="lg:hidden text-neutral-300 hover:text-white p-2 rounded-lg bg-[#141416] border border-[#26262a] min-w-[38px] min-h-[38px] flex items-center justify-center"
                  title="Close sidebar drawer"
                  aria-label="Close sidebar drawer"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Source Media Ingestion */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-5 space-y-5">

          {/* First Keyframe */}
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-xs uppercase tracking-widest text-neutral-300 font-semibold">
                {studioMode === 'veo' ? 'Source Photo' : 'Head Frame (In)'}
              </span>
              <span className="text-[10px] text-neutral-500 font-medium">
                {studioMode === 'veo' ? 'Animation Base' : 'Departure'}
              </span>
            </div>

            <div
              onClick={() => !isGenerating && fileInput1Ref.current?.click()}
              className={`relative ${veoAspectRatio === '9:16' && studioMode === 'veo' ? 'aspect-[9/16] max-h-64 mx-auto' : 'aspect-video'} rounded-xl border border-[#222222] bg-[#080808] overflow-hidden cursor-pointer transition-all duration-200 group ${
                isGenerating ? 'opacity-30 pointer-events-none' : 'hover:border-white/40 hover:bg-[#111111]'
              }`}
            >
              {image1 ? (
                <>
                  <img src={image1.url} className="w-full h-full object-cover" alt="Head frame" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setImage1(null);
                      if (fileInput1Ref.current) fileInput1Ref.current.value = '';
                    }}
                    className="absolute top-2 right-2 bg-black/80 hover:bg-white hover:text-black text-white p-1 rounded-md transition-all opacity-0 group-hover:opacity-100 shadow-md"
                    title="Remove image"
                  >
                    <X size={12} />
                  </button>
                  <div className="absolute bottom-2 right-2 bg-white text-black px-2 py-0.5 rounded text-[9px] tracking-wider uppercase font-bold">
                    {studioMode === 'veo' ? 'Source' : 'Initial Point'}
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400 space-y-1.5 p-3">
                  <div className="w-8 h-8 rounded-full bg-[#141414] border border-[#262626] flex items-center justify-center text-white">
                    <Upload size={14} strokeWidth={1.75} />
                  </div>
                  <span className="text-xs font-medium text-neutral-200">Upload photo</span>
                  <span className="text-[9px] text-neutral-500 uppercase tracking-wider">PNG / JPG / WEBP</span>
                </div>
              )}
              <input
                type="file"
                ref={fileInput1Ref}
                onChange={(e) => handleFileChange(e, setImage1)}
                accept="image/*"
                className="hidden"
              />
            </div>

            {/* AI Image Create & Edit Buttons (gemini-3.1-flash-image-preview) */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <button
                onClick={() => {
                  setImageModal({ target: 1, mode: 'create' });
                  setImageModalPrompt("");
                  setImageModalError(null);
                }}
                disabled={isGenerating}
                className="flex-1 bg-[#121214] hover:bg-[#1c1c20] hover:text-white border border-[#242428] text-neutral-300 text-[10px] py-1.5 px-2 rounded-lg flex items-center justify-center space-x-1 transition-colors"
                title="Create a new image with text prompt (gemini-3.1-flash-image-preview)"
              >
                <Wand2 size={11} className="text-violet-400" />
                <span>Create with AI</span>
              </button>

              {image1 && (
                <button
                  onClick={() => {
                    setImageModal({ target: 1, mode: 'edit' });
                    setImageModalPrompt("");
                    setImageModalError(null);
                  }}
                  disabled={isGenerating}
                  className="bg-[#121214] hover:bg-[#1c1c20] hover:text-white border border-[#242428] text-neutral-300 text-[10px] py-1.5 px-2.5 rounded-lg flex items-center justify-center space-x-1 transition-colors"
                  title="Edit this frame using text prompt (gemini-3.1-flash-image-preview)"
                >
                  <Sparkles size={11} className="text-amber-300" />
                  <span>Edit</span>
                </button>
              )}
            </div>
          </div>

          {/* Second Keyframe (Transition Mode only) */}
          {studioMode === 'transition' && (
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs uppercase tracking-widest text-neutral-300 font-semibold">
                  Tail Frame (Out)
                </span>
                <span className="text-[10px] text-neutral-500 font-medium">Arrival</span>
              </div>
              <div
                onClick={() => !isGenerating && fileInput2Ref.current?.click()}
                className={`relative aspect-video rounded-xl border border-[#222222] bg-[#080808] overflow-hidden cursor-pointer transition-all duration-200 group ${
                  isGenerating ? 'opacity-30 pointer-events-none' : 'hover:border-white/40 hover:bg-[#111111]'
                }`}
              >
                {image2 ? (
                  <>
                    <img src={image2.url} className="w-full h-full object-cover" alt="Tail frame" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setImage2(null);
                        if (fileInput2Ref.current) fileInput2Ref.current.value = '';
                      }}
                      className="absolute top-2 right-2 bg-black/80 hover:bg-white hover:text-black text-white p-1 rounded-md transition-all opacity-0 group-hover:opacity-100 shadow-md"
                      title="Remove image"
                    >
                      <X size={12} />
                    </button>
                    <div className="absolute bottom-2 right-2 bg-white text-black px-2 py-0.5 rounded text-[9px] tracking-wider uppercase font-bold">
                      Landing Point
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400 space-y-1.5 p-3">
                    <div className="w-8 h-8 rounded-full bg-[#141414] border border-[#262626] flex items-center justify-center text-white">
                      <Upload size={14} strokeWidth={1.75} />
                    </div>
                    <span className="text-xs font-medium text-neutral-200">Select arrival image</span>
                    <span className="text-[9px] text-neutral-500 uppercase tracking-wider">Image Frame</span>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInput2Ref}
                  onChange={(e) => handleFileChange(e, setImage2)}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              {/* AI Image Create & Edit Buttons for Arrival Frame */}
              <div className="flex items-center gap-1.5 pt-0.5">
                <button
                  onClick={() => {
                    setImageModal({ target: 2, mode: 'create' });
                    setImageModalPrompt("");
                    setImageModalError(null);
                  }}
                  disabled={isGenerating}
                  className="flex-1 bg-[#121214] hover:bg-[#1c1c20] hover:text-white border border-[#242428] text-neutral-300 text-[10px] py-1.5 px-2 rounded-lg flex items-center justify-center space-x-1 transition-colors"
                >
                  <Wand2 size={11} className="text-violet-400" />
                  <span>Create with AI</span>
                </button>

                {image2 && (
                  <button
                    onClick={() => {
                      setImageModal({ target: 2, mode: 'edit' });
                      setImageModalPrompt("");
                      setImageModalError(null);
                    }}
                    disabled={isGenerating}
                    className="bg-[#121214] hover:bg-[#1c1c20] hover:text-white border border-[#242428] text-neutral-300 text-[10px] py-1.5 px-2.5 rounded-lg flex items-center justify-center space-x-1 transition-colors"
                  >
                    <Sparkles size={11} className="text-amber-300" />
                    <span>Edit</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Reference Video / Style Guide (Transition mode only) */}
          {studioMode === 'transition' && (
            <div className="space-y-2 pt-2 border-t border-[#1a1a1a]">
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">
                  Style References ({references.length}/3)
                </span>
                <span className="text-[9px] text-neutral-500">Optional</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {references.map((ref, idx) => (
                  <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-[#222222] group bg-[#0a0a0a]">
                    <video src={ref.url} className="w-full h-full object-cover" />
                    <button
                      onClick={() => setReferences(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 bg-black/80 hover:bg-white hover:text-black text-white p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}

                {references.length < 3 && (
                  <button
                    onClick={() => !isGenerating && fileInputRefRef.current?.click()}
                    disabled={isGenerating}
                    className="aspect-video rounded-lg border border-dashed border-[#262626] hover:border-neutral-500 flex flex-col items-center justify-center text-neutral-500 hover:text-white transition-colors bg-[#080808]"
                    title="Add style reference video"
                  >
                    <Layers size={12} />
                    <span className="text-[8px] uppercase tracking-wider mt-1">Ref</span>
                  </button>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRefRef}
                onChange={handleRefFileChange}
                accept="video/*"
                className="hidden"
              />
            </div>
          )}

        </div>
      </aside>

      {/* Main Workspace Stage */}
      <main className="flex-1 flex flex-col bg-black relative min-w-0 h-full overflow-hidden pb-20 lg:pb-0">

        {/* Editorial Top Bar with Mode Switcher & Director Assistant */}
        <header className="h-14 border-b border-[#1a1a1a] flex items-center justify-between px-2.5 sm:px-6 bg-black shrink-0 gap-1.5 sm:gap-2 pt-safe">
          {/* Mobile hamburger & Mode Switcher */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 text-neutral-300 hover:text-white rounded-lg bg-[#121214] border border-[#242428] shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center active:scale-95 transition-transform"
              title="Open Source Media / Keyframes"
              aria-label="Open Keyframes Drawer"
            >
              <Layers size={17} className="text-amber-400" />
            </button>

            {/* Mobile Brand Title */}
            <button
              onClick={() => setIsLogoModalOpen(true)}
              className="flex items-center space-x-1.5 sm:hidden"
            >
              <AuraLogo size={22} showGlow={false} />
            </button>

            {/* Mode Switcher */}
            <div className="flex items-center space-x-0.5 sm:space-x-1.5 bg-[#0e0e10] p-1 rounded-lg border border-[#222226]">
              <button
                onClick={() => setStudioMode('transition')}
                className={`px-2 sm:px-3 py-1 rounded-md text-[10px] sm:text-xs font-semibold uppercase tracking-wider flex items-center space-x-1 sm:space-x-1.5 transition-all min-h-[32px] ${
                  studioMode === 'transition'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Film size={12} strokeWidth={2} />
                <span className="hidden sm:inline">Dual Transition</span>
                <span className="sm:hidden">Dual</span>
              </button>

              <button
                onClick={() => setStudioMode('veo')}
                className={`px-2 sm:px-3 py-1 rounded-md text-[10px] sm:text-xs font-semibold uppercase tracking-wider flex items-center space-x-1 sm:space-x-1.5 transition-all min-h-[32px] ${
                  studioMode === 'veo'
                    ? 'bg-gradient-to-r from-amber-200 to-amber-100 text-black shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Video size={12} strokeWidth={2} />
                <span className="hidden sm:inline">Animate Photo</span>
                <span className="sm:hidden">Photo</span>
              </button>
            </div>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Mobile Quick Action Buttons */}
            <button
              onClick={() => setIsBanglaCareOpen(true)}
              className="lg:hidden text-indigo-400 hover:text-white p-2 rounded-lg bg-[#14141c] border border-[#22222a] min-w-[38px] min-h-[38px] flex items-center justify-center active:scale-95"
              title="Bangla Care AI Agent"
            >
              <Headset size={16} />
            </button>

            <button
              onClick={() => setIsDirectorOpen(true)}
              className="lg:hidden text-violet-300 hover:text-white p-2 rounded-lg bg-[#161022] border border-[#2e2040] min-w-[38px] min-h-[38px] flex items-center justify-center active:scale-95"
              title="AI Director Live Assistant"
            >
              <Sparkles size={16} className="text-violet-400" />
            </button>

            {segments.length > 0 && (
              <button
                onClick={handleExport}
                className="lg:hidden bg-white text-black p-2 rounded-lg min-w-[38px] min-h-[38px] flex items-center justify-center font-bold active:scale-95"
                title="Export Video"
              >
                <Download size={16} />
              </button>
            )}

            <button
              onClick={() => setIsMobileToolsSheetOpen(true)}
              className="lg:hidden text-neutral-300 hover:text-white p-2 rounded-lg bg-[#121216] border border-[#24242e] min-w-[38px] min-h-[38px] flex items-center justify-center active:scale-95"
              title="All Creative Tools"
              aria-label="Open Tools Sheet"
            >
              <MoreVertical size={16} />
            </button>

            {/* Desktop Full Toolbar */}
            <div className="hidden lg:flex items-center space-x-2">
              <button
                onClick={() => setIsUgcModalOpen(true)}
                className="border border-[#143026] bg-[#091a14] text-emerald-300 hover:text-white hover:bg-[#0e261d] hover:border-emerald-500 text-xs px-2.5 sm:px-3 py-1.5 rounded-md transition-all flex items-center space-x-1.5 font-medium uppercase tracking-wider shadow-sm"
                title="Open UGC Prompt Library with authentic Bangladeshi Voiceover generator"
              >
                <Smartphone size={12} className="text-emerald-400" />
                <span>বাংলা UGC Voiceover</span>
              </button>

              <button
                onClick={() => setIsStoryboardOpen(true)}
                className="border border-[#1f2838] bg-[#0d1624] text-cyan-200 hover:text-white hover:bg-[#132238] hover:border-cyan-600 text-xs px-2.5 sm:px-3 py-1.5 rounded-md transition-all flex items-center space-x-1.5 font-medium uppercase tracking-wider shadow-sm"
                title="Open Google Flow Multi-Shot Storyboard"
              >
                <Compass size={12} className="text-cyan-400" />
                <span>Flow Storyboard</span>
              </button>

              <button
                onClick={() => setIsDirectorOpen(true)}
                className="border border-[#2a2238] bg-[#140f1f] text-violet-200 hover:text-white hover:bg-[#1e162f] hover:border-violet-600 text-xs px-2.5 sm:px-3 py-1.5 rounded-md transition-all flex items-center space-x-1.5 font-medium uppercase tracking-wider shadow-sm"
                title="Speak or chat with Aura AI Director (Gemini AI Director)"
              >
                <Sparkles size={12} className="text-violet-400 animate-pulse" />
                <span>AI Director</span>
              </button>

              <button
                onClick={() => setIsShortcutsOpen(true)}
                className="border border-[#24242a] bg-[#101014] text-neutral-400 hover:text-white hover:bg-[#1a1a20] hover:border-neutral-600 text-xs p-1.5 rounded-md transition-all flex items-center justify-center shadow-sm"
                title="Keyboard Shortcuts"
                aria-label="View Keyboard Shortcuts"
              >
                <HelpCircle size={15} />
              </button>

              <button
                onClick={handleStartOver}
                disabled={isGenerating || (!image1 && !image2 && references.length === 0 && segments.length === 0 && !prompt && !technique)}
                className="border border-[#262626] bg-[#0c0c0c] text-neutral-300 hover:text-white hover:bg-[#161616] hover:border-neutral-600 disabled:opacity-30 disabled:hover:bg-[#0c0c0c] disabled:hover:text-neutral-300 disabled:cursor-not-allowed text-xs px-3 py-1.5 rounded-md transition-colors flex items-center space-x-1.5 font-medium uppercase tracking-wider"
                title="Reset frames, prompts, and active sequence"
              >
                <RotateCcw size={12} strokeWidth={2} />
                <span>Start Over</span>
              </button>

              <button
                onClick={handleExport}
                disabled={segments.length === 0 || isGenerating}
                className="border border-neutral-700 bg-white text-black hover:bg-neutral-200 disabled:opacity-20 disabled:hover:bg-white disabled:cursor-not-allowed text-xs px-3.5 py-1.5 rounded-md transition-colors flex items-center space-x-1.5 font-bold uppercase tracking-wider"
              >
                <Download size={13} strokeWidth={2} />
                <span>{segments.length > 1 ? 'Export Takes' : 'Export Sequence'}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Video Canvas Stage with responsive height & width bounding */}
        <div className="flex-1 min-h-0 p-4 lg:p-6 flex flex-col items-center justify-center relative overflow-hidden bg-black">

          <div className="w-full h-full max-w-5xl flex flex-col items-center justify-center min-h-0 gap-3">
            <div className="relative flex-1 min-h-0 w-full flex items-center justify-center">
              <div
                className={`h-full ${
                  studioMode === 'veo' && veoAspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-video'
                } max-w-full max-h-full bg-black rounded-xl overflow-hidden shadow-2xl relative border border-[#222222] ring-1 ring-white/10 flex items-center justify-center group`}
              >

                {segments.length > 0 && segments[selectedSegmentIndex] ? (
                  <video
                    ref={videoRef}
                    key={segments[selectedSegmentIndex].url}
                    src={segments[selectedSegmentIndex].url}
                    className="w-full h-full object-cover cursor-pointer"
                    playsInline
                    loop
                    onClick={togglePlayPause}
                    onTimeUpdate={() => {
                      if (!isScrubbing && videoRef.current) {
                        setCurrentTime(videoRef.current.currentTime);
                      }
                    }}
                    onLoadedMetadata={() => {
                      if (videoRef.current) {
                        setDuration(videoRef.current.duration || 0);
                        setCurrentTime(videoRef.current.currentTime || 0);
                      }
                    }}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => {
                      setIsPlaying(false);
                      if (videoRef.current) {
                        videoRef.current.currentTime = 0;
                        setCurrentTime(0);
                      }
                    }}
                  />
                ) : (
                  <div className="text-center p-8 flex flex-col items-center justify-center text-neutral-400 space-y-3">
                    <div className="w-14 h-14 rounded-full bg-[#111111] border border-neutral-800 flex items-center justify-center text-white shadow-inner">
                      {studioMode === 'veo' ? <Video size={22} strokeWidth={1.5} /> : <Film size={22} strokeWidth={1.5} />}
                    </div>
                    <div className="text-sm font-semibold text-white tracking-wide">
                      {studioMode === 'veo'
                        ? 'Upload a Photo to Animate with Veo 3.1'
                        : 'Load Departure and Arrival Frames'}
                    </div>
                    <p className="text-xs text-neutral-400 max-w-md leading-relaxed">
                      {studioMode === 'veo'
                        ? 'Veo generates realistic cinematic camera motion in 16:9 landscape or 9:16 portrait.'
                        : 'Veo 3.1 bridges both keyframes into a seamless, uncut cinematic trajectory.'}
                    </p>
                  </div>
                )}

                {/* Cinematic Rendering Overlay */}
                {isGenerating && (
                  <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center z-20">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-10 h-10 border-2 border-neutral-800 border-t-white rounded-full animate-spin"></div>
                      <div className="text-center space-y-1">
                        <span className="text-xs font-bold tracking-wider text-white block uppercase">
                          {generatingLabel}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          Synthesizing motion trajectory and optical physics
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Frame-by-Frame Range Scrubber & Transport Console */}
            {!isGenerating && segments.length > 0 && segments[selectedSegmentIndex] && (
              <div className="w-full max-w-3xl bg-[#0c0c0e] border border-[#222225] rounded-xl px-4 py-2.5 shadow-xl flex flex-col gap-2 shrink-0">
                {/* Range Slider Track */}
                <div className="flex items-center space-x-3">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest shrink-0 font-semibold select-none">
                    Scrub
                  </span>
                  <div className="relative flex-1 flex items-center">
                    <input
                      type="range"
                      min={0}
                      max={duration > 0 ? duration : 10}
                      step={1 / fps}
                      value={currentTime}
                      onMouseDown={handleScrubStart}
                      onTouchStart={handleScrubStart}
                      onChange={handleScrubChange}
                      onMouseUp={handleScrubEnd}
                      onTouchEnd={handleScrubEnd}
                      className="frame-scrubber w-full"
                      title="Scrub frame-by-frame (or use Left/Right arrow keys)"
                      aria-label="Frame-by-frame scrub slider"
                    />
                  </div>
                </div>

                {/* Transport Controls & Timecode / Frame Readout */}
                <div className="flex items-center justify-between text-xs text-neutral-400 select-none pt-0.5">
                  {/* Left: Transport buttons */}
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={togglePlayPause}
                      className="h-7 w-7 rounded-md bg-white text-black hover:bg-neutral-200 flex items-center justify-center transition-colors shadow-sm"
                      title={isPlaying ? "Pause (Space)" : "Play (Space)"}
                      aria-label={isPlaying ? "Pause video" : "Play video"}
                    >
                      {isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" className="ml-0.5" />}
                    </button>

                    <button
                      onClick={() => stepFrame(-1)}
                      className="h-7 px-2 rounded-md bg-[#161618] hover:bg-[#202024] hover:text-white border border-[#26262a] text-neutral-300 flex items-center space-x-1 text-[11px] font-mono transition-colors"
                      title="Step backward 1 frame (Left Arrow)"
                      aria-label="Step backward 1 frame"
                    >
                      <ChevronLeft size={13} strokeWidth={2.5} />
                      <span>-1F</span>
                    </button>

                    <button
                      onClick={() => stepFrame(1)}
                      className="h-7 px-2 rounded-md bg-[#161618] hover:bg-[#202024] hover:text-white border border-[#26262a] text-neutral-300 flex items-center space-x-1 text-[11px] font-mono transition-colors"
                      title="Step forward 1 frame (Right Arrow)"
                      aria-label="Step forward 1 frame"
                    >
                      <span>+1F</span>
                      <ChevronRight size={13} strokeWidth={2.5} />
                    </button>

                    <button
                      onClick={() => {
                        if (videoRef.current) {
                          videoRef.current.currentTime = 0;
                          setCurrentTime(0);
                        }
                      }}
                      className="h-7 w-7 rounded-md bg-[#161618] hover:bg-[#202024] hover:text-white border border-[#26262a] text-neutral-300 flex items-center justify-center transition-colors"
                      title="Jump to Start (Home)"
                      aria-label="Jump to start"
                    >
                      <ChevronFirst size={13} />
                    </button>

                    <button
                      onClick={() => {
                        if (videoRef.current) {
                          videoRef.current.currentTime = duration;
                          setCurrentTime(duration);
                        }
                      }}
                      className="h-7 w-7 rounded-md bg-[#161618] hover:bg-[#202024] hover:text-white border border-[#26262a] text-neutral-300 flex items-center justify-center transition-colors"
                      title="Jump to End (End)"
                      aria-label="Jump to end"
                    >
                      <ChevronLast size={13} />
                    </button>
                  </div>

                  {/* Center: Segment indication & Bengali Voiceover Badge */}
                  <div className="hidden sm:flex items-center space-x-2">
                    <span className="text-[10px] tracking-wider uppercase font-mono px-2 py-0.5 rounded bg-[#141416] border border-[#222226] text-neutral-300 font-semibold">
                      {segments[selectedSegmentIndex].kind === 'veo'
                        ? 'Veo Take'
                        : segments[selectedSegmentIndex].kind === 'transition'
                        ? 'Take 01'
                        : `Extension ${selectedSegmentIndex.toString().padStart(2, '0')}`}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-mono">30 FPS</span>

                    {ugcAudioUrl && (
                      <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/80 text-[10px] text-emerald-300 font-mono">
                        <span>🎙️ বাংলা ভয়েসওভার সিঙ্ক</span>
                        <button
                          onClick={() => setUgcAudioUrl(null)}
                          className="text-emerald-400 hover:text-white p-0.5 ml-1"
                          title="Remove voiceover track"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right: Frame Counter and Timecode */}
                  <div className="flex items-center space-x-3 font-mono text-[11px]">
                    <div className="flex items-center space-x-1">
                      <span className="text-neutral-500 text-[9px] uppercase tracking-wider">FRAME</span>
                      <span className="text-white font-bold">{Math.round(currentTime * fps)}</span>
                      <span className="text-neutral-600">/</span>
                      <span className="text-neutral-400">{Math.max(1, Math.round(duration * fps))}</span>
                    </div>

                    <div className="h-3 w-[1px] bg-neutral-800" />

                    <div className="flex items-center space-x-1">
                      <span className="text-white font-bold">{formatTimecode(currentTime)}</span>
                      <span className="text-neutral-600">/</span>
                      <span className="text-neutral-400">{formatTimecode(duration)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Extension Controls below Video (Transition mode only) */}
            {!isGenerating && segments.length > 0 && selectedSegmentIndex === segments.length - 1 && (
              <div className="flex items-center space-x-2.5 w-full max-w-3xl shrink-0">
                <input
                  type="text"
                  value={extendPrompt}
                  onChange={e => setExtendPrompt(e.target.value)}
                  placeholder="Extension notes (lighting, velocity, continuation)..."
                  className="flex-1 bg-[#0c0c0c] border border-[#262626] focus:border-white outline-none rounded-lg text-xs text-white placeholder-neutral-500 px-3.5 py-2 font-normal transition-colors"
                />
                <button
                  onClick={handleExtend}
                  className="bg-white hover:bg-neutral-200 text-black font-bold text-xs px-4 py-2 rounded-lg flex items-center space-x-1.5 transition-all shrink-0 uppercase tracking-wider"
                >
                  <span>Extend +7s</span>
                  <ArrowRight size={12} strokeWidth={2.5} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-red-950/90 border border-red-800 text-red-200 px-5 py-2.5 rounded-lg text-xs max-w-lg text-center backdrop-blur-md shadow-2xl z-50 flex items-center space-x-3">
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-red-200 hover:text-white">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Editorial Control Console */}
        <div className="p-4 lg:px-6 lg:py-4 border-t border-[#1a1a1a] bg-black shrink-0">

          {/* Google Flow Creative Suite */}
          <FlowCreativeSuite
            currentPrompt={prompt}
            onApplyPrompt={(enhanced) => setPrompt(enhanced)}
            mode={studioMode}
            isGenerating={isGenerating}
            isPlayingVideo={isPlaying}
          />

          {/* Technique Selector (Transition Mode only) */}
          {studioMode === 'transition' && (
            <div className="max-w-5xl mx-auto mb-3">
              <div className="mb-2">
                <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">
                  Transition Technique
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {TRANSITIONS.map(t => {
                  const isActive = technique === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTechnique(isActive ? null : t.id)}
                      disabled={isGenerating}
                      title={t.hint}
                      className={`px-3 py-1.5 rounded-md text-xs transition-all duration-150 border disabled:opacity-30 font-medium tracking-wide ${
                        isActive
                          ? 'bg-white border-white text-black shadow-md'
                          : 'border-[#262626] bg-[#0c0c0c] text-neutral-300 hover:border-neutral-500 hover:text-white hover:bg-[#141414]'
                      }`}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Veo Aspect Ratio Selector (Veo Mode only) */}
          {studioMode === 'veo' && (
            <div className="max-w-5xl mx-auto mb-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">
                  Target Format:
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setVeoAspectRatio('16:9')}
                    disabled={isGenerating}
                    className={`px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider transition-all border ${
                      veoAspectRatio === '16:9'
                        ? 'bg-white border-white text-black'
                        : 'border-[#262626] bg-[#0c0c0c] text-neutral-400 hover:text-white'
                    }`}
                  >
                    16:9 Landscape
                  </button>
                  <button
                    onClick={() => setVeoAspectRatio('9:16')}
                    disabled={isGenerating}
                    className={`px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider transition-all border ${
                      veoAspectRatio === '9:16'
                        ? 'bg-white border-white text-black'
                        : 'border-[#262626] bg-[#0c0c0c] text-neutral-400 hover:text-white'
                    }`}
                  >
                    9:16 Portrait
                  </button>
                </div>
              </div>

              <span className="text-[10px] text-amber-200/80 font-mono">
                Model: Veo 3.1
              </span>
            </div>
          )}

          {/* Direction Note and Render Action */}
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:space-x-3">

            {/* Direction Note Input */}
            <div className="flex-1 bg-[#0c0c0c] border border-[#262626] rounded-xl flex items-center px-3.5 sm:px-4 py-2 sm:py-2.5 focus-within:border-white transition-colors">
              <span className="text-[10px] tracking-widest uppercase text-neutral-400 font-mono border-r border-[#262626] pr-2.5 mr-2.5 sm:pr-3 sm:mr-3 shrink-0 font-bold">
                {studioMode === 'veo' ? 'Veo Prompt' : 'Direction Note'}
              </span>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isGenerating}
                className="flex-1 bg-transparent border-none outline-none text-base sm:text-xs text-white placeholder-neutral-500 disabled:opacity-30 font-normal"
                placeholder={
                  studioMode === 'veo'
                    ? "Camera movement, speed, atmospheric lighting (e.g. slow forward drone push, cinematic volumetric haze)..."
                    : "Specify camera pace, velocity, atmospheric lighting, or optical focus..."
                }
              />
            </div>

            {/* Primary Action Button */}
            <button
              onClick={handleGenerate}
              disabled={
                isGenerating ||
                (studioMode === 'transition' && ((!prompt.trim() && !technique) || !image1 || !image2)) ||
                (studioMode === 'veo' && !image1)
              }
              className="w-full sm:w-auto h-12 sm:h-10 bg-white hover:bg-neutral-200 text-black font-bold text-xs sm:text-xs px-6 py-2.5 rounded-xl flex items-center justify-center space-x-2 transition-all disabled:opacity-20 disabled:hover:bg-white disabled:cursor-not-allowed shrink-0 uppercase tracking-wider active:scale-[0.98] shadow-lg"
            >
              <span>{studioMode === 'veo' ? `Animate with Veo (${veoAspectRatio})` : 'Render Transition'}</span>
              <ArrowRight size={13} strokeWidth={2.5} />
            </button>
          </div>

          {/* Sequence Timeline Strip */}
          {segments.length > 0 && (
            <div className="max-w-5xl mx-auto mt-3 pt-3 border-t border-[#1a1a1a] flex items-center text-[11px] text-neutral-400 space-x-4">
              <span className="font-mono text-neutral-300 font-bold">00:00</span>
              <div className="flex-1 flex h-6 bg-[#0c0c0c] border border-[#262626] rounded-md overflow-hidden p-0.5 space-x-1">
                {segments.map((seg, idx) => (
                  <button
                    key={idx}
                    onClick={() => !isGenerating && setSelectedSegmentIndex(idx)}
                    className={`flex-1 h-full rounded cursor-pointer transition-all flex items-center justify-center text-[9px] tracking-wider uppercase font-bold ${
                      selectedSegmentIndex === idx
                        ? 'bg-white text-black'
                        : 'bg-[#181818] text-neutral-300 hover:bg-[#222222]'
                    }`}
                  >
                    {seg.kind === 'veo' ? 'Veo Take' : seg.kind === 'transition' ? `Take 01` : `Extension 0${idx}`}
                  </button>
                ))}
              </div>
              <span className="font-mono text-neutral-300 font-bold">
                {`00:${(segments.length * 10).toString().padStart(2, '0')}`}
              </span>
              <span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Duration</span>
            </div>
          )}

          {/* Policy Disclaimer */}
          <div className="max-w-5xl mx-auto mt-3 pt-2.5 border-t border-[#161616] text-[10px] text-neutral-400 leading-relaxed space-y-0.5">
            <p>
              By using this feature, you confirm that you have the necessary rights to any content that you upload. Do not generate content that infringes on others’ intellectual property or privacy rights. Your use of this generative AI service is subject to our{' '}
              <a
                href="https://policies.google.com/terms/generative-ai/use-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-200 underline underline-offset-2 hover:text-white transition-colors"
              >
                Prohibited Use Policy
              </a>.
            </p>
          </div>
        </div>
      </main>

      {/* ------------------------------------------------------------- */}
      {/* IMAGE STUDIO MODAL (Create & Edit with gemini-3.1-flash-image-preview) */}
      {/* ------------------------------------------------------------- */}
      {imageModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#101012] border border-[#242428] rounded-2xl w-full max-w-lg p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#222226]">
              <div className="flex items-center space-x-2">
                <Wand2 size={16} className="text-violet-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  {imageModal.mode === 'create' ? 'Create Keyframe' : 'Edit Keyframe'}
                </h3>
                <span className="text-[10px] text-neutral-400 font-mono px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800">
                  gemini-3.1-flash-image-preview
                </span>
              </div>
              <button
                onClick={() => !isImageProcessing && setImageModal(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-neutral-300 font-medium">
                {imageModal.mode === 'create'
                  ? 'Describe the frame you want to generate:'
                  : 'Describe how you want to modify this frame:'}
              </label>
              <textarea
                value={imageModalPrompt}
                onChange={e => setImageModalPrompt(e.target.value)}
                disabled={isImageProcessing}
                placeholder={
                  imageModal.mode === 'create'
                    ? "Hyperrealistic cinematic shot, 35mm lens, golden hour sunlight reflecting off a glass skyscraper..."
                    : "Add volumetric fog and change time of day to twilight with warm streetlights..."
                }
                rows={3}
                className="w-full bg-[#161618] border border-[#2a2a2e] focus:border-white outline-none rounded-xl p-3 text-xs text-white placeholder-neutral-500 font-normal resize-none"
              />
            </div>

            {/* Quick Inspiration Chips */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">
                Quick Directions:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Cinematic 35mm golden hour portrait",
                  "Cyberpunk rainy alleyway with neon signs",
                  "Dramatic alpine mountain pass with morning fog",
                  "Sci-fi spaceship command bridge interior"
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setImageModalPrompt(preset)}
                    className="text-[10px] bg-[#1a1a1e] hover:bg-[#26262c] text-neutral-300 hover:text-white px-2 py-1 rounded-md border border-[#2a2a30] transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {imageModalError && (
              <div className="text-red-400 text-xs bg-red-950/50 p-2.5 rounded-lg border border-red-900/80">
                {imageModalError}
              </div>
            )}

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#222226]">
              <button
                type="button"
                onClick={() => setImageModal(null)}
                disabled={isImageProcessing}
                className="px-3.5 py-2 text-xs text-neutral-400 hover:text-white font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteImageAction}
                disabled={isImageProcessing || !imageModalPrompt.trim()}
                className="bg-white hover:bg-neutral-200 disabled:opacity-30 text-black text-xs font-bold px-4 py-2 rounded-lg flex items-center space-x-1.5 uppercase tracking-wider transition-colors"
              >
                {isImageProcessing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin mr-1"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Check size={13} strokeWidth={2.5} />
                    <span>{imageModal.mode === 'create' ? 'Generate Frame' : 'Apply Edit'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* AI DIRECTOR CONVERSATION PANEL (Gemini AI Director) */}
      {/* ------------------------------------------------------------- */}
      {isDirectorOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 lg:hidden"
            onClick={() => setIsDirectorOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-[#0c0c0e] border-l border-[#222226] z-50 shadow-2xl flex flex-col pt-safe pb-safe">
          {/* Header */}
          <div className="h-14 border-b border-[#222226] px-4 flex items-center justify-between bg-black shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white">
                <Sparkles size={14} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  AI Director
                </h3>
                <span className="text-[10px] text-neutral-400">Gemini AI Director</span>
              </div>
            </div>
            <button
              onClick={() => setIsDirectorOpen(false)}
              className="text-neutral-400 hover:text-white p-1"
            >
              <X size={16} />
            </button>
          </div>

          {/* Conversation history */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {directorMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-neutral-800 text-white'
                      : 'bg-[#18181c] border border-[#2a2a30] text-neutral-200'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
                {msg.role === 'model' && (
                  <button
                    onClick={() => {
                      setPrompt(msg.text.slice(0, 200).replace(/\n/g, ' '));
                    }}
                    className="text-[10px] text-violet-400 hover:text-violet-300 mt-1 pl-1 flex items-center space-x-1"
                  >
                    <span>Use as Direction Note</span>
                    <ArrowRight size={10} />
                  </button>
                )}
              </div>
            ))}
            {isDirectorLoading && (
              <div className="flex items-center space-x-2 text-neutral-400 text-xs py-2">
                <div className="w-2 h-2 rounded-full bg-violet-400 animate-ping"></div>
                <span>Director is contemplating shot physics...</span>
              </div>
            )}
          </div>

          {/* Quick Director Suggestions */}
          <div className="p-3 border-t border-[#1e1e22] bg-[#0a0a0c] space-y-1.5 shrink-0">
            <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold">
              Director Prompts:
            </span>
            <div className="flex flex-col gap-1">
              {[
                "Suggest a smooth whip pan direction note",
                "How should I animate this photo with Veo 3.1?",
                "Give me a prompt for an object portal transition"
              ].map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSendDirectorMessage(q)}
                  className="text-left text-[11px] text-neutral-400 hover:text-white truncate hover:underline"
                >
                  › {q}
                </button>
              ))}
            </div>
          </div>

          {/* Voice Input & Text Input Bar */}
          <div className="p-3 border-t border-[#222226] bg-black shrink-0 flex items-center space-x-2">
            <button
              onClick={toggleListening}
              className={`p-2.5 rounded-lg border transition-all ${
                isListening
                  ? 'bg-red-600 border-red-500 text-white animate-pulse'
                  : 'bg-[#161618] border-[#2a2a2e] text-neutral-300 hover:text-white'
              }`}
              title={isListening ? "Listening... click to stop" : "Speak to AI Director"}
            >
              {isListening ? <MicOff size={15} /> : <Mic size={15} />}
            </button>

            <input
              type="text"
              value={directorInput}
              onChange={e => setDirectorInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendDirectorMessage(directorInput);
                }
              }}
              placeholder="Ask Director for shot guidance..."
              className="flex-1 bg-[#121214] border border-[#26262a] focus:border-white outline-none rounded-lg text-xs text-white placeholder-neutral-500 px-3 py-2 transition-colors font-normal"
            />

            <button
              onClick={() => handleSendDirectorMessage(directorInput)}
              disabled={!directorInput.trim() || isDirectorLoading}
              className="p-2.5 bg-white text-black hover:bg-neutral-200 disabled:opacity-30 rounded-lg transition-colors"
            >
              <Send size={13} />
            </button>
          </div>
        </div>
        </>
      )}

      {/* Aura Studio Brand Logo Modal */}
      <AuraLogoModal isOpen={isLogoModalOpen} onClose={() => setIsLogoModalOpen(false)} />

      {/* Google Flow Storyboard Modal */}
      <FlowStoryboardModal
        isOpen={isStoryboardOpen}
        onClose={() => setIsStoryboardOpen(false)}
        onApplySequenceShot={(p, t, img) => {
          setPrompt(p);
          setTechnique(t);
          if (img && studioMode === 'veo') {
            setImage1({ url: img, data: '', mimeType: 'image/jpeg' });
          }
        }}
        headImage={image1?.url}
        tailImage={image2?.url}
      />

      <BanglaCustomerCare
        isOpen={isBanglaCareOpen}
        onClose={() => setIsBanglaCareOpen(false)}
      />

      {isAutomationDashboardOpen && (
        <div className="fixed inset-0 z-50 bg-[#0a0a0d] flex flex-col pt-safe pb-safe">
          <div className="p-3 border-b border-[#22222a] flex items-center justify-between bg-[#121217]">
            <div className="flex items-center space-x-2">
              <Database className="text-green-400" size={18} />
              <span className="text-sm font-bold text-white uppercase tracking-wider">Automation Pipeline</span>
            </div>
            <button
              onClick={() => setIsAutomationDashboardOpen(false)}
              className="p-2 text-neutral-400 hover:text-white rounded-lg bg-[#1a1a22] min-w-[40px] min-h-[40px] flex items-center justify-center active:scale-95"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <AutomationDashboard />
          </div>
        </div>
      )}

      {isSettingsOpen && (
        <GoogleFlowSettings onClose={() => setIsSettingsOpen(false)} />
      )}

      {/* ------------------------------------------------------------- */}
      {/* 100% MOBILE ERGONOMIC BOTTOM NAVIGATION BAR (Android & iOS) */}
      {/* ------------------------------------------------------------- */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0c0c10]/95 backdrop-blur-xl border-t border-[#1e1e26] pb-safe px-1.5 flex items-center justify-around select-none h-16">
        {/* Tab 1: Studio */}
        <button
          onClick={() => {
            setMobileTab('studio');
            setIsMobileSidebarOpen(false);
            setIsMobileArchiveOpen(false);
            setIsMobileToolsSheetOpen(false);
            setIsMobileRigSheetOpen(false);
          }}
          className={`flex-1 flex flex-col items-center justify-center py-1 min-h-[48px] rounded-lg transition-all active:scale-95 ${
            mobileTab === 'studio' && !isMobileSidebarOpen && !isMobileArchiveOpen && !isMobileToolsSheetOpen && !isMobileRigSheetOpen
              ? 'text-white font-bold'
              : 'text-neutral-400 hover:text-white'
          }`}
          title="Studio Stage"
        >
          <Film size={18} className={mobileTab === 'studio' && !isMobileSidebarOpen && !isMobileArchiveOpen && !isMobileToolsSheetOpen && !isMobileRigSheetOpen ? 'text-white' : 'text-neutral-400'} />
          <span className="text-[10px] tracking-wider uppercase font-semibold mt-1">Studio</span>
        </button>

        {/* Tab 2: Frames / Media */}
        <button
          onClick={() => {
            setMobileTab('media');
            setIsMobileSidebarOpen(true);
            setIsMobileArchiveOpen(false);
            setIsMobileToolsSheetOpen(false);
            setIsMobileRigSheetOpen(false);
          }}
          className={`flex-1 flex flex-col items-center justify-center py-1 min-h-[48px] rounded-lg transition-all active:scale-95 relative ${
            isMobileSidebarOpen ? 'text-amber-400 font-bold' : 'text-neutral-400 hover:text-white'
          }`}
          title="Keyframe Photos & Media"
        >
          <Layers size={18} className={isMobileSidebarOpen ? 'text-amber-400' : 'text-neutral-400'} />
          <span className="text-[10px] tracking-wider uppercase font-semibold mt-1">Frames</span>
          {(image1 || image2) && (
            <span className="absolute top-1.5 right-1/4 w-2 h-2 rounded-full bg-amber-400"></span>
          )}
        </button>

        {/* Tab 3: Creative Rig */}
        <button
          onClick={() => {
            setMobileTab('rig');
            setIsMobileRigSheetOpen(true);
            setIsMobileSidebarOpen(false);
            setIsMobileArchiveOpen(false);
            setIsMobileToolsSheetOpen(false);
          }}
          className={`flex-1 flex flex-col items-center justify-center py-1 min-h-[48px] rounded-lg transition-all active:scale-95 ${
            isMobileRigSheetOpen ? 'text-cyan-400 font-bold' : 'text-neutral-400 hover:text-white'
          }`}
          title="Camera Rig & Lenses"
        >
          <SlidersHorizontal size={18} className={isMobileRigSheetOpen ? 'text-cyan-400' : 'text-neutral-400'} />
          <span className="text-[10px] tracking-wider uppercase font-semibold mt-1">Rig</span>
        </button>

        {/* Tab 4: Tools Hub */}
        <button
          onClick={() => {
            setMobileTab('tools');
            setIsMobileToolsSheetOpen(true);
            setIsMobileSidebarOpen(false);
            setIsMobileArchiveOpen(false);
            setIsMobileRigSheetOpen(false);
          }}
          className={`flex-1 flex flex-col items-center justify-center py-1 min-h-[48px] rounded-lg transition-all active:scale-95 ${
            isMobileToolsSheetOpen ? 'text-violet-400 font-bold' : 'text-neutral-400 hover:text-white'
          }`}
          title="Creative Suites & Live Director"
        >
          <Sparkles size={18} className={isMobileToolsSheetOpen ? 'text-violet-400' : 'text-neutral-400'} />
          <span className="text-[10px] tracking-wider uppercase font-semibold mt-1">Tools</span>
        </button>

        {/* Tab 5: Archive */}
        <button
          onClick={() => {
            setMobileTab('archive');
            setIsMobileArchiveOpen(true);
            setIsMobileSidebarOpen(false);
            setIsMobileToolsSheetOpen(false);
            setIsMobileRigSheetOpen(false);
          }}
          className={`flex-1 flex flex-col items-center justify-center py-1 min-h-[48px] rounded-lg transition-all active:scale-95 relative ${
            isMobileArchiveOpen ? 'text-emerald-400 font-bold' : 'text-neutral-400 hover:text-white'
          }`}
          title="Reel Takes Archive"
        >
          <Clock size={18} className={isMobileArchiveOpen ? 'text-emerald-400' : 'text-neutral-400'} />
          <span className="text-[10px] tracking-wider uppercase font-semibold mt-1">Archive</span>
          {history.length > 0 && (
            <span className="absolute top-1 right-2 bg-emerald-500 text-black text-[9px] font-mono font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
              {history.length}
            </span>
          )}
        </button>
      </nav>

      {/* ------------------------------------------------------------- */}
      {/* MOBILE TOOLS HUB BOTTOM SHEET */}
      {/* ------------------------------------------------------------- */}
      {isMobileToolsSheetOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end lg:hidden">
          <div
            className="flex-1"
            onClick={() => setIsMobileToolsSheetOpen(false)}
          />
          <div className="bg-[#0e0e12] border-t border-[#24242e] rounded-t-3xl p-4 pb-safe space-y-4 max-h-[85dvh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            {/* Grab handle bar */}
            <div className="w-10 h-1.5 bg-neutral-700 rounded-full mx-auto" />

            <div className="flex items-center justify-between pb-2 border-b border-[#1c1c24]">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Aura Creative Tools</h3>
                <p className="text-[11px] text-neutral-400">Launch specialised creative suites</p>
              </div>
              <button
                onClick={() => setIsMobileToolsSheetOpen(false)}
                className="p-2 text-neutral-400 hover:text-white rounded-lg bg-[#16161c] min-w-[38px] min-h-[38px] flex items-center justify-center active:scale-95"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Tool 1: UGC Voiceover */}
              <button
                onClick={() => {
                  setIsMobileToolsSheetOpen(false);
                  setIsUgcModalOpen(true);
                }}
                className="p-3.5 rounded-xl border border-[#163328] bg-[#0c1f18] hover:border-emerald-500 flex items-center space-x-3 text-left transition-all active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-950 border border-emerald-700 flex items-center justify-center text-emerald-300 shrink-0">
                  <Smartphone size={20} />
                </div>
                <div>
                  <div className="text-xs font-bold text-white uppercase tracking-wider">বাংলা UGC Voiceover</div>
                  <div className="text-[10px] text-emerald-300/80">Authentic Bangladeshi dialects & TikTok hooks</div>
                </div>
              </button>

              {/* Tool 2: Flow Storyboard */}
              <button
                onClick={() => {
                  setIsMobileToolsSheetOpen(false);
                  setIsStoryboardOpen(true);
                }}
                className="p-3.5 rounded-xl border border-[#1a2c3d] bg-[#0d1824] hover:border-cyan-500 flex items-center space-x-3 text-left transition-all active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-lg bg-cyan-950 border border-cyan-700 flex items-center justify-center text-cyan-300 shrink-0">
                  <Compass size={20} />
                </div>
                <div>
                  <div className="text-xs font-bold text-white uppercase tracking-wider">Flow Storyboard</div>
                  <div className="text-[10px] text-cyan-300/80">Multi-shot visual sequence orchestrator</div>
                </div>
              </button>

              {/* Tool 3: AI Director */}
              <button
                onClick={() => {
                  setIsMobileToolsSheetOpen(false);
                  setIsDirectorOpen(true);
                }}
                className="p-3.5 rounded-xl border border-[#2d1e3d] bg-[#160f22] hover:border-violet-500 flex items-center space-x-3 text-left transition-all active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-lg bg-violet-950 border border-violet-700 flex items-center justify-center text-violet-300 shrink-0">
                  <Sparkles size={20} />
                </div>
                <div>
                  <div className="text-xs font-bold text-white uppercase tracking-wider">AI Director Live</div>
                  <div className="text-[10px] text-violet-300/80">Voice & chat shot physics director</div>
                </div>
              </button>

              {/* Tool 4: Bangla Care Agent */}
              <button
                onClick={() => {
                  setIsMobileToolsSheetOpen(false);
                  setIsBanglaCareOpen(true);
                }}
                className="p-3.5 rounded-xl border border-[#23203f] bg-[#121020] hover:border-indigo-500 flex items-center space-x-3 text-left transition-all active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-950 border border-indigo-700 flex items-center justify-center text-indigo-300 shrink-0">
                  <Headset size={20} />
                </div>
                <div>
                  <div className="text-xs font-bold text-white uppercase tracking-wider">Bangla Customer Care</div>
                  <div className="text-[10px] text-indigo-300/80">Live telephone agent Raha with voice & billing</div>
                </div>
              </button>

              {/* Tool 5: Automation Dashboard */}
              <button
                onClick={() => {
                  setIsMobileToolsSheetOpen(false);
                  setIsAutomationDashboardOpen(true);
                }}
                className="p-3.5 rounded-xl border border-[#1e2a20] bg-[#0e1610] hover:border-green-500 flex items-center space-x-3 text-left transition-all active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-lg bg-green-950 border border-green-700 flex items-center justify-center text-green-300 shrink-0">
                  <Database size={20} />
                </div>
                <div>
                  <div className="text-xs font-bold text-white uppercase tracking-wider">Automation Pipeline</div>
                  <div className="text-[10px] text-green-300/80">Real-time outbound call management</div>
                </div>
              </button>

              {/* Tool 6: Brand Logo Atelier */}
              <button
                onClick={() => {
                  setIsMobileToolsSheetOpen(false);
                  setIsLogoModalOpen(true);
                }}
                className="p-3.5 rounded-xl border border-[#22222a] bg-[#121217] hover:border-neutral-500 flex items-center space-x-3 text-left transition-all active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center justify-center text-white shrink-0">
                  <AuraLogo size={24} showGlow={false} />
                </div>
                <div>
                  <div className="text-xs font-bold text-white uppercase tracking-wider">Aura Brand Assets</div>
                  <div className="text-[10px] text-neutral-400">High-res logos & SVG / PNG exports</div>
                </div>
              </button>
            </div>

            {/* Quick Session Actions */}
            <div className="pt-2 border-t border-[#1c1c24] flex items-center gap-2">
              <button
                onClick={() => {
                  setIsMobileToolsSheetOpen(false);
                  setIsSettingsOpen(true);
                }}
                className="flex-1 py-2.5 px-3 rounded-lg bg-[#141418] border border-[#24242e] text-neutral-300 text-xs font-semibold flex items-center justify-center space-x-1.5 active:scale-95"
              >
                <Settings size={14} />
                <span>Engine Settings</span>
              </button>

              <button
                onClick={() => {
                  setIsMobileToolsSheetOpen(false);
                  handleStartOver();
                }}
                className="py-2.5 px-4 rounded-lg bg-[#1a1414] border border-[#332222] text-red-300 text-xs font-semibold flex items-center justify-center space-x-1.5 active:scale-95"
              >
                <RotateCcw size={14} />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MOBILE REEL ARCHIVE BOTTOM SHEET */}
      {/* ------------------------------------------------------------- */}
      {isMobileArchiveOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end lg:hidden">
          <div
            className="flex-1"
            onClick={() => setIsMobileArchiveOpen(false)}
          />
          <div className="bg-[#0e0e12] border-t border-[#24242e] rounded-t-3xl p-4 pb-safe space-y-4 max-h-[85dvh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            {/* Grab handle bar */}
            <div className="w-10 h-1.5 bg-neutral-700 rounded-full mx-auto" />

            <div className="flex items-center justify-between pb-2 border-b border-[#1c1c24]">
              <div className="flex items-center space-x-2">
                <Clock size={16} className="text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Reel Archive ({history.length})
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                {history.length > 0 && (
                  <button
                    onClick={handleExport}
                    className="px-3 py-1.5 rounded-lg bg-white text-black font-bold text-xs uppercase tracking-wider flex items-center space-x-1 active:scale-95"
                  >
                    <Download size={13} />
                    <span>Export Takes</span>
                  </button>
                )}
                <button
                  onClick={() => setIsMobileArchiveOpen(false)}
                  className="p-2 text-neutral-400 hover:text-white rounded-lg bg-[#16161c] min-w-[38px] min-h-[38px] flex items-center justify-center active:scale-95"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {history.length === 0 ? (
              <div className="text-center py-12 px-4 text-neutral-400 space-y-2">
                <Clock size={32} className="mx-auto text-neutral-600" />
                <p className="text-xs">No takes rendered yet in this session.</p>
                <p className="text-[11px] text-neutral-500">Render your first video in Studio to save takes here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map(item => {
                  const isSelected = activeHistoryId === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSegments(item.segments);
                        setPrompt(item.prompt);
                        setActiveHistoryId(item.id);
                        setSelectedSegmentIndex(0);
                        setIsMobileArchiveOpen(false);
                      }}
                      className={`p-3 rounded-xl border cursor-pointer transition-all active:scale-[0.99] ${
                        isSelected
                          ? 'border-white bg-[#16161a]'
                          : 'border-[#222228] bg-[#0c0c10] hover:border-neutral-500'
                      }`}
                    >
                      <div className="aspect-video bg-black rounded-lg overflow-hidden mb-2 relative group border border-[#1f1f1f]">
                        {item.segments[0] && (
                          <video src={item.segments[0].url} className="w-full h-full object-cover" />
                        )}
                        {item.segments.length > 1 && (
                          <div className="absolute bottom-1.5 right-1.5 bg-black/90 border border-neutral-700 px-1.5 py-0.5 rounded text-[9px] text-white font-bold">
                            {item.segments.length} segments
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <Play size={20} className="text-white fill-white" />
                        </div>
                      </div>
                      <p className="text-xs text-neutral-200 line-clamp-2 leading-relaxed font-medium">
                        {item.prompt}
                      </p>
                      <div className="text-[10px] text-neutral-400 mt-2 flex items-center justify-between font-mono">
                        <span>{item.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        <span className="text-emerald-400 font-bold uppercase tracking-wider text-[10px]">Tap to Recall</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MOBILE CREATIVE RIG BOTTOM SHEET */}
      {/* ------------------------------------------------------------- */}
      {isMobileRigSheetOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end lg:hidden">
          <div
            className="flex-1"
            onClick={() => setIsMobileRigSheetOpen(false)}
          />
          <div className="bg-[#0e0e12] border-t border-[#24242e] rounded-t-3xl p-4 pb-safe space-y-3 max-h-[85dvh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            {/* Grab handle bar */}
            <div className="w-10 h-1.5 bg-neutral-700 rounded-full mx-auto" />

            <div className="flex items-center justify-between pb-2 border-b border-[#1c1c24]">
              <div className="flex items-center space-x-2">
                <SlidersHorizontal size={16} className="text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Flow Creative Rig
                </h3>
              </div>
              <button
                onClick={() => setIsMobileRigSheetOpen(false)}
                className="p-2 text-neutral-400 hover:text-white rounded-lg bg-[#16161c] min-w-[38px] min-h-[38px] flex items-center justify-center active:scale-95"
              >
                <X size={18} />
              </button>
            </div>

            <FlowCreativeSuite
              currentPrompt={prompt}
              onApplyPrompt={(enhanced) => {
                setPrompt(enhanced);
                setIsMobileRigSheetOpen(false);
              }}
              mode={studioMode}
              isGenerating={isGenerating}
              isPlayingVideo={isPlaying}
            />

            <button
              onClick={() => setIsMobileRigSheetOpen(false)}
              className="w-full py-3 rounded-xl bg-white text-black font-bold text-xs uppercase tracking-wider shadow-lg active:scale-95"
            >
              Done / Return to Studio
            </button>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help Modal */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* UGC & Bangladeshi Voiceover Suite */}
      <UgcVoiceoverSuite
        isOpen={isUgcModalOpen}
        onClose={() => setIsUgcModalOpen(false)}
        onApplyUgcToStudio={(videoPrompt, aspect, voiceAudio) => {
          setPrompt(videoPrompt);
          setStudioMode('veo');
          setVeoAspectRatio(aspect);
          if (voiceAudio) {
            setUgcAudioUrl(voiceAudio);
          }
        }}
        activeVideoPlaying={isPlaying}
      />

      {/* Hidden audio element for Bengali voiceover track */}
      <audio
        ref={ugcAudioRef}
        src={ugcAudioUrl || undefined}
        onEnded={() => {
          if (ugcAudioRef.current) {
            ugcAudioRef.current.currentTime = 0;
          }
        }}
      />

    </div>
  );
}
