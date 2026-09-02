# HostGraph Reconciliation Release 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Invoices, Inventory, and Supplier Opportunities workspaces from the uploaded donor lineage to current hardened HostGraph without importing donor auth/payment/delivery mutations or weakening source-honesty/release gates.

**Architecture:** Keep current React Router + `HostGraphShell` + `useHostGraphData` + Zod-validated API client as canonical. Add one focused procurement-workspace contract module, one small donor-derived DEMO fixture module, three read-only API methods, and three lazy-loaded operator pages. LIVE remains fail-closed because `useHostGraphData` never substitutes DEMO fixtures after a live read failure.

**Tech Stack:** React 19, React Router, TypeScript, Zod, Vitest, existing HostGraph UI primitives.

**Spec:** `docs/superpowers/specs/2026-08-27-hostgraph-mickey-reconciliation-design.md`

## Global Constraints

- Canonical base is hardened HostGraph `fc8cd213a63fea6b13f367939d55d2eca80ff334`.
- Uploaded donor archive SHA-256 is `8c94203b0ffad9e88628a7949a79f3d2e873da8a29ffb93398adf773842a764d`.
- Donor data may be used only as explicitly synthetic DEMO fixtures.
- No donor plaintext credentials, Manus auth, Stripe mutation, delivery mutation, Render/Vercel config, or donor lockfile/dependency graph is imported.
- No `realized savings` claim may render from a `DETECTED` supplier opportunity.
- No pack/unit conversion may be inferred silently.
- LIVE/DEGRADED must never render donor fixtures after source failure.
- Existing 10/10 vendor gate, release manifest, dependency audit, source-boundary, bundle budget, and `POL-REV-001` remain intact.
- No production deployment or external account access occurs in this release.

---

### Task 1: Procurement workspace contracts + minimal donor fixtures

**Files:**
- Create: `shared/contracts/procurementWorkspaces.ts`
- Create: `client/src/data/procurementWorkspaceFixtures.ts`
- Test: `tests/procurement-workspace-contracts.test.ts`

**Interfaces:**
- Produces: `InvoiceWorkspaceResponseSchema`, `InventoryWorkspaceResponseSchema`, `SupplierOpportunityResponseSchema` and inferred types.
- Produces fixtures: `invoiceWorkspaceFixture`, `inventoryWorkspaceFixture`, `supplierOpportunityFixture`.

- [ ] **Step 1: Write RED contract tests**

Tests must assert:

```ts
expect(InvoiceWorkspaceResponseSchema.parse(invoiceWorkspaceFixture).source.kind).toBe('SYNTHETIC_FIXTURE');
expect(InventoryWorkspaceResponseSchema.parse(inventoryWorkspaceFixture).items.every((item) => item.unit !== '')).toBe(true);
expect(SupplierOpportunityResponseSchema.parse(supplierOpportunityFixture).opportunities.every((o) => o.evidenceState === 'DETECTED')).toBe(true);
expect(() => SupplierOpportunityResponseSchema.parse({
  ...supplierOpportunityFixture,
  opportunities: [{ ...supplierOpportunityFixture.opportunities[0], evidenceState: 'REALIZED' }],
})).toThrow();
```

- [ ] **Step 2: Verify RED**

Run `pnpm test:unit -- tests/procurement-workspace-contracts.test.ts` and require failure because the contract/fixture modules do not yet exist.

- [ ] **Step 3: Implement conservative schemas**

Create a strict common source schema:

```ts
const WorkspaceSourceSchema = z.object({
  kind: z.enum(['SYNTHETIC_FIXTURE', 'LIVE_SOURCE']),
  sourceSystem: z.string().min(1),
  freshAt: z.string().datetime(),
  recordCount: z.number().int().nonnegative(),
  provenanceRef: z.string().min(1),
}).strict();
```

Invoice row fields: `id`, `vendorId`, `vendorName`, `invoiceNumber?`, `documentDate`, `totalAmount?`, `currency?`, `state: RECEIVED|PARSING|REVIEW|VERIFIED|FAILED`, `sourceRecordId`, `exceptionCount`.

