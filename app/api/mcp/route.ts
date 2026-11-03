import { handleMcpHttp } from '@/lib/mcp-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: Request) {
  return handleMcpHttp(req);
}

export async function POST(req: Request) {
  return handleMcpHttp(req);
}

export async function OPTIONS(req: Request) {
  return handleMcpHttp(req);
}
