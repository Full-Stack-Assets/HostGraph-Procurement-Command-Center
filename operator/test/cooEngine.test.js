import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateFitnessScore,
  findBestAgentForTask,
  shouldSpawnAgent,
  shouldRetireAgent,
  logDecision,
  createAgent,
  utilization,
  FITNESS_THRESHOLD,
} from '../src/cooEngine.js';

function baseState(overrides = {}) {
  return {
    tick: 0,
    totalCost: 0,
    agents: [],
    tasks: [],
    decisionLog: [],
    constraints: { maxAgents: 9, maxCost: 5 },
    _refCostPerSec: 1,
    ...overrides,
  };
}

test('fitness prefers a same-type agent over a cross-type one', () => {
  const state = baseState();
  const task = { requiredType: 'outbound', slaMs: 1000 };
  const same = createAgent('outbound', { costPerSec: 0.01, maxLatencyMs: 500 });
  const cross = createAgent('content', { costPerSec: 0.01, maxLatencyMs: 500 });
  assert.ok(calculateFitnessScore(same, task, state) > calculateFitnessScore(cross, task, state));
});

test('findBestAgentForTask returns the same-type agent as primary', () => {
  const state = baseState();
  state.agents = [createAgent('content'), createAgent('outbound')];
  const pick = findBestAgentForTask({ requiredType: 'outbound', slaMs: 1000 }, state);
  assert.equal(pick.agent.type, 'outbound');
  assert.equal(pick.fallbackUsed, false);
  assert.ok(pick.score > FITNESS_THRESHOLD);
});

test('falls back across types when no primary exists', () => {
  const state = baseState();
  state.agents = [createAgent('content')];
  const pick = findBestAgentForTask({ requiredType: 'outbound', slaMs: 1000 }, state);
  assert.ok(pick);
  assert.equal(pick.fallbackUsed, true);
});

test('routing is blocked once utilization hits the budget headroom (0.85)', () => {
  const state = baseState({ totalCost: 4.5 }); // 4.5 / 5 = 0.9 > 0.85
  state.agents = [createAgent('outbound')];
  assert.ok(utilization(state) >= 0.85);
  assert.equal(findBestAgentForTask({ requiredType: 'outbound', slaMs: 1000 }, state), null);
});

test('shouldSpawnAgent requires demand above threshold and budget headroom', () => {
  const state = baseState();
  state.agents = [createAgent('outbound', { costPerSec: 0.01 })];
  // only 2 queued of type → not > DEMAND_THRESHOLD (2)
  state.tasks = [
    { id: 'a', requiredType: 'outbound', status: 'queued' },
    { id: 'b', requiredType: 'outbound', status: 'queued' },
  ];
  assert.equal(shouldSpawnAgent(state, 'outbound'), false);
  // 3 queued of type → demand clears; budget fine
  state.tasks.push({ id: 'c', requiredType: 'outbound', status: 'queued' });
  assert.equal(shouldSpawnAgent(state, 'outbound'), true);
  // ...but not when at capacity
  state.constraints.maxAgents = 1;
  assert.equal(shouldSpawnAgent(state, 'outbound'), false);
});

test('shouldSpawnAgent refuses when projected cost would breach headroom', () => {
  const state = baseState({ totalCost: 4.2 });
  state.agents = [createAgent('outbound', { costPerSec: 0.5 })];
  state.tasks = [
    { id: 'a', requiredType: 'outbound', status: 'queued' },
    { id: 'b', requiredType: 'outbound', status: 'queued' },
    { id: 'c', requiredType: 'outbound', status: 'queued' },
  ];
  // projected = 4.2 + 3*0.5 = 5.7 > 0.85*5 = 4.25
  assert.equal(shouldSpawnAgent(state, 'outbound'), false);
});

test('shouldRetireAgent retires on idle timeout and on budget pressure, but protects working agents', () => {
  const state = baseState({ tick: 30 });
  const idle = createAgent('seo');
  idle.idleSince = 0; // idle for 30 ticks > 25
  assert.equal(shouldRetireAgent(idle, state), true);

  const working = createAgent('seo');
  working.status = 'working';
  working.load = 1;
  assert.equal(shouldRetireAgent(working, state), false);

  const pressured = createAgent('seo');
  pressured.idleSince = 30; // not idle-timed-out
  const tight = baseState({ tick: 30, totalCost: 4.8 }); // 0.96 > 0.92
  assert.equal(shouldRetireAgent(pressured, tight), true);
});

test('logDecision keeps only the last 100 entries', () => {
  const state = baseState();
  for (let i = 0; i < 150; i++) logDecision(state, 'route', null, { id: `t${i}` }, 'x');
  assert.equal(state.decisionLog.length, 100);
  assert.equal(state.decisionLog.at(-1).taskId, 't149');
});
