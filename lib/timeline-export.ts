/** Record each trimmed source in timeline order. Loading gaps are excluded. */
export async function recordTimeline(options: {
  clips: {objectUrl: string; duration: number; startOffset?: number}[];
  canvas: HTMLCanvasElement;
  format: string;
  quality: string;
  speed: number;
  volume: number;
  audioUrl?: string;
  start: number;
  end: number;
  draw: (video: HTMLVideoElement, time: number) => void;
  progress: (percent: number) => void;
}): Promise<Blob> {
  if (!window.MediaRecorder || !options.canvas.captureStream) throw new Error('This browser does not support video export. Use a recent Safari or Chrome browser.');
  const video = document.createElement('video');
  video.playsInline = true; video.preload = 'auto'; video.crossOrigin = 'anonymous';
  const audioContext = new AudioContext();
  const output = audioContext.createMediaStreamDestination();
  const gain = audioContext.createGain(); gain.gain.value = options.volume;
  audioContext.createMediaElementSource(video).connect(gain).connect(output);
  const music = options.audioUrl ? new Audio() : undefined;
  if (music) { music.crossOrigin = 'anonymous'; music.src = options.audioUrl!; audioContext.createMediaElementSource(music).connect(output); }
  const canvasStream = options.canvas.captureStream(30);
  const stream = new MediaStream([...canvasStream.getVideoTracks(), ...output.stream.getAudioTracks()]);
  const types = options.format === 'mp4'
    ? ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
    : ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
  const mimeType = types.find(type => MediaRecorder.isTypeSupported(type));
  if (!mimeType) { stream.getTracks().forEach(t => t.stop()); await audioContext.close(); throw new Error('No supported recording format in this browser.'); }
  const recorder = new MediaRecorder(stream, {mimeType, videoBitsPerSecond: options.quality === 'low' ? 2500000 : options.quality === 'medium' ? 5000000 : 8000000});
  const chunks: Blob[] = [];
  recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
  let failed: unknown;
  recorder.onerror = event => { failed = (event as Event & {error?: Error}).error || new Error('Video recording failed'); };
  const completed = new Promise<Blob>(resolve => { recorder.onstop = () => resolve(new Blob(chunks, {type: recorder.mimeType})); });
  const waitFor = (element: HTMLMediaElement, event: string, action: () => void) => new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => finish(new Error('Media loading timed out')), 30000);
    const good = () => finish(); const bad = () => finish(new Error('Could not decode the selected media'));
    const finish = (error?: Error) => { clearTimeout(timeout); element.removeEventListener(event, good); element.removeEventListener('error', bad); error ? reject(error) : resolve(); };
    element.addEventListener(event, good, {once: true}); element.addEventListener('error', bad, {once: true});
    action();
  });
  const end = Math.min(options.end, options.clips.reduce((sum, clip) => sum + clip.duration, 0));
  try {
    await audioContext.resume();
    if (music) { await waitFor(music, 'loadeddata', () => music.load()); }
    let offset = 0;
    for (const clip of options.clips) {
      const localStart = Math.max(0, options.start - offset);
      const localEnd = Math.min(clip.duration, end - offset);
      if (localEnd <= localStart) { offset += clip.duration; continue; }
      await waitFor(video, 'loadeddata', () => { video.src = clip.objectUrl; video.load(); });
      const sourceStart = (clip.startOffset || 0) + localStart;
      if (Math.abs(video.currentTime - sourceStart) > 0.001) await waitFor(video, 'seeked', () => { video.currentTime = sourceStart; });
      video.playbackRate = options.speed;
      options.draw(video, offset + localStart);
      await video.play();
      if (music) { music.currentTime = Math.max(0, (offset + localStart - options.start) / options.speed); await music.play(); }
      if (recorder.state === 'inactive') recorder.start(250); else recorder.resume();
      await new Promise<void>((resolve, reject) => {
        const watchdog = setTimeout(() => done(new Error('Playback stalled during export')), ((localEnd - localStart) / options.speed + 30) * 1000);
        let frame = 0;
        const done = (error?: Error) => { clearTimeout(watchdog); cancelAnimationFrame(frame); video.removeEventListener('error', decodeError); video.pause(); music?.pause(); error ? reject(error) : resolve(); };
        const decodeError = () => done(new Error('Video decoding failed during export'));
        video.addEventListener('error', decodeError, {once: true});
        const render = () => {
          if (failed) { done(failed instanceof Error ? failed : new Error('Recording failed')); return; }
          if (document.hidden) { done(new Error('Keep this tab open and the screen awake during export.')); return; }
          const localTime = video.currentTime - (clip.startOffset || 0);
          options.draw(video, offset + localTime);
          options.progress(Math.min(99, 100 * (offset + localTime - options.start) / Math.max(0.01, end - options.start)));
          if (localTime >= localEnd || video.ended) { done(); return; }
          frame = requestAnimationFrame(render);
        };
        render();
      });
      recorder.pause();
      offset += clip.duration;
    }
    if (recorder.state === 'inactive') throw new Error('No video in the selected export range');
    recorder.stop();
    const blob = await completed;
    if (failed) throw failed;
    if (!blob.size) throw new Error('The browser produced an empty video');
    options.progress(100);
    return blob;
  } finally {
    if (recorder.state !== 'inactive') recorder.stop();
    video.pause(); music?.pause(); video.removeAttribute('src'); video.load();
    stream.getTracks().forEach(track => track.stop());
    await audioContext.close();
  }
}
