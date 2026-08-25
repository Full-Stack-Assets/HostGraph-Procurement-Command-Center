import { describe, expect, it } from 'vitest';
import { resolveRequiredVendorCohort } from '../server/vendors/resolveRequiredCohort';

const periodStart = '2026-07-01T00:00:00.000Z';
const periodEnd = '2026-07-31T23:59:59.000Z';

function row(id: string, category: 'FOOD' | 'BEVERAGE', spend: number) {
  return {
    vendorId: id,
    vendorName: id.toUpperCase(),
    category,
    trailingSpend: spend,
    currency: 'USD' as const,
    periodStart,
    periodEnd,
    sourceRecordIds: [`src-${id}`],
  };
}

describe('resolveRequiredVendorCohort', () => {
  it('uses the locked baseline without complete customer evidence', () => {
    expect(resolveRequiredVendorCohort().mode).toBe('BASELINE');
    expect(resolveRequiredVendorCohort([row('f1', 'FOOD', 100)]).mode).toBe('BASELINE');
  });

  it('replaces baseline only with five food and five beverage vendors', () => {
    const rows = [
      ...Array.from({ length: 6 }, (_, i) => row(`food-${i}`, 'FOOD', 1000 - i * 10)),
      ...Array.from({ length: 6 }, (_, i) => row(`bev-${i}`, 'BEVERAGE', 900 - i * 10)),
    ];
    const result = resolveRequiredVendorCohort(rows);
    expect(result.mode).toBe('CUSTOMER_TRAILING_SPEND');
    expect(result.vendors).toHaveLength(10);
    expect(result.vendors.filter((v) => v.category === 'FOOD')).toHaveLength(5);
    expect(result.vendors.filter((v) => v.category === 'BEVERAGE')).toHaveLength(5);
  });

  it('sums duplicate vendor rows only for identical periods', () => {
    const rows = [
      row('food-a', 'FOOD', 100),
      row('food-a', 'FOOD', 200),
      ...['b','c','d','e'].map((id, i) => row(`food-${id}`, 'FOOD', 90 - i)),
      ...['a','b','c','d','e'].map((id, i) => row(`bev-${id}`, 'BEVERAGE', 80 - i)),
    ];
    const result = resolveRequiredVendorCohort(rows);
    expect(result.vendors.find((v) => v.id === 'food-a')?.trailingSpend).toBe(300);
  });

  it('rejects ambiguous duplicate periods', () => {
    const bad = { ...row('food-a', 'FOOD', 100), periodEnd: '2026-08-31T23:59:59.000Z' };
    expect(() => resolveRequiredVendorCohort([row('food-a', 'FOOD', 100), bad])).toThrow(/Ambiguous/);
  });
});
