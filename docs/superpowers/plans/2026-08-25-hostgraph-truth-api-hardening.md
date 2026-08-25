# HostGraph Truth Modes and API Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make HostGraph fail closed on live-data errors, validate every production API payload at runtime, and carry explicit source/provenance metadata into application state.

**Architecture:** Move API response contracts into shared Zod schemas, introduce explicit `DEMO | LIVE | DEGRADED` truth modes, and replace the current generic `useFetch` fallback behavior with a truth-aware read state. Demo fixtures stay available only in `DEMO`; `LIVE` and `DEGRADED` never substitute repository fixtures.

**Tech Stack:** React 19, TypeScript 5.6, Vite 7, Zod 4, Vitest 2, React Testing Library, jsdom.

**Spec:** `docs/superpowers/specs/2026-08-25-hostgraph-margin-leak-hardening-design.md`

## Global Constraints
- Preserve the current six operational routes and the August 2026 source-honesty interface contract.
- Do not change vendor credentials, production deployment, billing, POS/accounting writes, or external vendor actions.
- `LIVE` must never render synthetic fixture data after API failure.
- Every accepted production payload must pass a runtime schema before entering state.
- No `response.json() as T` production acceptance path remains after this plan.
- Keep synthetic data in the repository for `DEMO` mode only and label it programmatically as synthetic.

---

## File structure

- Create `shared/contracts/core.ts` for truth-mode, source metadata, API envelope, and evidence-state contracts.
- Create `shared/contracts/analytics.ts` for dashboard, margin, reorder, vendor, shrinkage, benchmark, and alert Zod schemas.
- Create `client/src/lib/runtimeMode.ts` for runtime-mode resolution.
- Create `client/src/lib/dataReadState.ts` for the pure data-state reducer.
- Create `client/src/hooks/useHostGraphData.ts` for the React data-loading hook.
- Replace `client/src/services/api.ts` request casting with schema-validated reads.
- Modify all six route pages and `dashboard-primitives.tsx` to consume explicit truth state.
- Create `tests/core-contracts.test.ts`, `tests/api-client.test.ts`, and `tests/data-read-state.test.ts`.

### Task 1: Add repeatable TypeScript unit-test infrastructure

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

**Interfaces:**
- Produces: `pnpm test:unit` running `tests/**/*.test.ts` in Node and `tests/**/*.test.tsx` in jsdom.

- [ ] **Step 1: Add failing smoke test**

Create `tests/core-contracts.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { TruthModeSchema } from '@shared/contracts/core';

describe('TruthModeSchema', () => {
  it('accepts only DEMO, LIVE, and DEGRADED', () => {
    expect(TruthModeSchema.parse('LIVE')).toBe('LIVE');
    expect(() => TruthModeSchema.parse('fallback')).toThrow();
  });
});
```

- [ ] **Step 2: Run the test and verify red state**

Run:

```bash
pnpm exec vitest run tests/core-contracts.test.ts
```

Expected: FAIL because `@shared/contracts/core` does not exist.

- [ ] **Step 3: Add scripts and test dependencies**

Add dev dependencies:

```bash
pnpm add -D @testing-library/react @testing-library/jest-dom jsdom
```

Add scripts:

```json
{
  "test:unit": "vitest run",
  "test:watch": "vitest"
}
```

Create `vitest.config.ts` with repository aliases matching Vite:

```ts
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'client/src'),
      '@shared': path.resolve(import.meta.dirname, 'shared'),
    },
  },
  test: { include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'] },
});
```

- [ ] **Step 4: Commit test scaffold**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts tests/core-contracts.test.ts
git commit -m "test: add HostGraph unit test harness"
```

### Task 2: Define shared truth, provenance, and evidence contracts

**Files:**
- Create: `shared/contracts/core.ts`
- Expand test: `tests/core-contracts.test.ts`

**Interfaces:**
- Produces: `TruthMode`, `EvidenceState`, `SourceMetadata`, `ApiEnvelope<T>`, `DataFreshness`.

- [ ] **Step 1: Extend the failing test**

```ts
import { EvidenceStateSchema, SourceMetadataSchema } from '@shared/contracts/core';

it('enforces the evidence lifecycle vocabulary', () => {
  for (const state of ['OBSERVED', 'DETECTED', 'CLIENT_CONFIRMED', 'REALIZED']) {
    expect(EvidenceStateSchema.parse(state)).toBe(state);
  }
  expect(() => EvidenceStateSchema.parse('SAVED')).toThrow();
});

it('requires source timestamps and provenance identifiers', () => {
  expect(() => SourceMetadataSchema.parse({ source: 'api' })).toThrow();
});
```

- [ ] **Step 2: Implement exact schemas**

```ts
import { z } from 'zod';

export const TruthModeSchema = z.enum(['DEMO', 'LIVE', 'DEGRADED']);
export type TruthMode = z.infer<typeof TruthModeSchema>;

