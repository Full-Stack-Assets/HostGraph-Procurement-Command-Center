import { describe, expect, it } from 'vitest';
import { resolveRequiredVendorCohort } from '../server/vendors/resolveRequiredCohort';
import { evaluateRegionalVendorGate } from '../server/release/regionalGate';
import type { VendorVerificationReceipt } from '../shared/contracts/vendors';

const commitSha = 'a'.repeat(40);
const buildSha256 = 'b'.repeat(64);
const now = new Date('2026-08-25T21:00:00.000Z');

function receipt(vendorId: string, vendorName: string, category: 'FOOD' | 'BEVERAGE', result: 'PASS' | 'FAIL' | 'BLOCKED' = 'PASS'): VendorVerificationReceipt {
  return {
    vendorId,
    vendorName,
    category,
    accountRef: `acct-${vendorId}`,
    adapterVersion: '1.0.0',
    authorizationBasis: 'VENDOR_API',
    operationId: 'account-read',
    requestedAt: '2026-08-25T20:30:00.000Z',
    respondedAt: '2026-08-25T20:30:03.000Z',
    sourceRecordIds: ['source-1'],
    schemaVersion: '1',
    payloadSha256: 'c'.repeat(64),
    normalizedSha256: 'd'.repeat(64),
    freshAt: '2026-08-25T20:30:03.000Z',
    result,
    errorClass: result === 'PASS' ? null : 'TEST_FAILURE',
    unsupportedFields: [],
    commitSha,
    buildSha256,
    seriesReadCount: 3,
    seriesStartedAt: '2026-08-25T20:30:00.000Z',
    seriesCompletedAt: '2026-08-25T20:30:03.000Z',
  };
}

describe('regional vendor live gate', () => {
  const cohort = resolveRequiredVendorCohort();
  const passReceipts = cohort.vendors.map((vendor) => receipt(vendor.id, vendor.name, vendor.category));

  it('passes only at ten of ten', () => {
    expect(evaluateRegionalVendorGate({ cohort, receipts: passReceipts, commitSha, buildSha256, now }).result).toBe('PASS');
    const nine = passReceipts.slice(0, 9);
    const failed = evaluateRegionalVendorGate({ cohort, receipts: nine, commitSha, buildSha256, now });
    expect(failed.result).toBe('FAIL');
    expect(failed.passCount).toBe(9);
  });

  it('fails stale or mismatched receipts', () => {
    const stale = passReceipts.map((item, index) => index === 0 ? { ...item, seriesCompletedAt: '2026-08-23T20:00:00.000Z' } : item);
    expect(evaluateRegionalVendorGate({ cohort, receipts: stale, commitSha, buildSha256, now }).result).toBe('FAIL');
    const mismatch = passReceipts.map((item, index) => index === 0 ? { ...item, commitSha: 'e'.repeat(40) } : item);
    expect(evaluateRegionalVendorGate({ cohort, receipts: mismatch, commitSha, buildSha256, now }).result).toBe('FAIL');
  });

  it('does not contain an override input', () => {
    const result = evaluateRegionalVendorGate({ cohort, receipts: passReceipts.slice(0, 9), commitSha, buildSha256, now });
    expect(result.result).toBe('FAIL');
    expect(Object.keys(result)).not.toContain('force');
    expect(Object.keys(result)).not.toContain('approved');
  });
});
