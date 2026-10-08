const fs=require('fs'),path=require('path'),Module=require('module'),assert=require('node:assert/strict');
const ts=require('typescript');
process.env.AURA_DATA_DIR=path.join(require('os').tmpdir(), 'fahi-aura-test-' + process.pid);
delete process.env.GEMINI_API_KEY;
const calls=[];
class MockAI {
  constructor(options){this.options=options;}
  models={generateVideos:async p=>{calls.push(p);return {name:'models/veo/operations/test'};},generateContent:async p=>{
    calls.push(p);
    if(p.config?.responseModalities?.includes('AUDIO'))return {candidates:[{content:{parts:[{inlineData:{data:Buffer.from([0,0,1,0]).toString('base64'),mimeType:'audio/L16;codec=pcm;rate=24000'}}]}}]};
    if(p.config?.responseModalities?.includes('IMAGE'))return {candidates:[{content:{parts:[{inlineData:{data:'aW1hZ2U=',mimeType:'image/png'}}]}}]};
    return {text:p.config?.responseMimeType==='application/json'?JSON.stringify({voiceoverScript:'বাংলা',videoPrompt:'Scene',englishTranslation:'Bengali'}):'Cinematic direction'};
  }};
  operations={getVideosOperation:async()=>({done:true,response:{generatedVideos:[{video:{uri:'https://generativelanguage.googleapis.com/v1beta/files/video:download'}}]}})};
}
const source=fs.readFileSync(path.join(__dirname,'../lib/aura-server.ts'),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
const mod=new Module(path.join(__dirname,'aura-server-test.cjs'),module);mod.filename=mod.id;mod.paths=module.paths;
const nativeRequire=mod.require.bind(mod);mod.require=id=>id==='@google/genai'?{GoogleGenAI:MockAI,GenerateVideosOperation:class{}}:nativeRequire(id);
mod._compile(code,mod.filename); const {handleAura}=mod.exports;
const own='11111111-1111-4111-8111-111111111111';
const headers={'x-aura-client-id':own,'x-gemini-api-key':'test-key','Content-Type':'application/json'};
const request=(route,body,custom=headers)=>handleAura(new Request('http://localhost/api/aura/'+route,{method:body===undefined?'GET':'POST',headers:custom,...(body===undefined?{}:{body:JSON.stringify(body)})}),route.split('/'));
(async()=>{
  assert.equal((await request('health')).status,200);
  assert.equal((await request('director/chat',{message:'Hello'},{'x-aura-client-id':own})).status,503);
  assert.equal((await request('image/generate',{prompt:'Scene'},{'Content-Type':'application/json'})).status,400);
  const image=await (await request('image/generate',{prompt:'Scene'})).json();assert.equal(image.mimeType,'image/png');
  assert.equal((await request('image/edit',{prompt:'Edit',image:'invalid!',mimeType:'image/png'})).status,400);
  const tts=await (await request('ugc/generate-voiceover',{text:'বাংলা'})).json();const wav=Buffer.from(tts.audioBase64,'base64');assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.readUInt32LE(24),24000);assert.equal(wav.readUInt32LE(40),4);
  const start=await (await request('veo/generate',{image:'aW1hZ2U=',mimeType:'image/png'})).json();assert.match(start.operationName,/^[a-f0-9-]{36}$/);
  const transition=await (await request('omni',{media:[{data:'aW1hZ2U=',mimeType:'image/png'},{data:'aW1hZ2U=',mimeType:'image/png'}],aspectRatio:'9:16'})).json();assert.ok(transition.jobId);assert.equal(calls.at(-1).config.lastFrame.imageBytes,'aW1hZ2U=');assert.equal(calls.at(-1).config.aspectRatio,'9:16');
  assert.equal((await request('job/'+start.operationName,undefined,{...headers,'x-aura-client-id':'22222222-2222-4222-8222-222222222222'})).status,404);
  assert.equal((await (await request('job/'+start.operationName)).json()).status,'done');
  const originalFetch=global.fetch;let sentKey;
  global.fetch=async(url,init)=>{sentKey=init.headers['x-goog-api-key'];return new Response('real-video',{headers:{'Content-Type':'video/mp4'}});};
  assert.equal(await (await request('veo/download',{operationName:start.operationName})).text(),'real-video');assert.equal(sentKey,'test-key');global.fetch=originalFetch;
  assert.equal((await request('leads/sync',{customerName:'Test',product:'Test'})).status,400);
  assert.equal((await request('leads/sync',{customerName:'Test',phone:'+8801700000000',product:'Test'})).status,200);
  assert.equal((await (await request('leads')).json()).leads.length,1);
  assert.equal((await request('care/initiate-call',{phoneNumber:'+8801700000000'})).status,503);
  assert.equal((await request('upscale',{})).status,400);
  console.log('PASS: health, missing key/session, image validation, WAV encoding, Veo job persistence, first/last frames, owner isolation, download key, leads, unconfigured telephony, export validation. Provider calls mocked; no paid requests or calls placed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
