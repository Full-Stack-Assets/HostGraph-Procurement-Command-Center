import { afterEach, describe, expect, it } from 'vitest';
import { createServer, type RequestListener, type Server } from 'node:http';
import { createApp } from '../server/app';

const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

async function listen(listener: RequestListener) {
  const server = createServer(listener);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No test server address');
  return `http://127.0.0.1:${address.port}`;
}

async function hostGraphBase(upstreamApiBaseUrl?: string) {
  return listen(createApp({ upstreamApiBaseUrl }));
}

describe('HostGraph API read proxy', () => {
  it('forwards read-only API requests without falling through to the SPA', async () => {
    const upstream = await listen((req, res) => {
      expect(req.method).toBe('GET');
      expect(req.url).toBe('/api/v1/dashboard/summary?location=Boston');
      expect(req.headers['x-hostgraph-correlation-id']).toBeTruthy();
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ source: 'upstream', ok: true }));
    });
    const host = await hostGraphBase(upstream);

    const response = await fetch(`${host}/api/v1/dashboard/summary?location=Boston`);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-hostgraph-correlation-id')).toBeTruthy();
    await expect(response.json()).resolves.toEqual({ source: 'upstream', ok: true });
  });

  it('fails closed when the upstream API is not configured', async () => {
    const host = await hostGraphBase();
    const response = await fetch(`${host}/api/v1/dashboard/summary`);
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: 'UPSTREAM_NOT_CONFIGURED' });
  });

  it('rejects unreviewed API mutations', async () => {
    const upstream = await listen((_req, res) => {
      res.statusCode = 200;
      res.end('{}');
    });
    const host = await hostGraphBase(upstream);
    const response = await fetch(`${host}/api/v1/vendors/scorecard`, { method: 'POST' });
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET, HEAD');
  });
});
