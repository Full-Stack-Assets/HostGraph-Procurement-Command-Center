import { randomUUID } from 'node:crypto';
import type express from 'express';
import { InvoiceUploadValidationError, validateInvoiceUpload } from './uploadGuard';

export interface InvoiceUploadRouteOptions {
  upstreamApiBaseUrl?: string;
  timeoutMs?: number;
}

interface MultipartFilePart {
  originalName: string;
  declaredMime: string;
  buffer: Buffer;
}

function parseBoundary(contentType: string) {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  return (match?.[1] ?? match?.[2] ?? '').trim();
}

function parseSingleFilePart(body: Buffer, contentType: string): MultipartFilePart {
  const boundary = parseBoundary(contentType);
  if (!boundary || boundary.length > 200) {
    throw new InvoiceUploadValidationError('MALFORMED_CONTENT', 'Multipart upload boundary is missing or invalid.');
  }

  const marker = `--${boundary}`;
  const raw = body.toString('latin1');
  const segments = raw.split(marker).slice(1, -1);
  const fileParts: MultipartFilePart[] = [];

  for (let segment of segments) {
    if (segment.startsWith('\r\n')) segment = segment.slice(2);
    if (segment.endsWith('\r\n')) segment = segment.slice(0, -2);
    const headerEnd = segment.indexOf('\r\n\r\n');
    if (headerEnd < 0) continue;

    const headerText = segment.slice(0, headerEnd);
    let bodyText = segment.slice(headerEnd + 4);
    if (bodyText.endsWith('\r\n')) bodyText = bodyText.slice(0, -2);

    const disposition = headerText
      .split('\r\n')
      .find((line) => line.toLowerCase().startsWith('content-disposition:'));
    if (!disposition || !/name="file"/i.test(disposition)) continue;

    const filenameMatch = disposition.match(/filename="([^"]*)"/i);
    if (!filenameMatch?.[1]) {
      throw new InvoiceUploadValidationError('UNSAFE_NAME', 'Multipart invoice filename is missing.');
    }

    const mimeLine = headerText
      .split('\r\n')
      .find((line) => line.toLowerCase().startsWith('content-type:'));
    const declaredMime = mimeLine?.slice(mimeLine.indexOf(':') + 1).trim().toLowerCase() ?? '';

    fileParts.push({
      originalName: filenameMatch[1],
      declaredMime,
      buffer: Buffer.from(bodyText, 'latin1'),
    });
  }

  if (fileParts.length !== 1) {
    throw new InvoiceUploadValidationError('MALFORMED_CONTENT', 'Exactly one invoice file is required.');
  }
  return fileParts[0];
}

function resolveUpstreamUploadUrl(baseUrl: string) {
  const base = new URL(baseUrl);
  if (base.protocol !== 'https:' && base.hostname !== 'localhost' && base.hostname !== '127.0.0.1') {
    throw new Error('HOSTGRAPH_UPSTREAM_API must use HTTPS outside local tests');
  }
  return new URL('/api/v1/invoices/upload', base).toString();
}

export function createInvoiceUploadHandler(options: InvoiceUploadRouteOptions = {}): express.RequestHandler {
  return async (req, res) => {
    const correlationId = randomUUID();
    try {
      const requestContentType = req.headers['content-type'] ?? '';
      if (!requestContentType.toLowerCase().startsWith('multipart/form-data')) {
        res.status(415).json({ error: 'UNSUPPORTED_MEDIA_TYPE', correlationId });
        return;
      }
      if (!Buffer.isBuffer(req.body)) {
        res.status(400).json({ error: 'MALFORMED_MULTIPART', correlationId });
        return;
      }

      const filePart = parseSingleFilePart(req.body, requestContentType);
      const validated = validateInvoiceUpload(filePart.buffer, filePart.originalName, filePart.declaredMime);

      if (!options.upstreamApiBaseUrl) {
        res.status(503).json({ error: 'UPSTREAM_NOT_CONFIGURED', correlationId, checksumSha256: validated.checksumSha256 });
        return;
      }

      const form = new FormData();
      form.append('file', new Blob([filePart.buffer], { type: validated.mimeType }), validated.originalName);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000);

      try {
        const upstream = await fetch(resolveUpstreamUploadUrl(options.upstreamApiBaseUrl), {
          method: 'POST',
          headers: {
            'X-HostGraph-Correlation-Id': correlationId,
            'X-HostGraph-Content-SHA256': validated.checksumSha256,
          },
          body: form,
          signal: controller.signal,
        });

        const responseText = await upstream.text();
        if (!upstream.ok) {
          res.status(502).json({
            error: 'UPSTREAM_UPLOAD_FAILED',
            upstreamStatus: upstream.status,
            correlationId,
            checksumSha256: validated.checksumSha256,
          });
          return;
        }

        let upstreamBody: unknown;
        try {
          upstreamBody = responseText ? JSON.parse(responseText) : {};
        } catch {
          res.status(502).json({ error: 'UPSTREAM_INVALID_RESPONSE', correlationId });
          return;
        }

        if (!upstreamBody || typeof upstreamBody !== 'object' || Array.isArray(upstreamBody)) {
          res.status(502).json({ error: 'UPSTREAM_INVALID_RESPONSE', correlationId });
          return;
        }

        res.status(upstream.status).json({
          ...(upstreamBody as Record<string, unknown>),
          checksumSha256: validated.checksumSha256,
          correlationId,
        });
      } finally {
        clearTimeout(timer);
      }
    } catch (error) {
      if (error instanceof InvoiceUploadValidationError) {
        res.status(error.code === 'TOO_LARGE' ? 413 : 400).json({ error: error.code, correlationId });
        return;
      }
      const errorClass = error instanceof Error && error.name === 'AbortError' ? 'UPSTREAM_TIMEOUT' : 'UPLOAD_GATE_FAILURE';
      res.status(errorClass === 'UPSTREAM_TIMEOUT' ? 504 : 500).json({ error: errorClass, correlationId });
    }
  };
}
