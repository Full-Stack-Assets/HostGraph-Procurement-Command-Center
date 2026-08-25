import { z } from 'zod';

export const InvoiceStateSchema = z.enum([
  'UPLOADED',
  'PARSING',
  'NEEDS_REVIEW',
  'VERIFIED',
  'INCLUDED_IN_ANALYSIS',
  'FAILED',
  'REJECTED',
]);
export type InvoiceState = z.infer<typeof InvoiceStateSchema>;

export const INVOICE_TRANSITIONS: Record<InvoiceState, readonly InvoiceState[]> = {
  UPLOADED: ['PARSING', 'REJECTED', 'FAILED'],
  PARSING: ['NEEDS_REVIEW', 'FAILED', 'REJECTED'],
  NEEDS_REVIEW: ['VERIFIED', 'REJECTED'],
  VERIFIED: ['INCLUDED_IN_ANALYSIS', 'REJECTED'],
  INCLUDED_IN_ANALYSIS: [],
  FAILED: ['PARSING', 'REJECTED'],
  REJECTED: [],
};

export function canTransitionInvoice(from: InvoiceState, to: InvoiceState) {
  return INVOICE_TRANSITIONS[from].includes(to);
}

export const ExtractedInvoiceFieldSchema = z.object({
  field: z.string().min(1),
  rawValue: z.unknown(),
  normalizedValue: z.unknown(),
  confidence: z.number().min(0).max(1),
  sourceLocator: z.string().min(1),
  verified: z.boolean(),
});
export type ExtractedInvoiceField = z.infer<typeof ExtractedInvoiceFieldSchema>;

export const InvoiceRecordSchema = z.object({
  id: z.string().min(1),
  state: InvoiceStateSchema,
  checksumSha256: z.string().regex(/^[a-f0-9]{64}$/i),
  originalFilename: z.string().min(1),
  safeFilename: z.string().min(1),
  uploadedAt: z.string().datetime(),
  accountId: z.string().min(1),
  locationId: z.string().min(1),
  vendorId: z.string().min(1),
  parserProvider: z.string().min(1),
  parserVersion: z.string().min(1),
  extractedFields: z.array(ExtractedInvoiceFieldSchema),
  duplicateOf: z.string().min(1).nullable(),
  reviewerId: z.string().min(1).nullable(),
  reviewedAt: z.string().datetime().nullable(),
  includedInAnalysis: z.boolean(),
  sourceDocumentRef: z.string().min(1),
});
export type InvoiceRecord = z.infer<typeof InvoiceRecordSchema>;
