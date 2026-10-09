"use client";
import { memo, useEffect, useState } from "react";
import { CutClip, CutAsset, clipDuration } from "@/lib/cut-model";
import { sceneFrame } from "@/lib/cut-filmstrip";
function Filmstrip({
  clip,
  asset,
  scale,
  first,
  last,
}: {
  clip: CutClip;
  asset: CutAsset;
  scale: number;
  first: number;
  last: number;
}) {
  const [frames, setFrames] = useState<Record<number, string>>({});
  const length = clipDuration(clip),
    tile = 60,
    count = Math.ceil((length * scale) / tile);
  useEffect(() => {
    const abort = new AbortController();
    setFrames({});
    const load = async () => {
      for (let i = Math.max(0, first); i <= Math.min(count - 1, last); i++) {
        if (abort.signal.aborted) break;
        const time =
          clip.in +
          Math.min(length - 0.001, ((i + 0.5) * tile) / scale) * clip.speed;
        try {
          const frame = await sceneFrame(asset.url, time, abort.signal);
          if (frame && !abort.signal.aborted)
            setFrames((old) => ({ ...old, [i]: frame }));
        } catch {}
      }
    };
    void load();
    return () => abort.abort();
  }, [
    asset.url,
    clip.in,
    clip.out,
    clip.speed,
    scale,
    first,
    last,
    count,
    length,
  ]);
  return (
    <div
      className="cut-filmstrip"
      aria-label={"Scene frames for " + asset.name}
    >
      {Array.from(
        {
          length: Math.max(
            0,
            Math.min(count - 1, last) - Math.max(0, first) + 1,
          ),
        },
        (_, n) => n + Math.max(0, first),
      ).map((i) =>
        frames[i] || asset.thumbnail ? (
          <img
            key={i}
            src={frames[i] || asset.thumbnail}
            alt={
              "Scene " +
              (
                clip.in +
                Math.min(length - 0.001, ((i + 0.5) * tile) / scale) *
                  clip.speed
              ).toFixed(3) +
              "s"
            }
            style={{ left: i * tile, width: tile }}
            draggable={false}
          />
        ) : (
          <span
            key={i}
            aria-label="Loading scene frame"
            style={{
              position: "absolute",
              left: i * tile,
              width: tile,
              height: "100%",
              background: "#303039",
            }}
          />
        ),
      )}
    </div>
  );
}
export default memo(Filmstrip);