Inventory row fields: `sourceRecordId`, `locationId`, `locationName`, `sku?`, `itemName`, `vendorId?`, `vendorName?`, `quantity?`, `unit?`, `parLevel?`, `reorderPoint?`, `observedAt`.

Supplier opportunity fields: `id`, current/candidate vendor and item labels, `comparisonBasis`, optional `currentPrice`, optional `candidatePrice`, optional `estimatedVariance`, `currency`, `evidenceState: z.literal('DETECTED')`, `confidence` 0..1, non-empty `sourceRecordIds`, provenance array.

- [ ] **Step 4: Implement small donor-derived fixtures**

Use at most three invoice rows, four inventory rows, and four supplier opportunities. Set:

```ts
source: {
  kind: 'SYNTHETIC_FIXTURE',
  sourceSystem: 'Uploaded donor lineage fixture',
  provenanceRef: 'mickey-procurement-platform-main.zip#sha256=8c94203b0ffad9e88628a7949a79f3d2e873da8a29ffb93398adf773842a764d',
  ...
}
```

Use only obviously synthetic/demo-safe values. Do not import donor contact emails/phone numbers or credentials.

- [ ] **Step 5: Verify GREEN**

Run the focused test then full `pnpm test:unit` and `pnpm check`.

- [ ] **Step 6: Commit**

Commit: `feat: add reconciled procurement workspace contracts`.

---

### Task 2: Zod-validated read-only API methods

**Files:**
- Modify: `client/src/services/api.ts`
- Test: `tests/api-client.test.ts`

**Interfaces:**
- Consumes schemas from Task 1.
- Produces `api.getInvoicesWorkspace()`, `api.getInventoryWorkspace()`, `api.getSupplierOpportunities()`.

- [ ] **Step 1: Add RED API tests**

For each method, stub `fetch` with a valid response and require the exact path:

```ts
'/api/v1/invoices'
'/api/v1/inventory'
'/api/v1/supplier-opportunities'
```

Add one malformed supplier response test that expects `HostGraphApiError.kind === 'SCHEMA'`.

- [ ] **Step 2: Verify RED**

Run `pnpm test:unit -- tests/api-client.test.ts`; failure must be missing methods.

- [ ] **Step 3: Implement minimal methods**

Import the three schemas and add GET methods through existing `requestValidated()` only. Do not add Axios or another HTTP client.

- [ ] **Step 4: Verify GREEN**

Run focused test, full unit suite, and `pnpm check`.

- [ ] **Step 5: Commit**

Commit: `feat: add procurement workspace read APIs`.

---

### Task 3: Invoices operator workspace

**Files:**
- Create: `client/src/pages/InvoicesPage.tsx`
- Test: `tests/procurement-workspace-ui.test.tsx`

**Interfaces:**
- Consumes `api.getInvoicesWorkspace`, `invoiceWorkspaceFixture`, `useHostGraphData`, `DataStatusRail`, dashboard primitives.

- [ ] **Step 1: Write RED UI source contract**

Assert the page imports and calls `useHostGraphData`, `api.getInvoicesWorkspace`, uses `invoiceWorkspaceFixture`, renders `DataStatusRail`, and includes copy `Synthetic donor-derived fixture` and `No synthetic substitution`.

- [ ] **Step 2: Verify RED**

Run the focused test and require missing page failure.

- [ ] **Step 3: Implement page**

Page requirements:
- `HeroPanel` title `Invoice workspace`.
- `DataStatusRail` with mode/fetchedAt. Only show processed/exception counts if derived from the actual current response.
- table: vendor, invoice/document, date, state, total, exceptions.
- currency formatting only when amount and currency exist; otherwise `Unavailable`.
- source note from response metadata.
- loading state via `LoadingPanel`.
- no client-side write/mutation controls.

- [ ] **Step 4: Verify GREEN**

Run focused test, full unit suite, `pnpm check`.

- [ ] **Step 5: Commit**

Commit: `feat: add source-honest invoices workspace`.

