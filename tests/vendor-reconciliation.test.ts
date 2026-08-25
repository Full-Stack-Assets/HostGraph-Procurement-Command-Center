import { describe, expect, it } from 'vitest';
import { reconcileVendorLine } from '../server/reconciliation/reconcileVendorLine';
import { sha256 } from '../server/vendors/verifyVendor';
import type { VendorVerificationReceipt } from '../shared/contracts/vendors';

const receipt: VendorVerificationReceipt = {
  vendorId: 'sysco-boston',
  vendorName: 'Sysco Boston',
  category: 'FOOD',
  accountRef: 'acct-safe',
  adapterVersion: '1.0.0',
  authorizationBasis: 'VENDOR_API',
  operationId: 'account-read',
  requestedAt: '2026-08-25T20:30:00.000Z',
  respondedAt: '2026-08-25T20:30:03.000Z',
  sourceRecordIds: ['invoice-1'],
  schemaVersion: '1',
  payloadSha256: 'a'.repeat(64),
  normalizedSha256: 'b'.repeat(64),
  freshAt: '2026-08-25T20:30:03.000Z',
  result: 'PASS',
  errorClass: null,
  unsupportedFields: [],
  commitSha: 'c'.repeat(40),
  buildSha256: 'd'.repeat(64),
  seriesReadCount: 3,
  seriesStartedAt: '2026-08-25T20:30:00.000Z',
  seriesCompletedAt: '2026-08-25T20:30:03.000Z',
};

function input() {
  return {
    vendorId: 'sysco-boston',
    accountId: 'acct-safe',
    locationId: 'location-1',
    vendorSourceRecordId: 'invoice-1',
    transactionId: 'txn-1',
    lineItemId: 'line-1',
    normalizedSku: 'MOZZ-6LB',
    packQuantity: 1,
    unitQuantity: 6,
    unit: 'LB',
    accountPrice: 70.8,
    paidPrice: 86.4,
    currency: 'USD' as const,
    sourceReceiptSha256: sha256(receipt),
    sourceSynthetic: false as const,
    calculationVersion: '1',
    sourcePeriod: { from: '2026-08-01T00:00:00.000Z', to: '2026-08-25T00:00:00.000Z' },
  };
}

describe('reconcileVendorLine', () => {
  it('creates a DETECTED finding only from a matching PASS receipt', () => {
    const result = reconcileVendorLine(input(), receipt);
    expect(result.record.status).toBe('COMPLETE');
    expect(result.finding?.evidenceState).toBe('DETECTED');
    expect(result.record.variance).toBeCloseTo((86.4 - 70.8) / 6);
  });

  it('fails closed when source receipt digest or identity mismatches', () => {
    expect(reconcileVendorLine({ ...input(), sourceReceiptSha256: 'e'.repeat(64) }, receipt).finding).toBeNull();
    expect(reconcileVendorLine({ ...input(), accountId: 'other' }, receipt).record.status).toBe('FAIL');
  });

  it('preserves beverage distributor metadata', () => {
    const bevReceipt = { ...receipt, vendorId: 'martignetti', vendorName: 'Martignetti Companies', category: 'BEVERAGE' as const };
    bevReceipt.accountRef = 'bev-acct';
    bevReceipt.sourceRecordIds = ['bev-invoice'];
    const bevInput = {
      ...input(),
      vendorId: 'martignetti',
      accountId: 'bev-acct',
      vendorSourceRecordId: 'bev-invoice',
      sourceReceiptSha256: sha256(bevReceipt),
      beverage: { categoryClass: 'WINE', packageFormat: '12x750ml', distributorId: 'martignetti' },
    };
    expect(reconcileVendorLine(bevInput, bevReceipt).record.beverage?.packageFormat).toBe('12x750ml');
  });
});
