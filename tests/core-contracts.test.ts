import { describe, expect, it } from 'vitest';
import {
  EvidenceStateSchema,
  SourceMetadataSchema,
  TruthModeSchema,
} from '@shared/contracts/core';

describe('HostGraph core contracts', () => {
  it('accepts only DEMO, LIVE, and DEGRADED truth modes', () => {
    expect(TruthModeSchema.parse('DEMO')).toBe('DEMO');
    expect(TruthModeSchema.parse('LIVE')).toBe('LIVE');
    expect(TruthModeSchema.parse('DEGRADED')).toBe('DEGRADED');
    expect(() => TruthModeSchema.parse('fallback')).toThrow();
  });

  it('enforces the evidence lifecycle vocabulary', () => {
    for (const state of ['OBSERVED', 'DETECTED', 'CLIENT_CONFIRMED', 'REALIZED']) {
      expect(EvidenceStateSchema.parse(state)).toBe(state);
    }
    expect(() => EvidenceStateSchema.parse('SAVED')).toThrow();
  });

  it('requires provenance timestamps and identifiers', () => {
    expect(() =>
      SourceMetadataSchema.parse({
        sourceSystem: 'vendor-api',
      }),
    ).toThrow();
  });
});
