import { z } from 'zod';
import { VendorIdSchema } from './vendors';

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/i);

export const ReconciliationInputSchema = z.object({
  vendorId: VendorIdSchema,
  accountId: z.string().min(1),
  locationId: z.string().min(1),
  vendorSourceRecordId: z.string().min(1),
  transactionId: z.string().min(1),
  lineItemId: z.string().min(1),
  normalizedSku: z.string().min(1),
  packQuantity: z.number().positive(),
  unitQuantity: z.number().positive(),
  unit: z.string().min(1),
  accountPrice: z.number().nonnegative(),
  paidPrice: z.number().nonnegative(),
  currency: z.literal('USD'),
  sourceReceiptSha256: Sha256Schema,
  sourceSynthetic: z.literal(false),
  calculationVersion: z.string().min(1),
  sourcePeriod: z.object({ from: z.string().datetime(), to: z.string().datetime() }),
  beverage: z.object({
    categoryClass: z.string().min(1),
    packageFormat: z.string().min(1),
    distributorId: VendorIdSchema,
  }).strict().optional(),
}).strict();

export type ReconciliationInput = z.infer<typeof ReconciliationInputSchema>;

export const ReconciliationRecordSchema = z.object({
  status: z.enum(['COMPLETE', 'INCOMPLETE_EVIDENCE', 'FAIL']),
  vendorId: VendorIdSchema,
  accountId: z.string().min(1),
  lineItemId: z.string().min(1),
  normalizedSku: z.string().min(1),
  normalizedAccountUnitPrice: z.number().finite().nullable(),
  normalizedPaidUnitPrice: z.number().finite().nullable(),
  variance: z.number().finite().nullable(),
  currency: z.literal('USD'),
  sourceReceiptSha256: Sha256Schema,
  calculationVersion: z.string().min(1),
  findingId: z.string().nullable(),
  beverage: z.object({
    categoryClass: z.string().min(1),
    packageFormat: z.string().min(1),
    distributorId: VendorIdSchema,
  }).strict().optional(),
  errorClass: z.string().nullable(),
}).strict();

export type ReconciliationRecord = z.infer<typeof ReconciliationRecordSchema>;
