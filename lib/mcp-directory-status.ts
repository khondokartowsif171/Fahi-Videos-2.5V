/**
 * lib/mcp-directory-status.ts
 *
 * Fetches and parses real-time directory verification stats from mcptry.com
 * and mcprush.com with zero hardcoded fallback scores.
 */

export const MCPTRY_LISTING_URL =
  'https://mcptry.com/servers/io.github.khondokartowsif171/fahi-videos-mcp';
export const MCPTRY_BADGE_URL =
  'https://mcptry.com/badge/io.github.khondokartowsif171/fahi-videos-mcp';
export const MCPRUSH_LISTING_URL =
  'https://mcprush.com/khondokartowsif171/fahi-videos-mcp';
export const MCPRUSH_BADGE_URL =
  'https://mcprush.com/badge/fahi-videos-mcp/card.svg';

export interface McptrySubscore {
  label: string;
  score: number;
  max: number;
}

export interface McptryLiveStatus {
  reachable: boolean;
  status: string | null;
  rankScore: number | null;
  rankMax: number | null;
  uptime30d: string | null;
  uptime90d: string | null;
  latencyGermanyMs: number | null;
  protocol: string | null;
  lastCheck: string | null;
  breakdown: McptrySubscore[];
}

export interface McprushLiveStatus {
  reachable: boolean;
  grade: string | null;
  statusLabel: string | null;
  version: string | null;
  toolsCount: number | null;
  clientsCount: number | null;
}

export interface LiveMcpDirectoryStatus {
  fetchedAt: string;
  mcptry: McptryLiveStatus;
  mcprush: McprushLiveStatus;
}

function stripTagsToText(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&middot;|·/gi, '·')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseMcptryBadgeSvg(svg: string): {
  status: string | null;
  rankScore: number | null;
  rankMax: number | null;
} {
  if (!svg || typeof svg !== 'string') {
    return { status: null, rankScore: null, rankMax: null };
  }
  const titleMatch = svg.match(/<title>\s*([^<]+?)\s*<\/title>/i);
  const ariaMatch = svg.match(/aria-label=["']([^"']+)["']/i);
  const label = (titleMatch?.[1] || ariaMatch?.[1] || stripTagsToText(svg)).trim();

  const fullMatch = label.match(/mcptry:\s*([a-z0-9 _-]+?),\s*score\s*(\d+)\s*\/\s*(\d+)/i);
  if (fullMatch) {
    return {
      status: fullMatch[1].trim().toLowerCase(),
      rankScore: Number.parseInt(fullMatch[2], 10),
      rankMax: Number.parseInt(fullMatch[3], 10),
    };
  }

  const scoreMatch = label.match(/(\d+)\s*\/\s*(\d+)/);
  const statusMatch = label.match(/mcptry:\s*([a-z0-9_-]+)/i);
  return {
    status: statusMatch ? statusMatch[1].trim().toLowerCase() : null,
    rankScore: scoreMatch ? Number.parseInt(scoreMatch[1], 10) : null,
    rankMax: scoreMatch ? Number.parseInt(scoreMatch[2], 10) : null,
  };
}

const MCPTRY_BREAKDOWN_LABELS = [
  'Works right now',
  'Uptime, 30 days',
  'Tool quality',
  'Complete listing',
  'Verified publisher',
  'Claimed by its maintainer',
  'Speed',
  'Recently updated',
] as const;

export function parseMcptryServerHtml(html: string): Omit<McptryLiveStatus, 'reachable' | 'status'> {
  const empty = {
    rankScore: null,
    rankMax: null,
    uptime30d: null,
    uptime90d: null,
    latencyGermanyMs: null,
    protocol: null,
    lastCheck: null,
    breakdown: [] as McptrySubscore[],
  };
  if (!html || typeof html !== 'string') return empty;

  const text = stripTagsToText(html);
  const rankMatch = text.match(/How it ranks\s+(\d+)\s*\/\s*(\d+)/i);
  const uptime30Match = text.match(/Uptime,\s*30 days\s+([\d.]+%)/i);
  const uptime90Match = text.match(/Uptime,\s*90 days\s+([\d.]+%)/i);
  const latencyMatch = text.match(/Response,\s*from Germany\s+(\d+)\s*ms/i);
  const protocolMatch = text.match(/Protocol\s+(\d{4}-\d{2}-\d{2})/i);
  const lastCheckMatch = text.match(/Last check\s+([A-Za-z]+\s+\d+,\s+\d{2}:\d{2}\s*UTC\s*:\s*[a-z]+)/i);

  const breakdown: McptrySubscore[] = [];
  const rankSectionMatch = text.match(/How it ranks[\s\S]{0,600}/i);
  const rankSection = rankSectionMatch ? rankSectionMatch[0] : '';
  for (const label of MCPTRY_BREAKDOWN_LABELS) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const subMatch = rankSection.match(new RegExp(`${escaped}\\s+(\\d+)\\s*\\/\\s*(\\d+)`, 'i'));
    if (subMatch) {
      breakdown.push({
        label,
        score: Number.parseInt(subMatch[1], 10),
        max: Number.parseInt(subMatch[2], 10),
      });
    }
  }

  return {
    rankScore: rankMatch ? Number.parseInt(rankMatch[1], 10) : null,
    rankMax: rankMatch ? Number.parseInt(rankMatch[2], 10) : null,
    uptime30d: uptime30Match ? uptime30Match[1] : null,
    uptime90d: uptime90Match ? uptime90Match[1] : null,
    latencyGermanyMs: latencyMatch ? Number.parseInt(latencyMatch[1], 10) : null,
    protocol: protocolMatch ? protocolMatch[1] : null,
    lastCheck: lastCheckMatch ? lastCheckMatch[1].replace(/\s+/g, ' ').trim() : null,
    breakdown,
  };
}