export const EvidenceStateSchema = z.enum([
  'OBSERVED',
  'DETECTED',
  'CLIENT_CONFIRMED',
  'REALIZED',
]);
export type EvidenceState = z.infer<typeof EvidenceStateSchema>;

export const SourceMetadataSchema = z.object({
  sourceSystem: z.string().min(1),
  sourceRecordIds: z.array(z.string().min(1)).min(1),
  observedAt: z.string().datetime(),
  fetchedAt: z.string().datetime(),
  schemaVersion: z.string().min(1),
  correlationId: z.string().min(1),
  synthetic: z.boolean(),
});

export const DataFreshnessSchema = z.object({
  fetchedAt: z.string().datetime(),
  staleAfter: z.string().datetime(),
});
```

- [ ] **Step 3: Run contracts test**

```bash
pnpm test:unit -- tests/core-contracts.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add shared/contracts/core.ts tests/core-contracts.test.ts
git commit -m "feat: define HostGraph truth and provenance contracts"
```

### Task 3: Move API payload shapes into Zod runtime schemas

**Files:**
- Create: `shared/contracts/analytics.ts`
- Modify: `client/src/data/mockData.ts`
- Create: `tests/analytics-contracts.test.ts`

**Interfaces:**
- Consumes: `SourceMetadataSchema`.
- Produces: runtime schemas and inferred TypeScript types for every existing read endpoint.

- [ ] **Step 1: Write red schema tests using current fixtures**

```ts
import { DashboardSummarySchema, MarginGapResponseSchema } from '@shared/contracts/analytics';
import { dashboardSummary, marginGapData } from '@/data/mockData';

it('accepts repository demo fixtures', () => {
  expect(DashboardSummarySchema.parse(dashboardSummary).kpis.length).toBeGreaterThan(0);
  expect(MarginGapResponseSchema.parse(marginGapData).rows.length).toBeGreaterThan(0);
});

it('rejects malformed money fields', () => {
  expect(() => MarginGapResponseSchema.parse({ ...marginGapData, rows: [{ ...marginGapData.rows[0], actualCost: '3.92' }] })).toThrow();
});
```

- [ ] **Step 2: Define schemas for all existing endpoint payloads**

Implement Zod schemas corresponding exactly to current `mockData.ts` interfaces: dashboard summary, margin gap, drilldown, inventory levels, reorder response, shrinkage response, benchmarks, vendor response, price trends, alerts, ingestion queue, upload response, and job status.

Infer exported TypeScript types from schemas with `z.infer` and update `mockData.ts` imports so fixture data is compile-time checked against those types.

- [ ] **Step 3: Run schema and type checks**

```bash
pnpm test:unit -- tests/analytics-contracts.test.ts
pnpm check
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add shared/contracts/analytics.ts client/src/data/mockData.ts tests/analytics-contracts.test.ts
git commit -m "feat: validate HostGraph analytics contracts at runtime"
```

### Task 4: Replace unchecked API casting with validated request results

**Files:**
- Modify: `client/src/services/api.ts`
- Create: `tests/api-client.test.ts`

**Interfaces:**
- Produces: `requestValidated<T>(path, schema, options)` returning validated payload plus request metadata.

- [ ] **Step 1: Write failing request tests**

Cover: valid response, malformed JSON shape, timeout, 500 response, safe GET retry once, upload no retry, URL encoding of `ingredientId`.

Example:

```ts
it('rejects schema-invalid successful responses', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ kpis: 'wrong' }), { status: 200 })));
  await expect(api.getDashboardSummary()).rejects.toMatchObject({ kind: 'SCHEMA' });
});
```

- [ ] **Step 2: Implement structured errors**

Define:

```ts
type ApiErrorKind = 'HTTP' | 'NETWORK' | 'TIMEOUT' | 'SCHEMA' | 'ABORTED';

