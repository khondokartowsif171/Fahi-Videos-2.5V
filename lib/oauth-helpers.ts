export interface ParsedOAuthCallback {
  kind: 'none' | 'pkce' | 'implicit' | 'error';
  code?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  errorCode?: string;
  errorMessage?: string;
  cleanUrl: string;
}

export interface NormalizedOAuthUser {
  id: string;
  email: string;
  name: string;
  accessToken: string;
  refreshToken?: string;
  avatarUrl?: string;
  provider: 'supabase' | 'admin';
  authMethod: 'google' | 'email';
}

const OAUTH_QUERY_KEYS = [
  'code',
  'state',
  'error',
  'error_code',
  'error_description',
];

const OAUTH_HASH_KEYS = new Set([
  'access_token',
  'refresh_token',
  'expires_in',
  'expires_at',
  'token_type',
  'provider_token',
  'provider_refresh_token',
  'error',
  'error_code',
  'error_description',
]);

export function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 =
    typeof btoa === 'function'
      ? btoa(binary)
      : Buffer.from(bytes).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

/** Generate a cryptographically random RFC 7636 PKCE code verifier. */
export function generateCodeVerifier(byteLength = 48): string {
  const bytes = new Uint8Array(Math.max(32, Math.min(96, byteLength)));
  globalThis.crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

/** Derive an S256 PKCE code challenge from a verifier. */
export async function createPkceChallenge(verifier: string): Promise<string> {
  const encoded = new TextEncoder().encode(verifier);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded);
  return toBase64Url(new Uint8Array(digest));
}

/** Build a Supabase GoTrue `/auth/v1/authorize` URL for Google OAuth. */
export function buildSupabaseGoogleAuthorizeUrl(params: {
  supabaseUrl: string;
  redirectTo: string;
  codeChallenge?: string;
}): string {
  const base = params.supabaseUrl.trim().replace(/\/+$/, '');
  const url = new URL(`${base}/auth/v1/authorize`);
  url.searchParams.set('provider', 'google');
  url.searchParams.set('redirect_to', params.redirectTo);
  if (params.codeChallenge) {
    url.searchParams.set('code_challenge', params.codeChallenge);
    url.searchParams.set('code_challenge_method', 's256');
  }
  return url.toString();
}

/**
 * Inspect a browser URL for Supabase PKCE (`?code=`), implicit (`#access_token=`),
 * or OAuth errors while computing a sanitized `cleanUrl` safe for `history.replaceState`.
 */
export function parseOAuthCallbackUrl(href: string): ParsedOAuthCallback {
  const url = new URL(href);
  const rawHash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
  const hashLooksLikeQuery = rawHash.includes('=');
  const hashParams = new URLSearchParams(hashLooksLikeQuery ? rawHash : '');

  const queryErrorDesc =
    url.searchParams.get('error_description') || url.searchParams.get('error');
  const queryErrorCode = url.searchParams.get('error_code');
  const hashErrorDesc =
    hashParams.get('error_description') || hashParams.get('error');
  const hashErrorCode = hashParams.get('error_code');
  const code = url.searchParams.get('code') || undefined;
  const accessToken = hashParams.get('access_token') || undefined;
  const refreshToken = hashParams.get('refresh_token') || undefined;
  const expiresInRaw = hashParams.get('expires_in');
  const expiresIn = expiresInRaw ? Number(expiresInRaw) : undefined;

  for (const key of OAUTH_QUERY_KEYS) {
    url.searchParams.delete(key);
  }
  if (hashLooksLikeQuery) {
    let hasOAuthHashParam = false;
    for (const key of Array.from(hashParams.keys())) {
      if (OAUTH_HASH_KEYS.has(key)) {
        hashParams.delete(key);
        hasOAuthHashParam = true;
      }
    }
    if (hasOAuthHashParam) {
      const remainingHash = hashParams.toString();
      url.hash = remainingHash ? `#${remainingHash}` : '';
    }
  }
  const cleanUrl = url.toString();

  const errorMessage = (queryErrorDesc || hashErrorDesc || '').trim();
  const errorCode = (queryErrorCode || hashErrorCode || '').trim() || undefined;
  if (errorMessage || errorCode) {
    return {
      kind: 'error',
      errorCode,
      errorMessage: errorMessage || errorCode,
      cleanUrl,
    };
  }
  if (code) {
    return { kind: 'pkce', code, cleanUrl };
  }
  if (accessToken) {
    return {
      kind: 'implicit',
      accessToken,
      refreshToken,
      expiresIn: Number.isFinite(expiresIn) ? expiresIn : undefined,
      cleanUrl,
    };
  }
  return { kind: 'none', cleanUrl };
}

