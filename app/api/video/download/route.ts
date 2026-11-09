import { validatePublicMediaUrl } from '@/lib/public-media';

export const dynamic = 'force-dynamic';

const MAX_DOWNLOAD_BYTES = 250 * 1024 ** 2;
const RESPONSE_HEADER_TIMEOUT_MS = 20_000;
const STREAM_IDLE_TIMEOUT_MS = 45_000;

async function fetchHeaders(target: URL, range: string | null) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(new Error('The media source did not respond in time.')),
    RESPONSE_HEADER_TIMEOUT_MS,
  );

  try {
    const response = await fetch(target, {
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        ...(range ? { Range: range } : {}),
      },
    });
    return { response, controller };
  } finally {
    clearTimeout(timeout);
  }
}

function streamWithLimits(response: Response, controller: AbortController) {
  const reader = response.body!.getReader();
  let bytes = 0;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;

  const clearIdleTimer = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = undefined;
  };

  const resetIdleTimer = () => {
    clearIdleTimer();
    idleTimer = setTimeout(
      () => controller.abort(new Error('The media stream stopped sending data.')),
      STREAM_IDLE_TIMEOUT_MS,
    );
  };

  return new ReadableStream<Uint8Array>({
    async pull(streamController) {
      resetIdleTimer();
      try {
        const { done, value } = await reader.read();
        clearIdleTimer();
        if (done) {
          streamController.close();
          return;
        }

        bytes += value.byteLength;
        if (bytes > MAX_DOWNLOAD_BYTES) {
          controller.abort(new Error('Media exceeds the 250 MB download limit.'));
          streamController.error(new Error('Media exceeds the 250 MB download limit.'));
          return;
        }
        streamController.enqueue(value);
      } catch (error) {
        clearIdleTimer();
        streamController.error(error);
      }
    },
    async cancel(reason) {
      clearIdleTimer();
      controller.abort(reason);
      await reader.cancel(reason).catch(() => undefined);
    },
  });
}

export async function GET(req: Request) {
  try {
    let raw = new URL(req.url).searchParams.get('url');
    if (!raw) return Response.json({ error: 'Missing media link.' }, { status: 400 });

    let response: Response | undefined;
    let responseController: AbortController | undefined;
    for (let redirects = 0; redirects < 5; redirects++) {
      const target = await validatePublicMediaUrl(raw);
      const result = await fetchHeaders(target, req.headers.get('range'));
      response = result.response;
      responseController = result.controller;

      if (![301, 302, 303, 307, 308].includes(response.status)) break;

      const location = response.headers.get('location');
      await response.body?.cancel();
      responseController.abort();
      if (!location) throw new Error('The media redirect is invalid.');
      raw = new URL(location, target).href;
      response = undefined;
      responseController = undefined;
    }

    if (!response?.ok || !response.body || !responseController) {
      const status = response?.status || 502;
      return Response.json({
        error: status === 403
          ? 'The source denied this download (403). The link may be private or expired.'
          : status === 416
            ? 'The requested resume range is no longer available. Extract the link again and retry.'
            : status === 429
              ? 'The media provider is temporarily rate limiting downloads. Try again later.'
              : `Media source is unavailable (${status}).`,
      }, { status: status === 416 || status === 429 ? status : 502 });
    }

    const mime = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!/^(video|audio)\//.test(mime)) {
      await response.body.cancel();
      responseController.abort();
      return Response.redirect(raw, 302);
    }

    const contentRange = response.headers.get('content-range');
    const rangeTotal = contentRange?.match(/^bytes\s+\d+-\d+\/(\d+)$/i);
    const totalLength = rangeTotal ? Number(rangeTotal[1]) : Number.NaN;
    if (Number.isFinite(totalLength) && totalLength > MAX_DOWNLOAD_BYTES) {
      await response.body.cancel();
      responseController.abort();
      return Response.json({ error: 'Media exceeds the 250 MB download limit.' }, { status: 413 });
    }

    const lengthHeader = response.headers.get('content-length');
    const declaredLength = lengthHeader === null ? Number.NaN : Number(lengthHeader);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_DOWNLOAD_BYTES) {
      await response.body.cancel();
      responseController.abort();
      return Response.json({ error: 'Media exceeds the 250 MB download limit.' }, { status: 413 });
    }

    const extension = mime.includes('webm')
      ? 'webm'
      : mime.includes('mpeg')
        ? 'mp3'
        : mime === 'audio/mp4'
          ? 'm4a'
          : mime.startsWith('audio/')
            ? 'audio'
            : 'mp4';
    const headers = new Headers({
      'Content-Type': mime,
      'Content-Disposition': `attachment; filename="fahi-media.${extension}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    if (response.status === 206 && contentRange) {
      headers.set('Content-Range', contentRange);
      headers.set('Accept-Ranges', 'bytes');
    } else if (!req.headers.get('range')) {
      headers.set('Accept-Ranges', 'bytes');
    }
    if (Number.isFinite(declaredLength) && declaredLength >= 0) {
      headers.set('Content-Length', String(declaredLength));
    }

    return new Response(streamWithLimits(response, responseController), {
      status: response.status === 206 ? 206 : 200,
      headers,
    });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : 'Media download failed.',
    }, { status: 400 });
  }
}
