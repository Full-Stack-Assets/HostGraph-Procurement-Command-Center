import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const BUNDLE_LIMITS = Object.freeze({
  maxSingleGzipJsBytes: 160 * 1024,
  maxTotalGzipJsBytes: 420 * 1024,
  maxServerBundleBytes: 500 * 1024,
});

function walkJs(root) {
  if (!fs.existsSync(root)) return [];
  const stack = [root];
  const files = [];
  while (stack.length) {
    const current = stack.pop();
    const stat = fs.statSync(current);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(current)) stack.push(path.join(current, entry));
    } else if (current.endsWith('.js')) {
      files.push(current);
    }
  }
  return files.sort();
}

export function evaluateBundleBudget(repoRoot, limits = BUNDLE_LIMITS) {
  const assetsRoot = path.join(repoRoot, 'dist/public/assets');
  const serverBundle = path.join(repoRoot, 'dist/index.js');
  const jsFiles = walkJs(assetsRoot);
  const chunks = jsFiles.map((file) => {
    const bytes = fs.readFileSync(file);
    return {
      file: path.relative(repoRoot, file),
      rawBytes: bytes.length,
      gzipBytes: gzipSync(bytes, { level: 9 }).length,
    };
  });
  const totalGzipJsBytes = chunks.reduce((sum, chunk) => sum + chunk.gzipBytes, 0);
  const serverBundleBytes = fs.existsSync(serverBundle) ? fs.statSync(serverBundle).size : Number.POSITIVE_INFINITY;
  const findings = [];

  if (chunks.length === 0) findings.push('NO_FRONTEND_JS_BUNDLES');
  for (const chunk of chunks) {
    if (chunk.gzipBytes > limits.maxSingleGzipJsBytes) {
      findings.push(`SINGLE_CHUNK_BUDGET:${chunk.file}:${chunk.gzipBytes}`);
    }
  }
  if (totalGzipJsBytes > limits.maxTotalGzipJsBytes) {
    findings.push(`TOTAL_JS_BUDGET:${totalGzipJsBytes}`);
  }
  if (serverBundleBytes > limits.maxServerBundleBytes) {
    findings.push(`SERVER_BUNDLE_BUDGET:${serverBundleBytes}`);
  }

  return {
    ok: findings.length === 0,
    limits,
    chunks,
    totalGzipJsBytes,
    serverBundleBytes,
    findings,
  };
}

function main() {
  const result = evaluateBundleBudget(process.cwd());
  console.log(`HostGraph JS gzip total: ${result.totalGzipJsBytes} bytes`);
  console.log(`HostGraph server bundle: ${result.serverBundleBytes} bytes`);
  for (const chunk of result.chunks) console.log(`${chunk.file}: ${chunk.gzipBytes} gzip bytes`);
  if (!result.ok) {
    for (const finding of result.findings) console.error(finding);
    process.exitCode = 1;
    return;
  }
  console.log('HostGraph bundle budget: PASS');
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === pathToFileURL(thisFile).href) main();
