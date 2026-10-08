"use client";
import React,{useEffect,useRef} from 'react';
import {keyedFrame} from '@/lib/editor-motion';
export default function ChromaPreview({videoRef,color,tolerance,softness,style}:{videoRef:React.RefObject<HTMLVideoElement|null>;color:string;tolerance:number;softness:number;style:React.CSSProperties}) {
  const canvasRef=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    let frame=0,lastTime=-1;
    const render=()=>{
      const video=videoRef.current,canvas=canvasRef.current;
      if(video && canvas && video.readyState>=2 && video.currentTime!==lastTime) {lastTime=video.currentTime;keyedFrame(video,canvas,color,tolerance,softness);}
      frame=requestAnimationFrame(render);
    };render();return()=>cancelAnimationFrame(frame);
  },[videoRef,color,tolerance,softness]);
  return <canvas ref={canvasRef} aria-label="Chroma key preview" className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={style}/>;
}
