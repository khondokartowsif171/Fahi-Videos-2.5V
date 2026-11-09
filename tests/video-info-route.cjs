const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const routePath = path.join(__dirname, '../app/api/video/info/route.ts');
const source = fs.readFileSync(routePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

const Module = require('node:module');
const routeModule = new Module(routePath, module);
routeModule.filename = routePath;
routeModule.paths = Module._nodeModulePaths(path.dirname(routePath));
routeModule._compile(compiled, routePath);

const { GET } = routeModule.exports;

(async () => {
  console.log("Running video-info-route tests...");

  // 1. Missing URL parameter
  const reqNoUrl = new Request('https://studio.example/api/video/info');
  const resNoUrl = await GET(reqNoUrl);
  assert.equal(resNoUrl.status, 400);
  const dataNoUrl = await resNoUrl.json();
  assert.match(dataNoUrl.error, /Missing url parameter/);
  console.log("PASS: Missing url rejected with 400.");

  // 2. Unsupported platform
  const reqUnsupported = new Request('https://studio.example/api/video/info?url=https://example.com/video.mp4');
  const resUnsupported = await GET(reqUnsupported);
  assert.equal(resUnsupported.status, 400);
  const dataUnsupported = await resUnsupported.json();
  assert.match(dataUnsupported.error, /Unsupported URL type/);
  console.log("PASS: Unsupported URL rejected with 400.");

  // 3. Instagram Reel extraction with live public reel
  const igUrl = "https://www.instagram.com/reel/DfajF1zvsbl/";
  const reqIg = new Request(`https://studio.example/api/video/info?url=${encodeURIComponent(igUrl)}`);
  const resIg = await GET(reqIg);
  assert.equal(resIg.status, 200);
  const dataIg = await resIg.json();
  assert.equal(dataIg.platform, "instagram");
  assert.ok(Array.isArray(dataIg.formats) && dataIg.formats.length > 0);
  assert.ok(dataIg.formats.some(f => f.url && f.url.startsWith("http")));
  assert.ok(dataIg.title);
  console.log(`PASS: Instagram Reel extracted successfully: "${dataIg.title}" (${dataIg.formats.length} formats available).`);

  console.log("ALL VIDEO INFO ROUTE TESTS PASSED!");
})().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
