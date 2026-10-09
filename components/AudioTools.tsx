"use client";
import { AudioLayer, audioLength, splitAudio } from "@/lib/editor-audio";
export function Waveform({ layer }: { layer: AudioLayer }) {
  const from = Math.floor(
    (layer.trimStart / layer.duration) * layer.peaks.length,
  );
  const to = Math.max(
    from + 1,
    Math.ceil((layer.trimEnd / layer.duration) * layer.peaks.length),
  );
  const peaks = layer.peaks.slice(from, to);
  return (
    <svg
      aria-label="Audio waveform"
      viewBox={`0 0 ${peaks.length * 3} 40`}
      preserveAspectRatio="none"
      className="w-full h-8 text-violet-300"
    >
      <g stroke="currentColor" strokeWidth="2">
        {peaks.map((p, i) => (
          <line
            key={i}
            x1={i * 3 + 1}
            x2={i * 3 + 1}
            y1={20 - Math.max(1, p * 19)}
            y2={20 + Math.max(1, p * 19)}
          />
        ))}
      </g>
    </svg>
  );
}
export default function AudioTools({
  layers,
  change,
  selected,
  select,
  time,
  importFiles,
  outputClock = false,
}: {
  layers: AudioLayer[];
  change: (layers: AudioLayer[]) => void;
  selected: string | null;
  select: (id: string | null) => void;
  time: number;
  importFiles: (files: File[]) => Promise<void>;
  outputClock?: boolean;
}) {
  const layer = layers.find((l) => l.id === selected) || layers[0];
  const edit = (patch: Partial<AudioLayer>) =>
    change(layers.map((l) => (l.id === layer?.id ? { ...l, ...patch } : l)));
  const input = (
    title: string,
    value: number,
    min: number,
    max: number,
    step: number,
    apply: (value: number) => void,
  ) => (
    <label className="block space-y-1 text-xs">
      {title}
      <div className="flex gap-2">
        <input
          aria-label={title}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => apply(+e.target.value)}
          className="w-full accent-violet-500"
        />
        <input
          aria-label={`${title} value`}
          type="number"
          min={min}
          max={max}
          step={step}
          value={Number(value.toFixed(2))}
          onChange={(e) => {
            const n = +e.target.value;
            if (Number.isFinite(n)) apply(Math.min(max, Math.max(min, n)));
          }}
          className="w-16 bg-black/30 rounded p-1"
        />
      </div>
    </label>
  );
  return (
    <div className="space-y-3 text-slate-200">
      <label className="block rounded-lg bg-violet-600 p-3 text-center text-xs font-bold cursor-pointer">
        + Add music / sound
        <input
          id="audio-upload"
          type="file"
          accept="audio/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void importFiles(Array.from(e.target.files || []));
            e.target.value = "";
          }}
        />
      </label>
      <p className="text-[10px] text-slate-400">
        Add multiple sounds, then tap a clip to edit.{" "}
        {outputClock
          ? "Music keeps its own timing when video speed changes."
          : "Times follow the video timeline; speed changes apply to the mix."}
      </p>
      {layers.map((l) => (
        <button
          key={l.id}
          onClick={() => select(l.id)}
          className={`block w-full rounded border p-2 text-left ${l.id === layer?.id ? "border-violet-400 bg-violet-500/20" : "border-white/10"}`}
        >
          <span className="block text-xs truncate">
            {l.muted ? "🔇 " : ""}
            {l.name}
          </span>
          <Waveform layer={l} />
          <span className="text-[10px]">
            {l.start.toFixed(2)}s → {(l.start + audioLength(l)).toFixed(2)}s
          </span>
        </button>
      ))}
      {layer && (
        <div className="space-y-3 rounded-lg bg-white/5 p-3">
          {input("Start on timeline (s)", layer.start, 0, 3600, 0.05, (v) =>
            edit({ start: v }),
          )}
          {input(
            "Trim in (s)",
            layer.trimStart,
            0,
            layer.trimEnd - 0.01,
            0.01,
            (v) => edit({ trimStart: v }),
          )}
          {input(
            "Trim out (s)",
            layer.trimEnd,
            layer.trimStart + 0.01,
            layer.duration,
            0.01,
            (v) => edit({ trimEnd: v }),
          )}
          {input("Volume (%)", layer.volume * 100, 0, 200, 1, (v) =>
            edit({ volume: v / 100 }),
          )}
          {input(
            "Fade in (s)",
            layer.fadeIn,
            0,
            audioLength(layer),
            0.05,
            (v) => edit({ fadeIn: v }),
          )}
          {input(
            "Fade out (s)",
            layer.fadeOut,
            0,
            audioLength(layer),
            0.05,
            (v) => edit({ fadeOut: v }),
          )}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              [
                "Split at playhead",
                () =>
                  change(
                    layers.flatMap((l) =>
                      l.id === layer.id ? splitAudio(l, time) : [l],
                    ),
                  ),
              ],
              [
                "Duplicate",
                () =>
                  change([
                    ...layers,
                    {
                      ...layer,
                      id: crypto.randomUUID(),
                      start: layer.start + audioLength(layer),
                    },
                  ]),
              ],
              [
                layer.muted ? "Unmute" : "Mute",
                () => edit({ muted: !layer.muted }),
              ],
              ["Delete", () => change(layers.filter((l) => l.id !== layer.id))],
            ].map(([title, action]) => (
              <button
                key={title as string}
                className="rounded bg-white/10 p-2"
                onClick={action as () => void}
              >
                {title as string}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
