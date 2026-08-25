import { describe, expect, it } from 'vitest';
import { FindingSchema } from '@shared/contracts/findings';

describe('margin finding evidence contract', () => {
  it('requires source records and a calculation version', () => {
    expect(() =>
      FindingSchema.parse({
        id: 'f-1',
        evidenceState: 'DETECTED',
      }),
    ).toThrow();
  });

  it('accepts a fully source-linked detected finding without claiming realized value', () => {
    const finding = FindingSchema.parse({
      id: 'f-1',
      accountId: 'acct-1',
      locationId: 'loc-1',
      vendorId: 'vendor-1',
      sourceRecordIds: ['invoice-123'],
      sourcePeriod: { from: '2026-08-01', to: '2026-08-25' },
      observedAmount: 1000,
      calculatedVariance: 125,
      calculationMethod: 'account-price-vs-paid-price',
      calculationVersion: '1.0.0',
      confidence: 0.91,
      evidenceState: 'DETECTED',
      reviewerState: 'UNREVIEWED',
      createdAt: '2026-08-25T20:00:00.000Z',
      updatedAt: '2026-08-25T20:00:00.000Z',
      provenance: [{ sourceSystem: 'vendor-api', sourceRecordId: 'invoice-123', locator: 'line-4' }],
    });

    expect(finding.evidenceState).toBe('DETECTED');
    expect(finding.calculatedVariance).toBe(125);
  });
});
