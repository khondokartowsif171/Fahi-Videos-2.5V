import React, { useState } from 'react';
import { X, Settings } from 'lucide-react';
export default function GoogleFlowSettings({ onClose }: { onClose: () => void }) {
  const saved = JSON.parse(localStorage.getItem('fahi_aura_settings') || '{}');
  const [aspectRatio,setRatio] = useState(saved.aspectRatio || '16:9');
  const [key,setKey] = useState(localStorage.getItem('fahi_gemini_api_key') || '');
  const save = () => {
    localStorage.setItem('fahi_aura_settings',JSON.stringify({aspectRatio}));
    if(key.trim()) localStorage.setItem('fahi_gemini_api_key',key.trim()); else localStorage.removeItem('fahi_gemini_api_key');
    window.dispatchEvent(new CustomEvent('aura-settings-change',{detail:{aspectRatio}})); onClose();
  };
  return <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80] flex items-center justify-end">
    <div className="bg-[#121212] w-full max-w-sm h-full border-l border-[#22222a] p-6 flex flex-col text-white">
      <div className="flex justify-between mb-8"><h2 className="font-bold flex gap-2"><Settings size={20}/>Studio settings</h2><button onClick={onClose} aria-label="Close settings"><X/></button></div>
      <label className="text-sm mb-2" htmlFor="aura-key">Gemini API key</label>
      <input id="aura-key" type="password" value={key} onChange={e=>setKey(e.target.value)} className="bg-neutral-900 border border-neutral-700 rounded-lg p-3" placeholder="Use server key or enter your own"/>
      <p className="text-xs text-neutral-400 mt-2">Shared with Fahi Videos API Settings. Video generation requires enabled billing and model access.</p>
      <label className="text-sm mt-8 mb-2" htmlFor="aura-ratio">Default video aspect ratio</label>
      <select id="aura-ratio" value={aspectRatio} onChange={e=>setRatio(e.target.value)} className="bg-neutral-900 p-3 rounded-lg"><option value="16:9">16:9 landscape</option><option value="9:16">9:16 portrait</option></select>
      <p className="text-xs text-neutral-400 mt-8">Veo 3.1 video · Gemini image generation · Bengali speech</p>
      <button onClick={save} className="mt-auto bg-white text-black font-bold py-3 rounded-lg">Save settings</button>
    </div>
  </div>;
}
