import { z } from 'zod';

export const WorkspaceSourceSchema = z
  .object({
    kind: z.enum(['SYNTHETIC_FIXTURE', 'LIVE_SOURCE']),
    sourceSystem: z.string().min(1),
    freshAt: z.string().datetime(),
    recordCount: z.number().int().nonnegative(),
    provenanceRef: z.string().min(1),
  })
  .strict();
export type WorkspaceSource = z.infer<typeof WorkspaceSourceSchema>;

export const WorkspaceProvenanceSchema = z
  .object({
    sourceSystem: z.string().min(1),
    sourceRecordId: z.string().min(1),
    locator: z.string().min(1),
  })
  .strict();
export type WorkspaceProvenance = z.infer<typeof WorkspaceProvenanceSchema>;

export const InvoiceWorkspaceItemSchema = z
  .object({
    id: z.string().min(1),
    vendorId: z.string().min(1),
    vendorName: z.string().min(1),
    invoiceNumber: z.string().min(1).optional(),
    documentDate: z.string().min(1),
    totalAmount: z.number().finite().nonnegative().optional(),
    currency: z.string().length(3).optional(),
    state: z.enum(['RECEIVED', 'PARSING', 'REVIEW', 'VERIFIED', 'FAILED']),
    sourceRecordId: z.string().min(1),
    exceptionCount: z.number().int().nonnegative(),
  })
  .strict();
export type InvoiceWorkspaceItem = z.infer<typeof InvoiceWorkspaceItemSchema>;

export const InvoiceWorkspaceResponseSchema = z
  .object({
    source: WorkspaceSourceSchema,
    invoices: z.array(InvoiceWorkspaceItemSchema),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.source.recordCount !== value.invoices.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['source', 'recordCount'],
        message: 'Invoice source recordCount must match invoices length.',
      });
    }
  });
export type InvoiceWorkspaceResponse = z.infer<typeof InvoiceWorkspaceResponseSchema>;

export const InventoryWorkspaceItemSchema = z
  .object({
    sourceRecordId: z.string().min(1),
    locationId: z.string().min(1),
    locationName: z.string().min(1),
    sku: z.string().min(1).optional(),
    itemName: z.string().min(1),
    vendorId: z.string().min(1).optional(),
    vendorName: z.string().min(1).optional(),
    quantity: z.number().finite().nonnegative().optional(),
    unit: z.string().min(1).optional(),
    parLevel: z.number().finite().nonnegative().optional(),
    reorderPoint: z.number().finite().nonnegative().optional(),
    observedAt: z.string().datetime(),
  })
  .strict();
export type InventoryWorkspaceItem = z.infer<typeof InventoryWorkspaceItemSchema>;

export const InventoryWorkspaceResponseSchema = z
  .object({
    source: WorkspaceSourceSchema,
    items: z.array(InventoryWorkspaceItemSchema),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.source.recordCount !== value.items.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['source', 'recordCount'],
        message: 'Inventory source recordCount must match items length.',
      });
    }
  });
export type InventoryWorkspaceResponse = z.infer<typeof InventoryWorkspaceResponseSchema>;

export const SupplierOpportunitySchema = z
  .object({
    id: z.string().min(1),
    currentVendorName: z.string().min(1),
    currentItemName: z.string().min(1),
    candidateVendorName: z.string().min(1),
    candidateItemName: z.string().min(1),
    comparisonBasis: z.string().min(1),
    currentPrice: z.number().finite().nonnegative().optional(),
    candidatePrice: z.number().finite().nonnegative().optional(),
    estimatedVariance: z.number().finite().optional(),
    currency: z.string().length(3),
    evidenceState: z.literal('DETECTED'),
    confidence: z.number().min(0).max(1),
    sourceRecordIds: z.array(z.string().min(1)).min(1),
    provenance: z.array(WorkspaceProvenanceSchema).min(1),
  })
  .strict();
export type SupplierOpportunity = z.infer<typeof SupplierOpportunitySchema>;

export const SupplierOpportunityResponseSchema = z
  .object({
    source: WorkspaceSourceSchema,
    opportunities: z.array(SupplierOpportunitySchema),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.source.recordCount !== value.opportunities.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['source', 'recordCount'],
        message: 'Supplier opportunity source recordCount must match opportunities length.',
      });
    }
  });
export type SupplierOpportunityResponse = z.infer<typeof SupplierOpportunityResponseSchema>;
