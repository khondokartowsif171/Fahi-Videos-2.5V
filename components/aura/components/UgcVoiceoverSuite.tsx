import { auraFetch as fetch } from '../api-client';
import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Sparkles,
  Mic,
  Play,
  Pause,
  Download,
  Volume2,
  RotateCcw,
  Check,
  Smartphone,
  ArrowRight,
  Video,
  Languages,
  Flame,
  ShoppingBag,
  Utensils,
  Coffee,
  Laptop,
  Smile,
  Plus,
  Trash2
} from 'lucide-react';

interface UgcVoiceoverSuiteProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyUgcToStudio: (videoPrompt: string, aspectRatio: '9:16' | '16:9', voiceAudioUrl?: string) => void;
  activeVideoPlaying: boolean;
}

export interface UgcTemplate {
  id: string;
  category: string;
  title: string;
  bengaliHook: string;
  videoPrompt: string;
  suggestedScript: string;
  aspectRatio: '9:16' | '16:9';
  icon: string;
  isCustom?: boolean;
}

const INITIAL_UGC_TEMPLATES: UgcTemplate[] = [
  {
    id: 'dhaka-food-viral',
    category: 'Food Vlog',
    title: 'Puran Dhaka Biryani Viral Taste Test',
    bengaliHook: 'দাঁড়ান! পুরান ঢাকার এই বিরিয়ানি না খেলে আপনার জীবনই বৃথা!',
    videoPrompt: 'Authentic handheld iPhone 16 front-cam POV, passionate Bangladeshi foodie holding a sizzling brass plate of Puran Dhaka Kacchi Biryani, rich steaming rice and tender meat, bustling restaurant ambient lighting, real natural motion blur and organic smiles',
    suggestedScript: 'দাঁড়ান! পুরান ঢাকার এই স্পেশাল বিরিয়ানি না খেলে আপনার জিন্দেগীই বৃথা! দেখছেন গোশতটা কতটা সফট আর জুসি? এক কামড়েই জাস্ট মুখে গলে যাবে! ভাই অস্থির!',
    aspectRatio: '9:16',
    icon: 'utensils'
  },
  {
    id: 'tech-gadget-review',
    category: 'Tech Review',
    title: 'Budget Flagship Smartphone Unboxing',
    bengaliHook: 'এই প্রাইস পয়েন্টে এর চেয়ে জোশ ফোন আর নাই!',
    videoPrompt: 'Desk flat-lay macro shot of hands unboxing a sleek new metallic smartphone box, peeling transparent screen protective film, soft diffused ring light reflection, authentic tech creator aesthetic with mechanical keyboard in background',
    suggestedScript: 'আসসালামু আলাইকুম বন্ধুরা! আজকের এই বক্সে আছে এমন এক গ্যাজেট যা আপনার লাইফ চেঞ্জ করে দেবে। এই বাজেটে এর চেয়ে বেটার ক্যামেরা পারফরম্যান্স আপনি কোথাও পাবেন না। লেটস চেক ইট আউট!',
    aspectRatio: '9:16',
    icon: 'laptop'
  },
  {
    id: 'dhaka-lifestyle-grwm',
    category: 'Lifestyle / GRWM',
    title: 'Dhaka City Vlogger Evening GRWM',
    bengaliHook: 'হে এভরিওয়ান! আজকে ধানমন্ডি লেকে যাওয়ার জন্য রেডি হই...',
    videoPrompt: 'Casual bedroom mirror selfie video, cheerful Bangladeshi girl creator smiling and styling traditional pastel ethnic jacket, warm natural window light, aesthetic cozy room background, authentic TikTok creator cadence',
    suggestedScript: 'হে এভরিওয়ান! আজকে এক বন্ধুর সাথে ধানমন্ডি লেকে ঘুরতে যাচ্ছি, তাই ভাবলাম আপনাদের সাথে একটা কুইক জিআরডব্লিউএম শেয়ার করি। এই কম্বিনেশনটা কেমন লাগছে? কমেন্টে জানান তো!',
    aspectRatio: '9:16',
    icon: 'coffee'
  },
  {
    id: 'viral-problem-solver',
    category: 'Product Ad',
    title: 'Viral E-Commerce Problem & Solution',
    bengaliHook: 'ভিডিওটা স্কিপ করবেন না! আপনারও কি প্রতিদিন এই সমস্যা হয়?',
    videoPrompt: 'Punchy eye-level selfie camera shot of creator looking directly into camera with shocked expressive face, holding a clever minimalist lifestyle gadget, clean modern apartment interior, vibrant crisp social-ad lighting',
    suggestedScript: 'ভিডিওটা ভুলেও স্কিপ করবেন না! আপনিও কি প্রতিদিন এই সেইম ঝামেলায় পড়েন? আমি ফাইনালি এমন একটা সমাধান পাইছি যা আমার লাইফ একদম সহজ করে দিছে! জাস্ট ওয়াও!',
    aspectRatio: '9:16',
    icon: 'shopping-bag'
  },
  {
    id: 'street-rickshaw-vlog',
    category: 'Travel & Street',
    title: 'POV Dhaka Rickshaw Sunset Ride',
    bengaliHook: 'ঢাকার এই পড়ন্ত বিকেলটা জাস্ট একটা ইমোশন...',
    videoPrompt: 'First-person POV riding on a traditional painted Dhaka rickshaw through breezy boulevard at golden hour sunset, warm golden rays reflecting on hood, soft bokeh of evening traffic and city silhouettes, cinematic authentic street documentary',
    suggestedScript: 'ঢাকার এই মিষ্টি পড়ন্ত বিকেলটা জাস্ট একটা ইমোশন ভাই! বাতাস, চারপাশের কোলাহল আর সূর্যাস্তের রঙ—মন খারাপ থাকলেও সব ভালো হয়ে যায়।',
    aspectRatio: '9:16',
    icon: 'flame'
  },
  {
    id: 'before-after-makeover',
    category: 'Transformation',
    title: 'Snappy Snap Before & After Room Setup',
    bengaliHook: '১ সেকেন্ডে মেস রুম থেকে সাইবারপাঙ্ক স্টুডিও!',
    videoPrompt: 'Quick snappy transition: Creator snaps fingers in front of camera, room lighting instantly switches from messy daylight room into a glowing neon purple/cyan cyberpunk gaming studio with glowing monitor light bars',
    suggestedScript: 'এক তুড়িতে পুরো রুমের লুক চেঞ্জ! বিশ্বাস হচ্ছে না তো? এই দেখুন বিফোর অ্যান্ড আফটার! কোন লুকটা আপনাদের বেশি জোশ লাগছে?',
    aspectRatio: '9:16',
    icon: 'smile'
  },
  {
    id: 'customer-support-helpful',
    category: 'Customer Care',
    title: 'Support Quick Solution',
    bengaliHook: 'হ্যালো! আমরা আপনাকে কিভাবে সাহায্য করতে পারি?',
    videoPrompt: 'Friendly customer service rep smiling at camera, sitting in a clean bright office, holding a tablet showing an order status, professional but warm and authentic Bengali vibe',
    suggestedScript: 'হ্যালো! আপনার সমস্যার সমাধান কি এখনো পাননি? নো চিন্তা! আমরা আপনাকে সাহায্য করার জন্য আছি। জাস্ট ডিটেইলস দিন, আমরা এখনই চেক করে দিচ্ছি!',
    aspectRatio: '9:16',
    icon: 'headset'
  },
  {
    id: 'service-testimonial',
    category: 'Testimonial',
    title: 'Real User Feedback',
    bengaliHook: 'ভাই, ওদের সার্ভিস জাস্ট দারুণ!',
    videoPrompt: 'Authentic selfie video of a happy customer standing on a street in Dhaka, holding their phone, looking genuinely thrilled, natural outdoor lighting, bustling background',
    suggestedScript: 'আমি তো একদম অবাক! এতো কম সময়ে সার্ভিস পাবো ভাবিইনি। ভাই, ওদের সার্ভিস জাস্ট দারুণ! আপনারা ট্রাই করে দেখতে পারেন, হাইলি রিকমেন্ডেড!',
    aspectRatio: '9:16',
    icon: 'check-circle'
  }
];

