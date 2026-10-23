const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

const routePath = path.join(__dirname, '../app/api/video/download/route.ts');
const source = fs.readFileSync(routePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === '@/lib/public-media') {
    return {
      validatePublicMediaUrl: async (raw) => {
        const url = new URL(raw);
        if (url.protocol !== 'https:' || url.hostname !== 'api.vidsnap.app' && !url.hostname.endsWith('.googlevideo.com') && !url.hostname.endsWith('.fbcdn.net')) {
          throw new Error('Unsupported public media host.');
        }
        return url;
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const routeModule = new Module(routePath, module);
routeModule.filename = routePath;
routeModule.paths = Module._nodeModulePaths(path.dirname(routePath));
routeModule._compile(compiled, routePath);
Module._load = originalLoad;

const { GET } = routeModule.exports;
const sourceUrl = 'https://api.vidsnap.app/proxy?u=opaque';
const requestUrl = `https://studio.example/api/video/download?url=${encodeURIComponent(sourceUrl)}`;

(async () => {
  let forwardedRange;
  global.fetch = async (_url, options) => {
    forwardedRange = options.headers.Range;
    return new Response(new Uint8Array(100), {
      status: 206,
      headers: {
        'content-type': 'audio/mp4',
        'content-length': '100',
        'content-range': 'bytes 100-199/1000',
      },
    });
  };
  const partial = await GET(new Request(requestUrl, { headers: { range: 'bytes=100-199' } }));
  assert.equal(forwardedRange, 'bytes=100-199');
  assert.equal(partial.status, 206);
  assert.equal(partial.headers.get('content-range'), 'bytes 100-199/1000');
  assert.equal(partial.headers.get('accept-ranges'), 'bytes');
  assert.equal((await partial.arrayBuffer()).byteLength, 100);

  global.fetch = async () => new Response(new Uint8Array(1), {
    status: 206,
    headers: {
      'content-type': 'video/mp4',
      'content-length': '1',
      'content-range': 'bytes 0-0/262144001',
    },
  });
  const tooLarge = await GET(new Request(requestUrl, { headers: { range: 'bytes=0-0' } }));
  assert.equal(tooLarge.status, 413);

  global.fetch = async () => new Response(null, {
    status: 302,
    headers: { location: 'https://evil.example/private.mp4' },
  });
  const unsafeRedirect = await GET(new Request(requestUrl));
  assert.equal(unsafeRedirect.status, 400);
  assert.match((await unsafeRedirect.json()).error, /Unsupported public media host/);

  console.log('PASS: byte ranges are forwarded and preserved; oversized files and unsafe redirect hosts are rejected.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
