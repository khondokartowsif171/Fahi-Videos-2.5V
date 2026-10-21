import { handleKotha } from '@/lib/kotha-server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;
type Context = { params: Promise<{ path: string[] }> };
export async function GET(req: Request, context: Context) {
  return handleKotha(req, (await context.params).path);
}
export async function POST(req: Request, context: Context) {
  return handleKotha(req, (await context.params).path);
}
