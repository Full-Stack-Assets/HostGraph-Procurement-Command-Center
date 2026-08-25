import fs from 'node:fs';
import path from 'node:path';
import { VendorVerificationReceiptSchema, type VendorVerificationReceipt } from '../../shared/contracts/vendors';

export const DEFAULT_RECEIPT_DIR = path.resolve('.hostgraph/release/vendor-receipts');

export function receiptPath(receipt: VendorVerificationReceipt, directory = DEFAULT_RECEIPT_DIR) {
  return path.join(directory, `${receipt.vendorId}.json`);
}

export function writeVendorReceipt(receipt: VendorVerificationReceipt, directory = DEFAULT_RECEIPT_DIR) {
  const safe = VendorVerificationReceiptSchema.parse(receipt);
  fs.mkdirSync(directory, { recursive: true });
  const target = receiptPath(safe, directory);
  fs.writeFileSync(target, `${JSON.stringify(safe, null, 2)}\n`, { mode: 0o600 });
  return target;
}

export function readVendorReceipt(vendorId: string, directory = DEFAULT_RECEIPT_DIR): VendorVerificationReceipt | null {
  const target = path.join(directory, `${vendorId}.json`);
  if (!fs.existsSync(target)) return null;
  return VendorVerificationReceiptSchema.parse(JSON.parse(fs.readFileSync(target, 'utf8')));
}

export function readVendorReceipts(vendorIds: string[], directory = DEFAULT_RECEIPT_DIR) {
  return vendorIds.flatMap((vendorId) => {
    const receipt = readVendorReceipt(vendorId, directory);
    return receipt ? [receipt] : [];
  });
}
