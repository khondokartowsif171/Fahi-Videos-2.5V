// Run only against an explicitly selected disposable database, without a worker.
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const url=new URL(process.env.STUDIO_DATABASE_URL);if(url.pathname!=='/aura_fahi_managed_qa')throw Error('Refusing to run outside the disposable managed QA database.');
process.env.GOOGLE_CLOUD_PROJECT ||= 'managed-video-qa-fixture';
const m=require('../lib/managed-video.cjs'),sql=m.db(),id=()=>crypto.randomUUID();
const credential=id(),service=id(),ctx={tenant:'managed-qa-a',actor:'qa-actor',role:'owner',subscription:{id:id(),serviceId:service,status:'active',startedAt:new Date('2026-10-01T00:00:00.000Z')}},other={...ctx,tenant:'managed-qa-b'};
const request=(body)=>new Request('http://qa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
(async()=>{try{
 assert.deepEqual(m.shots(20),[8,8,4]);for(let n=4;n<=30;n++){const shots=m.shots(n);assert.equal(shots.reduce((a,b)=>a+b,0),n);assert(shots.every(s=>s>=3&&s<=8));}
 await sql`INSERT INTO managed_credentials(id,encrypted_key) VALUES(${credential},${m.seal('disposable-test-value')})`;
 const pilotId=id(),pilotAsset=id(),project=process.env.GOOGLE_CLOUD_PROJECT,location=process.env.GOOGLE_CLOUD_LOCATION||'global';
 await sql`INSERT INTO managed_jobs(id,tenant,actor,cycle,request_id,request_hash,state,input,policy,credential_id,reserve_usd,reserved_bytes,asset_id) VALUES(${pilotId},'__omni_pilot__','qa-admin',${m.cycle().key},${id()},'qa-pilot-fixture','completed',${sql.json({prompt:'fixture',duration:20,shots:[8,8,4]})},${sql.json({model:m.MODEL,provider:'vertex',vertexProject:project,vertexLocation:location})},NULL,0,0,${pilotAsset})`;
 await sql`INSERT INTO managed_provider(id,config) VALUES(1,${sql.json({enabled:true,daily:100,monthly:100,pilotAcceptedJobId:pilotId,accessCheck:{available:true,model:m.MODEL,project,location},outputRate:.10136,inputRate:1.5})})`;
 await m.control(request({action:'policy',scope:'service:'+service,enabled:true,count:3,duration:20,budget:20,reason:'QA policy fixture',requestId:id()}),'qa-admin');
 assert.equal((await m.allowance(ctx)).remaining,3);
 const input={prompt:'Disposable quota test. No provider call.',duration:8},first=await m.submit(ctx,input,id());
 await sql`UPDATE managed_jobs SET state='completed',reserved_bytes=0 WHERE id=${first.id}`;
 const second=await m.submit(ctx,input,id());await sql`UPDATE managed_jobs SET state='completed',reserved_bytes=0 WHERE id=${second.id}`;
 const parallel=await Promise.allSettled([m.submit(ctx,input,id()),m.submit(ctx,input,id())]);assert.equal(parallel.filter(r=>r.status==='fulfilled').length,1);assert.equal(parallel.filter(r=>r.status==='rejected')[0].reason.status,409);
 const last=parallel.find(r=>r.status==='fulfilled').value;const [row]=await sql`SELECT request_id FROM managed_jobs WHERE id=${last.id}`;
 assert.equal((await m.submit(ctx,input,row.request_id)).reused,true);await assert.rejects(()=>m.submit(ctx,{...input,prompt:'changed'},row.request_id),e=>e.status===409);
 const get=new Request('http://qa');assert.equal((await m.publicApi(get,other,['jobs',last.id])).status,404);assert.equal((await m.publicApi(request(input),{...ctx,role:'viewer'},['jobs'])).status,403);
 await sql`UPDATE managed_jobs SET state='failed',reserved_bytes=0 WHERE id=${last.id}`;assert.equal((await m.allowance(ctx)).remaining,1);
 await m.control(request({action:'policy',scope:'service:'+service,enabled:true,count:2,duration:20,budget:20,reason:'QA downgrade fixture',requestId:id()}),'qa-admin');assert.equal((await m.allowance(ctx)).total,3);
 await m.control(request({action:'policy',scope:'service:'+service,enabled:true,count:5,duration:20,budget:20,reason:'QA upgrade fixture',requestId:id()}),'qa-admin');assert.equal((await m.allowance(ctx)).total,5);
 assert.equal((await m.allowance({...ctx,subscription:undefined})).total,0);
 const [encrypted]=await sql`SELECT encrypted_key FROM managed_credentials WHERE id=${credential}`;assert(!encrypted.encrypted_key.includes('disposable-test-value'));assert.equal(m.open(encrypted.encrypted_key),'disposable-test-value');
 assert.equal(m.cycle(new Date('2026-12-31T23:59:59Z')).key,'2026-12');assert.equal(m.cycle(new Date('2027-01-01T00:00:00Z')).key,'2027-01');
 console.log('PASS: 4–30s storyboard partition; concurrent final-slot exclusion; idempotent replay/input conflict; cross-tenant job denial; viewer denial; failure refund; upgrade/current and downgrade/next-cycle policy; unassigned package blocked; vault encryption; UTC pilot cycle and anchored subscription-cycle boundary. No provider requests.');
 }finally{await sql.end();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
