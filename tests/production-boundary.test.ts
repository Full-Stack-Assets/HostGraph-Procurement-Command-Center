import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkProductionBoundary } from '../scripts/check-production-boundary.mjs';

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hostgraph-boundary-'));
  tempRoots.push(root);
  for (const dir of ['client/src', 'server', 'shared', 'dist/public/assets']) {
    fs.mkdirSync(path.join(root, dir), { recursive: true });
  }
  fs.writeFileSync(path.join(root, 'client/src/app.ts'), "export const product = 'HostGraph';\n");
  fs.writeFileSync(path.join(root, 'server/app.ts'), "export const api = '/api/v1';\n");
  fs.writeFileSync(path.join(root, 'shared/contracts.ts'), 'export type Mode = string;\n');
  fs.writeFileSync(path.join(root, 'dist/index.js'), 'console.log("HostGraph");\n');
  fs.writeFileSync(path.join(root, 'dist/public/assets/app.js'), 'window.hostgraph=true;\n');
  return root;
}

describe('production source boundary', () => {
  it('passes a clean HostGraph-only source and build graph', () => {
    expect(checkProductionBoundary(fixture())).toMatchObject({ ok: true, sourceFindings: [], buildFindings: [] });
  });

  it('rejects operator research imported into production source', () => {
    const root = fixture();
    fs.writeFileSync(path.join(root, 'server/app.ts'), "import '../operator/loop.js';\n");
    const result = checkProductionBoundary(root);
    expect(result.ok).toBe(false);
    expect(result.sourceFindings[0]?.file).toBe('server/app.ts');
  });

  it('rejects Manus debug markers in built artifacts', () => {
    const root = fixture();
    fs.writeFileSync(path.join(root, 'dist/public/assets/app.js'), 'fetch("/__manus__/logs");\n');
    const result = checkProductionBoundary(root);
    expect(result.ok).toBe(false);
    expect(result.buildFindings).toContainEqual({ file: 'dist/public/assets/app.js', marker: '__manus__' });
  });
});
