import { z } from 'zod';
import { VendorIdSchema } from './vendors';

export const VendorCommercialRecordSchema = z.object({
  sourceRecordId: z.string().min(1),
  recordType: z.enum(['CATALOG_ITEM', 'PRICE', 'INVOICE', 'CREDIT', 'ORDER', 'DELIVERY', 'TRANSACTION']),
  vendorId: VendorIdSchema,
  accountRef: z.string().min(1),
  sku: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  amount: z.number().finite().optional(),
  currency: z.string().length(3).optional(),
  quantity: z.number().finite().optional(),
  unit: z.string().min(1).optional(),
  occurredAt: z.string().datetime().optional(),
  rawFieldPresence: z.array(z.string().min(1)),
}).strict().superRefine((value, ctx) => {
  const hasCommercialDatum = value.amount !== undefined || value.quantity !== undefined || value.sku !== undefined;
  if (!hasCommercialDatum) {
    ctx.addIssue({ code: 'custom', message: 'Commercial record requires amount, quantity, or SKU.' });
  }
});

export type VendorCommercialRecord = z.infer<typeof VendorCommercialRecordSchema>;
