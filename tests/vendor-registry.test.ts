import { describe, expect, it } from 'vitest';
import {
  BaselineVendorIdSchema,
  VendorVerificationReceiptSchema,
} from '@shared/contracts/vendors';
import { REGIONAL_VENDOR_COHORT } from '../server/vendors/registry';

describe('MA/RI regional vendor release cohort', () => {
  it('locks exactly five food and five beverage vendors with ten unique IDs', () => {
    expect(REGIONAL_VENDOR_COHORT.filter((vendor) => vendor.category === 'FOOD')).toHaveLength(5);
    expect(REGIONAL_VENDOR_COHORT.filter((vendor) => vendor.category === 'BEVERAGE')).toHaveLength(5);
    expect(new Set(REGIONAL_VENDOR_COHORT.map((vendor) => vendor.id)).size).toBe(10);
    for (const vendor of REGIONAL_VENDOR_COHORT) {
      expect(BaselineVendorIdSchema.parse(vendor.id)).toBe(vendor.id);
      expect(vendor.required).toBe(true);
    }
  });

  it('contains the approved vendor names', () => {
    expect(REGIONAL_VENDOR_COHORT.map((vendor) => vendor.name)).toEqual([
      'Sysco Boston',
      'US Foods',
      'Performance Foodservice Boston',
      'Baldor Specialty Foods Boston',
      'Costa Fruit & Produce',
      'Martignetti Companies',
      "Southern Glazer's Beverage Company MA/RI",
      'M.S. Walker',
      'Mancini Beverage',
      'Sheehan Family Companies regional network',
    ]);
  });

  it('rejects secret-bearing receipt fields', () => {
    const base = {
      vendorId: 'sysco-boston',
      vendorName: 'Sysco Boston',
      category: 'FOOD',
      accountRef: 'acct-hash-1',
      adapterVersion: 'blocked-1',
      authorizationBasis: 'VENDOR_API',
      operationId: 'account-read',
      requestedAt: '2026-08-25T20:00:00.000Z',
      respondedAt: '2026-08-25T20:00:01.000Z',
      sourceRecordIds: ['record-1'],
      schemaVersion: '1',
      payloadSha256: 'a'.repeat(64),
      normalizedSha256: 'b'.repeat(64),
      freshAt: '2026-08-25T20:00:01.000Z',
      result: 'PASS',
      errorClass: null,
      unsupportedFields: [],
      commitSha: 'c'.repeat(40),
      buildSha256: 'd'.repeat(64),
      seriesReadCount: 3,
      seriesStartedAt: '2026-08-25T20:00:00.000Z',
      seriesCompletedAt: '2026-08-25T20:00:03.000Z',
    };

    expect(() => VendorVerificationReceiptSchema.parse({ ...base, token: 'secret' })).toThrow();
    expect(() => VendorVerificationReceiptSchema.parse({ ...base, authorization: 'Bearer secret' })).toThrow();
  });
});
