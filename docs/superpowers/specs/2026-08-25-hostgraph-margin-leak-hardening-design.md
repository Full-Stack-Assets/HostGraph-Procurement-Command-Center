# HostGraph / Margin Leak Hardening Release Design

## Status
Approved architectural design. This document defines the hardening target before implementation planning.

## Goal
Harden HostGraph into a controlled paid-pilot-quality procurement and margin-intelligence product while keeping Margin Leak Monitor as the commercial service/workflow powered by HostGraph.

The release must improve reliability, evidence integrity, data provenance, API behavior, invoice ingestion, security, testing, accessibility, performance, and repository clarity without prematurely expanding into a generalized multi-tenant SaaS platform.

## Product boundary
- **HostGraph** is the product engine and operator UI for procurement, invoice, vendor, margin, yield, reorder, and alert intelligence.
- **Margin Leak Monitor** is the commercial service and operating workflow that uses HostGraph to analyze source records and prepare owner-review findings.
- No customer value claim is valid solely because HostGraph calculates a number. Findings remain separated by evidence state.
- No external vendor communication, accounting mutation, POS mutation, payment action, or consequential supplier action is introduced by this hardening release.

## Current baseline
The repository already provides a React/Vite procurement command center with six core routes, centralized API calls, invoice upload/queue behavior, synthetic review fixtures, and an August 2026 source-honesty interface contract. The current release also still has several pilot-readiness gaps:

1. API failures can fall back to mock data.
2. API response payloads are trusted by TypeScript casting without runtime validation.
3. The static server is primarily an SPA host rather than a hardened application edge.
4. Dedicated HostGraph behavioral test coverage is thin compared with the breadth of the product.
5. Invoice parsing/review provenance is not yet a complete evidence lifecycle.
6. Experimental/operator research code shares the repository with the HostGraph product surface.
7. Live vendor integration coverage is not yet a release requirement.

## Design choice
Use a **product-hardening release**, not a cosmetic patch and not a full SaaS rebuild.

Retain the existing React 19, Vite, React Router, Tailwind, Tremor/Recharts, centralized API service, current visual system, and six operational routes. Improve the correctness and production boundaries underneath the existing interface.

## 1. Explicit application truth modes
HostGraph must have three mutually exclusive runtime modes:

- `DEMO`: synthetic or repository fixture data only.
- `LIVE`: validated current API data only.
- `DEGRADED`: live data is unavailable, stale beyond policy, schema-invalid, or partially unavailable.

### Required behavior
- `LIVE` mode must never silently substitute synthetic fixtures after a request failure.
- `DEMO` data must be visually and programmatically labeled synthetic.
- `DEGRADED` mode may show the last verified live snapshot if available, but must expose freshness and failure state.
- The current `usingFallback` behavior must be replaced or constrained so mock fallback is impossible in `LIVE`.
- A release test must prove that a failed live API request cannot surface fixture values as live values.

## 2. Evidence and value-state model
Every monetary or operational finding must carry an explicit evidence lifecycle:

`OBSERVED -> DETECTED -> CLIENT_CONFIRMED -> REALIZED`

Definitions:
- `OBSERVED`: source data was ingested and verified as representing the source record.
- `DETECTED`: HostGraph calculated a potential discrepancy or opportunity.
- `CLIENT_CONFIRMED`: an authorized client reviewer confirmed the finding is factually actionable.
- `REALIZED`: a source-backed downstream outcome confirms the credit, refund, price correction, purchasing change, or other realized value.

No UI, report, export, or API response may collapse these states into a single savings number.

Each finding must preserve at minimum:
- finding ID;
- account/location;
- vendor;
- source record IDs;
- source period;
- observed amount;
- calculated variance;
- calculation method/version;
- confidence;
- evidence state;
- reviewer state;
- created/updated timestamps;
- provenance references.

## 3. Runtime API validation and reliability
All production API responses must be validated at runtime with Zod or an equivalent explicit schema validator before entering application state.

### API client requirements
- endpoint-specific runtime schemas;
- bounded request timeout with AbortController;
- structured error categories;
- request/correlation IDs;
- URL-safe dynamic identifiers;
- at most one bounded retry for safe idempotent reads where appropriate;
- no automatic retry of invoice uploads or other mutating calls;
- response freshness metadata;
- API contract/version compatibility field;
- schema-invalid responses rejected rather than partially trusted;
- no `response.json() as T` production acceptance path without runtime validation.

