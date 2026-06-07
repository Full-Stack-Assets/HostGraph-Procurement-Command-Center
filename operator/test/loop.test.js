import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runCycle, createState } from '../src/loop.js';
import { workers } from '../src/workers.js';
import { verifyAction } from '../src/verification.js';
import { makeAutoApprover, makeQueueApprover } from '../src/approvals.js';
import { createAgent } from '../src/cooEngine.js';

function stateWith(tasks, agentTypes = ['outbound', 'content', 'seo', 'ads']) {
  const s = createState({ maxAgents: 9, maxCost: 100 });
  s.agents = agentTypes.map((t) => createAgent(t, { costPerSec: 0.01 }));
  s.tasks = tasks;
  return s;
}

test('a passing low-risk task is dispatched, verified, and learned', () => {
  const s = stateWith([{ id: 't1', requiredType: 'content', slaMs: 1000 }]);
  const r = runCycle(s, { workers, verify: verifyAction, approver: makeAutoApprover() });
  assert.equal(r.dispatched, 1);
  assert.equal(r.verified, 1);
  assert.equal(s.tasks[0].status, 'done');
  assert.equal(s.tasks[0].verified, true);
  assert.equal(s.learnings.length, 1);
});

test('a failed action auto-refunds, re-queues, then escalates after max attempts', () => {
  const s = stateWith([{ id: 't1', requiredType: 'content', slaMs: 1000, _fail: true }]);
  s.constraints.maxAttempts = 2;
  let refunded = 0;
  const deps = { workers, verify: verifyAction, approver: makeAutoApprover(), refundCredit: (c) => (refunded += c) };

  const r1 = runCycle(s, deps);
  assert.equal(r1.failed, 1);
  assert.equal(r1.refunded, 1);
  assert.equal(s.tasks[0].status, 'queued'); // re-queued for retry
  assert.ok(refunded > 0);
  assert.equal(s.totalCost, 0); // refund nets cost back to zero

  const r2 = runCycle(s, deps); // second attempt hits maxAttempts
  assert.equal(r2.failed, 1);
  assert.equal(s.tasks[0].status, 'rejected');
});

test('a high-risk action is gated and rejected when not approved', () => {
  const s = stateWith([{ id: 't1', requiredType: 'outbound', slaMs: 1000 }]); // outbound = high risk
  const pending = [];
  const r = runCycle(s, { workers, verify: verifyAction, approver: makeQueueApprover(pending) });
  assert.equal(r.gated, 1);
  assert.equal(r.rejected, 1);
  assert.equal(r.verified, 0);
  assert.equal(s.tasks[0].status, 'rejected');
  assert.equal(pending.length, 1); // pushed to the mobile approvals queue
});

test('a high-risk action proceeds and verifies when approved', () => {
  const s = stateWith([{ id: 't1', requiredType: 'ads', slaMs: 1000 }]); // ads = high risk
  const r = runCycle(s, { workers, verify: verifyAction, approver: makeAutoApprover({ autoApproveRisk: true }) });
  assert.equal(r.gated, 1);
  assert.equal(r.approved, 1);
  assert.equal(r.verified, 1);
  assert.equal(s.tasks[0].status, 'done');
});

test('the budget circuit breaker force-stops new work at exhaustion', () => {
  const s = stateWith([{ id: 't1', requiredType: 'content', slaMs: 1000 }]);
  s.constraints.maxCost = 1;
  s.totalCost = 1; // utilization = 1.0
  const r = runCycle(s, { workers, verify: verifyAction, approver: makeAutoApprover() });
  assert.equal(r.circuitBroken, true);
  assert.equal(r.dispatched, 0);
  assert.equal(s.tasks[0].status, 'queued'); // untouched
});
