'use client';
import {useState} from 'react';
import {isEmbedded,saveStudioExport} from '@/lib/studio-client';
export default function CloudExport({source,name}:{source:string;name:string}){
  const [busy,setBusy]=useState(false),[url,setUrl]=useState(''),[error,setError]=useState('');
  if(!isEmbedded)return null;
  return <span className="text-xs">
    {url?<a href={url} download={name} className="underline text-cyan-300">Download cloud export</a>:<button disabled={busy} onClick={async()=>{setBusy(true);setError('');try{const blob=await(await fetch(source)).blob();setUrl(await saveStudioExport(blob,name));}catch(e){setError(e instanceof Error?e.message:'Cloud export failed.');}finally{setBusy(false);}}} className="rounded border border-cyan-500/40 px-2 py-1">{busy?'Saving export…':'Save export to cloud'}</button>}
    {error&&<span role="alert" className="block text-red-300">{error}</span>}
  </span>;
}
