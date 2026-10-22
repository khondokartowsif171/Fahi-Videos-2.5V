const express=require('express');
const app=express();
app.disable('x-powered-by');app.set('trust proxy',true);
app.get('/health',(_req,res)=>res.json({ok:true,service:'fahi-preview-gateway'}));
require('../src/routes/fahi.routes').installFahi(app);
app.use((_req,res)=>res.status(404).json({error:'Not found'}));
app.use((_err,_req,res,_next)=>res.status(503).json({error:'Studio gateway is unavailable.'}));
app.listen(3000,'0.0.0.0');
