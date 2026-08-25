# HostGraph Regional Vendor Live-API Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a fail-closed vendor-adapter framework and release verifier that cannot promote HostGraph past `INTEGRATION_READY` until the required five food and five beverage distributors pass authenticated live account-scoped API checks, then require real source-to-finding reconciliation before `PILOT_READY`.

**Architecture:** Add server-only vendor adapter contracts, a locked regional baseline cohort, a customer-specific top-spend cohort resolver, secure environment-backed connection configuration, live-call verification receipts, a 10/10 aggregate verifier, real vendor reconciliation, and an integrity-protected release manifest. Vendor endpoints are never guessed: a vendor stays `BLOCKED` until official vendor/authorized integration documentation and account credentials are supplied.

**Tech Stack:** Node 22, TypeScript, Express-side server modules, Zod, Node crypto, Vitest, GitHub Actions protected manual environment gate.

**Spec:** `docs/superpowers/specs/2026-08-25-hostgraph-margin-leak-hardening-design.md`

## Global Constraints
- Plans 1–3 must pass before this plan may claim `REGIONAL_DATA_READY`.
- Baseline food cohort: Sysco Boston, US Foods, Performance Foodservice Boston, Baldor Specialty Foods Boston, Costa Fruit & Produce.
- Baseline beverage cohort: Martignetti Companies, Southern Glazer's MA/RI, M.S. Walker, Mancini Beverage, Sheehan Family Companies regional network.
- When an authorized pilot customer provides trailing vendor-spend evidence containing at least five FOOD and five BEVERAGE vendors, the customer's actual top five in each category supersede the baseline cohort for that customer's release gate.
- Aggregate gate is exactly 10/10; 9/10 fails.
- Each required vendor must pass three consecutive authenticated live reads within one 30-minute verification series.
- Latest qualifying series must be no older than 24 hours for a release candidate.
- Public web scraping, private portal browser automation, reverse-engineered sessions, static exports, and synthetic fixtures never satisfy the live gate.
- Secrets and protected payloads never enter git, PR logs, or normal CI artifacts.
- Missing official API/integration access is a legitimate `BLOCKED` result, not a reason to weaken the gate.
- No `--force`, environment override, approval flag, or manual release-state edit may transform a failed/BLOCKED regional gate into PASS.
- Current implementation may complete all gate machinery while live vendors remain BLOCKED; it must never fabricate `REGIONAL_DATA_READY`.

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
it('locks exactly five baseline food and five baseline beverage vendors', () => {
  expect(REGIONAL_VENDOR_COHORT.filter((v) => v.category === 'FOOD')).toHaveLength(5);
  expect(REGIONAL_VENDOR_COHORT.filter((v) => v.category === 'BEVERAGE')).toHaveLength(5);
  expect(new Set(REGIONAL_VENDOR_COHORT.map((v) => v.id)).size).toBe(10);
});
```

- [ ] **Step 2: Define baseline canonical IDs**

```ts
export const VendorIdSchema = z.string().min(1).regex(/^[a-z0-9-]+$/);

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
```

Use open `VendorIdSchema` for customer-specific vendors so actual top-spend vendors can supersede the baseline without a source-code enum edit.

- [ ] **Step 3: Define verification receipt schema**

Required fields: `vendorId`, `vendorName`, `category`, non-secret `accountRef`, `adapterVersion`, `authorizationBasis: VENDOR_API | VENDOR_AUTHORIZED_INTEGRATION`, `operationId`, request/response timestamps, source record IDs when available, schema version, `payloadSha256`, `normalizedSha256`, freshness timestamp, `result: PASS | FAIL | BLOCKED`, error class when not PASS, unsupported fields, `commitSha`, and `buildSha256`.

Receipt schema must reject known secret-bearing keys such as `token`, `authorization`, `cookie`, `password`, and `apiKey`.

- [ ] **Step 4: Implement baseline cohort registry**

Each row has stable ID, canonical name, FOOD/BEVERAGE category, current MA/RI-region rationale, `required: true`, and adapter version.

- [ ] **Step 5: Run and commit**

```bash
pnpm test:unit -- tests/vendor-registry.test.ts
pnpm check
git add shared/contracts/vendors.ts server/vendors/registry.ts tests/vendor-registry.test.ts
git commit -m "feat: lock HostGraph MA RI vendor release cohort"
```

### Task 2: Resolve baseline versus customer-specific top-spend cohort

**Files:**
- Create: `shared/contracts/vendorSpend.ts`
- Create: `server/vendors/resolveRequiredCohort.ts`
- Test: `tests/vendor-cohort-resolution.test.ts`

**Interfaces:**
- Produces: `resolveRequiredVendorCohort(spendRows)` returning exactly five FOOD + five BEVERAGE vendor requirements and an evidence mode `BASELINE | CUSTOMER_TRAILING_SPEND`.

- [ ] **Step 1: Define spend evidence schema**

```ts
export const VendorSpendRowSchema = z.object({
  vendorId: VendorIdSchema,
  vendorName: z.string().min(1),
  category: z.enum(['FOOD', 'BEVERAGE']),
  trailingSpend: z.number().nonnegative(),
  currency: z.literal('USD'),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  sourceRecordIds: z.array(z.string().min(1)).min(1),
});
```

- [ ] **Step 2: Write exact resolver tests**

Required cases:
- absent/empty spend evidence -> baseline 10;
- only four beverage vendors -> baseline 10;
- >=5 food and >=5 beverage -> sort descending by `trailingSpend`, then canonical vendor ID ascending as deterministic tie-break, take top five each;
- resolved customer cohort has exactly 10 unique IDs;
- duplicate spend rows for the same vendor are summed only when currency and period boundaries match; otherwise reject as ambiguous evidence.

- [ ] **Step 3: Implement resolver**

Never mix partial customer evidence with baseline vendors. The customer cohort supersedes baseline only when both categories independently satisfy >=5 source-backed vendors.

- [ ] **Step 4: Run and commit**

```bash
pnpm test:unit -- tests/vendor-cohort-resolution.test.ts
pnpm check
git add shared/contracts/vendorSpend.ts server/vendors/resolveRequiredCohort.ts tests/vendor-cohort-resolution.test.ts
git commit -m "feat: resolve customer top spend vendor cohort"
```

### Task 3: Implement server-only adapter configuration and fail-closed BLOCKED state

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
  readonly vendorId: string;
  readonly version: string;
  verifyLiveRead(context: VendorReadContext): Promise<VendorReadObservation>;
}
```

