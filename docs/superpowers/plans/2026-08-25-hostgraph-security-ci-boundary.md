# HostGraph Security, CI, and Production-Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the HostGraph application edge, make invoice upload validation authoritative on the server, prove the production bundle excludes development/operator research surfaces, and raise CI from build-only confidence to behavioral, security, accessibility, and bundle-quality gates.

**Architecture:** Split the Express server into a testable app factory plus startup entrypoint, add explicit security middleware/health behavior, terminate and validate invoice uploads at the HostGraph edge before any upstream handoff, make Manus/debug tooling development-only, add production-boundary and fixed bundle-budget checks, and run browser E2E/accessibility against a built application.

**Tech Stack:** Express 4, Helmet, Multer, file-type, TypeScript, Vitest, Supertest, Playwright, @axe-core/playwright, GitHub Actions, pnpm.

**Spec:** `docs/superpowers/specs/2026-08-25-hostgraph-margin-leak-hardening-design.md`

## Global Constraints
- Plans 1 and 2 must be integrated first.
- Preserve SPA route fallback for valid HTML navigation while returning deterministic 404s for missing assets/API paths.
- No development console/session/network capture is allowed in production by default.
- `operator/` and unrelated COO research remain preserved in git history but do not participate in production build inputs or release claims.
- Server-side invoice validation is authoritative; client preflight from Plan 2 is usability only.
- Accepted invoice file types are PDF, CSV, JPEG, and PNG; maximum size is 20 MiB; empty files, unsafe names, type/extension mismatches, and malformed content are rejected before forwarding.
- Invalid invoice uploads are never forwarded upstream and are never persisted to local disk.
- Do not add production deployment, billing, secrets, vendor/account writes, or external vendor actions in this plan.

---

### Task 1: Make the Express edge testable and add an exact security policy

**Files:**
- Create: `server/app.ts`
- Modify: `server/index.ts`
- Modify: `package.json`
- Test: `tests/server-security.test.ts`

**Interfaces:**
- Produces: `createApp(options?: { staticPath?: string; upstreamApiBaseUrl?: string })` and `GET /health`.

- [ ] **Step 1: Add dependencies and red tests**

```bash
pnpm add helmet
pnpm add -D supertest @types/supertest
```

```ts
it('returns a deterministic health response', async () => {
  const response = await request(createApp()).get('/health').expect(200);
  expect(response.body).toMatchObject({ status: 'ok' });
});

it('sets the required security headers', async () => {
  const response = await request(createApp()).get('/health');
  expect(response.headers['x-content-type-options']).toBe('nosniff');
  expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(response.headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(response.headers['permissions-policy']).toContain('camera=()');
});
```

- [ ] **Step 2: Implement exact CSP and headers**

Use Helmet with this policy unless a tested production asset requires a narrower explicit addition:

```text
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: https://d2xsxph8kpxj0f.cloudfront.net;
connect-src 'self';
frame-ancestors 'none';
base-uri 'self';
object-src 'none';
```

Also set `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, and `Permissions-Policy: camera=(), microphone=(), geolocation=()`.

- [ ] **Step 3: Add `/health` before SPA fallback**

Return JSON `{ "status": "ok" }` with `Cache-Control: no-store`.

- [ ] **Step 4: Keep `server/index.ts` startup-only**

```ts
import { createServer } from 'node:http';
import { createApp } from './app';

