const cache = new Map<string, string>();
const videos = new Map<string, HTMLVideoElement>();
let queue: Promise<unknown> = Promise.resolve();
function wait(media: HTMLVideoElement, event: string, action: () => void) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => finish(new Error("Frame decode timed out")),
      12000,
    );
    const good = () => finish(),
      bad = () => finish(new Error("Frame decode failed"));
    function finish(error?: Error) {
      clearTimeout(timer);
      media.removeEventListener(event, good);
      media.removeEventListener("error", bad);
      error ? reject(error) : resolve();
    }
    media.addEventListener(event, good, { once: true });
    media.addEventListener("error", bad, { once: true });
    action();
  });
}
export function sceneFrame(
  url: string,
  time: number,
  signal: AbortSignal,
): Promise<string | undefined> {
  const key = url + ":" + time.toFixed(4);
  if (cache.has(key)) return Promise.resolve(cache.get(key));
  const result = queue.then(async () => {
    if (signal.aborted) return undefined;
    if (cache.has(key)) return cache.get(key);
    let video = videos.get(url);
    if (!video) {
      video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      videos.set(url, video);
      await wait(video, "loadeddata", () => {
        video!.src = url;
        video!.load();
      });
    }
    if (signal.aborted) return undefined;
    const position = Math.max(0, Math.min(video.duration - 0.001, time));
    if (Math.abs(video.currentTime - position) > 0.0001)
      await wait(video, "seeked", () => {
        video!.currentTime = position;
      });
    if (signal.aborted) return undefined;
    const canvas = document.createElement("canvas");
    canvas.width = 120;
    canvas.height = Math.max(
      24,
      Math.round((120 * video.videoHeight) / video.videoWidth),
    );
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = canvas.toDataURL("image/jpeg", 0.65);
    cache.set(key, image);
    if (cache.size > 384) cache.delete(cache.keys().next().value!);
    if (videos.size > 3) {
      const old = videos.keys().next().value!;
      if (old !== url) {
        const media = videos.get(old)!;
        media.removeAttribute("src");
        media.load();
        videos.delete(old);
      }
    }
    return image;
  });
  queue = result.catch(() => {});
  return result;
}
