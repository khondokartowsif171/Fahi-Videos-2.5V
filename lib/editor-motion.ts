export interface TransformFrame {time:number; x:number; y:number; zoom:number; rotation:number; opacity:number}
export interface SpeedPoint {position:number; speed:number}
export function transformAt(frames: TransformFrame[], time:number, fallback:Omit<TransformFrame,'time'>) {
  if (!frames.length) return fallback;
  const sorted = [...frames].sort((a,b)=>a.time-b.time);
  if (time <= sorted[0].time) return sorted[0];
  const last=sorted[sorted.length-1]; if (time>=last.time) return last;
  const right=sorted.findIndex(frame=>frame.time>=time), a=sorted[right-1], b=sorted[right];
  const t=(time-a.time)/(b.time-a.time);
  return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,zoom:a.zoom+(b.zoom-a.zoom)*t,rotation:a.rotation+(b.rotation-a.rotation)*t,opacity:a.opacity+(b.opacity-a.opacity)*t};
}
export function speedAt(points:SpeedPoint[], position:number) {
  if (!points.length) return 1;
  const sorted=[...points].sort((a,b)=>a.position-b.position);
  if(position<=sorted[0].position)return sorted[0].speed;
  const right=sorted.findIndex(p=>p.position>=position);
  if(right<0)return sorted[sorted.length-1].speed;
  const a=sorted[right-1],b=sorted[right];
  return Math.max(0.25, Math.min(4,a.speed+(b.speed-a.speed)*(position-a.position)/(b.position-a.position)));
}
/** Fade through black uses each clip's own head/tail; no overlap or loss of source footage. */
export function fadeAt(localTime:number,duration:number,seconds:number) {
  const fade=Math.min(seconds,duration/2);
  if(fade<=0)return 1;
  return Math.max(0, Math.min(1,localTime/fade,(duration-localTime)/fade));
}
export function keyPixels(data:Uint8ClampedArray,color:string,tolerance:number,softness:number) {
  const hex=color.replace('#',''); const r=parseInt(hex.slice(0,2),16),g=parseInt(hex.slice(2,4),16),b=parseInt(hex.slice(4,6),16);
  if(!Number.isFinite(r+g+b)) return;
  const edge=Math.max(1,softness);
  for(let i=0;i<data.length;i+=4) {
    const distance=Math.hypot(data[i]-r,data[i+1]-g,data[i+2]-b);
    data[i+3]=Math.round(data[i+3]*Math.max(0,Math.min(1,(distance-tolerance)/edge)));
  }
}
export function keyedFrame(video:HTMLVideoElement,canvas:HTMLCanvasElement,color:string,tolerance:number,softness:number) {
  const scale=Math.min(1,1280/Math.max(video.videoWidth,video.videoHeight));
  const width=Math.max(1,Math.round(video.videoWidth*scale)),height=Math.max(1,Math.round(video.videoHeight*scale));
  if(canvas.width!==width || canvas.height!==height){canvas.width=width;canvas.height=height;}
  const context=canvas.getContext('2d',{willReadFrequently:true}); if(!context)return video;
  context.clearRect(0,0,width,height);context.drawImage(video,0,0,width,height);
  const pixels=context.getImageData(0,0,width,height);keyPixels(pixels.data,color,tolerance,softness);context.putImageData(pixels,0,0);
  return canvas;
}
