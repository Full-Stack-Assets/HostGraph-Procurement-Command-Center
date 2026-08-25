import type { VendorAuthorizationBasis, VendorCategory, VendorId, VendorVerificationResult } from '../../shared/contracts/vendors';
import type { VendorCommercialRecord } from '../../shared/contracts/vendorCommercialRecord';

export interface VendorReadContext {
  vendorId: VendorId;
  vendorName: string;
  category: VendorCategory;
  accountRef: string;
  commitSha: string;
  buildSha256: string;
}

export interface VendorReadObservation {
  result: VendorVerificationResult;
  authorizationBasis: VendorAuthorizationBasis | null;
  operationId: string;
  requestedAt: string;
  respondedAt: string;
  sourceRecordIds: string[];
  rawPayload: unknown | null;
  normalizedRecords: VendorCommercialRecord[];
  schemaVersion: string;
  freshAt: string;
  errorClass: string | null;
  unsupportedFields: string[];
}

export interface VendorAdapter {
  readonly vendorId: VendorId;
  readonly version: string;
  verifyLiveRead(context: VendorReadContext): Promise<VendorReadObservation>;
}
