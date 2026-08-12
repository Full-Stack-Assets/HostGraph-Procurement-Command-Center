import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const shell = fs.readFileSync('client/src/components/HostGraphShell.tsx', 'utf8');
const dashboard = fs.readFileSync('client/src/pages/DashboardPage.tsx', 'utf8');

test('approved HostGraph command-center interface is present', () => {
  for (const label of ['Overview', 'Margins', 'Orders', 'Vendors', 'Products', 'Credits', 'Alerts', 'Reports', 'Settings', 'Help']) {
    assert.match(shell, new RegExp(label));
  }
  for (const label of ['Potential Savings', 'Active Alerts', 'Margin Over Time', 'Spend by Category', 'Top Products by Margin Impact']) {
    assert.match(dashboard, new RegExp(label));
  }
});
