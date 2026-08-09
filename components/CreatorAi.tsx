"use client";

import {  useState, useEffect, useRef } from "react";
import { 
  Bot, MapPin, 
  Sparkles, 
  Send, 
  Video, 
  Image as ImageIcon, 
  Upload, 
  Download, 
  RefreshCw, 
  Globe, 
  ExternalLink, 
  FileVideo, 
  Compass, 
  BrainCircuit, 
  Check, 
  Loader2,
  Sliders,
  Play,
  ArrowRight,
  Info,
  Mic,
  Music,
  Volume2,
  Copy,
  FileAudio
} from "lucide-react";
import { logActivity } from "@/lib/activity";
import { getAiHeaders } from "@/lib/ai-client";

interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri: string;
    title?: string;
    placeAnswerSources?: {
      reviewSnippets?: {
        text: string;
        authorName?: string;
      }[];
    }
  };
}

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  modelUsed?: string;
  groundingChunks?: GroundingChunk[];
  timestamp: Date;
}

export default function CreatorAi() {
  const [activeWorkspace, setActiveWorkspace] = useState<"chat" | "image" | "video" | "music" | "transcribe" | "analytics">("chat");

  // Persona states for AI Chat
  const [selectedPersona, setSelectedPersona] = useState<"general" | "scriptwriter" | "seo" | "director">("general");

  // =========================================================================
  // WORKSPACE: AI MUSIC STUDIO (Lyria)
  // =========================================================================
  const [musicPrompt, setMusicPrompt] = useState("");
  const [durationMode, setDurationMode] = useState<"clip" | "full">("clip");
  const [isGeneratingMusic, setIsGeneratingMusic] = useState(false);
  const [musicResultUrl, setMusicResultUrl] = useState("");
  const [musicMessage, setMusicMessage] = useState("");

  // =========================================================================
  // WORKSPACE: AUDIO TRANSCRIPTION (Mic/Upload)
  // =========================================================================
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioBase64, setAudioBase64] = useState("");
  const [audioMimeType, setAudioMimeType] = useState("audio/mp3");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcriptText, setTranscriptText] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // =========================================================================
  // WORKSPACE: VIDEO INTEL & ANALYTICS
  // =========================================================================
  const [intelVideoFile, setIntelVideoFile] = useState<File | null>(null);
  const [intelVideoPreview, setIntelVideoPreview] = useState("");
  const [intelVideoBase64, setIntelVideoBase64] = useState("");
  const [intelVideoMime, setIntelVideoMime] = useState("video/mp4");
  const [intelQuery, setIntelQuery] = useState("Explain the content of this video, analyze its visual pacing, and recommend matching YouTube tags.");
  const [intelResponse, setIntelResponse] = useState("");
  const [isAnalyzingIntel, setIsAnalyzingIntel] = useState(false);

  // =========================================================================
  // WORKSPACE: AI CHAT ASSISTANT
  // =========================================================================
  const [chatMessages, setChatMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "Hi! I am your advanced Creator AI Assistant. I can write professional YouTube scripts, brainstorm highly engaging video ideas, draft SEO-optimized metadata, or do in-depth research. Choose a model below and toggle Google Search grounding to begin!",
      timestamp: new Date(),
    }
  ]);
  const [userInput, setUserInput] = useState("");
  const [selectedChatModel, setSelectedChatModel] = useState("gemini-3.5-flash");
  const [useSearchGrounding, setUseSearchGrounding] = useState(false);
  const [useMapsGrounding, setUseMapsGrounding] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const chatModels = [
    { id: "gemini-3.1-flash-lite-preview", name: "Lite Speed", desc: "Super-fast Q&A & simple tasks" },
    { id: "gemini-3.5-flash", name: "Generalist (Default)", desc: "Well-balanced for general brainstorming" },
    { id: "gemini-3.1-pro-preview", name: "Pro Brain", desc: "Complex reasoning, writing & analytics" }
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatLoading]);

  const handleSendChatMessage = async () => {
    if (!userInput.trim() || isChatLoading) return;

    let userLatLng = undefined;
    if (useMapsGrounding) {
        try {
            userLatLng = await new Promise((resolve) => {
                navigator.geolocation.getCurrentPosition(
                    (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
                    (err) => resolve(undefined),
                    { timeout: 3000 }
                );
            });
        } catch (e) {
            // Ignore error
        }
    }

    const userMessageText = userInput;
    setUserInput("");

    const newMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: userMessageText,
      timestamp: new Date(),
    };
    
    // We update local state first
    const updatedMessages = [...chatMessages, newMsg];
    setChatMessages(updatedMessages);
    setIsChatLoading(true);

    try {
      // Build multi-turn conversational prompt with selected persona system instructions
      const personaPrompts = {
        general: "You are a helpful advanced video creator AI assistant. Brainstorm creative ideas, help with production, and provide excellent guidance.",
        scriptwriter: "You are an elite YouTube & cinema Scriptwriter. Write engaging, hook-focused video scripts with clean scene descriptions, speaker notes, cues, and visual directions.",
        seo: "You are a master of YouTube SEO, metadata, and analytics. Optimize titles for high CTR, write engaging descriptions, suggest popular tags, and construct click-worthy content strategies.",
        director: "You are an expert Film Director and Creative Producer. Critique shot compositions, suggest lighting schemes, help organize mood boards, and structure dynamic visual pacing."
      };

      const systemPrompt = personaPrompts[selectedPersona] || personaPrompts.general;
      
      // Compile the recent turns into a structured prompt
      const conversationTurns = updatedMessages.slice(-8).map(m => {
        return m.sender === "user" ? `User: ${m.text}` : `Assistant: ${m.text}`;
      }).join("\n");

      const fullPrompt = `System Context: ${systemPrompt}\n\nRecent Conversation:\n${conversationTurns}\n\nNow, respond to the user's latest message above.`;

      const response = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: getAiHeaders(),
        body: JSON.stringify({
          latLng: userLatLng,
          task: "chat",
          prompt: fullPrompt,
          model: selectedChatModel,
          useSearchGrounding: useSearchGrounding,
          useMapsGrounding: useMapsGrounding,
        }),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: data.text,
        modelUsed: selectedChatModel,
        groundingChunks: data.groundingChunks || [],
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error(err);
      setChatMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "ai",
          text: `⚠️ Error: ${err.message || "Failed to contact Gemini engine. Make sure your API key is active."}`,
          timestamp: new Date(),
        }
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // =========================================================================
  // WORKSPACE: AI IMAGE ENGINE (Create & Edit)
  // =========================================================================
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageModel, setImageModel] = useState("gemini-3.1-flash-image-preview");
  const [selectedAspectRatio, setSelectedAspectRatio] = useState("1:1");
  const [selectedImageSize, setSelectedImageSize] = useState("1K");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState("");

  // Edit image states
  const [uploadedImageBase64, setUploadedImageBase64] = useState("");
  const [uploadedImagePreview, setUploadedImagePreview] = useState("");
  const [imageEditPrompt, setImageEditPrompt] = useState("");
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [editedImageUrl, setEditedImageUrl] = useState("");
  const [imageInputMimeType, setImageInputMimeType] = useState("image/png");

  const aspectRatios = ["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9", "21:9"];
  const imageSizes = ["1K", "2K", "4K"];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageInputMimeType(file.type);
      const reader = new FileReader();
      reader.onload = () => {
        const full = reader.result as string;
        setUploadedImagePreview(full);
        setUploadedImageBase64(full.split(",")[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim() || isGeneratingImage) return;

    setIsGeneratingImage(true);
    setGeneratedImageUrl("");

    try {
      const response = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: getAiHeaders(),
        body: JSON.stringify({
          task: "image",
          prompt: imagePrompt,
          model: imageModel,
          aspectRatio: selectedAspectRatio,
          imageSize: imageModel === "gemini-3-pro-image-preview" ? selectedImageSize : undefined,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setGeneratedImageUrl(data.imageUrl);
    } catch (err: any) {
      alert(`Image Generation Failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleEditImage = async () => {
    if (!uploadedImageBase64 || !imageEditPrompt.trim() || isEditingImage) return;

    setIsEditingImage(true);
    setEditedImageUrl("");

    try {
      const response = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: getAiHeaders(),
        body: JSON.stringify({
          task: "edit-image",
          prompt: imageEditPrompt,
          imageBase64: uploadedImageBase64,
          mimeType: imageInputMimeType,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setEditedImageUrl(data.imageUrl);
    } catch (err: any) {
      alert(`Image Edit Failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsEditingImage(false);
    }
  };

  const handleSendToThumbnailDesigner = (url: string) => {
    if (!url) return;
    // Dispatch custom event to let ThumbnailEditor pick it up
    window.dispatchEvent(new CustomEvent("set-thumbnail-bg", { detail: { imageUrl: url } }));
    // Dispatch event to switch active tab to Thumbnail Designer
    window.dispatchEvent(new CustomEvent("change-app-tab", { detail: { tab: "thumbnail" } }));
  };

  // =========================================================================
  // WORKSPACE: AI VIDEO STUDIO (VEO 3)
  // =========================================================================
  const [videoPrompt, setVideoPrompt] = useState("");
  const [videoAspectRatio, setVideoAspectRatio] = useState("16:9");
  const [videoResolution, setVideoResolution] = useState("720p");
  const [videoSourceImagePreview, setVideoSourceImagePreview] = useState("");
  const [videoSourceImageBase64, setVideoSourceImageBase64] = useState("");
  const [videoSourceImageMime, setVideoSourceImageMime] = useState("image/png");

  // Job and Polling states
  const [videoJobId, setVideoJobId] = useState("");
  const [videoJobStatus, setVideoJobStatus] = useState<"idle" | "running" | "completed" | "failed">("idle");
  const [reassuringMessage, setReassuringMessage] = useState("");
  const [veoResultUrl, setVeoResultUrl] = useState("");
  const [veoDownloadLoading, setVeoDownloadLoading] = useState(false);
  const [videoMessage, setVideoMessage] = useState("");
  const [isVideoFallback, setIsVideoFallback] = useState(false);

  const reassuringMessages = [
    "Spinning up high-speed Veo 3 nodes...",
    "Decoding video prompt semantics...",
    "Modeling fluid motion structures...",
    "Rendering coherent physical dynamics...",
    "Processing detailed light rays & shadows...",
    "Generating temporal frames...",
    "Synthesizing high-fidelity audio waves (if applicable)...",
    "Wrapping video assets in MP4 containers..."
  ];

  // Rotate reassuring messages while video is generating
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (videoJobStatus === "running") {
      let idx = 0;
      setReassuringMessage(reassuringMessages[0]);
      interval = setInterval(() => {
        idx = (idx + 1) % reassuringMessages.length;
        setReassuringMessage(reassuringMessages[idx]);
      }, 6000);
    }
    return () => clearInterval(interval);
  }, [videoJobStatus]);

  const handleVideoSourceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVideoSourceImageMime(file.type);
      const reader = new FileReader();
      reader.onload = () => {
        const full = reader.result as string;
        setVideoSourceImagePreview(full);
        setVideoSourceImageBase64(full.split(",")[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateVideo = async () => {
    if (videoJobStatus === "running") return;

    setVeoResultUrl("");
    setVideoJobStatus("running");
    setVideoMessage("");
    setIsVideoFallback(false);

    try {
      const response = await fetch("/api/gemini/video/generate", {
        method: "POST",
        headers: getAiHeaders(),
        body: JSON.stringify({
          prompt: videoPrompt || undefined,
          imageBase64: videoSourceImageBase64 || undefined,
          mimeType: videoSourceImageMime,
          aspectRatio: videoAspectRatio,
          resolution: videoResolution,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      if (data.isFallback) {
        setIsVideoFallback(true);
        setVideoMessage(data.message || "Served dynamic fallback video.");
      }

      if (data.operationName) {
        setVideoJobId(data.operationName);
        startPollingVideoJob(data.operationName, data.isFallback);
      } else {
        throw new Error("No operationName returned");
      }
    } catch (err: any) {
      alert(`Failed to start video generation: ${err.message}`);
      setVideoJobStatus("failed");
    }
  };

  const startPollingVideoJob = async (operationName: string, initiallyFallback?: boolean) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch("/api/gemini/video/status", {
          method: "POST",
          headers: { 
          "Content-Type": "application/json",
          ...(localStorage.getItem("fahi_gemini_api_key") ? { "x-gemini-api-key": localStorage.getItem("fahi_gemini_api_key")! } : {})
        },
          body: JSON.stringify({ operationName }),
        });

        const data = await response.json();
        if (data.error) {
          clearInterval(pollInterval);
          alert(`Video generation error: ${data.error}`);
          setVideoJobStatus("failed");
          return;
        }

        if (data.done) {
          clearInterval(pollInterval);
          setVideoJobStatus("completed");
          if (data.isFallback || initiallyFallback) {
            setIsVideoFallback(true);
            setVideoMessage("Active cinematic simulation fallback running (API Quota Exhausted).");
          }
          // Download video binary securely
          fetchVideoBlobAndSet(operationName);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 5000);
  };

  const fetchVideoBlobAndSet = async (operationName: string) => {
    setVeoDownloadLoading(true);
    try {
      const response = await fetch("/api/gemini/video/download", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(localStorage.getItem("fahi_gemini_api_key") ? { "x-gemini-api-key": localStorage.getItem("fahi_gemini_api_key")! } : {})
        },
        body: JSON.stringify({ operationName }),
      });

      if (!response.ok) throw new Error("Failed to download generated video content");

      const blob = await response.blob();
      const localUrl = URL.createObjectURL(blob);
      setVeoResultUrl(localUrl);
      
      logActivity({
        type: "ai_generate",
        title: videoPrompt || "AI Generated Video",
        metadata: { fallback: isVideoFallback }
      });
    } catch (err: any) {
      alert(`Error loading final video file: ${err.message}`);
      setVideoJobStatus("failed");
    } finally {
      setVeoDownloadLoading(false);
    }
  };

  const handleSendToVideoStudio = async () => {
    if (!veoResultUrl) return;

    try {
      const response = await fetch(veoResultUrl);
      const blob = await response.blob();
      const file = new File([blob], `veo-generation-${Date.now()}.mp4`, { type: "video/mp4" });

      // Dispatch event to VideoEditor to load this video file
      window.dispatchEvent(new CustomEvent("add-video-file", { detail: { file } }));
      // Transition to Video Editor view
      window.dispatchEvent(new CustomEvent("change-app-tab", { detail: { tab: "video" } }));
    } catch (err) {
      console.error(err);
      alert("Failed to send video asset to studio timeline.");
    }
  };

  const handleGenerateMusic = async () => {
    if (!musicPrompt.trim() || isGeneratingMusic) return;

    setIsGeneratingMusic(true);
    setMusicResultUrl("");
    setMusicMessage("");

    try {
      const response = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(localStorage.getItem("fahi_gemini_api_key") ? { "x-gemini-api-key": localStorage.getItem("fahi_gemini_api_key")! } : {})
        },
        body: JSON.stringify({
          task: "music",
          prompt: musicPrompt,
          durationMode,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setMusicResultUrl(data.audioUrl);
      if (data.isFallback) {
        setMusicMessage(data.message || "Served dynamic audio fallback.");
      }
    } catch (err: any) {
      alert(`Music Generation Failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsGeneratingMusic(false);
    }
  };

  const handleSendMusicToVideoEditor = async () => {
    if (!musicResultUrl) return;
    try {
      const response = await fetch(musicResultUrl);
      const blob = await response.blob();
      const file = new File([blob], `lyria-background-${Date.now()}.mp3`, { type: "audio/mp3" });
      
      // Dispatch custom event to add video or background audio
      window.dispatchEvent(new CustomEvent("add-video-file", { detail: { file } }));
      window.dispatchEvent(new CustomEvent("change-app-tab", { detail: { tab: "video" } }));
    } catch (err) {
      alert("Failed to load music file into timeline.");
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/mp3" });
        const file = new File([audioBlob], `recorded-speech-${Date.now()}.mp3`, { type: "audio/mp3" });
        setAudioFile(file);
        setAudioMimeType("audio/mp3");

        const reader = new FileReader();
        reader.onload = () => {
          const full = reader.result as string;
          setAudioBase64(full.split(",")[1]);
        };
        reader.readAsDataURL(file);

        // Stop all tracks on the stream to release the mic
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      alert(`Microphone Access Denied: ${err.message || "Please allow microphone permissions."}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAudioFile(file);
      setAudioMimeType(file.type);
      
      const reader = new FileReader();
      reader.onload = () => {
        const full = reader.result as string;
        setAudioBase64(full.split(",")[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTranscribeAudio = async () => {
    if (!audioBase64 || isTranscribing) return;

    setIsTranscribing(true);
    setTranscriptText("");

    try {
      const response = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(localStorage.getItem("fahi_gemini_api_key") ? { "x-gemini-api-key": localStorage.getItem("fahi_gemini_api_key")! } : {})
        },
        body: JSON.stringify({
          task: "transcribe",
          audioBase64,
          mimeType: audioMimeType,
          prompt: "Please provide a verbatim transcript of this recording, formatted cleanly with line breaks if multiple people are speaking.",
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setTranscriptText(data.text || "No speech detected in recording.");
    } catch (err: any) {
      alert(`Transcription Failed: ${err.message}`);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleIntelVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIntelVideoFile(file);
      setIntelVideoMime(file.type);
      setIntelVideoPreview(URL.createObjectURL(file));

      const reader = new FileReader();
      reader.onload = () => {
        const full = reader.result as string;
        setIntelVideoBase64(full.split(",")[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeVideoIntel = async () => {
    if (!intelVideoBase64 || isAnalyzingIntel) return;

    setIsAnalyzingIntel(true);
    setIntelResponse("");

    try {
      const response = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(localStorage.getItem("fahi_gemini_api_key") ? { "x-gemini-api-key": localStorage.getItem("fahi_gemini_api_key")! } : {})
        },
        body: JSON.stringify({
          task: "analyze-video",
          videoBase64: intelVideoBase64,
          mimeType: intelVideoMime,
          query: intelQuery,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setIntelResponse(data.text);
    } catch (err: any) {
      alert(`Video Analysis Failed: ${err.message}`);
    } finally {
      setIsAnalyzingIntel(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      {/* Top Google Flow Lab Header Banner */}
      <div className="flex flex-wrap items-center justify-between p-4 rounded-3xl bg-[#0B0F19]/90 border border-white/10 shadow-2xl backdrop-blur-xl gap-4">
         <div className="flex items-center space-x-3">
             <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 p-0.5 shadow-lg shadow-violet-500/30 flex items-center justify-center">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
             </div>
             <div>
                <h2 className="text-white font-extrabold text-lg flex items-center space-x-2">
                   <span>Google Flow Lab AI Suite</span>
                   <span className="text-[10px] bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full font-mono">Veo 2 & Gemini 3.5</span>
                </h2>
                <p className="text-xs text-slate-400">Google-powered media generation and intellectual analysis tools.</p>
             </div>
         </div>

         {/* Capsule Quick Navigation */}
         <div className="flex items-center p-1 bg-black/50 border border-white/10 rounded-full overflow-x-auto max-w-full">
            {[
              { id: "video", label: "Veo 2 Video" },
              { id: "chat", label: "Gemini Chat" },
              { id: "image", label: "Imagen 3" },
              { id: "music", label: "Lyria Music" },
              { id: "transcribe", label: "Voice/Audio" },
              { id: "analytics", label: "Vision Intel" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveWorkspace(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  activeWorkspace === tab.id
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                 {tab.label}
              </button>
            ))}
         </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-stretch">
        {/* Workspace Selector Panel */}
      <div className="xl:col-span-3 flex flex-col space-y-4">
        <div className="rounded-3xl border border-white/[0.06] bg-[#111115]/90 backdrop-blur-md p-6 flex flex-col h-full justify-between shadow-[0_12px_40px_-15px_rgba(0,0,0,0.7)] group">
          <div>
            <div className="flex items-center gap-3.5 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 border border-indigo-500/25 flex items-center justify-center shadow-lg shadow-indigo-600/5">
                <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse"/>
              </div>
              <div>
                <h3 className="text-white font-extrabold text-md tracking-tight font-sans">
                  Creator AI Hub
                </h3>
                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider font-mono">
                  Smart Fallback Core
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500 font-sans leading-normal mb-6">
              Google-powered media generation and intellectual analysis tools.
            </p>

            <div className="space-y-2">
              <button
                onClick={() => setActiveWorkspace("chat")}
                className={`w-full flex items-center space-x-3.5 rounded-2xl px-4.5 py-3.5 text-xs font-bold transition-all duration-300 border cursor-pointer ${
                  activeWorkspace === "chat"
                    ? "bg-indigo-600/15 border-indigo-500/40 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                    : "bg-transparent border-white/[0.04] text-slate-400 hover:text-white hover:border-white/10 hover:bg-white/[0.02]"
                }`}
              >
                <BrainCircuit className="w-4 h-4" />
                <span>AI Chat Assistant</span>
              </button>

              <button
                onClick={() => setActiveWorkspace("image")}
                className={`w-full flex items-center space-x-3.5 rounded-2xl px-4.5 py-3.5 text-xs font-bold transition-all duration-300 border cursor-pointer ${
                  activeWorkspace === "image"
                    ? "bg-indigo-600/15 border-indigo-500/40 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                    : "bg-transparent border-white/[0.04] text-slate-400 hover:text-white hover:border-white/10 hover:bg-white/[0.02]"
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>AI Image Engine</span>
              </button>

              <button
                onClick={() => setActiveWorkspace("video")}
                className={`w-full flex items-center space-x-3.5 rounded-2xl px-4.5 py-3.5 text-xs font-bold transition-all duration-300 border cursor-pointer ${
                  activeWorkspace === "video"
                    ? "bg-indigo-600/15 border-indigo-500/40 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                    : "bg-transparent border-white/[0.04] text-slate-400 hover:text-white hover:border-white/10 hover:bg-white/[0.02]"
                }`}
              >
                <Video className="w-4 h-4" />
                <span>AI Video Studio (Veo)</span>
              </button>

              <button
                onClick={() => setActiveWorkspace("music")}
                className={`w-full flex items-center space-x-3.5 rounded-2xl px-4.5 py-3.5 text-xs font-bold transition-all duration-300 border cursor-pointer ${
                  activeWorkspace === "music"
                    ? "bg-indigo-600/15 border-indigo-500/40 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                    : "bg-transparent border-white/[0.04] text-slate-400 hover:text-white hover:border-white/10 hover:bg-white/[0.02]"
                }`}
              >
                <Music className="w-4 h-4" />
                <span>AI Music Studio (Lyria)</span>
              </button>

              <button
                onClick={() => setActiveWorkspace("transcribe")}
                className={`w-full flex items-center space-x-3.5 rounded-2xl px-4.5 py-3.5 text-xs font-bold transition-all duration-300 border cursor-pointer ${
                  activeWorkspace === "transcribe"
                    ? "bg-indigo-600/15 border-indigo-500/40 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                    : "bg-transparent border-white/[0.04] text-slate-400 hover:text-white hover:border-white/10 hover:bg-white/[0.02]"
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>Audio Transcription</span>
              </button>

              <button
                onClick={() => setActiveWorkspace("analytics")}
                className={`w-full flex items-center space-x-3.5 rounded-2xl px-4.5 py-3.5 text-xs font-bold transition-all duration-300 border cursor-pointer ${
                  activeWorkspace === "analytics"
                    ? "bg-indigo-600/15 border-indigo-500/40 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                    : "bg-transparent border-white/[0.04] text-slate-400 hover:text-white hover:border-white/10 hover:bg-white/[0.02]"
                }`}
              >
                <FileVideo className="w-4 h-4" />
                <span>Video Intelligence</span>
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-white/5 mt-6">
            <div className="bg-[#07070a] rounded-2xl p-4 border border-white/5 shadow-inner">
              <div className="flex items-start space-x-3">
                <Info className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0 animate-pulse" />
                <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                  <span className="font-bold text-white">Smart Resource Optimizations:</span> Seamlessly cascade to backup engines to guarantee unlimited, free, high-fidelity operations on standard Gemini tiers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Workspace Area */}
      <div className="xl:col-span-9 flex flex-col rounded-3xl border border-white/[0.06] bg-[#111115]/90 backdrop-blur-md overflow-hidden shadow-[0_12px_40px_-15px_rgba(0,0,0,0.7)] min-h-[500px]">
        
        {/* ===================================================================
            WORKSPACE LAYOUT: AI CHAT ASSISTANT
            =================================================================== */}
        {activeWorkspace === "chat" && (
          <div className="flex flex-col flex-1 h-full">
            {/* Header / Config */}
            <div className="p-4 border-b border-white/5 bg-black/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 bg-indigo-600/20 border border-indigo-500/30 rounded-xl flex items-center justify-center">
                  <Bot className="w-5 h-5 text-indigo-400"/>
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">Advanced Brain Assistant</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Scriptwriting, metadata optimization & general ideation</p>
                </div>
              </div>

              {/* Models / Grounding Selector */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Search Grounding Toggler */}
                <button
                  onClick={() => { setUseSearchGrounding(!useSearchGrounding); setUseMapsGrounding(false); }}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                    useSearchGrounding
                      ? "bg-indigo-600/10 border-indigo-500/50 text-indigo-300"
                      : "bg-[#0a0a0c] border-white/5 text-slate-400 hover:text-white"
                  }`}
                >
                  <Globe className={`w-3.5 h-3.5 ${useSearchGrounding ? "text-indigo-400 animate-spin-slow" : "text-slate-500"}`} />
                  <span>Google Search</span>
                </button>
                <button
                  onClick={() => { setUseMapsGrounding(!useMapsGrounding); setUseSearchGrounding(false); }}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                    useMapsGrounding
                      ? "bg-indigo-600/10 border-indigo-500/50 text-indigo-300"
                      : "bg-[#0a0a0c] border-white/5 text-slate-400 hover:text-white"
                  }`}
                >
                  <MapPin className={`w-3.5 h-3.5 ${useMapsGrounding ? "text-indigo-400 animate-pulse" : "text-slate-500"}`} />
                  <span>Google Maps</span>
                </button>

                {/* Model Dropdown */}
                <select
                  value={selectedChatModel}
                  onChange={(e) => setSelectedChatModel(e.target.value)}
                  className="bg-[#0a0a0c] border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  {chatModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Persona Presets selector */}
            <div className="px-4 py-2 border-b border-white/5 bg-black/10 flex items-center justify-between gap-2 overflow-x-auto">
              <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">Assistant Persona:</span>
              <div className="flex items-center space-x-2">
                {[
                  { id: "general", name: "General AI" },
                  { id: "scriptwriter", name: "Scriptwriter" },
                  { id: "seo", name: "SEO Expert" },
                  { id: "director", name: "Director" }
                ].map(persona => (
                  <button
                    key={persona.id}
                    onClick={() => setSelectedPersona(persona.id as any)}
                    className={`px-2 py-1 rounded text-[10px] font-medium border transition-all cursor-pointer ${
                      selectedPersona === persona.id
                        ? "bg-indigo-600/15 border-indigo-500/40 text-indigo-300"
                        : "bg-transparent border-white/5 text-slate-500 hover:text-white"
                    }`}
                  >
                    {persona.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[420px] custom-scrollbar">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex space-x-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.sender === "ai" && (
                    <div className="w-8 h-8 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-indigo-400"/>
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-indigo-600 text-white rounded-tr-sm font-medium"
                      : "bg-[#0a0a0c] border border-white/5 text-slate-300 rounded-tl-sm"
                  }`}>
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                    
                    {/* Model Used Tag */}
                    {msg.sender === "ai" && msg.modelUsed && (
                      <div className="mt-2.5 pt-2 border-t border-white/5 flex flex-wrap items-center justify-between text-[9px] text-slate-500 font-mono">
                        <span>Model: {msg.modelUsed}</span>
                        <span>{msg.timestamp.toLocaleTimeString()}</span>
                      </div>
                    )}

                    {/* Grounding chunks rendering */}
                    {msg.sender === "ai" && msg.groundingChunks && msg.groundingChunks.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-white/5 space-y-1.5">
                        <p className="text-[10px] font-semibold text-indigo-400 flex items-center">
                          <Globe className="w-3 h-3 mr-1" /> Grounded Search Citations:
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {msg.groundingChunks.map((chunk, index) => {
                            if (chunk.web) {
                                return (
                                  <a
                                    key={index}
                                    href={chunk.web.uri}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center space-x-1 px-2 py-1 bg-white/5 hover:bg-white/10 rounded border border-white/10 text-[9px] font-mono text-slate-300 transition-colors max-w-full overflow-hidden"
                                  >
                                    <span className="truncate">{chunk.web.title || "Web Source"}</span>
                                  </a>
                                );
                            } else if (chunk.maps) {
                                return (
                                    <a
                                    key={index}
                                    href={chunk.maps.uri}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center space-x-1 px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 rounded border border-indigo-500/20 text-[9px] font-mono text-indigo-300 transition-colors max-w-full overflow-hidden"
                                  >
                                    <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                                    <span className="truncate">{chunk.maps.title || "Google Maps Source"}</span>
                                  </a>
                                );
                            }
                            return null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isChatLoading && (
                <div className="flex space-x-3 justify-start items-center">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-indigo-400"/>
                  </div>
                  <div className="bg-[#0a0a0c] border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3 text-xs text-slate-400 flex items-center space-x-2">
                    <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                    <span>Gemini is thinking...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/5 bg-black/20">
              <div className="relative flex items-center">
                <input 
                  type="text" 
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSendChatMessage();
                  }}
                  placeholder="Ask the AI agent to write a script, generate a video description, search something..." 
                  className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl pl-4 pr-12 py-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button 
                  onClick={handleSendChatMessage}
                  disabled={isChatLoading || !userInput.trim()}
                  className="absolute right-2 w-9 h-9 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4 text-white"/>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            WORKSPACE LAYOUT: AI IMAGE ENGINE
            =================================================================== */}
        {activeWorkspace === "image" && (
          <div className="p-6 flex flex-col flex-1 h-full justify-between">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch h-full">
              
              {/* Creator Settings Form */}
              <div className="space-y-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-6">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                    <h4 className="text-white font-bold text-sm">Image Generation & Editing</h4>
                  </div>

                  {/* Mode / Type selection tabs */}
                  <div className="space-y-4">
                    {/* Text to Image Generation Mode */}
                    <div className="space-y-3.5 bg-black/15 p-4 rounded-xl border border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-300">Generate New Image</span>
                        <select
                          value={imageModel}
                          onChange={(e) => setImageModel(e.target.value)}
                          className="bg-[#0a0a0c] border border-white/10 rounded-lg px-2 py-1 text-[10px] text-slate-300 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="gemini-3.1-flash-image-preview">Flash Image Engine</option>
                          <option value="gemini-3-pro-image-preview">Pro Studio Engine</option>
                        </select>
                      </div>

                      <div className="relative">
                        <textarea
                          rows={2}
                          value={imagePrompt}
                          onChange={(e) => setImagePrompt(e.target.value)}
                          placeholder="Describe the image you want to generate (e.g. 'Epic futuristic space explorer, synthwave vibes')..."
                          className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
                        />
                      </div>

                      {/* Aspect ratio selector */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-slate-400 font-mono">Aspect Ratio</span>
                        <div className="grid grid-cols-4 gap-1.5">
                          {aspectRatios.map((ar) => (
                            <button
                              key={ar}
                              onClick={() => setSelectedAspectRatio(ar)}
                              className={`py-1.5 rounded-md border text-[10px] font-medium transition-all cursor-pointer ${
                                selectedAspectRatio === ar
                                  ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-400"
                                  : "bg-[#0a0a0c] border-white/5 text-slate-500 hover:text-white"
                              }`}
                            >
                              {ar}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Resolution scale (Only for Pro Studio model) */}
                      {imageModel === "gemini-3-pro-image-preview" && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] text-slate-400 font-mono">Resolution Size Limit</span>
                          <div className="grid grid-cols-3 gap-1.5">
                            {imageSizes.map((size) => (
                              <button
                                key={size}
                                onClick={() => setSelectedImageSize(size)}
                                className={`py-1.5 rounded-md border text-[10px] font-medium transition-all cursor-pointer ${
                                  selectedImageSize === size
                                    ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-400"
                                    : "bg-[#0a0a0c] border-white/5 text-slate-500 hover:text-white"
                                }`}
                              >
                                {size} Output
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <button
                        onClick={handleGenerateImage}
                        disabled={isGeneratingImage || !imagePrompt.trim()}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold text-xs rounded-xl flex items-center justify-center transition-colors shadow-lg cursor-pointer shadow-indigo-600/10"
                      >
                        {isGeneratingImage ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                            <span>Synthesizing Canvas Image...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 mr-2" />
                            <span>Create AI Image</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Image-to-Image editing module */}
                    <div className="space-y-3.5 bg-black/15 p-4 rounded-xl border border-white/5">
                      <span className="text-[11px] font-bold text-slate-300 block">Edit / Modify Existing Image</span>

                      <div className="flex items-center space-x-3">
                        {/* Custom Image Upload drop / selector */}
                        <div className="relative flex-1">
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleImageUpload} 
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                          <button className="w-full py-2 bg-[#0a0a0c] border border-white/10 hover:border-indigo-500/30 rounded-xl text-[11px] font-medium text-slate-400 transition-colors flex items-center justify-center">
                            <Upload className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                            {uploadedImagePreview ? "Change Base Image" : "Upload Base Image"}
                          </button>
                        </div>

                        {uploadedImagePreview && (
                          <div className="w-9 h-9 rounded-lg border border-white/10 overflow-hidden relative">
                            <img src={uploadedImagePreview} alt="upload preview" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>

                      <div className="relative">
                        <textarea
                          rows={2}
                          value={imageEditPrompt}
                          onChange={(e) => setImageEditPrompt(e.target.value)}
                          placeholder="Describe the edits (e.g. 'Change the sky to a neon purple aurora')..."
                          className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
                        />
                      </div>

                      <button
                        onClick={handleEditImage}
                        disabled={isEditingImage || !uploadedImageBase64 || !imageEditPrompt.trim()}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold text-xs rounded-xl flex items-center justify-center transition-colors shadow-lg cursor-pointer shadow-indigo-600/10"
                      >
                        {isEditingImage ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                            <span>Applying Prompt Edits...</span>
                          </>
                        ) : (
                          <>
                            <Compass className="w-3.5 h-3.5 mr-2" />
                            <span>Modify Image with AI</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Image Preview panel */}
              <div className="flex flex-col rounded-2xl border border-white/5 bg-[#0a0a0c] p-4 items-center justify-center min-h-[350px]">
                {generatedImageUrl || editedImageUrl ? (
                  <div className="w-full h-full flex flex-col justify-between items-center space-y-4">
                    <div className="flex-1 w-full flex items-center justify-center overflow-hidden rounded-xl border border-white/5 bg-black relative group">
                      <img
                        src={generatedImageUrl || editedImageUrl}
                        alt="AI Generation output"
                        className="max-h-[320px] object-contain rounded-xl"
                      />
                    </div>

                    <div className="w-full grid grid-cols-2 gap-3">
                      <a
                        href={generatedImageUrl || editedImageUrl}
                        download={`ai-generation-${Date.now()}.png`}
                        className="py-2.5 bg-zinc-800 hover:bg-zinc-750 text-white font-semibold text-xs rounded-xl flex items-center justify-center transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        <span>Download PNG</span>
                      </a>

                      <button
                        onClick={() => handleSendToThumbnailDesigner(generatedImageUrl || editedImageUrl)}
                        className="py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center justify-center transition-colors shadow-lg cursor-pointer"
                      >
                        <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
                        <span>Apply to Designer</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-3.5 p-6 max-w-sm">
                    <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto">
                      <ImageIcon className="w-6 h-6 text-slate-500" />
                    </div>
                    <h5 className="text-white font-semibold text-xs">Aesthetic Canvas Output</h5>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Your generated or modified studio-quality images will appear here instantly.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            WORKSPACE LAYOUT: AI VIDEO STUDIO
            =================================================================== */}
        {activeWorkspace === "video" && (
          <div className="p-6 flex flex-col flex-1 h-full justify-between">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch h-full">
              
              {/* Creator Settings Form */}
              <div className="space-y-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-6">
                    <Video className="w-5 h-5 text-indigo-400" />
                    <h4 className="text-white font-bold text-sm">Veo 3 Video Studio</h4>
                  </div>

                  <div className="space-y-4">
                    {/* Image upload for animate/image-to-video */}
                    <div className="space-y-3.5 bg-black/15 p-4 rounded-xl border border-white/5">
                      <span className="text-[11px] font-bold text-slate-300 block">Source Photo (Animate Image)</span>
                      
                      <div className="flex items-center space-x-3">
                        <div className="relative flex-1">
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleVideoSourceImageUpload} 
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                          <button className="w-full py-2 bg-[#0a0a0c] border border-white/10 hover:border-indigo-500/30 rounded-xl text-[11px] font-medium text-slate-400 transition-colors flex items-center justify-center">
                            <Upload className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                            {videoSourceImagePreview ? "Change Photo" : "Upload Photo to Animate"}
                          </button>
                        </div>

                        {videoSourceImagePreview && (
                          <div className="w-9 h-9 rounded-lg border border-white/10 overflow-hidden relative">
                            <img src={videoSourceImagePreview} alt="source thumbnail" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Text Prompt */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-300">Video Motion Prompt</span>
                      <textarea
                        rows={2.5}
                        value={videoPrompt}
                        onChange={(e) => setVideoPrompt(e.target.value)}
                        placeholder="Describe the action or subject motion (e.g. 'Cinematic tracking shot, neon waterfall in jungle, dramatic sunset'...) "
                        className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
                      />
                    </div>

                    {/* Controls */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Aspect Ratio */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-slate-400 font-mono">Aspect Ratio</span>
                        <select
                          value={videoAspectRatio}
                          onChange={(e) => setVideoAspectRatio(e.target.value)}
                          className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="16:9">16:9 Landscape</option>
                          <option value="9:16">9:16 Portrait</option>
                        </select>
                      </div>

                      {/* Resolution */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-slate-400 font-mono">Resolution</span>
                        <select
                          value={videoResolution}
                          onChange={(e) => setVideoResolution(e.target.value)}
                          className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="720p">720p HD</option>
                          <option value="1080p">1080p Full HD</option>
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={handleGenerateVideo}
                      disabled={videoJobStatus === "running" || (!videoPrompt.trim() && !videoSourceImageBase64)}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold text-xs rounded-xl flex items-center justify-center transition-colors shadow-lg cursor-pointer shadow-indigo-600/10"
                    >
                      {videoJobStatus === "running" ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                          <span>Generating Veo Clip...</span>
                        </>
                      ) : (
                        <>
                          <Video className="w-3.5 h-3.5 mr-2" />
                          <span>Render Veo Video</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Rendering status or Final Video Output Preview */}
              <div className="flex flex-col rounded-2xl border border-white/5 bg-[#0a0a0c] p-4 items-center justify-center min-h-[350px]">
                {videoJobStatus === "running" ? (
                  <div className="text-center space-y-4 max-w-xs animate-pulse">
                    <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mx-auto" />
                    <h5 className="text-white font-semibold text-xs">Veo 3 Engine Rendering</h5>
                    <p className="text-[10px] text-slate-400 font-mono italic leading-relaxed">
                      &ldquo;{reassuringMessage}&rdquo;
                    </p>
                    <p className="text-[9px] text-slate-600">
                      High-fidelity video rendering is computationally intense and typically completes in 30-90 seconds. Please keep this screen open.
                    </p>
                  </div>
                ) : veoDownloadLoading ? (
                  <div className="text-center space-y-3.5 max-w-xs">
                    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                    <h5 className="text-white font-semibold text-xs">Downloading Asset</h5>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Securely pulling final generated video container from Google Cloud...
                    </p>
                  </div>
                ) : veoResultUrl ? (
                  <div className="w-full h-full flex flex-col justify-between items-center space-y-4">
                    {isVideoFallback && (
                      <div className="w-full bg-indigo-600/10 border border-indigo-500/20 rounded-xl p-3 flex items-center space-x-2 text-[10px] text-indigo-400">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 animate-pulse" />
                        <span className="font-semibold">{videoMessage || "Served standard stock video because direct generation is restricted or your key has hit rate limits."}</span>
                      </div>
                    )}
                    <div className="flex-1 w-full flex items-center justify-center overflow-hidden rounded-xl border border-white/5 bg-black relative">
                      <video
                        src={veoResultUrl}
                        controls
                        className="max-h-[320px] rounded-xl w-full"
                        autoPlay
                        loop
                        muted
                      />
                    </div>

                    <div className="w-full grid grid-cols-2 gap-3">
                      <a
                        href={veoResultUrl}
                        download={`veo-video-${Date.now()}.mp4`}
                        className="py-2.5 bg-zinc-800 hover:bg-zinc-750 text-white font-semibold text-xs rounded-xl flex items-center justify-center transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        <span>Download MP4</span>
                      </a>

                      <button
                        onClick={handleSendToVideoStudio}
                        className="py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center justify-center transition-colors shadow-lg cursor-pointer"
                      >
                        <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
                        <span>Add to Studio Timeline</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-3.5 p-6 max-w-sm">
                    <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto">
                      <FileVideo className="w-6 h-6 text-slate-500" />
                    </div>
                    <h5 className="text-white font-semibold text-xs">Video Studio Preview</h5>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Rendered high-fidelity motion videos will appear here ready for direct timeline importation.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            WORKSPACE LAYOUT: AI MUSIC STUDIO (LYRIA)
            =================================================================== */}
        {activeWorkspace === "music" && (
          <div className="p-6 flex flex-col flex-1 h-full justify-between">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch h-full">
              
              {/* Settings Form */}
              <div className="space-y-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-6">
                    <Music className="w-5 h-5 text-indigo-400" />
                    <h4 className="text-white font-bold text-sm">Lyria 3 Music Engine</h4>
                  </div>

                  <div className="space-y-4">
                    {/* Prompt */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-300">Composition Prompt</span>
                      <textarea
                        rows={3}
                        value={musicPrompt}
                        onChange={(e) => setMusicPrompt(e.target.value)}
                        placeholder="Describe the genre, mood, tempo, and instruments (e.g. 'Chill lo-fi hip hop beat with smooth saxophone and soft rain sounds, perfect for background video')..."
                        className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
                      />
                    </div>

                    {/* Duration mode */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-slate-400 font-mono">Composition Duration</span>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setDurationMode("clip")}
                          className={`py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                            durationMode === "clip"
                              ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-400"
                              : "bg-[#0a0a0c] border-white/5 text-slate-500 hover:text-white"
                          }`}
                        >
                          Short Clip (Up to 30s)
                        </button>
                        <button
                          onClick={() => setDurationMode("full")}
                          className={`py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                            durationMode === "full"
                              ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-400"
                              : "bg-[#0a0a0c] border-white/5 text-slate-500 hover:text-white"
                          }`}
                        >
                          Full Loop (Up to 90s)
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleGenerateMusic}
                      disabled={isGeneratingMusic || !musicPrompt.trim()}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold text-xs rounded-xl flex items-center justify-center transition-colors shadow-lg cursor-pointer"
                    >
                      {isGeneratingMusic ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                          <span>Generating Background Music...</span>
                        </>
                      ) : (
                        <>
                          <Music className="w-3.5 h-3.5 mr-2" />
                          <span>Compose AI Track</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Player / Preview */}
              <div className="flex flex-col rounded-2xl border border-white/5 bg-[#0a0a0c] p-5 items-center justify-center min-h-[350px]">
                {isGeneratingMusic ? (
                  <div className="text-center space-y-4 max-w-xs">
                    <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mx-auto" />
                    <h5 className="text-white font-semibold text-xs animate-pulse">Composing Audio Waves</h5>
                    <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
                      Lyria is synthesizing acoustic frequencies & arranging musical elements. This takes 10-25 seconds...
                    </p>
                  </div>
                ) : musicResultUrl ? (
                  <div className="w-full h-full flex flex-col justify-between items-center space-y-6">
                    <div className="text-center space-y-2 pt-6">
                      <div className="w-16 h-16 bg-indigo-600/10 border border-indigo-500/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
                        <Volume2 className="w-8 h-8 text-indigo-400" />
                      </div>
                      <h5 className="text-white font-bold text-xs">Generated Audio Asset</h5>
                      <p className="text-[9px] text-slate-500 font-mono">Format: MP3 Audio Container</p>
                    </div>

                    <div className="w-full bg-[#16161a] border border-white/5 rounded-xl p-4 flex items-center justify-center">
                      <audio src={musicResultUrl} controls className="w-full" />
                    </div>

                    {musicMessage && (
                      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-[10px] text-amber-400 leading-normal text-center">
                        {musicMessage}
                      </div>
                    )}

                    <div className="w-full grid grid-cols-2 gap-3">
                      <a
                        href={musicResultUrl}
                        download={`lyria-audio-${Date.now()}.mp3`}
                        className="py-2.5 bg-zinc-800 hover:bg-zinc-750 text-white font-semibold text-xs rounded-xl flex items-center justify-center transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        <span>Download MP3</span>
                      </a>

                      <button
                        onClick={handleSendMusicToVideoEditor}
                        className="py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center justify-center transition-colors shadow-lg cursor-pointer"
                      >
                        <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
                        <span>Add to Editor</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-3.5 p-6 max-w-sm">
                    <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto">
                      <Music className="w-6 h-6 text-slate-500" />
                    </div>
                    <h5 className="text-white font-semibold text-xs">Acoustic Timeline Studio</h5>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Generated background scores and acoustic loops will render here with full player controls.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            WORKSPACE LAYOUT: AUDIO TRANSCRIPTION
            =================================================================== */}
        {activeWorkspace === "transcribe" && (
          <div className="p-6 flex flex-col flex-1 h-full justify-between">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch h-full">
              
              {/* Settings / Upload */}
              <div className="space-y-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-6">
                    <Mic className="w-5 h-5 text-indigo-400" />
                    <h4 className="text-white font-bold text-sm">Speech & Voice Transcription</h4>
                  </div>

                  <div className="space-y-5">
                    {/* Recording block */}
                    <div className="bg-black/15 border border-white/5 p-4 rounded-xl space-y-3.5">
                      <span className="text-[11px] font-bold text-slate-300 block">Record Microphone Input</span>
                      
                      <div className="flex items-center justify-between">
                        {isRecording ? (
                          <div className="flex items-center space-x-2">
                            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                            <span className="text-xs text-red-400 font-mono">Recording: {recordingSeconds}s</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500">Microphone idle</span>
                        )}

                        {isRecording ? (
                          <button
                            onClick={stopRecording}
                            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold rounded-lg cursor-pointer transition-colors"
                          >
                            Stop & Load
                          </button>
                        ) : (
                          <button
                            onClick={startRecording}
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold rounded-lg cursor-pointer transition-colors"
                          >
                            Record Voice
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Standard Audio Upload */}
                    <div className="bg-black/15 border border-white/5 p-4 rounded-xl space-y-3">
                      <span className="text-[11px] font-bold text-slate-300 block">Or Upload Existing Audio</span>
                      
                      <div className="relative">
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={handleAudioUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <button className="w-full py-2 bg-[#0a0a0c] border border-white/10 rounded-xl text-[11px] text-slate-400 transition-colors flex items-center justify-center hover:border-indigo-500/35">
                          <Upload className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                          {audioFile ? audioFile.name : "Choose audio file..."}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleTranscribeAudio}
                      disabled={isTranscribing || !audioBase64}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold text-xs rounded-xl flex items-center justify-center transition-colors shadow-lg cursor-pointer"
                    >
                      {isTranscribing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                          <span>Gemini is Transcribing...</span>
                        </>
                      ) : (
                        <>
                          <FileAudio className="w-3.5 h-3.5 mr-2" />
                          <span>Transcribe with Gemini</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Transcript Output */}
              <div className="flex flex-col rounded-2xl border border-white/5 bg-[#0a0a0c] p-4 items-center justify-center min-h-[350px]">
                {isTranscribing ? (
                  <div className="text-center space-y-3.5">
                    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                    <h5 className="text-white font-semibold text-xs">Analyzing Acoustic Textures</h5>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Mapping speech phonemes & speech-to-text formatting...
                    </p>
                  </div>
                ) : transcriptText ? (
                  <div className="w-full h-full flex flex-col justify-between items-stretch space-y-4 font-sans">
                    <div className="flex-1 overflow-y-auto p-4 bg-black/40 border border-white/5 rounded-xl text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap max-h-[260px] custom-scrollbar">
                      {transcriptText}
                    </div>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(transcriptText);
                        alert("Transcript copied to clipboard!");
                      }}
                      className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-750 text-white font-semibold text-xs rounded-xl flex items-center justify-center transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5 mr-1.5" />
                      <span>Copy Transcript</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-center space-y-3.5 p-6 max-w-sm">
                    <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto">
                      <Mic className="w-6 h-6 text-slate-500" />
                    </div>
                    <h5 className="text-white font-semibold text-xs">Transcriber Output</h5>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Your high-fidelity verbatim speech transcription will appear here, instantly formatted with paragraphs.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            WORKSPACE LAYOUT: VIDEO INTELLIGENCE
            =================================================================== */}
        {activeWorkspace === "analytics" && (
          <div className="p-6 flex flex-col flex-1 h-full justify-between">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch h-full">
              
              {/* Settings / Upload */}
              <div className="space-y-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-6">
                    <FileVideo className="w-5 h-5 text-indigo-400" />
                    <h4 className="text-white font-bold text-sm">Multimodal Video Intelligence</h4>
                  </div>

                  <div className="space-y-4">
                    {/* Video Selector */}
                    <div className="bg-black/15 border border-white/5 p-4 rounded-xl space-y-3">
                      <span className="text-[11px] font-bold text-slate-300 block">Select Video File</span>
                      <div className="relative">
                        <input
                          type="file"
                          accept="video/*"
                          onChange={handleIntelVideoUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <button className="w-full py-2.5 bg-[#0a0a0c] border border-white/10 rounded-xl text-[11px] text-slate-400 transition-colors flex items-center justify-center hover:border-indigo-500/35">
                          <Upload className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                          {intelVideoFile ? intelVideoFile.name : "Select video to analyze..."}
                        </button>
                      </div>
                    </div>

                    {/* Query input */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-300">Analysis Prompt Query</span>
                      <textarea
                        rows={3}
                        value={intelQuery}
                        onChange={(e) => setIntelQuery(e.target.value)}
                        placeholder="What should Gemini analyze in this video (e.g. 'Help me draft an engaging title and list 5 main topics of discussion')..."
                        className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
                      />
                    </div>

                    <button
                      onClick={handleAnalyzeVideoIntel}
                      disabled={isAnalyzingIntel || !intelVideoBase64}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold text-xs rounded-xl flex items-center justify-center transition-colors shadow-lg cursor-pointer"
                    >
                      {isAnalyzingIntel ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                          <span>Gemini is Scanning Video...</span>
                        </>
                      ) : (
                        <>
                          <FileVideo className="w-3.5 h-3.5 mr-2" />
                          <span>Run AI Video Analysis</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Player and Output */}
              <div className="flex flex-col rounded-2xl border border-white/5 bg-[#0a0a0c] p-4 items-center justify-center min-h-[350px]">
                {isAnalyzingIntel ? (
                  <div className="text-center space-y-3.5">
                    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                    <h5 className="text-white font-semibold text-xs animate-pulse">Decomposing Video Frames</h5>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Running multimodal temporal mapping...
                    </p>
                  </div>
                ) : intelResponse ? (
                  <div className="w-full h-full flex flex-col justify-between items-stretch space-y-4">
                    {intelVideoPreview && (
                      <div className="h-[120px] rounded-lg overflow-hidden border border-white/5 bg-black relative flex items-center justify-center">
                        <video src={intelVideoPreview} controls className="max-h-full object-contain" />
                      </div>
                    )}
                    <div className="flex-1 overflow-y-auto p-4 bg-black/40 border border-white/5 rounded-xl text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap max-h-[220px] custom-scrollbar">
                      {intelResponse}
                    </div>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(intelResponse);
                        alert("Video analysis copied to clipboard!");
                      }}
                      className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-750 text-white font-semibold text-xs rounded-xl flex items-center justify-center transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5 mr-1.5" />
                      <span>Copy Full Report</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-center space-y-3.5 p-6 max-w-sm">
                    {intelVideoPreview ? (
                      <div className="w-full h-[150px] rounded-xl overflow-hidden border border-white/5 bg-black relative flex items-center justify-center">
                        <video src={intelVideoPreview} className="max-h-full object-contain" muted autoPlay loop />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto">
                        <FileVideo className="w-6 h-6 text-slate-500" />
                      </div>
                    )}
                    <h5 className="text-white font-semibold text-xs">Video Analysis Hub</h5>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Upload a clip to run advanced narrative breakdown, visual pacing, dialogue analysis, and automatic metadata/tag creation.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
    </div>
  );
}