- [ ] **Step 2: Define environment naming**

For normalized vendor prefix `<PREFIX>` support:
`HOSTGRAPH_VENDOR_<PREFIX>_BASE_URL`, `_READ_PATH`, `_ACCOUNT_ID`, `_AUTH_KIND`, `_TOKEN`, optional `_AUTH_HEADER`, and `_AUTHORIZATION_BASIS`.

`AUTH_KIND` is only `BEARER | HEADER_TOKEN`; no cookie/browser-session mode. `AUTHORIZATION_BASIS` is only `VENDOR_API | VENDOR_AUTHORIZED_INTEGRATION`.

- [ ] **Step 3: Fail closed when config is absent**

Missing required configuration produces `BlockedVendorAdapter` -> `BLOCKED / MISSING_AUTHORIZED_CONFIGURATION` with no network call.

- [ ] **Step 4: Protect runtime evidence paths**

Add `.hostgraph/` to `.gitignore`. Safe receipts live under `.hostgraph/release/vendor-receipts/`.

- [ ] **Step 5: Prove secret hygiene**

Tests serialize diagnostic/config views and assert token/header values never appear.

- [ ] **Step 6: Run and commit**

```bash
pnpm test:unit -- tests/vendor-config.test.ts
pnpm check
git add server/vendors .env.example .gitignore tests/vendor-config.test.ts
git commit -m "feat: fail closed when vendor API authorization is absent"
```