/** Convert raw OAuth/Supabase callback errors into clear, actionable guidance. */
export function formatOAuthErrorMessage(
  errorMessage: string,
  errorCode?: string
): string {
  const raw = (errorMessage || '').trim();
  const lower = raw.toLowerCase();
  const code = (errorCode || '').trim().toLowerCase();

  if (
    code === 'bad_oauth_state' ||
    lower.includes('state not found') ||
    (lower.includes('oauth state') && lower.includes('expired'))
  ) {
    return 'গুগল সাইন-ইন লিংক বা সেশনের মেয়াদ শেষ হয়েছে অথবা পুরনো ট্যাব রিফ্রেশ হয়েছে (OAuth state expired)। অনুগ্রহ করে নিচের "Continue with Google" বাটনে আবার ক্লিক করুন।';
  }
  if (lower.includes('not enabled')) {
    return 'Supabase ড্যাশবোর্ডে Google Provider এখনো চালু করা হয়নি। Authentication -> Providers -> Google অন করুন।';
  }
  if (
    code === 'access_denied' ||
    lower === 'access_denied' ||
    lower.includes('cancelled')
  ) {
    return 'Google সাইন-ইন বাতিল করা হয়েছে। আবার চেষ্টা করতে "Continue with Google" চাপুন।';
  }
  return raw || 'Google sign-in could not be completed. Please try again.';
}

/** Normalize a GoTrue user/session response into FahiVids's session model. */
export function extractSupabaseOAuthUser(
  payload: Record<string, any> | null | undefined,
  isMasterAdminEmail: (email: string) => boolean
): NormalizedOAuthUser | null {
  if (!payload || typeof payload !== 'object') return null;
  const supaUser =
    payload.user && typeof payload.user === 'object' ? payload.user : payload;
  const email = String(supaUser?.email || '')
    .trim()
    .toLowerCase();
  if (!email || !email.includes('@')) return null;

  const meta =
    supaUser?.user_metadata && typeof supaUser.user_metadata === 'object'
      ? supaUser.user_metadata
      : {};
  const appMeta =
    supaUser?.app_metadata && typeof supaUser.app_metadata === 'object'
      ? supaUser.app_metadata
      : {};
  const providers: string[] = Array.isArray(appMeta.providers)
    ? appMeta.providers
    : [];
  const isGoogle =
    appMeta.provider === 'google' || providers.includes('google');

  const isMaster = isMasterAdminEmail(email);
  const name =
    String(
      meta.full_name ||
        meta.name ||
        (isMaster ? 'CEO — Aura Agentic AI' : email.split('@')[0] || 'Creator')
    ).trim() || 'Creator';

  const avatarUrl =
    typeof meta.avatar_url === 'string' && meta.avatar_url.startsWith('http')
      ? meta.avatar_url
      : typeof meta.picture === 'string' && meta.picture.startsWith('http')
        ? meta.picture
        : undefined;

  return {
    id: String(supaUser.id || `supa_${Date.now()}`),
    email,
    name,
    accessToken: String(payload.access_token || ''),
    refreshToken: payload.refresh_token
      ? String(payload.refresh_token)
      : undefined,
    avatarUrl,
    provider: isMaster ? 'admin' : 'supabase',
    authMethod: isGoogle ? 'google' : 'email',
  };
}
