# HostGraph Regional Vendor Live-API Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a fail-closed vendor-adapter framework and release verifier that cannot promote HostGraph past `INTEGRATION_READY` until all five required food distributors and five required beverage distributors pass authenticated live account-scoped API checks.

**Architecture:** Add server-only vendor adapter contracts, a locked regional cohort registry, secure environment-backed connection configuration, live-call verification receipts, a 10/10 aggregate verifier, and an integrity-protected release manifest. Vendor endpoints are never guessed: a vendor stays `BLOCKED` until official vendor/authorized integration documentation and account credentials are supplied.

**Tech Stack:** Node 22, TypeScript, Express-side server modules, Zod, Web Crypto/Node crypto, Vitest, GitHub Actions manual environment gate.

**Spec:** `docs/superpowers/specs/2026-08-25-hostgraph-margin-leak-hardening-design.md`

## Global Constraints
- Plans 1–3 must pass before this plan may claim `REGIONAL_DATA_READY`.
- Required food cohort: Sysco Boston, US Foods, Performance Foodservice Boston, Baldor Specialty Foods Boston, Costa Fruit & Produce.
- Required beverage cohort: Martignetti Companies, Southern Glazer's MA/RI, M.S. Walker, Mancini Beverage, Sheehan Family Companies regional network.
- Aggregate gate is exactly 10/10; 9/10 fails.
- Each vendor must pass three consecutive authenticated live reads.
- Public web scraping, private portal browser automation, reverse-engineered sessions, static exports, and synthetic fixtures never satisfy the live gate.
- Secrets and protected payloads never enter git, PR logs, or normal CI artifacts.
- Missing official API access is a legitimate `BLOCKED` result, not a reason to weaken the gate.
- Current implementation may build the framework and remain blocked; it must never fabricate a green regional-data state.

## Release timing policy
- A qualifying vendor verification series must complete within a 30-minute consecutive-read window.
- The latest qualifying receipt for a release candidate must be no older than 24 hours.
- A release manifest is bound to the exact commit SHA, build digest, adapter versions, and receipt digests it verifies.

---

### Task 1: Define locked vendor registry, adapter, and receipt contracts

**Files:**
- Create: `shared/contracts/vendors.ts`
- Create: `server/vendors/registry.ts`
- Test: `tests/vendor-registry.test.ts`

**Interfaces:**
- Produces: `VendorId`, `VendorCategory`, `VendorAdapterStatus`, `VendorVerificationReceipt`, `RegionalVendorRegistry`.

- [ ] **Step 1: Write red registry tests**

```ts
import { REGIONAL_VENDOR_COHORT } from '../server/vendors/registry';

it('locks exactly five food and five beverage vendors', () => {
  expect(REGIONAL_VENDOR_COHORT.filter((v) => v.category === 'FOOD')).toHaveLength(5);
  expect(REGIONAL_VENDOR_COHORT.filter((v) => v.category === 'BEVERAGE')).toHaveLength(5);
  expect(new Set(REGIONAL_VENDOR_COHORT.map((v) => v.id)).size).toBe(10);
});
```

- [ ] **Step 2: Define canonical IDs**

Use stable IDs:

```ts
export const VendorIdSchema = z.enum([
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
```

- [ ] **Step 3: Define verification receipt schema**

Required fields:
- `vendorId`, `vendorName`, `category`;
- `accountRef` as a non-secret stable reference;
- `adapterVersion`;
- `authorizationBasis` equal to `VENDOR_API` or `VENDOR_AUTHORIZED_INTEGRATION`;
- `operationId`;
- `requestStartedAt`, `responseReceivedAt`;
- `sourceRecordIds` when supplied;
- `schemaVersion`;
- `payloadSha256`;
- `normalizedSha256`;
- `freshnessObservedAt`;
- `result` equal to `PASS | FAIL | BLOCKED`;
- `errorClass` when not PASS;
- `unsupportedFields` array;
- `commitSha` and `buildSha256`.

Receipt schema must explicitly reject secret/token fields.

- [ ] **Step 4: Implement locked cohort**

Each registry row carries `id`, canonical name, category, region statement, `required: true`, and adapter version.

- [ ] **Step 5: Run and commit**

