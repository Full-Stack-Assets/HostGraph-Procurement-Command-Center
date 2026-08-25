import { z } from 'zod';
import type { VendorVerificationReceipt } from '../../shared/contracts/vendors';
import type { RequiredVendorCohort } from '../../shared/contracts/vendorSpend';

export const RegionalGateVendorResultSchema = z.object({
  vendorId: z.string().min(1),
  vendorName: z.string().min(1),
  category: z.enum(['FOOD', 'BEVERAGE']),
  adapterVersion: z.string().min(1),
  result: z.enum(['PASS', 'FAIL', 'BLOCKED']),
  verifiedAt: z.string().datetime().nullable(),
  errorClass: z.string().nullable(),
}).strict();

export const RegionalGateResultSchema = z.object({
  result: z.enum(['PASS', 'FAIL']),
  requiredCount: z.literal(10),
  passCount: z.number().int().min(0).max(10),
  cohortMode: z.enum(['BASELINE', 'CUSTOMER_TRAILING_SPEND']),
  vendors: z.array(RegionalGateVendorResultSchema).length(10),
}).strict();

export type RegionalGateResult = z.infer<typeof RegionalGateResultSchema>;

export interface RegionalGateInput {
  cohort: RequiredVendorCohort;
  receipts: VendorVerificationReceipt[];
  commitSha: string;
  buildSha256: string;
  now?: Date;
}

const MAX_RECEIPT_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_SERIES_WINDOW_MS = 30 * 60 * 1000;

export function evaluateRegionalVendorGate(input: RegionalGateInput): RegionalGateResult {
  const now = input.now ?? new Date();
  const receiptsByVendor = new Map(input.receipts.map((receipt) => [receipt.vendorId, receipt]));

  const vendors = input.cohort.vendors.map((vendor) => {
    const receipt = receiptsByVendor.get(vendor.id);
    if (!receipt) {
      return {
        vendorId: vendor.id,
        vendorName: vendor.name,
        category: vendor.category,
        adapterVersion: 'unavailable',
        result: 'BLOCKED' as const,
        verifiedAt: null,
        errorClass: 'MISSING_VERIFICATION_RECEIPT',
      };
    }

    const age = now.getTime() - new Date(receipt.seriesCompletedAt).getTime();
    const seriesWindow = new Date(receipt.seriesCompletedAt).getTime() - new Date(receipt.seriesStartedAt).getTime();

    let result: 'PASS' | 'FAIL' | 'BLOCKED' = receipt.result;
    let errorClass = receipt.errorClass;

    if (receipt.commitSha !== input.commitSha || receipt.buildSha256 !== input.buildSha256) {
      result = 'FAIL';
      errorClass = 'BUILD_OR_COMMIT_MISMATCH';
    } else if (receipt.seriesReadCount !== 3) {
      result = 'FAIL';
      errorClass = 'REQUIRES_THREE_LIVE_READS';
    } else if (seriesWindow < 0 || seriesWindow > MAX_SERIES_WINDOW_MS) {
      result = 'FAIL';
      errorClass = 'SERIES_WINDOW_EXCEEDED';
    } else if (age < 0 || age > MAX_RECEIPT_AGE_MS) {
      result = 'FAIL';
      errorClass = 'STALE_VERIFICATION_RECEIPT';
    }

    return {
      vendorId: vendor.id,
      vendorName: vendor.name,
      category: vendor.category,
      adapterVersion: receipt.adapterVersion,
      result,
      verifiedAt: receipt.seriesCompletedAt,
      errorClass,
    };
  });

  const passCount = vendors.filter((vendor) => vendor.result === 'PASS').length;
  return RegionalGateResultSchema.parse({
    result: passCount === 10 ? 'PASS' : 'FAIL',
    requiredCount: 10,
    passCount,
    cohortMode: input.cohort.mode,
    vendors,
  });
}