---

### Task 4: Inventory operator workspace

**Files:**
- Create: `client/src/pages/InventoryPage.tsx`
- Extend: `tests/procurement-workspace-ui.test.tsx`

**Interfaces:**
- Consumes `api.getInventoryWorkspace`, `inventoryWorkspaceFixture`, `useHostGraphData`, `DataStatusRail`.

- [ ] **Step 1: RED tests**

Require imports/calls and copy proving unknown quantity/unit values render as `Unavailable` rather than inferred conversions.

- [ ] **Step 2: Verify RED**

Focused test must fail because page does not exist.

- [ ] **Step 3: Implement page**

Render location, item/SKU, vendor, observed quantity/unit, par, reorder point, observed time. Do not calculate missing pack/unit conversions.

- [ ] **Step 4: Verify GREEN**

Focused test, full unit suite, `pnpm check`.

- [ ] **Step 5: Commit**

Commit: `feat: add source-honest inventory workspace`.

---

### Task 5: Supplier Opportunities workspace

**Files:**
- Create: `client/src/pages/SupplierOpportunitiesPage.tsx`
- Extend: `tests/procurement-workspace-ui.test.tsx`

**Interfaces:**
- Consumes `api.getSupplierOpportunities`, `supplierOpportunityFixture`, DETECTED-only contract.

- [ ] **Step 1: RED tests**

Require page to contain `Detected opportunity`, `Candidate alternative`, and **not** contain `realized savings` or `saved` as a financial outcome claim.

- [ ] **Step 2: Verify RED**

Focused test must fail because page does not exist.

- [ ] **Step 3: Implement page**

Render current vendor/item, candidate vendor/item, comparison basis, current/candidate price when supplied, optional estimated variance, evidence state, confidence, source-count/provenance summary. A detected estimate is never upgraded by UI copy.

- [ ] **Step 4: Verify GREEN**

Focused test, full unit suite, `pnpm check`.

- [ ] **Step 5: Commit**

Commit: `feat: add detected supplier opportunities workspace`.

---

### Task 6: Canonical route/navigation integration + full release verification

**Files:**
- Modify: `client/src/lib/routePrefetch.ts`
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/HostGraphShell.tsx`
- Test: `tests/procurement-workspace-ui.test.tsx`

**Interfaces:**
- Adds routes `/invoices`, `/inventory`, `/supplier-opportunities` to the current lazy-loading architecture.

- [ ] **Step 1: RED route tests**

Read the three source files and require all three routes in route modules, lazy imports in `App.tsx`, and enabled navigation rows in `HostGraphShell`.

- [ ] **Step 2: Verify RED**

Focused test must fail on missing routes.

- [ ] **Step 3: Integrate routes**

Use existing icons already available from Lucide where possible. Preserve current routes and shell. Do not import Wouter or donor `DashboardLayout`.

Suggested nav reconciliation:
- Overview
- Margins
- Invoices
- Inventory
- Orders
- Vendors
- Supplier Opportunities
- Products
- Alerts

- [ ] **Step 4: Full verification**

Run:

```bash
node --test tests/interface-rebuild.test.mjs
pnpm test:unit
pnpm check
VITE_HOSTGRAPH_MODE=DEMO pnpm build
pnpm check:boundary
pnpm check:bundle
pnpm audit:prod
```

Expected: all exit 0 and production audit reports no high-severity production vulnerabilities.

Do **not** run the real vendor live gate.

- [ ] **Step 5: Review diff for prohibited donor imports**

Reject the release if the diff contains any of:
- `@trpc/`
- `stripe`
- `drizzle`
- `mysql2`
- `wouter`
- static donor PINs/passwords
- donor `render.yaml` / `vercel.json`
- donor webhook mutation code

- [ ] **Step 6: Commit and open draft PR**

Commit: `feat: reconcile donor procurement workspaces into HostGraph`.

PR body must state:
- donor archive hash.
- promoted workspaces.
- quarantined donor capabilities.
- test/build/audit evidence.
- no deployment/live vendor calls/external mutations.
