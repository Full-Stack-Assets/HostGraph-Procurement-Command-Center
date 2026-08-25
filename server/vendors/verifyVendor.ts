import { createHash } from 'node:crypto';
import { VendorVerificationReceiptSchema, type VendorVerificationReceipt } from '../../shared/contracts/vendors';
import type { VendorAdapter, VendorReadContext, VendorReadObservation } from './adapter';

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(object[key])}`).join(',')}}`;
}

function sha256(value: unknown) {
  return createHash('sha256').update(canonicalize(value)).digest('hex');
}

function elapsedMs(start: string, end: string) {
  return new Date(end).getTime() - new Date(start).getTime();
}

export interface VendorSeriesVerification {
  receipt: VendorVerificationReceipt;
  observations: VendorReadObservation[];
}

export async function verifyVendorSeries(
  adapter: VendorAdapter,
  context: VendorReadContext,
  now: () => Date = () => new Date(),
): Promise<VendorSeriesVerification> {
  const observations: VendorReadObservation[] = [];

  for (let index = 0; index < 3; index += 1) {
    observations.push(await adapter.verifyLiveRead(context));
  }

  const first = observations[0];
  const last = observations[observations.length - 1];
  const allPass = observations.length === 3 && observations.every((observation) => observation.result === 'PASS');
  const authorizationBasis = observations.find((observation) => observation.authorizationBasis)?.authorizationBasis ?? null;
  const sameIdentity = observations.every((observation) =>
    observation.normalizedRecords.every((record) => record.vendorId === context.vendorId && record.accountRef === context.accountRef),
  );
  const withinWindow = elapsedMs(first.requestedAt, last.respondedAt) <= 30 * 60 * 1000;

  const result = first.result === 'BLOCKED' || observations.some((observation) => observation.result === 'BLOCKED')
    ? 'BLOCKED'
    : allPass && sameIdentity && withinWindow
      ? 'PASS'
      : 'FAIL';

  const normalizedRecords = observations.flatMap((observation) => observation.normalizedRecords);
  const rawDigests = observations.map((observation) => sha256(observation.rawPayload));
  const normalizedDigest = sha256(normalizedRecords);
  const sourceRecordIds = Array.from(new Set(observations.flatMap((observation) => observation.sourceRecordIds))).sort();
  const errorClass = result === 'PASS'
    ? null
    : observations.find((observation) => observation.errorClass)?.errorClass ?? (!withinWindow ? 'SERIES_WINDOW_EXCEEDED' : !sameIdentity ? 'IDENTITY_MISMATCH' : 'SERIES_FAILED');

  const receipt = VendorVerificationReceiptSchema.parse({
    vendorId: context.vendorId,
    vendorName: context.vendorName,
    category: context.category,
    accountRef: context.accountRef,
    adapterVersion: adapter.version,
    authorizationBasis,
    operationId: first.operationId,
    requestedAt: first.requestedAt,
    respondedAt: last.respondedAt,
    sourceRecordIds,
    schemaVersion: first.schemaVersion,
    payloadSha256: sha256(rawDigests),
    normalizedSha256: normalizedDigest,
    freshAt: last.freshAt || now().toISOString(),
    result,
    errorClass,
    unsupportedFields: Array.from(new Set(observations.flatMap((observation) => observation.unsupportedFields))).sort(),
    commitSha: context.commitSha,
    buildSha256: context.buildSha256,
    seriesReadCount: observations.length,
    seriesStartedAt: first.requestedAt,
    seriesCompletedAt: last.respondedAt,
  });

  return { receipt, observations };
}

export { canonicalize, sha256 };
