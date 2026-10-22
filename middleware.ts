import { NextRequest, NextResponse } from 'next/server';

// Embedded services accept only short-lived contexts signed by the dashboard gateway.
// The standalone deployment retains its existing behavior.
export async function middleware(req: NextRequest) {
  if (process.env.FAHI_EMBEDDED !== '1') return NextResponse.next();
  const control=req.nextUrl.pathname.endsWith('/api/control');
  const secret = control?process.env.FAHI_CONTROL_SECRET:process.env.FAHI_BRIDGE_SECRET;
  const token = req.headers.get(control?'x-fahi-control':'x-fahi-context') || '';
  try {
    if (!secret || secret.length < 32) throw Error();
    const [body, sig, extra] = token.split('.');
    if (extra || !body || !sig) throw Error();
    const decode = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), {name:'HMAC',hash:'SHA-256'}, false, ['verify']);
    if (!await crypto.subtle.verify('HMAC', key, decode(sig), new TextEncoder().encode(body))) throw Error();
    const ctx = JSON.parse(new TextDecoder().decode(decode(body)));
    if (ctx.aud !== (control?'fahi-control':'fahi-studio') || (!control&&!ctx.tenant) || !ctx.actor || ctx.exp < Date.now()/1000 || ctx.exp > Date.now()/1000+120) throw Error();
    if (/\/api\/(?:elevenlabs|gemini\/video)|\/api\/aura\/(?:care|leads|webhook)/.test(req.nextUrl.pathname)) return NextResponse.json({error:'This service is not available in the creative preview.'},{status:403});
    return NextResponse.next();
  } catch { return NextResponse.json({error:'Open this studio from your authenticated Aura dashboard.'},{status:401}); }
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
