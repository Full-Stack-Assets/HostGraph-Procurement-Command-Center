# HostGraph Invoice, Evidence, and Operator UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn HostGraph invoice ingestion and margin findings into an auditable evidence workflow with explicit lifecycle states, duplicate protection, source-linked findings, and clearer operator UX.

**Architecture:** Extract invoice/queue logic from the 40KB Margin Gap page into focused feature modules, define invoice and finding contracts in shared Zod schemas, and add reusable evidence/status components without redesigning the current command-center visual system.

**Tech Stack:** React 19, TypeScript, Zod, Vitest, React Testing Library, Web Crypto API, existing Tailwind/shadcn/Tremor stack.

**Spec:** `docs/superpowers/specs/2026-08-25-hostgraph-margin-leak-hardening-design.md`

## Global Constraints
- Plan 1 truth/API hardening must be merged into the working branch first.
- Machine-extracted invoice fields never silently become verified evidence.
- Finding states remain exactly `OBSERVED -> DETECTED -> CLIENT_CONFIRMED -> REALIZED`.
- Invoice states remain exactly `UPLOADED -> PARSING -> NEEDS_REVIEW -> VERIFIED -> INCLUDED_IN_ANALYSIS`, with `FAILED` and `REJECTED` branches.
- Detected, client-confirmed, and realized value must be visually and structurally separate.
- Preserve the current six-route interface and visual direction; improve clarity, not aesthetics for aesthetics' sake.

---

## File structure

- Create `shared/contracts/invoices.ts` for invoice lifecycle and extraction contracts.
- Create `shared/contracts/findings.ts` for source-linked finding contracts.
- Create `client/src/features/invoices/queue.ts` for normalization, merging, and duplicate-safe queue behavior.
- Create `client/src/features/invoices/fileValidation.ts` for client-side preflight.
- Create `client/src/features/findings/value.ts` for detected/confirmed/realized rollups.
- Create `client/src/components/DataStatusRail.tsx` and `client/src/components/FindingInspector.tsx`.
- Refactor `MarginGapPage.tsx` to compose these modules instead of owning parsing/queue algorithms.
- Add regression tests for the current reorder progress-bar defect.

### Task 1: Define invoice lifecycle and finding evidence contracts

**Files:**
- Create: `shared/contracts/invoices.ts`
- Create: `shared/contracts/findings.ts`
- Test: `tests/invoice-contracts.test.ts`
- Test: `tests/finding-contracts.test.ts`

**Interfaces:**
- Produces: `InvoiceRecord`, `InvoiceState`, `ExtractedInvoiceField`, `Finding`, `FindingValueBreakdown`.

- [ ] **Step 1: Write red lifecycle tests**

```ts
import { InvoiceStateSchema, canTransitionInvoice } from '@shared/contracts/invoices';

it('allows review verification but rejects skipping review', () => {
  expect(canTransitionInvoice('NEEDS_REVIEW', 'VERIFIED')).toBe(true);
  expect(canTransitionInvoice('PARSING', 'INCLUDED_IN_ANALYSIS')).toBe(false);
  expect(() => InvoiceStateSchema.parse('completed')).toThrow();
});
```

Finding test:

```ts
import { FindingSchema } from '@shared/contracts/findings';

it('requires source records and a calculation version', () => {
  expect(() => FindingSchema.parse({ id: 'f-1', evidenceState: 'DETECTED' })).toThrow();
});
```

- [ ] **Step 2: Implement exact invoice state machine**

```ts
export const INVOICE_TRANSITIONS = {
  UPLOADED: ['PARSING', 'REJECTED', 'FAILED'],
  PARSING: ['NEEDS_REVIEW', 'FAILED', 'REJECTED'],
  NEEDS_REVIEW: ['VERIFIED', 'REJECTED'],
  VERIFIED: ['INCLUDED_IN_ANALYSIS', 'REJECTED'],
  INCLUDED_IN_ANALYSIS: [],
  FAILED: ['PARSING', 'REJECTED'],
  REJECTED: [],
} as const;
```

Each `ExtractedInvoiceField` must include `field`, `rawValue`, `normalizedValue`, `confidence`, `sourceLocator`, and `verified: boolean`.

- [ ] **Step 3: Implement finding schema**

Required fields: `id`, `accountId`, `locationId`, `vendorId`, `sourceRecordIds`, `sourcePeriod`, `observedAmount`, `calculatedVariance`, `calculationMethod`, `calculationVersion`, `confidence`, `evidenceState`, `reviewerState`, `createdAt`, `updatedAt`, `provenance`.

