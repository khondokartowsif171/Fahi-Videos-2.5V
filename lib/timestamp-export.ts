import type {recordTimeline} from './timeline-export';
import {renderExportMix, clearAudioBufferCache} from './export-audio';
import {Output, Mp4OutputFormat, WebMOutputFormat, BufferTarget, CanvasSource, AudioBufferSource, canEncodeVideo, canEncodeAudio} from 'mediabunny';

function ready(video: HTMLVideoElement, event: string, update: () => void) {
  return new Promise<void>((resolve,reject)=>{
    const finish=(error?:Error)=>{clearTimeout(timer);video.removeEventListener(event,done);video.removeEventListener('error',bad);error?reject(error):resolve();};
    const done=()=>finish(),bad=()=>finish(new Error('Source video could not be decoded. Your project is preserved.'));
    const timer=setTimeout(()=>finish(new Error('Source video decoding timed out. Your project is preserved.')),15000);
    video.addEventListener(event,done,{once:true});video.addEventListener('error',bad,{once:true});update();
  });
}

/** Explicit frame timestamps and offline audio share the same timeline time map. */
export async function renderTimestamped(o:Parameters<typeof recordTimeline>[0]):Promise<Blob>{
  const width=o.canvas.width,height=o.canvas.height,fps=30;
  const avc=await canEncodeVideo('avc',{width,height}),aac=await canEncodeAudio('aac');
  const mp4=o.format==='mp4'&&avc&&aac;
  const codec=mp4?'avc':await canEncodeVideo('vp9',{width,height})?'vp9':'vp8';
  if(!mp4&&(!await canEncodeVideo(codec,{width,height})||!await canEncodeAudio('opus')))throw new Error('Frame-accurate export is unavailable in this browser. Use current Chrome or Edge. Your project is preserved.');
  const video=document.createElement('video');video.muted=true;video.playsInline=true;video.preload='auto';
  const target=new BufferTarget(),output=new Output({format:mp4?new Mp4OutputFormat():new WebMOutputFormat(),target});
  let started=false;
  try{
    const end=Math.min(o.end,o.clips.reduce((sum,c)=>sum+c.duration,0));
    if(end<=o.start)throw new Error('No video in the selected export range.');
    const {audioBuffer,timeMap}=await renderExportMix({...o,end,progress:p=>o.progress(Math.min(10,p))});
    const frames=Math.ceil(timeMap.outputDuration*fps-1e-7);
    const source=new CanvasSource(o.canvas,{codec,bitrate:o.quality==='low'?2500000:o.quality==='medium'?5000000:8000000});
    const audio=new AudioBufferSource({codec:mp4?'aac':'opus',bitrate:192000});
    output.addVideoTrack(source);output.addAudioTrack(audio);await output.start();started=true;
    const audioTask=audio.add(audioBuffer);audioTask.catch(()=>{});
    let current=-1;
    for(let frame=0;frame<frames;frame++){
      o.signal?.throwIfAborted();
      const timestamp=frame/fps,tl=timeMap.toTimeline(timestamp);let start=0,index=0;
      while(index<o.clips.length-1&&tl>=start+o.clips[index].duration-1e-8){start+=o.clips[index].duration;index++;}
      const clip=o.clips[index];
      if(current!==index){await ready(video,'loadeddata',()=>{video.src=clip.objectUrl;video.load();});current=index;}
      const local=tl-start,desired=(clip.startOffset||0)+(clip.isFreezeFrame?0:clip.reversed?clip.duration-local:local);
      const seek=Math.max(0,Math.min(desired,video.duration-1e-5));
      if(Math.abs(video.currentTime-seek)>1e-6)await ready(video,'seeked',()=>{video.currentTime=seek;});
      o.draw(video,tl);
      await source.add(timestamp,Math.min(1/fps,timeMap.outputDuration-timestamp));
      o.progress(10+85*(frame+1)/frames);
    }
    await audioTask;source.close();audio.close();await output.finalize();started=false;
    if(!target.buffer)throw new Error('The encoded output is empty.');o.progress(100);
    return new Blob([target.buffer],{type:mp4?'video/mp4':'video/webm'});
  }finally{if(started)await output.cancel().catch(()=>{});video.pause();video.removeAttribute('src');video.load();clearAudioBufferCache();}
}
