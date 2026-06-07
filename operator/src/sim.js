// Simulation entry point — runs the verified operator in-memory with no API keys, the
// same "works in your browser/locally without a backend" posture as the COO Engine demo.
//
//   node src/sim.js                     # default run
//   node src/sim.js 20 0.2              # 20 cycles, 20% simulated action-failure rate
//   node src/sim.js --out ./.state.json # also dump final state for the `mini` CLI

import { writeFileSync } from 'node:fs';
import { runCycle, createState } from './loop.js';
import { workers } from './workers.js';
import { verifyAction } from './verification.js';
import { makeAutoApprover } from './approvals.js';
import { validateIdea, GREEN_THRESHOLD } from './validation.js';
import { createAgent } from './cooEngine.js';
import { renderDashboard } from './dashboard.js';

// small deterministic PRNG so runs are reproducible
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rawArgs = process.argv.slice(2);
let outPath = null;
const positional = [];
for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i] === '--out') outPath = rawArgs[++i];
  else positional.push(rawArgs[i]);
}
const CYCLES = Number(positional[0] ?? 12);
const FAIL_RATE = Number(positional[1] ?? 0.15);
const rng = mulberry32(42);
const TYPES = ['outbound', 'content', 'seo', 'ads'];

// 0. VALIDATION GATE — refuse to build on a "red" idea.
const objective = { id: 'obj-1', vertical: 'b2b-micro-saas', idea: 'validated outbound + landing pages' };
const validation = validateIdea(objective, {
  searchDemand: 0.7,
  competitorGap: 0.65,
  icpClarity: 0.8,
  willingnessToPay: 0.6,
});
console.log(`Validation: ${validation.verdict.toUpperCase()} (score ${validation.score}, green ≥ ${GREEN_THRESHOLD})`);
if (validation.verdict === 'red') {
  console.log('Idea failed the demand check — not spending a cent. Pivot before building.');
  process.exit(0);
}

const state = createState({ maxAgents: 9, maxCost: 5 });
state.agents.push(
  createAgent('outbound', { costPerSec: 0.012, maxLatencyMs: 700 }),
  createAgent('content', { costPerSec: 0.009, maxLatencyMs: 900 }),
  createAgent('seo', { costPerSec: 0.011, maxLatencyMs: 600 }),
);

const approver = makeAutoApprover({ autoApproveRisk: true }); // stand-in for the human tapping approve
let refunded = 0;
const deps = { workers, verify: verifyAction, approver, refundCredit: (c) => (refunded += c) };

let taskSeq = 0;
const totals = { dispatched: 0, verified: 0, failed: 0, refunded: 0, gated: 0, retired: 0 };

console.log(`\nRunning ${CYCLES} cycles (simulated failure rate ${FAIL_RATE})...\n`);
for (let c = 0; c < CYCLES; c++) {
  // inject a few new tasks each cycle
  const n = 3 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const type = TYPES[Math.floor(rng() * TYPES.length)];
    state.tasks.push({
      id: `t${++taskSeq}`,
      requiredType: type,
      slaMs: 1000,
      value: Math.round(rng() * 10),
      _fail: rng() < FAIL_RATE,
    });
  }

  const r = runCycle(state, deps);
  for (const k of Object.keys(totals)) totals[k] += r[k] ?? 0;
  console.log(
    `cycle ${String(r.tick).padStart(2)} | disp ${r.dispatched} verified ${r.verified} ` +
      `failed ${r.failed} refunded ${r.refunded} gated ${r.gated} | ` +
      `agents ${state.agents.length} util ${r.utilization} verifiedRate ${r.verifiedRate}` +
      (r.circuitBroken ? ' | CIRCUIT-BROKEN' : ''),
  );
}

const done = state.tasks.filter((t) => t.status === 'done').length;
const rejected = state.tasks.filter((t) => t.status === 'rejected').length;
console.log('\n=== verified summary ===');
console.log(`tasks: ${state.tasks.length} | done(verified) ${done} | rejected ${rejected}`);
console.log(`dispatched ${totals.dispatched} | verified ${totals.verified} | failed ${totals.failed}`);
console.log(`auto-refunds ${totals.refunded} ($${refunded.toFixed(3)}) | gated actions ${totals.gated} | retirements ${totals.retired}`);
console.log(`spend $${state.totalCost.toFixed(3)} / cap $${state.constraints.maxCost} (util ${(state.totalCost / state.constraints.maxCost).toFixed(3)})`);
console.log(`validated learnings recorded: ${state.learnings.length}`);
console.log(`audit-log entries (capped 100): ${state.decisionLog.length}`);

console.log('\n' + renderDashboard(state));

if (outPath) {
  writeFileSync(outPath, JSON.stringify(state, null, 2));
  console.log(`\nstate written to ${outPath}  (try: node bin/mini.js dashboard --state ${outPath})`);
}