### Task 4: Implement authorized HTTP adapter and canonical commercial-record normalization

**Files:**
- Create: `server/vendors/httpAdapter.ts`
- Create: `shared/contracts/vendorCommercialRecord.ts`
- Test: `tests/vendor-http-adapter.test.ts`

**Interfaces:**
- Produces: `AuthorizedHttpVendorAdapter` and `VendorCommercialRecord`.

- [ ] **Step 1: Define conservative canonical schema**

```ts
export const VendorCommercialRecordSchema = z.object({
  sourceRecordId: z.string().min(1),
  recordType: z.enum(['CATALOG_ITEM', 'PRICE', 'INVOICE', 'CREDIT', 'ORDER', 'DELIVERY', 'TRANSACTION']),
  vendorId: VendorIdSchema,
  accountRef: z.string().min(1),
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

- [ ] **Step 2: Write HTTP tests**

Cover bearer/header auth, timeout, non-2xx, schema rejection, correlation ID, no token in errors, no retry for 401/403, and at most one retry for network/5xx on declared idempotent reads.

- [ ] **Step 3: Call only reviewed configuration**

Do not hardcode guessed distributor paths. `BASE_URL`/`READ_PATH` come from authorized integration configuration. Permit HTTPS only, except localhost in tests.

- [ ] **Step 4: Require vendor-specific normalizer**

PASS requires a registered normalizer that yields at least one valid account-scoped commercial record with source record ID and one commercial datum. Without official response documentation, retain `BlockedVendorAdapter`.

- [ ] **Step 5: Run and commit**

```bash
pnpm test:unit -- tests/vendor-http-adapter.test.ts
pnpm check
git add server/vendors/httpAdapter.ts shared/contracts/vendorCommercialRecord.ts tests/vendor-http-adapter.test.ts
git commit -m "feat: add authorized vendor API adapter boundary"
```

### Task 5: Generate cryptographic live-read verification receipts

**Files:**
- Create: `server/vendors/verifyVendor.ts`
- Create: `server/vendors/receiptStore.ts`
- Test: `tests/vendor-receipt.test.ts`

**Interfaces:**
- Produces: `verifyVendorSeries(adapter, context)` and safe receipt JSON.

- [ ] **Step 1: Test three-read series semantics**

PASS requires three successful reads for same vendor/account/adapter version within 30 minutes.

- [ ] **Step 2: Hash without persisting protected payload**

SHA-256 raw in-memory canonical JSON and normalized canonical JSON. Persist only digests and allowed metadata. Canonical serialization sorts object keys lexicographically.

- [ ] **Step 3: Test normalization idempotence**

Normalize identical captured source response twice and require same `normalizedSha256`.

- [ ] **Step 4: Enforce vendor/account isolation**

Mismatch against vendor/account markers supplied by source yields `IDENTITY_MISMATCH`.

- [ ] **Step 5: Run and commit**

```bash
pnpm test:unit -- tests/vendor-receipt.test.ts
pnpm check
git add server/vendors/verifyVendor.ts server/vendors/receiptStore.ts tests/vendor-receipt.test.ts
git commit -m "feat: emit HostGraph live vendor verification receipts"
```

### Task 6: Implement the non-bypassable 10/10 regional gate verifier

**Files:**
- Create: `scripts/vendor-live-gate.ts`
- Create: `server/release/regionalGate.ts`
- Test: `tests/regional-vendor-gate.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `pnpm gate:vendors` and `RegionalGateResult`.

- [ ] **Step 1: Write fail-closed aggregate tests**

Required: 10 PASS -> PASS; 9 PASS + 1 BLOCKED -> FAIL; stale receipt -> FAIL; adapter/build/commit mismatch -> FAIL; fewer than three reads -> FAIL.

- [ ] **Step 2: Write anti-bypass tests**

