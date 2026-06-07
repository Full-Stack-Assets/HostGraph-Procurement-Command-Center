# Verified Operator — MVP scaffold

A zero-dependency Node skeleton of the **verified autonomous growth operator** described in
[`../docs/autonomous-business-ai-plan.md`](../docs/autonomous-business-ai-plan.md). It is a
runnable architecture stub — real model/API calls are stubbed so it runs locally with no
keys — meant to make the plan concrete, not to be production.

## The verified operating loop

```
plan → dispatch → verify → gate → govern → report → learn
```

| Step | Module | Notes |
|------|--------|-------|
| validate (pre-loop) | `src/validation.js` | Red/green demand check; refuse to build on "red". |
| plan | `src/loop.js` | Rank the queue (value, then FIFO). |
| **dispatch** | `src/cooEngine.js` | **COO Engine** — fitness routing + fallback + predictive spawn. |
| verify | `src/verification.js` | Independent "proof of work" (200 OK, email landed, ad live…). |
| gate | `src/approvals.js` | HITL approval for high-risk actions; auto-approve safe ones. |
| **govern** | `src/cooEngine.js` | **COO Engine** — cost-aware retirement + budget circuit breaker. |
| report | `src/loop.js` | Verified cycle report for the reliability dashboard. |
| learn | `src/loop.js` | Persist only *validated* outcomes. |
| analytics | `src/analytics.js` | `mini-extra`-style read-only metrics over state. |
| dashboard | `src/dashboard.js` | Public reliability dashboard (success/refund/approval rates). |

The COO Engine owns **dispatch** and **govern**; verification and approval gates are
deliberately separate — the router never grades its own work. The engine constants mirror
the spec: weights (type 0.30 / cost 0.25 / latency 0.20 / load 0.15 / budget 0.10),
fitness threshold `> 0.55`, budget headroom `0.85`, retire at util `> 0.92` or `25` idle
ticks, spawn when `queued_of_type > 2`.

## Run it

```bash
cd operator
node --test          # run the unit tests (19 pass)
node src/sim.js      # run the in-browser-style simulation (no API keys)
node src/sim.js 20 0.25   # 20 cycles, 25% simulated action-failure rate
```

The sim ends by printing the **reliability dashboard** (the plan's trust moat):

```
┌─ Reliability Dashboard ───────────────────────────────
│ health:            OK
│ task-success rate: 68.4%  (39/57 verified)
│ refund rate:       31.6%  (18 auto-refunds on failed actions)
│ approval rate:     100.0%  (16/16 gated actions approved)
│ ...
```

## `mini` CLI (mirrors the COO Engine's `mini`)

Dump state from a sim run, then inspect it:

```bash
node src/sim.js --out ./.state.json
node bin/mini.js dashboard  --state ./.state.json     # publishable reliability metrics
node bin/mini.js health     --state ./.state.json --json
node bin/mini.js budget --state ./.state.json
```

Commands: `stats` · `queue` · `budget` · `health` · `decisions` · `agent <id>` ·
`project-cost` · `dashboard`. All accept `--json` and `--state <path>`. The programmatic
equivalents live in `src/analytics.js` (`getAgentStats`, `analyzeTaskQueue`,
`getBudgetReport`, `projectFutureCost`, `analyzeDecisions`, `getSystemHealth`).

## What's a stub vs. real

- **Stubbed:** worker execution, the verification probes, the validation signals, and the
  human approver (auto-approves in sim). These are the integration points.
- **Real:** the COO Engine routing/spawn/retirement math, the loop control flow, the
  budget circuit breaker, the refund-on-failed-verification path, and the audit log.

## Next steps toward the real MVP (per the plan, Phase 1)

1. Replace `workers.*` with real tool calls (email/deliverability API, cloud deploy, ad APIs) behind least-privilege scopes.
2. Replace `verifyAction` branches with real probes (HTTP 200 check, deliverability webhook, ad-platform status).
3. Wire `approver` to a mobile push + one-tap approve/reject (LangGraph `interrupt()`).
4. Persist `state` to Postgres (durable checkpointer) and expose the report/audit log to the public reliability dashboard.
5. Feed real demand signals into `validateIdea`.
