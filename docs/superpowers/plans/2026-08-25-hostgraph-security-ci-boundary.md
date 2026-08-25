# HostGraph Security, CI, and Production-Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the HostGraph application edge, prove the production bundle excludes development/operator research surfaces, and raise CI from build-only confidence to behavioral, security, accessibility, and bundle-quality gates.

**Architecture:** Split the Express server into a testable app factory plus startup entrypoint, add explicit security middleware/health behavior, make Manus/debug tooling development-only, add production-boundary and bundle-budget checks, and run browser E2E/accessibility against a built application.

**Tech Stack:** Express 4, Helmet, TypeScript, Vitest, Supertest, Playwright, @axe-core/playwright, GitHub Actions, pnpm.

**Spec:** `docs/superpowers/specs/2026-08-25-hostgraph-margin-leak-hardening-design.md`

## Global Constraints
- Plans 1 and 2 must be integrated first.
- Preserve SPA route fallback for valid HTML navigation while returning deterministic 404s for missing assets/API paths.
- No development console/session/network capture is allowed in production by default.
- `operator/` and unrelated COO research remain preserved in git history but do not participate in production build inputs or claims.
- Do not add production deployment or secrets in this plan.

---

### Task 1: Make the Express edge testable and add health/security policy

**Files:**
- Create: `server/app.ts`
- Modify: `server/index.ts`
- Modify: `package.json`
- Test: `tests/server-security.test.ts`

**Interfaces:**
- Produces: `createApp(options?: { staticPath?: string })` and `GET /health`.

- [ ] **Step 1: Add dependencies and red tests**

```bash
pnpm add helmet
pnpm add -D supertest @types/supertest
```

Test requirements:

```ts
it('returns a deterministic health response', async () => {
  const response = await request(createApp()).get('/health').expect(200);
  expect(response.body).toMatchObject({ status: 'ok' });
});

it('sets production security headers', async () => {
  const response = await request(createApp()).get('/health');
  expect(response.headers['x-content-type-options']).toBe('nosniff');
  expect(response.headers['referrer-policy']).toBeDefined();
  expect(response.headers['content-security-policy']).toBeDefined();
});
```

- [ ] **Step 2: Implement `createApp`**

Use Helmet with an explicit CSP compatible with same-origin scripts/assets and the current image/font needs. Keep `app.disable('x-powered-by')`. Add:
- `/health` before SPA fallback;
- `Cache-Control: no-store` for `/health`;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- `Permissions-Policy` disabling camera, microphone, geolocation unless a later reviewed feature needs them;
- frame restriction through CSP `frame-ancestors 'none'`.

- [ ] **Step 3: Keep `server/index.ts` startup-only**

```ts
import { createServer } from 'node:http';
import { createApp } from './app';

const app = createApp();
const server = createServer(app);
const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => console.log(`HostGraph listening on ${port}`));
```

- [ ] **Step 4: Test deterministic 404 behavior**

Missing `/assets/*.js` and `/api/*` paths must be 404, never return `index.html`. Valid client-side HTML routes still receive the SPA shell.

- [ ] **Step 5: Commit**

```bash
pnpm test:unit -- tests/server-security.test.ts
pnpm check
git add server package.json pnpm-lock.yaml tests/server-security.test.ts
git commit -m "feat: harden HostGraph application edge"
```

### Task 2: Make Manus/debug runtime strictly development-only

**Files:**
- Modify: `vite.config.ts`
- Test: `tests/production-debug-boundary.test.ts`

**Interfaces:**
- Produces: production Vite plugin list without Manus runtime/debug collector.

- [ ] **Step 1: Add red configuration test**

Export a small pure helper from `vite.config.ts` or `build/vitePlugins.ts`:

```ts
export function hostGraphPlugins(mode: string) {
  const base = [react(), tailwindcss()];
  return mode === 'production' ? base : [...base, jsxLocPlugin(), vitePluginManusRuntime(), vitePluginManusDebugCollector()];
}
```

Test that production plugin names exclude `manus` and `jsx-loc`.

- [ ] **Step 2: Verify production output**

```bash
NODE_ENV=production pnpm build
rg "__manus__|manus-debug-collector|sessionReplay" dist/public dist/index.js
```

Expected: no matches.

- [ ] **Step 3: Commit**

```bash
pnpm test:unit -- tests/production-debug-boundary.test.ts
git add vite.config.ts tests/production-debug-boundary.test.ts
git commit -m "build: keep Manus diagnostics out of production"
```

### Task 3: Enforce HostGraph production-source boundary

**Files:**
- Create: `scripts/check-production-boundary.mjs`
- Modify: `package.json`
- Test: `tests/production-boundary.test.ts`

**Interfaces:**
- Produces: `pnpm check:boundary` failing when production entries import or bundle forbidden research paths.

- [ ] **Step 1: Define forbidden paths**

