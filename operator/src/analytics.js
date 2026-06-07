// Analytics library — the `mini-extra` equivalent. Pure, read-only functions over a
// state object, used by the `mini` CLI and to feed the public reliability dashboard.

import { utilization, BUDGET_HEADROOM, RETIRE_UTIL, DEMAND_THRESHOLD } from './cooEngine.js';

const round = (x, n = 3) => Number(x.toFixed(n));
const rate = (num, den) => (den ? round(num / den) : 0);

/** Per-type and overall agent stats. */
export function getAgentStats(state) {
  const byType = {};
  for (const a of state.agents) {
    const t = (byType[a.type] ??= { count: 0, working: 0, idle: 0, costAccrued: 0 });
    t.count++;
    t[a.status === 'working' ? 'working' : 'idle']++;
    t.costAccrued = round(t.costAccrued + (a.costAccrued ?? 0), 4);
  }
  return {
    total: state.agents.length,
    maxAgents: state.constraints?.maxAgents ?? null,
    working: state.agents.filter((a) => a.status === 'working').length,
    idle: state.agents.filter((a) => a.status !== 'working').length,
    byType,
  };
}

/** Task queue breakdown by status and (for queued) by type. */
export function analyzeTaskQueue(state) {
  const byStatus = {};
  const queuedByType = {};
  for (const t of state.tasks) {
    const s = t.status ?? 'queued';
    byStatus[s] = (byStatus[s] ?? 0) + 1;
    if (s === 'queued') queuedByType[t.requiredType] = (queuedByType[t.requiredType] ?? 0) + 1;
  }
  return {
    total: state.tasks.length,
    byStatus,
    queuedByType,
    queueDepth: byStatus.queued ?? 0,
    spawnReadyTypes: Object.entries(queuedByType)
      .filter(([, n]) => n > DEMAND_THRESHOLD)
      .map(([type]) => type),
  };
}

/** Budget utilization, remaining headroom, and a status flag. */
export function getBudgetReport(state) {
  const cap = state.constraints?.maxCost ?? Infinity;
  const util = utilization(state);
  const status = util >= RETIRE_UTIL ? 'critical' : util >= BUDGET_HEADROOM ? 'warn' : 'ok';
  return {
    spend: round(state.totalCost, 4),
    cap: cap === Infinity ? null : cap,
    utilization: round(util),
    headroomRemaining: cap === Infinity ? null : round(BUDGET_HEADROOM * cap - state.totalCost, 4),
    status,
  };
}

/** Forecast cost for the current queue (same formula the COO Engine uses for spawn). */
export function projectFutureCost(state) {
  const queueDepth = state.tasks.filter((t) => (t.status ?? 'queued') === 'queued').length;
  const avgCost = state.agents.length
    ? state.agents.reduce((s, a) => s + a.costPerSec, 0) / state.agents.length
    : 0;
  const projected = state.totalCost + queueDepth * avgCost;
  const cap = state.constraints?.maxCost ?? Infinity;
  return {
    current: round(state.totalCost, 4),
    queueDepth,
    avgAgentCost: round(avgCost, 4),
    projected: round(projected, 4),
    withinHeadroom: projected <= BUDGET_HEADROOM * cap,
  };
}

/** Decision-log breakdown by type, plus the most recent entries. */
export function analyzeDecisions(state, recent = 5) {
  const byType = {};
  for (const d of state.decisionLog) byType[d.type] = (byType[d.type] ?? 0) + 1;
  return {
    total: state.decisionLog.length,
    byType,
    recent: state.decisionLog.slice(-recent),
  };
}

/** Overall system health: 'ok' | 'warn' | 'critical', with human-readable issues. */
export function getSystemHealth(state) {
  const budget = getBudgetReport(state);
  const m = state.metrics ?? {};
  const successRate = rate(m.verified ?? 0, m.dispatched ?? 0);
  const issues = [];
  let overall = 'ok';

  if (budget.status === 'critical') {
    overall = 'critical';
    issues.push(`budget critical (utilization ${budget.utilization})`);
  } else if (budget.status === 'warn') {
    overall = 'warn';
    issues.push(`budget tight (utilization ${budget.utilization})`);
  }
  if ((m.dispatched ?? 0) >= 5 && successRate < 0.6) {
    overall = overall === 'critical' ? 'critical' : 'warn';
    issues.push(`low verified task-success rate (${successRate})`);
  }
  if (utilization(state) >= 1) {
    overall = 'critical';
    issues.push('budget exhausted (circuit breaker)');
  }
  return { overall, successRate, issues };
}
