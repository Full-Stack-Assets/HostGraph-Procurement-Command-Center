import { z } from 'zod';
import { VendorCategorySchema, VendorIdSchema } from './vendors';

export const VendorSpendRowSchema = z.object({
  vendorId: VendorIdSchema,
  vendorName: z.string().min(1),
  category: VendorCategorySchema,
  trailingSpend: z.number().nonnegative(),
  currency: z.literal('USD'),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  sourceRecordIds: z.array(z.string().min(1)).min(1),
}).strict();

export type VendorSpendRow = z.infer<typeof VendorSpendRowSchema>;

export const RequiredVendorSchema = z.object({
  id: VendorIdSchema,
  name: z.string().min(1),
  category: VendorCategorySchema,
  trailingSpend: z.number().nonnegative().optional(),
  sourceRecordIds: z.array(z.string().min(1)).default([]),
}).strict();

export type RequiredVendor = z.infer<typeof RequiredVendorSchema>;

export const RequiredVendorCohortSchema = z.object({
  mode: z.enum(['BASELINE', 'CUSTOMER_TRAILING_SPEND']),
  vendors: z.array(RequiredVendorSchema).length(10),
}).strict();

export type RequiredVendorCohort = z.infer<typeof RequiredVendorCohortSchema>;
