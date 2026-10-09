"use client";
import { useEffect, useRef, MutableRefObject } from "react";
import { AudioLayer, createAudioMixer } from "@/lib/editor-audio";
export type AudioPreviewControl = {
  unlock: (time: number, rate: number) => void;
};
export default function AudioPreview({
  layers,
  time,
  playing,
  rate,
  onError,
  controlRef,
  onLevel,
}: {
  layers: AudioLayer[];
  time: number;
  playing: boolean;
  rate: number;
  onError: (message: string) => void;
  controlRef?: MutableRefObject<AudioPreviewControl | null>;
  onLevel?: (level: number) => void;
}) {
  const mixer = useRef<ReturnType<typeof createAudioMixer> | null>(null);
  const context = useRef<AudioContext | null>(null);
  const error = useRef(onError);
  error.current = onError;
  const identity = layers.map((layer) => layer.id + ":" + layer.url).join("|");
  useEffect(() => {
    if (!layers.length) return;
    const audio = new AudioContext();
    context.current = audio;
    mixer.current = createAudioMixer(
      audio,
      audio.destination,
      layers,
      (message) => error.current(message),
    );
    if (controlRef)
      controlRef.current = {
        unlock: (position, speed) => {
          void audio.resume();
          mixer.current?.sync(position, true, speed);
        },
      };
    return () => {
      mixer.current?.dispose();
      mixer.current = null;
      context.current = null;
      if (controlRef) controlRef.current = null;
      void audio.close();
    };
  }, [identity]);
  useEffect(() => {
    if (playing)
      void context.current
        ?.resume()
        .catch(() => error.current("Tap Play to enable audio playback."));
    mixer.current?.update(layers);
    mixer.current?.sync(time, playing, rate);
  }, [time, playing, rate, layers]);
  useEffect(() => {
    if (!onLevel) return;
    const timer = setInterval(
      () => onLevel(playing ? mixer.current?.level() || 0 : 0),
      150,
    );
    return () => clearInterval(timer);
  }, [playing, onLevel]);
  return null;
}
