import postgres from 'postgres';
import { randomUUID, randomBytes, createCipheriv, createDecipheriv, createHash } from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { embedded, studioContext } from './studio-context';

let pool: ReturnType<typeof postgres> | undefined;
export function studioDb() {
  if (!pool) {
    if (!process.env.STUDIO_DATABASE_URL) throw new Error('Studio database is unavailable.');
    pool = postgres(process.env.STUDIO_DATABASE_URL,{max:5,prepare:false});
  }
  return pool;
}
const root = () => path.resolve(process.env.STUDIO_MEDIA_DIR || '.studio-media');
const FILE_LIMIT = 250 * 1024 * 1024, TENANT_LIMIT = 1024 ** 3, TOTAL_LIMIT = 10 * 1024 ** 3;
class StudioError extends Error { constructor(public status:number,message:string){super(message);} }
function requireWriter(role:string) { if (!['owner','admin','manager','agent'].includes(role)) throw new StudioError(403,'Workspace editing is not allowed.'); }
function cipherKey() {
  const secret=process.env.STUDIO_VAULT_KEY;
  if (!secret || secret.length<32) throw new StudioError(503,'Studio key vault is not configured.');
  return createHash('sha256').update(secret).digest();
}
export function sealKey(value:string) {
  const iv=randomBytes(12), cipher=createCipheriv('aes-256-gcm',cipherKey(),iv);
  const encrypted=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
  return [iv,cipher.getAuthTag(),encrypted].map(b=>b.toString('base64')).join('.');
}
export function openKey(value:string) {
  const [iv,tag,data]=value.split('.').map(s=>Buffer.from(s,'base64'));
  const cipher=createDecipheriv('aes-256-gcm',cipherKey(),iv);cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(data),cipher.final()]).toString('utf8');
}
export async function studioProviderRequest(req:Request) {
  if (!embedded()) return req;
  const ctx=studioContext(req), sql=studioDb();
  const keys=await sql`SELECT encrypted_key FROM studio_keys WHERE tenant=${ctx.tenant}`;
  const headers=new Headers(req.headers);
  for(const key of ['x-gemini-api-key','x-aura-client-id','x-n8n-webhook-url','x-n8n-api-key']) headers.delete(key);
  if(keys[0]) headers.set('x-gemini-api-key',openKey(keys[0].encrypted_key));
  headers.set('x-aura-client-id',createHash('sha256').update(ctx.tenant).digest('hex'));
  return new Request(req,{headers});
}
export async function saveStudioJob(req:Request,id:string,operation:string) {
  const ctx=studioContext(req); await studioDb()`INSERT INTO studio_jobs(id,tenant,operation,state) VALUES(${id},${ctx.tenant},${operation},'rendering')`;
}
export async function getStudioJob(req:Request,id:string) {
  const ctx=studioContext(req);
  const rows=await studioDb()`SELECT operation,created_at FROM studio_jobs WHERE id=${id} AND tenant=${ctx.tenant}`;
  if(!rows[0]) throw new StudioError(404,'Unknown render job.');
  return {operationName:rows[0].operation,createdAt:new Date(rows[0].created_at).getTime(),owner:ctx.tenant};
}
export async function updateStudioJob(req:Request,id:string,state:string){const ctx=studioContext(req);await studioDb()`UPDATE studio_jobs SET state=${state} WHERE id=${id} AND tenant=${ctx.tenant}`;}
export async function idempotentGeneration(req:Request,run:(req:Request)=>Promise<Response>) {
  if(!embedded()) return run(req);
  const ctx=studioContext(req);requireWriter(ctx.role);
  const requestId=req.headers.get('x-request-id');
  if(!requestId || !/^[a-f0-9-]{36}$/i.test(requestId)) return Response.json({error:'A unique request ID is required.'},{status:400});
  const hash=createHash('sha256').update(new URL(req.url).pathname).update(await req.clone().text()).digest('hex');
  const sql=studioDb();
  const created=await sql`INSERT INTO studio_jobs(id,tenant,request_id,request_hash) VALUES(${randomUUID()},${ctx.tenant},${requestId},${hash}) ON CONFLICT(tenant,request_id) DO NOTHING RETURNING id`;
  if(!created.length) {
    const [job]=await sql`SELECT request_hash,state,result FROM studio_jobs WHERE tenant=${ctx.tenant} AND request_id=${requestId}`;
    if(job.request_hash!==hash) return Response.json({error:'Request ID belongs to different input.'},{status:409});
    if(job.state==='completed') return Response.json(job.result);
    return Response.json({error:'This generation was already submitted. Check its result before starting again.'},{status:409});
  }
  try {
    const response=await run(req);
    const result=await response.clone().json().catch(()=>({}));
    const cacheable=JSON.stringify(result).length<1024*1024;
    await sql`UPDATE studio_jobs SET state=${response.ok?(cacheable?'completed':'delivered'):'failed'},result=${cacheable?sql.json(result):sql.json({delivered:true})} WHERE id=${created[0].id}`;
    return response;
  } catch(err) {await sql`UPDATE studio_jobs SET state='failed' WHERE id=${created[0].id}`;throw err;}
}
function assetPath(tenant:string,id:string) {return path.join(root(),createHash('sha256').update(tenant).digest('hex'),id);}
function uuid(id:string) {if(!/^[a-f0-9-]{36}$/i.test(id)) throw new StudioError(404,'Not found.');return id;}
let lastUploadCleanup=0;
async function cleanupUploads(){
  if(Date.now()-lastUploadCleanup<600000)return;lastUploadCleanup=Date.now();
  const sql=studioDb(),stale=await sql`SELECT id,tenant FROM studio_assets WHERE status='uploading' AND created_at<now()-interval '1 hour'`;
  for(const asset of stale){const file=assetPath(asset.tenant,uuid(asset.id));await fsp.rm(file+'.part',{force:true});await fsp.rm(file,{force:true});await sql`DELETE FROM studio_assets WHERE id=${asset.id} AND status='uploading'`;}
}
export async function studioBridge(req:Request,parts:string[]) {
  try {
    if(!embedded()) throw new StudioError(404,'Embedded studio is disabled.');
    const ctx=studioContext(req),sql=studioDb(),route=parts[0],id=parts[1],url=new URL(req.url);
    if(req.method!=='GET'&&req.method!=='HEAD') requireWriter(ctx.role);
    if(route==='bootstrap') {
      await cleanupUploads();
      const [usage]=await sql`SELECT coalesce(sum(bytes),0)::text AS bytes FROM studio_assets WHERE tenant=${ctx.tenant}`;
      const keys=await sql`SELECT 1 FROM studio_keys WHERE tenant=${ctx.tenant}`;
      return Response.json({tenant:ctx.tenant,actor:ctx.actor,name:ctx.name,role:ctx.role,keyConfigured:!!keys.length,storage:{used:Number(usage.bytes),limit:TENANT_LIMIT,fileLimit:FILE_LIMIT}});
    }
    if(route==='jobs'&&req.method==='GET')return Response.json({jobs:await sql`SELECT id,state,created_at FROM studio_jobs WHERE tenant=${ctx.tenant} AND operation IS NOT NULL ORDER BY created_at DESC LIMIT 30`});
    if(route==='provider') {
      if(!['owner','admin'].includes(ctx.role)) throw new StudioError(403,'Only the workspace owner can manage provider keys.');
      if(req.method==='DELETE') {await sql`DELETE FROM studio_keys WHERE tenant=${ctx.tenant}`;return Response.json({configured:false});}
      if(req.method!=='PUT') throw new StudioError(405,'Method not allowed.');
      const body=await req.json();
      if(typeof body.key!=='string'||body.key.length<16||body.key.length>512) throw new StudioError(400,'Enter a valid provider key.');
      const encrypted=sealKey(body.key.trim());
      await sql`INSERT INTO studio_keys(tenant,encrypted_key) VALUES(${ctx.tenant},${encrypted}) ON CONFLICT(tenant) DO UPDATE SET encrypted_key=excluded.encrypted_key,updated_at=now()`;
      return Response.json({configured:true});
    }
    if(route==='projects') {
      if(req.method==='GET') {
        if(!id) return Response.json({projects:await sql`SELECT id,kind,title,revision,updated_at FROM studio_projects WHERE tenant=${ctx.tenant} ORDER BY updated_at DESC LIMIT 100`});
        const rows=await sql`SELECT * FROM studio_projects WHERE id=${uuid(id)} AND tenant=${ctx.tenant}`;
        if(!rows[0]) throw new StudioError(404,'Project not found.');return Response.json(rows[0]);
      }
      if(req.method!=='PUT') throw new StudioError(405,'Method not allowed.');
      const body=await req.json();
      if(!['editor','aura','kotha','thumbnail'].includes(body.kind)||typeof body.title!=='string'||body.title.length>200||body.document?.version!==1||!Number.isInteger(body.revision)||body.revision<0) throw new StudioError(400,'Invalid project document.');
      if(JSON.stringify(body.document).length>8*1024*1024) throw new StudioError(413,'Project metadata is too large. Save media as assets.');
      const projectId=uuid(id||'');
      let rows;
      if(body.revision===0) rows=await sql`INSERT INTO studio_projects(id,tenant,kind,title,document) VALUES(${projectId},${ctx.tenant},${body.kind},${body.title},${sql.json(body.document)}) ON CONFLICT DO NOTHING RETURNING revision`;
      else rows=await sql`UPDATE studio_projects SET title=${body.title},document=${sql.json(body.document)},revision=revision+1,updated_at=now() WHERE id=${projectId} AND tenant=${ctx.tenant} AND kind=${body.kind} AND revision=${body.revision} RETURNING revision`;
      if(!rows.length) throw new StudioError(409,'Project changed on another device. Reload it or save a new copy.');
      return Response.json({id:projectId,revision:rows[0].revision});
    }
    if(route==='assets'&&req.method==='POST'&&!id) {
      const bytes=Number(req.headers.get('x-file-size')),mime=(req.headers.get('content-type')||'').split(';')[0].trim().toLowerCase(),name=(url.searchParams.get('name')||'media').slice(0,200);
      if(!req.body||!Number.isSafeInteger(bytes)||bytes<=0||bytes>FILE_LIMIT) throw new StudioError(413,'File limit is 250 MB.');
      if(!/^(video\/(mp4|webm|quicktime)|audio\/(mpeg|mp4|wav|x-wav|webm|ogg)|image\/(png|jpeg|webp)|text\/(plain|srt)|application\/(json|x-subrip))$/.test(mime)) throw new StudioError(400,'Unsupported media format.');
      await fsp.mkdir(root(),{recursive:true});
      const disk=await fsp.statfs(root());if(disk.bavail*disk.bsize-bytes<10*1024**3) throw new StudioError(507,'Studio disk reserve reached.');
      const assetId=randomUUID(),file=assetPath(ctx.tenant,assetId);await fsp.mkdir(path.dirname(file),{recursive:true});
      await sql.begin(async tx=>{
        await tx`SELECT pg_advisory_xact_lock(66390122)`;
        const [usage]=await tx`SELECT coalesce(sum(bytes),0)::text AS total,coalesce(sum(bytes) FILTER(WHERE tenant=${ctx.tenant}),0)::text AS own FROM studio_assets`;
        if(Number(usage.own)+bytes>TENANT_LIMIT||Number(usage.total)+bytes>TOTAL_LIMIT) throw new StudioError(413,'Studio storage limit reached.');
        await tx`INSERT INTO studio_assets(id,tenant,name,mime,bytes,status) VALUES(${assetId},${ctx.tenant},${name},${mime},${bytes},'uploading')`;
      });
      let received=0;
      try {
        const limit=new Transform({transform(chunk,_enc,cb){received+=chunk.length;cb(received>bytes?new Error('Upload exceeds declared size.'):null,chunk);}});
        await pipeline(Readable.fromWeb(req.body as never),limit,fs.createWriteStream(file+'.part',{flags:'wx'}));
        if(received!==bytes) throw new StudioError(400,'Upload was incomplete.');
        await fsp.rename(file+'.part',file);
        await sql`UPDATE studio_assets SET status='ready' WHERE id=${assetId} AND tenant=${ctx.tenant}`;
      } catch(err) {await fsp.rm(file+'.part',{force:true});await fsp.rm(file,{force:true});await sql`DELETE FROM studio_assets WHERE id=${assetId} AND tenant=${ctx.tenant}`;throw err;}
      return Response.json({id:assetId,name,mime,bytes});
    }
    if(route==='assets'&&id&&(req.method==='GET'||req.method==='HEAD')) {
      const [asset]=await sql`SELECT * FROM studio_assets WHERE id=${uuid(id)} AND tenant=${ctx.tenant} AND status='ready'`;
      if(!asset) throw new StudioError(404,'Media not found.');
      const size=Number(asset.bytes),range=req.headers.get('range');let start=0,end=size-1,status=200;
      const headers:Record<string,string>={'Content-Type':asset.mime,'Accept-Ranges':'bytes','Cache-Control':'private, no-store','Content-Disposition':`inline; filename*=UTF-8''${encodeURIComponent(asset.name)}`};
      if(range){const match=/^bytes=(\d*)-(\d*)$/.exec(range);if(!match||(!match[1]&&!match[2])) return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
        if(!match[1]){start=Math.max(0,size-Number(match[2]));}else {start=Number(match[1]);end=match[2]?Math.min(size-1,Number(match[2])):size-1;}
        if(start>end||start>=size) return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
        status=206;headers['Content-Range']=`bytes ${start}-${end}/${size}`;
      }
      headers['Content-Length']=String(end-start+1);
      const stream=req.method==='HEAD'?null:Readable.toWeb(fs.createReadStream(assetPath(ctx.tenant,id),{start,end}));
      return new Response(stream as ReadableStream|null,{status,headers});
    }
    throw new StudioError(404,'Unknown studio endpoint.');
  } catch(err) { const e=err as Error & {status?:number};return Response.json({error:e.status?e.message:'Studio request failed. Your cloud data was not changed.'},{status:e.status||503}); }
}
