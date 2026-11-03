#!/usr/bin/env node
/**
 * mcp-stdio-bridge.mjs
 *
 * Zero-dependency Stdio-to-Streamable-HTTP MCP Bridge for Fahi Videos 2.5V.
 * Connects Claude Desktop, Cursor, Windsurf, Cline, or any local MCP host
 * directly to your live deployment at:
 *   https://fahi-videos.auraajenticai.cloud/api/mcp
 *
 * Environment Variables:
 *   FAHI_MCP_URL       (default: "https://fahi-videos.auraajenticai.cloud/api/mcp")
 *   GEMINI_API_KEY     (optional: forwarded as X-Gemini-API-Key)
 *   FAHI_MCP_TOKEN     (optional: forwarded as Authorization: Bearer <token>)
 *   FAHI_AURA_CLIENT_ID(optional: session isolation ID)
 */

import readline from 'node:readline';

const MCP_URL =
  process.env.FAHI_MCP_URL ||
  'https://fahi-videos.auraajenticai.cloud/api/mcp';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const FAHI_MCP_TOKEN = process.env.FAHI_MCP_TOKEN || '';
const AURA_CLIENT_ID =
  process.env.FAHI_AURA_CLIENT_ID || 'fahi-mcp-stdio-client-0001';

const rl = readline.createInterface({
  input: process.stdin,
  terminal: false,
});

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    process.stdout.write(
      JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Invalid JSON input on stdio' },
      }) + '\n'
    );
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Aura-Client-Id': AURA_CLIENT_ID,
  };
  if (GEMINI_API_KEY) headers['X-Gemini-API-Key'] = GEMINI_API_KEY;
  if (FAHI_MCP_TOKEN) headers['Authorization'] = `Bearer ${FAHI_MCP_TOKEN}`;

  try {
    const res = await fetch(MCP_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(parsed),
    });

    if (res.status === 202 || res.status === 204) {
      return;
    }

    const text = await res.text();
    if (text && text.trim()) {
      process.stdout.write(text.trim() + '\n');
    }
  } catch (err) {
    if (parsed && parsed.id !== undefined) {
      process.stdout.write(
        JSON.stringify({
          jsonrpc: '2.0',
          id: parsed.id,
          error: {
            code: -32000,
            message: `Failed to reach Fahi Videos MCP endpoint (${MCP_URL}): ${err.message || err}`,
          },
        }) + '\n'
      );
    }
  }
});
