import { describe, expect, it } from 'vitest';
import { verifyVendorSeries } from '../server/vendors/verifyVendor';
import type { VendorAdapter } from '../server/vendors/adapter';

const context = {
  vendorId: 'sysco-boston',
  vendorName: 'Sysco Boston',
  category: 'FOOD' as const,
  accountRef: 'acct-safe',
  commitSha: 'a'.repeat(40),
  buildSha256: 'b'.repeat(64),
};

function adapter(result: 'PASS' | 'FAIL' | 'BLOCKED' = 'PASS'): VendorAdapter {
  let call = 0;
  return {
    vendorId: 'sysco-boston',
    version: '1.0.0',
    async verifyLiveRead() {
      call += 1;
      const second = String(call).padStart(2, '0');
      return {
        result,
        authorizationBasis: result === 'BLOCKED' ? null : 'VENDOR_API' as const,
        operationId: 'prices',
        requestedAt: `2026-08-25T20:00:${second}.000Z`,
        respondedAt: `2026-08-25T20:00:${second}.500Z`,
        sourceRecordIds: result === 'PASS' ? [`record-${call}`] : [],
        rawPayload: result === 'PASS' ? { id: `record-${call}`, amount: 10 } : null,
        normalizedRecords: result === 'PASS' ? [{
          sourceRecordId: `record-${call}`,
          recordType: 'PRICE' as const,
          vendorId: 'sysco-boston',
          accountRef: 'acct-safe',
          amount: 10,
          currency: 'USD',
          rawFieldPresence: ['id', 'amount'],
        }] : [],
        schemaVersion: '1',
        freshAt: `2026-08-25T20:00:${second}.500Z`,
        errorClass: result === 'PASS' ? null : 'BLOCKED_TEST',
        unsupportedFields: [],
      };
    },
  };
}

describe('verifyVendorSeries', () => {
  it('passes only after three successful source-honest reads', async () => {
    const result = await verifyVendorSeries(adapter(), context);
    expect(result.receipt.result).toBe('PASS');
    expect(result.receipt.seriesReadCount).toBe(3);
    expect(result.receipt.payloadSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.receipt.normalizedSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('preserves BLOCKED rather than manufacturing PASS', async () => {
    const result = await verifyVendorSeries(adapter('BLOCKED'), context);
    expect(result.receipt.result).toBe('BLOCKED');
  });
});
