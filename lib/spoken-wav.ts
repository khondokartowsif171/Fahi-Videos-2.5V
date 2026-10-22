/** Decode actual provider speech into the 24 kHz mono PCM format used by the master mix. */
export async function spokenWav(bytes: Uint8Array): Promise<{bytes:Uint8Array;duration:number}> {
  const decoder = new AudioContext();
  try {
    const decoded = await decoder.decodeAudioData(new Uint8Array(bytes).buffer);
    const renderer = new OfflineAudioContext(1, Math.ceil(decoded.duration * 24000), 24000);
    const source = renderer.createBufferSource(); source.buffer = decoded;
    source.connect(renderer.destination); source.start();
    const mono = (await renderer.startRendering()).getChannelData(0);
    const buffer = new ArrayBuffer(44 + mono.length * 2); const view = new DataView(buffer);
    const text=(offset:number,value:string)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};
    text(0,'RIFF'); view.setUint32(4,buffer.byteLength-8,true); text(8,'WAVE'); text(12,'fmt ');
    view.setUint32(16,16,true); view.setUint16(20,1,true); view.setUint16(22,1,true);
    view.setUint32(24,24000,true); view.setUint32(28,48000,true); view.setUint16(32,2,true); view.setUint16(34,16,true);
    text(36,'data'); view.setUint32(40,mono.length*2,true);
    for(let i=0;i<mono.length;i++){const value=Math.max(-1,Math.min(1,mono[i]));view.setInt16(44+i*2,Math.round(value*(value<0?32768:32767)),true);}
    return {bytes:new Uint8Array(buffer),duration:decoded.duration};
  } finally { await decoder.close(); }
}
