import { NextResponse } from 'next/server';
import { fetchLiveMcpDirectoryStatus } from '@/lib/mcp-directory-status';

export const runtime = 'nodejs';
export const revalidate = 300;

export async function GET() {
  const status = await fetchLiveMcpDirectoryStatus();
  return NextResponse.json(status, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
