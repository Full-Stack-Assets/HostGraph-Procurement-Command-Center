import { describe, expect, it } from 'vitest';
import { createReleaseManifest } from '../server/release/createManifest';
import { verifyReleaseManifest } from '../server/release/verifyManifest';
import type { VendorVerificationReceipt } from '../shared/contracts/vendors';

const commitSha = 'a'.repeat(40);
const buildSha256 = 'b'.repeat(64);
const hmacKey = 'hostgraph-test-key';

const receipts: VendorVerificationReceipt[] = Array.from({ length: 10 }, (_, i) => ({
  vendorId: `vendor-${i}`,
  vendorName: `Vendor ${i}`,
  category: i < 5 ? 'FOOD' : 'BEVERAGE',
  accountRef: `acct-${i}`,
  adapterVersion: '1.0.0',
  authorizationBasis: 'VENDOR_API',
  operationId: 'read',
  requestedAt: '2026-08-25T20:00:00.000Z',
  respondedAt: '2026-08-25T20:00:01.000Z',
  sourceRecordIds: [`record-${i}`],
  schemaVersion: '1',
  payloadSha256: 'c'.repeat(64),
  normalizedSha256: 'd'.repeat(64),
  freshAt: '2026-08-25T20:00:01.000Z',
  result: 'PASS',
  errorClass: null,
  unsupportedFields: [],
  commitSha,
  buildSha256,
  seriesReadCount: 3,
  seriesStartedAt: '2026-08-25T20:00:00.000Z',
  seriesCompletedAt: '2026-08-25T20:00:03.000Z',
}));

const regionalGate = {
  result: 'PASS' as const,
  requiredCount: 10 as const,
  passCount: 10,
  cohortMode: 'BASELINE' as const,
  vendors: receipts.map((receipt) => ({
    vendorId: receipt.vendorId,
    vendorName: receipt.vendorName,
    category: receipt.category,
    adapterVersion: receipt.adapterVersion,
    result: 'PASS' as const,
    verifiedAt: receipt.seriesCompletedAt,
    errorClass: null,
  })),
};

describe('release manifest', () => {
  it('requires HMAC for REGIONAL_DATA_READY and verifies intact payload', () => {
    expect(() => createReleaseManifest({
      commitSha, buildSha256, schemaVersions: { vendor: '1' }, ciReference: 'run-1',
      truthModePolicyVersion: '1', regionalGate, receipts, reconciliationResult: 'NOT_RUN',
      releaseState: 'REGIONAL_DATA_READY', generatedAt: '2026-08-25T21:00:00.000Z',
    })).toThrow(/HMAC/);

    const manifest = createReleaseManifest({
      commitSha, buildSha256, schemaVersions: { vendor: '1' }, ciReference: 'run-1',
      truthModePolicyVersion: '1', regionalGate, receipts, reconciliationResult: 'NOT_RUN',
      releaseState: 'REGIONAL_DATA_READY', hmacKey, generatedAt: '2026-08-25T21:00:00.000Z',
    });
    expect(verifyReleaseManifest(manifest, hmacKey)).toEqual({ ok: true });
  });

  it('rejects tampered payloads', () => {
    const manifest = createReleaseManifest({
      commitSha, buildSha256, schemaVersions: { vendor: '1' }, ciReference: 'run-1',
      truthModePolicyVersion: '1', regionalGate, receipts, reconciliationResult: 'NOT_RUN',
      releaseState: 'REGIONAL_DATA_READY', hmacKey, generatedAt: '2026-08-25T21:00:00.000Z',
    });
    const tampered = { ...manifest, payload: { ...manifest.payload, knownIssues: ['tampered'] } };
    expect(verifyReleaseManifest(tampered, hmacKey).ok).toBe(false);
  });
});