export class HostGraphApiError extends Error {
  constructor(
    public readonly kind: ApiErrorKind,
    message: string,
    public readonly status?: number,
    public readonly correlationId?: string,
  ) { super(message); }
}
```

Use `crypto.randomUUID()` for `X-HostGraph-Correlation-Id`, `AbortController` with a 10-second default timeout, and Zod `safeParse` before returning data.

Only safe GET reads may retry once, and only for network/timeout/5xx failures. `uploadInvoice()` never retries automatically.

Dynamic identifiers must be encoded with `encodeURIComponent`.

- [ ] **Step 3: Remove all `response.json() as T` paths**

Search:

```bash
rg "response\.json\(\).*as|as Promise<" client/src/services
```

Expected after implementation: no production API cast path.

- [ ] **Step 4: Run tests**

```bash
pnpm test:unit -- tests/api-client.test.ts
pnpm check
```

- [ ] **Step 5: Commit**

```bash
git add client/src/services/api.ts tests/api-client.test.ts
git commit -m "feat: fail closed on invalid HostGraph API responses"
```

### Task 5: Replace fallback semantics with an explicit data-state reducer

**Files:**
- Create: `client/src/lib/runtimeMode.ts`
- Create: `client/src/lib/dataReadState.ts`
- Create: `client/src/hooks/useHostGraphData.ts`
- Test: `tests/data-read-state.test.ts`
- Test: `tests/use-hostgraph-data.test.tsx`

**Interfaces:**
- Produces: `HostGraphReadState<T>` with `mode`, `status`, `data`, `lastVerifiedData`, `error`, `fetchedAt`, `stale`.

- [ ] **Step 1: Write reducer tests first**

Required cases:
- DEMO initializes from fixture and marks it synthetic.
- LIVE successful read becomes LIVE with validated data.
- LIVE failed read with no verified snapshot becomes DEGRADED with `data: null`.
- LIVE failed read with previous verified snapshot becomes DEGRADED and preserves only that snapshot.
- No transition from LIVE failure may inject demo fixture data.

- [ ] **Step 2: Implement mode resolution**

`client/src/lib/runtimeMode.ts` must read `VITE_HOSTGRAPH_MODE`, accept only `DEMO` or `LIVE`, and default to `DEMO` for local development. `DEGRADED` is runtime-derived, never manually configured.

- [ ] **Step 3: Implement `useHostGraphData`**

Signature:

```ts
export function useHostGraphData<T>(options: {
  mode: 'DEMO' | 'LIVE';
  demoData: T;
  fetcher: () => Promise<T>;
  dependencies?: readonly unknown[];
  enabled?: boolean;
}): HostGraphReadState<T>
```

In DEMO, do not call the live fetcher. In LIVE, do not use `demoData` after any failure.

- [ ] **Step 4: Run hook tests in jsdom**

```bash
pnpm test:unit -- tests/data-read-state.test.ts tests/use-hostgraph-data.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add client/src/lib/runtimeMode.ts client/src/lib/dataReadState.ts client/src/hooks/useHostGraphData.ts tests/data-read-state.test.ts tests/use-hostgraph-data.test.tsx
git commit -m "feat: add explicit HostGraph live demo degraded states"
```

### Task 6: Migrate all six routes and source-state UI

**Files:**
- Modify: `client/src/pages/DashboardPage.tsx`
- Modify: `client/src/pages/MarginGapPage.tsx`
- Modify: `client/src/pages/ReorderPage.tsx`
- Modify: `client/src/pages/VendorsPage.tsx`
- Modify: `client/src/pages/ShrinkagePage.tsx`
- Modify: `client/src/pages/AlertsPage.tsx`
- Modify: `client/src/components/dashboard-primitives.tsx`
- Modify: `client/src/components/HostGraphShell.tsx`
- Deprecate/remove: `client/src/hooks/useFetch.ts` after no call sites remain.
- Test: `tests/source-honesty-runtime.test.ts`

**Interfaces:**
- Consumes: `useHostGraphData`.
- Produces: route-level explicit `DEMO`, `LIVE`, or `DEGRADED` presentation.

- [ ] **Step 1: Add a red source-honesty test**

The test must assert that the route source contains no `usingFallback` logic and that `LIVE` failure copy says data is unavailable/degraded rather than saying demo fallback is active.

- [ ] **Step 2: Replace `PageStateBanner` contract**

Change it to accept:

```ts
{ mode: 'DEMO' | 'LIVE' | 'DEGRADED'; error?: string | null; fetchedAt?: string | null }
```

Copy rules:
- DEMO: `Synthetic demo data`.
- LIVE: `Validated live data`.
- DEGRADED: `Live source degraded — no synthetic substitution`.

- [ ] **Step 3: Migrate six pages**

Use `resolveConfiguredMode()` and `useHostGraphData`. If a required LIVE payload has no verified snapshot, render `EmptyCopy`/error state instead of fixtures.

- [ ] **Step 4: Update shell identity**

Replace the hard-coded `Synthetic data mode` text with the current configured/runtime state.

- [ ] **Step 5: Delete obsolete fallback hook only after zero imports remain**

```bash
rg "useFetch" client/src
```

Expected: zero results before deleting `client/src/hooks/useFetch.ts`.

- [ ] **Step 6: Run full plan verification**

```bash
pnpm test:unit
node --test tests/interface-rebuild.test.mjs
pnpm check
pnpm build
```

Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add client/src tests shared package.json pnpm-lock.yaml vitest.config.ts
git commit -m "feat: enforce HostGraph source-honest runtime modes"
```

## Plan 1 exit gate

This plan passes only when a simulated LIVE API outage demonstrably produces `DEGRADED` with no fixture substitution, every existing endpoint response is runtime-validated, all six routes compile against the new read state, and the existing August source-honesty contract remains green.