export function parseMcprushCardSvg(svg: string): Omit<McprushLiveStatus, 'reachable'> {
  const empty = {
    grade: null,
    statusLabel: null,
    version: null,
    toolsCount: null,
    clientsCount: null,
  };
  if (!svg || typeof svg !== 'string') return empty;

  const text = stripTagsToText(svg);
  const gradeMatch = text.match(/grade\s+([A-F][+-]?)/i);
  const statusMatch = text.match(
    /(not scanned yet|Tool-list grade [A-F][+-]?|verified|scanned)/i
  );
  const versionMatch = text.match(/\bv(\d+\.\d+\.\d+)\b/i);
  const toolsMatch = text.match(/(\d+)\s+tools\b/i);
  const clientsMatch = text.match(/works with\s+(\d+)\s+clients\b/i);

  return {
    grade: gradeMatch ? gradeMatch[1].toUpperCase() : null,
    statusLabel: statusMatch ? statusMatch[1].trim() : null,
    version: versionMatch ? versionMatch[1] : null,
    toolsCount: toolsMatch ? Number.parseInt(toolsMatch[1], 10) : null,
    clientsCount: clientsMatch ? Number.parseInt(clientsMatch[1], 10) : null,
  };
}

async function fetchTextSafe(url: string, accept: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        Accept: accept,
        'User-Agent': 'FahiVideos-MCP-Hub/2.6.0 (+https://fahi-videos.auraajenticai.cloud)',
      },
      signal: AbortSignal.timeout(4500),
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function fetchLiveMcpDirectoryStatus(): Promise<LiveMcpDirectoryStatus> {
  const [badgeSvg, serverHtml, mcprushSvg] = await Promise.all([
    fetchTextSafe(MCPTRY_BADGE_URL, 'image/svg+xml,text/plain,*/*'),
    fetchTextSafe(MCPTRY_LISTING_URL, 'text/html,application/xhtml+xml,*/*'),
    fetchTextSafe(MCPRUSH_BADGE_URL, 'image/svg+xml,text/plain,*/*'),
  ]);

  const badgeParsed = badgeSvg ? parseMcptryBadgeSvg(badgeSvg) : null;
  const htmlParsed = serverHtml ? parseMcptryServerHtml(serverHtml) : null;
  const mcprushParsed = mcprushSvg ? parseMcprushCardSvg(mcprushSvg) : null;

  const rankScore = htmlParsed?.rankScore ?? badgeParsed?.rankScore ?? null;
  const rankMax = htmlParsed?.rankMax ?? badgeParsed?.rankMax ?? null;
  const mcptryReachable = Boolean(badgeSvg || serverHtml) && (rankScore !== null || badgeParsed?.status !== null);

  return {
    fetchedAt: new Date().toISOString(),
    mcptry: {
      reachable: mcptryReachable,
      status: badgeParsed?.status ?? (htmlParsed?.lastCheck?.endsWith(': ok') ? 'working' : null),
      rankScore,
      rankMax,
      uptime30d: htmlParsed?.uptime30d ?? null,
      uptime90d: htmlParsed?.uptime90d ?? null,
      latencyGermanyMs: htmlParsed?.latencyGermanyMs ?? null,
      protocol: htmlParsed?.protocol ?? null,
      lastCheck: htmlParsed?.lastCheck ?? null,
      breakdown: htmlParsed?.breakdown ?? [],
    },
    mcprush: {
      reachable: Boolean(mcprushSvg && mcprushParsed),
      grade: mcprushParsed?.grade ?? null,
      statusLabel: mcprushParsed?.statusLabel ?? null,
      version: mcprushParsed?.version ?? null,
      toolsCount: mcprushParsed?.toolsCount ?? null,
      clientsCount: mcprushParsed?.clientsCount ?? null,
    },
  };
}
