"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import "./kotha/kotha.css";

const Studio = dynamic(() => import("./kotha/App"), {
  ssr: false,
  loading: () => (
    <div className="p-8 text-slate-400 font-bangla">
      Loading Kotha Studio · কণ্ঠধ্বনি…
    </div>
  ),
});

export default function KothaStudio({ active }: { active: boolean }) {
  const [opened, setOpened] = useState(active);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (active) {
      setOpened(true);
    } else {
      container.current
        ?.querySelectorAll("video,audio")
        .forEach((el) => (el as HTMLMediaElement).pause());
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    }
  }, [active]);

  return (
    <div ref={container} data-kotha-active={active}>
      {opened && <Studio />}
    </div>
  );
}
