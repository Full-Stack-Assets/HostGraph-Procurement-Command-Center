import express from 'express';
import path from 'node:path';
import { createApiReadProxy } from './api/proxy';
import { createInvoiceUploadHandler } from './invoices/uploadRoute';

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https://d2xsxph8kpxj0f.cloudfront.net",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ');

export interface CreateAppOptions {
  staticPath?: string;
  upstreamApiBaseUrl?: string;
}

function setSecurityHeaders(_req: express.Request, res: express.Response, next: express.NextFunction) {
  res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
}

export function createApp(options: CreateAppOptions = {}) {
  const app = express();
  const staticPath = options.staticPath ?? path.resolve(import.meta.dirname, '..', 'dist', 'public');

  app.disable('x-powered-by');
  app.use(setSecurityHeaders);

  app.get('/health', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ status: 'ok' });
  });

  app.post(
    '/api/v1/invoices/upload',
    express.raw({ type: 'multipart/form-data', limit: 21 * 1024 * 1024 }),
    createInvoiceUploadHandler({ upstreamApiBaseUrl: options.upstreamApiBaseUrl }),
  );

  // Existing HostGraph analytics endpoints are read-only at this edge. Other
  // mutation routes remain explicitly unavailable unless they receive their
  // own bounded, reviewed handler like invoice upload above.
  app.use('/api', createApiReadProxy({ upstreamApiBaseUrl: options.upstreamApiBaseUrl }));

  app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (error && typeof error === 'object' && 'type' in error && error.type === 'entity.too.large') {
      res.status(413).json({ error: 'TOO_LARGE' });
      return;
    }
    next(error);
  });

  app.use(
    express.static(staticPath, {
      fallthrough: true,
      setHeaders(res, filePath) {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
          return;
        }
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          return;
        }
        res.setHeader('Cache-Control', 'public, max-age=3600');
      },
    }),
  );

  app.get('*', (req, res) => {
    const acceptHeader = req.headers.accept ?? '';
    const hasFileExtension = path.extname(req.path) !== '';
    const acceptsHtml = acceptHeader.includes('text/html') || acceptHeader.includes('*/*');

    if (hasFileExtension || !acceptsHtml) {
      res.status(404).end();
      return;
    }

    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(staticPath, 'index.html'), (error) => {
      if (error && !res.headersSent) res.status(404).end();
    });
  });

  return app;
}
