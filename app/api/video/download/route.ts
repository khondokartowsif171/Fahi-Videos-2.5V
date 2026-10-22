import {validatePublicMediaUrl as validate} from '@/lib/public-media';
export const dynamic='force-dynamic';
export async function GET(req:Request){
  try{
    let raw=new URL(req.url).searchParams.get('url');if(!raw)return Response.json({error:'Missing media link.'},{status:400});
    let response:Response|undefined;
    for(let n=0;n<5;n++){
      const target=await validate(raw);response=await fetch(target,{redirect:'manual',signal:AbortSignal.timeout(120000)});
      if([301,302,303,307,308].includes(response.status)){await response.body?.cancel();const location=response.headers.get('location');if(!location)throw Error('The media redirect is invalid.');raw=new URL(location,target).href;continue;}break;
    }
    if(!response?.ok||!response.body)return Response.json({error:response?.status===403?'The source denied this download (403). The link may be private or expired.':`Media source is unavailable (${response?.status||502}).`},{status:502});
    const mime=(response.headers.get('content-type')||'').split(';')[0];if(!/^(video|audio)\//.test(mime)){await response.body.cancel();return Response.json({error:'The source returned a page instead of downloadable media.'},{status:422});}
    const limit=250*1024**2;if(Number(response.headers.get('content-length'))>limit){await response.body.cancel();throw Error('Media exceeds the 250 MB download limit.');}
    let bytes=0;const stream=response.body.pipeThrough(new TransformStream({transform(chunk,controller){bytes+=chunk.byteLength;if(bytes>limit)throw Error('Media exceeds download limit.');controller.enqueue(chunk);}}));
    const ext=mime.includes('webm')?'webm':mime.includes('mpeg')?'mp3':mime.startsWith('audio/')?'m4a':'mp4';
    return new Response(stream,{headers:{'Content-Type':mime,'Content-Disposition':`attachment; filename="fahi-media.${ext}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
  }catch(e){return Response.json({error:e instanceof Error?e.message:'Media download failed.'},{status:400});}
}
