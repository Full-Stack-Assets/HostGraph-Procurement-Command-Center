import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { evaluateBundleBudget } from '../scripts/check-bundle-budget.mjs';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

function fixture(frontendBytes: Buffer[], serverBytes = Buffer.from('console.log("ok")')) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hostgraph-bundle-'));
  roots.push(root);
  fs.mkdirSync(path.join(root, 'dist/public/assets'), { recursive: true });
  fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
  frontendBytes.forEach((bytes, index) => fs.writeFileSync(path.join(root, `dist/public/assets/chunk-${index}.js`), bytes));
  fs.writeFileSync(path.join(root, 'dist/index.js'), serverBytes);
  return root;
}

describe('bundle budget', () => {
  it('passes artifacts beneath every fixed limit', () => {
    const result = evaluateBundleBudget(fixture([Buffer.from('a'.repeat(1024)), Buffer.from('b'.repeat(2048))]));
    expect(result.ok).toBe(true);
    expect(result.findings).toEqual([]);
  });

  it('fails a single oversized gzip chunk', () => {
    const noisy = Buffer.alloc(200_000);
    for (let i = 0; i < noisy.length; i += 1) noisy[i] = i % 251;
    const result = evaluateBundleBudget(fixture([noisy]), {
      maxSingleGzipJsBytes: 100,
      maxTotalGzipJsBytes: 1_000_000,
      maxServerBundleBytes: 1_000_000,
    });
    expect(result.ok).toBe(false);
    expect(result.findings.some((item) => item.startsWith('SINGLE_CHUNK_BUDGET:'))).toBe(true);
  });

  it('fails missing build artifacts instead of silently passing', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hostgraph-bundle-missing-'));
    roots.push(root);
    const result = evaluateBundleBudget(root);
    expect(result.ok).toBe(false);
    expect(result.findings).toContain('NO_FRONTEND_JS_BUNDLES');
    expect(result.findings.some((item) => item.startsWith('SERVER_BUNDLE_BUDGET:'))).toBe(true);
  });
});