const app = createApp({ upstreamApiBaseUrl: process.env.HOSTGRAPH_UPSTREAM_API });
const server = createServer(app);
const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => console.log(`HostGraph listening on ${port}`));
```

- [ ] **Step 5: Test deterministic routing behavior**

Missing `/assets/*.js` and `/api/*` routes return 404/appropriate API errors, never `index.html`. Valid client HTML routes still receive the SPA shell.

- [ ] **Step 6: Run and commit**

```bash
pnpm test:unit -- tests/server-security.test.ts
pnpm check
git add server package.json pnpm-lock.yaml tests/server-security.test.ts
git commit -m "feat: harden HostGraph application edge"
```

### Task 2: Make invoice upload validation authoritative at the server edge

**Files:**
- Create: `server/invoices/uploadGuard.ts`
- Create: `server/invoices/uploadRoute.ts`
- Modify: `server/app.ts`
- Modify: `package.json`
- Test: `tests/server-invoice-upload.test.ts`

**Interfaces:**
- Produces: `validateInvoiceUpload(buffer, originalName, declaredMime)` and `POST /api/v1/invoices/upload` edge behavior.

- [ ] **Step 1: Add dependencies and red tests**

```bash
pnpm add multer file-type
pnpm add -D @types/multer
```

Tests must cover: valid PDF/CSV/JPEG/PNG, >20 MiB, empty file, unsafe/control-character filename, executable renamed `.pdf`, extension/MIME mismatch, malformed image/PDF signature, no upstream configuration, and invalid upload never forwarded.

- [ ] **Step 2: Use in-memory Multer storage only**

```ts
multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
})
```

No upload path on local disk is permitted.

- [ ] **Step 3: Validate type from bytes, not filename alone**

Use `file-type` for PDF/JPEG/PNG. For CSV, require UTF-8-decodable non-empty text, no NUL bytes, and a conservative delimiter/line structure check. Require the detected/validated type to match an allowed extension.

- [ ] **Step 4: Recompute authoritative SHA-256 on the server**

The server fingerprint, not the client checksum, is used for downstream duplicate evidence.

- [ ] **Step 5: Fail closed when upstream ingestion is absent**

If `HOSTGRAPH_UPSTREAM_API` is missing, return HTTP 503 with structured code `UPSTREAM_NOT_CONFIGURED`. Do not synthesize a job ID or success response.

- [ ] **Step 6: Forward only validated files**

When configured, forward the validated in-memory file to `${HOSTGRAPH_UPSTREAM_API}/api/v1/invoices/upload` as multipart with correlation ID and checksum metadata. Do not log the file body. Preserve upstream non-2xx as structured errors.

- [ ] **Step 7: Run and commit**

```bash
pnpm test:unit -- tests/server-invoice-upload.test.ts
pnpm check
git add server/invoices server/app.ts package.json pnpm-lock.yaml tests/server-invoice-upload.test.ts
git commit -m "feat: validate invoice uploads at HostGraph edge"
```

### Task 3: Make Manus/debug runtime strictly development-only

**Files:**
- Modify: `vite.config.ts`
- Test: `tests/production-debug-boundary.test.ts`

**Interfaces:**
- Produces: production plugin list without Manus runtime/debug collector or JSX-location instrumentation.

- [ ] **Step 1: Add red configuration test**

Extract `hostGraphPlugins(mode)` and assert production plugin names exclude `manus`, `debug-collector`, and `jsx-loc`.

- [ ] **Step 2: Verify built output**

```bash
NODE_ENV=production pnpm build
rg "__manus__|manus-debug-collector|sessionReplay" dist/public dist/index.js
```

Expected: zero matches.

- [ ] **Step 3: Commit**

```bash
pnpm test:unit -- tests/production-debug-boundary.test.ts
git add vite.config.ts tests/production-debug-boundary.test.ts
git commit -m "build: keep Manus diagnostics out of production"
```

### Task 4: Enforce the HostGraph production-source boundary

**Files:**
- Create: `scripts/check-production-boundary.mjs`
- Modify: `package.json`
- Test: `tests/production-boundary.test.ts`

**Interfaces:**
- Produces: `pnpm check:boundary`.

- [ ] **Step 1: Lock forbidden production roots**

At minimum: `operator/`, `docs/autonomous-business-ai-plan.md`, `docs/EXEC-SUMMARY.md`, `.manus-logs/`.

- [ ] **Step 2: Scan source graph and built output**

Walk `client/src`, `server`, and `shared` for imports/references to forbidden roots; after build scan `dist/index.js` and `dist/public/assets` for unique operator/debug markers.

- [ ] **Step 3: Add script and run**

```json
{ "check:boundary": "node scripts/check-production-boundary.mjs" }
```

```bash
pnpm build
pnpm check:boundary
pnpm test:unit -- tests/production-boundary.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add scripts/check-production-boundary.mjs package.json tests/production-boundary.test.ts
git commit -m "build: enforce HostGraph production source boundary"
```

### Task 5: Add fixed bundle-size and dependency-security gates

**Files:**
- Create: `scripts/check-bundle-budget.mjs`
- Modify: `package.json`
- Test: `tests/bundle-budget.test.ts`

**Interfaces:**
- Produces: `pnpm check:bundle` and `pnpm audit:prod`.

- [ ] **Step 1: Encode non-moving limits**

- any single gzip JS chunk: <= 160 KiB;
- total gzip JS under `dist/public/assets/*.js`: <= 420 KiB;
- `dist/index.js`: <= 500 KiB uncompressed.

The implementation must optimize if these fixed limits fail; it must not increase the limits as part of this hardening release.

- [ ] **Step 2: Implement gzip checks with Node `zlib.gzipSync`**

- [ ] **Step 3: Add scripts**

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
pnpm test:unit -- tests/bundle-budget.test.ts
git add scripts/check-bundle-budget.mjs package.json tests/bundle-budget.test.ts
git commit -m "ci: add HostGraph bundle and dependency gates"
```

### Task 6: Add critical-path browser E2E and accessibility checks

**Files:**
- Modify: `package.json`
- Create: `playwright.config.ts`
- Create: `e2e/hostgraph-critical-path.spec.ts`
- Create: `e2e/accessibility.spec.ts`

**Interfaces:**
- Produces: `pnpm test:e2e` against built/served HostGraph.

- [ ] **Step 1: Add dependencies**

```bash
pnpm add -D @playwright/test @axe-core/playwright
pnpm exec playwright install chromium
```

- [ ] **Step 2: Configure production web server**

Start `pnpm build && NODE_ENV=production PORT=4173 VITE_HOSTGRAPH_MODE=DEMO node dist/index.js`; base URL `http://127.0.0.1:4173`.

- [ ] **Step 3: Add DEMO critical path**

Open Overview; assert synthetic mode; navigate Margins; select a margin row; open Finding Inspector; exercise rejected unsupported-file preflight without upstream network; verify Reorder, Vendors, Products/Shrinkage, and Alerts render with no console errors.

- [ ] **Step 4: Add mocked-LIVE failure E2E**

Serve/mocks must return 503 for API reads; assert `DEGRADED` and `No synthetic substitution`, and assert a known synthetic fixture value does not appear.

- [ ] **Step 5: Add axe checks**

Run Axe on `/`, `/margin-gap`, `/reorder`, `/vendors`, `/shrinkage`, `/alerts`; fail on serious or critical violations.

- [ ] **Step 6: Commit**

```bash
pnpm test:e2e
git add package.json pnpm-lock.yaml playwright.config.ts e2e
git commit -m "test: cover HostGraph critical path and accessibility"
```

### Task 7: Expand CI into the hardening release gate

**Files:**
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: ordered fail-closed CI.

- [ ] **Step 1: Run these steps in order**

1. install dependencies;
2. existing interface contract;
3. `pnpm test:unit`;
4. `pnpm check`;
5. `VITE_HOSTGRAPH_MODE=DEMO pnpm build`;
6. `pnpm check:boundary`;
7. `pnpm check:bundle`;
8. `pnpm audit:prod`;
9. install Playwright Chromium;
10. `pnpm test:e2e`.

- [ ] **Step 2: Retain least privilege**

Keep `permissions: contents: read`; no write permissions or secrets in ordinary PR CI.

- [ ] **Step 3: Verify fresh PR CI**

All steps must be green before this plan is accepted.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: enforce HostGraph paid-pilot quality gates"
```

## Plan 3 exit gate

Security headers and `/health` are tested; invoice uploads are server-validated and never forwarded when invalid; production artifacts contain no Manus debug capture or operator research; fixed bundle/dependency budgets pass; all six routes pass browser/accessibility checks; and CI proves the complete hardening gate without production secrets or deployment writes.
