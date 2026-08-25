import { z } from 'zod';

export const VendorIdSchema = z.string().min(1).regex(/^[a-z0-9-]+$/);
export type VendorId = z.infer<typeof VendorIdSchema>;

export const BaselineVendorIdSchema = z.enum([
  'sysco-boston',
  'us-foods',
  'performance-foodservice-boston',
  'baldor-boston',
  'costa-fruit-produce',
  'martignetti',
  'southern-glazers-ma-ri',
  'ms-walker',
  'mancini-beverage',
  'sheehan-regional',
]);
export type BaselineVendorId = z.infer<typeof BaselineVendorIdSchema>;

export const VendorCategorySchema = z.enum(['FOOD', 'BEVERAGE']);
export type VendorCategory = z.infer<typeof VendorCategorySchema>;

export const VendorAuthorizationBasisSchema = z.enum([
  'VENDOR_API',
  'VENDOR_AUTHORIZED_INTEGRATION',
]);
export type VendorAuthorizationBasis = z.infer<typeof VendorAuthorizationBasisSchema>;

export const VendorVerificationResultSchema = z.enum(['PASS', 'FAIL', 'BLOCKED']);
export type VendorVerificationResult = z.infer<typeof VendorVerificationResultSchema>;

export const VendorAdapterStatusSchema = z.enum(['UNCONFIGURED', 'READY', 'BLOCKED']);
export type VendorAdapterStatus = z.infer<typeof VendorAdapterStatusSchema>;

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/i);
const CommitShaSchema = z.string().regex(/^[a-f0-9]{40}$/i);

export const VendorVerificationReceiptSchema = z.object({
  vendorId: VendorIdSchema,
  vendorName: z.string().min(1),
  category: VendorCategorySchema,
  accountRef: z.string().min(1),
  adapterVersion: z.string().min(1),
  authorizationBasis: VendorAuthorizationBasisSchema.nullable(),
  operationId: z.string().min(1),
  requestedAt: z.string().datetime(),
  respondedAt: z.string().datetime(),
  sourceRecordIds: z.array(z.string().min(1)),
  schemaVersion: z.string().min(1),
  payloadSha256: Sha256Schema,
  normalizedSha256: Sha256Schema,
  freshAt: z.string().datetime(),
  result: VendorVerificationResultSchema,
  errorClass: z.string().min(1).nullable(),
  unsupportedFields: z.array(z.string()),
  commitSha: CommitShaSchema,
  buildSha256: Sha256Schema,
  seriesReadCount: z.number().int().nonnegative(),
  seriesStartedAt: z.string().datetime(),
  seriesCompletedAt: z.string().datetime(),
}).strict().superRefine((value, ctx) => {
  if (value.result === 'PASS' && value.authorizationBasis === null) {
    ctx.addIssue({ code: 'custom', path: ['authorizationBasis'], message: 'PASS receipts require an authorization basis.' });
  }
});
export type VendorVerificationReceipt = z.infer<typeof VendorVerificationReceiptSchema>;

export const RegionalVendorRegistryEntrySchema = z.object({
  id: BaselineVendorIdSchema,
  name: z.string().min(1),
  category: VendorCategorySchema,
  region: z.literal('MA/RI'),
  rationale: z.string().min(1),
  required: z.literal(true),
  adapterVersion: z.string().min(1),
}).strict();
export type RegionalVendorRegistryEntry = z.infer<typeof RegionalVendorRegistryEntrySchema>;
