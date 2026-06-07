import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getAgentStats,
  analyzeTaskQueue,
  getBudgetReport,
  projectFutureCost,
  analyzeDecisions,
  getSystemHealth,
} from '../src/analytics.js';
import { computeReliability } from '../src/dashboard.js';
import { createAgent } from '../src/cooEngine.js';
import { createState, runCycle } from '../src/loop.js';
import { workers } from '../src/workers.js';
import { verifyAction } from '../src/verification.js';
import { makeAutoApprover } from '../src/approvals.js';

function seeded() {
  const s = createState({ maxAgents: 9, maxCost: 100 });
  s.agents = [createAgent('content', { costPerSec: 0.01 }), createAgent('seo', { costPerSec: 0.02 })];
  return s;
}

test('getAgentStats summarizes counts by type', () => {
  const s = seeded();
  const stats = getAgentStats(s);
  assert.equal(stats.total, 2);
  assert.equal(stats.byType.content.count, 1);
  assert.equal(stats.byType.seo.count, 1);
});

test('analyzeTaskQueue counts statuses and flags spawn-ready types', () => {
  const s = seeded();
  s.tasks = [
    { id: 'a', requiredType: 'content', status: 'queued' },
    { id: 'b', requiredType: 'content', status: 'queued' },
    { id: 'c', requiredType: 'content', status: 'queued' },
    { id: 'd', requiredType: 'seo', status: 'done' },
  ];
  const q = analyzeTaskQueue(s);
  assert.equal(q.queueDepth, 3);
  assert.equal(q.byStatus.done, 1);
  assert.deepEqual(q.spawnReadyTypes, ['content']); // 3 > DEMAND_THRESHOLD(2)
});

test('getBudgetReport flags warn and critical thresholds', () => {
  const ok = createState({ maxCost: 10 });
  ok.totalCost = 5;
  assert.equal(getBudgetReport(ok).status, 'ok');

  const warn = createState({ maxCost: 10 });
  warn.totalCost = 8.6; // 0.86 ≥ 0.85
  assert.equal(getBudgetReport(warn).status, 'warn');

  const crit = createState({ maxCost: 10 });
  crit.totalCost = 9.3; // 0.93 > 0.92
  assert.equal(getBudgetReport(crit).status, 'critical');
});

test('projectFutureCost uses total + queueDepth*avgCost', () => {
  const s = seeded(); // avg cost (0.01+0.02)/2 = 0.015
  s.totalCost = 1;
  s.tasks = [
    { id: 'a', requiredType: 'content', status: 'queued' },
    { id: 'b', requiredType: 'seo', status: 'queued' },
  ];
  const p = projectFutureCost(s);
  assert.equal(p.queueDepth, 2);
  assert.equal(p.avgAgentCost, 0.015);
  assert.equal(p.projected, 1.03); // 1 + 2*0.015
  assert.equal(p.withinHeadroom, true);
});

test('analyzeDecisions tallies decision-log types', () => {
  const s = seeded();
  s.decisionLog = [
    { type: 'route' },
    { type: 'route' },
    { type: 'retire' },
  ];
  const d = analyzeDecisions(s);
  assert.equal(d.total, 3);
  assert.equal(d.byType.route, 2);
  assert.equal(d.byType.retire, 1);
});

test('getSystemHealth + computeReliability reflect a real run', () => {
  const s = seeded();
  s.tasks = [
    { id: 't1', requiredType: 'content', slaMs: 1000 },
    { id: 't2', requiredType: 'seo', slaMs: 1000, _fail: true },
  ];
  runCycle(s, { workers, verify: verifyAction, approver: makeAutoApprover(), refundCredit: () => {} });

  const health = getSystemHealth(s);
  assert.ok(['ok', 'warn', 'critical'].includes(health.overall));

  const r = computeReliability(s);
  assert.equal(r.dispatched, 2);
  assert.equal(r.verified, 1);
  assert.equal(r.taskSuccessRate, 0.5);
  assert.equal(r.refunds, 1);
});
