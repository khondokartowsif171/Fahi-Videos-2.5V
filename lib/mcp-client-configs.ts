/**
 * lib/mcp-client-configs.ts
 *
 * Official 16-client configuration catalog for the Fahi-Videos MCP Server.
 * Supports both Direct Streamable HTTP (100% Free, Zero Key) and the
 * verified mcprush.com Gateway endpoint (Bearer $MCPRUSH_KEY).
 */

export type McpTransportMode = 'direct' | 'mcprush';

export type McpClientId =
  | 'claude_code'
  | 'claude_desktop'
  | 'chatgpt'
  | 'cursor'
  | 'vscode'
  | 'codex_cli'
  | 'gemini_cli'
  | 'grok_build'
  | 'microsoft_copilot'
  | 'perplexity'
  | 'deepseek_harness'
  | 'zed'
  | 'devin_desktop'
  | 'windsurf'
  | 'openai_agents'
  | 'http_api';

export interface McpClientSnippet {
  label: string;
  format: 'JSON' | 'TOML' | 'YAML' | 'CLI' | 'Python' | 'URL' | 'PowerShell';
  code: string;
}

export interface McpClientVariant {
  primary: McpClientSnippet;
  secondary?: McpClientSnippet;
  instruction: string;
}

export interface McpClientConfigDef {
  id: McpClientId;
  shortCode: string;
  name: string;
  subtitle: string;
  variants: Record<McpTransportMode, McpClientVariant>;
}

export const DIRECT_MCP_URL = 'https://fahi-videos.auraajenticai.cloud/mcp';
export const MCPRUSH_GW_URL = 'https://mcprush.com/gw/fahi-videos-mcp/mcp';
export const MCPRUSH_LISTING_SLUG = 'khondokartowsif171/fahi-videos-mcp';

const prettyJson = (value: unknown): string => JSON.stringify(value, null, 2);

const buildTomlConfig = (url: string, extraLine?: string): string =>
  ['[mcp_servers.fahi-videos-mcp]', `url = "${url}"`, ...(extraLine ? [extraLine] : [])].join('\n');

const buildDeepSeekYaml = (url: string, withAuthHeader: boolean): string => {
  const lines = [
    '- insert:',
    '    - id: mcp-fahi-videos-mcp',
    "      name: '@deepseek-ai/dsh-mcp-client'",
    '      config:',
    '        serverName: fahi-videos-mcp',
    '        transport: streamable-http',
    `        url: ${url}`,
  ];
  if (withAuthHeader) {
    lines.push(
      '        headers:',
      "          Authorization: !!js '`Bearer ${process.env.MCPRUSH_KEY}`'"
    );
  }
  return lines.join('\n');
};

const buildOpenAiAgentsPython = (url: string, withAuthHeader: boolean): string => {
  const paramsLines = withAuthHeader
    ? [
        `            "url": "${url}",`,
        '            "headers": {"Authorization": f"Bearer {os.environ[\'MCPRUSH_KEY\']}"},',
      ]
    : [`            "url": "${url}",`];

  return [
    'import asyncio',
    ...(withAuthHeader ? ['import os'] : []),
    '',
    'from agents import Agent, Runner',
    'from agents.mcp import MCPServerStreamableHttp',
    '',
    'async def main() -> None:',
    '    async with MCPServerStreamableHttp(',
    '        name="fahi-videos-mcp",',
    '        params={',
    ...paramsLines,
    '        },',
    '        client_session_timeout_seconds=60,',
    '    ) as server:',
    '        agent = Agent(name="Assistant", mcp_servers=[server])',
    '        result = await Runner.run(agent, "What can you do?")',
    '        print(result.final_output)',
    '',
    'asyncio.run(main())',
  ].join('\n');
};

