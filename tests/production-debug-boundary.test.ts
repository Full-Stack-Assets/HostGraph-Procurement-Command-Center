import { describe, expect, it } from 'vitest';
import { hostGraphPlugins } from '../vite.config';

function names(command: 'serve' | 'build') {
  return hostGraphPlugins(command).map((plugin) => plugin.name);
}

describe('production diagnostics boundary', () => {
  it('excludes Manus and JSX-location diagnostics from production builds', () => {
    const buildNames = names('build').join(' ').toLowerCase();
    expect(buildNames).not.toContain('manus');
    expect(buildNames).not.toContain('debug-collector');
    expect(buildNames).not.toContain('jsx-loc');
  });

  it('retains development diagnostics only while serving locally', () => {
    const serveNames = names('serve').join(' ').toLowerCase();
    expect(serveNames).toContain('manus');
    expect(serveNames).toContain('debug');
  });
});