```bash
pnpm test:unit -- tests/vendor-registry.test.ts
pnpm check
git add shared/contracts/vendors.ts server/vendors/registry.ts tests/vendor-registry.test.ts
git commit -m "feat: lock HostGraph MA RI vendor release cohort"
```

### Task 2: Implement server-only adapter configuration and fail-closed BLOCKED state

**Files:**
- Create: `server/vendors/adapter.ts`
- Create: `server/vendors/config.ts`
- Create: `server/vendors/blockedAdapter.ts`
- Modify: `.env.example`
- Modify: `.gitignore`
- Test: `tests/vendor-config.test.ts`

**Interfaces:**
- Produces: `VendorAdapter`, `VendorAdapterConfig`, `loadVendorConfig(vendorId)`, `BlockedVendorAdapter`.

- [ ] **Step 1: Define adapter interface**

```ts
export interface VendorAdapter {
  readonly vendorId: VendorId;
  readonly version: string;
  verifyLiveRead(context: VendorReadContext): Promise<VendorReadObservation>;
}
```

`VendorReadObservation` contains the source payload only in memory and exposes a normalized canonical record set plus metadata. It must not be serialized to logs by default.

- [ ] **Step 2: Define exact environment naming**

For every vendor ID prefix, support:
- `HOSTGRAPH_VENDOR_<PREFIX>_BASE_URL`
- `HOSTGRAPH_VENDOR_<PREFIX>_READ_PATH`
- `HOSTGRAPH_VENDOR_<PREFIX>_ACCOUNT_ID`
- `HOSTGRAPH_VENDOR_<PREFIX>_AUTH_KIND`
- `HOSTGRAPH_VENDOR_<PREFIX>_TOKEN`
- optional `HOSTGRAPH_VENDOR_<PREFIX>_AUTH_HEADER`

`AUTH_KIND` is restricted to `BEARER` or `HEADER_TOKEN`. No cookie/session-browser mode is supported.

- [ ] **Step 3: Require authorization declaration**

Add `HOSTGRAPH_VENDOR_<PREFIX>_AUTHORIZATION_BASIS`, restricted to `VENDOR_API` or `VENDOR_AUTHORIZED_INTEGRATION`.

If required configuration is absent, return a `BlockedVendorAdapter` whose read result is `BLOCKED / MISSING_AUTHORIZED_CONFIGURATION`; do not make a network call.

- [ ] **Step 4: Add runtime artifact directory to gitignore**

Ignore:

```text
.hostgraph/
```

Verification receipts live under `.hostgraph/release/vendor-receipts/` and are runtime evidence, not source.

- [ ] **Step 5: Test secret hygiene**

Ensure config objects provide redacted `toJSON()`/diagnostic views and tests prove token values never appear in serialized output.

- [ ] **Step 6: Commit**

```bash
pnpm test:unit -- tests/vendor-config.test.ts
pnpm check
git add server/vendors .env.example .gitignore tests/vendor-config.test.ts
git commit -m "feat: fail closed when vendor API authorization is absent"
```

### Task 3: Implement authorized HTTP adapter and canonical commercial-record normalization

**Files:**
- Create: `server/vendors/httpAdapter.ts`
- Create: `shared/contracts/vendorCommercialRecord.ts`
- Test: `tests/vendor-http-adapter.test.ts`

**Interfaces:**
- Produces: `AuthorizedHttpVendorAdapter` and `VendorCommercialRecord`.

- [ ] **Step 1: Define conservative canonical record schema**

A vendor read may normalize only fields actually present:

```ts
export const VendorCommercialRecordSchema = z.object({
  sourceRecordId: z.string().min(1),
  recordType: z.enum(['CATALOG_ITEM', 'PRICE', 'INVOICE', 'CREDIT', 'ORDER', 'DELIVERY', 'TRANSACTION']),
  sku: z.string().optional(),
  description: z.string().optional(),
  amount: z.number().finite().optional(),
  currency: z.string().length(3).optional(),
  quantity: z.number().finite().optional(),
  unit: z.string().optional(),
  occurredAt: z.string().datetime().optional(),
  rawFieldPresence: z.array(z.string()),
});
```

Unknown/missing fields stay absent; they are never invented.

- [ ] **Step 2: Write HTTP behavior tests**