Invoke gate with `--force`, `--approve`, and environment variables `HOSTGRAPH_FORCE_VENDOR_GATE=1` / `HOSTGRAPH_RELEASE_OVERRIDE=1`; require either CLI rejection or unchanged FAIL. The verifier must have no code path that consumes an override to change the computed result.

- [ ] **Step 3: Enforce current required cohort**

Use `resolveRequiredVendorCohort()` so a complete source-backed customer top-spend cohort replaces baseline; otherwise baseline applies.

- [ ] **Step 4: Implement freshness policy**

Receipt series <=24h old; all three reads in <=30m; exact build/commit/adapter version match.

- [ ] **Step 5: Add safe CLI**

Human output: category, vendor, adapter version, PASS/FAIL/BLOCKED, verification time, error class. `--json` conforms to Zod and contains no source payload/token.

```json
{ "gate:vendors": "tsx scripts/vendor-live-gate.ts" }
```

Exit 0 only for 10/10 PASS.

- [ ] **Step 6: Run and commit**

```bash
pnpm test:unit -- tests/regional-vendor-gate.test.ts
pnpm gate:vendors -- --json || true
git add scripts/vendor-live-gate.ts server/release/regionalGate.ts tests/regional-vendor-gate.test.ts package.json
git commit -m "feat: enforce ten of ten regional vendor gate"
```

Without authorized configs, expected live result is FAIL/BLOCKED; that is correct.

### Task 7: Implement integrity-protected release manifest

**Files:**
- Create: `shared/contracts/releaseManifest.ts`
- Create: `server/release/createManifest.ts`
- Create: `server/release/verifyManifest.ts`
- Create: `scripts/create-release-manifest.ts`
- Test: `tests/release-manifest.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: HMAC-protected manifest bound to exact build and vendor receipts.

- [ ] **Step 1: Define manifest**

Include commit SHA, build SHA-256, schema versions, CI reference, truth-mode policy version, required cohort evidence mode, all ten adapter IDs/versions, receipt digests, aggregate vendor result, reconciliation result, known issues, release state, generated timestamp.

- [ ] **Step 2: Require HMAC key for `REGIONAL_DATA_READY` or later**

Use `HOSTGRAPH_RELEASE_HMAC_KEY` + HMAC-SHA256. If absent, release cannot advance beyond `INTEGRATION_READY`.

- [ ] **Step 3: Fail verification on receipt/build/cohort mismatch**

- [ ] **Step 4: Add script and commit**

```json
{ "release:manifest": "tsx scripts/create-release-manifest.ts" }
```

```bash
pnpm test:unit -- tests/release-manifest.test.ts
git add shared/contracts/releaseManifest.ts server/release scripts/create-release-manifest.ts tests/release-manifest.test.ts package.json
git commit -m "feat: bind HostGraph release state to verified vendor receipts"
```

### Task 8: Add secure manual live-gate workflow

**Files:**
- Create: `.github/workflows/vendor-live-gate.yml`

**Interfaces:**
- Produces: manual `workflow_dispatch` in protected GitHub Environment `hostgraph-regional-live`.

- [ ] **Step 1: Make workflow manual-only and least privilege**

```yaml
on:
  workflow_dispatch:
permissions:
  contents: read
jobs:
  live_vendor_gate:
    environment: hostgraph-regional-live
```

It never runs on untrusted PRs.

- [ ] **Step 2: Map GitHub Environment secrets to vendor config**

Disable shell xtrace; never echo secrets.

- [ ] **Step 3: Run exact release verification sequence**

Checkout exact commit -> install -> normal tests/build -> compute build digest -> `pnpm gate:vendors` -> create/verify manifest only if gate passes.

- [ ] **Step 4: Upload only safe receipts/manifest**

No raw vendor payload, token, account credentials, invoices, or orders in artifacts.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/vendor-live-gate.yml
git commit -m "ci: add protected HostGraph regional live data gate"
```

### Task 9: Implement source-to-finding real vendor reconciliation gate

