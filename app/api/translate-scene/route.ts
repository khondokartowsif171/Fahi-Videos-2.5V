import { handleKotha } from '@/lib/kotha-server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;
export async function POST(req: Request) {
  return handleKotha(req, ['translate-scene']);
}
