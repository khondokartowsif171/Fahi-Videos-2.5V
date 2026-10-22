// Isolated contract checks against the running embedded service. No provider calls.
require('../tests/register-typescript.cjs');
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs/promises'),path=require('node:path');
const {studioDb,idempotentGeneration}=require('../lib/studio-server.ts');
const sql=studioDb(),prefix='studio-qa-'+crypto.randomUUID(),a=prefix+'-a',b=prefix+'-b';
function headers(tenant=a,role='owner'){const body=Buffer.from(JSON.stringify({aud:'fahi-studio',tenant,actor:'isolated-test-actor',role,name:'Isolated contract test',exp:Math.floor(Date.now()/1000)+60})).toString('base64url');return {'x-fahi-context':body+'.'+crypto.createHmac('sha256',process.env.FAHI_BRIDGE_SECRET).update(body).digest('base64url')};}
function request(endpoint,method='GET',body,tenant=a,extra={}){return fetch('http://127.0.0.1:3000/fahi-studio/api/bridge/'+endpoint,{method,headers:{...headers(tenant),...(body&&!(body instanceof Buffer)?{'Content-Type':'application/json'}:{}),...extra},...(body?{body:body instanceof Buffer?body:JSON.stringify(body)}:{})});}
(async()=>{
 try {
  assert.equal((await fetch('http://127.0.0.1:3000/fahi-studio/api/bridge/bootstrap')).status,401);
  assert.equal((await request('bootstrap')).status,200);
  const id=crypto.randomUUID(),body={kind:'editor',title:'Isolated QA project',revision:0,document:{version:1,kind:'editor',state:{clips:[]}}};
  let response=await request('projects/'+id,'PUT',body);assert.equal(response.status,200,await response.text());
  assert.equal((await request('projects/'+id,'GET',undefined,b)).status,404);
  assert.equal((await request('projects/'+id,'PUT',body)).status,409);
  assert.equal((await request('projects/'+id,'PUT',{...body,revision:1})).status,200);
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aP2kAAAAASUVORK5CYII=','base64');
  response=await request('assets?name=qa.png','POST',png,a,{'Content-Type':'image/png','x-file-size':String(png.length)});assert.equal(response.status,200,await response.clone().text());const asset=await response.json();
  response=await request('assets/'+asset.id,'GET',undefined,a,{range:'bytes=0-9'});assert.equal(response.status,206);assert.equal((await response.arrayBuffer()).byteLength,10);
  assert.equal((await request('assets/'+asset.id,'GET',undefined,b)).status,404);
  assert.equal((await request('assets/'+asset.id,'GET',undefined,a,{range:'bytes=999999-'})).status,416);
  assert.equal((await request('assets','POST',png,a,{'Content-Type':'image/png','x-file-size':String(251*1024*1024)})).status,413);
  const reserved=crypto.randomUUID();await sql`INSERT INTO studio_assets(id,tenant,name,mime,bytes,status) VALUES(${reserved},${a},'isolated quota reservation','image/png',${1024**3},'uploading')`;
  assert.equal((await request('assets','POST',png,a,{'Content-Type':'image/png','x-file-size':String(png.length)})).status,413);
  await sql`DELETE FROM studio_assets WHERE id=${reserved} AND tenant=${a}`;
  assert.equal((await request('provider','PUT',{key:'isolated-test-provider-value'})).status,200);
  const [key]=await sql`SELECT encrypted_key FROM studio_keys WHERE tenant=${a}`;assert.ok(!key.encrypted_key.includes('isolated-test-provider-value'));
  assert.equal((await(await request('bootstrap','GET',undefined,b)).json()).keyConfigured,false);
  assert.equal((await fetch('http://127.0.0.1:3000/fahi-studio/api/bridge/provider',{method:'DELETE',headers:headers(a,'agent')})).status,403);
  assert.equal((await request('provider','DELETE')).status,200);
  const requestId=crypto.randomUUID();let runs=0;
  const generation=()=>new Request('http://test/api/aura/veo/generate',{method:'POST',headers:{...headers(a),'x-request-id':requestId},body:'{"test":true}'});
  const mock=async()=>{runs++;return Response.json({jobId:'isolated-mock-job'});};
  await idempotentGeneration(generation(),mock);await idempotentGeneration(generation(),mock);assert.equal(runs,1);
  const [role]=await sql`SELECT rolsuper,rolcreatedb,rolcreaterole,rolbypassrls FROM pg_roles WHERE rolname=current_user`;assert.ok(Object.values(role).every(v=>v===false));
  console.log('PASS: unauthenticated denial; two-tenant project/media/key isolation; revision conflicts; Range/416; size/quota limits; encrypted keys; agent key-management denial; idempotency; restricted runtime role. No provider requests.');
 } finally {
  for(const tenant of [a,b]){
   await sql`DELETE FROM studio_projects WHERE tenant=${tenant}`;await sql`DELETE FROM studio_assets WHERE tenant=${tenant}`;await sql`DELETE FROM studio_keys WHERE tenant=${tenant}`;await sql`DELETE FROM studio_jobs WHERE tenant=${tenant}`;
   await fs.rm(path.join(process.env.STUDIO_MEDIA_DIR,crypto.createHash('sha256').update(tenant).digest('hex')),{recursive:true,force:true});
  }
  await sql.end();
 }
})().catch(e=>{console.error(e.message);process.exitCode=1;});
