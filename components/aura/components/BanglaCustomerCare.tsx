import React, { useEffect, useState } from 'react';
import { X, Phone } from 'lucide-react';
import { auraFetch } from '../api-client';
export default function BanglaCustomerCare({isOpen,onClose}:{isOpen:boolean;onClose:()=>void}) {
  const [phone,setPhone]=useState(''),[callSid,setCallSid]=useState(''),[status,setStatus]=useState('idle'),[error,setError]=useState('');
  useEffect(()=> {
    if(!callSid || ['completed','busy','failed','no-answer','canceled'].includes(status)) return;
    const timer=setInterval(async()=> {
      try { const r=await auraFetch('/api/care/status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({callSid})}); const d=await r.json(); if(r.ok)setStatus(d.status);else setError(d.error); }
      catch {setError('Could not check the call status.');}
    },5000);
    return ()=>clearInterval(timer);
  },[callSid,status]);
  const action=async(end=false)=> {
    setError('');setStatus(end?'ending':'connecting');
    try { const r=await auraFetch(end?'/api/care/end-call':'/api/care/initiate-call',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(end?{callSid}:{phoneNumber:phone})});const d=await r.json();if(!r.ok)throw new Error(d.error);setCallSid(d.callSid);setStatus(d.status); }
    catch(e:any){setError(e.message);setStatus(end?'in-progress':'idle');}
  };
  if(!isOpen)return null;
  const active=!!callSid&&!['completed','busy','failed','no-answer','canceled'].includes(status);
  return <div className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-4"><div className="w-full max-w-md bg-neutral-950 border border-neutral-700 p-6 rounded-2xl text-white">
    <div className="flex justify-between mb-6"><h2 className="font-bold">Customer care call</h2><button onClick={onClose} aria-label="Close call panel"><X/></button></div>
    <p className="text-sm text-neutral-400 mb-4">Calls use your configured Twilio voice webhook. Configure a Bengali agent at that webhook to handle the conversation.</p>
    <label htmlFor="aura-phone" className="text-sm">Customer phone number</label><input id="aura-phone" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+88017…" type="tel" className="w-full bg-neutral-900 p-3 rounded-lg my-3"/>
    <p className="text-sm mb-3" aria-live="polite">Call status: {status}</p>{error&&<p role="alert" className="text-sm text-red-400 mb-3">{error}</p>}
    <button disabled={status==='connecting'||status==='ending'} onClick={()=>action(active)} className="w-full bg-indigo-600 rounded-lg py-3 font-bold flex justify-center gap-2"><Phone size={18}/>{active?'End call':'Place call'}</button>
  </div></div>;
}
