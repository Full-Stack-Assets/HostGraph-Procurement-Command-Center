import { z } from 'zod';

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/i);
const CommitShaSchema = z.string().regex(/^[a-f0-9]{40}$/i);

export const HostGraphReleaseStateSchema = z.enum([
  'DEMO_READY',
  'INTEGRATION_READY',
  'REGIONAL_DATA_READY',
  'PILOT_READY',
  'PAID_PILOT_READY',
  'PRODUCTION_READY',
]);

export type HostGraphReleaseState = z.infer<typeof HostGraphReleaseStateSchema>;

export const ReleaseVendorEntrySchema = z.object({
  vendorId: z.string().min(1),
  adapterVersion: z.string().min(1),
  receiptSha256: Sha256Schema,
  result: z.enum(['PASS', 'FAIL', 'BLOCKED']),
}).strict();

export const ReleaseManifestPayloadSchema = z.object({
  commitSha: CommitShaSchema,
  buildSha256: Sha256Schema,
  schemaVersions: z.record(z.string(), z.string()),
  ciReference: z.string().min(1),
  truthModePolicyVersion: z.string().min(1),
  cohortMode: z.enum(['BASELINE', 'CUSTOMER_TRAILING_SPEND']),
  vendors: z.array(ReleaseVendorEntrySchema).length(10),
  regionalGateResult: z.enum(['PASS', 'FAIL']),
  reconciliationResult: z.enum(['PASS', 'FAIL', 'NOT_RUN']),
  knownIssues: z.array(z.string()),
  releaseState: HostGraphReleaseStateSchema,
  generatedAt: z.string().datetime(),
}).strict();

export const SignedReleaseManifestSchema = z.object({
  payload: ReleaseManifestPayloadSchema,
  payloadSha256: Sha256Schema,
  hmacSha256: Sha256Schema.nullable(),
}).strict();

export type ReleaseManifestPayload = z.infer<typeof ReleaseManifestPayloadSchema>;
export type SignedReleaseManifest = z.infer<typeof SignedReleaseManifestSchema>;