Cover:
- configured bearer/header auth;
- request timeout;
- non-2xx response;
- JSON schema rejection;
- correlation ID;
- no token in error text;
- no retry for 401/403;
- one bounded retry for network/5xx if the operation is declared idempotent.

- [ ] **Step 3: Implement endpoint calls only from reviewed configuration**

Do not hardcode guessed Sysco/US Foods/etc. paths. `BASE_URL` and `READ_PATH` must originate from authorized integration configuration.

Reject URLs with protocols other than HTTPS except `http://127.0.0.1`/`localhost` in test mode.

- [ ] **Step 4: Require vendor-specific normalizer function**

An adapter cannot return PASS until its registered normalizer produces at least one valid account-scoped `VendorCommercialRecord` containing a source record ID and one commercial datum.

Until official response documentation exists for a vendor, register `BlockedVendorAdapter`, not a generic guess-based normalizer.

- [ ] **Step 5: Run and commit**

```bash
pnpm test:unit -- tests/vendor-http-adapter.test.ts
pnpm check
git add server/vendors/httpAdapter.ts shared/contracts/vendorCommercialRecord.ts tests/vendor-http-adapter.test.ts
git commit -m "feat: add authorized vendor API adapter boundary"
```

### Task 4: Generate cryptographic live-read verification receipts

**Files:**
- Create: `server/vendors/verifyVendor.ts`
- Create: `server/vendors/receiptStore.ts`
- Test: `tests/vendor-receipt.test.ts`

**Interfaces:**
- Produces: `verifyVendorSeries(adapter, context)` and JSON receipts under runtime artifact storage.

- [ ] **Step 1: Write three-read series tests**

A PASS series requires three successful reads for the same vendor/account/adapter version inside 30 minutes.

- [ ] **Step 2: Hash without persisting protected source payload**

Use SHA-256 over canonical JSON bytes for both raw in-memory payload and normalized records. Persist only the digest and allowed receipt metadata.

Use deterministic canonical serialization with lexicographically sorted object keys.

- [ ] **Step 3: Check normalization idempotence**

For each successful source response, run normalization twice against the identical in-memory payload and require the same `normalizedSha256`.

- [ ] **Step 4: Enforce account/vendor isolation**

A receipt must carry the adapter vendor ID and configured account reference. If the normalized payload reports an incompatible vendor/account marker where one is available, fail with `IDENTITY_MISMATCH`.

- [ ] **Step 5: Run and commit**

```bash
pnpm test:unit -- tests/vendor-receipt.test.ts
pnpm check
git add server/vendors/verifyVendor.ts server/vendors/receiptStore.ts tests/vendor-receipt.test.ts
git commit -m "feat: emit HostGraph live vendor verification receipts"
```

### Task 5: Implement the 10/10 regional gate verifier

**Files:**
- Create: `scripts/vendor-live-gate.ts`
- Create: `server/release/regionalGate.ts`
- Test: `tests/regional-vendor-gate.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `pnpm gate:vendors` and `RegionalGateResult`.

- [ ] **Step 1: Write fail-closed aggregate tests**

Required cases:
- 10 PASS -> PASS;
- 9 PASS + 1 BLOCKED -> FAIL;
- 9 PASS + 1 stale receipt -> FAIL;
- any adapter-version mismatch -> FAIL;
- any build/commit mismatch -> FAIL;
- fewer than three qualifying reads -> FAIL.

- [ ] **Step 2: Implement freshness policy**

Latest receipt series must be <=24 hours old and the three reads must fall within a 30-minute window.

- [ ] **Step 3: Add CLI output**

Human output prints one row per vendor: category, vendor, adapter version, PASS/FAIL/BLOCKED, last verification time, and error class. Never print source payload or token.

JSON output with `--json` must conform to a Zod schema and be safe to archive.

- [ ] **Step 4: Add script**

```json
{
  "gate:vendors": "tsx scripts/vendor-live-gate.ts"
}
```

Exit code is 0 only for 10/10 PASS.

- [ ] **Step 5: Commit**

```bash
pnpm test:unit -- tests/regional-vendor-gate.test.ts
pnpm gate:vendors -- --json || true
```

At this stage, without real authorized configs, expected live result is FAIL/BLOCKED, which is correct.

```bash
git add scripts/vendor-live-gate.ts server/release/regionalGate.ts tests/regional-vendor-gate.test.ts package.json
git commit -m "feat: enforce ten of ten regional vendor gate"
```

### Task 6: Implement integrity-protected release manifest

**Files:**
- Create: `shared/contracts/releaseManifest.ts`
- Create: `server/release/createManifest.ts`
- Create: `server/release/verifyManifest.ts`
- Create: `scripts/create-release-manifest.ts`
- Test: `tests/release-manifest.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: signed/HMAC-protected manifest bound to exact build and vendor receipts.

