# HostGraph Current-Build Reconciliation Design

**Date:** 2026-08-27  
**Canonical repository base:** `fc8cd213a63fea6b13f367939d55d2eca80ff334`  
**Uploaded donor archive:** `mickey-procurement-platform-main.zip`  
**Donor archive SHA-256:** `8c94203b0ffad9e88628a7949a79f3d2e873da8a29ffb93398adf773842a764d`  
**Donor embedded commit:** `0d92f75ed92ad639e922ee200cad95aa14e333a0`

## Goal

Reconcile the uploaded Mickey Malone procurement-platform lineage with the current hardened HostGraph codebase without regressing HostGraph's truth-state, provenance, security, vendor-live, revenue-readiness, build-boundary, or release evidence guarantees.

The result is **one canonical HostGraph product**, not two competing implementations and not a wholesale replacement of hardened `main` with the uploaded archive.

## Executive decision

Current hardened HostGraph `main` remains the canonical trust and release spine.

The uploaded build is treated as a **donor lineage**. It contributes workflow breadth and useful UI/product concepts, but does not supersede the hardened data/evidence model.

### Canonical HostGraph keeps

- `DEMO | LIVE | DEGRADED` truth modes.
- no silent live-to-demo substitution.
- runtime response validation.
- source-honest evidence semantics.
- `DataStatusRail` and `FindingInspector`.
- detected vs client-confirmed vs realized value separation.
- authoritative invoice upload validation.
- API edge and fail-closed upstream behavior.
- regional vendor adapter framework and 10/10 live vendor gate.
- cryptographic vendor verification receipts.
- source-to-finding reconciliation gate.
- release manifest integrity.
- production source-boundary and bundle gates.
- dependency audit.
- `POL-REV-001` revenue-ready first-iteration release gate.

### Donor lineage contributes

The uploaded build contains valuable product/workflow surfaces that the hardened product does not yet expose:

- invoice workspace UI.
- inventory workspace UI.
- supplier-alternative / savings exploration UI.
- broader operator navigation and workflow concepts.
- an order/delivery data model that may later support delivery-channel economics.
- authenticated-shell concepts and role separation ideas.
- optional internal acquisition/licensing/strategic-plan material.

These are donor capabilities, not proof that their current backing data is production-ready.

## Critical donor findings

### 1. Procurement UI breadth is ahead of procurement persistence

The donor archive looks substantially more full-stack, but its Drizzle persistence schema is primarily:

- users.
- public customer orders.
- third-party delivery orders.
- order status history.
- delivery feature/rating/promotion records.

The major procurement pages currently source their data from the large client-side `client/src/lib/data.ts` fixture module:

- Dashboard.
- Vendors.
- Inventory.
- Invoices.
- Margin Gaps.
- Alerts.
- Shrinkage.
- Reorder.
- Supplier Savings.
- Acquisition.
- Licenses.
- Strategic Plan.

Therefore the donor does **not** replace HostGraph's procurement evidence layer or vendor data contracts.

### 2. Donor authentication cannot be promoted as-is

The archive contains two divergent identity patterns:

- server-side Manus/OAuth scaffolding.
- a client `AuthContext` with static users and plaintext demo PIN/password values persisted through browser storage.

The static credential path is explicitly demo-only and is prohibited from canonical HostGraph production code.

The Manus-specific OAuth plumbing is not adopted as the HostGraph identity architecture merely because it exists. Authentication will be a separate bounded hardening tranche when an intended identity provider and deployment model are selected.

### 3. Donor payment flow is quarantined

The donor Stripe workflow must not enter canonical production unchanged because:

- PaymentIntent amount is derived from client-submitted totals.
- line item prices/subtotal/tax/total are accepted from the client rather than recomputed from an authoritative server catalog.
- `confirmPayment` accepts a client-supplied payment status.
- payment confirmation does not establish a strict order-to-PaymentIntent ownership invariant before state transition.
- the tRPC `handleStripeWebhook` procedure is public and accepts an event type from the caller rather than verifying a Stripe webhook signature over a raw request body.

The code may be retained as donor reference, but no payment code is promoted in the reconciliation release.

### 4. Delivery integrations contain salvageable ideas but are not canonical yet

The donor includes delivery event persistence and separate HMAC-verifying Express webhook handlers. This is useful donor work.

However:

- there are also public tRPC delivery webhook procedures.
- provider signature semantics require provider-current verification before production use.
- raw webhook payload storage needs explicit retention/redaction policy.
- delivery mutations are outside the core Margin Leak procurement release.

The initial reconciliation therefore excludes delivery writes. A future read-only **Channel Economics** module may reuse the data model after signature, source-contract, privacy, and test hardening.

## Reconciliation model

### Tier A: Promote into the canonical product now

1. **Invoices workspace**
   - new `/invoices` operator route.
   - uses HostGraph truth modes.
   - DEMO uses explicitly synthetic donor-derived fixtures.
   - LIVE requires a validated HostGraph API response; no donor fixture fallback.
   - exposes document/vendor/date/amount/state/provenance fields conservatively.
   - links to existing invoice ingestion lifecycle where applicable.

2. **Inventory workspace**
   - new `/inventory` route.
   - DEMO fixture data is explicitly synthetic.
   - LIVE values remain unavailable unless supplied through a validated HostGraph response.
   - no stock or reorder value is invented from unrelated UI state.

3. **Supplier Opportunities workspace**
   - donor `SupplierSavings` is renamed/reframed to avoid claiming realized savings.
   - new `/supplier-opportunities` route.
   - fields are treated as candidate alternatives / detected opportunities.
   - no saving becomes client-confirmed or realized without evidence transition.

