require('./register-typescript.cjs');
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {studioContext}=require('../lib/studio-context.ts');
const {sealKey,openKey}=require('../lib/studio-server.ts');
process.env.FAHI_BRIDGE_SECRET=crypto.randomBytes(32).toString('hex');
process.env.STUDIO_VAULT_KEY=crypto.randomBytes(32).toString('hex');
function request(overrides={},bad=false){const body=Buffer.from(JSON.stringify({aud:'fahi-studio',tenant:'test-workspace',actor:'test-actor',role:'owner',exp:Math.floor(Date.now()/1000)+60,...overrides})).toString('base64url');const sig=crypto.createHmac('sha256',process.env.FAHI_BRIDGE_SECRET).update(body).digest('base64url');return new Request('http://studio.test',{headers:{'x-fahi-context':body+'.'+(bad?'x'.repeat(43):sig)}});}
assert.equal(studioContext(request()).tenant,'test-workspace');
assert.throws(()=>studioContext(request({},true)));
assert.throws(()=>studioContext(request({exp:1})));
assert.throws(()=>studioContext(request({aud:'another-service'})));
assert.throws(()=>studioContext(request({exp:Math.floor(Date.now()/1000)+300})));
const encrypted=sealKey('test-provider-key-value');assert.equal(openKey(encrypted),'test-provider-key-value');assert.notEqual(encrypted,sealKey('test-provider-key-value'));assert.ok(!encrypted.includes('test-provider'));
delete process.env.STUDIO_VAULT_KEY;assert.throws(()=>sealKey('test-key'));
console.log('PASS: valid context, forged signature, expiry, audience, excessive lifetime, authenticated encryption and missing-vault failure.');
