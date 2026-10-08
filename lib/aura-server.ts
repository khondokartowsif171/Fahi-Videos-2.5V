import { GoogleGenAI, GenerateVideosOperation } from '@google/genai';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const dataDir = () => path.resolve(process.env.AURA_DATA_DIR || '.aura-data');
class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
type Job = { owner: string; operationName: string; createdAt: number };
function read<T>(name: string, fallback?: T): T {
  try { return JSON.parse(fs.readFileSync(path.join(dataDir(), name), 'utf8')); }
  catch { if (fallback !== undefined) return fallback; throw new ApiError(404, 'Render job not found or expired.'); }
}
function write(name: string, value: unknown) {
  fs.mkdirSync(dataDir(), { recursive: true });
  const file = path.join(dataDir(), name), temp = file + '.' + randomUUID();
  fs.writeFileSync(temp, JSON.stringify(value)); fs.renameSync(temp, file);
}
function required(value: unknown, name: string, max = 10000): string {
  if (typeof value !== 'string' || !value.trim()) throw new ApiError(400, `${name} is required.`);
  if (value.length > max) throw new ApiError(413, `${name} is too large.`);
  return value.trim();
}
function media(value: unknown, mimeType: unknown, kind: 'image' | 'video' = 'image') {
  const bytes = required(value, kind, kind === 'image' ? 20_000_000 : 100_000_000).replace(/^data:[^;]+;base64,/, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(bytes)) throw new ApiError(400, 'Invalid media encoding.');
  const mime = typeof mimeType === 'string' ? mimeType : `${kind}/${kind === 'image' ? 'png' : 'mp4'}`;
  if (!(kind === 'image' ? ['image/png','image/jpeg','image/webp'] : ['video/mp4','video/webm']).includes(mime)) throw new ApiError(400, 'Unsupported media format.');
  return kind === 'image' ? { imageBytes: bytes, mimeType: mime } : { videoBytes: bytes, mimeType: mime };
}
function owner(req: Request, key: string) {
  const id = req.headers.get('x-aura-client-id');
  if (!id || !/^[a-zA-Z0-9-]{16,64}$/.test(id)) throw new ApiError(400, 'Missing studio session. Refresh and try again.');
  return createHash('sha256').update(id + ':' + key).digest('hex');
}
function keyFor(req: Request) { return req.headers.get('x-gemini-api-key') || process.env.GEMINI_API_KEY || ''; }
function aiFor(key: string) {
  if (!key) throw new ApiError(503, 'Add a Gemini API key in Fahi Videos API Settings, or set GEMINI_API_KEY on the server. Video generation requires a billing-enabled key.');
  return new GoogleGenAI({ apiKey: key, httpOptions: { timeout: 120000 } });
}
function getJob(id: string, own: string) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new ApiError(404, 'Unknown render job.');
  const job = read<Job>(`job-${id}.json`);
  if (job.owner !== own) throw new ApiError(404, 'Unknown render job.');
  if (Date.now() - job.createdAt > 48 * 3600_000) throw new ApiError(410, 'Render job expired. Generate a new video.');
  return job;
}
function saveJob(operationName: string | undefined, own: string) {
  if (!operationName) throw new ApiError(502, 'Video provider did not return a render operation.');
  const id = randomUUID(); write(`job-${id}.json`, { owner: own, operationName, createdAt: Date.now() }); return id;
}
async function operation(ai: GoogleGenAI, job: Job) {
  const op = new GenerateVideosOperation(); op.name = job.operationName;
  return ai.operations.getVideosOperation({ operation: op });
}
async function download(ai: GoogleGenAI, job: Job, key: string) {
  const op = await operation(ai, job);
  if (op.error) throw new ApiError(502, String(op.error.message || 'Video generation failed.'));
  if (!op.done) throw new ApiError(409, 'Video is still rendering.');
  const video = op.response?.generatedVideos?.[0]?.video;
  if (video?.videoBytes) return new Response(Buffer.from(video.videoBytes, 'base64'), { headers: { 'Content-Type': 'video/mp4' } });
  const uri = video?.uri;
  if (!uri) throw new ApiError(502, 'The provider returned no video. The prompt may have been filtered.');
  const url = new URL(uri);
  if (url.protocol !== 'https:' || url.hostname !== 'generativelanguage.googleapis.com') throw new ApiError(502, 'Unexpected video download host.');
  const result = await fetch(url, { headers: { 'x-goog-api-key': key }, redirect: 'error', signal: AbortSignal.timeout(120000) });
  if (!result.ok) throw new ApiError(502, `Video download failed (${result.status}).`);
  return new Response(result.body, { headers: { 'Content-Type': 'video/mp4', 'Content-Disposition': 'attachment; filename="aura-video.mp4"' } });
}
function wav(pcm: Buffer) {
  const header = Buffer.alloc(44); header.write('RIFF'); header.writeUInt32LE(36 + pcm.length,4); header.write('WAVE',8);
  header.write('fmt ',12); header.writeUInt32LE(16,16); header.writeUInt16LE(1,20); header.writeUInt16LE(1,22);
  header.writeUInt32LE(24000,24); header.writeUInt32LE(48000,28); header.writeUInt16LE(2,32); header.writeUInt16LE(16,34);
  header.write('data',36); header.writeUInt32LE(pcm.length,40); return Buffer.concat([header,pcm]);
}
async function encode(video: string, audio?: string, upscale?: string) {
  fs.mkdirSync(dataDir(), { recursive:true });
  const folder = fs.mkdtempSync(path.join(dataDir(), 'export-'));
  try {
    const input = path.join(folder,'input.mp4'), output = path.join(folder,'output.mp4');
    fs.writeFileSync(input, Buffer.from(video,'base64'));
    const args = ['-y','-i',input];
    if (audio) { const track = path.join(folder,'voice.wav'); fs.writeFileSync(track,Buffer.from(audio,'base64')); args.push('-i',track,'-map','0:v:0','-map','1:a:0','-af','apad'); }
    if (upscale) args.push('-vf',`scale=-2:${upscale === '4k' ? 2160 : 1080}:flags=lanczos`);
    args.push('-c:v',upscale ? 'libx264' : 'copy','-c:a','aac','-shortest','-movflags','+faststart',output);
    await new Promise<void>((resolve,reject) => {
      const proc = spawn(process.env.FFMPEG_PATH || 'ffmpeg', args, { windowsHide: true });
      let stderr = ''; const timer = setTimeout(()=> { proc.kill(); reject(new ApiError(504,'Video export timed out.')); },180000);
      proc.stderr.on('data', d => { stderr = (stderr + d).slice(-2000); });
      proc.on('error',()=> {clearTimeout(timer); reject(new ApiError(503,'FFmpeg is required for voiceover export and resizing. Install FFmpeg or configure FFMPEG_PATH.')); });
      proc.on('close',code=> {clearTimeout(timer); code === 0 ? resolve() : reject(new ApiError(422,'Unable to process this video or audio.')); });
    });
    return new Response(fs.readFileSync(output), { headers: { 'Content-Type':'video/mp4','Content-Disposition':'attachment; filename="aura-studio.mp4"' } });
  } finally { fs.rmSync(folder,{recursive:true,force:true}); }
}
type Lead = { id:string; customerName:string; phone:string; product:string; notes:string; status:string; timestamp:string };
const limits = new Map<string, { count:number; since:number }>();
export async function handleAura(req: Request, parts: string[]) {
  try {
    const route = parts.join('/'), key = keyFor(req);
    if (route === 'health') return Response.json({ status:'ok', geminiConfigured: !!key, timestamp:new Date().toISOString() });
    const own = owner(req,key);
    if (req.method === 'POST') {
      const bucket = limits.get(own); const now = Date.now();
      if (!bucket || now-bucket.since > 60000) limits.set(own,{count:1,since:now});
      else if (++bucket.count > 20) throw new ApiError(429,'Too many studio requests. Try again in a minute.');
    }
    const raw = req.method === 'POST' ? await req.text() : '{}';
    if (raw.length > 110_000_000) throw new ApiError(413,'Upload is too large.');
    let body: Record<string, any>;
    try { body = JSON.parse(raw); } catch { throw new ApiError(400,'Invalid JSON request.'); }
    if (!body || Array.isArray(body) || typeof body !== 'object') throw new ApiError(400,'Invalid request body.');
    if (route === 'export' && req.method === 'POST') return await encode(required(body.video,'Video',100_000_000),body.audio ? required(body.audio,'Audio',30_000_000) : undefined);
    if (route === 'upscale' && req.method === 'POST') return await encode(required(body.video,'Video',100_000_000),undefined,body.target === '4k' ? '4k' : '1080p');
    if (route === 'leads' && req.method === 'GET') {
      const leads = read<Lead[]>(`leads-${own}.json`,[]);
      return Response.json({leads,stats:{activeCalls:leads.filter(l=>l.status==='in-progress').length,ordersTaken:leads.filter(l=>l.status==='completed').length,pendingLeads:leads.filter(l=>l.status==='pending').length}});
    }
    if ((route === 'leads/sync' || route === 'webhook/sync-lead') && req.method === 'POST') {
      const lead:Lead = {id:randomUUID(),customerName:required(body.customerName || body.name,'Customer name',200),phone:required(body.phone,'Phone',30),product:required(body.product,'Product',300),notes:String(body.notes || '').slice(0,2000),status:'pending',timestamp:new Date().toISOString()};
      if (!/^\+[1-9]\d{7,14}$/.test(lead.phone)) throw new ApiError(400,'Use an international phone number such as +88017…');
      const leads = [lead,...read<Lead[]>(`leads-${own}.json`,[])].slice(0,1000); write(`leads-${own}.json`,leads);
      return Response.json({success:true,lead,total:leads.length});
    }
    if (route.startsWith('care/') && req.method === 'POST') return await care(body,route,own);
    const ai = aiFor(key);
    if (route.startsWith('job/') && req.method === 'GET') {
      const job = getJob(parts[1],own);
      if (parts[2] === 'result') return await download(ai,job,key);
      const op = await operation(ai,job);
      return Response.json({status:op.error ? 'error' : op.done ? 'done' : 'pending',error:op.error?.message});
    }
    if (req.method !== 'POST') throw new ApiError(405,'Method not allowed.');
    if (route === 'veo/status' || route === 'veo/download') {
      const job = getJob(required(body.operationName,'Render ID'),own);
      if (route === 'veo/download') return await download(ai,job,key);
      const op = await operation(ai,job); return Response.json({done:op.done,error:op.error});
    }
    if (route === 'veo/generate' || route === 'omni') {
      const ratio = body.aspectRatio === '9:16' ? '9:16' : '16:9';
      const config:any = {numberOfVideos:1,resolution:'720p',aspectRatio:ratio};
      const payload:any = {model:process.env.AURA_VIDEO_MODEL || 'veo-3.1-generate-preview',prompt:body.prompt || 'Natural cinematic movement with consistent subjects and realistic physics.',config};
      if (route === 'veo/generate') payload.image = media(body.image,body.mimeType);
      else if (body.mode === 'extend') { payload.video = media(body.video,body.mimeType,'video'); delete config.aspectRatio; }
      else {
        if (!Array.isArray(body.media) || body.media.length !== 2) throw new ApiError(400,'Two keyframe images are required.');
        payload.image = media(body.media[0].data,body.media[0].mimeType); config.lastFrame = media(body.media[1].data,body.media[1].mimeType);
        if (body.references?.length) {
          const response = await ai.models.generateContent({model:process.env.AURA_TEXT_MODEL || 'gemini-2.5-flash',contents:{parts:[{text:'Describe only the visual style, colors, lighting and camera treatment of these references in 70 words.'},...body.references.slice(0,3).map((r:any)=>({inlineData:{data:required(r.data,'Reference',20_000_000),mimeType:r.mimeType}}))]}});
          payload.prompt += '\nStyle guidance: ' + response.text;
        }
      }
      const op = await ai.models.generateVideos(payload); const jobId = saveJob(op.name,own);
      return Response.json(route === 'veo/generate' ? {operationName:jobId} : {jobId});
    }
    if (['image/generate','generate-image','image/edit'].includes(route)) {
      const prompt = required(body.prompt,'Prompt');
      const input:any[] = [{text:prompt}];
      if (route === 'image/edit') { const image:any = media(body.image,body.mimeType); input.unshift({inlineData:{data:image.imageBytes,mimeType:image.mimeType}}); }
      const result = await ai.models.generateContent({model:process.env.AURA_IMAGE_MODEL || 'gemini-3.1-flash-image-preview',contents:{parts:input},config:{responseModalities:['TEXT','IMAGE'],imageConfig:{aspectRatio:['16:9','9:16','1:1','4:3','3:4'].includes(body.aspectRatio) ? body.aspectRatio : '16:9'}}});
      const image = result.candidates?.[0]?.content?.parts?.find(p=>p.inlineData?.mimeType?.startsWith('image/'))?.inlineData;
      if (!image?.data) throw new ApiError(502,result.text || 'No image was returned.');
      const url = `data:${image.mimeType};base64,${image.data}`; return Response.json({url,imageUrl:url,data:image.data,mimeType:image.mimeType});
    }
    if (route === 'ugc/generate-voiceover') {
      const text = required(body.text,'Voiceover script',5000);
      const response = await ai.models.generateContent({model:process.env.AURA_TTS_MODEL || 'gemini-2.5-flash-preview-tts',contents:text,config:{responseModalities:['AUDIO'],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:body.voiceName || 'Puck'}}}}});
      const audio = response.candidates?.[0]?.content?.parts?.find(p=>p.inlineData?.data)?.inlineData;
      if (!audio?.data) throw new ApiError(502,'No voiceover audio returned.');
      const bytes = Buffer.from(audio.data,'base64'); const out = audio.mimeType?.includes('wav') ? bytes : wav(bytes);
      return Response.json({audioBase64:out.toString('base64'),mimeType:'audio/wav'});
    }
    if (['director/chat','flow/enhance-prompt','ugc/generate-script'].includes(route)) {
      let instruction = '', contents:any;
      if (route === 'director/chat') {
        instruction = 'You are Aura Studio AI Director. Give concise cinematic shot, lighting, camera movement and transition advice. Include practical copy-ready prompts when useful.';
        contents = [...(Array.isArray(body.history) ? body.history.slice(-8).filter((h:any)=>typeof h.text === 'string').map((h:any)=>({role:h.role==='user'?'user':'model',parts:[{text:h.text.slice(0,10000)}]})) : []),{role:'user',parts:[{text:required(body.message,'Message')}]}];
      } else if (route === 'flow/enhance-prompt') {
        instruction = 'Return only a polished cinematic video prompt, 25-80 words. Incorporate the supplied camera, lens, lighting and pacing. Preserve the concept.';
        contents = JSON.stringify({prompt:required(body.prompt,'Prompt'),camera:body.camera,lens:body.lens,lighting:body.lighting,motionSpeed:body.motionSpeed});
      } else {
        instruction = 'Write authentic Bangladeshi UGC for the requested topic and tone. Return JSON with videoPrompt (English cinematic video direction), voiceoverScript (30-45 words of conversational Bengali), englishTranslation.';
        contents = JSON.stringify({topic:required(body.topic,'Topic'),tone:body.tone,dialect:body.dialect});
      }
      const result = await ai.models.generateContent({model:process.env.AURA_TEXT_MODEL || 'gemini-2.5-flash',contents,config:{systemInstruction:instruction,...(route==='ugc/generate-script'?{responseMimeType:'application/json'}:{})}});
      return Response.json(route === 'ugc/generate-script' ? JSON.parse(result.text || '{}') : route === 'director/chat' ? {reply:result.text} : {enhancedPrompt:result.text});
    }
    throw new ApiError(404,'Unknown studio endpoint.');
  } catch (err:any) {
    const message = String(err.message || 'Studio request failed.');
    const status = err instanceof ApiError ? err.status : /429|quota|RESOURCE_EXHAUSTED/i.test(message) ? 429 : /api.key|unauthorized|401/i.test(message) ? 401 : 502;
    return Response.json({error:message.replace(/AIza[\w-]+/g,'[redacted]')},{status});
  }
}
async function care(body:Record<string,any>,route:string,own:string) {
  const sid = process.env.TWILIO_ACCOUNT_SID, token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token || !process.env.TWILIO_PHONE_NUMBER || !process.env.TWILIO_VOICE_WEBHOOK_URL) throw new ApiError(503,'Configure Twilio credentials, phone number and your deployed TWILIO_VOICE_WEBHOOK_URL before placing calls.');
  let url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`, method = 'POST', form = new URLSearchParams();
  if (route === 'care/initiate-call') {
    const phone = required(body.phoneNumber,'Phone',30); if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new ApiError(400,'Enter an international phone number beginning with +.');
    form = new URLSearchParams({To:phone,From:process.env.TWILIO_PHONE_NUMBER,Url:process.env.TWILIO_VOICE_WEBHOOK_URL});
  } else {
    const callSid = required(body.callSid,'Call ID'); if (!/^CA[a-f0-9]{32}$/.test(callSid)) throw new ApiError(400,'Invalid call ID.');
    const record = read<{owner:string}>(`call-${callSid}.json`); if (record.owner !== own) throw new ApiError(404,'Unknown call.');
    url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls/${callSid}.json`;
    if (route === 'care/end-call') form.set('Status','completed'); else if (route === 'care/status') method = 'GET'; else throw new ApiError(404,'Unknown call action.');
  }
  const result = await fetch(url,{method,headers:{Authorization:'Basic '+Buffer.from(sid+':'+token).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},...(method==='POST'?{body:form.toString()}:{}),signal:AbortSignal.timeout(20000)});
  const call = await result.json(); if (!result.ok) throw new ApiError(502,call.message || 'Twilio request failed.');
  if (route === 'care/initiate-call') write(`call-${call.sid}.json`,{owner:own});
  return Response.json({success:true,callSid:call.sid,status:call.status});
}
