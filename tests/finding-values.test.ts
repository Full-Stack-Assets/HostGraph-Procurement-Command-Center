import { describe, expect, it } from 'vitest';
import { summarizeFindingValues } from '@/features/findings/value';
import type { Finding } from '@shared/contracts/findings';

function finding(overrides: Partial<Finding>): Finding {
  return {
    id: 'f-1',
    accountId: 'acct-1',
    locationId: 'loc-1',
    vendorId: 'vendor-1',
    sourceRecordIds: ['src-1'],
    sourcePeriod: { from: '2026-08-01', to: '2026-08-25' },
    observedAmount: 100,
    calculatedVariance: 100,
    calculationMethod: 'variance',
    calculationVersion: '1.0.0',
    confidence: 0.9,
    evidenceState: 'DETECTED',
    reviewerState: 'UNREVIEWED',
    createdAt: '2026-08-25T20:00:00.000Z',
    updatedAt: '2026-08-25T20:00:00.000Z',
    provenance: [{ sourceSystem: 'vendor-api', sourceRecordId: 'src-1', locator: 'line-1' }],
    ...overrides,
  };
}

describe('finding value-state rollups', () => {
  it('never counts DETECTED value as realized', () => {
    const totals = summarizeFindingValues([
      finding({ id: 'detected', evidenceState: 'DETECTED', calculatedVariance: 100 }),
      finding({ id: 'realized', evidenceState: 'REALIZED', calculatedVariance: 40 }),
    ]);
    expect(totals.detected).toBe(140);
    expect(totals.clientConfirmed).toBe(40);
    expect(totals.realized).toBe(40);
  });

  it('counts confirmed value without promoting it to realized', () => {
    const totals = summarizeFindingValues([
      finding({ evidenceState: 'CLIENT_CONFIRMED', calculatedVariance: 75 }),
    ]);
    expect(totals.detected).toBe(75);
    expect(totals.clientConfirmed).toBe(75);
    expect(totals.realized).toBe(0);
  });

  it('does not treat OBSERVED records as detected opportunity', () => {
    const totals = summarizeFindingValues([
      finding({ evidenceState: 'OBSERVED', calculatedVariance: 300 }),
    ]);
    expect(totals).toEqual({ detected: 0, clientConfirmed: 0, realized: 0 });
  });
});
