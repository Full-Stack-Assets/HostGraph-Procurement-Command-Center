# AOC Repository Instructions

These provider-neutral instructions govern HostGraph / Margin Leak work.

## Authority and sources of truth

- Human Authority is final for consequential actions.
- AOC governance comes from `Full-Stack-Assets/Canon`; this repository is authoritative for HostGraph implementation and test evidence.
- Vendor, invoice, price, inventory, and financial records remain provider-owned evidence and must retain provenance.

## Product truth boundary

- Clearly label live, persisted, simulated, fixture, and mock data.
- Mock fallback may support demonstrations but cannot satisfy production, savings, customer, vendor, or revenue claims.
- A release claiming live procurement coverage must prove successful current API calls for the approved top five food vendors and top five beverage vendors in Massachusetts and Rhode Island, with timestamps and provider receipts.
- Preserve the distinction between detected margin leakage and confirmed recoverable savings.

## Required workflow

1. Run AOC preflight and identify the evidence needed for the requested claim.
2. Inspect API contracts, ingestion paths, fallback behavior, and existing tests.
3. Make the smallest reviewable change without weakening live/mock indicators.
4. Run `pnpm check` and `pnpm build`, plus affected tests.
5. Record source health, data freshness, test results, and limitations.

## Human Authority gates

Production deployment, vendor contact, purchase orders, pricing commitments, invoice actions, payments, external claims of verified savings, credential changes, and protected-branch merges require explicit approval.

## Security

- Never commit vendor credentials, invoice secrets, customer data, or payment material.
- Fail closed when live provider identity, freshness, or response integrity cannot be verified.
