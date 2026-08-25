import { randomUUID } from 'node:crypto';
import type express from 'express';

export interface ApiProxyOptions {
  upstreamApiBaseUrl?: string;
  timeoutMs?: number;
}

function buildUpstreamUrl(baseUrl: string, originalUrl: string) {
  const base = new URL(baseUrl);
  if (base.protocol !== 'https:' && base.hostname !== 'localhost' && base.hostname !== '127.0.0.1') {
    throw new Error('HOSTGRAPH_UPSTREAM_API must use HTTPS outside local tests');
  }
  if (!originalUrl.startsWith('/api/')) throw new Error('Only /api routes may be proxied');
  return new URL(originalUrl, base).toString();
}

export function createApiReadProxy(options: ApiProxyOptions = {}): express.RequestHandler {
  return async (req, res) => {
    const correlationId = randomUUID();
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      res.status(405).json({ error: 'API_METHOD_NOT_ALLOWED', correlationId });
      return;
    }
    if (!options.upstreamApiBaseUrl) {
      res.status(503).json({ error: 'UPSTREAM_NOT_CONFIGURED', correlationId });
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 10_000);
    try {
      const headers = new Headers();
      const accept = req.headers.accept;
      if (accept) headers.set('Accept', accept);
      headers.set('X-HostGraph-Correlation-Id', correlationId);

      const upstream = await fetch(buildUpstreamUrl(options.upstreamApiBaseUrl, req.originalUrl), {
        method: req.method,
        headers,
        signal: controller.signal,
      });

      res.status(upstream.status);
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-HostGraph-Correlation-Id', correlationId);
      const contentType = upstream.headers.get('content-type');
      if (contentType) res.setHeader('Content-Type', contentType);

      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      const body = Buffer.from(await upstream.arrayBuffer());
      res.end(body);
    } catch (error) {
      const errorClass = error instanceof Error && error.name === 'AbortError' ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE';
      res.status(errorClass === 'UPSTREAM_TIMEOUT' ? 504 : 502).json({ error: errorClass, correlationId });
    } finally {
      clearTimeout(timer);
    }
  };
}
