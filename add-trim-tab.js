const fs = require('fs');

let content = fs.readFileSync('components/VideoEditor.tsx', 'utf8');

// Add the Trim tab button
content = content.replace(
  /<button onClick=\{\(\) => setActiveTab\("audio"\)\} className=\{`flex-1/,
  `<button onClick={() => setActiveTab("trim")} className={\`flex-1 py-3 text-xs font-medium text-center border-b-2 transition-colors \${activeTab === "trim" ? "border-[#4F92FF] text-white" : "border-transparent text-[#8B8B8B] hover:text-[#CCC]"}\`}>Trim</button>\n                 <button onClick={() => setActiveTab("audio")} className={\`flex-1`
);

// Add the Trim tab content
const trimTabContent = `
                        {activeTab === "trim" && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-white text-xs font-medium mb-3">Trim Video</h3>
                                    
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between text-[11px]">
                                                <span>Start Point</span>
                                                <span className="text-white font-mono">{trimStart.toFixed(2)}s</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="0" 
                                                max={duration} 
                                                step="0.033" 
                                                value={trimStart} 
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value);
                                                    if (val < trimEnd) {
                                                        setTrimStart(val);
                                                        if (videoRef.current) {
                                                            videoRef.current.currentTime = val;
                                                            setCurrentTime(val);
                                                        }
                                                    }
                                                }} 
                                                className="w-full accent-[#4F92FF] h-1 bg-[#2A2A2A] rounded-full appearance-none cursor-pointer" 
                                            />
                                            <div className="flex justify-between mt-1">
                                                <button onClick={() => {
                                                    const val = Math.max(0, trimStart - 0.033);
                                                    setTrimStart(val);
                                                    if (videoRef.current) { videoRef.current.currentTime = val; setCurrentTime(val); }
                                                }} className="px-2 py-1 bg-[#2A2A2A] rounded text-[10px] text-white hover:bg-[#333]">-1 Frame</button>
                                                <button onClick={() => {
                                                    const val = Math.min(trimEnd - 0.033, trimStart + 0.033);
                                                    setTrimStart(val);
                                                    if (videoRef.current) { videoRef.current.currentTime = val; setCurrentTime(val); }
                                                }} className="px-2 py-1 bg-[#2A2A2A] rounded text-[10px] text-white hover:bg-[#333]">+1 Frame</button>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5 pt-4 border-t border-[#2A2A2A]">
                                            <div className="flex justify-between text-[11px]">
                                                <span>End Point</span>
                                                <span className="text-white font-mono">{trimEnd.toFixed(2)}s</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="0" 
                                                max={duration} 
                                                step="0.033" 
                                                value={trimEnd} 
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value);
                                                    if (val > trimStart) {
                                                        setTrimEnd(val);
                                                        if (videoRef.current) {
                                                            videoRef.current.currentTime = val;
                                                            setCurrentTime(val);
                                                        }
                                                    }
                                                }} 
                                                className="w-full accent-[#4F92FF] h-1 bg-[#2A2A2A] rounded-full appearance-none cursor-pointer" 
                                            />
                                            <div className="flex justify-between mt-1">
                                                <button onClick={() => {
                                                    const val = Math.max(trimStart + 0.033, trimEnd - 0.033);
                                                    setTrimEnd(val);
                                                    if (videoRef.current) { videoRef.current.currentTime = val; setCurrentTime(val); }
                                                }} className="px-2 py-1 bg-[#2A2A2A] rounded text-[10px] text-white hover:bg-[#333]">-1 Frame</button>
                                                <button onClick={() => {
                                                    const val = Math.min(duration, trimEnd + 0.033);
                                                    setTrimEnd(val);
                                                    if (videoRef.current) { videoRef.current.currentTime = val; setCurrentTime(val); }
                                                }} className="px-2 py-1 bg-[#2A2A2A] rounded text-[10px] text-white hover:bg-[#333]">+1 Frame</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
`;

content = content.replace(
  /\{activeTab === "audio" && \(/,
  trimTabContent + '\n                        {activeTab === "audio" && ('
);

// Update visual representation in timeline
content = content.replace(
  /style=\{\{ width: 'calc\(100% - 2rem\)', left: '0' \}\}/g,
  `style={{ width: \`calc(\${(duration > 0 ? (trimEnd - trimStart) / duration : 1) * 100}% - 2rem)\`, left: \`\${(duration > 0 ? trimStart / duration : 0) * 100}%\` }}`
);

fs.writeFileSync('components/VideoEditor.tsx', content);
