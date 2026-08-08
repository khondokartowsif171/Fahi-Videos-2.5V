"use client";

import { useState, useEffect } from "react";
import { Key, Save, CheckCircle, X, Zap, ShieldAlert, Webhook, ExternalLink, ChevronDown, ChevronUp, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface GeminiApiBoxProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GeminiApiBox({ isOpen, onClose }: GeminiApiBoxProps) {
  const [apiKey, setApiKey] = useState("");
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState("");
  const [n8nApiKey, setN8nApiKey] = useState("");
  const [useN8n, setUseN8n] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showN8nGuide, setShowN8nGuide] = useState(false);
  const [activeTab, setActiveTab] = useState<"direct" | "n8n">("direct");

  const N8N_BASE_URL = "https://n8n.auraajenticai.cloud";

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedKey = localStorage.getItem("fahi_gemini_api_key") || "";
      const storedWebhook = localStorage.getItem("fahi_n8n_webhook_url") || "";
      const storedN8nKey = localStorage.getItem("fahi_n8n_api_key") || "";
      const storedUseN8n = localStorage.getItem("fahi_use_n8n") === "true";
      setApiKey(storedKey);
      // Pre-fill with the user's n8n instance if nothing is stored
      setN8nWebhookUrl(storedWebhook || `${N8N_BASE_URL}/webhook/`);
      setN8nApiKey(storedN8nKey);
      setUseN8n(storedUseN8n);
      if (storedUseN8n && storedWebhook) setActiveTab("n8n");
    }
  }, [isOpen]);

  const handleSave = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("fahi_gemini_api_key", apiKey.trim());
      localStorage.setItem("fahi_n8n_webhook_url", n8nWebhookUrl.trim());
      localStorage.setItem("fahi_n8n_api_key", n8nApiKey.trim());
      localStorage.setItem("fahi_use_n8n", useN8n ? "true" : "false");
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1500);
    }
  };

  const handleTabSwitch = (tab: "direct" | "n8n") => {
    setActiveTab(tab);
    setUseN8n(tab === "n8n");
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="bg-[#0D1117] border border-white/[0.08] shadow-2xl shadow-black/60 rounded-2xl w-full max-w-lg overflow-hidden relative"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-base">AI Connection Settings</h3>
                <p className="text-slate-500 text-[11px]">Configure Gemini API or n8n workflow</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-white transition-colors p-1.5 hover:bg-white/5 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-2 px-5 pt-4">
            <button
              onClick={() => handleTabSwitch("direct")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "direct"
                  ? "bg-indigo-600/20 border border-indigo-500/40 text-indigo-300"
                  : "text-slate-500 hover:text-slate-300 border border-transparent"
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              Direct API Key
            </button>
            <button
              onClick={() => handleTabSwitch("n8n")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "n8n"
                  ? "bg-orange-500/20 border border-orange-500/40 text-orange-300"
                  : "text-slate-500 hover:text-slate-300 border border-transparent"
              }`}
            >
              <Webhook className="w-3.5 h-3.5" />
              n8n Workflow
              <span className="text-[9px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-1.5 py-0.5 rounded-full font-bold uppercase">
                New
              </span>
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4">
            <AnimatePresence mode="wait">
              {activeTab === "direct" ? (
                <motion.div
                  key="direct"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4"
                >
                  <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3.5 text-[12px] text-indigo-200 leading-relaxed flex gap-2.5">
                    <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <p>
                      By default the app uses the server's built-in key. Enter your own{" "}
                      <a
                        href="https://aistudio.google.com/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 inline-flex items-center gap-1"
                      >
                        Google Gemini API Key <ExternalLink className="w-3 h-3" />
                      </a>{" "}
                      for unlimited personal access.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                      <Key className="w-4 h-4 text-slate-400" />
                      Gemini API Key
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all font-mono text-sm placeholder:text-slate-600"
                    />
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
                      Stored locally in your browser. Never sent to our servers.
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="n8n"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4"
                >
                  {/* n8n Info Banner */}
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3.5 text-[12px] text-orange-200 leading-relaxed flex gap-2.5">
                    <Webhook className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                    <p>
                      Route all Gemini AI calls through your own{" "}
                      <strong className="text-orange-300">n8n workflow</strong>. Your n8n
                      webhook receives the request and returns Gemini's response — giving
                      you full control, logging, and custom logic.
                    </p>
                  </div>

                  {/* Webhook URL Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                      <Webhook className="w-4 h-4 text-orange-400" />
                      n8n Webhook URL
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        value={n8nWebhookUrl}
                        onChange={(e) => setN8nWebhookUrl(e.target.value)}
                        placeholder={`${N8N_BASE_URL}/webhook/your-webhook-id`}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all font-mono text-xs placeholder:text-slate-600 pr-24"
                      />
                      <a
                        href={N8N_BASE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-semibold text-orange-400 hover:text-orange-300 bg-orange-500/10 border border-orange-500/20 px-2 py-1 rounded-lg transition-colors"
                      >
                        Open n8n <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Instance: <span className="text-orange-400/70 font-mono">{N8N_BASE_URL}</span>
                    </div>
                  </div>

                  {/* n8n API Key (for triggering workflows programmatically) */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                      <Key className="w-4 h-4 text-orange-400" />
                      n8n API Key <span className="text-[10px] text-slate-500 font-normal">(optional — for API access)</span>
                    </label>
                    <input
                      type="password"
                      value={n8nApiKey}
                      onChange={(e) => setN8nApiKey(e.target.value)}
                      placeholder="n8n_api_..."
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all font-mono text-sm placeholder:text-slate-600"
                    />
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      Find at: n8n Settings → API → Create API Key
                    </div>
                  </div>


                  {/* n8n Setup Guide Collapsible */}
                  <div className="border border-white/[0.06] rounded-xl overflow-hidden">
                    <button
                      onClick={() => setShowN8nGuide(!showN8nGuide)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.02] hover:bg-white/[0.04] text-slate-300 text-sm font-medium transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-orange-400" />
                        How to set up n8n workflow
                      </span>
                      {showN8nGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <AnimatePresence>
                      {showN8nGuide && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-2 space-y-3 text-[12px] text-slate-400 leading-relaxed bg-white/[0.01]">
                            <p className="text-orange-300 font-semibold text-[13px]">n8n Workflow Setup:</p>
                            <ol className="space-y-2 list-none">
                              <li className="flex gap-2">
                                <span className="text-orange-400 font-bold font-mono shrink-0">1.</span>
                                Create a new workflow in n8n and add a <strong className="text-slate-300">Webhook</strong> node (HTTP Method: POST).
                              </li>
                              <li className="flex gap-2">
                                <span className="text-orange-400 font-bold font-mono shrink-0">2.</span>
                                Add a <strong className="text-slate-300">Google Gemini</strong> node (or HTTP Request to Gemini API) after the webhook.
                              </li>
                              <li className="flex gap-2">
                                <span className="text-orange-400 font-bold font-mono shrink-0">3.</span>
                                Map the incoming <code className="bg-white/10 px-1 rounded text-orange-300">prompt</code>, <code className="bg-white/10 px-1 rounded text-orange-300">model</code>, and <code className="bg-white/10 px-1 rounded text-orange-300">apiKey</code> fields from the webhook body to Gemini inputs.
                              </li>
                              <li className="flex gap-2">
                                <span className="text-orange-400 font-bold font-mono shrink-0">4.</span>
                                Add a <strong className="text-slate-300">Respond to Webhook</strong> node and return: <code className="bg-white/10 px-1 rounded text-orange-300">{'{ "text": "..." }'}</code>
                              </li>
                              <li className="flex gap-2">
                                <span className="text-orange-400 font-bold font-mono shrink-0">5.</span>
                                Copy the webhook URL from n8n and paste it above. Activate the workflow.
                              </li>
                            </ol>
                            <div className="bg-slate-800/60 rounded-lg p-3 font-mono text-[11px] text-slate-300 mt-2">
                              <p className="text-slate-500 mb-1">// Payload sent to your n8n webhook:</p>
                              <p>{"{"}</p>
                              <p>&nbsp;&nbsp;<span className="text-orange-300">"prompt"</span>: <span className="text-green-300">"your prompt text"</span>,</p>
                              <p>&nbsp;&nbsp;<span className="text-orange-300">"model"</span>: <span className="text-green-300">"gemini-2.5-flash"</span>,</p>
                              <p>&nbsp;&nbsp;<span className="text-orange-300">"apiKey"</span>: <span className="text-green-300">"your-gemini-key"</span>,</p>
                              <p>&nbsp;&nbsp;<span className="text-orange-300">"action"</span>: <span className="text-green-300">"generate"</span></p>
                              <p>{"}"}</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-white/[0.05] bg-black/20 flex items-center justify-between gap-3">
            <div className="text-[11px] text-slate-500">
              {useN8n ? (
                <span className="flex items-center gap-1.5 text-orange-400">
                  <Webhook className="w-3.5 h-3.5" /> Routing via n8n
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-indigo-400">
                  <Zap className="w-3.5 h-3.5" /> Direct Gemini API
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className={`flex items-center gap-2 px-5 py-2 font-semibold text-sm rounded-xl shadow-lg transition-all ${
                  activeTab === "n8n"
                    ? "bg-orange-600 hover:bg-orange-500 text-white shadow-orange-600/20"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20"
                }`}
              >
                {saved ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Settings
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
