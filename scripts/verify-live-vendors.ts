import { REGIONAL_VENDOR_COHORT } from '../server/vendors/registry';
import { createVendorAdapter } from '../server/vendors/adapterFactory';
import { verifyVendorSeries } from '../server/vendors/verifyVendor';
import { writeVendorReceipt } from '../server/vendors/receiptStore';

const commitSha = process.env.HOSTGRAPH_RELEASE_COMMIT_SHA;
const buildSha256 = process.env.HOSTGRAPH_RELEASE_BUILD_SHA256;
if (!commitSha || !buildSha256) {
  throw new Error('HOSTGRAPH_RELEASE_COMMIT_SHA and HOSTGRAPH_RELEASE_BUILD_SHA256 are required');
}

let passCount = 0;
for (const vendor of REGIONAL_VENDOR_COHORT) {
  const adapter = createVendorAdapter(vendor.id, vendor.adapterVersion);
  const { receipt } = await verifyVendorSeries(adapter, {
    vendorId: vendor.id,
    vendorName: vendor.name,
    category: vendor.category,
    accountRef: process.env[`HOSTGRAPH_VENDOR_${vendor.id.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_ACCOUNT_ID`] ?? `blocked:${vendor.id}`,
    commitSha,
    buildSha256,
  });
  writeVendorReceipt(receipt);
  if (receipt.result === 'PASS') passCount += 1;
  console.log(`${vendor.category}\t${vendor.name}\t${receipt.result}\t${receipt.errorClass ?? 'OK'}`);
}

console.log(`Verification receipts complete: ${passCount}/10 PASS`);