export const MCP_CLIENT_CONFIGS: readonly McpClientConfigDef[] = [
  {
    id: 'claude_code',
    shortCode: 'CC',
    name: 'Claude Code',
    subtitle: '.mcp.json & CLI',
    variants: {
      direct: {
        primary: {
          label: 'File: .mcp.json (project root)',
          format: 'JSON',
          code: prettyJson({
            mcpServers: {
              'fahi-videos-mcp': {
                type: 'http',
                url: DIRECT_MCP_URL,
              },
            },
          }),
        },
        secondary: {
          label: 'Terminal Command (user scope)',
          format: 'CLI',
          code: `claude mcp add --transport http --scope user fahi-videos-mcp ${DIRECT_MCP_URL}`,
        },
        instruction:
          'Save .mcp.json in your project root or run the CLI command once for user-wide availability across all projects.',
      },
      mcprush: {
        primary: {
          label: 'Terminal Command (user scope)',
          format: 'CLI',
          code: `claude mcp add --transport http --scope user fahi-videos-mcp ${MCPRUSH_GW_URL} --header 'Authorization: Bearer \${MCPRUSH_KEY}'`,
        },
        secondary: {
          label: 'File: .mcp.json (project root)',
          format: 'JSON',
          code: prettyJson({
            mcpServers: {
              'fahi-videos-mcp': {
                type: 'http',
                url: MCPRUSH_GW_URL,
                headers: {
                  Authorization: 'Bearer ${MCPRUSH_KEY}',
                },
              },
            },
          }),
        },
        instruction:
          'Export MCPRUSH_KEY in your shell (or run setx MCPRUSH_KEY <key> on Windows), then add with user scope.',
      },
    },
  },
  {
    id: 'claude_desktop',
    shortCode: 'CD',
    name: 'Claude Desktop',
    subtitle: 'claude_desktop_config.json',
    variants: {
      direct: {
        primary: {
          label:
            'File: %APPDATA%\\Claude\\claude_desktop_config.json (Windows) or ~/Library/Application Support/Claude/claude_desktop_config.json (macOS)',
          format: 'JSON',
          code: prettyJson({
            mcpServers: {
              'fahi-videos-mcp': {
                command: 'npx',
                args: ['-y', 'mcp-remote', DIRECT_MCP_URL],
              },
            },
          }),
        },
        instruction:
          'Requires Node.js installed. Paste into claude_desktop_config.json and restart Claude Desktop to load all 10 tools.',
      },
      mcprush: {
        primary: {
          label:
            'File: %APPDATA%\\Claude\\claude_desktop_config.json (Windows) or ~/Library/Application Support/Claude/claude_desktop_config.json (macOS)',
          format: 'JSON',
          code: prettyJson({
            mcpServers: {
              'fahi-videos-mcp': {
                command: 'npx',
                args: [
                  '-y',
                  'mcp-remote@0.1.38',
                  MCPRUSH_GW_URL,
                  '--header',
                  'Authorization:${MCPRUSH_AUTH}',
                ],
                env: {
                  MCPRUSH_AUTH: 'Bearer <your key>',
                },
              },
            },
          }),
        },
        secondary: {
          label: 'mcprush CLI Installer',
          format: 'CLI',
          code: `npx mcprush@latest add ${MCPRUSH_LISTING_SLUG} --client claude-desktop`,
        },
        instruction:
          'Replace <your key> with your Access key from mcprush.com/dashboard#access, or let the mcprush CLI write the config for you.',
      },
    },
  },
  {
    id: 'chatgpt',
    shortCode: 'CH',
    name: 'ChatGPT',
    subtitle: 'config.toml & Responses API',
    variants: {
      direct: {
        primary: {
          label: 'File: ~/.codex/config.toml (ChatGPT Desktop App)',
          format: 'TOML',
          code: buildTomlConfig(DIRECT_MCP_URL),
        },
        secondary: {
          label: 'OpenAI Responses API Tool Payload',
          format: 'JSON',
          code: prettyJson({
            type: 'mcp',
            server_label: 'fahi-videos-mcp',
            server_url: DIRECT_MCP_URL,
          }),
        },
        instruction:
          'Restart ChatGPT Desktop after saving ~/.codex/config.toml so the server appears under Settings -> MCP servers.',
      },
      mcprush: {
        primary: {
          label: 'File: ~/.codex/config.toml (ChatGPT Desktop App)',
          format: 'TOML',
          code: buildTomlConfig(
            MCPRUSH_GW_URL,
            'http_headers = { Authorization = "Bearer <your key>" }'
          ),
        },
        secondary: {
          label: 'OpenAI Responses API Tool Payload',
          format: 'JSON',
          code: prettyJson({
            type: 'mcp',
            server_label: 'fahi-videos-mcp',
            server_url: MCPRUSH_GW_URL,
            headers: {
              Authorization: 'Bearer <your key>',
            },
          }),
        },
        instruction:
          'Paste into ~/.codex/config.toml (shared with Codex CLI) with your mcprush Access key and restart the desktop app.',
      },
    },
  },
  {
    id: 'cursor',
    shortCode: 'CU',
    name: 'Cursor',
    subtitle: '~/.cursor/mcp.json',
    variants: {
      direct: {
        primary: {
          label: 'File: ~/.cursor/mcp.json (or .cursor/mcp.json in workspace)',
          format: 'JSON',
          code: prettyJson({
            mcpServers: {
              'fahi-videos-mcp': {
                type: 'http',
                url: DIRECT_MCP_URL,
              },
            },
          }),
        },
        instruction:
          'Cursor connects natively via type: "http" and url. Cursor re-reads mcp.json when Settings closes.',
      },
      mcprush: {
        primary: {
          label: 'File: ~/.cursor/mcp.json',
          format: 'JSON',
          code: prettyJson({
            mcpServers: {
              'fahi-videos-mcp': {
                type: 'http',
                url: MCPRUSH_GW_URL,
                headers: {
                  Authorization: 'Bearer <your key>',
                },
              },
            },
          }),
        },
        instruction:
          'Paste into ~/.cursor/mcp.json with your mcprush Access key. Cursor picks up the tools on your next chat message.',
      },
    },
  },
  {
    id: 'vscode',
    shortCode: 'VC',
    name: 'VS Code',
    subtitle: '.vscode/mcp.json',
    variants: {
      direct: {
        primary: {
          label: 'File: .vscode/mcp.json (workspace)',
          format: 'JSON',
          code: prettyJson({
            servers: {
              'fahi-videos-mcp': {
                type: 'http',
                url: DIRECT_MCP_URL,
              },
            },
          }),
        },
        instruction:
          'VS Code workspace MCP configs use the top-level "servers" key with type: "http". Commit .vscode/mcp.json to share with your team.',
      },
      mcprush: {
        primary: {
          label: 'mcprush CLI Installer',
          format: 'CLI',
          code: `npx mcprush@latest add ${MCPRUSH_LISTING_SLUG} --client vscode`,
        },
        secondary: {
          label: 'File: .vscode/mcp.json (with secret prompt)',
          format: 'JSON',
          code: prettyJson({
            inputs: [
              {
                type: 'promptString',
                id: 'mcprush-key',
                description: 'mcprush Access Key',
                password: true,
              },
            ],
            servers: {
              'fahi-videos-mcp': {
                type: 'http',
                url: MCPRUSH_GW_URL,
                headers: {
                  Authorization: 'Bearer ${input:mcprush-key}',
                },
              },
            },
          }),
        },
        instruction:
          'Writes .vscode/mcp.json in your workspace while keeping your mcprush key in VS Code secret input storage.',
      },
    },
  },
  {
    id: 'codex_cli',
    shortCode: 'CX',
    name: 'Codex CLI',
    subtitle: 'codex mcp add & config.toml',
    variants: {
      direct: {
        primary: {
          label: 'File: ~/.codex/config.toml (or .codex/config.toml)',
          format: 'TOML',
          code: buildTomlConfig(DIRECT_MCP_URL),
        },
        secondary: {
          label: 'Terminal Command',
          format: 'CLI',
          code: `codex mcp add fahi-videos-mcp --url ${DIRECT_MCP_URL}`,
        },
        instruction:
          'Run codex mcp add or save ~/.codex/config.toml, then restart any active Codex CLI session.',
      },
      mcprush: {
        primary: {
          label: 'Terminal Command',
          format: 'CLI',
          code: `codex mcp add fahi-videos-mcp --url ${MCPRUSH_GW_URL} --bearer-token-env-var MCPRUSH_KEY`,
        },
        secondary: {
          label: 'File: ~/.codex/config.toml',
          format: 'TOML',
          code: buildTomlConfig(MCPRUSH_GW_URL, 'bearer_token_env_var = "MCPRUSH_KEY"'),
        },
        instruction:
          'Export MCPRUSH_KEY in your environment before launching Codex CLI so bearer_token_env_var resolves at startup.',
      },
    },
  },
  {
    id: 'gemini_cli',
    shortCode: 'GC',
    name: 'Gemini CLI',
    subtitle: '~/.gemini/settings.json',
    variants: {
      direct: {
        primary: {
          label: 'File: ~/.gemini/settings.json',
          format: 'JSON',
          code: prettyJson({
            mcpServers: {
              'fahi-videos-mcp': {
                httpUrl: DIRECT_MCP_URL,
              },
            },
          }),
        },
        secondary: {
          label: 'Terminal Command (user scope)',
          format: 'CLI',
          code: `gemini mcp add --scope user --transport http fahi-videos-mcp ${DIRECT_MCP_URL}`,
        },
        instruction:
          'Gemini CLI uses "httpUrl" for Streamable HTTP servers (whereas "url" is reserved for SSE). Trust the workspace folder via /permissions if prompted.',
      },
      mcprush: {
        primary: {
          label: 'Terminal Command (user scope)',
          format: 'CLI',
          code: `gemini mcp add --scope user --transport http -H 'Authorization: Bearer \${MCPRUSH_KEY}' fahi-videos-mcp ${MCPRUSH_GW_URL}`,
        },
        secondary: {
          label: 'File: ~/.gemini/settings.json',
          format: 'JSON',
          code: prettyJson({
            mcpServers: {
              'fahi-videos-mcp': {
                httpUrl: MCPRUSH_GW_URL,
                headers: {
                  Authorization: 'Bearer ${MCPRUSH_KEY}',
                },
              },
            },
          }),
        },
        instruction:
          'Adds to ~/.gemini/settings.json and reads $MCPRUSH_KEY on connection.',
      },
    },
  },
  {
    id: 'grok_build',
    shortCode: 'GB',
    name: 'Grok Build',
    subtitle: '~/.grok/config.toml',
    variants: {
      direct: {
        primary: {
          label: 'File: ~/.grok/config.toml (or .grok/config.toml)',
          format: 'TOML',
          code: buildTomlConfig(DIRECT_MCP_URL),
        },
        secondary: {
          label: 'Terminal Command',
          format: 'CLI',
          code: `grok mcp add --transport http fahi-videos-mcp ${DIRECT_MCP_URL}`,
        },
        instruction:
          'Add to ~/.grok/config.toml (or run grok mcp add with --scope project for repo-local setup).',
      },
      mcprush: {
        primary: {
          label: 'Terminal Command',
          format: 'CLI',
          code: `grok mcp add --transport http fahi-videos-mcp ${MCPRUSH_GW_URL} --header 'Authorization: Bearer \${MCPRUSH_KEY}'`,
        },
        secondary: {
          label: 'File: ~/.grok/config.toml',
          format: 'TOML',
          code: buildTomlConfig(
            MCPRUSH_GW_URL,
            'headers = { "Authorization" = "Bearer ${MCPRUSH_KEY}" }'
          ),
        },
        instruction:
          'Writes to ~/.grok/config.toml. Export MCPRUSH_KEY before starting Grok Build.',
      },
    },
  },
  {
    id: 'microsoft_copilot',
    shortCode: 'MC',
    name: 'Microsoft Copilot',
    subtitle: 'Copilot Studio MCP',
    variants: {
      direct: {
        primary: {
          label: 'Copilot Studio Streamable HTTP Endpoint URL',
          format: 'URL',
          code: DIRECT_MCP_URL,
        },
        instruction:
          'In Copilot Studio: open your agent -> Tools -> Add a tool -> New tool -> Model Context Protocol, paste this URL, and choose Authentication: None.',
      },
      mcprush: {
        primary: {
          label: 'Copilot Studio Streamable HTTP Endpoint URL',
          format: 'URL',
          code: MCPRUSH_GW_URL,
        },
        instruction:
          'In Copilot Studio: Tools -> Add a tool -> New tool -> Model Context Protocol. Under Authentication pick API Key -> Type: Header -> Name: Authorization, value: Bearer <your key>.',
      },
    },
  },
  {
    id: 'perplexity',
    shortCode: 'PE',
    name: 'Perplexity',
    subtitle: 'Custom Remote Connector',
    variants: {
      direct: {
        primary: {
          label: 'Perplexity Custom Connector URL (Streamable HTTP)',
          format: 'URL',
          code: DIRECT_MCP_URL,
        },
        instruction:
          'Open Settings -> Connectors -> + Custom connector -> Remote, paste this URL (Pro, Max, or Enterprise), then toggle it on under Sources.',
      },
      mcprush: {
        primary: {
          label: 'Perplexity Custom Connector URL (Streamable HTTP)',
          format: 'URL',
          code: MCPRUSH_GW_URL,
        },
        instruction:
          'Open Settings -> Connectors -> + Custom connector -> Remote and paste the gateway URL (requires Pro, Max, or Enterprise).',
      },
    },
  },
  {
    id: 'deepseek_harness',
    shortCode: 'DH',
    name: 'DeepSeek Harness',
    subtitle: '~/.dsh/cordis.patch.yml',
    variants: {
      direct: {
        primary: {
          label: 'File: ~/.dsh/cordis.patch.yml',
          format: 'YAML',
          code: buildDeepSeekYaml(DIRECT_MCP_URL, false),
        },
        instruction:
          'Add this entry under insert: in ~/.dsh/cordis.patch.yml, then launch DeepSeek Harness (npx @deepseek-ai/dsh web).',
      },
      mcprush: {
        primary: {
          label: 'File: ~/.dsh/cordis.patch.yml',
          format: 'YAML',
          code: buildDeepSeekYaml(MCPRUSH_GW_URL, true),
        },
        instruction:
          'Add to ~/.dsh/cordis.patch.yml and start dsh with MCPRUSH_KEY set in your environment.',
      },
    },
  },
  {
    id: 'zed',
    shortCode: 'ZE',
    name: 'Zed',
    subtitle: 'context_servers JSON',
    variants: {
      direct: {
        primary: {
          label:
            'File: ~/.config/zed/settings.json (macOS/Linux) or %APPDATA%\\Zed\\settings.json (Windows)',
          format: 'JSON',
          code: prettyJson({
            context_servers: {
              'fahi-videos-mcp': {
                url: DIRECT_MCP_URL,
              },
            },
          }),
        },
        instruction:
          'Zed stores MCP servers under "context_servers" in settings.json and reloads automatically on save.',
      },
      mcprush: {
        primary: {
          label: 'mcprush CLI Installer',
          format: 'CLI',
          code: `npx mcprush@latest add ${MCPRUSH_LISTING_SLUG} --client zed`,
        },
        secondary: {
          label:
            'File: ~/.config/zed/settings.json (macOS/Linux) or %APPDATA%\\Zed\\settings.json (Windows)',
          format: 'JSON',
          code: prettyJson({
            context_servers: {
              'fahi-videos-mcp': {
                url: MCPRUSH_GW_URL,
                headers: {
                  Authorization: 'Bearer <your key>',
                },
              },
            },
          }),
        },
        instruction:
          'Adds the server under context_servers in Zed settings. Zed reloads its MCP config on save.',
      },
    },
  },
  {
    id: 'devin_desktop',
    shortCode: 'DD',
    name: 'Devin Desktop',
    subtitle: 'devin/mcp_config.json',
    variants: {
      direct: {
        primary: {
          label:
            'File: ~/.config/devin/mcp_config.json (macOS/Linux) or %APPDATA%\\devin\\mcp_config.json (Windows)',
          format: 'JSON',
          code: prettyJson({
            mcpServers: {
              'fahi-videos-mcp': {
                serverUrl: DIRECT_MCP_URL,
              },
            },
          }),
        },
        instruction:
          'Save to devin/mcp_config.json and restart Devin Desktop once so Devin Local loads all 10 tools.',
      },
      mcprush: {
        primary: {
          label: 'mcprush CLI Installer',
          format: 'CLI',
          code: `npx mcprush@latest add ${MCPRUSH_LISTING_SLUG} --client devin`,
        },
        secondary: {
          label:
            'File: ~/.config/devin/mcp_config.json (macOS/Linux) or %APPDATA%\\devin\\mcp_config.json (Windows)',
          format: 'JSON',
          code: prettyJson({
            mcpServers: {
              'fahi-videos-mcp': {
                serverUrl: MCPRUSH_GW_URL,
                headers: {
                  Authorization: 'Bearer <your key>',
                },
              },
            },
          }),
        },
        instruction:
          'Writes devin/mcp_config.json with your Authorization header. Restart Devin Desktop once after saving.',
      },
    },
  },
  {
    id: 'windsurf',
    shortCode: 'WS',
    name: 'Windsurf',
    subtitle: 'windsurf/mcp_config.json',
    variants: {
      direct: {
        primary: {
          label:
            'File: ~/.codeium/windsurf/mcp_config.json (macOS/Linux) or %USERPROFILE%\\.codeium\\windsurf\\mcp_config.json (Windows)',
          format: 'JSON',
          code: prettyJson({
            mcpServers: {
              'fahi-videos-mcp': {
                serverUrl: DIRECT_MCP_URL,
              },
            },
          }),
        },
        instruction:
          'Paste into Windsurf mcp_config.json and click Refresh in the Cascade MCP panel.',
      },
      mcprush: {
        primary: {
          label: 'mcprush CLI Installer',
          format: 'CLI',
          code: `npx mcprush@latest add ${MCPRUSH_LISTING_SLUG} --client windsurf`,
        },
        secondary: {
          label:
            'File: ~/.codeium/windsurf/mcp_config.json (macOS/Linux) or %USERPROFILE%\\.codeium\\windsurf\\mcp_config.json (Windows)',
          format: 'JSON',
          code: prettyJson({
            mcpServers: {
              'fahi-videos-mcp': {
                serverUrl: MCPRUSH_GW_URL,
                headers: {
                  Authorization: 'Bearer <your key>',
                },
              },
            },
          }),
        },
        instruction:
          'Updates Windsurf mcp_config.json (also imported by Devin Desktop). Reloads automatically on save.',
      },
    },
  },
  {
    id: 'openai_agents',
    shortCode: 'OA',
    name: 'OpenAI Agents SDK',
    subtitle: 'Python Streamable HTTP',
    variants: {
      direct: {
        primary: {
          label: 'Python (pip install openai-agents)',
          format: 'Python',
          code: buildOpenAiAgentsPython(DIRECT_MCP_URL, false),
        },
        instruction:
          'Requires Python 3.10+. Install openai-agents, set OPENAI_API_KEY, and run directly against the free endpoint.',
      },
      mcprush: {
        primary: {
          label: 'Python (pip install openai-agents)',
          format: 'Python',
          code: buildOpenAiAgentsPython(MCPRUSH_GW_URL, true),
        },
        instruction:
          'Requires Python 3.10+. Set MCPRUSH_KEY and OPENAI_API_KEY in your environment, then run.',
      },
    },
  },
  {
    id: 'http_api',
    shortCode: 'HA',
    name: 'HTTP / API',
    subtitle: 'cURL & PowerShell',
    variants: {
      direct: {
        primary: {
          label: 'Streamable HTTP (cURL JSON-RPC & SSE)',
          format: 'CLI',
          code: [
            '# Streamable HTTP Test (POST JSON-RPC)',
            `curl -sS -X POST ${DIRECT_MCP_URL} \\`,
            '  -H "Content-Type: application/json" \\',
            '  -H "Accept: application/json, text/event-stream" \\',
            '  -d \'{"jsonrpc":"2.0","id":1,"method":"tools/list"}\'',
            '',
            '# SSE Event Stream (GET)',
            `curl -N -H "Accept: text/event-stream" ${DIRECT_MCP_URL}`,
          ].join('\n'),
        },
        secondary: {
          label: 'Windows PowerShell (Invoke-RestMethod)',
          format: 'PowerShell',
          code: `Invoke-RestMethod -Method Post -Uri ${DIRECT_MCP_URL} -Headers @{ Accept = 'application/json, text/event-stream' } -ContentType 'application/json' -Body '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | ConvertTo-Json -Depth 10`,
        },
        instruction:
          'Direct Streamable HTTP & JSON-RPC 2.0 endpoint. No API key required.',
      },
      mcprush: {
        primary: {
          label: 'Streamable HTTP via Gateway (cURL)',
          format: 'CLI',
          code: [
            'sh -c \': "${MCPRUSH_KEY:?export MCPRUSH_KEY first: your key is at https://mcprush.com/dashboard#access}"\' && \\',
            `curl -sS ${MCPRUSH_GW_URL} \\`,
            "  -H 'Content-Type: application/json' \\",
            "  -H 'Accept: application/json, text/event-stream' \\",
            '  -H "Authorization: Bearer $MCPRUSH_KEY" \\',
            '  -d \'{"jsonrpc":"2.0","id":1,"method":"tools/list"}\'',
          ].join('\n'),
        },
        secondary: {
          label: 'Windows PowerShell (Invoke-RestMethod)',
          format: 'PowerShell',
          code: `Invoke-RestMethod -Method Post -Uri ${MCPRUSH_GW_URL} -Headers @{ Authorization = "Bearer $env:MCPRUSH_KEY"; Accept = 'application/json, text/event-stream' } -ContentType 'application/json' -Body '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | ConvertTo-Json -Depth 10`,
        },
        instruction:
          'Calls the mcprush gateway over Streamable HTTP with MCPRUSH_KEY.',
      },
    },
  },
];
