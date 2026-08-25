import { afterEach, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { createApp } from '../server/app';

const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

async function request(path: string) {
  const server = createServer(createApp());
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No test server address');
  return fetch(`http://127.0.0.1:${address.port}${path}`, { redirect: 'manual' });
}

describe('HostGraph application edge security', () => {
  it('returns deterministic health with no-store', async () => {
    const response = await request('/health');
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });

  it('sets the approved security headers', async () => {
    const response = await request('/health');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(response.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
    expect(response.headers.get('content-security-policy')).toContain("object-src 'none'");
    expect(response.headers.get('permissions-policy')).toBe('camera=(), microphone=(), geolocation=()');
    expect(response.headers.get('x-powered-by')).toBeNull();
  });

  it('does not turn API or asset failures into the SPA document', async () => {
    const api = await request('/api/v1/not-a-route');
    expect(api.status).toBe(503);
    expect(api.headers.get('content-type')).toContain('application/json');
    expect((await request('/assets/not-a-real-file.js')).status).toBe(404);
  });
});
