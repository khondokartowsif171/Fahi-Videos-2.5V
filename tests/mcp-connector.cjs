const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const assert = require('node:assert/strict');
const ts = require('typescript');

process.env.AURA_DATA_DIR = path.join(
  require('node:os').tmpdir(),
  'fahi-mcp-test-' + process.pid
);
delete process.env.GEMINI_API_KEY;
delete process.env.MCP_SECRET_TOKEN;

const root = path.resolve(__dirname, '..');

function loadTsModule(relPath, cache = {}) {
  const fullPath = path.resolve(root, relPath);
  if (cache[fullPath]) return cache[fullPath].exports;

  const source = fs.readFileSync(fullPath, 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;

  const mod = new Module(fullPath, module);
  cache[fullPath] = mod;
  mod.filename = fullPath;
  mod.paths = Module._nodeModulePaths(path.dirname(fullPath));
  const nativeRequire = mod.require.bind(mod);

  mod.require = (id) => {
    if (id === '@google/genai') {
      return {
        GoogleGenAI: class {},
        GenerateVideosOperation: class {},
        Type: {
          OBJECT: 'OBJECT',
          STRING: 'STRING',
          ARRAY: 'ARRAY',
          NUMBER: 'NUMBER',
          BOOLEAN: 'BOOLEAN',
        },
      };
    }
    if (id.startsWith('@/')) {
      return loadTsModule(id.slice(2) + '.ts', cache);
    }
    if (id.startsWith('./') || id.startsWith('../')) {
      const candidate = path.resolve(path.dirname(fullPath), id + '.ts');
      if (fs.existsSync(candidate)) {
        return loadTsModule(path.relative(root, candidate), cache);
      }
    }
    return nativeRequire(id);
  };

  mod._compile(code, fullPath);
  return mod.exports;
}

const { handleMcpHttp } = loadTsModule('lib/mcp-server.ts');

async function rpcCall(method, params, headers = {}) {
  const req = new Request('http://localhost/api/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Aura-Client-Id': '11111111-1111-4111-8111-111111111111',
      ...headers,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
  });
  const res = await handleMcpHttp(req);
  assert.equal(res.status, 200);
  return res.json();
}