- [ ] **Step 1: Define manifest contents**

Include: commit SHA, build SHA-256, schema versions, hardening CI reference, truth-mode policy version, ten adapter IDs/versions, receipt digests, aggregate vendor result, reconciliation result, known issues, release state, generated timestamp.

- [ ] **Step 2: Require HMAC key for `REGIONAL_DATA_READY` or later**

Use `HOSTGRAPH_RELEASE_HMAC_KEY` with HMAC-SHA256. The key is never persisted. If absent, a release may remain `INTEGRATION_READY` but may not claim `REGIONAL_DATA_READY`.

- [ ] **Step 3: Fail manifest verification on any receipt/build mismatch**

- [ ] **Step 4: Add scripts**

```json
{
  "release:manifest": "tsx scripts/create-release-manifest.ts"
}
```

- [ ] **Step 5: Commit after tests**

```bash
pnpm test:unit -- tests/release-manifest.test.ts
git add shared/contracts/releaseManifest.ts server/release scripts/create-release-manifest.ts tests/release-manifest.test.ts package.json
git commit -m "feat: bind HostGraph release state to verified vendor receipts"
```

### Task 7: Add secure manual live-gate workflow without weakening normal CI

**Files:**
- Create: `.github/workflows/vendor-live-gate.yml`

**Interfaces:**
- Produces: manual `workflow_dispatch` live verification in a protected GitHub Environment named `hostgraph-regional-live`.

- [ ] **Step 1: Add manual-only workflow**

The workflow must not run on untrusted pull requests. It uses:

```yaml
on:
  workflow_dispatch:
permissions:
  contents: read
jobs:
  live_vendor_gate:
    environment: hostgraph-regional-live
```

- [ ] **Step 2: Map environment secrets to vendor configuration variables**

Use GitHub Environment secrets only. Do not echo them. Disable shell xtrace.

- [ ] **Step 3: Run build and gate**

Sequence:
1. checkout exact commit;
2. install dependencies;
3. run normal CI-equivalent tests/build;
4. compute build digest;
5. run `pnpm gate:vendors`;
6. create/verify release manifest only when gate passes.

- [ ] **Step 4: Upload only safe receipts/manifest**

Artifact contents may include verification receipts and signed manifest, but never source payloads, tokens, account credentials, or raw invoice/order records.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/vendor-live-gate.yml
git commit -m "ci: add protected HostGraph regional live data gate"
```

### Task 8: Activate vendor adapters only from authorized documentation and credentials

**Files:**
- Create as access becomes available: `server/vendors/adapters/<vendor-id>.ts`
- Modify: `server/vendors/registry.ts`
- Add one contract fixture test per activated adapter under `tests/vendors/` using sanitized/redacted vendor-authorized response shapes.

**Interfaces:**
- Converts a vendor from `BlockedVendorAdapter` to an official adapter without changing aggregate gate semantics.

For each of the ten vendors, follow exactly this sequence:

- [ ] Obtain official vendor API/integration documentation and authorization for the target customer/account.
- [ ] Confirm the operation is account-scoped and returns current commercial data.
- [ ] Implement the vendor-specific response schema and normalizer from that documentation only.
- [ ] Add sanitized contract tests proving unsupported/missing fields remain absent.
- [ ] Configure secrets outside source control.
- [ ] Run three live reads through the protected gate.
- [ ] Keep the vendor `BLOCKED` until all three reads pass.

No adapter file is created from guessed endpoints or reverse-engineered portal traffic. This is an explicit external dependency, not an implementation shortcut.

## Plan 4 exit gate

The software framework is complete when blocked/live adapters, receipts, aggregation, manifest integrity, and secure workflow are fully tested. The **release gate itself passes only when all ten required vendor adapters have authorized account-scoped integrations and each produces three current successful live reads, yielding 10/10 PASS and a valid release manifest.**
