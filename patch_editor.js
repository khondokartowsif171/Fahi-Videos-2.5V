const fs = require('fs');

const content = fs.readFileSync('components/VideoEditor.tsx', 'utf8');

const returnIndex = content.indexOf('return (');

if (returnIndex !== -1) {
    const beforeReturn = content.substring(0, returnIndex);
    
    // We will append our new return statement.
    const newJSX = `
  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-black text-[#a0a0a0] font-sans antialiased overflow-hidden">
      
      {/* Top Navbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black z-10">
          <div className="flex items-center space-x-6">
              <button className="text-white hover:text-gray-300">
                  <X className="w-5 h-5" />
              </button>
              <button className="text-white hover:text-gray-300">
                  <Search className="w-5 h-5" />
              </button>
          </div>
          
          <div className="flex items-center space-x-3">
              <button className="text-purple-400">
                  {/* Diamond Icon */}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 12L12 22L22 12L12 2Z" />
                  </svg>
              </button>
              <button className="flex items-center space-x-1 bg-[#1c1c1c] text-white px-3 py-1.5 rounded-lg text-sm font-medium">
                  <span>AI UHD</span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              <button onClick={() => setShowExportModal(true)} className="bg-[#00e5ff] text-black px-4 py-1.5 rounded-lg text-sm font-bold flex items-center">
                  <Download className="w-4 h-4 mr-1.5" />
                  Export
              </button>
          </div>
      </div>

      {/* Main Content Area - Video Preview */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden border-b border-white/10">
        {videoFile ? (
            <div className="relative w-full max-w-md mx-auto aspect-[9/16] bg-black">
                <video
                    ref={videoRef}
                    src={objectUrl}
                    className="w-full h-full object-contain"
                    style={{
                        filter: filterStyle,
                        transform: transformStyle
                    }}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={() => setIsPlaying(false)}
                />
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                    <VideoIcon className="w-8 h-8 text-white/20" />
                </div>
                <p className="text-sm text-white/40">No video selected</p>
                <label className="bg-[#00e5ff] text-black px-6 py-2 rounded-full font-bold text-sm cursor-pointer hover:opacity-90">
                    Select Video
                    <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
                </label>
            </div>
        )}
      </div>

      {/* Bottom Workspace */}
      <div className="bg-[#111111] w-full flex flex-col h-[320px] shrink-0 border-t-2 border-[#1a1a1a]">
          {/* Controls Bar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
              <div className="flex items-center space-x-4">
                  <button className="text-white"><Maximize2 className="w-4 h-4" /></button>
              </div>
              <div className="flex items-center space-x-6">
                  <button onClick={togglePlayPause} className="text-white">
                      {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
                  </button>
              </div>
              <div className="flex items-center space-x-4">
                  <button onClick={undo} disabled={!canUndo} className={\`text-white \${!canUndo && "opacity-30"}\`}><Undo2 className="w-5 h-5" /></button>
                  <button onClick={redo} disabled={!canRedo} className={\`text-white \${!canRedo && "opacity-30"}\`}><Redo2 className="w-5 h-5" /></button>
              </div>
          </div>

          {/* Timeline */}
          <div className="flex-1 relative overflow-hidden flex flex-col pt-2">
              <div className="px-4 text-[10px] text-gray-500 font-mono flex justify-between mb-2">
                  <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                  <div className="flex space-x-8 opacity-50">
                      <span>00:00</span>
                      <span>00:02</span>
                      <span>00:04</span>
                  </div>
              </div>

              {/* Playhead */}
              <div className="absolute left-1/2 top-8 bottom-0 w-[2px] bg-white z-20 shadow-[0_0_8px_rgba(255,255,255,0.8)] pointer-events-none" />

              <div className="flex-1 overflow-y-auto px-4 space-y-1.5 pb-4">
                  {/* Tracks */}
                  <div className="flex items-center space-x-2 h-12">
                      <div className="w-12 flex-shrink-0 flex flex-col items-center justify-center text-gray-500">
                          <VolumeX className="w-4 h-4" />
                          <span className="text-[8px] mt-1 text-center leading-tight">Mute<br/>clip</span>
                      </div>
                      <div className="w-12 h-12 flex-shrink-0 rounded-lg bg-white/10 border border-white/20 flex flex-col items-center justify-center overflow-hidden">
                          <ImageIcon className="w-4 h-4 text-white/40" />
                          <span className="text-[10px] text-white mt-1">Cover</span>
                      </div>
                      {/* Video Track */}
                      <div className="flex-1 h-12 bg-white/5 rounded-lg border border-white/20 flex relative overflow-hidden group">
                          {/* Simulated video frames */}
                          <div className="w-full h-full flex opacity-50 bg-[#2a2a2a] bg-cover bg-repeat-x"></div>
                          {/* Handles */}
                          <div className="absolute left-0 top-0 bottom-0 w-3 bg-white rounded-l border-r border-black/20 flex items-center justify-center">
                              <div className="w-0.5 h-3 bg-black/50 rounded-full" />
                          </div>
                          <div className="absolute right-0 top-0 bottom-0 w-3 bg-white rounded-r border-l border-black/20 flex items-center justify-center">
                              <div className="w-0.5 h-3 bg-black/50 rounded-full" />
                          </div>
                          {videoFile && (
                            <button className="absolute right-0 top-0 bottom-0 w-12 bg-black/60 flex items-center justify-center border-l border-white/10 hover:bg-white/10 transition-colors">
                                <Plus className="w-5 h-5 text-white" />
                            </button>
                          )}
                      </div>
                  </div>

                  <div className="flex items-center space-x-2 h-10 ml-14 pl-1">
                      <div className="w-12 h-10 flex-shrink-0 flex items-center justify-center text-gray-500 bg-white/5 rounded border border-transparent hover:border-white/20 cursor-pointer">
                          <Music className="w-4 h-4" />
                      </div>
                      <div className="flex-1 h-10 border border-dashed border-white/20 rounded flex items-center px-4 text-[11px] text-gray-400 cursor-pointer hover:bg-white/5">
                          <Plus className="w-3 h-3 mr-2" /> Add audio
                      </div>
                  </div>

                  <div className="flex items-center space-x-2 h-8 ml-14 pl-1">
                      <div className="w-12 h-8 flex-shrink-0 flex items-center justify-center text-gray-500 bg-white/5 rounded border border-transparent hover:border-white/20 cursor-pointer">
                          <Type className="w-4 h-4" />
                      </div>
                  </div>
              </div>
          </div>

          {/* Bottom Toolbars */}
          <div className="bg-[#0a0a0a] pb-safe">
              <div className="flex items-center overflow-x-auto scrollbar-none px-2 py-3">
                  {[
                      { icon: Scissors, label: "Edit" },
                      { icon: Music, label: "Audio" },
                      { icon: Type, label: "Text" },
                      { icon: Wand2, label: "Effects" },
                      { icon: Layers, label: "Overlay" },
                      { icon: Captions, label: "Captions" },
                      { icon: SlidersHorizontal, label: "Filters" },
                      { icon: Settings2, label: "Adjust" },
                      { icon: Sticker, label: "Stickers" },
                      { icon: Sparkles, label: "Generate media" },
                      { icon: UserCircle, label: "AI avatar" },
                      { icon: Monitor, label: "Aspect ratio" },
                      { icon: ImageIcon, label: "Background" },
                      { icon: LayoutTemplate, label: "Templates" }
                  ].map((tool, i) => (
                      <button key={i} className="flex flex-col items-center justify-center min-w-[72px] space-y-1.5 text-gray-400 hover:text-white transition-colors">
                          <tool.icon className="w-5 h-5" />
                          <span className="text-[10px] whitespace-nowrap">{tool.label}</span>
                      </button>
                  ))}
              </div>
          </div>
      </div>
      
      {/* Export Settings Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111111] border border-[#2A2A2A] rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A]">
              <h3 className="text-white font-bold">Export Settings</h3>
              <button 
                onClick={() => setShowExportModal(false)}
                className="text-[#8B8B8B] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-3">
                <label className="text-xs font-semibold text-[#8B8B8B] uppercase tracking-wider">Resolution</label>
                <div className="grid grid-cols-3 gap-3">
                  <button 
                    onClick={() => setExportResolution("1080p")}
                    className={\`py-2 px-3 rounded-lg text-sm font-medium border transition-colors \${exportResolution === "1080p" ? "bg-[#4F92FF]/10 border-[#4F92FF] text-[#4F92FF]" : "bg-[#18181A] border-[#2A2A2A] text-white hover:border-[#3A3A3A]"}\`}
                  >
                    1080p
                  </button>
                  <button 
                    onClick={() => setExportResolution("720p")}
                    className={\`py-2 px-3 rounded-lg text-sm font-medium border transition-colors \${exportResolution === "720p" ? "bg-[#4F92FF]/10 border-[#4F92FF] text-[#4F92FF]" : "bg-[#18181A] border-[#2A2A2A] text-white hover:border-[#3A3A3A]"}\`}
                  >
                    720p
                  </button>
                  <button 
                    onClick={() => setExportResolution("480p")}
                    className={\`py-2 px-3 rounded-lg text-sm font-medium border transition-colors \${exportResolution === "480p" ? "bg-[#4F92FF]/10 border-[#4F92FF] text-[#4F92FF]" : "bg-[#18181A] border-[#2A2A2A] text-white hover:border-[#3A3A3A]"}\`}
                  >
                    480p
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-semibold text-[#8B8B8B] uppercase tracking-wider">Quality</label>
                <div className="grid grid-cols-3 gap-3">
                  <button 
                    onClick={() => setExportQuality("high")}
                    className={\`py-2 px-3 rounded-lg text-sm font-medium border transition-colors \${exportQuality === "high" ? "bg-[#4F92FF]/10 border-[#4F92FF] text-[#4F92FF]" : "bg-[#18181A] border-[#2A2A2A] text-white hover:border-[#3A3A3A]"}\`}
                  >
                    High
                  </button>
                  <button 
                    onClick={() => setExportQuality("medium")}
                    className={\`py-2 px-3 rounded-lg text-sm font-medium border transition-colors \${exportQuality === "medium" ? "bg-[#4F92FF]/10 border-[#4F92FF] text-[#4F92FF]" : "bg-[#18181A] border-[#2A2A2A] text-white hover:border-[#3A3A3A]"}\`}
                  >
                    Medium
                  </button>
                  <button 
                    onClick={() => setExportQuality("low")}
                    className={\`py-2 px-3 rounded-lg text-sm font-medium border transition-colors \${exportQuality === "low" ? "bg-[#4F92FF]/10 border-[#4F92FF] text-[#4F92FF]" : "bg-[#18181A] border-[#2A2A2A] text-white hover:border-[#3A3A3A]"}\`}
                  >
                    Low
                  </button>
                </div>
              </div>
            </div>
            
            <div className="px-5 py-4 border-t border-[#2A2A2A] bg-[#18181A] flex justify-end space-x-3">
              <button 
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-sm font-medium text-white hover:bg-[#2A2A2A] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={startRealExport}
                className="px-6 py-2 bg-[#4F92FF] hover:bg-[#3D71C8] text-white text-sm font-semibold rounded-lg shadow-md transition-colors flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Start Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;
    
    const newContent = beforeReturn + newJSX;
    fs.writeFileSync('components/VideoEditor.tsx', newContent);
    console.log('Successfully patched VideoEditor.tsx');
} else {
    console.error('Could not find "return (" in VideoEditor.tsx');
}
