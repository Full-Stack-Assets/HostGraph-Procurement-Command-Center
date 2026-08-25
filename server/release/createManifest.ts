import { createHash, createHmac } from 'node:crypto';
import { ReleaseManifestPayloadSchema, SignedReleaseManifestSchema, type HostGraphReleaseState, type ReleaseManifestPayload, type SignedReleaseManifest } from '../../shared/contracts/releaseManifest';
import type { VendorVerificationReceipt } from '../../shared/contracts/vendors';
import type { RegionalGateResult } from './regionalGate';
import { canonicalize } from '../vendors/verifyVendor';

function sha256(value: unknown) {
  return createHash('sha256').update(canonicalize(value)).digest('hex');
}

function receiptDigest(receipt: VendorVerificationReceipt) {
  return sha256(receipt);
}

const protectedStates = new Set<HostGraphReleaseState>([
  'REGIONAL_DATA_READY',
  'PILOT_READY',
  'PAID_PILOT_READY',
  'PRODUCTION_READY',
]);

export function createReleaseManifest(input: {
  commitSha: string;
  buildSha256: string;
  schemaVersions: Record<string, string>;
  ciReference: string;
  truthModePolicyVersion: string;
  regionalGate: RegionalGateResult;
  receipts: VendorVerificationReceipt[];
  reconciliationResult: 'PASS' | 'FAIL' | 'NOT_RUN';
  knownIssues?: string[];
  releaseState: HostGraphReleaseState;
  hmacKey?: string;
  generatedAt?: string;
}): SignedReleaseManifest {
  if (protectedStates.has(input.releaseState) && !input.hmacKey) {
    throw new Error('HOSTGRAPH_RELEASE_HMAC_KEY is required for REGIONAL_DATA_READY or later');
  }
  if (protectedStates.has(input.releaseState) && input.regionalGate.result !== 'PASS') {
    throw new Error('Regional vendor gate must PASS before protected release states');
  }
  if (['PILOT_READY', 'PAID_PILOT_READY', 'PRODUCTION_READY'].includes(input.releaseState) && input.reconciliationResult !== 'PASS') {
    throw new Error('Real vendor reconciliation must PASS before PILOT_READY or later');
  }

  const receiptByVendor = new Map(input.receipts.map((receipt) => [receipt.vendorId, receipt]));
  const payload: ReleaseManifestPayload = ReleaseManifestPayloadSchema.parse({
    commitSha: input.commitSha,
    buildSha256: input.buildSha256,
    schemaVersions: input.schemaVersions,
    ciReference: input.ciReference,
    truthModePolicyVersion: input.truthModePolicyVersion,
    cohortMode: input.regionalGate.cohortMode,
    vendors: input.regionalGate.vendors.map((vendor) => {
      const receipt = receiptByVendor.get(vendor.vendorId);
      if (!receipt) throw new Error(`Missing vendor receipt for ${vendor.vendorId}`);
      return {
        vendorId: vendor.vendorId,
        adapterVersion: receipt.adapterVersion,
        receiptSha256: receiptDigest(receipt),
        result: vendor.result,
      };
    }),
    regionalGateResult: input.regionalGate.result,
    reconciliationResult: input.reconciliationResult,
    knownIssues: input.knownIssues ?? [],
    releaseState: input.releaseState,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
  });

  const payloadSha256 = sha256(payload);
  const hmacSha256 = input.hmacKey
    ? createHmac('sha256', input.hmacKey).update(canonicalize(payload)).digest('hex')
    : null;

  return SignedReleaseManifestSchema.parse({ payload, payloadSha256, hmacSha256 });
}
