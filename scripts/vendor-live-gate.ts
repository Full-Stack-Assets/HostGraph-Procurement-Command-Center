import fs from 'node:fs';
import { resolveRequiredVendorCohort } from '../server/vendors/resolveRequiredCohort';
import { readVendorReceipts } from '../server/vendors/receiptStore';
import { evaluateRegionalVendorGate } from '../server/release/regionalGate';
import type { VendorSpendRow } from '../shared/contracts/vendorSpend';

const args = process.argv.slice(2);
const forbidden = new Set(['--force', '--approve']);
if (args.some((arg) => forbidden.has(arg)) || process.env.HOSTGRAPH_FORCE_VENDOR_GATE || process.env.HOSTGRAPH_RELEASE_OVERRIDE) {
  console.error('Vendor gate overrides are forbidden.');
  process.exit(2);
}

const json = args.includes('--json');
const spendArg = args.find((arg) => arg.startsWith('--spend-file='));
const spendRows: VendorSpendRow[] | undefined = spendArg
  ? JSON.parse(fs.readFileSync(spendArg.slice('--spend-file='.length), 'utf8'))
  : undefined;

const cohort = resolveRequiredVendorCohort(spendRows);
const receipts = readVendorReceipts(cohort.vendors.map((vendor) => vendor.id));
const commitSha = process.env.HOSTGRAPH_RELEASE_COMMIT_SHA ?? '0'.repeat(40);
const buildSha256 = process.env.HOSTGRAPH_RELEASE_BUILD_SHA256 ?? '0'.repeat(64);
const result = evaluateRegionalVendorGate({ cohort, receipts, commitSha, buildSha256 });

if (json) {
  console.log(JSON.stringify(result));
} else {
  console.log(`HostGraph regional vendor gate: ${result.result} (${result.passCount}/10)`);
  for (const vendor of result.vendors) {
    console.log(`${vendor.category}\t${vendor.vendorName}\t${vendor.result}\t${vendor.errorClass ?? 'OK'}`);
  }
}

process.exit(result.result === 'PASS' ? 0 : 1);