export default function UgcVoiceoverSuite({
  isOpen,
  onClose,
  onApplyUgcToStudio,
  activeVideoPlaying
}: UgcVoiceoverSuiteProps) {
  const [templates, setTemplates] = useState<UgcTemplate[]>(() => {
    try {
      const saved = localStorage.getItem('aura_custom_ugc_templates');
      if (saved) {
        const parsed = JSON.parse(saved);
        return [...INITIAL_UGC_TEMPLATES, ...parsed];
      }
    } catch (e) {}
    return INITIAL_UGC_TEMPLATES;
  });

  const [selectedTemplate, setSelectedTemplate] = useState<UgcTemplate>(INITIAL_UGC_TEMPLATES[0]);
  const [customTopic, setCustomTopic] = useState('');
  const [selectedTone, setSelectedTone] = useState<'energetic_creator' | 'dhaka_foodie' | 'tech_reviewer' | 'lifestyle_grwm' | 'customer_care_support' | 'positive_testimonial'>('energetic_creator');
  const [voiceName, setVoiceName] = useState<'Puck' | 'Kore' | 'Aoede' | 'Charon'>('Puck');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  // Mobile Tab view (100% Mobile Responsive)
  const [mobileTab, setMobileTab] = useState<'library' | 'studio'>('studio');

  // Script and Audio State (Zero hardcoded)
  const [scriptText, setScriptText] = useState(INITIAL_UGC_TEMPLATES[0].suggestedScript);
  const [videoPromptText, setVideoPromptText] = useState(INITIAL_UGC_TEMPLATES[0].videoPrompt);
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9'>('9:16');

  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [syncWithVideo, setSyncWithVideo] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sync audio with video playback if enabled
  useEffect(() => {
    if (syncWithVideo && audioUrl && audioRef.current) {
      if (activeVideoPlaying) {
        audioRef.current.currentTime = 0;
        audioRef.current.playbackRate = playbackSpeed;
        audioRef.current.play().catch(() => {});
        setIsPlayingAudio(true);
      } else {
        audioRef.current.pause();
        setIsPlayingAudio(false);
      }
    }
  }, [activeVideoPlaying, syncWithVideo, audioUrl, playbackSpeed]);

  if (!isOpen) return null;

  const handleSelectTemplate = (template: UgcTemplate) => {
    setSelectedTemplate(template);
    setScriptText(template.suggestedScript);
    setVideoPromptText(template.videoPrompt);
    setAspectRatio(template.aspectRatio);
    setAudioUrl(null);
    setMobileTab('studio');
  };

  // Add Custom UGC Format (Zero Hardcoded!)
  const handleAddNewTemplate = () => {
    const newTemplate: UgcTemplate = {
      id: `custom-${Date.now()}`,
      category: 'Custom UGC',
      title: customTopic.trim() ? customTopic.trim() : 'New Custom Bengali UGC',
      bengaliHook: scriptText.slice(0, 35) + '...',
      videoPrompt: videoPromptText,
      suggestedScript: scriptText,
      aspectRatio,
      icon: 'sparkles',
      isCustom: true
    };
    const updated = [...templates, newTemplate];
    setTemplates(updated);
    try {
      const customOnly = updated.filter(t => t.isCustom);
      localStorage.setItem('aura_custom_ugc_templates', JSON.stringify(customOnly));
    } catch (e) {}
    setStatusMessage('Saved to custom UGC prompt library!');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Delete custom template
  const handleDeleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    try {
      const customOnly = updated.filter(t => t.isCustom);
      localStorage.setItem('aura_custom_ugc_templates', JSON.stringify(customOnly));
    } catch (e) {}
  };

  // Generate Custom Script using Gemini
  const handleGenerateCustomScript = async () => {
    setIsGeneratingScript(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/ugc/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: customTopic || selectedTemplate.title,
          tone: selectedTone,
          dialect: 'dhaka_banglish'
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to generate script');

      if (data.voiceoverScript) setScriptText(data.voiceoverScript);
      if (data.videoPrompt) setVideoPromptText(data.videoPrompt);
      setAudioUrl(null);
      setMobileTab('studio');
      setStatusMessage('Bengali UGC script crafted with authentic Dhaka creator cadence!');
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      console.error(err);
      setStatusMessage('Error: ' + err.message);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // Synthesize Bengali Voiceover using gemini-2.5-flash-preview-tts
  const handleGenerateVoiceoverAudio = async () => {
    if (!scriptText.trim()) return;
    setIsGeneratingAudio(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/ugc/generate-voiceover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: scriptText,
          voiceName: voiceName
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to synthesize voiceover');

      // Convert base64 audio to object URL
      const byteCharacters = atob(data.audioBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: data.mimeType || 'audio/wav' });
      const url = URL.createObjectURL(blob);

      setAudioUrl(url);
      setStatusMessage(`Bengali voiceover synthesized successfully with ${voiceName} voice!`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
      setStatusMessage('Voice synthesis error: ' + err.message);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleTogglePlayAudio = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.playbackRate = playbackSpeed;
      audioRef.current.play().then(() => setIsPlayingAudio(true)).catch(() => {});
    }
  };

  const handleDownloadAudio = () => {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `aura-bengali-ugc-voiceover-${voiceName.toLowerCase()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleApplyToStudio = () => {
    onApplyUgcToStudio(videoPromptText, aspectRatio, audioUrl || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 select-none">
      <div className="bg-[#0e0e12] border border-[#22222a] rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">

        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-[#1c1c24] flex items-center justify-between shrink-0 bg-[#121217]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-400 p-[1.5px] shadow-sm shrink-0">
              <div className="w-full h-full bg-black rounded-[6.5px] flex items-center justify-center">
                <Smartphone size={16} className="text-emerald-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                  UGC Studio & Bengali Voiceover
                </h2>
                <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded font-mono font-bold hidden sm:inline-block">
                  ভয়েসওভার সহ বাংলা UGC
                </span>
              </div>
              <p className="text-[10px] text-neutral-400">
                TikTok/Reels prompts with authentic Bengali creator voiceover generated via Gemini TTS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mobile Tab Switcher (Visible on small screens) */}
        <div className="lg:hidden flex items-center border-b border-[#202028] bg-[#14141a]">
          <button
            onClick={() => setMobileTab('library')}
            className={`flex-1 py-2 text-xs font-bold text-center transition-colors ${
              mobileTab === 'library'
                ? 'text-emerald-400 border-b-2 border-emerald-400 bg-[#181822]'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Templates & Prompt ({templates.length})
          </button>
          <button
            onClick={() => setMobileTab('studio')}
            className={`flex-1 py-2 text-xs font-bold text-center transition-colors ${
              mobileTab === 'studio'
                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-[#181822]'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Voiceover & Studio Sync
          </button>
        </div>

        {statusMessage && (
          <div className="bg-emerald-950/60 border-b border-emerald-800/80 px-4 sm:px-6 py-1.5 text-[11px] text-emerald-200 font-mono flex items-center justify-between">
            <span>{statusMessage}</span>
            <span className="text-emerald-400 font-bold">Active</span>
          </div>
        )}

        {/* Main Content Layout */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column: UGC Prompt Library (5 cols) */}
          <div className={`lg:col-span-5 space-y-4 pr-1 ${mobileTab === 'library' ? 'block' : 'hidden lg:block'}`}>
            <div className="flex items-center justify-between pb-1 border-b border-[#202028]">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Flame size={13} className="text-amber-400" />
                <span>UGC Prompt Library</span>
              </span>
              <button
                onClick={handleAddNewTemplate}
                className="text-[9px] font-mono text-emerald-300 hover:text-white flex items-center space-x-1 bg-[#1a1a24] px-2 py-0.5 rounded border border-[#2e2e3e]"
              >
                <Plus size={10} />
                <span>Save Custom</span>
              </button>
            </div>

            <div className="space-y-2 max-h-[340px] sm:max-h-[380px] overflow-y-auto pr-1">
              {templates.map(item => {
                const isSel = selectedTemplate.id === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTemplate(item)}
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-left transition-all relative group ${
                      isSel
                        ? 'bg-[#161622] border-emerald-500/80 shadow-md ring-1 ring-emerald-500/30'
                        : 'bg-[#121216] border-[#22222a] hover:border-neutral-600 hover:bg-[#15151a]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold tracking-wider">
                        {item.category}
                      </span>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[9px] font-mono bg-neutral-900 border border-neutral-700 px-1.5 py-0.2 rounded text-neutral-300">
                          {item.aspectRatio}
                        </span>
                        {item.isCustom && (
                          <span
                            onClick={(e) => handleDeleteTemplate(item.id, e)}
                            className="text-neutral-500 hover:text-red-400 p-0.5"
                            title="Delete custom template"
                          >
                            <Trash2 size={11} />
                          </span>
                        )}
                      </div>
                    </div>

                    <h4 className={`text-xs font-bold mt-1 ${isSel ? 'text-white' : 'text-neutral-200'}`}>
                      {item.title}
                    </h4>

                    <p className="text-[11px] text-amber-200/90 font-medium mt-1 leading-snug line-clamp-2">
                      "{item.bengaliHook}"
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Custom Concept AI Generator */}
            <div className="bg-[#121218] border border-[#242430] p-3 rounded-xl space-y-2.5">
              <span className="text-[10px] font-mono uppercase text-neutral-300 font-bold flex items-center gap-1">
                <Sparkles size={11} className="text-emerald-400" />
                <span>Custom Bangladeshi Concept</span>
              </span>

              <input
                type="text"
                value={customTopic}
                onChange={e => setCustomTopic(e.target.value)}
                placeholder="e.g. Trying viral Gulshan bubble tea, Dhanmondi burger..."
                className="w-full bg-[#0a0a0d] border border-[#2a2a34] focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 outline-none"
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <select
                  value={selectedTone}
                  onChange={e => setSelectedTone(e.target.value as any)}
                  className="bg-[#181820] border border-[#2e2e3a] text-neutral-300 text-[10px] rounded px-2 py-1 outline-none"
                >
                  <option value="energetic_creator">Hyper Energetic (Dhaka Slang)</option>
                  <option value="dhaka_foodie">Puran Dhaka Foodie</option>
                  <option value="tech_reviewer">Tech Reviewer Pro</option>
                  <option value="lifestyle_grwm">Lifestyle & GRWM</option>
                  <option value="customer_care_support">Customer Support (Helpful)</option>
                  <option value="positive_testimonial">Real Customer Testimonial</option>
                </select>

                <button
                  onClick={handleGenerateCustomScript}
                  disabled={isGeneratingScript}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] px-3 py-1 rounded-md uppercase tracking-wider flex items-center space-x-1 transition-colors disabled:opacity-50"
                >
                  {isGeneratingScript ? (
                    <span>Crafting...</span>
                  ) : (
                    <>
                      <Sparkles size={10} />
                      <span>Generate Script</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>

          {/* Right Column: Voiceover Engine & Studio Sync (7 cols) */}
          <div className={`lg:col-span-7 space-y-4 ${mobileTab === 'studio' ? 'block' : 'hidden lg:block'}`}>

            {/* Bengali Voiceover Script Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Mic size={13} className="text-cyan-400" />
                  <span>Bangladeshi Voiceover Script (বাংলা ডাবিং স্ক্রিপ্ট)</span>
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">
                  Natural Pacing (5-10s)
                </span>
              </div>

              <textarea
                value={scriptText}
                onChange={e => setScriptText(e.target.value)}
                rows={3}
                placeholder="বাংলা স্ক্রিপ্ট লিখুন বা উপরের টেমপ্লেট থেকে সিলেক্ট করুন..."
                className="w-full bg-[#121217] border border-[#24242e] focus:border-cyan-500 rounded-xl p-3 text-xs text-white font-medium outline-none resize-none leading-relaxed"
              />
            </div>

            {/* Voice Persona & Audio Synthesis Controls */}
            <div className="bg-[#121217] border border-[#22222a] p-3.5 sm:p-4 rounded-xl space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-mono uppercase text-neutral-400 font-bold mr-1">
                    Voice:
                  </span>
                  {[
                    { id: 'Puck', name: 'Puck (Young Male)', icon: '⚡' },
                    { id: 'Kore', name: 'Kore (Female)', icon: '✨' },
                    { id: 'Aoede', name: 'Aoede (Host)', icon: '🎙️' },
                    { id: 'Charon', name: 'Charon (Deep)', icon: '🎧' }
                  ].map((v: any) => (
                    <button
                      key={v.id}
                      onClick={() => setVoiceName(v.id)}
                      className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded text-[9px] sm:text-[10px] font-mono border transition-all ${
                        voiceName === v.id
                          ? 'bg-cyan-950 border-cyan-500 text-cyan-200 font-bold shadow-sm'
                          : 'bg-[#181820] border-[#282832] text-neutral-400 hover:text-white'
                      }`}
                    >
                      <span>{v.icon} {v.id}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleGenerateVoiceoverAudio}
                  disabled={isGeneratingAudio || !scriptText.trim()}
                  className="bg-gradient-to-r from-cyan-600 via-indigo-600 to-violet-600 hover:opacity-90 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center space-x-1.5 shadow-md uppercase tracking-wider transition-all disabled:opacity-40"
                >
                  {isGeneratingAudio ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Synthesizing...</span>
                    </>
                  ) : (
                    <>
                      <Volume2 size={13} />
                      <span>Synthesize Audio</span>
                    </>
                  )}
                </button>
              </div>

              {/* Audio Player Strip */}
              {audioUrl ? (
                <div className="bg-[#181820] border border-[#282834] p-3 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3">
                  <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlayingAudio(false)} />

                  <div className="flex items-center space-x-3 w-full sm:w-auto">
                    <button
                      onClick={handleTogglePlayAudio}
                      className="w-8 h-8 rounded-full bg-cyan-400 hover:bg-cyan-300 text-black flex items-center justify-center transition-transform hover:scale-105 shrink-0"
                    >
                      {isPlayingAudio ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                    </button>

                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                        <Check size={12} className="text-emerald-400" />
                        <span>Bengali Voice Track Ready ({voiceName})</span>
                      </span>
                      <span className="text-[9px] text-cyan-300 font-mono">
                        Speed: {playbackSpeed}x · Syncs with video
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                    {/* Speed Selector */}
                    <div className="flex items-center space-x-1 bg-[#141418] p-0.5 rounded border border-[#2a2a36]">
                      {[0.85, 1.0, 1.15].map(speed => (
                        <button
                          key={speed}
                          onClick={() => {
                            setPlaybackSpeed(speed);
                            if (audioRef.current) audioRef.current.playbackRate = speed;
                          }}
                          className={`px-1.5 py-0.5 rounded text-[8px] font-mono ${
                            playbackSpeed === speed ? 'bg-cyan-400 text-black font-bold' : 'text-neutral-400'
                          }`}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>

                    <label className="flex items-center space-x-1 text-[10px] text-neutral-300 cursor-pointer font-mono mr-1">
                      <input
                        type="checkbox"
                        checked={syncWithVideo}
                        onChange={e => setSyncWithVideo(e.target.checked)}
                        className="accent-cyan-400"
                      />
                      <span>Sync</span>
                    </label>

                    <button
                      onClick={handleDownloadAudio}
                      className="p-1.5 bg-[#20202a] hover:bg-[#282836] text-white rounded border border-[#303040] transition-colors"
                      title="Download voiceover WAV"
                    >
                      <Download size={13} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-[#16161c] rounded-lg border border-dashed border-[#262630] text-center text-[10px] font-mono text-neutral-500">
                  Click "Synthesize Audio" to generate authentic spoken Bengali with Gemini TTS
                </div>
              )}
            </div>

            {/* Visual Video Prompt Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Video size={13} className="text-amber-400" />
                  <span>Veo / Omni Video Cinematography Prompt</span>
                </span>

                {/* Aspect ratio switch */}
                <div className="flex items-center space-x-1 bg-[#16161c] p-0.5 rounded border border-[#24242e]">
                  <button
                    onClick={() => setAspectRatio('9:16')}
                    className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all ${
                      aspectRatio === '9:16' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    9:16 Vertical
                  </button>
                  <button
                    onClick={() => setAspectRatio('16:9')}
                    className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all ${
                      aspectRatio === '16:9' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    16:9 Landscape
                  </button>
                </div>
              </div>

              <textarea
                value={videoPromptText}
                onChange={e => setVideoPromptText(e.target.value)}
                rows={3}
                className="w-full bg-[#121217] border border-[#24242e] focus:border-amber-500 rounded-xl p-3 text-xs text-neutral-300 font-normal outline-none resize-none leading-relaxed"
              />
            </div>

          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-6 py-3 border-t border-[#1c1c24] bg-[#101015] flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center space-x-2 text-[10px] text-neutral-400 font-mono">
            <span>UGC: {aspectRatio}</span>
            <span>·</span>
            <span>Voice: {voiceName}</span>
            {audioUrl && <span className="text-emerald-400 font-bold">· Audio Synced</span>}
          </div>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs text-neutral-400 hover:text-white border border-[#262630] transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleApplyToStudio}
              className="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs px-5 py-2 rounded-lg flex items-center justify-center space-x-1.5 uppercase tracking-wider transition-all shadow-md"
            >
              <span>Load Into Studio</span>
              <ArrowRight size={13} strokeWidth={2.5} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
