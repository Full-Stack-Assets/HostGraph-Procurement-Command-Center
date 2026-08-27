import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function read(relativePath: string) {
  const url = new URL(`../${relativePath}`, import.meta.url);
  expect(existsSync(url), `${relativePath} must exist`).toBe(true);
  return readFileSync(url, 'utf8');
}

describe('reconciled procurement operator workspaces', () => {
  it('makes the invoices workspace source-honest and read-only', () => {
    const source = read('client/src/pages/InvoicesPage.tsx');

    expect(source).toContain('api.getInvoicesWorkspace');
    expect(source).toContain('invoiceWorkspaceFixture');
    expect(source).toContain('useHostGraphData');
    expect(source).toContain('<DataStatusRail');
    expect(source).toContain('Invoice workspace');
    expect(source).toContain('Synthetic donor-derived fixture');
    expect(source).toContain('No synthetic substitution');
    expect(source).not.toContain('uploadInvoice(');
    expect(source).not.toContain('method: \'POST\'');
  });

  it('keeps inventory observations explicit instead of inferring missing units', () => {
    const source = read('client/src/pages/InventoryPage.tsx');

    expect(source).toContain('api.getInventoryWorkspace');
    expect(source).toContain('inventoryWorkspaceFixture');
    expect(source).toContain('useHostGraphData');
    expect(source).toContain('<DataStatusRail');
    expect(source).toContain('Inventory workspace');
    expect(source).toContain('Unavailable');
    expect(source).toContain('No pack or unit conversion is inferred');
  });

  it('presents supplier comparisons only as detected opportunities', () => {
    const source = read('client/src/pages/SupplierOpportunitiesPage.tsx');

    expect(source).toContain('api.getSupplierOpportunities');
    expect(source).toContain('supplierOpportunityFixture');
    expect(source).toContain('Detected opportunity');
    expect(source).toContain('Candidate alternative');
    expect(source.toLowerCase()).not.toContain('realized savings');
    expect(source.toLowerCase()).not.toContain('you saved');
  });

  it('never promotes a synthetic fixture timestamp into the verified-fetch status field', () => {
    for (const page of ['InvoicesPage.tsx', 'InventoryPage.tsx', 'SupplierOpportunitiesPage.tsx']) {
      const source = read(`client/src/pages/${page}`);
      expect(source).toContain('fetchedAt={response.fetchedAt}');
      expect(source).not.toContain('response.fetchedAt ?? response.data.source.freshAt');
    }
  });

  it('keeps synthetic invoice counts out of operational status metrics', () => {
    const source = read('client/src/pages/InvoicesPage.tsx');
    expect(source).toContain("response.mode === 'LIVE' ? response.data.invoices.length : null");
    expect(source).toContain("response.mode === 'LIVE' ? reviewCount : null");
    expect(source).toContain("response.mode === 'LIVE' ? exceptionCount : null");
  });

  it('explains valid empty responses instead of rendering empty operator shells', () => {
    expect(read('client/src/pages/InvoicesPage.tsx')).toContain('No invoice records are available for the active source.');
    expect(read('client/src/pages/InventoryPage.tsx')).toContain('No inventory observations are available for the active source.');
    expect(read('client/src/pages/SupplierOpportunitiesPage.tsx')).toContain('No supplier opportunities are available for the active source.');
  });

  it('integrates all three workspaces through the canonical React Router shell', () => {
    const app = read('client/src/App.tsx');
    const routes = read('client/src/lib/routePrefetch.ts');
    const shell = read('client/src/components/HostGraphShell.tsx');

    for (const route of ['/invoices', '/inventory', '/supplier-opportunities']) {
      expect(routes).toContain(`'${route}'`);
      expect(app).toContain(`path="${route}"`);
      expect(shell).toContain(`to: '${route}'`);
    }

    expect(app).not.toContain('wouter');
    expect(shell).not.toContain('DashboardLayout');
  });
});
