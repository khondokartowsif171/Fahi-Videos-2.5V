import { handleAura } from '@/lib/aura-server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
type Context = { params: Promise<{ path: string[] }> };
export async function GET(req: Request, context: Context) { return handleAura(req, (await context.params).path); }
export async function POST(req: Request, context: Context) { return handleAura(req, (await context.params).path); }
