#!/usr/bin/env node
// mini — CLI for inspecting verified-operator state (mirrors the COO Engine's `mini`).
//
//   node bin/mini.js <command> [--json] [--state <path>]
//
// commands: stats | queue | budget | health | decisions | agent <id> | project-cost | dashboard
//
// Reads a JSON state file (default: ./.state.json, produced by `node src/sim.js --out`).

import { readFileSync } from 'node:fs';
import {
  getAgentStats,
  analyzeTaskQueue,
  getBudgetReport,
  projectFutureCost,
  analyzeDecisions,
  getSystemHealth,
} from '../src/analytics.js';
import { computeReliability, renderDashboard } from '../src/dashboard.js';

function parseArgs(argv) {
  const args = { _: [], json: false, state: './.state.json' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') args.json = true;
    else if (a === '--state') args.state = argv[++i];
    else args._.push(a);
  }
  return args;
}

function loadState(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    console.error(`Could not read state file: ${path}`);
    console.error('Generate one with:  node src/sim.js --out ./.state.json');
    process.exit(1);
  }
}

const COMMANDS = {
  stats: (s) => getAgentStats(s),
  queue: (s) => analyzeTaskQueue(s),
  budget: (s) => getBudgetReport(s),
  health: (s) => getSystemHealth(s),
  decisions: (s) => analyzeDecisions(s),
  'project-cost': (s) => projectFutureCost(s),
  dashboard: (s) => computeReliability(s),
  agent: (s, args) => {
    const id = args._[1];
    const a = s.agents.find((x) => x.id === id);
    if (!a) {
      console.error(`No agent with id "${id}"`);
      process.exit(1);
    }
    return a;
  },
};

const args = parseArgs(process.argv.slice(2));
const cmd = args._[0];

if (!cmd || !COMMANDS[cmd]) {
  console.log('usage: mini <command> [--json] [--state <path>]');
  console.log('commands: ' + Object.keys(COMMANDS).join(' | '));
  process.exit(cmd ? 1 : 0);
}

const state = loadState(args.state);
const result = COMMANDS[cmd](state, args);

if (args.json) {
  console.log(JSON.stringify(result, null, 2));
} else if (cmd === 'dashboard') {
  console.log(renderDashboard(state));
} else {
  console.dir(result, { depth: null, colors: process.stdout.isTTY });
}
