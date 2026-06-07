// Specialized workers (subgraphs in the LangGraph design). Each executes one task and
// returns an action with a `proof` object for the independent verification layer plus a
// `risk` level for the approval gate. A task carrying `_fail: true` simulates a failed
// action (so the loop's verify→refund path can be exercised deterministically).

const failed = (task) => task._fail === true;

export const workers = {
  outbound(task, agent) {
    return {
      kind: 'email',
      cost: agent.costPerSec,
      risk: task.risk ?? 'high', // cold outreach is gated by default
      proof: { delivered: !failed(task), bounced: failed(task) },
    };
  },
  content(task, agent) {
    return {
      kind: 'content',
      cost: agent.costPerSec,
      risk: task.risk ?? 'low',
      proof: { published: !failed(task) },
    };
  },
  seo(task, agent) {
    return {
      kind: 'deploy',
      cost: agent.costPerSec,
      risk: task.risk ?? 'low',
      proof: { status: failed(task) ? 500 : 200, renders: !failed(task) },
    };
  },
  ads(task, agent) {
    return {
      kind: 'ad',
      cost: agent.costPerSec,
      risk: task.risk ?? 'high', // budget changes are gated by default
      proof: { live: !failed(task), withinBudget: true },
    };
  },
  default(task, agent) {
    return {
      kind: 'generic',
      cost: agent.costPerSec,
      risk: task.risk ?? 'low',
      proof: { ok: !failed(task) },
    };
  },
};
