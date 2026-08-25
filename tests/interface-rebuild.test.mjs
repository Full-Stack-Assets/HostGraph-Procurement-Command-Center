import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const shell = fs.readFileSync('client/src/components/HostGraphShell.tsx', 'utf8');
const dashboard = fs.readFileSync('client/src/pages/DashboardPage.tsx', 'utf8');

test('approved HostGraph command-center interface is present', () => {
  for (const label of ['Overview', 'Margins', 'Orders', 'Vendors', 'Products', 'Credits', 'Alerts', 'Reports', 'Settings', 'Help']) {
    assert.match(shell, new RegExp(label));
  }
  for (const label of ['Gross Margin', 'Potential Savings', 'Active Alerts', 'Margin Over Time', 'Spend by Category', 'Top Products by Margin Impact']) {
    assert.match(dashboard, new RegExp(label));
  }
});

test('review UI distinguishes sourced fixture values from unavailable live metrics', () => {
  assert.match(dashboard, /Not modeled/);
  assert.match(dashboard, /Historical margin series is not supplied/);
  assert.match(dashboard, /Synthetic demo data/);
  assert.match(dashboard, /marginGapData/);
  assert.match(dashboard, /No synthetic substitution/);
  assert.doesNotMatch(dashboard, /const marginTrend\s*=/);
  assert.doesNotMatch(dashboard, /value="28\.4%"/);
});

test('review shell does not present a fabricated named operator or a fixed source mode', () => {
  assert.match(shell, /Review Workspace/);
  assert.match(shell, /configuredHostGraphMode/);
  assert.match(shell, /Demo data mode/);
  assert.match(shell, /Live data mode/);
  assert.doesNotMatch(shell, /Synthetic data mode/);
  assert.doesNotMatch(shell, /Alex Morgan/);
});
