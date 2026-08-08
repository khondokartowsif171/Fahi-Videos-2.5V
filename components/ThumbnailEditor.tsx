"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Undo2, Redo2 } from "lucide-react";
import { useHistory } from "@/hooks/useHistory";
import { Download, Type, Image as ImageIcon, LayoutTemplate, Palette, Sparkles, Upload, Settings2, SlidersHorizontal } from "lucide-react";
import * as htmlToImage from "html-to-image";
import { logActivity } from "@/lib/activity";

export default function ThumbnailEditor() {
    const canvasRef = useRef<HTMLDivElement>(null);
    
    const [editorState, setEditorState, { undo, redo, canUndo, canRedo }] = useHistory({
    bgImage: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop",
    bgBlur: 0,
    bgBrightness: 100,
    bgSaturation: 100,
    bgContrast: 100,
    headline: "AWESOME THUMBNAIL",
    subhead: "Watch this video to learn more",
    headlineColor: "#ffffff",
    subheadColor: "#a5b4fc",
    headlineSize: 100,
    subheadSize: 100,
    textShadow: 60,
    fontWeight: "font-black" as "font-normal" | "font-semibold" | "font-bold" | "font-black",
    layout: "center" as "center" | "bottom-left" | "top-left" | "top-right" | "bottom-right",
    overlayOpacity: 40
});

    const updateState = (key: keyof typeof editorState, value: any) => {
        setEditorState(prev => ({ ...prev, [key]: value }));
    };

    const {
        bgImage, bgBlur, bgBrightness, bgSaturation, bgContrast,
        headline, subhead, headlineColor, subheadColor, headlineSize, subheadSize,
        textShadow, fontWeight, layout, overlayOpacity
    } = editorState;

    const setBgImage = (v: any) => updateState('bgImage', typeof v === 'function' ? v(bgImage) : v);
    const setBgBlur = (v: any) => updateState('bgBlur', typeof v === 'function' ? v(bgBlur) : v);
    const setBgBrightness = (v: any) => updateState('bgBrightness', typeof v === 'function' ? v(bgBrightness) : v);
    const setBgSaturation = (v: any) => updateState('bgSaturation', typeof v === 'function' ? v(bgSaturation) : v);
    const setBgContrast = (v: any) => updateState('bgContrast', typeof v === 'function' ? v(bgContrast) : v);
    const setHeadline = (v: any) => updateState('headline', typeof v === 'function' ? v(headline) : v);
    const setSubhead = (v: any) => updateState('subhead', typeof v === 'function' ? v(subhead) : v);
    const setHeadlineColor = (v: any) => updateState('headlineColor', typeof v === 'function' ? v(headlineColor) : v);
    const setSubheadColor = (v: any) => updateState('subheadColor', typeof v === 'function' ? v(subheadColor) : v);
    const setHeadlineSize = (v: any) => updateState('headlineSize', typeof v === 'function' ? v(headlineSize) : v);
    const setSubheadSize = (v: any) => updateState('subheadSize', typeof v === 'function' ? v(subheadSize) : v);
    const setTextShadow = (v: any) => updateState('textShadow', typeof v === 'function' ? v(textShadow) : v);
    const setFontWeight = (v: any) => updateState('fontWeight', typeof v === 'function' ? v(fontWeight) : v);
    const setLayout = (v: any) => updateState('layout', typeof v === 'function' ? v(layout) : v);
    const setOverlayOpacity = (v: any) => updateState('overlayOpacity', typeof v === 'function' ? v(overlayOpacity) : v);

    
    const [isExporting, setIsExporting] = useState(false);
    const [activeTab, setActiveTab] = useState<"background" | "typography">("background");

    useEffect(() => {
        const handleCustomBg = (e: any) => {
            if (e.detail?.imageUrl) {
                setEditorState(prev => ({ ...prev, bgImage: e.detail.imageUrl }));
            }
        };
        window.addEventListener("set-thumbnail-bg" as any, handleCustomBg);
        return () => {
            window.removeEventListener("set-thumbnail-bg" as any, handleCustomBg);
        };
    }, [setEditorState]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeEl = document.activeElement;
            if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || (activeEl as HTMLElement).isContentEditable)) {
                return;
            }
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
                if (e.shiftKey) {
                    e.preventDefault();
                    if (canRedo) redo();
                } else {
                    e.preventDefault();
                    if (canUndo) undo();
                }
            } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                if (canRedo) redo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo, canUndo, canRedo]);

    const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const url = URL.createObjectURL(e.target.files[0]);
            setBgImage(url);
        }
    };

    const handleExport = useCallback(async () => {
        if (!canvasRef.current) return;
        setIsExporting(true);
        try {
            const dataUrl = await htmlToImage.toJpeg(canvasRef.current, { quality: 0.95, width: 1280, height: 720 });
            const link = document.createElement("a");
            link.download = "thumbnail-export.jpg";
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            logActivity({
                type: "image_edit",
                title: headline || "Custom Thumbnail",
                metadata: { format: "jpg" }
            });
        } catch (err) {
            console.error("Export failed:", err);
            alert("Failed to export thumbnail.");
        } finally {
            setIsExporting(false);
        }
    }, [canvasRef, headline]);

    const bgFilterStyle = `blur(${bgBlur}px) brightness(${bgBrightness}%) saturate(${bgSaturation}%) contrast(${bgContrast}%)`;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20 md:pb-0 h-[calc(100vh-140px)] animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Sidebar Controls */}
          <div className="lg:col-span-4 space-y-4 overflow-y-auto pr-2 pb-10 custom-scrollbar">
            <div className="rounded-3xl border border-white/[0.06] bg-[#111115]/95 backdrop-blur-md p-6 shadow-[0_12px_40px_-15px_rgba(0,0,0,0.7)] relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-white font-extrabold flex items-center text-sm tracking-tight"><Sparkles className="w-4 h-4 mr-2 text-indigo-400 animate-pulse"/> Designer Toolkit</h3>
                 <div className="flex space-x-1">
                     <button onClick={undo} disabled={!canUndo} className="p-1.5 hover:bg-white/[0.04] rounded-lg transition-colors text-white disabled:opacity-50" title="Undo"><Undo2 className="w-4 h-4"/></button>
                     <button onClick={redo} disabled={!canRedo} className="p-1.5 hover:bg-white/[0.04] rounded-lg transition-colors text-white disabled:opacity-50" title="Redo"><Redo2 className="w-4 h-4"/></button>
                 </div>
               </div>
               
               {/* Tab Navigation */}
               <div className="flex space-x-1 bg-[#07070a] p-1 rounded-2xl border border-white/[0.04] mb-6">
                    <button 
                        onClick={() => setActiveTab("background")}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex justify-center items-center cursor-pointer ${activeTab === 'background' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'}`}
                    >
                        <ImageIcon className="w-3.5 h-3.5 mr-1.5"/> Background
                    </button>
                    <button 
                        onClick={() => setActiveTab("typography")}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex justify-center items-center cursor-pointer ${activeTab === 'typography' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'}`}
                    >
                        <Type className="w-3.5 h-3.5 mr-1.5"/> Typography
                    </button>
               </div>
               
               {activeTab === "background" && (
                   <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                       <div className="space-y-3">                             <label className="text-[10px] text-indigo-400 uppercase tracking-widest font-mono flex items-center font-bold">
                                 <Upload className="w-3 h-3 mr-1.5"/> Background Image / Preset
                             </label>
                             <div className="flex space-x-2">
                                 <input type="text" value={bgImage} onChange={(e) => setBgImage(e.target.value)} placeholder="Image URL..." className="flex-1 bg-[#07070a] border border-white/5 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:border-indigo-500/60 focus:outline-none" />
                                 <div className="relative flex-shrink-0">
                                     <input type="file" id="bg-upload" accept="image/*" onChange={handleBgUpload} className="absolute inset-0 opacity-0 cursor-pointer w-full" />
                                     <button className="bg-white/5 hover:bg-white/10 px-4 py-3 rounded-xl border border-white/5 text-slate-300 transition-colors h-full flex items-center justify-center cursor-pointer">
                                         <Upload className="w-4 h-4"/>
                                     </button>
                                 </div>
                             </div>
                             
                             <div className="space-y-1.5 pt-2">
                                 <span className="text-[10px] text-slate-500 font-mono font-bold tracking-wider uppercase block">Gradient Presets:</span>
                                 <div className="grid grid-cols-4 gap-2">
                                     {[
                                         {"name": "Cosmic", "url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200"},
                                         {"name": "Neon", "url": "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1200"},
                                         {"name": "Aurora", "url": "https://images.unsplash.com/photo-1557672172-298e090bd0f1?q=80&w=1200"},
                                         {"name": "Minimal", "url": "https://images.unsplash.com/photo-1618005198143-e5283b519a7f?q=80&w=1200"}
                                     ].map((p) => (
                                         <button
                                             key={p.name}
                                             type="button"
                                             onClick={() => setBgImage(p.url)}
                                             className="group/btn relative h-10 rounded-xl overflow-hidden border border-white/5 hover:border-indigo-500/50 transition-all cursor-pointer bg-black/40"
                                         >
                                             <img src={p.url} alt={p.name} className="w-full h-full object-cover opacity-80 group-hover/btn:scale-110 transition-transform duration-300" />
                                             <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                 <span className="text-[8px] font-bold font-mono tracking-tighter text-white">{p.name}</span>
                                             </div>
                                         </button>
                                     ))}
                                 </div>
                             </div>
                       </div>

                       <div className="space-y-4 pt-4 border-t border-white/5">
                            <label className="text-[10px] text-slate-500 uppercase tracking-wider font-mono flex items-center">
                                <Settings2 className="w-3 h-3 mr-1"/> Adjustments & Filters
                            </label>
                            
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-[10px] text-slate-400">
                                     <span>Darken Overlay</span><span>{overlayOpacity}%</span>
                                </div>
                                <input type="range" min="0" max="100" value={overlayOpacity} onChange={(e) => setOverlayOpacity(parseInt(e.target.value))} className="w-full accent-indigo-500 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer" />
                            </div>
                            
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-[10px] text-slate-400">
                                     <span>Blur Amount</span><span>{bgBlur}px</span>
                                </div>
                                <input type="range" min="0" max="20" value={bgBlur} onChange={(e) => setBgBlur(parseInt(e.target.value))} className="w-full accent-indigo-500 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer" />
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex justify-between text-[10px] text-slate-400">
                                     <span>Brightness</span><span>{bgBrightness}%</span>
                                </div>
                                <input type="range" min="0" max="200" value={bgBrightness} onChange={(e) => setBgBrightness(parseInt(e.target.value))} className="w-full accent-indigo-500 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer" />
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex justify-between text-[10px] text-slate-400">
                                     <span>Saturation</span><span>{bgSaturation}%</span>
                                </div>
                                <input type="range" min="0" max="200" value={bgSaturation} onChange={(e) => setBgSaturation(parseInt(e.target.value))} className="w-full accent-indigo-500 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer" />
                            </div>
                            
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-[10px] text-slate-400">
                                     <span>Contrast</span><span>{bgContrast}%</span>
                                </div>
                                <input type="range" min="0" max="200" value={bgContrast} onChange={(e) => setBgContrast(parseInt(e.target.value))} className="w-full accent-indigo-500 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer" />
                            </div>
                       </div>
                   </div>
               )}

               {activeTab === "typography" && (
                   <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                        <div className="space-y-5">
                            {/* Headline */}
                            <div className="space-y-3">
                                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Main Headline</label>
                                <textarea value={headline} onChange={(e) => setHeadline(e.target.value)} rows={2} placeholder="Headline..." className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-3 py-2 text-sm font-bold text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none" />
                                
                                <div className="grid grid-cols-2 gap-4">
                                     <div className="flex items-center space-x-2 bg-[#0a0a0c] p-1.5 rounded-lg border border-white/5">
                                          <input type="color" value={headlineColor} onChange={(e) => setHeadlineColor(e.target.value)} className="w-6 h-6 rounded border-none bg-transparent cursor-pointer" />
                                          <span className="text-[10px] text-slate-400 font-mono">Color</span>
                                     </div>
                                     <div className="flex items-center space-x-2">
                                          <span className="text-[10px] text-slate-400 font-mono">Scale</span>
                                          <input type="range" min="50" max="200" value={headlineSize} onChange={(e) => setHeadlineSize(parseInt(e.target.value))} className="w-full accent-indigo-500 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer" />
                                     </div>
                                </div>
                            </div>
                            
                            <hr className="border-white/5" />

                            {/* Subhead */}
                            <div className="space-y-3">
                                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Subheadline / Badges</label>
                                <input type="text" value={subhead} onChange={(e) => setSubhead(e.target.value)} placeholder="Subheadline..." className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                                
                                <div className="grid grid-cols-2 gap-4">
                                     <div className="flex items-center space-x-2 bg-[#0a0a0c] p-1.5 rounded-lg border border-white/5">
                                          <input type="color" value={subheadColor} onChange={(e) => setSubheadColor(e.target.value)} className="w-6 h-6 rounded border-none bg-transparent cursor-pointer" />
                                          <span className="text-[10px] text-slate-400 font-mono">Color</span>
                                     </div>
                                      <div className="flex items-center space-x-2">
                                          <span className="text-[10px] text-slate-400 font-mono">Scale</span>
                                          <input type="range" min="50" max="200" value={subheadSize} onChange={(e) => setSubheadSize(parseInt(e.target.value))} className="w-full accent-indigo-500 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer" />
                                     </div>
                                </div>
                            </div>

                            <hr className="border-white/5" />

                            {/* Typography Styles */}
                            <div className="space-y-4">
                                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-mono flex items-center">
                                    <Palette className="w-3 h-3 mr-1"/> Styling & Effects
                                </label>
                                
                                <div className="space-y-2">
                                    <span className="text-[10px] text-slate-400">Font Weight</span>
                                    <div className="grid grid-cols-4 gap-2 text-[10px]">
                                        {[
                                            { label: "Normal", val: "font-normal" },
                                            { label: "Bold", val: "font-bold" },
                                            { label: "Extra", val: "font-extrabold" },
                                            { label: "Black", val: "font-black" }
                                        ].map((w) => (
                                            <button 
                                                key={w.val} 
                                                onClick={() => setFontWeight(w.val as any)}
                                                className={`py-1.5 rounded border transition-colors ${fontWeight === w.val ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-400" : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"}`}
                                            >
                                                {w.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-1.5 pt-2">
                                    <div className="flex justify-between text-[10px] text-slate-400">
                                         <span>Text Shadow Depth</span><span>{textShadow}%</span>
                                    </div>
                                    <input type="range" min="0" max="100" value={textShadow} onChange={(e) => setTextShadow(parseInt(e.target.value))} className="w-full accent-indigo-500 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer" />
                                </div>
                            </div>

                            <hr className="border-white/5" />

                            {/* Layout Options */}
                           <div className="space-y-3">
                               <label className="text-[10px] text-slate-500 uppercase tracking-wider font-mono flex items-center">
                                    <LayoutTemplate className="w-3 h-3 mr-1"/> Positioning
                               </label>
                               <div className="grid grid-cols-3 gap-2 text-[10px]">
                                    {["top-left", "center", "top-right", "bottom-left", "bottom-right"].map((l) => (
                                         <button 
                                            key={l} 
                                            onClick={() => setLayout(l as any)}
                                            className={`py-2 rounded border transition-colors ${layout === l ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-400" : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"}`}
                                         >
                                             <span className="capitalize">{l.replace("-", " ")}</span>
                                         </button>
                                    ))}
                               </div>
                           </div>
                        </div>
                   </div>
               )}

               <div className="pt-6 mt-6 border-t border-white/5">
                   <button 
                        onClick={handleExport}
                        disabled={isExporting}
                        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 border-none rounded-xl text-sm font-bold text-white transition-all flex justify-center items-center shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
                    >
                        {isExporting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></span> : <Download className="w-4 h-4 mr-2"/>}
                        {isExporting ? "Processing Image..." : "Export Standard JPG"}
                    </button>
                    <p className="text-[9px] text-center text-slate-500 mt-3 font-mono">Outputs 1280x720 HD Thumbnail</p>
               </div>
            </div>
          </div>

          {/* Main Canvas Area */}
          <div className="lg:col-span-8 space-y-6 flex flex-col items-center justify-start">
              <div className="rounded-3xl border border-white/[0.06] bg-[#111115]/90 backdrop-blur-md p-6 w-full flex-1 flex flex-col items-center relative overflow-hidden min-h-[400px] shadow-[0_12px_40px_-15px_rgba(0,0,0,0.7)]">
                    <div className="absolute top-4 right-4 flex space-x-2 z-20">
                         <div className="bg-black/50 backdrop-blur-md px-3 py-1.5 border border-white/10 rounded-lg text-[10px] font-mono text-slate-300">
                             1280 x 720
                         </div>
                    </div>

                    {/* Preview bg pattern */}
                    <div className="w-full max-w-[800px] aspect-video relative flex items-center justify-center overflow-hidden border border-white/10 rounded-xl shadow-2xl bg-[#0a0a0c] before:absolute before:inset-0 before:bg-[url('https://transparenttextures.com/patterns/cubes.png')] before:opacity-5">
                         {/* Actual renderable layer. We render it inside a scaled container so it is exactly 1280x720 natively, 
                             BUT we'll just let html-to-image handle the pixel ratio scaling. For safety, we can style it responsively
                             and html-to-image will snap it. */}
                        <div 
                             ref={canvasRef} 
                             className="w-full h-full relative flex overflow-hidden group"
                        >
                            {/* Background Image with Filters */}
                            <div 
                                className="absolute inset-0 w-full h-full transition-all duration-300 transform scale-105"
                                style={{ 
                                    backgroundImage: `url(${bgImage})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    backgroundRepeat: 'no-repeat',
                                    filter: bgFilterStyle,
                                }}
                            ></div>
                            
                            {/* Darken Overlay */}
                            <div className="absolute inset-0 bg-black transition-opacity duration-300" style={{ opacity: overlayOpacity / 100 }}></div>
                            
                            {/* Text Layer */}
                            <div className={`relative z-10 p-8 md:p-16 flex flex-col w-full h-full ${
                                layout === "center" ? "items-center justify-center text-center" : 
                                layout === "bottom-left" ? "items-start justify-end text-left" : 
                                layout === "bottom-right" ? "items-end justify-end text-right" : 
                                layout === "top-right" ? "items-end justify-start text-right" : 
                                "items-start justify-start text-left"
                            }`}>
                                <h1 
                                    className={`${fontWeight} text-white tracking-tight uppercase leading-[1.05] transition-all duration-300 whitespace-pre-wrap`}
                                    style={{ 
                                        color: headlineColor, 
                                        textShadow: `0 10px 40px rgba(0,0,0,${textShadow / 100}), 0 4px 10px rgba(0,0,0,${textShadow / 100})`,
                                        fontSize: `${headlineSize * 0.04}rem` // Scales roughly from 2rem to 8rem
                                    }}
                                >
                                    {headline}
                                </h1>
                                {subhead && (
                                    <p 
                                        className="mt-4 font-semibold tracking-wide drop-shadow-xl transition-all duration-300"
                                        style={{ 
                                            color: subheadColor, 
                                            textShadow: `0 4px 15px rgba(0,0,0,${textShadow / 100})`,
                                            fontSize: `${subheadSize * 0.015}rem` // Scales roughly 0.75rem to 3rem
                                        }}
                                    >
                                        {subhead}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex flex-col items-center">
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest flex items-center">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
                            Live Canvas Preview
                        </p>
                        <p className="text-[10px] text-slate-600 mt-2 text-center max-w-xs">The actual exported image may differ slightly in exact pixel sharpness due to web rendering.</p>
                    </div>
              </div>
          </div>
        </div>
    );
}


