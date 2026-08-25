# HostGraph / Margin Leak Hardening Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute the approved HostGraph / Margin Leak hardening release through four independently reviewable, sequential plans, ending in a non-bypassable 10/10 MA/RI vendor live-API release gate.

**Architecture:** Keep the current HostGraph UI/product surface, harden truth/data contracts first, then invoice/evidence workflows, then security/CI/build boundaries, and finally the regional vendor connector and release-verification layer. Each plan must pass before the next may claim its higher release state.

**Tech Stack:** React 19, TypeScript, Vite, Zod, Vitest, Express, Playwright, GitHub Actions, Node 22.

**Spec:** `docs/superpowers/specs/2026-08-25-hostgraph-margin-leak-hardening-design.md`

## Global Constraints
- No broad visual redesign.
- No autonomous vendor communications, accounting/POS writes, credit submission, billing activation, or production deployment.
- No fabricated customer savings or vendor API capabilities.
- `LIVE` cannot silently display synthetic data.
- Regional vendor gate is 10/10 and cannot be bypassed by flags, manual approval, or fixture substitution.
- Official vendor/authorized integration documentation plus account authorization is required before a blocked adapter may become live.

---

## Execution order

### Plan 1 — Truth Modes and API Validation
Path: `docs/superpowers/plans/2026-08-25-hostgraph-truth-api-hardening.md`

Exit state: `INTEGRATION_READY` foundation for source-honest reads.

Delivers:
- shared Zod contracts;
- `DEMO | LIVE | DEGRADED` runtime behavior;
- no live-to-fixture fallback;
- runtime-validated API reads;
- structured API errors/timeouts/retries;
- all six routes migrated to truth-aware state.

### Plan 2 — Invoice, Evidence, and Operator UX
Path: `docs/superpowers/plans/2026-08-25-hostgraph-invoice-evidence-ux.md`

Exit state: auditable evidence workflow suitable for controlled real-source reconciliation.

Delivers:
- deterministic invoice lifecycle;
- checksums/file preflight/duplicate protection;
- source-linked findings;
- separated detected/client-confirmed/realized value;
- Finding Inspector and data-status rail;
- current reorder progress-bar defect fixed and regression-tested.

### Plan 3 — Security, CI, and Production Boundary
Path: `docs/superpowers/plans/2026-08-25-hostgraph-security-ci-boundary.md`

Exit state: paid-pilot-quality application edge and automated quality gate.

Delivers:
- CSP/security headers and `/health`;
- deterministic 404 behavior;
- Manus diagnostics development-only;
- operator/COO research excluded from production build surface;
- bundle and dependency gates;
- critical-path Playwright and axe accessibility coverage;
- expanded CI.

### Plan 4 — Regional Vendor Live-API Gate
Path: `docs/superpowers/plans/2026-08-25-hostgraph-regional-vendor-gate.md`

Framework exit state: all gate machinery implemented and fail-closed.

Release exit state: `REGIONAL_DATA_READY` only after ten required vendor connectors pass three current authenticated account-scoped live reads each.

Delivers:
- locked 5-food + 5-beverage registry;
- authorized server-side adapter boundary;
- explicit `BLOCKED` state when authorized integration is unavailable;
- cryptographic verification receipts;
- 10/10 aggregate verifier;
- 24-hour receipt freshness and 30-minute three-read series policy;
- HMAC-protected release manifest;
- protected manual live-gate workflow;
- no guessed vendor endpoints.

## Release ladder produced by the plan suite

1. `DEMO_READY` — existing source-honest synthetic experience.
2. `INTEGRATION_READY` — Plans 1–3 pass.
3. `REGIONAL_DATA_READY` — Plan 4 live gate is 10/10 PASS with current receipts.
4. `PILOT_READY` — a controlled real vendor sample reconciles source -> invoice/order -> line -> SKU -> unit/pack -> account price -> paid price -> variance -> finding.
5. `PAID_PILOT_READY` — security, E2E, accessibility, evidence, invoice, operational, and regional-data gates all pass.
6. `PRODUCTION_READY` — requires additional real-client operating and reliability evidence; it is not granted by this implementation suite alone.

## Cross-plan review checkpoints

- [ ] After Plan 1: prove a 503 in LIVE mode cannot display fixture values.
- [ ] After Plan 2: prove a DETECTED finding cannot appear in realized-value totals and an unreviewed invoice cannot enter analysis.
- [ ] After Plan 3: prove built artifacts contain no Manus debug capture or `operator/` research and all six routes pass E2E/accessibility.
- [ ] During Plan 4 framework completion: prove 9/10 PASS still returns non-zero gate exit code.
- [ ] Before `REGIONAL_DATA_READY`: inspect safe receipts for all ten vendors and verify build/commit/adapter versions match the release manifest.
- [ ] Before `PILOT_READY`: reconcile one authorized real sample end-to-end with source IDs and calculation version preserved.

## External blockers that must remain visible

The following are not reasons to fabricate completion:
- a vendor does not offer an authorized machine-to-machine integration;
- official vendor API documentation is unavailable;
- an account lacks permission for API/integration access;
- credentials or account identifiers have not been provisioned;
- a vendor API cannot expose current account-scoped commercial data.

In any such case, the corresponding adapter remains `BLOCKED`, the 10/10 regional gate fails, and HostGraph remains below `REGIONAL_DATA_READY`.
