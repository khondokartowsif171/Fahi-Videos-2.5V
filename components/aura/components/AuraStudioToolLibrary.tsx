import React from 'react';
import {
  Film,
  Layers,
  Wand2,
  Box,
  LucideIcon
} from 'lucide-react';

/**
 * AuraStudioToolLibrary - A unified, collapsible, and performant
 * "Livery" (Library/Registry) system to manage all creative tool modules.
 */

export type ToolModule = 'storyboard' | 'creative-rig' | 'voiceover' | 'director';

interface ToolRegistryItem {
  id: ToolModule;
  label: string;
  Icon: LucideIcon;
}

export const TOOLS: ToolRegistryItem[] = [
  { id: 'creative-rig', label: 'Flow Creative Rig', Icon: Box },
  { id: 'storyboard', label: 'Flow Storyboard', Icon: Film },
  { id: 'voiceover', label: 'UGC Voiceover', Icon: Layers },
  { id: 'director', label: 'AI Director', Icon: Wand2 },
];

export default function AuraStudioToolLibrary({ activeTool, onToggleTool }: {
  activeTool: ToolModule | null,
  onToggleTool: (tool: ToolModule) => void
}) {
  return (
    <div className="hidden lg:flex flex-col gap-2 p-3 lg:p-4 h-full border-r border-[#1a1a1a] shrink-0 bg-black z-20">
      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          onClick={() => onToggleTool(tool.id)}
          className={`group flex items-center p-3 rounded-xl border transition-all duration-300 min-h-[44px] min-w-[44px] ${
            activeTool === tool.id
              ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/20'
              : 'bg-[#121217] border-[#22222a] text-neutral-400 hover:border-neutral-500 hover:text-white'
          }`}
          title={tool.label}
        >
          <tool.Icon size={18} />
          <span className={`ml-3 font-semibold text-sm transition-all duration-300 ${
            activeTool === tool.id ? 'w-auto opacity-100' : 'w-0 opacity-0 overflow-hidden'
          }`}>
            {tool.label}
          </span>
        </button>
      ))}
    </div>
  );
}
