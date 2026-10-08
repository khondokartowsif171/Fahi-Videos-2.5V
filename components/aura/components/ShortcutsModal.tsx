import React from 'react';
import { X, Command, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  if (!isOpen) return null;

  const shortcuts = [
    {
      key: 'Space',
      action: 'Play / Pause',
      description: 'Toggle playback of the active video take or extension'
    },
    {
      key: '←  /  →',
      action: 'Frame Step',
      description: 'Step backward or forward frame-by-frame (1 frame at 30 FPS)'
    },
    {
      key: 'Shift + ←  /  →',
      action: 'Fast Scrub',
      description: 'Step 5 frames backward or forward for quick skimming'
    },
    {
      key: 'Home',
      action: 'Jump to Head Frame',
      description: 'Seek directly to the beginning (00:00:00)'
    },
    {
      key: 'End',
      action: 'Jump to Tail Frame',
      description: 'Seek directly to the last frame of the active take'
    },
    {
      key: '?',
      action: 'Shortcuts Help',
      description: 'Open or close this keyboard reference overlay'
    },
    {
      key: 'Esc',
      action: 'Close Modal',
      description: 'Dismiss any open modal or panel'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div
        className="bg-[#0f0f13] border border-[#24242c] rounded-2xl w-full max-w-lg p-6 shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#202026]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#181820] border border-[#2e2e38] flex items-center justify-center text-cyan-300">
              <Keyboard size={16} />
            </div>
            <div>
              <h2 id="shortcuts-modal-title" className="text-sm font-bold text-white uppercase tracking-wider">
                Keyboard Shortcuts
              </h2>
              <p className="text-[10px] text-neutral-400">
                Frame-accurate playback & timeline navigation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-md transition-colors"
            aria-label="Close keyboard shortcuts dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="space-y-2">
          {shortcuts.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-lg bg-[#141418] border border-[#1f1f26] hover:border-neutral-700 transition-colors"
            >
              <div className="flex flex-col pr-3">
                <span className="text-xs font-semibold text-white">
                  {s.action}
                </span>
                <span className="text-[10px] text-neutral-400 font-normal">
                  {s.description}
                </span>
              </div>
              <kbd className="px-2.5 py-1 bg-[#1e1e26] border border-[#32323e] rounded text-cyan-300 font-mono text-[11px] font-bold shadow-inner shrink-0 min-w-16 text-center">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between pt-2 border-t border-[#1e1e24] text-[10px] text-neutral-500 font-mono">
          <span>Shortcuts active during timeline inspection</span>
          <button
            onClick={onClose}
            className="bg-white hover:bg-neutral-200 text-black text-xs font-bold px-4 py-1.5 rounded-lg transition-colors uppercase tracking-wider"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
