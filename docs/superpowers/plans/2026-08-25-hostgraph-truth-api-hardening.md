# HostGraph Truth Modes and API Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make HostGraph fail closed on live-data errors, validate every production API payload at runtime, and carry explicit source/provenance metadata into application state.

**Architecture:** Move API response contracts into shared Zod schemas, introduce explicit `DEMO | LIVE | DEGRADED` truth modes, and replace the current generic `useFetch` fallback behavior with a truth-aware read state. Repository fixtures are available only in `DEMO`; `LIVE` and `DEGRADED` never substitute synthetic data.

**Tech Stack:** React 19, TypeScript 5.6, Vite 7, Zod 4, Vitest 2, React Testing Library, jsdom.

**Spec:** `docs/superpowers/specs/2026-08-25-hostgraph-margin-leak-hardening-design.md`

## Global Constraints
- Preserve the current six operational routes and the August 2026 source-honesty interface contract.
- `LIVE` must never render synthetic fixture data after API failure.
- Every accepted production API payload must pass a runtime schema before entering state.
- No `response.json() as T` or equivalent unchecked production acceptance path remains.
- Synthetic fixtures remain in source for `DEMO` mode only and are programmatically marked synthetic.
- In development only, an omitted `VITE_HOSTGRAPH_MODE` may default to `DEMO`.
- In a production build/runtime, missing or invalid `VITE_HOSTGRAPH_MODE` is a configuration failure; production must never silently default to DEMO.
- `DEGRADED` is derived from failed/stale LIVE state and is never manually configured.
- Analytics reads (dashboard, margin, reorder, vendor, shrinkage, benchmark, alerts) become stale after 5 minutes; invoice queue/job status becomes stale after 60 seconds.
- No vendor credentials, billing, production deployment, POS/accounting writes, or external vendor actions are introduced by this plan.

---

## File structure
- Create `shared/contracts/core.ts` for truth mode, evidence state, source metadata, and freshness contracts.
- Create `shared/contracts/analytics.ts` for Zod runtime schemas for every existing API response.
- Create `client/src/lib/runtimeMode.ts`, `client/src/lib/dataReadState.ts`, and `client/src/hooks/useHostGraphData.ts`.
- Replace unchecked request casting in `client/src/services/api.ts`.
- Migrate all six route pages and source-state primitives.
- Add Vitest/Testing Library coverage under `tests/`.

### Task 1: Add repeatable TypeScript unit-test infrastructure

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `tests/core-contracts.test.ts`

**Interfaces:**
- Produces: `pnpm test:unit` for `tests/**/*.test.ts` and `tests/**/*.test.tsx`.

- [ ] **Step 1: Write the red smoke test**

```ts
import { describe, expect, it } from 'vitest';
import { TruthModeSchema } from '@shared/contracts/core';

describe('TruthModeSchema', () => {
  it('accepts only the approved truth states', () => {
    expect(TruthModeSchema.parse('LIVE')).toBe('LIVE');
    expect(() => TruthModeSchema.parse('fallback')).toThrow();
  });
});
```

- [ ] **Step 2: Verify it fails before implementation**

```bash
pnpm exec vitest run tests/core-contracts.test.ts
```

Expected: FAIL because `@shared/contracts/core` does not exist.

- [ ] **Step 3: Add the test dependencies and scripts**

```bash
pnpm add -D @testing-library/react @testing-library/jest-dom jsdom
```

Add:

```json
{
  "test:unit": "vitest run",
  "test:watch": "vitest"
}
```

Create `vitest.config.ts` with `@` -> `client/src` and `@shared` -> `shared` aliases.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts tests/core-contracts.test.ts
git commit -m "test: add HostGraph unit test harness"
```

### Task 2: Define shared truth, provenance, evidence, and freshness contracts

**Files:**
- Create: `shared/contracts/core.ts`
- Modify: `tests/core-contracts.test.ts`

**Interfaces:**
- Produces: `TruthMode`, `EvidenceState`, `SourceMetadata`, `DataFreshness`.

- [ ] **Step 1: Extend the red tests**

```ts
import { EvidenceStateSchema, SourceMetadataSchema } from '@shared/contracts/core';

