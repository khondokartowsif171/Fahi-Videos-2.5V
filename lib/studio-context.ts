import { createHmac, timingSafeEqual } from 'node:crypto';

export const embedded = () => process.env.FAHI_EMBEDDED === '1';
export type StudioContext = { tenant: string; actor: string; role: string; name: string; exp: number };
export function studioContext(req: Request): StudioContext {
  const secret = process.env.FAHI_BRIDGE_SECRET;
  if (!secret || secret.length < 32) throw new Error('Studio bridge is not configured.');
  const token = req.headers.get('x-fahi-context') || '';
  const [body, signature, extra] = token.split('.');
  const expected = createHmac('sha256', secret).update(body || '').digest('base64url');
  if (extra || !signature || signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error('Unauthorized studio request.');
  const value = JSON.parse(Buffer.from(body, 'base64url').toString()) as StudioContext & { aud: string };
  if (value.aud !== 'fahi-studio' || value.exp < Date.now() / 1000 || value.exp > Date.now() / 1000 + 120 || !value.tenant || !value.actor) throw new Error('Expired studio request.');
  return value;
}
