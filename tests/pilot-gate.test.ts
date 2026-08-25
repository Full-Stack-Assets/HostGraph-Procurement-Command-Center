import { describe, expect, it } from 'vitest';
import { evaluatePilotGate } from '../server/release/pilotGate';

const regionalPass = {
  result: 'PASS' as const,
  requiredCount: 10 as const,
  passCount: 10,
  cohortMode: 'BASELINE' as const,
  vendors: Array.from({ length: 10 }, (_, i) => ({
    vendorId: `vendor-${i}`,
    vendorName: `Vendor ${i}`,
    category: i < 5 ? 'FOOD' as const : 'BEVERAGE' as const,
    adapterVersion: '1.0.0',
    result: 'PASS' as const,
    verifiedAt: '2026-08-25T20:30:03.000Z',
    errorClass: null,
  })),
};

const reconciliation = {
  status: 'COMPLETE' as const,
  vendorId: 'vendor-1',
  accountId: 'acct',
  lineItemId: 'line',
  normalizedSku: 'sku',
  normalizedAccountUnitPrice: 10,
  normalizedPaidUnitPrice: 12,
  variance: 2,
  currency: 'USD' as const,
  sourceReceiptSha256: 'a'.repeat(64),
  calculationVersion: '1',
  findingId: 'finding-1',
  errorClass: null,
};

describe('pilotGate', () => {
  it('passes only after regional 10/10 and one complete real reconciliation', () => {
    expect(evaluatePilotGate(regionalPass, [reconciliation]).result).toBe('PASS');
    expect(evaluatePilotGate(regionalPass, []).result).toBe('FAIL');
  });

  it('cannot pass when regional gate failed', () => {
    expect(evaluatePilotGate({ ...regionalPass, result: 'FAIL', passCount: 9 }, [reconciliation]).result).toBe('FAIL');
  });
});
