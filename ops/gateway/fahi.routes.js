const http = require('http');
const https = require('https');
const crypto = require('crypto');
const { Transform } = require('stream');
const { gate } = require('../middleware/gate');
const { getClientServices } = require('../config/pgstore');
const core = require('postgres')(process.env.DATABASE_URL,{max:2,prepare:false});

function installFahi(app) {
  const limits=new Map();
  setInterval(()=>{for(const [key,bucket]of limits)if(Date.now()>bucket.until)limits.delete(key);},60000).unref();
  // This route is intentionally mounted BEFORE body parsers: media stays streamed.
  app.use(['/fahi-studio', '/api/fahi', '/fahi-preview'], (req, res, next) => {
    if (process.env.FAHI_PREVIEW_ENABLED !== '1') return res.status(404).json({error:'Studio preview is not enabled.'});
    const savedUrl = req.url;
    // Reuse the established actor/workspace resolver without its legacy static-file exceptions.
    req.url = '/api/fahi/context';
    gate(req, res, async () => {
      try {
      req.url = savedUrl;
      if (!req.clientId || !req.tenant || req.tenant.startsWith('__')) return res.status(403).json({error:'A verified workspace is required.'});
      if (req.headers['x-fahi-workspace'] && req.headers['x-fahi-workspace'] !== req.tenant) return res.status(409).set('x-fahi-workspace-changed','1').json({error:'Workspace changed. Reopen the studio.'});
      if (process.env.FAHI_RELEASE_MODE !== 'live' && !['owner','admin'].includes(req.user.role)) return res.status(403).json({error:'Studio preview is currently available to platform owners and admins.'});
      const cfg=req.clientConfig||{},services=await getClientServices(req.clientId);
      const active=services.some(s=>s.slug==='video-ad-studio'&&['active','trial'].includes(s.status));
      const paused=!active&&services.some(s=>s.slug==='video-ad-studio'&&['paused','cancelled'].includes(s.status));
      const allowed=(Array.isArray(cfg.enabledFeatures)&&cfg.enabledFeatures.includes('veo'))||(!paused&&(['owner','admin'].includes(req.user.role)||active));
      if(!allowed||(Array.isArray(cfg.disabledFeatures)&&cfg.disabledFeatures.includes('veo'))) return res.status(403).json({error:'Fahi vids is not enabled for this workspace. Ask your Aura administrator to enable Video Studio.'});
      const secret = process.env.FAHI_BRIDGE_SECRET;
      if (!secret || secret.length < 32 || !process.env.FAHI_INTERNAL_URL) return res.status(503).json({error:'Studio gateway is not configured.'});
      if (req.originalUrl.split('?')[0] === '/fahi-preview') return res.type('html').send('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>FahiVids · Aura Preview</title></head><body style="margin:0;background:#020617;color:#fff;font:14px system-ui"><header style="height:44px;display:flex;align-items:center;gap:20px;padding:0 16px"><a href="/" style="color:#67e8f9">← Aura Dashboard</a><b>FahiVids Studio · Owner preview</b><span>Live Veo menu is unchanged</span></header><iframe title="FahiVids Studio" src="/fahi-studio/" style="border:0;width:100%;height:calc(100dvh - 44px)" allow="microphone;camera;clipboard-write;autoplay;display-capture;fullscreen" allowfullscreen></iframe></body></html>');
      if (!['GET','HEAD','OPTIONS'].includes(req.method)) {
        const origin = req.headers.origin;
        const expected = new URL(process.env.SELF_URL || 'https://client.auraajenticai.cloud').origin;
        if (origin !== expected) return res.status(403).json({error:'Open this action from your Aura dashboard.'});
        const key=req.tenant+':'+req.user.sub,now=Date.now();let bucket=limits.get(key);
        if(!bucket||bucket.until<now){bucket={count:0,until:now+60000};limits.set(key,bucket);}
        if(++bucket.count>60)return res.status(429).json({error:'Studio request limit reached. Try again in a minute.'});
      }
      const raw = req.originalUrl;
      const prefix = raw.startsWith('/api/fahi') ? '/fahi-studio/api/bridge' : '/fahi-studio';
      const suffix = raw.startsWith('/api/fahi') ? raw.slice('/api/fahi'.length) : raw.slice('/fahi-studio'.length);
      const target = new URL(prefix + suffix, process.env.FAHI_INTERNAL_URL);
      const platformAdmin = ['owner','admin'].includes(req.user.role);
      const subscriptions=raw.startsWith('/api/fahi') ? await core`SELECT s.id,s.service_id AS "serviceId",s.tier_id AS "tierId",s.status,s.started_at AS "startedAt" FROM client_service_subscriptions s JOIN services sv ON sv.id=s.service_id WHERE s.client_id=${req.clientId} AND sv.slug='video-ad-studio' AND s.status IN ('active','trial') ORDER BY s.updated_at DESC LIMIT 2` : [];
      if (subscriptions.length > 1) return res.status(409).json({error:'Multiple active Video Studio subscriptions need administrator review.'});
      const subscription=subscriptions[0] || null;
      const payload = Buffer.from(JSON.stringify({aud:'fahi-studio',tenant:req.tenant,actor:String(req.user.sub || req.user.email),role:platformAdmin?'admin':req.teamRole,name:req.clientName,subscription,exp:Math.floor(Date.now()/1000)+60})).toString('base64url');
      const signature = crypto.createHmac('sha256',secret).update(payload).digest('base64url');
      const headers = {...req.headers,host:target.host,'x-fahi-context':payload+'.'+signature};
      for (const name of Object.keys(headers)) if (/^x-(?:aura|gemini|n8n|fahi)-/.test(name) && name !== 'x-fahi-context') delete headers[name];
      delete headers.cookie; delete headers.authorization; delete headers.connection;
      const maximum=/\/assets(?:\?|$)/.test(raw)?250*1024*1024:112*1024*1024;
      if(Number(req.headers['content-length']||0)>maximum)return res.status(413).json({error:'Studio request is too large.'});
      const upstream = (target.protocol==='https:'?https:http).request(target,{method:req.method,headers,timeout:300000},reply=>{
        res.status(reply.statusCode || 502);
        for (const [key,value] of Object.entries(reply.headers)) if(value!==undefined&&!['connection','transfer-encoding','set-cookie'].includes(key)) res.setHeader(key,value);
        res.setHeader('Cache-Control','private, no-store');
        res.setHeader('Content-Security-Policy',"frame-ancestors 'self'");
        reply.pipe(res);
      });
      upstream.on('timeout',()=>upstream.destroy(new Error('Studio timeout')));
      upstream.on('error',()=>{if(!res.headersSent)res.status(502).json({error:'Studio is temporarily unavailable.'});else res.destroy();});
      req.on('aborted',()=>upstream.destroy());
      let bytes=0;const limiter=new Transform({transform(chunk,_enc,cb){bytes+=chunk.length;cb(bytes>maximum?new Error('Request too large'):null,chunk);}});
      limiter.on('error',()=>{if(!res.headersSent)res.status(413).json({error:'Studio request is too large.'});upstream.destroy();});
      req.pipe(limiter).pipe(upstream);
      } catch(err) { next(err); }
    }).catch(next);
  });
}
module.exports={installFahi};

