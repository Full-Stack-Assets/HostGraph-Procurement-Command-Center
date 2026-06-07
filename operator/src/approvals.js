// Human-in-the-loop approval gates. High-blast-radius actions (spend, cold outreach,
// deletions, public posts) are gated behind one-tap mobile approval; safe/reversible
// actions auto-approve. In LangGraph terms this is the interrupt() boundary.

export const HIGH_RISK = 'high';

/**
 * Auto-approver for tests/sim. Low-risk actions always pass; high-risk actions pass only
 * if autoApproveRisk is set (stands in for the human tapping "approve").
 */
export function makeAutoApprover({ autoApproveRisk = false } = {}) {
  return (action) => (action.risk === HIGH_RISK ? autoApproveRisk : true);
}

/**
 * Queue-backed approver: high-risk actions are pushed to a pending queue and held
 * (returns false) until a human resolves them out of band. Models the real mobile flow.
 */
export function makeQueueApprover(pendingQueue) {
  return (action, task) => {
    if (action.risk !== HIGH_RISK) return true;
    pendingQueue.push({ taskId: task.id, action, requestedAt: Date.now() });
    return false; // held for approval
  };
}
