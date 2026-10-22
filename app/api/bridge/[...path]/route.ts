import { studioBridge } from '@/lib/studio-server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=300;
type Context={params:Promise<{path:string[]}>};
async function handler(req:Request,ctx:Context){return studioBridge(req,(await ctx.params).path);}
export {handler as GET,handler as PUT,handler as POST,handler as DELETE,handler as HEAD};