4. **Navigation reconciliation**
   - add these three modules to `HostGraphShell` and route prefetch.
   - preserve current route names and current lazy-loading architecture.
   - do not import the donor Wouter router or donor DashboardLayout.

### Tier B: Preserve as donor/reference for a later tranche

- Delivery platform UI and delivery event model.
- acquisition screen.
- licensing screen.
- strategic plan screen.
- role concepts from the auth shell.

These are not operator-critical enough to justify increasing the reconciliation blast radius.

### Tier C: Explicitly reject from canonical production

- static usernames/PINs/passwords.
- browser-local role authorization as a security boundary.
- public menu/order storefront as part of the Margin Leak product.
- client-authoritative pricing/tax/total calculations for charges.
- client-authoritative payment status.
- public tRPC webhook mutation surfaces.
- direct import of Render/Vercel deployment configuration.
- wholesale replacement of current `package.json`/lockfile with donor dependencies.
- donor `axios`, vulnerable/unused dependency lineage, or any dependency that reintroduces a current production audit failure.

## Data contracts

The reconciliation adds conservative runtime contracts under `shared/contracts/procurementWorkspaces.ts`.

### Invoice summary

Minimum fields:

- `id` / source record ID.
- vendor ID/name.
- invoice/document number when supplied.
- document date.
- total amount/currency when source supplied.
- processing/review state.
- source system.
- source timestamp/freshness.
- provenance locator where safe.

Unknown fields remain optional/unavailable.

### Inventory summary

Minimum fields:

- source record ID.
- location ID/name.
- item/SKU/name.
- vendor ID/name when supplied.
- quantity and unit only when source supplied.
- par/reorder fields only when source supplied.
- source timestamp/freshness.

Pack/unit conversion is never inferred silently.

### Supplier opportunity

Minimum fields:

- opportunity ID.
- current vendor/item identity.
- candidate vendor/item identity.
- comparison basis.
- detected estimated variance/opportunity, optional.
- evidence state (`DETECTED` only in initial surface).
- confidence.
- source record IDs.
- provenance.

The UI must use language such as **detected opportunity**, **candidate alternative**, or **estimated variance**, never **realized savings**, unless the underlying evidence state permits that claim.

## API behavior

Add client methods with runtime Zod parsing for:

- `GET /api/v1/invoices`
- `GET /api/v1/inventory`
- `GET /api/v1/supplier-opportunities`

These are read-only analytical endpoints.

The current Express API edge may proxy them to `HOSTGRAPH_UPSTREAM_API` under the same fail-closed policy as existing analytics endpoints.

Initial canonical server does not create a new database merely to make the routes appear live.

## DEMO fixture policy

The donor fixtures may be transformed into small, isolated HostGraph fixtures but must be:

- namespaced as synthetic donor-derived data.
- explicitly labeled in source metadata.
- impossible to render as LIVE data.
- limited to fields required to exercise the operator workflow.
- free of donor demo credentials.

Do not import the entire ~59 KB donor `data.ts` module.

## UX principles

The current HostGraph industrial command-center shell remains canonical.

New pages should feel native to current HostGraph rather than visually transplanting the Mickey layout.

Each page must include:

- current truth mode visibility.
- loading, unavailable, degraded, and empty states.
- source/freshness visibility.
- operator-oriented table/list behavior.
- no unqualified synthetic financial claims.

## Testing and release gates

### New contract tests

- runtime schema rejects malformed invoice/inventory/opportunity responses.
- DEMO fixtures parse and are explicitly synthetic.
- LIVE API failure never displays donor fixture data.
- supplier opportunity language cannot use `realized savings` for DETECTED records.
- unknown pack/unit values remain unavailable.

### Route/UI tests

- `/invoices`, `/inventory`, `/supplier-opportunities` exist.
- all three are lazy-loaded through current route infrastructure.
- all three appear in current navigation.
- source-honesty banners/status surfaces render.

### Regression gates

Every reconciliation commit must continue to pass:

- interface contract.
- full unit/contract suite.
- TypeScript.
- DEMO production build.
- production source-boundary gate.
- bundle budget.
- production dependency audit.
- existing vendor-live gate tests.
- release manifest tests.
- `POL-REV-001` workflow/manifest integrity.

The real 10-vendor live gate is **not** run as part of this reconciliation because authorized account configuration remains separately gated.

## Implementation sequence

### Reconciliation Release 1

Port the three missing procurement workspaces only:

1. runtime contracts and fixture adapters.
2. API client methods.
3. Invoices page.
4. Inventory page.
5. Supplier Opportunities page.
6. shell/navigation/route prefetch integration.
7. tests and full CI.

This is the immediate delivery target.

### Reconciliation Release 2

After Release 1 is green, assess canonical persistence for real procurement entities:

- vendor accounts.
- invoice documents and line items.
- inventory observations.
- normalization exceptions.
- supplier opportunity records.
- evidence transitions.

This must extend HostGraph's evidence model rather than transplanting the donor order/delivery MySQL schema as a procurement database.

### Reconciliation Release 3

Optional read-only channel economics module from delivery integrations, only after provider-current webhook/API contracts and signature rules are reverified.

## Acceptance criteria for Reconciliation Release 1

The release is complete when:

1. Current hardened HostGraph remains the application shell and trust spine.
2. Three new procurement workspaces are usable in DEMO with explicit synthetic labeling.
3. The same pages fail closed in LIVE/DEGRADED when source data is unavailable.
4. No donor auth, Stripe mutation, delivery mutation, deployment config, or broad fixture blob is imported.
5. No production dependency audit regression is introduced.
6. Existing margin/evidence/vendor/revenue release gates remain intact.
7. Normal PR CI is green on the exact final head.
8. No production deployment or external account access occurs.
