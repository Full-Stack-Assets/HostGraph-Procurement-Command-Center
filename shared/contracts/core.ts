import { z } from 'zod';

export const TruthModeSchema = z.enum(['DEMO', 'LIVE', 'DEGRADED']);
export type TruthMode = z.infer<typeof TruthModeSchema>;

export const ConfiguredTruthModeSchema = z.enum(['DEMO', 'LIVE']);
export type ConfiguredTruthMode = z.infer<typeof ConfiguredTruthModeSchema>;

export const EvidenceStateSchema = z.enum([
  'OBSERVED',
  'DETECTED',
  'CLIENT_CONFIRMED',
  'REALIZED',
]);
export type EvidenceState = z.infer<typeof EvidenceStateSchema>;

export const SourceMetadataSchema = z.object({
  sourceSystem: z.string().min(1),
  sourceRecordIds: z.array(z.string().min(1)).min(1),
  observedAt: z.string().datetime(),
  fetchedAt: z.string().datetime(),
  schemaVersion: z.string().min(1),
  correlationId: z.string().min(1),
  synthetic: z.boolean(),
});
export type SourceMetadata = z.infer<typeof SourceMetadataSchema>;

export const DataFreshnessSchema = z.object({
  fetchedAt: z.string().datetime(),
  staleAfter: z.string().datetime(),
});
export type DataFreshness = z.infer<typeof DataFreshnessSchema>;

export const ApiMetaSchema = z.object({
  contractVersion: z.string().min(1),
  source: SourceMetadataSchema,
  freshness: DataFreshnessSchema,
});
export type ApiMeta = z.infer<typeof ApiMetaSchema>;

export function apiEnvelopeSchema<T extends z.ZodTypeAny>(data: T) {
  return z.object({
    data,
    meta: ApiMetaSchema,
  });
}
