import fs from 'node:fs';
import path from 'node:path';
import { resolveRequiredVendorCohort } from '../server/vendors/resolveRequiredCohort';
import { readVendorReceipts } from '../server/vendors/receiptStore';
import { evaluateRegionalVendorGate } from '../server/release/regionalGate';
import { createReleaseManifest } from '../server/release/createManifest';
import { verifyReleaseManifest } from '../server/release/verifyManifest';

const commitSha = process.env.HOSTGRAPH_RELEASE_COMMIT_SHA;
const buildSha256 = process.env.HOSTGRAPH_RELEASE_BUILD_SHA256;
const hmacKey = process.env.HOSTGRAPH_RELEASE_HMAC_KEY;
const ciReference = process.env.HOSTGRAPH_CI_REFERENCE ?? 'manual';

if (!commitSha || !buildSha256) {
  throw new Error('HOSTGRAPH_RELEASE_COMMIT_SHA and HOSTGRAPH_RELEASE_BUILD_SHA256 are required');
}

const cohort = resolveRequiredVendorCohort();
const receipts = readVendorReceipts(cohort.vendors.map((vendor) => vendor.id));
const regionalGate = evaluateRegionalVendorGate({ cohort, receipts, commitSha, buildSha256 });
if (regionalGate.result !== 'PASS') {
  throw new Error(`Regional vendor gate is ${regionalGate.result}; release manifest cannot claim REGIONAL_DATA_READY`);
}

const manifest = createReleaseManifest({
  commitSha,
  buildSha256,
  schemaVersions: { truth: '1', vendor: '1', reconciliation: '1' },
  ciReference,
  truthModePolicyVersion: '1',
  regionalGate,
  receipts,
  reconciliationResult: 'NOT_RUN',
  knownIssues: [],
  releaseState: 'REGIONAL_DATA_READY',
  hmacKey,
});

const verification = verifyReleaseManifest(manifest, hmacKey);
if (!verification.ok) throw new Error(`Manifest verification failed: ${verification.error}`);

const directory = path.resolve('.hostgraph/release');
fs.mkdirSync(directory, { recursive: true });
const target = path.join(directory, 'release-manifest.json');
fs.writeFileSync(target, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
console.log(target);
