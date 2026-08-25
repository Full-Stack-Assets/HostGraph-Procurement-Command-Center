import { afterEach, describe, expect, it } from 'vitest';
import { createServer, type RequestListener, type Server } from 'node:http';
import { createApp } from '../server/app';
import {
  MAX_INVOICE_FILE_BYTES,
  InvoiceUploadValidationError,
  validateInvoiceUpload,
} from '../server/invoices/uploadGuard';

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

async function postFile(host: string, bytes: Uint8Array, mime: string, name: string) {
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: mime }), name);
  return fetch(`${host}/api/v1/invoices/upload`, { method: 'POST', body: form });
}

describe('server invoice upload guard', () => {
  it('forwards one byte-validated invoice and returns the authoritative checksum', async () => {
    let upstreamCalls = 0;
    const upstream = await listen((req, res) => {
      upstreamCalls += 1;
      expect(req.method).toBe('POST');
      expect(req.url).toBe('/api/v1/invoices/upload');
      expect(req.headers['x-hostgraph-content-sha256']).toMatch(/^[a-f0-9]{64}$/);
      expect(req.headers['x-hostgraph-correlation-id']).toBeTruthy();
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      req.on('end', () => {
        expect(Buffer.concat(chunks).includes(Buffer.from('%PDF-1.7'))).toBe(true);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ jobId: 'job-verified-1', status: 'queued' }));
      });
    });
    const host = await listen(createApp({ upstreamApiBaseUrl: upstream }));

    const response = await postFile(host, Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n'), 'application/pdf', 'invoice.pdf');
    expect(response.status).toBe(200);
    const body = await response.json() as Record<string, unknown>;
    expect(body.jobId).toBe('job-verified-1');
    expect(body.checksumSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(body.correlationId).toBeTruthy();
    expect(upstreamCalls).toBe(1);
  });

  it('rejects executable bytes renamed as PDF before any upstream call', async () => {
    let upstreamCalls = 0;
    const upstream = await listen((_req, res) => {
      upstreamCalls += 1;
      res.end('{}');
    });
    const host = await listen(createApp({ upstreamApiBaseUrl: upstream }));

    const response = await postFile(host, Buffer.from('MZThis is not a PDF'), 'application/pdf', 'invoice.pdf');
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: 'MALFORMED_CONTENT' });
    expect(upstreamCalls).toBe(0);
  });

  it('fails closed without upstream configuration and never invents a job', async () => {
    const host = await listen(createApp());
    const response = await postFile(host, Buffer.from('%PDF-1.7\nvalidated'), 'application/pdf', 'invoice.pdf');
    expect(response.status).toBe(503);
    const body = await response.json() as Record<string, unknown>;
    expect(body.error).toBe('UPSTREAM_NOT_CONFIGURED');
    expect(body.jobId).toBeUndefined();
    expect(body.checksumSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rejects unsafe names, oversized payloads, and malformed CSV content', () => {
    expect(() => validateInvoiceUpload(Buffer.from('%PDF-1.7'), '../invoice.pdf', 'application/pdf')).toThrow(InvoiceUploadValidationError);
    expect(() => validateInvoiceUpload(Buffer.alloc(MAX_INVOICE_FILE_BYTES + 1), 'invoice.pdf', 'application/pdf')).toThrow(/20 MiB/);
    expect(() => validateInvoiceUpload(Buffer.from('not a delimited invoice'), 'invoice.csv', 'text/csv')).toThrow(/delimited header/);
    expect(() => validateInvoiceUpload(Buffer.from('a,b\n1,2\n'), 'invoice.csv', 'text/csv')).not.toThrow();
  });
});
