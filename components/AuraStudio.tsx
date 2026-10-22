"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import "./aura/aura.css";
import {isEmbedded} from '@/lib/studio-client';
import ManagedVideo from './ManagedVideo';
const Studio = dynamic(() => import("./aura/App"), { ssr: false, loading: () => <div className="p-8 text-slate-400">Loading Aura Studio…</div> });
export default function AuraStudio({ active }: { active: boolean }) {
  const [opened, setOpened] = useState(active);
  const [creative,setCreative]=useState(false);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (active) setOpened(true);
    else container.current?.querySelectorAll('video,audio').forEach(el => (el as HTMLMediaElement).pause());
  }, [active]);
  return <div ref={container} data-aura-active={active}>{opened && <>{isEmbedded&&<nav className="flex gap-4 p-3 border-b border-slate-800"><button onClick={()=>setCreative(false)} aria-pressed={!creative}>Aura Studio · Omni</button><button onClick={()=>setCreative(true)} aria-pressed={creative}>Creative tools</button></nav>}{isEmbedded&&<div hidden={creative}><ManagedVideo/></div>}<div hidden={isEmbedded&&!creative}>{isEmbedded&&<p className="p-3 text-amber-200 text-sm">Image, Director and UGC actions use their separately configured provider access. Use the Omni tab for managed video. Legacy video requests are disabled in this embedded workspace.</p>}<Studio /></div></>}</div>;
}