## 4. Auditable invoice ingestion lifecycle
Invoice ingestion must use an explicit state machine:

`UPLOADED -> PARSING -> NEEDS_REVIEW -> VERIFIED -> INCLUDED_IN_ANALYSIS`

Failure branches:
- `FAILED`
- `REJECTED`

Every invoice record must preserve:
- content checksum;
- original filename;
- normalized safe filename/reference;
- upload timestamp;
- organization/location;
- vendor;
- parser/provider and parser version;
- parse state;
- extracted-field confidence;
- reviewer identity/reference;
- review timestamp;
- duplicate status;
- inclusion status;
- source document reference.

Machine-extracted price, pack-size, quantity, credit, tax, fee, or SKU values must not silently become verified evidence.

Duplicate invoices must be detected before duplicate value can enter analysis.

## 5. Product UX hardening
Preserve the current command-center visual design. Do not perform another broad redesign.

Add operational clarity instead:
- persistent data-status rail showing `DEMO`, `LIVE`, or `DEGRADED`;
- freshness timestamp and live-source coverage;
- invoices processed, invoices awaiting review, and data exceptions;
- KPI click-through to evidence summaries;
- Finding Inspector with source record, calculation, comparison basis, confidence, evidence state, and reviewer state;
- explicit next action on critical findings;
- detected / client-confirmed / realized value breakdowns;
- first-class stale, partial, empty, retry, and permission/error states;
- keyboard-accessible critical workflows;
- mobile/tablet operability for owner review surfaces.

## 6. Repository and build-boundary cleanup
The HostGraph production build surface must be unambiguous.

- Keep HostGraph UI, shared contracts, fixtures, tests, and static server clearly separated from unrelated experimental/operator research.
- Preserve historical/operator research; do not delete useful donor IP solely to simplify the product.
- Ensure unrelated `operator/` or COO research does not participate in HostGraph production bundles or release claims.
- Perform an import/dependency audit and remove dependencies that are demonstrably unused by the HostGraph release.
- Manus-specific debug/runtime tooling must remain development-only unless a production dependency is explicitly justified and tested.

