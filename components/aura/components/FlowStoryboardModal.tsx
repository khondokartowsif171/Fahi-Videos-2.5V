import { auraFetch as fetch } from '../api-client';
import React, { useState } from 'react';
import {
  X,
  Film,
  Layers,
  Sparkles,
  ArrowRight,
  Download,
  Plus,
  Trash2,
  Camera,
  Compass,
  Check,
  Eye,
  Wand2,
  ChevronRight,
  MoveHorizontal
} from 'lucide-react';
import { CAMERA_MOVES, LENSES, LIGHTING_ATMOS } from './FlowCreativeSuite';

export interface FlowNode {
  id: string;
  shotNumber: number;
  title: string;
  prompt: string;
  technique: string;
  camera: string;
  lens: string;
  lighting: string;
  imageUrl?: string;
  isGeneratingImage?: boolean;
}

interface FlowStoryboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySequenceShot: (prompt: string, technique: string, imageSrc?: string) => void;
  headImage?: string;
  tailImage?: string;
}

export default function FlowStoryboardModal({
  isOpen,
  onClose,
  onApplySequenceShot,
  headImage,
  tailImage
}: FlowStoryboardModalProps) {
  const [nodes, setNodes] = useState<FlowNode[]>([
    {
      id: 'shot-1',
      shotNumber: 1,
      title: 'Act I: The Establishing Horizon',
      prompt: 'Cinematic wide push-in through misty mountain pass at dawn with golden sun flare',
      technique: 'object-portal',
      camera: 'Dolly Push-in',
      lens: '24mm Cine Wide',
      lighting: 'Golden Hour Sunflare',
      imageUrl: headImage
    },
    {
      id: 'shot-2',
      shotNumber: 2,
      title: 'Act II: Optical Passage',
      prompt: 'Camera enters an ancient mirrored stone portal, optical motion blur accelerates rapidly',
      technique: 'whip-pan',
      camera: 'Whip Pan Right',
      lens: '35mm Cine Prime',
      lighting: 'Volumetric God Rays'
    },
    {
      id: 'shot-3',
      shotNumber: 3,
      title: 'Act III: Cyber Metropolis Arrival',
      prompt: 'Camera emerges from the portal into a vibrant neon-lit cyberpunk boulevard in the rain',
      technique: 'sky-drop',
      camera: 'Crane Jib Rise',
      lens: '50mm Natural Lens',
      lighting: 'Cyberpunk Neon Noir',
      imageUrl: tailImage
    }
  ]);

  const [copied, setCopied] = useState(false);
  const [activeGeneratingId, setActiveGeneratingId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Add new dynamic flow node (Zero hardcoded!)
  const handleAddNode = () => {
    const nextNum = nodes.length + 1;
    const newNode: FlowNode = {
      id: `shot-${Date.now()}`,
      shotNumber: nextNum,
      title: `Act ${nextNum}: Scene Continuation`,
      prompt: 'Dynamic camera move following subject through volumetric atmosphere with cinematic lighting',
      technique: 'foreground-wipe',
      camera: 'Steadicam Follow',
      lens: '35mm Cine Prime',
      lighting: 'Volumetric God Rays'
    };
    setNodes([...nodes, newNode]);
  };

  // Delete node
  const handleDeleteNode = (id: string) => {
    if (nodes.length <= 1) return;
    const filtered = nodes.filter(n => n.id !== id).map((n, idx) => ({
      ...n,
      shotNumber: idx + 1,
      title: n.title.startsWith('Act') ? `Act ${idx + 1}: ${n.title.split(': ')[1] || 'Scene'}` : n.title
    }));
    setNodes(filtered);
  };

  // Update specific node property
  const handleUpdateNode = (id: string, updates: Partial<FlowNode>) => {
    setNodes(nodes.map(n => n.id === id ? { ...n, ...updates } : n));
  };

  // Generate Image for this node via real-time Gemini API
  const handleGenerateNodeImage = async (node: FlowNode) => {
    setActiveGeneratingId(node.id);
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${node.prompt}, ${node.camera}, ${node.lens}, ${node.lighting}, cinematic masterpiece photo, 8k resolution`,
          aspectRatio: '16:9'
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to generate frame');

      handleUpdateNode(node.id, { imageUrl: data.imageUrl });
    } catch (err: any) {
      console.error(err);
      alert(`Frame generation error: ${err.message}`);
    } finally {
      setActiveGeneratingId(null);
    }
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(nodes, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = 'google-flow-storyboard-sequence.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopySpec = () => {
    const text = nodes.map(n =>
      `[Shot ${n.shotNumber.toString().padStart(2, '0')}] ${n.title}\n` +
      `  Camera: ${n.camera} | Optics: ${n.lens} | Light: ${n.lighting}\n` +
      `  Transition: ${n.technique}\n` +
      `  Direction: "${n.prompt}"\n`
    ).join('\n---\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 select-none">
      <div className="bg-[#0f0f13] border border-[#24242e] rounded-2xl w-full max-w-6xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">

        {/* Header */}
        <div className="p-4 sm:px-6 sm:py-3.5 border-b border-[#222228] flex items-center justify-between shrink-0 bg-[#121217]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 via-indigo-600 to-violet-500 p-[1.5px] shrink-0">
              <div className="w-full h-full bg-black rounded-[6.5px] flex items-center justify-center">
                <Compass size={15} className="text-cyan-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                  Google Flow Multi-Shot Storyboard
                </h2>
                <span className="text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded font-mono font-bold hidden sm:inline-block">
                  Interactive Node Graph
                </span>
              </div>
              <p className="text-[10px] text-neutral-400">
                Choreograph uncut multi-shot cinematic transitions and live camera trajectories
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleAddNode}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center space-x-1 uppercase tracking-wider transition-colors shadow-sm"
              title="Add a new node to the Flow sequence"
            >
              <Plus size={13} strokeWidth={2.5} />
              <span className="hidden sm:inline">Add Shot</span>
            </button>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-white p-1.5 rounded-md transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Visual Flow Storyboard Stage */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">

          <div className="flex flex-col lg:flex-row items-stretch lg:items-start gap-4">
            {nodes.map((node, index) => {
              const isFirst = index === 0;
              const isLast = index === nodes.length - 1;
              const isGenerating = activeGeneratingId === node.id;

              return (
                <React.Fragment key={node.id}>
                  {/* Node Card */}
                  <div className="flex-1 min-w-[280px] bg-[#141418] border border-[#26262e] rounded-xl p-4 flex flex-col justify-between relative group hover:border-cyan-500/70 transition-all shadow-md">

                    {/* Node Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-[#202026] mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/80">
                          Shot {node.shotNumber.toString().padStart(2, '0')}
                        </span>
                        {isFirst && <span className="text-[9px] font-mono text-emerald-400">Head In</span>}
                        {isLast && !isFirst && <span className="text-[9px] font-mono text-purple-400">Tail Out</span>}
                      </div>

                      {nodes.length > 1 && (
                        <button
                          onClick={() => handleDeleteNode(node.id)}
                          className="text-neutral-500 hover:text-red-400 p-1 rounded transition-colors opacity-70 group-hover:opacity-100"
                          title="Delete shot node"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    {/* Keyframe Visual Preview */}
                    <div className="aspect-video bg-black rounded-lg border border-[#222228] overflow-hidden mb-3 relative flex items-center justify-center group/img">
                      {node.imageUrl ? (
                        <img src={node.imageUrl} alt={node.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-neutral-500 space-y-1 p-2 text-center">
                          <Film size={20} className="text-neutral-600" />
                          <span className="text-[9px] font-mono uppercase text-neutral-400">Empty Keyframe</span>
                        </div>
                      )}

                      {/* AI Generate Keyframe button overlay */}
                      <button
                        onClick={() => handleGenerateNodeImage(node)}
                        disabled={isGenerating}
                        className="absolute bottom-2 right-2 bg-black/85 hover:bg-white hover:text-black text-white text-[9px] font-mono uppercase px-2 py-1 rounded shadow-md border border-neutral-700 flex items-center space-x-1 transition-all"
                        title="Generate realistic keyframe with Gemini 3.1 Flash Image"
                      >
                        {isGenerating ? (
                          <>
                            <div className="w-2.5 h-2.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <Wand2 size={10} className="text-cyan-400" />
                            <span>AI Keyframe</span>
                          </>
                        )}
                      </button>

                      {node.imageUrl && (
                        <div className="absolute top-1.5 left-1.5 bg-black/80 text-[8px] font-mono text-neutral-300 px-1.5 py-0.5 rounded border border-neutral-800">
                          {node.lens}
                        </div>
                      )}
                    </div>

                    {/* Editable Shot Details (Zero Hardcoded!) */}
                    <div className="space-y-2 flex-1">
                      <input
                        type="text"
                        value={node.title}
                        onChange={(e) => handleUpdateNode(node.id, { title: e.target.value })}
                        className="w-full bg-transparent border-none text-xs font-bold text-white outline-none focus:text-cyan-300"
                        placeholder="Shot title..."
                      />

                      <textarea
                        value={node.prompt}
                        onChange={(e) => handleUpdateNode(node.id, { prompt: e.target.value })}
                        rows={2}
                        className="w-full bg-[#0c0c0e] border border-[#222228] focus:border-cyan-500 rounded p-2 text-[11px] text-neutral-300 outline-none resize-none font-normal leading-relaxed"
                        placeholder="Cinematography prompt..."
                      />

                      {/* Config Row */}
                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        <div>
                          <label className="text-[8px] uppercase font-mono text-neutral-400 block mb-0.5">Camera</label>
                          <select
                            value={node.camera}
                            onChange={(e) => handleUpdateNode(node.id, { camera: e.target.value })}
                            className="w-full bg-[#181820] border border-[#2a2a34] text-neutral-300 text-[9px] rounded p-1 outline-none"
                          >
                            {CAMERA_MOVES.map(c => (
                              <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[8px] uppercase font-mono text-neutral-400 block mb-0.5">Optics</label>
                          <select
                            value={node.lens}
                            onChange={(e) => handleUpdateNode(node.id, { lens: e.target.value })}
                            className="w-full bg-[#181820] border border-[#2a2a34] text-neutral-300 text-[9px] rounded p-1 outline-none"
                          >
                            {LENSES.map(l => (
                              <option key={l.id} value={l.name}>{l.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Transition Technique to next node */}
                      {!isLast && (
                        <div className="pt-1">
                          <label className="text-[8px] uppercase font-mono text-cyan-400 block mb-0.5">Flow Transition Out</label>
                          <select
                            value={node.technique}
                            onChange={(e) => handleUpdateNode(node.id, { technique: e.target.value })}
                            className="w-full bg-[#181820] border border-cyan-800/80 text-cyan-200 text-[9px] rounded p-1 outline-none font-mono"
                          >
                            <option value="object-portal">Object Portal Flow</option>
                            <option value="whip-pan">High-Speed Whip Pan</option>
                            <option value="sky-drop">Atmospheric Sky Drop</option>
                            <option value="match-morph">Match Cut Morph</option>
                            <option value="foreground-wipe">Foreground Element Wipe</option>
                            <option value="time-machine">Lighting Time Machine</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Load Into Studio Button */}
                    <button
                      onClick={() => {
                        onApplySequenceShot(node.prompt, node.technique, node.imageUrl);
                        onClose();
                      }}
                      className="mt-3 w-full bg-[#1e1e24] hover:bg-white hover:text-black text-white text-[10px] font-bold py-1.5 rounded-lg flex items-center justify-center space-x-1 uppercase tracking-wider transition-all"
                    >
                      <span>Load Shot {node.shotNumber} into Studio</span>
                      <ArrowRight size={11} />
                    </button>
                  </div>

                  {/* Flow Connector Arrow between nodes */}
                  {!isLast && (
                    <div className="hidden lg:flex flex-col items-center justify-center self-center shrink-0 px-1 text-cyan-500">
                      <div className="w-7 h-7 rounded-full bg-cyan-950/80 border border-cyan-700/80 flex items-center justify-center shadow-md">
                        <MoveHorizontal size={14} className="text-cyan-300" />
                      </div>
                      <span className="text-[8px] font-mono text-cyan-400 mt-1 uppercase tracking-widest text-center max-w-[80px] truncate">
                        {node.technique.replace('-', ' ')}
                      </span>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:px-6 border-t border-[#222228] bg-[#121217] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2 text-[10px] text-neutral-400 font-mono">
            <span>{nodes.length} Dynamic Flow Nodes</span>
            <span>·</span>
            <span>Uncut Sequence Graph</span>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleCopySpec}
              className="flex-1 sm:flex-none bg-[#18181e] hover:bg-[#222228] text-neutral-300 hover:text-white border border-[#282832] text-xs px-3 py-1.5 rounded-lg flex items-center justify-center space-x-1.5 transition-colors font-medium"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Layers size={13} />}
              <span>{copied ? 'Copied' : 'Copy Spec'}</span>
            </button>

            <button
              onClick={handleExportJson}
              className="flex-1 sm:flex-none bg-white hover:bg-neutral-200 text-black text-xs font-bold px-3.5 py-1.5 rounded-lg flex items-center justify-center space-x-1.5 uppercase tracking-wider transition-colors"
            >
              <Download size={13} strokeWidth={2.5} />
              <span>Export JSON</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
