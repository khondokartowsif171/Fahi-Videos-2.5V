'use client';
import { useEffect, useRef } from 'react';

export const isEmbedded=process.env.NEXT_PUBLIC_FAHI_EMBEDDED==='1';
export const studioBase=process.env.NEXT_PUBLIC_FAHI_BASE_PATH||'';
export type StudioKind='editor'|'aura'|'kotha'|'thumbnail';
export type StudioAdapter={capture:()=>unknown;restore:(state:any)=>void};
const adapters=new Map<StudioKind,StudioAdapter>();
let tenant='';
const uploads=new Map<string,string>();
const blobUploads=new WeakMap<Blob,string>();
export async function bridge(path:string,init:RequestInit={}) {
  const response=await fetch('/api/fahi/'+path,init);
  if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||`Studio request failed (${response.status}).`);}
  return response;
}
export function setupStudioFetch() {
  if(!isEmbedded) return ()=>{};
  const original=window.fetch.bind(window);
  window.fetch=((input:RequestInfo|URL,init?:RequestInit)=>{
    let url=typeof input==='string'?input:input instanceof URL?input.href:input.url;
    if(url.startsWith('/api/')&&!url.startsWith('/api/fahi/')) url=studioBase+url;
    const headers=new Headers(init?.headers||(input instanceof Request?input.headers:undefined));
    const localApi=url.startsWith('/api/fahi/')||url.startsWith(studioBase+'/api/');
    if(localApi&&tenant) headers.set('x-fahi-workspace',tenant);
    for(const name of ['x-gemini-api-key','x-aura-client-id','x-n8n-webhook-url','x-n8n-api-key']) headers.delete(name);
    if((init?.method||'GET').toUpperCase()==='POST'&&!headers.has('x-request-id'))headers.set('x-request-id',crypto.randomUUID());
    return original(input instanceof Request?new Request(url,input):url,{...init,headers}).then(response=>{
      if(localApi&&response.headers.get('x-fahi-workspace-changed')==='1') window.location.reload();
      if(localApi&&response.status===401) window.location.replace(studioBase+'/');
      return response;
    });
  }) as typeof fetch;
  return ()=>{window.fetch=original;};
}
export function useStudioProject(kind:StudioKind,capture:()=>unknown,restore:(state:any)=>void) {
  const previous=useRef('');
  useEffect(()=>{if(!isEmbedded)return;const current=JSON.stringify(capture());if(previous.current&&previous.current!==current)window.dispatchEvent(new CustomEvent('fahi-project-dirty',{detail:kind}));previous.current=current;const adapter={capture,restore:(value:any)=>{previous.current=JSON.stringify(value);restore(value);}};adapters.set(kind,adapter);return()=>{if(adapters.get(kind)===adapter)adapters.delete(kind);};},[kind,capture,restore]);
}
export function setStudioTenant(value:string){if(tenant&&tenant!==value){uploads.clear();window.location.reload();}tenant=value;}
async function upload(blob:Blob,name:string,cacheKey?:string) {
  if(blobUploads.has(blob))return blobUploads.get(blob)!;
  if(cacheKey&&uploads.has(cacheKey))return uploads.get(cacheKey)!;
  const response=await bridge('assets?name='+encodeURIComponent(name),{method:'POST',headers:{'Content-Type':blob.type||'application/octet-stream','x-file-size':String(blob.size)},body:blob});
  const asset=await response.json();if(cacheKey)uploads.set(cacheKey,asset.id);blobUploads.set(blob,asset.id);return asset.id as string;
}
async function pack(value:any):Promise<any>{
  if(value instanceof Date)return {__studioDate:value.toISOString()};
  if(value instanceof Uint8Array)return {__studioAsset:await upload(new Blob([new Uint8Array(value)],{type:'audio/wav'}),'audio-buffer'),bytes:true};
  if(value&&typeof value==='object'&&typeof value.data==='string'&&value.mimeType&&/^(image|video|audio)\//.test(value.mimeType)) {
    const blob=await(await fetch('data:'+value.mimeType+';base64,'+value.data)).blob();
    const out:Record<string,unknown>={};
    for(const [key,item]of Object.entries(value))out[key]=key==='data'?{__studioAsset:await upload(blob,'source-media',value.data),raw:true}:await pack(item);
    return out;
  }
  if(value instanceof Blob){return {__studioAsset:await upload(value,value instanceof File?value.name:'media'),file:true,name:value instanceof File?value.name:'media',type:value.type};}
  if(typeof value==='string'&&(value.startsWith('blob:')||/^data:(video|audio|image)\//.test(value))){
    const blob=await(await fetch(value)).blob();return {__studioAsset:await upload(blob,'media',value),file:false};
  }
  if(Array.isArray(value)){const out=[];for(const item of value)out.push(await pack(item));return out;}
  if(value&&typeof value==='object'){const out:Record<string,unknown>={};for(const [key,item]of Object.entries(value))out[key]=await pack(item);return out;}
  return value;
}
async function unpack(value:any):Promise<any>{
  if(value?.__studioDate)return new Date(value.__studioDate);
  if(value?.__studioAsset){
    const url='/api/fahi/assets/'+value.__studioAsset;
    if(value.bytes||value.raw){const bytes=new Uint8Array(await(await bridge('assets/'+value.__studioAsset)).arrayBuffer());if(value.bytes)return bytes;let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);}
    if(value.file){const blob=await(await bridge('assets/'+value.__studioAsset)).blob();return new File([blob],value.name,{type:value.type});}
    return url;
  }
  if(Array.isArray(value))return Promise.all(value.map(unpack));
  if(value&&typeof value==='object'){const out:Record<string,unknown>={};for(const [key,item]of Object.entries(value))out[key]=await unpack(item);return out;}
  return value;
}
export async function captureProject(kind:StudioKind){const adapter=adapters.get(kind);if(!adapter)throw Error('Open this creative tool before saving its project.');return {version:1,kind,state:await pack(adapter.capture())};}
export async function restoreProject(kind:StudioKind,document:any){const adapter=adapters.get(kind);if(!adapter)throw Error('Open this creative tool, then select the project again.');if(document.version!==1||document.kind!==kind)throw Error('Unsupported project version.');adapter.restore(await unpack(document.state));}
