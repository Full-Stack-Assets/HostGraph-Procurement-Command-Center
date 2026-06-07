# Plan: A Verified, Vertical Autonomous-Business AI Product

> Derived from the research report *"Beating Polsia: A Solo Founder's Playbook for a
> Superior Autonomous-Business AI Product."* This document converts that research
> into an actionable plan: positioning, scope, feature backlog, architecture,
> go-to-market, a phased roadmap with concrete milestones, and the decision gates
> that should change the plan.

## 1. Thesis (one line)

> **"The AI operator that proves its work — and never spends your money on a guess."**

Do **not** clone the "run any company fully autonomously" pitch — that is the part
that is failing across the category. Win on **trust + verification + vertical depth**.

## 2. The three structural gaps we exploit

| # | Gap | What incumbents do wrong | What we do instead |
|---|-----|--------------------------|--------------------|
| 1 | **Validation** | Execute any idea (even "surprise me") with no demand check | Demand/validation gate *before* any spend |
| 2 | **Verification** | Mark tasks "complete" that never deployed | Independently verify every action actually worked |
| 3 | **Trust / control** | Take unauthorized, irreversible actions | Human-in-the-loop approval on high-blast-radius actions |

These three gaps map directly to Polsia's most-cited failures (no idea validation,
fake "complete" tasks, unauthorized outreach, locked-in code, opaque 20% take).

## 3. Beachhead (pick ONE)

**Autonomous *growth* operator for B2B micro-SaaS / indie founders.**

Does the one thing solo founders hate and neglect — **distribution**:
validated-first outbound + content + SEO/GEO + ad ops — with every action verified
and high-stakes actions gated behind one-tap mobile approval.

Why this wedge:
- Attacks the report's core finding that **demand/distribution is the real bottleneck**, not execution.
- Customers feel acute pain, already pay for tools, congregate in reachable communities, and will evangelize.
- Matches a solo, cloud-only, mobile-first, bootstrapped constraint.

## 4. Differentiated feature set → backlog

Each feature maps to a specific competitor weakness. Ordered by how essential it is to the MVP.

- [ ] **Verification layer ("proof of work")** — *MVP-critical.* Every agent action is
      independently checked by a cheaper checker model/tool: deployed URL returns 200 and
      renders; email passes deliverability and lands; ad campaign is live within its budget
      cap; Stripe webhook fires. Failed actions auto-refund credits and are surfaced honestly.
      *(If we can't prove the work worked, we're just another activity generator.)*
- [ ] **Validation gate before build** — Demand check (competitor density, search/keyword
      demand, ICP, willingness-to-pay signals from Reddit/X/review sites) → red/green score.
      No spend on a "red" idea without explicit override.
- [ ] **Human-in-the-loop approval gates** — Mobile-first one-tap approve/edit/reject.
      Auto-approve safe/reversible actions; gate spend, outreach, deletions, and public posts.
      Implemented with LangGraph `interrupt()` + persistent checkpointer.
- [ ] **Public reliability dashboard** — Task-success rate, verified-deploy rate, refund rate,
      and (opt-in) anonymized revenue outcomes. Simultaneously a marketing weapon and a trust moat
      (nobody else publishes this).
- [ ] **Full code/data portability** — One-click export of code, data, and config.
      "You own everything, leave anytime." Charge for the service, not for hostage-taking.
- [ ] **Transparent flat pricing, no revenue share** — Predictable monthly price; if usage-based,
      hard caps + real-time spend alerts + pre-action cost estimates.
- [ ] **Budget governor + circuit breakers** — Hard daily/total budget caps, anomaly detection,
      auto-pause on overspend or repeated failures. Implemented via the COO Engine's predictive
      spawn (pre-action cost forecast) and cost-aware retirement (§5).
- [ ] **Vertical depth + data moat** — Niche-specific playbooks, templates, and governed
      anonymized cross-account learning about what actually converts in the one vertical.

## 5. The COO Engine — Constraint-Optimized Orchestration (dispatch + governance core)

The orchestration core is the **COO Engine** (*Constraint-Optimized Orchestration*) — a
constraint-aware orchestrator for multi-agent LLM systems that routes every task to the
right agent/model under **hard budget, latency, and capacity limits**, scaling the agent
pool up and down to keep spend inside those limits. The acronym is a useful double
meaning: a Constraint-Optimized Orchestrator is, in effect, the product's autonomous
*Chief Operating Officer* — it *operates* a validated plan within hard constraints rather
than acting on a guess.

**Resources** (`Full-Stack-Assets/COO-Engine-Implementation-`, MIT licensed). The site
ships a marketing landing page plus an in-browser **live dashboard** that runs the engine
in simulation mode — no API key or backend required — making it a self-contained demo and
reference:

