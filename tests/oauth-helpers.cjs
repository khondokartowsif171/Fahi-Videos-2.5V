require('./register-typescript.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const {
  generateCodeVerifier,
  createPkceChallenge,
  buildSupabaseGoogleAuthorizeUrl,
  parseOAuthCallbackUrl,
  formatOAuthErrorMessage,
  extractSupabaseOAuthUser,
} = require('../lib/oauth-helpers.ts');

(async () => {
  const verifier = generateCodeVerifier(48);
  assert.ok(verifier.length >= 43 && verifier.length <= 128);
  assert.match(verifier, /^[A-Za-z0-9\-_]+$/);

  const challenge = await createPkceChallenge(verifier);
  assert.ok(challenge.length > 30);
  assert.match(challenge, /^[A-Za-z0-9\-_]+$/);
  assert.notEqual(challenge, verifier);

  const authUrl = buildSupabaseGoogleAuthorizeUrl({
    supabaseUrl: 'https://spkrpwlavvbeooxijubv.supabase.co/',
    redirectTo: 'https://fahi-videos.auraajenticai.cloud/',
    codeChallenge: challenge,
  });
  const parsedAuth = new URL(authUrl);
  assert.equal(parsedAuth.origin, 'https://spkrpwlavvbeooxijubv.supabase.co');
  assert.equal(parsedAuth.pathname, '/auth/v1/authorize');
  assert.equal(parsedAuth.searchParams.get('provider'), 'google');
  assert.equal(
    parsedAuth.searchParams.get('redirect_to'),
    'https://fahi-videos.auraajenticai.cloud/'
  );
  assert.equal(parsedAuth.searchParams.get('code_challenge'), challenge);
  assert.equal(parsedAuth.searchParams.get('code_challenge_method'), 's256');

  // PKCE callback should preserve unrelated params and clean OAuth query keys
  const pkceCb = parseOAuthCallbackUrl(
    'https://fahi-videos.auraajenticai.cloud/?kotha=1&code=abc_123&state=xyz'
  );
  assert.equal(pkceCb.kind, 'pkce');
  assert.equal(pkceCb.code, 'abc_123');
  assert.equal(pkceCb.cleanUrl, 'https://fahi-videos.auraajenticai.cloud/?kotha=1');

  // Implicit callback should extract access_token and preserve unrelated anchor if none remain
  const implicitCb = parseOAuthCallbackUrl(
    'https://fahi-videos.auraajenticai.cloud/#access_token=jwt.tok&refresh_token=ref1&expires_in=3600'
  );
  assert.equal(implicitCb.kind, 'implicit');
  assert.equal(implicitCb.accessToken, 'jwt.tok');
  assert.equal(implicitCb.refreshToken, 'ref1');
  assert.equal(implicitCb.expiresIn, 3600);
  assert.equal(implicitCb.cleanUrl, 'https://fahi-videos.auraajenticai.cloud/');

  // Hash anchor without OAuth params stays untouched
  const normalAnchor = parseOAuthCallbackUrl(
    'https://fahi-videos.auraajenticai.cloud/#kotha'
  );
  assert.equal(normalAnchor.kind, 'none');
  assert.equal(normalAnchor.cleanUrl, 'https://fahi-videos.auraajenticai.cloud/#kotha');

  // Error callback normalization + expired OAuth state handling
  const errCb = parseOAuthCallbackUrl(
    'https://fahi-videos.auraajenticai.cloud/?error=access_denied&error_description=User+denied'
  );
  assert.equal(errCb.kind, 'error');
  assert.equal(errCb.errorMessage, 'User denied');
  assert.equal(errCb.cleanUrl, 'https://fahi-videos.auraajenticai.cloud/');

  const expiredCb = parseOAuthCallbackUrl(
    'https://fahi-videos.auraajenticai.cloud/?error=invalid_request&error_code=bad_oauth_state&error_description=OAuth+state+not+found+or+expired'
  );
  assert.equal(expiredCb.kind, 'error');
  assert.equal(expiredCb.errorCode, 'bad_oauth_state');
  assert.equal(expiredCb.errorMessage, 'OAuth state not found or expired');
  assert.equal(expiredCb.cleanUrl, 'https://fahi-videos.auraajenticai.cloud/');
  const friendlyExpired = formatOAuthErrorMessage(
    expiredCb.errorMessage,
    expiredCb.errorCode
  );
  assert.match(friendlyExpired, /OAuth state expired/);
  assert.match(friendlyExpired, /Continue with Google/);

  const deniedMsg = formatOAuthErrorMessage('User denied access', 'access_denied');
  assert.match(deniedMsg, /Continue with Google/);

  // Normalized user mapping for Google OAuth user
  const user = extractSupabaseOAuthUser(
    {
      access_token: 'access-jwt',
      refresh_token: 'refresh-tok',
      user: {
        id: 'u-google-1',
        email: 'Creator@Gmail.com',
        app_metadata: { provider: 'google', providers: ['google'] },
        user_metadata: {
          full_name: 'Fahi Creator',
          avatar_url: 'https://lh3.googleusercontent.com/avatar.png',
        },
      },
    },
    (em) => em === 'ceo@auraajenticai.cloud'
  );
  assert.deepEqual(user, {
    id: 'u-google-1',
    email: 'creator@gmail.com',
    name: 'Fahi Creator',
    accessToken: 'access-jwt',
    refreshToken: 'refresh-tok',
    avatarUrl: 'https://lh3.googleusercontent.com/avatar.png',
    provider: 'supabase',
    authMethod: 'google',
  });

  // Public repo & auth security hygiene regression guards
  const repoRoot = path.resolve(__dirname, '..');
  const supabaseClientSrc = fs.readFileSync(path.join(repoRoot, 'lib', 'supabase-client.ts'), 'utf8');
  const adminModalSrc = fs.readFileSync(path.join(repoRoot, 'components', 'AdminLoginModal.tsx'), 'utf8');
  const readmeSrc = fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
  const gitignoreSrc = fs.readFileSync(path.join(repoRoot, '.gitignore'), 'utf8');

  for (const src of [supabaseClientSrc, adminModalSrc]) {
    assert.doesNotMatch(src, /DEFAULT_ADMIN_PASS/);
    assert.doesNotMatch(src, /(getItem|setItem)\s*\(\s*['"]fahi_admin_password['"]/);
    assert.doesNotMatch(src, /default:\s*admin123/i);
  }
  assert.doesNotMatch(readmeSrc, /spkrpwlavvbeooxijubv/i);
  assert.doesNotMatch(readmeSrc, /\.supabase\.co/i);
  assert.doesNotMatch(readmeSrc, /\(\/admin\)/i);
  assert.doesNotMatch(readmeSrc, /D:\/Fahi-videos/i);
  assert.match(gitignoreSrc, /(^|\r?\n)MASTER\.md(\r?\n|$)/);

  if (fs.existsSync(path.join(repoRoot, '.git'))) {
    const trackedMaster = execFileSync('git', ['ls-files', 'MASTER.md'], {
      cwd: repoRoot,
      encoding: 'utf8',
    }).trim();
    assert.equal(trackedMaster, '');
    const ignoredMaster = execFileSync('git', ['check-ignore', 'MASTER.md'], {
      cwd: repoRoot,
      encoding: 'utf8',
    }).trim();
    assert.equal(ignoredMaster, 'MASTER.md');
  }

  console.log('PASS: Supabase Google OAuth PKCE/implicit helpers & public repo security hygiene verified.');
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
