// COO Engine — Constraint-Optimized Orchestration (dispatch + governance core).
//
// Ported from the COO-Engine-Implementation- spec/implementation guide. The original
// scores components on a [0,100] scale; here everything is normalized to [0,1] so the
// documented fitness threshold (0.55) and budget headroom (0.85) read directly.
//
// This module owns ONLY the two COO-owned steps of the verified operating loop —
// DISPATCH (fitness routing + fallback + predictive spawn) and GOVERN (cost-aware
// retirement + budget circuit breaker). Verification and human approval gates live in
// separate modules on purpose: the router never grades its own work.

export const WEIGHTS = Object.freeze({
  type: 0.3, // type match
  cost: 0.25, // cost efficiency
  latency: 0.2, // latency fitness
  load: 0.15, // load balancing
  budget: 0.1, // budget headroom
});

export const FITNESS_THRESHOLD = 0.55; // findBestAgentForTask: fitness must EXCEED this
export const BUDGET_HEADROOM = 0.85; // routing/spawn must keep utilization below this
export const RETIRE_UTIL = 0.92; // retire when budget utilization exceeds this
export const IDLE_TIMEOUT = 25; // retire after this many idle ticks
export const DEMAND_THRESHOLD = 2; // spawn only when queued_of_type EXCEEDS this

const clamp01 = (x) => Math.max(0, Math.min(1, x));

let _seq = 0;

/** Budget utilization in [0,1]. Returns 0 when no maxCost constraint is set. */
export function utilization(state) {
  const cap = state.constraints?.maxCost;
  if (!cap || cap === Infinity) return 0;
  return clamp01(state.totalCost / cap);
}

function avgAgentCost(state) {
  if (state.agents.length === 0) return 0;
  return state.agents.reduce((s, a) => s + a.costPerSec, 0) / state.agents.length;
}

// --- the five constraint dimensions (each → [0,1]) ---
const scoreType = (agent, task) => (agent.type === task.requiredType ? 1 : 0.5);
const scoreCost = (agent, state) => clamp01(1 - agent.costPerSec / (state._refCostPerSec || 1));
const scoreLoad = (agent) => clamp01(1 - (agent.load ?? 0));
const scoreBudget = (state) => clamp01(1 - utilization(state));
function scoreLatency(agent, task) {
  if (!task.slaMs) return 1;
  if (agent.maxLatencyMs <= task.slaMs) return clamp01(1 - (agent.maxLatencyMs / task.slaMs) * 0.5); // 0.5..1, faster = higher
  return clamp01((task.slaMs / agent.maxLatencyMs) * 0.5); // physical-floor penalty (< 0.5)
}

/** Weighted multi-dimensional fitness score in [0,1]. */
export function calculateFitnessScore(agent, task, state) {
  const s =
    scoreType(agent, task) * WEIGHTS.type +
    scoreCost(agent, state) * WEIGHTS.cost +
    scoreLatency(agent, task) * WEIGHTS.latency +
    scoreLoad(agent) * WEIGHTS.load +
    scoreBudget(state) * WEIGHTS.budget;
  return clamp01(s);
}

/**
 * Score all candidates → prefer primary type → fall back across all types when the
 * primary pool can't clear the threshold. Honors the hard budget gate.
 * @returns {{agent: object, score: number, fallbackUsed: boolean} | null}
 */
export function findBestAgentForTask(task, state) {
  if (utilization(state) >= BUDGET_HEADROOM) return null; // hard budget gate
  const available = state.agents.filter((a) => a.status !== 'retiring' && (a.load ?? 0) < 1);
  if (available.length === 0) return null;

  const score = (a) => calculateFitnessScore(a, task, state);
  const best = (list) => list.reduce((b, a) => (b && score(b) >= score(a) ? b : a), null);

  let chosen = best(available.filter((a) => a.type === task.requiredType));
  let fallbackUsed = false;

  if (!chosen || score(chosen) <= FITNESS_THRESHOLD) {
    const fb = best(available);
    if (fb && score(fb) > FITNESS_THRESHOLD) {
      chosen = fb;
      fallbackUsed = fb.type !== task.requiredType;
    }
  }
  if (!chosen || score(chosen) <= FITNESS_THRESHOLD) return null;
  return { agent: chosen, score: score(chosen), fallbackUsed };
}

/**
 * Predictive spawn: only when below capacity, demand clears the threshold, and the
 * projected cost stays within budget headroom.
 * projected_cost = total_cost + (queue_depth × avg_agent_cost)
 */
export function shouldSpawnAgent(state, taskType) {
  if (state.agents.length >= (state.constraints?.maxAgents ?? Infinity)) return false;
  const queuedOfType = state.tasks.filter((t) => t.status === 'queued' && t.requiredType === taskType).length;
  if (queuedOfType <= DEMAND_THRESHOLD) return false;
  const queueDepth = state.tasks.filter((t) => t.status === 'queued').length;
  const projected = state.totalCost + queueDepth * (avgAgentCost(state) || 0.01);
  const cap = state.constraints?.maxCost ?? Infinity;
  return projected <= BUDGET_HEADROOM * cap;
}

/** Cost-aware retirement. Protects working agents; retires on budget pressure or idle timeout. */
export function shouldRetireAgent(agent, state) {
  if (agent.status === 'working' || (agent.load ?? 0) > 0) return false;
  if (utilization(state) > RETIRE_UTIL) return true;
  const idleFor = state.tick - (agent.idleSince ?? state.tick);
  return idleFor > IDLE_TIMEOUT;
}

/** Append a decision to the bounded audit log (keeps the last 100). */
export function logDecision(state, type, agent, task, reason, score = null) {
  state.decisionLog.push({
    tick: state.tick,
    type,
    agentId: agent?.id ?? null,
    taskId: task?.id ?? null,
    reason,
    score,
    ts: Date.now(),
  });
  if (state.decisionLog.length > 100) state.decisionLog.shift();
}

/** Factory for a worker agent of a given type. */
export function createAgent(type, opts = {}) {
  return {
    id: opts.id ?? `${type}-${++_seq}`,
    type,
    status: 'idle',
    load: 0,
    costPerSec: opts.costPerSec ?? 0.01,
    maxLatencyMs: opts.maxLatencyMs ?? 800,
    idleSince: 0,
    costAccrued: 0,
  };
}

/** Spawn an agent into state and return it. */
export function spawnAgent(state, type, opts = {}) {
  const a = createAgent(type, opts);
  state.agents.push(a);
  return a;
}

/** Retire any eligible agents (the GOVERN step). Returns the count retired. */
export function govern(state) {
  let retired = 0;
  for (const a of [...state.agents]) {
    if (shouldRetireAgent(a, state)) {
      state.agents = state.agents.filter((x) => x.id !== a.id);
      logDecision(state, 'retire', a, null, utilization(state) > RETIRE_UTIL ? 'budget pressure' : 'idle timeout');
      retired++;
    }
  }
  return retired;
}