(async () => {
  // 1. Test GET Discovery Manifest (100% Free Mode)
  const getRes = await handleMcpHttp(
    new Request('http://localhost/api/mcp', { method: 'GET' })
  );
  assert.equal(getRes.status, 200);
  const manifest = await getRes.json();
  assert.equal(manifest.status, 'ok');
  assert.equal(manifest.freeTierReady, true);
  assert.equal(manifest.mcpServer.name, 'fahi-videos-mcp-connector');
  assert.equal(manifest.counts.tools, 10);
  assert.equal(manifest.counts.resources, 4);
  assert.equal(manifest.counts.prompts, 3);

  // 2. Test MCP initialize handshake
  const initRes = await rpcCall('initialize', {
    protocolVersion: '2024-11-05',
    clientInfo: { name: 'test-client', version: '1.0.0' },
  });
  assert.equal(initRes.result.protocolVersion, '2024-11-05');
  assert.equal(initRes.result.serverInfo.name, 'fahi-videos-mcp-connector');

  // 3. Test tools/list (all 10 tools work without API key)
  const toolsList = await rpcCall('tools/list');
  assert.equal(toolsList.result.tools.length, 10);

  // 4. Test tools/call -> fahi_build_ugc_storyboard (100% Free)
  const ugcRes = await rpcCall('tools/call', {
    name: 'fahi_build_ugc_storyboard',
    arguments: {
      productName: 'অরা স্মার্ট ওয়াচ',
      category: 'gadgets',
      offerPriceBn: 'মাত্র ১,৯৯০ টাকা',
      ctaTextBn: 'আজই অর্ডার করুন',
      tone: 'commercial',
      sceneCount: 5,
    },
  });
  assert.ok(!ugcRes.result.isError);
  const ugcData = JSON.parse(ugcRes.result.content[0].text);
  assert.equal(ugcData.freeTier, true);
  assert.equal(ugcData.sceneCount, 5);
  assert.ok(ugcData.scenes[0].banglaScript.includes('অরা স্মার্ট ওয়াচ'));
  assert.ok(ugcData.srtSubtitles.includes('00:00:00,000 -->'));

  // 5. Test tools/call -> fahi_generate_bangla_tts (100% Free Engine without API key)
  const ttsRes = await rpcCall('tools/call', {
    name: 'fahi_generate_bangla_tts',
    arguments: {
      text: 'আসসালামু আলাইকুম, ফাহি ভিডিওস এমসিপি কানেক্টরে স্বাগতম।',
      voiceName: 'Kore',
    },
  });
  assert.ok(!ttsRes.result.isError);
  const ttsData = JSON.parse(ttsRes.result.content[0].text);
  assert.equal(ttsData.success, true);
  assert.equal(ttsData.freeTier, true);
  assert.ok(ttsData.audioBase64.length > 100);

  // 6. Test tools/call -> fahi_extract_media_info for YouTube, Facebook, and Instagram (100% Free)
  for (const [sampleUrl, expectedPlat] of [
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube'],
    ['https://www.facebook.com/watch/?v=123456', 'facebook'],
    ['https://www.instagram.com/reel/C12345678/', 'instagram'],
    ['https://www.tiktok.com/@user/video/123456', 'tiktok'],
  ]) {
    const dlRes = await rpcCall('tools/call', {
      name: 'fahi_extract_media_info',
      arguments: { url: sampleUrl },
    });
    assert.ok(!dlRes.result.isError);
    const dlData = JSON.parse(dlRes.result.content[0].text);
    assert.equal(dlData.freeTier, true);
    assert.equal(dlData.platform, expectedPlat);
    assert.ok(dlData.streams.length >= 3);
  }

  // 7. Test tools/call -> fahi_capcut_editor_blueprint (100% Free CapCut Studio)
  const editorRes = await rpcCall('tools/call', {
    name: 'fahi_capcut_editor_blueprint',
    arguments: {
      projectTitle: 'MyFreeReel',
      aspectRatio: '9:16',
      maskShape: 'circle',
      animIn: 'fade_in',
      animOut: 'fade_out',
      animCombo: 'pulse',
      durationSec: 15,
    },
  });
  assert.ok(!editorRes.result.isError);
  const editorData = JSON.parse(editorRes.result.content[0].text);
  assert.equal(editorData.freeTier, true);
  assert.equal(editorData.timelineStartTimecode, '00:00:00:00');
  assert.match(editorData.cssMaskClipPath, /^circle\(/);

  // 8. Test tools/call -> fahi_generate_image (100% Free Fallback when no API key)
  const imgRes = await rpcCall('tools/call', {
    name: 'fahi_generate_image',
    arguments: {
      prompt: 'Neon Dhaka street food night market',
      aspectRatio: '16:9',
    },
  });
  assert.ok(!imgRes.result.isError);
  const imgData = JSON.parse(imgRes.result.content[0].text);
  assert.equal(imgData.freeTier, true);
  assert.ok(imgData.imageUrl.startsWith('https://'));

  // 9. Test tools/call -> fahi_synthesize_studio_sfx (100% Free)
  const sfxRes = await rpcCall('tools/call', {
    name: 'fahi_synthesize_studio_sfx',
    arguments: { sfxId: 'whoosh' },
  });
  assert.ok(!sfxRes.result.isError);
  const sfxData = JSON.parse(sfxRes.result.content[0].text);
  assert.equal(sfxData.mimeType, 'audio/wav');
  assert.ok(sfxData.byteLength > 2000);

  // 10. Test resources/list & prompts/get
  const resList = await rpcCall('resources/list');
  assert.equal(resList.result.resources.length, 4);
  const promptGet = await rpcCall('prompts/get', {
    name: 'free-yt-fb-insta-to-bangla-reel',
    arguments: { mediaUrl: 'https://www.instagram.com/reel/C999/' },
  });
  assert.ok(
    promptGet.result.messages[0].content.text.includes('instagram.com/reel/C999/')
  );

  console.log(
    'PASS: 100% Free-First MCP Connector (Kotha Studio, YT/FB/Insta/TikTok Downloader, CapCut Video Studio, Free Image Fallback, 10 tools, 4 resources, 3 prompts) verified with zero API key.'
  );
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
