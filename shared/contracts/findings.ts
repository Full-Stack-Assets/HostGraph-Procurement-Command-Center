import { z } from 'zod';
import { EvidenceStateSchema } from './core';

export const ReviewerStateSchema = z.enum(['UNREVIEWED', 'IN_REVIEW', 'APPROVED', 'REJECTED']);
export type ReviewerState = z.infer<typeof ReviewerStateSchema>;

export const FindingProvenanceSchema = z.object({
  sourceSystem: z.string().min(1),
  sourceRecordId: z.string().min(1),
  locator: z.string().min(1),
});

export const FindingSchema = z.object({
  id: z.string().min(1),
  accountId: z.string().min(1),
  locationId: z.string().min(1),
  vendorId: z.string().min(1),
  sourceRecordIds: z.array(z.string().min(1)).min(1),
  sourcePeriod: z.object({ from: z.string().min(1), to: z.string().min(1) }),
  observedAmount: z.number().finite(),
  calculatedVariance: z.number().finite(),
  calculationMethod: z.string().min(1),
  calculationVersion: z.string().min(1),
  confidence: z.number().min(0).max(1),
  evidenceState: EvidenceStateSchema,
  reviewerState: ReviewerStateSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  provenance: z.array(FindingProvenanceSchema).min(1),
});
export type Finding = z.infer<typeof FindingSchema>;

export const FindingValueBreakdownSchema = z.object({
  detected: z.number().finite(),
  clientConfirmed: z.number().finite(),
  realized: z.number().finite(),
});
export type FindingValueBreakdown = z.infer<typeof FindingValueBreakdownSchema>;