- [ ] **Step 4: Run and commit**

```bash
pnpm test:unit -- tests/invoice-contracts.test.ts tests/finding-contracts.test.ts
pnpm check
git add shared/contracts/invoices.ts shared/contracts/findings.ts tests/invoice-contracts.test.ts tests/finding-contracts.test.ts
git commit -m "feat: define invoice and finding evidence lifecycles"
```

### Task 2: Extract and harden invoice queue algorithms

**Files:**
- Create: `client/src/features/invoices/queue.ts`
- Modify: `client/src/pages/MarginGapPage.tsx`
- Test: `tests/invoice-queue.test.ts`

**Interfaces:**
- Produces: `normalizeQueueItem()`, `mergeQueueItems()`, `queueIdentity()`.

- [ ] **Step 1: Move queue logic under tests before changing behavior**

Test identity priority: stable `jobId`, then server `id`; never `Date.now()` when normalizing a server record.

```ts
it('does not create a new identity when the same live job is polled twice', () => {
  const first = normalizeQueueItem({ jobId: 'job-1', status: 'PARSING' });
  const second = normalizeQueueItem({ jobId: 'job-1', status: 'NEEDS_REVIEW' }, first);
  expect(second.id).toBe(first.id);
});
```

- [ ] **Step 2: Replace legacy status normalization**

Map upstream aliases conservatively:
- `queued` -> `UPLOADED`
- `parsing` -> `PARSING`
- `review` -> `NEEDS_REVIEW`
- `completed` is not automatically verified; map to `NEEDS_REVIEW` unless upstream response explicitly carries verified review evidence.
- `failed` -> `FAILED`

- [ ] **Step 3: Preserve provenance when merging**

A live update may advance state and add metadata, but must not erase checksum, reviewer state, or source references already present.

- [ ] **Step 4: Replace inline functions in `MarginGapPage.tsx`**

Remove `normalizeQueueStatus`, `buildQueueKey`, `normalizeLiveQueueItem`, and `mergeQueueItems` from the page after imports are wired.

- [ ] **Step 5: Run and commit**

```bash
pnpm test:unit -- tests/invoice-queue.test.ts
pnpm check
git add client/src/features/invoices/queue.ts client/src/pages/MarginGapPage.tsx tests/invoice-queue.test.ts
git commit -m "refactor: isolate auditable invoice queue behavior"
```

### Task 3: Add deterministic file preflight and duplicate fingerprints

**Files:**
- Create: `client/src/features/invoices/fileValidation.ts`
- Modify: `client/src/pages/MarginGapPage.tsx`
- Test: `tests/invoice-file-validation.test.ts`

**Interfaces:**
- Produces: `validateInvoiceFile(file)` and `sha256File(file)`.

- [ ] **Step 1: Write red validation tests**

Allow only PDF, CSV, JPEG, PNG. Maximum client preflight size: 20 MiB. Reject empty files and unsafe filename control characters.

```ts
it('rejects executable masquerading by extension', async () => {
  const file = new File(['MZ'], 'invoice.pdf', { type: 'application/x-msdownload' });
  await expect(validateInvoiceFile(file)).rejects.toMatchObject({ code: 'UNSUPPORTED_TYPE' });
});
```

- [ ] **Step 2: Implement SHA-256 fingerprinting with Web Crypto**

```ts
export async function sha256File(file: File) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
```

- [ ] **Step 3: Preflight before upload**

`InvoiceUploadPanel` must validate and fingerprint before `api.uploadInvoice(file)`. Display rejected reason locally; do not issue the POST.

- [ ] **Step 4: Include checksum in upload metadata when the API contract supports it**

Do not put the checksum in a user-visible filename. Keep it as metadata and queue identity evidence.

- [ ] **Step 5: Run and commit**

```bash
pnpm test:unit -- tests/invoice-file-validation.test.ts
pnpm check
git add client/src/features/invoices/fileValidation.ts client/src/pages/MarginGapPage.tsx tests/invoice-file-validation.test.ts
git commit -m "feat: preflight and fingerprint invoice uploads"
```

### Task 4: Add value-state rollups and Finding Inspector

**Files:**
- Create: `client/src/features/findings/value.ts`
- Create: `client/src/components/FindingInspector.tsx`
- Modify: `client/src/pages/MarginGapPage.tsx`
- Modify: `client/src/pages/DashboardPage.tsx`
- Test: `tests/finding-values.test.ts`

