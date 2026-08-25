import { describe, expect, it } from 'vitest';
import {
  InvoiceRecordSchema,
  InvoiceStateSchema,
  canTransitionInvoice,
} from '@shared/contracts/invoices';

describe('invoice evidence lifecycle', () => {
  it('allows review verification but rejects skipping review', () => {
    expect(canTransitionInvoice('NEEDS_REVIEW', 'VERIFIED')).toBe(true);
    expect(canTransitionInvoice('PARSING', 'INCLUDED_IN_ANALYSIS')).toBe(false);
    expect(() => InvoiceStateSchema.parse('completed')).toThrow();
  });

  it('requires extracted fields to preserve confidence, source locator, and verification state', () => {
    expect(() =>
      InvoiceRecordSchema.parse({
        id: 'inv-1',
        state: 'NEEDS_REVIEW',
        checksumSha256: 'a'.repeat(64),
        originalFilename: 'invoice.pdf',
        safeFilename: 'invoice.pdf',
        uploadedAt: '2026-08-25T20:00:00.000Z',
        accountId: 'acct-1',
        locationId: 'loc-1',
        vendorId: 'vendor-1',
        parserProvider: 'parser',
        parserVersion: '1.0.0',
        duplicateOf: null,
        reviewerId: null,
        reviewedAt: null,
        includedInAnalysis: false,
        sourceDocumentRef: 'doc-1',
        extractedFields: [{ field: 'total', rawValue: '$10.00' }],
      }),
    ).toThrow();
  });
});
