'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Download, 
  Video, 
  ImageIcon, 
  Sparkles, 
  History, 
  Trash2,
  Zap,
  Scissors,
  Wand2,
  FileVideo,
  MonitorPlay,
  Share2,
  ArrowRight
} from 'lucide-react';
import { getActivities, clearActivities, Activity } from '../lib/activity';

interface HomeProps {
  setActiveTab: (tab: string) => void;
}

export default function Home({ setActiveTab }: HomeProps) {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    setActivities(getActivities());
  }, []);

  const handleClearHistory = () => {
    clearActivities();
    setActivities([]);
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'download': return <Download className="w-4 h-4 text-blue-400" />;
      case 'edit': return <Video className="w-4 h-4 text-violet-400" />;
      case 'thumbnail': return <ImageIcon className="w-4 h-4 text-pink-400" />;
      case 'ai': return <Sparkles className="w-4 h-4 text-indigo-400" />;
      default: return <FileVideo className="w-4 h-4 text-slate-400" />;
    }
  };

  const getActivityTab = (type: string) => {
    switch (type) {
      case 'download': return 'downloader';
      case 'edit': return 'editor';
      case 'thumbnail': return 'thumbnail';
      case 'ai': return 'ai';
      default: return 'home';
    }
  };

  const features = [
    {
      id: 'downloader',
      title: 'Universal Downloader',
      description: 'Download videos from multiple platforms in up to 4K resolution with original audio.',
      icon: Download,
      color: 'from-blue-500 to-cyan-400',
      badge: '4K Support'
    },
    {
      id: 'editor',
      title: 'Pro Video Editor',
      description: 'Trim, crop, and merge videos with a precise timeline and hardware acceleration.',
      icon: Scissors,
      color: 'from-violet-500 to-fuchsia-400',
      badge: 'Fast Render'
    },
    {
      id: 'thumbnail',
      title: 'Thumbnail Generator',
      description: 'Create eye-catching thumbnails with text, stickers, and background removal.',
      icon: ImageIcon,
      color: 'from-pink-500 to-rose-400',
      badge: 'Templates'
    },
    {
      id: 'ai',
      title: 'AI Magic Tools',
      description: 'Auto-captions, script generation, and smart clipping powered by Gemini.',
      icon: Sparkles,
      color: 'from-indigo-500 to-blue-500',
      badge: 'Gemini AI'
    },
    {
      id: 'convert',
      title: 'Format Converter',
      description: 'Convert between MP4, WebM, GIF, and extract MP3 audio instantly.',
      icon: FileVideo,
      color: 'from-emerald-500 to-teal-400',
      badge: 'Lossless'
    },
    {
      id: 'studio',
      title: 'Studio Monitor',
      description: 'Preview changes in real-time with color grading and LUT support.',
      icon: MonitorPlay,
      color: 'from-orange-500 to-amber-400',
      badge: 'Pro Tool'
    },
    {
      id: 'export',
      title: 'Batch Export',
      description: 'Process multiple videos simultaneously and share directly to socials.',
      icon: Share2,
      color: 'from-purple-500 to-indigo-500',
      badge: 'Batch'
    }
  ];

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 overflow-hidden">
        {/* Floating Orbs Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <motion.div 
            animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/4 left-1/4 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl"
          />
          <motion.div 
            animate={{ y: [0, 20, 0], x: [0, -10, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute top-1/3 right-1/4 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl"
          />
          <motion.div 
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl"
          />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 mb-8 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-sm font-medium text-slate-300"
          >
            <Zap className="w-4 h-4 text-violet-400" />
            <span>Introducing FlowLab Dark Design</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight mb-4"
          >
            <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
              Fahi
            </span>
            <span className="text-white">Vids</span>
          </motion.h1>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-3xl font-medium text-slate-300 mb-6 relative inline-block"
          >
            Professional Video Studio
            <motion.div 
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-blue-500 to-transparent origin-left rounded-full"
            />
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-slate-400 max-w-2xl text-lg mb-10"
          >
            Your all-in-one workspace for downloading, editing, and enhancing videos. 
            Powered by AI to streamline your creative workflow.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap justify-center gap-3 mb-10"
          >
            {['Fast Processing', 'No Watermarks', 'Privacy First', 'Local Storage'].map((pill, i) => (
              <span key={i} className="fl-cap-pill px-4 py-1.5 text-sm text-slate-300">
                {pill}
              </span>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
          >
            <button
              onClick={() => setActiveTab('editor')}
              className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] transition-shadow flex items-center justify-center gap-2"
            >
              <Video className="w-5 h-5" />
              Open Video Editor
            </button>
            <button
              onClick={() => setActiveTab('downloader')}
              className="px-8 py-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold rounded-xl backdrop-blur-sm transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Download Videos
            </button>
          </motion.div>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                onClick={() => setActiveTab(feature.id === 'convert' || feature.id === 'export' || feature.id === 'studio' ? 'editor' : feature.id)}
                className="group relative bg-[#0d1117]/60 border border-white/5 rounded-[20px] p-6 hover:bg-[#13192a]/80 hover:border-white/10 hover:-translate-y-1 transition-all cursor-pointer overflow-hidden backdrop-blur-xl"
              >
                {/* Hover Top Line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${feature.color} bg-opacity-10 shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="fl-cap-pill px-3 py-1 text-xs font-medium text-slate-300">
                    {feature.badge}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-400 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-slate-400 text-sm mb-6 line-clamp-2">
                  {feature.description}
                </p>
                
                <div className="flex items-center text-sm font-semibold text-slate-300 group-hover:text-indigo-400 transition-colors">
                  Open Tool 
                  <ArrowRight className="w-4 h-4 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Recent Activity */}
      {activities.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-400" />
              <h2 className="text-2xl font-bold text-white">Recent Activity</h2>
            </div>
            <button
              onClick={handleClearHistory}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear History
            </button>
          </div>

          <div className="fl-glass rounded-2xl overflow-hidden border border-white/5">
            {activities.map((activity, idx) => (
              <div 
                key={activity.id}
                onClick={() => setActiveTab(getActivityTab(activity.type))}
                className={`flex items-center gap-4 p-4 hover:bg-white/5 transition-colors cursor-pointer ${
                  idx !== activities.length - 1 ? 'border-b border-white/5' : ''
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-medium truncate">{activity.title}</h4>
                  <p className="text-slate-400 text-sm truncate">{(activity.metadata as any)?.url || activity.type.replace('_', ' ')}</p>
                </div>
                <div className="text-slate-500 text-xs shrink-0 whitespace-nowrap">
                  {formatTimeAgo(activity.timestamp)}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
