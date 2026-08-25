import type { ConfiguredTruthMode } from '@shared/contracts/core';

export function resolveConfiguredMode(rawMode?: string): ConfiguredTruthMode {
  return rawMode === 'LIVE' ? 'LIVE' : 'DEMO';
}

export const configuredHostGraphMode = resolveConfiguredMode(import.meta.env.VITE_HOSTGRAPH_MODE);
