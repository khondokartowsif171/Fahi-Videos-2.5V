const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const Module=require('node:module');
const root=path.resolve(__dirname, '..');const ts=require(path.join(root,'node_modules/typescript'));
const filename=path.join(root,'lib/timeline-export.ts');const mod=new Module(filename,module);mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText,filename);
let currentVideo;const stopped=[];let contextsClosed=0;let frames=[];
class Media extends EventTarget {
 constructor(){super();this._time=0;this.videoWidth=320;this.videoHeight=240;this.paused=true;this.playbackRate=1;this.ended=false;}
 set currentTime(value){this._time=value;queueMicrotask(()=>this.dispatchEvent(new Event('seeked')));}
 get currentTime(){return this._time;}
 load(){this._time=0;this.ended=false;queueMicrotask(()=>this.dispatchEvent(new Event('loadeddata')));}
 async play(){this.paused=false;} pause(){this.paused=true;} removeAttribute(){}
}
const track=()=>({stop(){stopped.push(1)}});
class Stream {constructor(tracks){this.tracks=tracks}getTracks(){return this.tracks}getVideoTracks(){return this.tracks}getAudioTracks(){return this.tracks}}
class Context {createMediaStreamDestination(){return {stream:new Stream([track()])}}createGain(){return {gain:{value:0},connect(){}}}createMediaElementSource(){return {connect(target){return target}}}async resume(){}async close(){contextsClosed++}}
class Recorder {static isTypeSupported(type){return type.startsWith('video/webm')}constructor(stream,options){this.state='inactive';this.mimeType=options.mimeType;this.actions=[];Recorder.last=this;}start(){this.state='recording';this.actions.push('start')}pause(){this.state='paused';this.actions.push('pause')}resume(){this.state='recording';this.actions.push('resume')}stop(){this.state='inactive';this.actions.push('stop');this.ondataavailable?.({data:new Blob(['test'])});queueMicrotask(()=>this.onstop?.())}}
Object.assign(global,{MediaRecorder:Recorder,MediaStream:Stream,AudioContext:Context,Audio:Media,window:{MediaRecorder:Recorder},document:{hidden:false,createElement(){return currentVideo=new Media()}},requestAnimationFrame(fn){return setImmediate(()=>{if(!currentVideo.paused) currentVideo._time+=0.1;fn()})},cancelAnimationFrame:clearImmediate});
const canvas={captureStream(){return new Stream([track()])}};
async function run(){
 const options={canvas,clips:[{objectUrl:'red',duration:1,startOffset:0.5},{objectUrl:'blue',duration:1,startOffset:2}],format:'mp4',quality:'high',speed:2,volume:0.5,start:0.25,end:1.75,draw(video,time){frames.push({source:video.src,sourceTime:video.currentTime,time})},progress(){}};
 const blob=await mod.exports.recordTimeline(options);
 assert(blob.size>0);assert(blob.type.startsWith('video/webm'));assert.deepEqual(Recorder.last.actions,['start','pause','resume','pause','stop']);
 assert.equal(frames[0].source,'red');assert.equal(frames[0].sourceTime,0.75);assert.equal(frames[0].time,0.25);
 const firstBlue=frames.find(f=>f.source==='blue');assert.equal(firstBlue.sourceTime,2);assert.equal(firstBlue.time,1);
 assert(frames.some(f=>f.source==='blue'&&f.time>=1.75));assert.equal(contextsClosed,1);assert.equal(stopped.length,2);
 frames=[];document.hidden=true;
 await assert.rejects(()=>mod.exports.recordTimeline({...options,start:0,end:1}),/Keep this tab open/);
 assert.equal(contextsClosed,2);assert.equal(stopped.length,4);
 document.hidden=false;
 await assert.rejects(()=>mod.exports.recordTimeline({...options,start:5,end:6}),/No video/);
 assert.equal(contextsClosed,3);
 console.log('PASS: trimmed multi-clip sequence, source offsets, timeline captions clock, pause/resume gaps, actual MIME fallback, hidden-tab failure and resource cleanup');
}
run().catch(error=>{console.error(error);process.exitCode=1});
