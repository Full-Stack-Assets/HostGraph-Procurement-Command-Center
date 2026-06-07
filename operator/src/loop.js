// The verified operating loop: plan → dispatch → verify → gate → govern → report → learn.
//
// DISPATCH and GOVERN are owned by the COO Engine; VERIFY and GATE are independent checks.
// One call to runCycle(state, deps) executes a single cycle (the "nightly loop" tick) and
// returns a verified report — never blind action.

import {
  findBestAgentForTask,
  shouldSpawnAgent,
  spawnAgent,
  govern,
  logDecision,
  utilization,
} from './cooEngine.js';

/**
 * @param {object} state  { tick, totalCost, agents, tasks, decisionLog, constraints, learnings? }
 * @param {object} deps   { workers, verify, approver, refundCredit? }
 * @returns {object} verified cycle report
 */
export function runCycle(state, deps) {
  const { workers, verify, approver, refundCredit } = deps;
  state._refCostPerSec = Math.max(1, ...state.agents.map((a) => a.costPerSec), 1);
  state.learnings ??= [];

  const report = {
    tick: state.tick,
    dispatched: 0,
    verified: 0,
    failed: 0,
    refunded: 0,
    gated: 0,
    approved: 0,
    rejected: 0,
    deferred: 0,
    retired: 0,
    circuitBroken: false,
  };

  // 1. PLAN — rank the queue (high-value first, then FIFO). Newly injected tasks default
  //    to 'queued'. Snapshot so re-queued failures wait for the next cycle.
  for (const t of state.tasks) t.status ??= 'queued';
  const queue = state.tasks
    .filter((t) => t.status === 'queued')
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0) || a.id.localeCompare(b.id));

  for (const task of queue) {
    // Hard budget circuit breaker — at exhaustion, force-stop new work.
    if (utilization(state) >= 1) {
      report.circuitBroken = true;
      logDecision(state, 'circuit-break', null, task, 'budget exhausted; force-stop');
      report.deferred++;
      continue;
    }

    // 2. DISPATCH (COO) — route to the best agent; spawn predictively if needed.
    let pick = findBestAgentForTask(task, state);
    if (!pick && shouldSpawnAgent(state, task.requiredType)) {
      const a = spawnAgent(state, task.requiredType);
      logDecision(state, 'spawn', a, task, 'demand + budget ok');
      pick = findBestAgentForTask(task, state);
    }
    if (!pick) {
      report.deferred++;
      logDecision(state, 'defer', null, task, 'no agent within budget headroom');
      continue;
    }

    task.status = 'working';
    task.assignedTo = pick.agent.id;
    pick.agent.status = 'working';
    pick.agent.load = 1;
    report.dispatched++;
    logDecision(state, 'route', pick.agent, task, pick.fallbackUsed ? 'fallback' : 'primary', pick.score);

    // execute
    const worker = workers[pick.agent.type] ?? workers.default;
    const action = worker(task, pick.agent, state);
    state.totalCost += action.cost;
    pick.agent.costAccrued += action.cost;

    // 4. GATE — HITL approval for high-blast-radius actions.
    let proceed = true;
    if (action.risk === 'high') {
      report.gated++;
      const approved = approver ? approver(action, task) : false;
      if (approved) {
        report.approved++;
      } else {
        report.rejected++;
        proceed = false;
        task.status = 'rejected';
      }
      logDecision(state, 'gate', pick.agent, task, approved ? 'approved' : 'held/rejected');
    }

    // 3. VERIFY — independent proof of work; failed actions auto-refund and re-queue.
    if (proceed) {
      if (verify(action, task)) {
        task.status = 'done';
        task.verified = true;
        report.verified++;
        logDecision(state, 'verify-ok', pick.agent, task, 'action proven', pick.score);
      } else {
        report.failed++;
        task.verified = false;
        task.attempts = (task.attempts ?? 0) + 1;
        if (refundCredit) {
          refundCredit(action.cost);
          state.totalCost -= action.cost;
          report.refunded++;
        }
        if (task.attempts >= (state.constraints?.maxAttempts ?? 3)) {
          task.status = 'rejected';
          logDecision(state, 'escalate', pick.agent, task, 'max attempts; escalate to human');
        } else {
          task.status = 'queued'; // retry next cycle
          logDecision(state, 'verify-fail', pick.agent, task, 'unverified; refunded; re-queued');
        }
      }
    }

    // free the agent for the next task this cycle
    pick.agent.status = 'idle';
    pick.agent.load = 0;
    pick.agent.idleSince = state.tick;
  }

  // 5. GOVERN (COO) — cost-aware retirement / circuit breaker.
  report.retired = govern(state);
  report.utilization = Number(utilization(state).toFixed(3));

  // 6. REPORT — verified summary for the morning report / reliability dashboard.
  report.verifiedRate = report.dispatched ? Number((report.verified / report.dispatched).toFixed(3)) : 0;

  // 7. LEARN — write ONLY validated outcomes back to memory (governed learning loop).
  for (const t of state.tasks) {
    if (t.status === 'done' && t.verified && !t._learned) {
      state.learnings.push({ taskId: t.id, type: t.requiredType, tick: state.tick });
      t._learned = true;
    }
  }

  // accumulate cumulative metrics so analytics/dashboard read true running rates
  state.metrics ??= {};
  for (const k of ['dispatched', 'verified', 'failed', 'refunded', 'gated', 'approved', 'rejected', 'deferred', 'retired']) {
    state.metrics[k] = (state.metrics[k] ?? 0) + (report[k] ?? 0);
  }

  state.tick++;
  return report;
}

/** Convenience: create an empty operator state. */
export function createState({ maxAgents = 9, maxCost = 5, maxAttempts = 3 } = {}) {
  return {
    tick: 0,
    totalCost: 0,
    agents: [],
    tasks: [],
    decisionLog: [],
    learnings: [],
    metrics: {},
    constraints: { maxAgents, maxCost, maxAttempts },
  };
}
