import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const pages = [
  'client/src/pages/DashboardPage.tsx',
  'client/src/pages/MarginGapPage.tsx',
  'client/src/pages/ReorderPage.tsx',
  'client/src/pages/VendorsPage.tsx',
  'client/src/pages/ShrinkagePage.tsx',
  'client/src/pages/AlertsPage.tsx',
];

describe('HostGraph runtime source honesty', () => {
  it('has a truth-aware data hook', () => {
    const hook = fs.readFileSync('client/src/hooks/useHostGraphData.ts', 'utf8');
    expect(hook).toContain('configuredMode');
    expect(hook).toContain('createInitialReadState');
    expect(hook).toContain('applyReadFailure');
  });

  it('removes legacy useFetch from every operational route', () => {
    for (const path of pages) {
      const source = fs.readFileSync(path, 'utf8');
      expect(source, path).not.toContain("@/hooks/useFetch");
      expect(source, path).toContain('useHostGraphData');
    }
  });

  it('describes degraded live state without claiming demo fallback', () => {
    const primitives = fs.readFileSync('client/src/components/dashboard-primitives.tsx', 'utf8');
    expect(primitives).toContain('Live source degraded');
    expect(primitives).toContain('no synthetic substitution');
    expect(primitives).not.toContain('fell back to the mock Boston restaurant-group storyline');
  });

  it('does not hard-code the shell to synthetic mode', () => {
    const shell = fs.readFileSync('client/src/components/HostGraphShell.tsx', 'utf8');
    expect(shell).toContain('configuredHostGraphMode');
    expect(shell).not.toContain('Synthetic data mode');
  });
});