- **Live dashboard** — `dashboard.html` (in-browser simulation of the orchestrator).
- **Source / repo** — <https://github.com/Full-Stack-Assets/COO-Engine-Implementation->
- **Algorithm Specification** — the five constraint dimensions and decision rules
  ([`01-ALGORITHM-SPECIFICATION.md`](https://github.com/Full-Stack-Assets/COO-Engine-Implementation-/blob/main/01-ALGORITHM-SPECIFICATION.md))
- **Benchmark Report** — measured performance characteristics
  ([`02-BENCHMARK-REPORT.md`](https://github.com/Full-Stack-Assets/COO-Engine-Implementation-/blob/main/02-BENCHMARK-REPORT.md))
- **Trade-offs Analysis** — design decisions and their implications
  ([`03-TRADEOFFS-ANALYSIS.md`](https://github.com/Full-Stack-Assets/COO-Engine-Implementation-/blob/main/03-TRADEOFFS-ANALYSIS.md))
- **Implementation Guide** — how the engine maps to the spec
  ([`COO-IMPLEMENTATION-GUIDE.md`](https://github.com/Full-Stack-Assets/COO-Engine-Implementation-/blob/main/COO-IMPLEMENTATION-GUIDE.md))
- **README** — CLI usage and the `mini` analytics library
  ([`README.md`](https://github.com/Full-Stack-Assets/COO-Engine-Implementation-/blob/main/README.md))

**The verified operating loop**, and which steps the COO Engine owns (marked):
1. **Plan** — turn the validated objective + current state into a ranked work queue.
2. **Dispatch** *(COO Engine)* — score every (agent, task) pair and route to the best worker / model tier.
3. **Verify** — the verification layer independently proves the action worked (200 OK + renders, email landed, campaign live within cap, Stripe webhook fired).
4. **Gate** — HITL approvals queue for high-blast-radius actions; auto-approve safe/reversible ones.
5. **Govern** *(COO Engine)* — predictive spawn / cost-aware retirement enforce hard budget caps; circuit-break on overspend or repeated failures; auto-refund credits on failed actions.
6. **Report** — verified morning report + update the public reliability dashboard.
7. **Learn** — write only *validated* outcomes back to per-account memory and vertical playbooks.

The COO Engine owns **dispatch** and **govern**; the verification layer and HITL gates
stay separate, independent checks (defense in depth — the router never grades its own work).

**COO Engine capabilities → the plan feature each one delivers:**
- **Multi-dimensional fitness scoring** — every (agent, task) pair scored across five
  weighted constraints, each clamped to `[0, 100]`:
  `finalScore = typeMatch·0.30 + costScore·0.25 + latencyScore·0.20 + loadScore·0.15 + budgetMargin·0.10`
  (type match = 30%, cost efficiency = 25%, latency fitness = 20%, load balancing = 15%,
  budget headroom = 10%; type match scores 100 same-type, 50 cross-type). The concrete
  implementation of "route by task / model tier" (§6).
- **Intelligent fallback routing** — evaluates the required-type candidates first; if none
  qualify it tries *all* types, picks the highest scorer, and flags `fallback_used` in the
  decision log — so work still gets placed under load instead of stalling.
- **Predictive spawn** — forecasts cost *before* scaling up; spawns only when agent count
  is below capacity, queued tasks of that type exist, projected cost stays **< 85% of the
  budget ceiling**, and demand clears a threshold (`queued_of_type > 2`). Powers the budget
  governor's pre-action cost estimates (§4).
- **Cost-aware retirement** — retires agents when cost utilization exceeds **92%** of
  budget or after **25 idle ticks**; critical cost pressure triggers immediate retirement.
  Half of the circuit-breaker behavior (§4).
- **Full audit trail** — every routing, spawn, and retirement decision logged with a
  timestamp, score, and human-readable justification. Feeds the audit-trail guardrail (§6)
  and the public reliability dashboard (§4).
- **Mini CLI & analytics** — inspect agent stats, queue depth, budget, health, and
  decisions from the command line (`mini`).

**Measured performance** (from the engine's Benchmark Report, vs. a greedy-baseline
router; 10 runs/scenario, averaged, 95% CIs, significance at *p* < 0.01):

| Dimension | COO Engine | Greedy baseline | Delta |
|-----------|-----------|-----------------|-------|
| Cost under budget pressure | — | — | **−23%** operational cost; +3.4% avg savings |
| Throughput (extreme conditions) | 134 tasks | 98 tasks | **+36%** (+12.5% median across scenarios) |
| SLA miss rate (variable load) | 2.1% | 8.2% | **−74%** misses |
| Latency SLA compliance | 89% | 72% | **+15 pp** |
| P95 latency | 1.6s | 2.3s | **−30%** |
| Agent-utilization variance | 0.180 | 0.305 | **−41%** |
| Budget compliance (tight budget) | 100% within $2.00 | overruns | under budget by $0.02 vs. $0.47 overrun |
| Spawn restraint (tight budget) | 7 agents | 12 agents | **−46%** spawns |

These map directly to the plan's promises: lower/cap-respecting cost (transparent flat
pricing), higher throughput and SLA compliance (verified, on-time delivery), and tight
budget adherence (budget governor + circuit breakers).

**Why it matters to the thesis:** the COO Engine is *how* "transparent flat pricing with
hard caps" and "budget governor + circuit breakers" get enforced mechanically.
Constraint-optimized routing lets the product promise predictable spend and actually keep
that promise — the opposite of the unpredictable credit burn that drives the category's
churn and one-star reviews.

## 6. Technical architecture (cloud-only, mobile-first, solo-operable)

- **Orchestration:** LangGraph (graph/state-machine; first-class HITL via `interrupt()` +
  `Command`; persistent checkpointer for pause/resume over hours). 2026 production standard.
  Task/model routing and agent-pool sizing within hard budget/latency/capacity limits are
  delegated to the **COO Engine** (§5).
- **Models (LLM-agnostic, route by task):** Claude (Opus-class) for planning/reasoning/judgment;
  cheaper/faster models (Haiku / GPT-mini class) for validation, classification, and the
  checking steps to control cost. Stay provider-agnostic to avoid vendor lock-in and price shocks.
- **Memory/state:** Postgres (e.g., Supabase) for durable state + checkpoints; a vector store
  for per-account long-term memory and vertical playbooks. Governed learning loops
  (validated insights only) so mistakes aren't reinforced.
- **Execution tools:** Cloud browser (Anchor/Browserbase-style), email/deliverability API,
  Stripe, ad APIs (Meta/Google) with budget caps, GitHub + cloud deploy (Vercel/Render).
  **Every tool call is wrapped with a verification check and least-privilege scopes.**
- **Reliability/guardrails:** per-step verification; retry-with-bounded-attempts then escalate
  to human; prompt-injection/PII filters; action logs/audit trail; TTL on stale approval threads;
  interrupt only at destructive/irreversible steps.
- **Scheduling:** cron-style nightly/periodic loops (the "works while you sleep" retention driver)
  — but every cycle ends with a *verified* report plus an approvals queue, never blind action.
- **Front end:** mobile-first PWA / responsive web; founder reviews and approves from a phone.
  No local install — fully cloud-hosted.

## 7. Go-to-market (lean, bootstrapped, solo)

- **Beachhead customer:** technical-ish indie founders / micro-SaaS builders and small B2B SaaS
  who have a (semi-)validated product but hate or neglect distribution.
- **Pricing:** transparent flat **$49–$99/mo, no revenue share**, usable free trial
  (verified-task limited). Optional outcome add-on later (pay for booked meetings / deployed
  assets) — but never a blanket 20% take.
- **Distribution (pick 1–2 channels, go deep):**
  1. **Build in public on X + Indie Hackers** — share the reliability dashboard, verified
     outcomes, and honest "what agents can/can't do." Audience-before-product.
  2. **Niche community presence** (chosen vertical's subreddits/Discords/Slacks) — genuine help first.
  3. **SEO/GEO content** targeting "Polsia alternative," "autonomous AI agent reliability,"
     and the vertical's pain queries — compounding, near-zero marginal cost.
  4. **Product Hunt + Show HN** as catalysts (events, not strategy).
- **Wedge message vs. Polsia:** *"Polsia runs your company on a guess and hopes. We validate
  first, prove every action actually worked, and you approve anything risky from your phone.
  You own your code. No 20% tax."*

## 8. Phased roadmap to first revenue

### Phase 0 — Validate & narrow (Weeks 1–2)
- [ ] 20 customer interviews in the chosen vertical
- [ ] Landing page + waitlist
- [ ] Confirm willingness to pay (use the same validation discipline we'll sell)
- [ ] **Gate:** weak demand → kill/pivot the vertical before building

### Phase 1 — MVP = one verifiable loop (Weeks 3–8)
- [ ] Single workflow (e.g., validated outbound + landing-page deploy)
- [ ] Validation gate
- [ ] Execution via LangGraph
- [ ] Verification layer
- [ ] Mobile approval flow
- [ ] Stripe billing **from day one** — charge the first 10–20 users immediately
- [ ] Ship the public reliability dashboard even if numbers are small

### Phase 2 — Reliability + retention (Months 3–4)
- [ ] Nightly cycles + morning verified reports
- [ ] Budget governor
- [ ] Code/data export
- [ ] More verified tool integrations
- [ ] Target first 100 paying customers; instrument churn ("What would've made you stay?")

### Phase 3 — Depth + moat (Months 5–9)
- [ ] Vertical-specific playbooks
- [ ] Anonymized cross-account learning
- [ ] Deeper integrations
- [ ] GEO/SEO content engine
- [ ] Expand to a second adjacent workflow only after the first is retained and profitable

### Phase 4 — Adjacent verticals / outcome pricing (later)
- [ ] Templatize the verified-loop architecture for a second vertical
- [ ] Introduce optional outcome-based pricing once task-success rates are proven publicly

## 9. Decision gates (benchmarks that should change the plan)

| Signal | Action |
|--------|--------|
| Weak willingness to pay in chosen vertical | Pivot vertical **before** building |
| Verified task-success on core loop stays **<60%** after Phase 2 | Narrow the workflow further (don't broaden) |
| No signups via build-in-public/community by end of Phase 1 | Switch the single channel (don't add more) |
| Churn **>5%/mo** at 50 customers | Fix retention before any new features or verticals |
| Public task-success rate exceeds **80%** on core workflow | Only then consider broadening scope |

## 10. Core recommendations

1. **Don't** clone "run any company fully autonomously" — win on trust + verification + depth.
2. **Ship the verification layer in the MVP** — it's the whole point. Publish verified-deploy/send rates openly.
3. **Pick ONE vertical workflow and one channel; go deep.** Distribution is the bottleneck.
4. **Price transparently, flat, no revenue share, with full portability.**
5. **Make human-in-the-loop a feature, not an apology** — "approve anything risky from your phone."
6. **Charge from day one; instrument churn early.** Retention is the real PMF signal.
7. **Use the reliability dashboard as the marketing moat** — be the honest, measurable one.

## 11. Caveats / things to re-verify before committing GTM copy

- Polsia's metrics are self-reported (ARR ~$10M, 7,600+ companies, "one-sixth generating
  revenue"); treat as directional, not audited. Trustpilot sample is small (~20 reviews).
- Founder name appears as both "Ben Cera" and "Ben Broca" (and a mis-render "Ben Sera") —
  apparently the same person.
- Market-size figures vary widely by analyst; all Gartner numbers are forecasts, not measured.
- Reliability benchmarks (TheAgentCompany ~24–30%, CRMArena-Pro 58%→35%) are from specific
  task suites; a narrow, well-scoped workflow can score considerably higher — which is exactly
  why narrow scope + verification is the strategy.
- The COO Engine figures in §5 come from its **own** Benchmark Report, measured against a
  greedy-baseline router in simulation — not an independent third party. Treat them as
  indicative of the routing approach's ceiling; re-measure on the real workload (live model
  latencies/prices, real task mix) before quoting them in GTM copy.
- Competitor details move fast (Manus's Meta acquisition, pricing tiers, ZeroHuman/NanoCorp
  stage). Verify pricing and feature claims directly before publishing comparisons.

---

### Appendix A — Competitive landscape (snapshot)

- **Polsia** — ~9 agents, $49/mo + 20% take; ~$10M ARR / 7,600+ companies / $30M @ ~$250M;
  Trustpilot 2.1/5. Weaknesses: no validation, fake "complete" tasks, lock-in, opaque cost, no public perf data.
- **NanoCorp** (YC) — free 3 lifetime credits then ~$30/mo, 20% withdrawal fee; still requires manual approval; no real revenue.
- **Cofounder** (Andrew Pignanelli) — $8.7M seed (USV); "one-person billion-dollar company"; approval-gate orientation. ("What is not there is coordination and memory systems.")
- **ZeroHuman** — $49/mo + 10% rev-share or $99 flat; 30 daily tasks; mobile approval; one company per sub.
- **HeyBoss** — AI website/app builder; builds then hands you the keys; does not operate the business after launch.
- **Paperclip AI** — open-source, 50k+ stars; "proof of concept wearing a product's clothing."
- **Adjacent:** Lindy, Artisan ("Ava"), Relevance AI, Cognosys, Manus, Genspark, Devin/Cognition.
- **Cross-cutting weaknesses:** unpredictable credit pricing/overages; reliability drops on multi-step tasks; nobody publishes success/retention; lock-in; "agent washing."

### Appendix B — Market context (why this is timely)

- Agentic AI market ~$7–11B in 2026, ~40–46% CAGR toward $50–140B+ by early 2030s (Gartner: 40% of enterprise apps integrated with task-specific agents by end of 2026).
- Adoption ≠ value: Gartner expects >40% of agentic AI projects canceled by end of 2027; MIT Project NANDA found ~95% of integrated AI pilots show no measurable P&L impact.
- Reliability is the central unsolved problem (TheAgentCompany ~24–30% autonomous; CRMArena-Pro 58%→35% single→multi-turn). Cautionary tale: Replit's agent deleting live production data.
- The bottleneck has shifted to **demand**, not execution — so the validation + distribution layer is where value concentrates.
