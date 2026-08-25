import type { VendorVerificationReceipt } from '../../shared/contracts/vendors';
import { ReconciliationInputSchema, ReconciliationRecordSchema, type ReconciliationInput, type ReconciliationRecord } from '../../shared/contracts/reconciliation';
import { FindingSchema, type Finding } from '../../shared/contracts/findings';
import { sha256 } from '../vendors/verifyVendor';

export interface ReconciliationResult {
  record: ReconciliationRecord;
  finding: Finding | null;
}

export function reconcileVendorLine(inputValue: ReconciliationInput, receipt: VendorVerificationReceipt): ReconciliationResult {
  const input = ReconciliationInputSchema.parse(inputValue);
  const receiptSha = sha256(receipt);

  const fail = (errorClass: string): ReconciliationResult => ({
    record: ReconciliationRecordSchema.parse({
      status: 'FAIL',
      vendorId: input.vendorId,
      accountId: input.accountId,
      lineItemId: input.lineItemId,
      normalizedSku: input.normalizedSku,
      normalizedAccountUnitPrice: null,
      normalizedPaidUnitPrice: null,
      variance: null,
      currency: 'USD',
      sourceReceiptSha256: input.sourceReceiptSha256,
      calculationVersion: input.calculationVersion,
      beverage: input.beverage,
      findingId: null,
      errorClass,
    }),
    finding: null,
  });

  if (receiptSha !== input.sourceReceiptSha256) return fail('SOURCE_RECEIPT_DIGEST_MISMATCH');
  if (receipt.result !== 'PASS') return fail('SOURCE_RECEIPT_NOT_PASS');
  if (receipt.vendorId !== input.vendorId || receipt.accountRef !== input.accountId) return fail('SOURCE_IDENTITY_MISMATCH');
  if (!receipt.sourceRecordIds.includes(input.vendorSourceRecordId)) return fail('SOURCE_RECORD_NOT_IN_RECEIPT');
  if (input.beverage && input.beverage.distributorId !== input.vendorId) return fail('BEVERAGE_DISTRIBUTOR_MISMATCH');

  const totalUnits = input.packQuantity * input.unitQuantity;
  if (!Number.isFinite(totalUnits) || totalUnits <= 0) return fail('INCOMPATIBLE_UNIT_BASIS');

  const normalizedAccountUnitPrice = input.accountPrice / totalUnits;
  const normalizedPaidUnitPrice = input.paidPrice / totalUnits;
  const variance = normalizedPaidUnitPrice - normalizedAccountUnitPrice;
  const findingId = `finding-${sha256({ vendorId: input.vendorId, transactionId: input.transactionId, lineItemId: input.lineItemId, calculationVersion: input.calculationVersion }).slice(0, 20)}`;
  const now = new Date().toISOString();

  const finding = FindingSchema.parse({
    id: findingId,
    accountId: input.accountId,
    locationId: input.locationId,
    vendorId: input.vendorId,
    sourceRecordIds: [input.vendorSourceRecordId, input.transactionId, input.lineItemId],
    sourcePeriod: input.sourcePeriod,
    observedAmount: input.paidPrice,
    calculatedVariance: variance,
    calculationMethod: 'vendor-account-paid-unit-price-variance',
    calculationVersion: input.calculationVersion,
    confidence: 1,
    evidenceState: 'DETECTED',
    reviewerState: 'UNREVIEWED',
    createdAt: now,
    updatedAt: now,
    provenance: [{
      sourceSystem: input.vendorId,
      sourceRecordId: input.vendorSourceRecordId,
      locator: `transaction:${input.transactionId}/line:${input.lineItemId}`,
    }],
  });

  return {
    record: ReconciliationRecordSchema.parse({
      status: 'COMPLETE',
      vendorId: input.vendorId,
      accountId: input.accountId,
      lineItemId: input.lineItemId,
      normalizedSku: input.normalizedSku,
      normalizedAccountUnitPrice,
      normalizedPaidUnitPrice,
      variance,
      currency: 'USD',
      sourceReceiptSha256: input.sourceReceiptSha256,
      calculationVersion: input.calculationVersion,
      beverage: input.beverage,
      findingId,
      errorClass: null,
    }),
    finding,
  };
}
