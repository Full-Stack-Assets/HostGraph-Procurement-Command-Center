# HostGraph Interface Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved HostGraph procurement command-center interface on an isolated review branch without changing backend behavior.

**Architecture:** Preserve the current React/Vite/Tailwind/Tremor stack and API/fallback flow. Recompose the existing shell and dashboard using current route/data contracts, with presentation-only projections for the approved overview surfaces.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, React Router, Tremor, Node test runner.

## Global Constraints
- Branch: `review/interface-rebuild-2026-08` only.
- Do not modify backend endpoints, secrets, environments, DNS, or production deployment.
- Do not invent live business outcomes; derive dashboard values from current HostGraph API/fallback data and label fallback/demo state honestly.
- Preserve all existing working routes.

---

### Task 1: Lock the interface contract

**Files:**
- Create: `tests/interface-rebuild.test.mjs`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: repository source files.
- Produces: a CI-enforced structural contract for the approved navigation and dashboard surfaces.

- [ ] **Step 1: Write the failing structural test** asserting the approved shell and dashboard labels are present.
- [ ] **Step 2: Add `node --test tests/interface-rebuild.test.mjs` to CI.**
- [ ] **Step 3: Open a draft PR so pull-request CI runs and verify the new contract fails because the interface is not implemented yet.**

### Task 2: Rebuild the persistent shell

**Files:**
- Modify: `client/src/components/HostGraphShell.tsx`

**Interfaces:**
- Consumes: current React Router routes and route prefetch helpers.
- Produces: approved HostGraph brand rail and route-safe navigation.

- [ ] **Step 1: Replace the current descriptive rail with the compact procurement command-center identity.**
- [ ] **Step 2: Map approved labels to existing implemented routes and render unsupported destinations as disabled navigation entries.**
- [ ] **Step 3: Preserve route prefetch for implemented destinations.**

### Task 3: Rebuild the overview dashboard

**Files:**
- Modify: `client/src/pages/DashboardPage.tsx`

**Interfaces:**
- Consumes: `DashboardSummary`, existing `api.getDashboardSummary()`, fallback data, existing dashboard primitives.
- Produces: approved KPI band, analytical charts, and product-impact table without backend changes.

- [ ] **Step 1: Project available KPI data into three top-line summary cards with accurate labels.**
- [ ] **Step 2: Render the margin-driver analytical surface from current leaking-ingredient data.**
- [ ] **Step 3: Render benchmark/spend category composition from current benchmark data.**
- [ ] **Step 4: Render a Top Products by Margin Impact table from current leaking-ingredient rows.**
- [ ] **Step 5: Preserve `PageStateBanner` and fallback disclosure.**

### Task 4: Verify review readiness

**Files:**
- No new production files.

**Interfaces:**
- Consumes: branch CI and PR state.
- Produces: a reviewable draft PR with typecheck/build/contract test evidence.

- [ ] **Step 1: Verify pull-request CI is green.**
- [ ] **Step 2: Confirm the diff is presentation-only plus test/docs/CI wiring.**
- [ ] **Step 3: Keep the PR draft and do not merge.**