At minimum:
- `operator/`
- `docs/autonomous-business-ai-plan.md`
- `docs/EXEC-SUMMARY.md`
- `.manus-logs/`

- [ ] **Step 2: Implement source graph scan**

Walk `client/src`, `server`, and `shared`; reject import/require references containing forbidden roots. Also scan `dist/index.js` and `dist/public/assets` after build for unique markers from `operator/`.

- [ ] **Step 3: Add script**

```json
{
  "check:boundary": "node scripts/check-production-boundary.mjs"
}
```

- [ ] **Step 4: Run and commit**

```bash
pnpm build
pnpm check:boundary
pnpm test:unit -- tests/production-boundary.test.ts
git add scripts/check-production-boundary.mjs package.json tests/production-boundary.test.ts
git commit -m "build: enforce HostGraph production source boundary"
```

### Task 4: Add bundle-size budget and dependency audit gates

**Files:**
- Create: `scripts/check-bundle-budget.mjs`
- Modify: `package.json`
- Test: `tests/bundle-budget.test.ts`

**Interfaces:**
- Produces: `pnpm check:bundle` and `pnpm audit:prod`.

- [ ] **Step 1: Establish budgets from current verified bundle, with modest headroom**

Use exact limits:
- any single gzip JS chunk: <= 160 KiB;
- total gzip JS across `dist/public/assets/*.js`: <= 420 KiB;
- `dist/index.js`: <= 500 KiB uncompressed.

If the current build already exceeds a limit, record the observed baseline in the test and set the first limit to baseline + 10%, then reduce it after dependency cleanup; never silently skip the gate.

- [ ] **Step 2: Implement gzip-size check with Node `zlib.gzipSync`**

No extra dependency is needed.

- [ ] **Step 3: Add production audit script**

```json
{
  "check:bundle": "node scripts/check-bundle-budget.mjs",
  "audit:prod": "pnpm audit --prod --audit-level high"
}
```

- [ ] **Step 4: Run and commit**

```bash
pnpm build
pnpm check:bundle
pnpm audit:prod
git add scripts/check-bundle-budget.mjs package.json tests/bundle-budget.test.ts
git commit -m "ci: add HostGraph bundle and dependency gates"
```

### Task 5: Add critical-path browser E2E and accessibility checks

**Files:**
- Modify: `package.json`
- Create: `playwright.config.ts`
- Create: `e2e/hostgraph-critical-path.spec.ts`
- Create: `e2e/accessibility.spec.ts`

**Interfaces:**
- Produces: `pnpm test:e2e` against built/served HostGraph.

- [ ] **Step 1: Add test dependencies**

```bash
pnpm add -D @playwright/test @axe-core/playwright
pnpm exec playwright install chromium
```

- [ ] **Step 2: Configure web server**

Playwright starts:

```bash
pnpm build && NODE_ENV=production PORT=4173 node dist/index.js
```

Use base URL `http://127.0.0.1:4173`.

- [ ] **Step 3: Add critical path**

In DEMO mode:
1. open Overview;
2. assert synthetic mode is visible;
3. navigate to Margins;
4. select a margin row;
5. open Finding Inspector;
6. exercise file preflight with an intentionally rejected unsupported file without sending network data;
7. verify Reorder, Vendors, Products/Shrinkage, and Alerts routes render without console errors.

A separate mocked-LIVE E2E must make the API return 503 and assert `DEGRADED` plus `No synthetic substitution`.

- [ ] **Step 4: Add axe checks**

Run `AxeBuilder` on `/`, `/margin-gap`, `/reorder`, `/vendors`, `/shrinkage`, and `/alerts`; fail on serious or critical violations.

- [ ] **Step 5: Commit**

```bash
pnpm test:e2e
git add package.json pnpm-lock.yaml playwright.config.ts e2e
git commit -m "test: cover HostGraph critical path and accessibility"
```

### Task 6: Expand CI into the hardening release gate

**Files:**
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: CI ordering that fails before build artifacts are accepted.

- [ ] **Step 1: Update CI steps in this order**

1. install dependencies;
2. existing interface contract;
3. `pnpm test:unit`;
4. `pnpm check`;
5. `pnpm build`;
6. `pnpm check:boundary`;
7. `pnpm check:bundle`;
8. `pnpm audit:prod`;
9. install Playwright Chromium;
10. `pnpm test:e2e`.

- [ ] **Step 2: Give CI least privilege**

Retain `permissions: contents: read`; do not add write permissions or secrets.

- [ ] **Step 3: Verify fresh CI run**

Open the implementation PR and require all above steps green before the security/CI plan is accepted.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: enforce HostGraph paid-pilot quality gates"
```

## Plan 3 exit gate

This plan passes when security headers and `/health` are tested, production artifacts contain no Manus debug capture or operator research, bundle/dependency budgets are enforced, all six routes pass browser/accessibility checks, and CI proves the complete hardening gate without production secrets or deployment writes.
