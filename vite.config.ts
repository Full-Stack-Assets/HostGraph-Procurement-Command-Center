import { jsxLocPlugin } from '@builder.io/vite-plugin-jsx-loc';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin, type ViteDevServer } from 'vite';
import { vitePluginManusRuntime } from 'vite-plugin-manus-runtime';

const PROJECT_ROOT = import.meta.dirname;
const LOG_DIR = path.join(PROJECT_ROOT, '.manus-logs');
const MAX_LOG_SIZE_BYTES = 1024 * 1024;
const TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6);

type LogSource = 'browserConsole' | 'networkRequests' | 'sessionReplay';

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function trimLogFile(logPath: string, maxSize: number) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) return;

    const lines = fs.readFileSync(logPath, 'utf-8').split('\n');
    const keptLines: string[] = [];
    let keptBytes = 0;

    for (let i = lines.length - 1; i >= 0; i -= 1) {
      const lineBytes = Buffer.byteLength(`${lines[i]}\n`, 'utf-8');
      if (keptBytes + lineBytes > TRIM_TARGET_BYTES) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }

    fs.writeFileSync(logPath, keptLines.join('\n'), 'utf-8');
  } catch {
    // Development diagnostics must never break the application.
  }
}

function writeToLogFile(source: LogSource, entries: unknown[]) {
  if (entries.length === 0) return;

  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);
  const lines = entries.map((entry) => `[${new Date().toISOString()}] ${JSON.stringify(entry)}`);
  fs.appendFileSync(logPath, `${lines.join('\n')}\n`, 'utf-8');
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}

function vitePluginManusDebugCollector(): Plugin {
  return {
    name: 'manus-debug-collector',
    transformIndexHtml(html) {
      return {
        html,
        tags: [
          {
            tag: 'script',
            attrs: { src: '/__manus__/debug-collector.js', defer: true },
            injectTo: 'head',
          },
        ],
      };
    },
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/__manus__/logs', (req, res, next) => {
        if (req.method !== 'POST') return next();

        const handlePayload = (payload: any) => {
          if (payload.consoleLogs?.length) writeToLogFile('browserConsole', payload.consoleLogs);
          if (payload.networkRequests?.length) writeToLogFile('networkRequests', payload.networkRequests);
          if (payload.sessionEvents?.length) writeToLogFile('sessionReplay', payload.sessionEvents);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        };

        const reqBody = (req as { body?: unknown }).body;
        if (reqBody && typeof reqBody === 'object') {
          try {
            handlePayload(reqBody);
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: String(error) }));
          }
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            handlePayload(JSON.parse(body));
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: String(error) }));
          }
        });
      });
    },
  };
}

export function hostGraphPlugins(command: 'serve' | 'build'): Plugin[] {
  const plugins: Plugin[] = [react(), tailwindcss()];
  if (command === 'serve') {
    plugins.push(jsxLocPlugin(), vitePluginManusRuntime(), vitePluginManusDebugCollector());
  }
  return plugins;
}

export default defineConfig(({ command }) => ({
  plugins: hostGraphPlugins(command),
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'client', 'src'),
      '@shared': path.resolve(import.meta.dirname, 'shared'),
      '@assets': path.resolve(import.meta.dirname, 'attached_assets'),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, 'client'),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@tremor') || id.includes('recharts')) return 'charts';
          if (id.includes('@remix-run/router') || id.includes('react-router')) return 'router';
          if (id.includes('react-dom')) return 'react-dom';
          if (id.includes('/react/')) return 'react-core';
          if (id.includes('@radix-ui')) return 'radix';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('react-day-picker')) return 'date-picker';
          if (id.includes('embla-carousel-react')) return 'carousel';
          if (id.includes('sonner') || id.includes('next-themes')) return 'ui-runtime';
          return 'vendor';
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
    allowedHosts: [
      '.manuspre.computer',
      '.manus.computer',
      '.manus-asia.computer',
      '.manuscomputer.ai',
      '.manusvm.computer',
      'localhost',
      '127.0.0.1',
    ],
    fs: {
      strict: true,
      deny: ['**/.*'],
    },
  },
}));
