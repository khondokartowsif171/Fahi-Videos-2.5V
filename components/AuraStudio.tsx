"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import "./aura/aura.css";
const Studio = dynamic(() => import("./aura/App"), { ssr: false, loading: () => <div className="p-8 text-slate-400">Loading Aura Studio…</div> });
export default function AuraStudio({ active }: { active: boolean }) {
  const [opened, setOpened] = useState(active);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (active) setOpened(true);
    else container.current?.querySelectorAll('video,audio').forEach(el => (el as HTMLMediaElement).pause());
  }, [active]);
  return <div ref={container} data-aura-active={active}>{opened && <Studio />}</div>;
}
