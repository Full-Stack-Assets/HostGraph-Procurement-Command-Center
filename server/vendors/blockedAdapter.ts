import type { VendorAdapter, VendorReadContext, VendorReadObservation } from './adapter';
import type { VendorId } from '../../shared/contracts/vendors';

export class BlockedVendorAdapter implements VendorAdapter {
  readonly version = 'blocked-1';

  constructor(
    public readonly vendorId: VendorId,
    private readonly reason = 'MISSING_AUTHORIZED_CONFIGURATION',
  ) {}

  async verifyLiveRead(context: VendorReadContext): Promise<VendorReadObservation> {
    const now = new Date().toISOString();
    return {
      result: 'BLOCKED',
      authorizationBasis: null,
      operationId: 'blocked',
      requestedAt: now,
      respondedAt: now,
      sourceRecordIds: [],
      rawPayload: null,
      normalizedRecords: [],
      schemaVersion: '1',
      freshAt: now,
      errorClass: this.reason,
      unsupportedFields: [],
    };
  }
}
