// Public reliability dashboard — the trust moat from the plan (§4). No competitor
// publishes task-success / verified-deploy / refund rates; being the honest, measurable
// one is both differentiation and SEO/GEO fuel. These are the numbers we'd publish.

import { getSystemHealth, getBudgetReport } from './analytics.js';

const round = (x, n = 3) => Number(x.toFixed(n));
const rate = (num, den) => (den ? round(num / den) : 0);
const pct = (x) => `${(x * 100).toFixed(1)}%`;

/** Compute the publishable reliability metrics from cumulative state.metrics. */
export function computeReliability(state) {
  const m = state.metrics ?? {};
  const done = state.tasks.filter((t) => t.status === 'done' && t.verified).length;
  const rejected = state.tasks.filter((t) => t.status === 'rejected').length;
  return {
    dispatched: m.dispatched ?? 0,
    verified: m.verified ?? 0,
    taskSuccessRate: rate(m.verified ?? 0, m.dispatched ?? 0),
    failed: m.failed ?? 0,
    refunds: m.refunded ?? 0,
    refundRate: rate(m.refunded ?? 0, m.dispatched ?? 0),
    gated: m.gated ?? 0,
    approved: m.approved ?? 0,
    approvalRate: rate(m.approved ?? 0, m.gated ?? 0),
    retirements: m.retired ?? 0,
    tasksDoneVerified: done,
    tasksRejected: rejected,
    validatedLearnings: state.learnings?.length ?? 0,
    budget: getBudgetReport(state),
    health: getSystemHealth(state).overall,
  };
}

/** Render the dashboard as a human-readable block (for CLI / morning report). */
export function renderDashboard(state) {
  const r = computeReliability(state);
  const lines = [
    '┌─ Reliability Dashboard ' + '─'.repeat(31),
    `│ health:            ${r.health.toUpperCase()}`,
    `│ task-success rate: ${pct(r.taskSuccessRate)}  (${r.verified}/${r.dispatched} verified)`,
    `│ refund rate:       ${pct(r.refundRate)}  (${r.refunds} auto-refunds on failed actions)`,
    `│ approval rate:     ${pct(r.approvalRate)}  (${r.approved}/${r.gated} gated actions approved)`,
    `│ done (verified):   ${r.tasksDoneVerified}   rejected: ${r.tasksRejected}`,
    `│ validated learnings: ${r.validatedLearnings}   agent retirements: ${r.retirements}`,
    `│ budget:            $${r.budget.spend} / $${r.budget.cap}  (util ${r.budget.utilization}, ${r.budget.status})`,
    '└' + '─'.repeat(55),
  ];
  return lines.join('\n');
}