**Files:**
- Create: `shared/contracts/reconciliation.ts`
- Create: `server/reconciliation/reconcileVendorLine.ts`
- Create: `server/release/pilotGate.ts`
- Test: `tests/vendor-reconciliation.test.ts`
- Test: `tests/pilot-gate.test.ts`

**Interfaces:**
- Produces: `ReconciliationRecord`, `reconcileVendorLine(input)`, and `PilotGateResult`.

- [ ] **Step 1: Define required evidence chain**

```ts
export const ReconciliationInputSchema = z.object({
  vendorId: VendorIdSchema,
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
  sourceReceiptSha256: z.string().regex(/^[a-f0-9]{64}$/),
  calculationVersion: z.string().min(1),
  beverage: z.object({
    categoryClass: z.string().min(1),
    packageFormat: z.string().min(1),
    distributorId: VendorIdSchema,
  }).optional(),
});
```

- [ ] **Step 2: Write incomplete-evidence tests**

Any missing required chain field returns `INCOMPLETE_EVIDENCE` and emits no Margin Leak finding. Beverage inputs must preserve category/class, package format, and distributor identity in the output.

- [ ] **Step 3: Implement deterministic variance**

Normalize account and paid price to comparable unit basis from pack/unit quantities, then compute variance. Output includes every source ID and calculation version. No finding is emitted when units are incompatible or evidence is ambiguous.

- [ ] **Step 4: Bind reconciliation to a passing regional receipt**

`sourceReceiptSha256` must resolve to a current PASS receipt for the same vendor/account/build. Mismatch -> FAIL.

- [ ] **Step 5: Implement `PILOT_READY` gate**

`pilotGate()` returns PASS only when regional gate is 10/10 PASS and at least one authorized real reconciliation record is COMPLETE and source-linked. Synthetic fixtures are rejected by schema/policy.

- [ ] **Step 6: Run and commit**

```bash
pnpm test:unit -- tests/vendor-reconciliation.test.ts tests/pilot-gate.test.ts
pnpm check
git add shared/contracts/reconciliation.ts server/reconciliation server/release/pilotGate.ts tests/vendor-reconciliation.test.ts tests/pilot-gate.test.ts
git commit -m "feat: require real vendor reconciliation for pilot readiness"
```

### Task 10: Activate individual vendor adapters only from authorized documentation and credentials

**Files:**
- Create for each authorized integration: `server/vendors/adapters/<vendor-id>.ts`
- Modify: `server/vendors/registry.ts` or customer-specific adapter registry.
- Add sanitized contract tests: `tests/vendors/<vendor-id>.test.ts`.

**Interfaces:**
- Converts one vendor from `BlockedVendorAdapter` to an official adapter without changing gate semantics.

For each required vendor, execute this exact sequence:

- [ ] Obtain official vendor API/integration documentation and authorization for the target account.
- [ ] Confirm the operation is account-scoped and returns current commercial data.
- [ ] Implement vendor-specific response schema and normalizer from that documentation only.
- [ ] Add sanitized/redacted contract fixtures proving unsupported/missing fields remain absent.
- [ ] Configure secrets outside source control.
- [ ] Run three protected live reads.
- [ ] Keep vendor `BLOCKED` until all three reads pass.

No adapter is created from guessed endpoints or reverse-engineered portal traffic.

## Plan 4 exit gates

**Framework complete:** registry/cohort resolution, blocked/live adapter boundary, safe configuration, receipts, 10/10 verifier, anti-bypass behavior, manifest integrity, secure workflow, and real reconciliation/pilot gate all pass automated tests.

**`REGIONAL_DATA_READY`:** all ten currently required vendors have authorized account-scoped integrations and three current successful live reads each, producing 10/10 PASS plus a valid manifest.

**`PILOT_READY`:** `REGIONAL_DATA_READY` is already PASS and at least one authorized real vendor sample reconciles end-to-end from vendor source through normalized pricing variance to a source-linked finding.