## 7. Security hardening
The static application edge must add and test:
- Content-Security-Policy appropriate to the built app;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy`;
- frame restrictions through CSP and/or `X-Frame-Options` where appropriate;
- Permissions-Policy;
- deterministic 404/error behavior;
- `/health` endpoint;
- production log hygiene;
- no development debug/session capture in production unless explicitly enabled by reviewed configuration.

Invoice upload security must reject unsupported extensions/content types, oversized files, malformed content, and unsafe names before analysis.

## 8. Test architecture
CI must expand beyond structural interface assertions.

Required automated coverage:
- money/math and unit/pack conversion tests;
- finding evidence-state transition tests;
- runtime API schema fixtures for valid, malformed, stale, and partial responses;
- live/demo/degraded behavior tests;
- queue merge and duplicate-invoice tests;
- URL/filter state tests;
- freshness/staleness policy tests;
- invoice ingestion lifecycle tests;
- accessibility checks on operator-critical surfaces;
- browser E2E for dashboard -> finding -> drilldown -> invoice upload -> review;
- server security-header and health tests;
- build/typecheck;
- bundle-size budget;
- dependency/security audit appropriate to the JavaScript stack;
- explicit source-honesty regression proving `LIVE` cannot display synthetic fixture values after API failure.

Existing August 2026 source-honesty interface tests remain required.

## 9. Regional vendor live-API gate
This is a hard, non-bypassable release gate for `REGIONAL_DATA_READY` and all later release states.

HostGraph must complete authenticated live API reads against a locked baseline cohort of **10 real MA/RI-region distributors: five food and five beverage vendors**.

### Food vendor release cohort
1. **Sysco Boston** — current Sysco Boston operation in Plympton, Massachusetts.
2. **US Foods** — current service footprint includes Boston and Providence.
3. **Performance Foodservice Boston** — Taunton, Massachusetts operation serving Massachusetts and Rhode Island.
4. **Baldor Specialty Foods Boston** — Boston warehouse serving the New England delivery region.
5. **Costa Fruit & Produce** — Boston-based produce and specialty-food distributor serving New England.

### Beverage vendor release cohort
1. **Martignetti Companies** — Massachusetts/New England wine, spirits, beer, and alternative-beverage distribution with account-specific digital ordering capability.
2. **Southern Glazer's Beverage Company, Massachusetts & Rhode Island** — former Horizon Beverage operations now operating under Southern Glazer's in both states.
3. **M.S. Walker** — direct wine and spirits distribution operations in Massachusetts and Rhode Island.
4. **Mancini Beverage** — total-beverage distribution serving Rhode Island and Connecticut.
5. **Sheehan Family Companies regional network** — Massachusetts-based beverage distribution network including L. Knife & Son and related distributors.

These names form the **regional release-baseline cohort**, not a claim that a single authoritative public market-share ranking exists. Once a real pilot customer provides trailing vendor-spend history, the customer's actual top five food and top five beverage vendors by trailing spend become the required customer-specific cohort wherever they differ.

### What counts as a qualifying live API read
For each of the 10 baseline vendors, the gate requires an authenticated, vendor-authorized, account-scoped machine-to-machine API or vendor-authorized integration endpoint.

A passing connector must demonstrate at least one current account-specific commercial data read such as:
- account-specific catalog/item availability;
- account pricing;
- invoices;
- credits;
- orders;
- delivery status;
- account transaction history.

Generic public catalog data alone does not satisfy the gate.

A public website scrape, browser automation of a private portal, reverse-engineered session call, manually downloaded static export, or synthetic fixture is not a substitute for an authorized API integration.

If a vendor does not expose or authorize a qualifying integration path, that vendor remains `BLOCKED` and the gate remains failed. The release criterion is not weakened to manufacture a green status.

### Connector verification receipt
Every successful vendor check must emit a machine-readable receipt containing:
- vendor ID and canonical vendor name;
- customer/account ID or stable account reference;
- connector/adapter version;
- endpoint/operation identifier;
- request timestamp;
- response timestamp;
- source record IDs where available;
- schema version;
- payload digest/hash;
- normalized record digest/hash;
- data freshness;
- verification result;
- error class when unsuccessful;
- unsupported fields/features explicitly declared.

Secrets, authentication tokens, and protected source payloads must not be committed to the repository or exposed in CI logs.

### Required reliability per vendor
Each of the 10 vendors must pass:
- three consecutive authenticated live reads;
- zero synthetic substitutions;
- zero schema-invalid records accepted;
- zero cross-account or cross-vendor contamination;
- idempotent normalization for an identical captured source response;
- explicit `DEGRADED` or `BLOCKED` state on upstream failure;
- complete provenance from source response to normalized HostGraph record.

The aggregate release gate is **10/10**. Nine of ten does not pass.

## 10. Real vendor reconciliation gate
After the 10/10 live-API gate passes, a controlled real account sample must reconcile end-to-end:

`vendor source -> invoice/order -> line item -> normalized SKU -> pack/unit conversion -> account/contract price -> paid price -> variance -> finding`

For beverage records, preserve beverage category/class, package format, distributor identity, and account-specific pricing context where supplied by the source.

A discrepancy cannot become a Margin Leak finding unless the evidence chain is intact.

## 11. Release-state ladder
HostGraph uses explicit release states:

### `DEMO_READY`
Synthetic command-center experience is working and clearly labeled.

### `INTEGRATION_READY`
Runtime schemas, provenance model, live/demo/degraded separation, invoice lifecycle, and hardening tests pass.

### `REGIONAL_DATA_READY`
The five food + five beverage authenticated live-API gate passes 10/10 with verification receipts.

### `PILOT_READY`
Real vendor records reconcile end-to-end through normalized findings.

### `PAID_PILOT_READY`
Security, E2E, accessibility, evidence, invoice, operational, and regional-data gates pass.

### `PRODUCTION_READY`
Requires real-client operating evidence and reliability beyond a controlled pilot.

Release state may only move forward when all prior gates pass. No manual `force=true`, feature flag, environment variable, or approval-only override may promote a build past a failed regional live-API gate.

## 12. Signed release manifest
Every candidate release at `REGIONAL_DATA_READY` or later must produce a signed or integrity-protected manifest containing:
- commit SHA;
- build artifact digest;
- schema versions;
- test/CI result references;
- application truth-mode policy version;
- all 10 vendor adapter IDs and versions;
- latest qualifying receipt for each vendor;
- vendor gate aggregate result;
- reconciliation-gate result;
- unresolved known issues;
- release state.

The release verifier must fail closed when any required receipt is absent, stale beyond policy, malformed, or references a different build/adapter version.

## 13. Hard failure conditions
A release must fail if any of the following occurs:
- `LIVE` mode silently displays synthetic fixture data;
- a vendor portal is scraped and represented as an API integration;
- credentials or browser sessions are bypassed or reverse engineered without authorization;
- a stale static export is represented as a live call;
- generic public pricing is represented as account pricing;
- unsupported vendor fields are fabricated;
- a missing vendor is substituted with fixture data;
- one vendor's records can be attributed to another account/vendor;
- detected value is displayed as realized value without source-backed outcome evidence;
- a finding cannot be traced back to its underlying source records and calculation version;
- any one of the 10 baseline vendor connectors fails the required release checks.

## 14. Non-goals for this release
Do not add solely for this hardening tranche:
- broad multi-tenant SaaS administration;
- generalized billing/subscription platform;
- autonomous vendor communications;
- autonomous accounting or POS writes;
- automatic credit submission;
- broad national vendor coverage beyond what is needed to satisfy a real pilot or reusable release dependency;
- speculative ML forecasting without source-backed evaluation;
- a new visual redesign.

## 15. Acceptance criteria
The hardening release is complete only when all of the following are verified:
1. `LIVE` cannot render synthetic data after API failure.
2. Every monetary value exposed by HostGraph has provenance and an evidence/value state.
3. Production API payloads are runtime validated.
4. Invoice ingestion has deterministic lifecycle, review, checksum, and duplicate protection.
5. Detected, client-confirmed, and realized value cannot be conflated in UI or exports.
6. All six operational routes have behavioral automated coverage.
7. The paid-pilot critical path passes browser E2E.
8. Accessibility checks pass on operator-critical surfaces.
9. CI runs test, typecheck, build, security checks, and bundle budget.
10. Unrelated experimental code does not participate in the HostGraph production build.
11. Existing source-honesty interface tests remain green.
12. Security-header, production-debug-disable, and health checks pass.
13. All five food vendor and five beverage vendor live-API integrations pass the 10/10 regional gate.
14. Every vendor connector emits current verification receipts with provenance and payload/normalization integrity.
15. A controlled real vendor sample reconciles source-to-finding end-to-end.
16. The signed release manifest verifies the same build and adapter versions being released.
17. No live deployment, customer-data migration, vendor communication, billing action, or accounting/POS mutation is performed merely to satisfy the hardening implementation.

## Current vendor-baseline verification sources
The regional cohort was rechecked on 2026-08-25 against current public/official sources before this spec was committed:

- Sysco Boston: https://www.sysco.com/contact/our-locations/boston
- US Foods Pronto service footprint: https://www.usfoods.com/how-we-deliver/next-day-restaurant-delivery.html
- Performance Foodservice Boston: https://www.performancefoodservice.com/our-locations/boston
- Baldor business delivery footprint: https://help.baldorfood.com/hc/en-us/articles/360021978654-Does-Baldor-deliver-to-business-accounts-in-my-area
- Costa Fruit & Produce: https://www.freshideas.com/about-us/
- Martignetti Massachusetts: https://martignetti.com/martignetti-massachusetts
- Southern Glazer's MA/RI locations: https://www.horizonbeverage.com/who-we-are/southernglazersbeveragecompanylocations
- M.S. Walker: https://www.mswalker.com/
- Mancini Beverage: https://www.mancinibeverage.com/
- Sheehan Family Companies: https://sheehanfamilycompanies.com/

## Implementation boundary
This design authorizes implementation planning, not immediate production release. Implementation should occur on a dedicated review branch with TDD and a draft pull request. The regional vendor gate may remain red until real authorized vendor credentials/integration access are available; blocked integrations must be reported honestly rather than bypassed.