it('enforces the value lifecycle vocabulary', () => {
  for (const state of ['OBSERVED', 'DETECTED', 'CLIENT_CONFIRMED', 'REALIZED']) {
    expect(EvidenceStateSchema.parse(state)).toBe(state);
  }
  expect(() => EvidenceStateSchema.parse('SAVED')).toThrow();
});

it('requires provenance identifiers and timestamps', () => {
  expect(() => SourceMetadataSchema.parse({ sourceSystem: 'api' })).toThrow();
});
```

- [ ] **Step 2: Implement exact core schemas**

```ts
import { z } from 'zod';

export const TruthModeSchema = z.enum(['DEMO', 'LIVE', 'DEGRADED']);
export const EvidenceStateSchema = z.enum(['OBSERVED', 'DETECTED', 'CLIENT_CONFIRMED', 'REALIZED']);

export const SourceMetadataSchema = z.object({
  sourceSystem: z.string().min(1),
  sourceRecordIds: z.array(z.string().min(1)),
  observedAt: z.string().datetime().nullable(),
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

`sourceRecordIds` may be empty for aggregate endpoints that do not expose row IDs; row-level findings later require at least one source ID.

- [ ] **Step 3: Run and commit**

```bash
pnpm test:unit -- tests/core-contracts.test.ts
pnpm check
git add shared/contracts/core.ts tests/core-contracts.test.ts
git commit -m "feat: define HostGraph truth and provenance contracts"
```

### Task 3: Move all API payload shapes into Zod runtime schemas

**Files:**
- Create: `shared/contracts/analytics.ts`
- Modify: `client/src/data/mockData.ts`
- Create: `tests/analytics-contracts.test.ts`

**Interfaces:**
- Produces runtime schemas and `z.infer` types for dashboard, margin gap, drilldown, inventory, reorder, shrinkage, benchmark, vendor, price trend, alerts, invoice queue, upload response, and job status.

- [ ] **Step 1: Write fixture/schema tests**

```ts
expect(DashboardSummarySchema.parse(dashboardSummary).kpis.length).toBeGreaterThan(0);
expect(MarginGapResponseSchema.parse(marginGapData).rows.length).toBeGreaterThan(0);
expect(() => MarginGapResponseSchema.parse({
  ...marginGapData,
  rows: [{ ...marginGapData.rows[0], actualCost: '3.92' }],
})).toThrow();
```

- [ ] **Step 2: Implement endpoint schemas and infer types from them**

Update `mockData.ts` so fixtures are compile-time checked against the shared inferred types instead of defining a second interface universe.

- [ ] **Step 3: Run and commit**

```bash
pnpm test:unit -- tests/analytics-contracts.test.ts
pnpm check
git add shared/contracts/analytics.ts client/src/data/mockData.ts tests/analytics-contracts.test.ts
git commit -m "feat: validate HostGraph analytics contracts at runtime"
```

### Task 4: Replace unchecked API casting with validated request results

**Files:**
- Modify: `client/src/services/api.ts`
- Create: `tests/api-client.test.ts`

**Interfaces:**
- Produces: `requestValidated(path, schema, options)` and structured `HostGraphApiError`.

- [ ] **Step 1: Write failing tests for valid response, malformed 200 response, timeout, 500, retry behavior, upload no-retry, and encoded `ingredientId`**

```ts
it('rejects a schema-invalid 200 response', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ kpis: 'wrong' }), { status: 200 }),
  ));
  await expect(api.getDashboardSummary()).rejects.toMatchObject({ kind: 'SCHEMA' });
});
```

- [ ] **Step 2: Implement structured errors**

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

Use `crypto.randomUUID()` for `X-HostGraph-Correlation-Id`, `AbortController` with a 10-second default timeout, and Zod `safeParse` before returning data. Safe GET reads may retry once only for network/timeout/5xx failures. Uploads never retry automatically. Encode dynamic path identifiers with `encodeURIComponent`.

- [ ] **Step 3: Prove unchecked casts are gone**

```bash
rg "response\.json\(\).*as|as Promise<" client/src/services
```

Expected: zero production acceptance matches.

- [ ] **Step 4: Run and commit**

```bash
pnpm test:unit -- tests/api-client.test.ts
pnpm check
git add client/src/services/api.ts tests/api-client.test.ts
git commit -m "feat: fail closed on invalid HostGraph API responses"
```

### Task 5: Add runtime mode resolution, endpoint freshness policy, and truth-aware read state

**Files:**
- Create: `client/src/lib/runtimeMode.ts`
- Create: `client/src/lib/freshnessPolicy.ts`
- Create: `client/src/lib/dataReadState.ts`
- Create: `client/src/hooks/useHostGraphData.ts`
- Test: `tests/runtime-mode.test.ts`
- Test: `tests/data-read-state.test.ts`
- Test: `tests/use-hostgraph-data.test.tsx`

**Interfaces:**
- Produces: configured mode `DEMO | LIVE`, runtime state `DEMO | LIVE | DEGRADED`, and endpoint freshness deadlines.

- [ ] **Step 1: Test production configuration failure**

A production-mode resolver with missing/invalid `VITE_HOSTGRAPH_MODE` must throw `HostGraph configuration error`; a development resolver may default to DEMO.

- [ ] **Step 2: Implement fixed freshness policy**

```ts
export const FRESHNESS_MS = {
  analytics: 5 * 60_000,
  invoiceQueue: 60_000,
  invoiceJob: 60_000,
} as const;
```

- [ ] **Step 3: Test state transitions**

Required cases:
- DEMO initializes fixture and never calls live fetcher;
- LIVE successful read stores verified live data;
- LIVE failure with no prior snapshot -> DEGRADED, `data: null`;
- LIVE failure with prior verified snapshot -> DEGRADED with only that snapshot;
- stale snapshot -> DEGRADED;
- no failure/stale transition can inject demo fixtures.

- [ ] **Step 4: Implement hook**

```ts
export function useHostGraphData<T>(options: {
  mode: 'DEMO' | 'LIVE';
  demoData: T;
  fetcher: () => Promise<T>;
  freshnessMs: number;
  dependencies?: readonly unknown[];
  enabled?: boolean;
}): HostGraphReadState<T>
```

- [ ] **Step 5: Run and commit**

```bash
pnpm test:unit -- tests/runtime-mode.test.ts tests/data-read-state.test.ts tests/use-hostgraph-data.test.tsx
pnpm check
git add client/src/lib client/src/hooks/useHostGraphData.ts tests
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
- Remove: `client/src/hooks/useFetch.ts` after all imports are gone.
- Test: `tests/source-honesty-runtime.test.ts`

**Interfaces:**
- Consumes: `useHostGraphData` and fixed freshness policy.
- Produces: route-level explicit source state.

- [ ] **Step 1: Add red source-honesty regression**

Assert no page retains `usingFallback` logic and a LIVE 503 produces `DEGRADED`/`No synthetic substitution`, not demo data.

- [ ] **Step 2: Replace `PageStateBanner` API**

```ts
{ mode: 'DEMO' | 'LIVE' | 'DEGRADED'; error?: string | null; fetchedAt?: string | null }
```

Copy:
- DEMO: `Synthetic demo data`.
- LIVE: `Validated live data`.
- DEGRADED: `Live source degraded — no synthetic substitution`.

- [ ] **Step 3: Migrate pages and shell**

If required LIVE data has no verified snapshot, render an unavailable/error state. Replace the hard-coded `Synthetic data mode` workspace label with actual truth state.

- [ ] **Step 4: Remove legacy hook only after this returns zero imports**

```bash
rg "useFetch" client/src
```

- [ ] **Step 5: Run the complete Plan 1 gate**

```bash
pnpm test:unit
node --test tests/interface-rebuild.test.mjs
pnpm check
pnpm build
```

- [ ] **Step 6: Commit**

```bash
git add client/src shared tests package.json pnpm-lock.yaml vitest.config.ts
git commit -m "feat: enforce HostGraph source-honest runtime modes"
```

## Plan 1 exit gate

A simulated LIVE outage must produce DEGRADED without fixture substitution; stale LIVE data must be visibly degraded; production cannot default to DEMO when configuration is missing; every current endpoint response is runtime-validated; all six routes use the new truth-aware state; and the existing source-honesty interface test remains green.