**Interfaces:**
- Produces: `summarizeFindingValues(findings)` returning `{ detected, clientConfirmed, realized }`.

- [ ] **Step 1: Write money-state tests**

```ts
it('never counts DETECTED value as realized', () => {
  const totals = summarizeFindingValues([
    finding({ evidenceState: 'DETECTED', calculatedVariance: 100 }),
    finding({ evidenceState: 'REALIZED', calculatedVariance: 40 }),
  ]);
  expect(totals.detected).toBe(140);
  expect(totals.realized).toBe(40);
});
```

- [ ] **Step 2: Implement Finding Inspector fields**

Inspector must show source/vendor/location, source record IDs, source period, observed amount, calculation method/version, variance, confidence, evidence state, reviewer state, timestamps, and the explicit next action.

- [ ] **Step 3: Replace unqualified `Potential Savings` copy**

When only `DETECTED` values exist, use `Detected opportunity`, not `Savings`. `Realized value` only renders from `REALIZED` findings.

- [ ] **Step 4: Wire row click/drilldown to inspector**

Margin rows must make provenance visible without forcing the operator to infer it from narrative copy.

- [ ] **Step 5: Commit after tests**

```bash
pnpm test:unit -- tests/finding-values.test.ts
pnpm check
git add client/src/features/findings/value.ts client/src/components/FindingInspector.tsx client/src/pages/MarginGapPage.tsx client/src/pages/DashboardPage.tsx tests/finding-values.test.ts
git commit -m "feat: separate detected confirmed and realized value"
```

### Task 5: Add persistent data-status rail and honest operational states

**Files:**
- Create: `client/src/components/DataStatusRail.tsx`
- Modify: `client/src/components/HostGraphShell.tsx`
- Modify: `client/src/pages/DashboardPage.tsx`
- Modify: `client/src/pages/MarginGapPage.tsx`
- Modify: `client/src/pages/VendorsPage.tsx`
- Test: `tests/data-status-rail.test.tsx`

**Interfaces:**
- Consumes: Plan 1 read-state metadata.
- Produces: compact view of mode, freshness, source coverage, invoice review count, and data exceptions.

- [ ] **Step 1: Test copy for all three truth modes**

DEMO must include `Synthetic`. DEGRADED must include `No synthetic substitution`. LIVE must expose latest verified fetch time.

- [ ] **Step 2: Add rail to shell without widening primary navigation**

Use a compact section above the existing workspace identity. Do not create a new page.

- [ ] **Step 3: Make stale/partial states actionable**

Show `Refresh`, `Review invoices`, or `Inspect source errors` only where the current state supports that action.

- [ ] **Step 4: Commit**

```bash
pnpm test:unit -- tests/data-status-rail.test.tsx
pnpm check
git add client/src/components/DataStatusRail.tsx client/src/components/HostGraphShell.tsx client/src/pages tests/data-status-rail.test.tsx
git commit -m "feat: surface HostGraph data health and freshness"
```

### Task 6: Repair product-quality regressions and lock them with tests

**Files:**
- Modify: `client/src/pages/ReorderPage.tsx`
- Modify as needed: `client/src/components/dashboard-primitives.tsx`
- Test: `tests/reorder-page.test.tsx`

**Interfaces:**
- Produces: correct par/on-hand visual ratio and truthful status labels.

- [ ] **Step 1: Add regression test for progress width**

Current source contains `style={{ width: `%` }}`. Test a 50/100 inventory fixture and require a rendered `width: 50%`.

- [ ] **Step 2: Fix implementation minimally**

```tsx
style={{ width: `${ratio}%` }}
```

- [ ] **Step 3: Audit remaining hard-coded `Live` labels**

```bash
rg 'Live|live' client/src/components client/src/pages
```

Any source-status label must come from truth state rather than presentation assumptions.

- [ ] **Step 4: Run full plan verification**

```bash
pnpm test:unit
node --test tests/interface-rebuild.test.mjs
pnpm check
pnpm build
```

- [ ] **Step 5: Commit**

```bash
git add client/src tests
git commit -m "fix: harden HostGraph operator UI quality"
```

## Plan 2 exit gate

The plan passes when invoice lifecycle transitions are deterministic, file preflight/duplicate fingerprints are tested, findings are source-linked, detected/confirmed/realized values cannot be conflated, operational data health is visible, and the reorder progress regression is permanently covered.
